import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

import Toast from '../../ui/Toast'
import AppTopControls from '../../layout/AppTopControls'
import { ensaiosService } from '../../../services/ensaiosService'
import { STATUS_ATIVOS } from './ensaioHelpers'
import ConfirmDeleteModal from './ConfirmDeleteModal'
import EditEnsaioModal from './EditEnsaioModal'
import EmptyState from './EmptyState'
import CalendarioEnsaios from './CalendarioEnsaios'
import EnsaiosGrid from './EnsaiosGrid'
import EnsaiosListHeader from './EnsaiosListHeader'
import EnsaiosStats from './EnsaiosStats'
import EnsaiosTable from './EnsaiosTable'
import EnsaiosToolbar from './EnsaiosToolbar'
import Icon from './Icon'
import LoadingState from './LoadingState'
import Pagination from './Pagination'
import StatusModal from './StatusModal'

const INITIAL_FILTERS = {
  clienteNome: '',
  tipo: '',
  status: '',
  dataInicio: '',
  dataFim: '',
  grupo: 'ativos',
}

const STATUS_EM_ANDAMENTO = ['REALIZADO', 'EM_SELECAO', 'EM_EDICAO']

const GRUPO_STATUS = {
  ativos: STATUS_ATIVOS,
}

const VIEW_MODE_STORAGE_KEY = 'fotolhar:ensaios:viewMode'
const PAGE_SIZE_STORAGE_KEY = 'fotolhar:ensaios:pageSize'
const VIEW_MODES = ['table', 'grid', 'calendar']
const PAGE_SIZE_OPTIONS = [6, 10, 15, 20]
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

const getInitialViewMode = (searchParams) => {
  const viewParam = searchParams?.get('view')

  if (VIEW_MODES.includes(viewParam)) {
    return viewParam
  }

  try {
    const saved = window.localStorage.getItem(VIEW_MODE_STORAGE_KEY)
    return VIEW_MODES.includes(saved) ? saved : 'table'
  } catch {
    return 'table'
  }
}

const normalizeDateParam = (value) => {
  if (!value || !DATE_PATTERN.test(value)) return ''

  const [year, month, day] = value.split('-').map(Number)
  if (year < 1900 || year > 2100) return ''

  const date = new Date(year, month - 1, day)
  const valid =
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day

  return valid ? value : ''
}

const getInitialFilters = (searchParams) => {
  const status = searchParams.get('status') || ''
  const grupo = searchParams.get('grupo')
  const viewMode = searchParams.get('view')

  return {
    ...INITIAL_FILTERS,
    clienteNome: searchParams.get('clienteNome') || '',
    tipo: searchParams.get('tipo') || '',
    status,
    dataInicio: normalizeDateParam(searchParams.get('dataInicio')),
    dataFim: normalizeDateParam(searchParams.get('dataFim')),
    grupo: status ? '' : grupo || (viewMode === 'calendar' ? 'todos' : 'ativos'),
  }
}

const buildParams = (filters) => {
  const params = {}

  if (filters.clienteNome.trim()) {
    params.clienteNome = filters.clienteNome.trim()
  }

  if (filters.tipo) {
    params.tipo = filters.tipo
  }

  if (filters.status) {
    params.status = filters.status
  }

  if (filters.dataInicio) {
    params.dataInicio = new Date(`${filters.dataInicio}T00:00:00`).toISOString()
  }

  if (filters.dataFim) {
    params.dataFim = new Date(`${filters.dataFim}T23:59:59`).toISOString()
  }

  return params
}

const getInitialPageSize = () => {
  try {
    const saved = Number(window.localStorage.getItem(PAGE_SIZE_STORAGE_KEY))
    return PAGE_SIZE_OPTIONS.includes(saved) ? saved : 10
  } catch {
    return 10
  }
}

const sortValue = (ensaio, key) => {
  if (key === 'dataEnsaio') {
    return ensaio.dataEnsaio ? new Date(ensaio.dataEnsaio).getTime() : 0
  }

  if (key === 'valorPacote' || key === 'progresso') {
    if (key === 'valorPacote') {
      return Number(ensaio.valorFinalEnsaio ?? ensaio.valorPacote ?? 0)
    }

    return Number(ensaio[key] || 0)
  }

  return String(ensaio[key] || '').toLowerCase()
}

const buildStatusCounts = (ensaios) => {
  return ensaios.reduce(
    (acc, ensaio) => {
      acc.total += 1
      acc[ensaio.status] = (acc[ensaio.status] || 0) + 1

      return acc
    },
    { total: 0 }
  )
}

