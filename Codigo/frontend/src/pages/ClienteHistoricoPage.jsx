import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  CalendarDays,
  CalendarPlus,
  Camera,
  ChevronRight,
  Clock3,
  ImageOff,
  LayoutGrid,
  List,
  MapPin,
  MessageCircle,
  UserRound,
  Wallet,
} from 'lucide-react'

import Header from '../components/layout/Header'
import Toast from '../components/ui/Toast'
import StatusBadge from '../components/ensaios/listaEnsaios/StatusBadge'
import { clientesService } from '../services/clientesService'
import { ensaiosService } from '../services/ensaiosService'
import {
  calcularResumoCliente,
  formatCurrency,
  formatDate,
  formatDateTime,
  getInitials,
  getStatusLabel,
  getTipoExibicao,
  limparTelefone,
} from '../utils/clientesHistoricoUtils'

export default function ClienteHistoricoPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [visualizacaoAlbuns, setVisualizacaoAlbuns] = useState('cards')
  const [cliente, setCliente] = useState(null)
  const [ensaios, setEnsaios] = useState([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [toast, setToast] = useState(null)

  useEffect(() => {
    async function carregarDados() {
      setLoading(true)

      try {
        const [clienteResponse, ensaiosResponse] = await Promise.all([
          clientesService.buscarPorId(id),
          ensaiosService.listar(),
        ])

        setCliente(clienteResponse.data)
        setEnsaios(Array.isArray(ensaiosResponse.data) ? ensaiosResponse.data : [])
      } catch (error) {
        console.error('[ClienteHistórico] Erro ao carregar dados:', error?.response?.data || error)
        setToast({ message: 'Não foi possível carregar o histórico de atendimentos.', type: 'error' })
      } finally {
        setLoading(false)
      }
    }

    carregarDados()
  }, [id])

  const resumo = useMemo(() => {
    if (!cliente) return null
    return calcularResumoCliente(cliente, ensaios)
  }, [cliente, ensaios])

  const statusCounts = useMemo(() => {
    return (resumo?.ensaios || []).reduce((acc, ensaio) => {
      acc[ensaio.status] = (acc[ensaio.status] || 0) + 1
      return acc
    }, {})
  }, [resumo])

  const abrirWhatsApp = () => {
    const numero = limparTelefone(cliente?.telefone)

    if (!numero) {
      setToast({ message: 'Cliente sem telefone cadastrado.', type: 'error' })
      return
    }

    window.open(`https://wa.me/${numero}`, '_blank')
  }

  const handleReativar = async () => {
    setActionLoading(true)

    try {
      const response = await clientesService.reativar(cliente.id)
      setCliente(response.data)
      setToast({ message: 'Cliente reativado com sucesso.', type: 'success' })
    } catch (error) {
      console.error('[ClienteHistórico] Erro ao reativar:', error?.response?.data || error)
      setToast({ message: 'Não foi possível reativar o cliente.', type: 'error' })
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) {
    return (
      <>
        <Header />
        <main className="mx-auto max-w-[1200px] px-8 pt-[88px] text-white max-md:px-4">
          <div className="rounded-2xl border border-white/[0.08] bg-[#141414] p-8 text-white/45">
            Carregando histórico de atendimentos...
          </div>
        </main>
      </>
    )
  }

  if (!cliente || !resumo) {
    return (
      <>
        <Header />
        <main className="mx-auto max-w-[1200px] px-8 pt-[88px] text-white max-md:px-4">
          <div className="rounded-2xl border border-white/[0.08] bg-[#141414] p-10 text-center">
            <UserRound className="mx-auto text-white/25" size={34} />
            <p className="mt-4 text-white/70">Cliente não encontrado.</p>
            <Link
              to="/clientes"
              className="mt-5 inline-flex rounded-lg border border-[var(--gold-border)] px-4 py-2 text-[12px] text-[var(--gold)]"
            >
              Voltar para clientes
            </Link>
          </div>
        </main>
      </>
    )
  }

  const clienteArquivado = cliente.situacao
    ? cliente.situacao === 'ARQUIVADO'
    : cliente.ativo === false
  const ensaiosEntregues = resumo.ensaiosEntregues || []
  const statusEntries = Object.entries(statusCounts)

  return (
    <>
      <Header />

      <main className="mx-auto max-w-[1200px] px-8 pb-16 pt-[88px] text-white max-md:px-4">
        <div className="mb-5 text-[11px] text-white/40">
          <button
            type="button"
            onClick={() => navigate('/clientes')}
            className="transition hover:text-[var(--gold)]"
          >
            Clientes
          </button>
          <span className="mx-2 text-white/20">›</span>
          <span className="text-white/70">{cliente.nome}</span>
        </div>

        <section className="theme-card mb-5 rounded-2xl border border-[var(--gold-border)] p-6">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div className="flex min-w-0 items-center gap-4">
              <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border border-[var(--gold-border)] bg-[var(--gold-dim)] text-lg text-[var(--gold)]">
                {getInitials(cliente.nome)}
              </span>

              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--gold)]">
                  Histórico de atendimentos
                </p>
                <h1 className="mt-1 truncate font-serif text-[34px] font-light text-white">
                  {cliente.nome}
                </h1>
                <p className="mt-1 text-[13px] text-white/45">
                  {cliente.cidade || 'Cidade não informada'} · {cliente.indicacao || 'Origem não informada'}
                </p>
                {clienteArquivado && (
                  <span className="mt-3 inline-flex rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[10px] uppercase tracking-[0.14em] text-white/45">
                    Cliente arquivado
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={abrirWhatsApp}
                className="inline-flex items-center gap-2 rounded-lg border border-emerald-400/30 px-4 py-2.5 text-[12px] text-emerald-300 transition hover:bg-emerald-400/10"
              >
                <MessageCircle size={15} />
                WhatsApp
              </button>

              {clienteArquivado && (
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={handleReativar}
                  className="inline-flex items-center gap-2 rounded-lg border border-emerald-400/30 px-4 py-2.5 text-[12px] text-emerald-300 transition hover:bg-emerald-400/10 disabled:opacity-50"
                >
                  Reativar cliente
                </button>
              )}
            </div>
          </div>
        </section>

        {clienteArquivado && (
          <div className="mb-5 rounded-2xl border border-white/10 bg-white/[0.04] p-5 text-[13px] leading-6 text-white/70">
            Este cliente está arquivado. O histórico, valores e relatórios foram preservados, mas ele fica no filtro Arquivados e fora de Em andamento. Reative o cliente antes de criar novos ensaios para ele.
          </div>
        )}

        <section className="mb-5 grid grid-cols-4 gap-3 max-lg:grid-cols-2 max-sm:grid-cols-1">
          <Resumo label="Álbuns" value={resumo.totalEnsaios} />
          <Resumo label="Total estimado" value={formatCurrency(resumo.totalContratado)} />
          <Resumo label="Ticket médio" value={formatCurrency(resumo.ticketMedio)} />
          <Resumo label="Último entregue" value={formatDate(resumo.ultimaSessao?.dataEnsaio)} />
        </section>

        <div className="grid grid-cols-[1fr_340px] gap-5 max-lg:grid-cols-1">
          <section className="theme-card rounded-2xl border border-[var(--gold-border)]">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--gold-border)] px-5 py-5">
              <div>
                <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--gold)]">
                  Álbuns compartilhados
                </p>
                <h2 className="theme-title mt-1 font-serif text-2xl font-light">
                  Entregas independentes
                </h2>
                <p className="theme-muted mt-1 text-[13px] leading-6">
                  Cada álbum representa um ensaio separado do mesmo cliente, com fotos, seleção, publicação e status próprios.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex rounded-lg border border-[var(--border)] bg-[var(--card-hover)] p-1">
                  <AlbumViewButton
                    active={visualizacaoAlbuns === 'cards'}
                    icon={LayoutGrid}
                    label="Cards"
                    onClick={() => setVisualizacaoAlbuns('cards')}
                  />
                  <AlbumViewButton
                    active={visualizacaoAlbuns === 'lista'}
                    icon={List}
                    label="Lista"
                    onClick={() => setVisualizacaoAlbuns('lista')}
                  />
                </div>

                <Link
                  to={`/novo-ensaio?clienteId=${cliente.id}`}
                  className={`inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-[12px] font-medium transition ${
                    clienteArquivado
                      ? 'pointer-events-none border border-[var(--border)] text-[var(--text-muted)] opacity-60'
                      : 'bg-[var(--gold)] text-white hover:bg-[var(--gold-light)]'
                  }`}
                >
                  <CalendarPlus size={15} />
                  Criar álbum/ensaio
                </Link>
              </div>
            </div>

            <div className="p-5">
              {resumo.ensaios.length === 0 ? (
                <div className="rounded-xl border border-white/[0.08] bg-black/20 p-8 text-center text-white/45">
                  Nenhum ensaio vinculado a este cliente.
                </div>
              ) : (
                <div
                  className={`${
                    visualizacaoAlbuns === 'cards'
                      ? 'grid grid-cols-3 gap-3 max-xl:grid-cols-2 max-md:grid-cols-1'
                      : 'space-y-4'
                  } ${
                    resumo.ensaios.length > 5
                      ? 'max-h-[720px] overflow-y-auto pr-1 theme-scrollbar'
                      : ''
                  }`}
                >
                  {resumo.ensaios.map((ensaio) => (
                    visualizacaoAlbuns === 'cards' ? (
                      <AlbumClienteCard
                        key={ensaio.id}
                        ensaio={ensaio}
                        onOpen={() => navigate(`/ensaios/${ensaio.id}`)}
                      />
                    ) : (
                      <AlbumClienteListItem
                        key={ensaio.id}
                        ensaio={ensaio}
                        onOpen={() => navigate(`/ensaios/${ensaio.id}`)}
                      />
                    )
                  ))}
                </div>
              )}
            </div>
          </section>

          <aside className="space-y-5">
            <section className="theme-card rounded-2xl border border-[var(--gold-border)] p-5">
              <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--gold)]">
                Sobre os álbuns
              </p>

              <div className="theme-muted mt-4 space-y-3 text-[13px] leading-6">
                <p>
                  Use este perfil para acompanhar todos os álbuns da mesma pessoa sem misturar entregas.
                </p>
                <p>
                  Para cada nova sessão, crie um álbum e administre fotos, seleção, publicação e status na tela dele.
                </p>
              </div>
            </section>

            <section className="theme-card rounded-2xl border p-5">
              <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--gold)]">
                Agenda
              </p>

              <div className="mt-4 space-y-3">
                <Info
                  label="Próximo ensaio"
                  value={resumo.proximoEnsaio ? formatDateTime(resumo.proximoEnsaio.dataEnsaio) : 'Nenhum'}
                />

                <div>
                  <p className="theme-muted text-[10px] uppercase tracking-[0.14em]">
                    Ensaios entregues
                  </p>

                  {ensaiosEntregues.length ? (
                    <div
                      className={`mt-3 space-y-3 ${
                        ensaiosEntregues.length > 5
                          ? 'max-h-[330px] overflow-y-auto pr-1 theme-scrollbar'
                          : ''
                      }`}
                    >
                      {ensaiosEntregues.map((ensaio) => (
                        <Info
                          key={ensaio.id}
                          label={getTipoExibicao(ensaio)}
                          value={formatDateTime(ensaio.dataEnsaio)}
                        />
                      ))}
                    </div>
                  ) : (
                    <Info label="Último ensaio entregue" value="Nenhum entregue" />
                  )}
                </div>
              </div>
            </section>

            <section className="theme-card rounded-2xl border p-5">
              <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--gold)]">
                Financeiro
              </p>

              <div className="mt-4 space-y-3">
                <Info label="Contratado estimado" value={formatCurrency(resumo.totalContratado)} />
                <Info label="Ticket médio" value={formatCurrency(resumo.ticketMedio)} />
                <Info label="Pagamentos registrados" value="Não controlado" />
              </div>
            </section>

            <section className="theme-card rounded-2xl border p-5">
              <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--gold)]">
                Recorrência
              </p>

              <div
                className={`mt-4 flex flex-wrap gap-2 ${
                  resumo.tipos.length > 5
                    ? 'max-h-[142px] overflow-y-auto pr-1 theme-scrollbar'
                    : ''
                }`}
              >
                {resumo.tipos.length ? (
                  resumo.tipos.map((tipo) => (
                    <span
                      key={tipo}
                      className="rounded-full border border-[var(--border)] bg-[var(--card-hover)] px-3 py-1.5 text-[11px] text-[var(--text-muted)]"
                    >
                      {tipo}
                    </span>
                  ))
                ) : (
                  <span className="text-[13px] text-white/45">
                    Nenhum tipo registrado.
                  </span>
                )}
              </div>
            </section>

            <section className="theme-card rounded-2xl border p-5">
              <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--gold)]">
                Status
              </p>

              <div
                className={`mt-4 space-y-2 ${
                  statusEntries.length > 5
                    ? 'max-h-[248px] overflow-y-auto pr-1 theme-scrollbar'
                    : ''
                }`}
              >
                {statusEntries.length ? (
                  statusEntries.map(([status, total]) => (
                    <div
                      key={status}
                      className="theme-panel flex items-center justify-between rounded-xl border px-3 py-2"
                    >
                      <span className="theme-muted text-[12px]">
                        {getStatusLabel(status)}
                      </span>
                      <strong className="theme-title text-[13px]">{total}</strong>
                    </div>
                  ))
                ) : (
                  <p className="theme-muted text-[13px]">
                    Sem ensaios vinculados.
                  </p>
                )}
              </div>
            </section>
          </aside>
        </div>
      </main>

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