const filtrarPorGrupo = (ensaios, grupo) => {
  const statusPermitidos = GRUPO_STATUS[grupo]

  if (!statusPermitidos) return ensaios

  return ensaios.filter((ensaio) => statusPermitidos.includes(ensaio.status))
}

export default function ListaEnsaios() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const [ensaios, setEnsaios] = useState([])
  const [statusCounts, setStatusCounts] = useState({ total: 0 })
  const [filters, setFilters] = useState(() => getInitialFilters(searchParams))
  const [filtersResetKey, setFiltersResetKey] = useState(0)
  const [viewMode, setViewMode] = useState(() => getInitialViewMode(searchParams))
  const [sort, setSort] = useState({ key: 'dataEnsaio', direction: 'desc' })
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(getInitialPageSize)
  const [loading, setLoading] = useState(true)
  const [hasLoaded, setHasLoaded] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [toast, setToast] = useState(null)
  const [selected, setSelected] = useState(null)
  const [modal, setModal] = useState(null)
  const loadSequenceRef = useRef(0)

  useEffect(() => {
    document.body.classList.add('fotolhar-ensaios-page')

    return () => {
      document.body.classList.remove('fotolhar-ensaios-page')
    }
  }, [])

  const showToast = (message, type = 'success') => {
    setToast({ message, type })
  }

  const applyEnsaiosData = (data) => {
    const ensaiosFiltrados = filters.status
      ? data.filter((ensaio) => ensaio.status === filters.status)
      : filters.grupo === 'andamento'
        ? data.filter((ensaio) => STATUS_EM_ANDAMENTO.includes(ensaio.status))
        : filtrarPorGrupo(data, filters.grupo)

    setEnsaios(ensaiosFiltrados)
    setStatusCounts(buildStatusCounts(data))
  }

  const loadEnsaios = async () => {
    const requestId = loadSequenceRef.current + 1
    loadSequenceRef.current = requestId
    setLoading(true)

    try {
      const baseParams = buildParams({
        ...filters,
        status: '',
        grupo: '',
      })
      const cachedData = ensaiosService.getCachedListar(baseParams)

      if (cachedData && requestId === loadSequenceRef.current) {
        applyEnsaiosData(cachedData)
        setHasLoaded(true)
      }

      const response = await ensaiosService.listar(baseParams)

      if (requestId !== loadSequenceRef.current) return

      const data = Array.isArray(response.data) ? response.data : []
      applyEnsaiosData(data)
    } catch (error) {
      if (requestId !== loadSequenceRef.current) return

      console.error('[Ensaios] Erro ao listar:', error?.response?.data || error)
      showToast('Não foi possível carregar os ensaios.', 'error')
    } finally {
      if (requestId === loadSequenceRef.current) {
        setLoading(false)
        setHasLoaded(true)
      }
    }
  }

  useEffect(() => {
    const timeout = setTimeout(() => {
      setPage(1)
      loadEnsaios()
    }, 250)

    return () => clearTimeout(timeout)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters])

  useEffect(() => {
    setFilters(getInitialFilters(searchParams))
    setViewMode(getInitialViewMode(searchParams))
    setFiltersResetKey((current) => current + 1)
    setPage(1)
  }, [searchParams])

  const sortedEnsaios = useMemo(() => {
    return [...ensaios].sort((a, b) => {
      const aValue = sortValue(a, sort.key)
      const bValue = sortValue(b, sort.key)

      if (aValue === bValue) return 0

      const result = aValue > bValue ? 1 : -1
      return sort.direction === 'asc' ? result : -result
    })
  }, [ensaios, sort])

  const totalPages = Math.max(1, Math.ceil(sortedEnsaios.length / pageSize))

  const paginatedEnsaios = sortedEnsaios.slice(
    (page - 1) * pageSize,
    page * pageSize
  )

  const updateUrlFilters = (nextFilters, nextViewMode = viewMode) => {
    const params = {}

    if (nextViewMode === 'calendar') params.view = 'calendar'
    if (nextFilters.clienteNome?.trim()) params.clienteNome = nextFilters.clienteNome.trim()
    if (nextFilters.tipo) params.tipo = nextFilters.tipo
    if (nextFilters.status) params.status = nextFilters.status
    if (nextFilters.dataInicio) params.dataInicio = nextFilters.dataInicio
    if (nextFilters.dataFim) params.dataFim = nextFilters.dataFim
    if (nextFilters.grupo && nextFilters.grupo !== 'ativos') params.grupo = nextFilters.grupo

    setSearchParams(params, { replace: true })
  }

  const handleFilterChange = (field, value) => {
    setFilters((prev) => {
      const next = {
        ...prev,
        [field]: value,
        grupo: field === 'status' ? '' : prev.grupo,
      }

      if (['status', 'dataInicio', 'dataFim', 'grupo'].includes(field)) {
        updateUrlFilters(next)
      }

      return next
    })
  }

  const handleClearFilters = () => {
    setFilters({ ...INITIAL_FILTERS })
    setFiltersResetKey((current) => current + 1)
    setPage(1)
    setSearchParams(viewMode === 'calendar' ? { view: 'calendar' } : {}, { replace: true })
  }

  const handleFiltroPrincipalChange = (value) => {
    const isStatus = [
      'AGENDADO',
      'REALIZADO',
      'EM_SELECAO',
      'EM_EDICAO',
      'FINALIZADO',
      'CANCELADO',
    ].includes(value)

    setFilters((prev) => {
      const next = {
        ...prev,
        status: isStatus ? value : '',
        grupo: isStatus ? '' : value,
      }

      updateUrlFilters(next)

      return next
    })
  }

  const handleSort = (key) => {
    setSort((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }))
  }

  const handleOpenDetails = (ensaio) => {
    navigate(`/ensaios/${ensaio.id}`)
  }

  const openModal = (type, ensaio) => {
    setSelected(ensaio)
    setModal(type)
  }

  const closeModal = () => {
    if (actionLoading) return

    setModal(null)
    setSelected(null)
  }

  const handleDelete = async () => {
    if (!selected) return

    setActionLoading(true)

    try {
      await ensaiosService.excluir(selected.id)
      showToast('Ensaio excluído com sucesso.')
      closeModal()
      loadEnsaios()
    } catch (error) {
      const msg =
        error?.response?.data?.erro ||
        error?.response?.data?.message ||
        'Não foi possível excluir este ensaio.'

      showToast(msg, 'error')
    } finally {
      setActionLoading(false)
    }
  }

  const handleStatus = async (status) => {
    if (!selected || selected.status === status) {
      closeModal()
      return
    }

    setActionLoading(true)

    try {
      await ensaiosService.atualizarStatus(selected.id, status)
      showToast('Status atualizado com sucesso.')
      closeModal()
      loadEnsaios()
    } catch (error) {
      const msg =
        error?.response?.data?.message ||
        'Não foi possível atualizar o status.'

      showToast(msg, 'error')
    } finally {
      setActionLoading(false)
    }
  }

  const handleEdit = async (payload) => {
    if (!selected) return

    setActionLoading(true)

    try {
      await ensaiosService.atualizar(selected.id, payload)
      showToast('Ensaio atualizado com sucesso.')
      closeModal()
      loadEnsaios()
    } catch (error) {
      const msg =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        'Não foi possível salvar as alterações.'

      showToast(msg, 'error')
    } finally {
      setActionLoading(false)
    }
  }

  const handlePreContrato = (ensaio) => {
    navigate(`/ensaios/${ensaio.id}/pre-contrato`)
  }

  const handleCreateForDate = (date) => {
    navigate(`/novo-ensaio?data=${date}`)
  }

  const handleViewModeChange = (mode) => {
    if (!VIEW_MODES.includes(mode)) return

    setViewMode(mode)

    try {
      window.localStorage.setItem(VIEW_MODE_STORAGE_KEY, mode)
    } catch {
      // Preferencia visual local; se o navegador bloquear, a tela continua funcionando.
    }

    if (mode === 'calendar') {
      setFilters((prev) => {
        const next = {
          ...prev,
          status: '',
          grupo: 'todos',
        }

        updateUrlFilters(next, mode)

        return next
      })
    } else {
      updateUrlFilters(filters, mode)
    }
  }

  const grupoCounts = {
    ativos: STATUS_ATIVOS.reduce((sum, status) => sum + Number(statusCounts[status] || 0), 0),
    AGENDADO: Number(statusCounts.AGENDADO || 0),
    REALIZADO: Number(statusCounts.REALIZADO || 0),
    EM_SELECAO: Number(statusCounts.EM_SELECAO || 0),
    EM_EDICAO: Number(statusCounts.EM_EDICAO || 0),
    FINALIZADO: Number(statusCounts.FINALIZADO || 0),
    CANCELADO: Number(statusCounts.CANCELADO || 0),
    todos: Number(statusCounts.total || 0),
  }
  const activeFiltroPrincipal = filters.status || filters.grupo || 'ativos'
  const initialLoading = loading && !hasLoaded

  const totalEnsaios = Number(statusCounts.total || 0)
  const countLabel = `${ensaios.length} ensaio${ensaios.length === 1 ? '' : 's'} exibido${
    ensaios.length === 1 ? '' : 's'
  } • ${totalEnsaios} no total`

  return (
    <>
      <main className="ensaios-management-page relative z-[1] mx-auto max-w-[1280px] px-8 pb-16 pt-[84px] animate-[fadeUp_0.55s_cubic-bezier(0.22,1,0.36,1)_both] max-md:px-4 lg:pt-8">
        <div className="absolute right-8 top-6 hidden lg:block">
          <AppTopControls />
        </div>

        <div className="mb-7 flex flex-wrap items-end justify-between gap-4 rounded-[8px] border border-transparent">
          <div>
            <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--gold)]">
              Gestão
            </div>

            <h1 className="font-serif text-[38px] font-light leading-none tracking-normal text-[var(--text)]">
              Ensaios
            </h1>

            <p className="mt-3 text-[14px] text-[var(--text)]">
              {initialLoading ? 'Carregando ensaios...' : loading ? 'Atualizando ensaios...' : countLabel}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={loadEnsaios}
              className="inline-flex items-center gap-2 rounded-[8px] border border-[var(--border)] bg-[rgba(255,255,255,0.72)] px-4 py-2.5 text-[13px] text-[var(--text)] shadow-[0_12px_28px_rgba(31,31,33,0.055)] transition hover:border-[var(--gold-border)] hover:text-[var(--gold)]"
            >
              <Icon name="refresh" size={13} />
              Atualizar
            </button>

            <button
              type="button"
              onClick={() => navigate('/novo-ensaio')}
              className="inline-flex items-center gap-2 rounded-[8px] bg-[#C84F32] hover:bg-[#AE3F28] px-5 py-2.5 text-[13px] font-medium text-white shadow-[0_12px_28px_rgba(200,79,50,0.18)] transition hover:-translate-y-0.5"
            >
              <Icon name="plus" size={14} />
              Novo Ensaio
            </button>
          </div>
        </div>

        <EnsaiosToolbar
          filters={filters}
          resetKey={filtersResetKey}
          onFilterChange={handleFilterChange}
          viewMode={viewMode}
          onViewModeChange={handleViewModeChange}
          onClear={handleClearFilters}
        />

        <EnsaiosStats
          activeGrupo={activeFiltroPrincipal}
          counts={grupoCounts}
          loading={initialLoading}
          onChange={handleFiltroPrincipalChange}
        />

        {initialLoading ? (
          <LoadingState />
        ) : sortedEnsaios.length === 0 ? (
          <EmptyState
            filters={filters}
            onCreate={() => navigate('/novo-ensaio')}
          />
        ) : (
          <>
            {viewMode === 'calendar' ? (
              <CalendarioEnsaios
                ensaios={sortedEnsaios}
                onView={handleOpenDetails}
                onCreateForDate={handleCreateForDate}
              />
            ) : (
              <>
                <EnsaiosListHeader sort={sort} onSort={handleSort} />

                {viewMode === 'table' ? (
                  <EnsaiosTable
                    ensaios={paginatedEnsaios}
                    onView={handleOpenDetails}
                    onEdit={(ensaio) => openModal('edit', ensaio)}
                    onStatus={(ensaio) => openModal('status', ensaio)}
                    onDelete={(ensaio) => openModal('delete', ensaio)}
                    onPreContrato={handlePreContrato}
                  />
                ) : (
                  <EnsaiosGrid
                    ensaios={paginatedEnsaios}
                    onView={handleOpenDetails}
                    onEdit={(ensaio) => openModal('edit', ensaio)}
                    onStatus={(ensaio) => openModal('status', ensaio)}
                    onDelete={(ensaio) => openModal('delete', ensaio)}
                    onPreContrato={handlePreContrato}
                  />
                )}
              </>
            )}

            {viewMode !== 'calendar' && (
              <Pagination
                page={page}
                totalPages={totalPages}
                pageSize={pageSize}
                total={sortedEnsaios.length}
                onPageChange={setPage}
                onPageSizeChange={(size) => {
                  try {
                    window.localStorage.setItem(PAGE_SIZE_STORAGE_KEY, String(size))
                  } catch {
                    // Preferencia visual local; se o navegador bloquear, a paginacao segue funcionando.
                  }

                  setPageSize(size)
                  setPage(1)
                }}
              />
            )}
          </>
        )}
      </main>

      <EditEnsaioModal
        open={modal === 'edit'}
        ensaio={selected}
        loading={actionLoading}
        onClose={closeModal}
        onSave={handleEdit}
      />

      <StatusModal
        open={modal === 'status'}
        ensaio={selected}
        loading={actionLoading}
        onClose={closeModal}
        onConfirm={handleStatus}
      />

      <ConfirmDeleteModal
        open={modal === 'delete'}
        ensaio={selected}
        loading={actionLoading}
        onClose={closeModal}
        onConfirm={handleDelete}
      />

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </>
  )
}