function Resumo({ label, value }) {
  return (
    <div className="theme-card rounded-xl border px-4 py-4">
      <p className="theme-title truncate text-[18px]">{value}</p>
      <p className="theme-muted mt-1 text-[10px] uppercase tracking-[0.14em]">
        {label}
      </p>
    </div>
  )
}

function Info({ label, value }) {
  return (
    <div className="theme-panel rounded-xl border px-3 py-3">
      <p className="theme-title truncate text-[13px]">{value}</p>
      <p className="theme-muted mt-1 text-[10px] uppercase tracking-[0.14em]">
        {label}
      </p>
    </div>
  )
}

function AlbumViewButton({ active, icon: Icon, label, onClick }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-md px-3 py-2 text-[12px] transition ${
        active
          ? 'bg-[var(--card)] text-[var(--gold)] shadow-[0_8px_18px_rgba(0,0,0,0.10)]'
          : 'text-[var(--text-muted)] hover:text-[var(--text)]'
      }`}
    >
      <Icon size={14} />
      {label}
    </button>
  )
}

function AlbumClienteCard({ ensaio, onOpen }) {
  const totalFotos = Number(ensaio.totalFotos ?? 0)
  const valorExibido = ensaio.valorFinalEnsaio ?? ensaio.valorPacote
  const capaUrl = ensaio.capaUrl || ensaio.fotoCapaUrl || ensaio.capa?.urlWatermark || ensaio.capa?.urlOriginal

  return (
    <article className="theme-card group overflow-hidden rounded-xl border transition hover:-translate-y-0.5 hover:border-[var(--gold-border)]">
      <button type="button" onClick={onOpen} className="block w-full text-left">
        <div className="theme-static relative h-32 overflow-hidden" style={{ backgroundColor: '#101010' }}>
          {capaUrl ? (
            <img
              src={capaUrl}
              alt={getTipoExibicao(ensaio)}
              className="h-full w-full object-cover object-center transition duration-500 group-hover:scale-[1.035]"
            />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center text-center">
              <span className="flex h-11 w-11 items-center justify-center rounded-full border border-white/[0.10] bg-white/[0.04] text-white/55">
                <ImageOff size={18} strokeWidth={1.8} />
              </span>
              <p className="mt-2 px-4 text-[11px] text-white/60">
                Álbum sem fotos publicadas
              </p>
            </div>
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-black/82 via-black/12 to-transparent" />

          <div className="absolute left-3 top-3">
            <span className="inline-flex rounded-full border border-[var(--gold-border)] bg-black/45 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.12em] text-[var(--gold)] backdrop-blur">
              {getTipoExibicao(ensaio)}
            </span>
          </div>

          <div className="theme-static absolute bottom-3 right-3">
            <div className="relative">
              <span
                aria-hidden="true"
                className="absolute -inset-2 rounded-full bg-black/75 blur-md"
              />
              <span className="relative block rounded-full bg-black/70 p-0.5 shadow-[0_10px_26px_rgba(0,0,0,0.55)] ring-1 ring-black/60 backdrop-blur-md">
                <StatusBadge status={ensaio.status} />
              </span>
            </div>
          </div>
        </div>

        <div className="p-3.5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="theme-title truncate font-serif text-[19px] font-light leading-tight">
                Álbum {getTipoExibicao(ensaio)}
              </h3>
              <p className="theme-muted mt-1 text-[11px]">
                {formatDateTime(ensaio.dataEnsaio)}
              </p>
            </div>

            <span className="theme-soft shrink-0 rounded-full border px-2 py-0.5 text-[10px] text-[var(--text-muted)]">
              {ensaio.progresso || 0}%
            </span>
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            <MiniInfo icon={Camera} label="Fotos" value={totalFotos} />
            <MiniInfo icon={CalendarDays} label="Pacote" value={ensaio.qtdFotosPacote || '—'} />
            <MiniInfo icon={Wallet} label="Valor" value={formatCurrency(valorExibido)} />
          </div>

          <div className="theme-muted mt-3 space-y-1.5 text-[11px]">
            <p className="flex min-w-0 items-center gap-2">
              <MapPin size={14} className="shrink-0 text-[var(--gold)]" />
              <span className="truncate">{ensaio.local || 'Local não informado'}</span>
            </p>
            <p className="flex items-center gap-2">
              <Clock3 size={14} className="shrink-0 text-[var(--gold)]" />
              <span>Atualizado em {formatDate(ensaio.atualizadoEm || ensaio.dataEnsaio)}</span>
            </p>
          </div>

          <div className="mt-4 flex justify-end border-t border-[var(--border)] pt-3">
            <span className="inline-flex items-center gap-2 rounded-lg border border-[var(--gold-border)] px-3 py-2 text-[11px] font-medium text-[var(--gold)] transition group-hover:bg-[var(--gold-dim)]">
              Administrar álbum
              <ChevronRight size={14} />
            </span>
          </div>
        </div>
      </button>
    </article>
  )
}

function AlbumClienteListItem({ ensaio, onOpen }) {
  const handleKeyDown = (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onOpen()
    }
  }

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={handleKeyDown}
      className="theme-panel cursor-pointer rounded-xl border p-4 outline-none transition hover:border-[var(--gold-border)] hover:bg-[var(--card-hover)] focus-visible:border-[var(--gold-border)] focus-visible:ring-2 focus-visible:ring-[var(--gold)]/25"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="theme-title text-[15px] font-medium">
            Álbum {getTipoExibicao(ensaio)}
          </p>
          <p className="theme-muted mt-1 text-[12px]">
            {formatDateTime(ensaio.dataEnsaio)} · {ensaio.local || 'Local não informado'}
          </p>
        </div>

        <StatusBadge status={ensaio.status} />
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3 max-sm:grid-cols-1">
        <Info label="Pacote" value={formatCurrency(ensaio.valorPacote)} />
        <Info label="Fotos" value={ensaio.qtdFotosPacote || '—'} />
        <Info
          label="Foto extra"
          value={ensaio.cobrarFotoExtra ? formatCurrency(ensaio.valorFotoExtra) : 'Não cobra'}
        />
      </div>

      {ensaio.observacoes ? (
        <div className="theme-card mt-4 rounded-xl border p-3">
          <p className="theme-muted text-[10px] uppercase tracking-[0.14em]">
            Observações
          </p>
          <p className="theme-text mt-1 text-[13px] leading-6">
            {ensaio.observacoes}
          </p>
        </div>
      ) : null}

      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation()
          onOpen()
        }}
        className="mt-4 rounded-lg border border-[var(--gold-border)] px-4 py-2 text-[12px] text-[var(--gold)] transition hover:bg-[var(--gold-dim)]"
      >
        Abrir álbum
      </button>
    </article>
  )
}

function MiniInfo({ icon: Icon, label, value }) {
  return (
    <div className="theme-panel rounded-lg border px-2 py-2.5">
      <Icon size={14} className="mx-auto text-[var(--gold)]" />
      <p className="theme-title mt-1.5 truncate text-[12px]">{value}</p>
      <p className="theme-muted mt-1 text-[9px] uppercase tracking-[0.12em]">
        {label}
      </p>
    </div>
  )
}
