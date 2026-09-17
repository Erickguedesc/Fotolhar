import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

import Header from '../components/layout/Header'
import AppTopControls from '../components/layout/AppTopControls'
import Toast from '../components/ui/Toast'
import FormInfoSection from '../components/novoEnsaio/FormInfoSection'
import FormObsSection from '../components/novoEnsaio/FormObsSection'
import FormPacoteSection from '../components/novoEnsaio/FormPacoteSection'
import ResumeSidebar from '../components/novoEnsaio/ResumeSidebar'
import { ensaiosService } from '../services/ensaiosService'
import { clientesService } from '../services/clientesService'
import { configuracoesService } from '../services/configuracoesService'
import { removerEstadoDoTexto } from '../utils/brasil'

const TIPO_ENUM_MAP = {
  Newborn:  'NEWBORN',
  Gestante: 'GESTANTE',
  Família:  'FAMILIA',
  Infantil: 'INFANTIL',
  Feminino: 'FEMININO',
  Casal:    'CASAL',
  Book:     'BOOK',
  Batizado: 'BATIZADO',
  Externo:  'EXTERNO',
  Formatura:'FORMATURA',
  Evento:   'EVENTO',
  Debutante:'DEBUTANTE',
  Outro:    'OUTRO',
}

const INITIAL_FORM = {
  // dados do cliente
  cliente:   '',
  telefone:  '',
  email:     '',
  cpf:       '',
  cidade:    '',
  indicacao: '',
  // dados do ensaio
  tipo:      '',
  tipoCustom:'',
  data:      '',
  hora:      '',
  local:     '',
  cidadeEnsaio: '',
  enderecoCompleto: '',
  referenciaLocal: '',
  obs:       '',
  fotos:     '',
  valor:     '',
  extraAtivo:false,
  extra:     '',
}

function onlyDigits(value) {
  return String(value || '').replace(/\D/g, '')
}

function parseCurrencyBR(value) {
  const normalized = String(value || '')
    .replace(/[^\d,.-]/g, '')
    .replace(/\./g, '')
    .replace(',', '.')

  return Number(normalized || 0)
}

function formatCurrencyInput(value) {
  const number = Number(value || 0)
  if (!Number.isFinite(number) || number <= 0) return ''
  return number.toLocaleString('pt-BR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })
}

function getCidadePadrao(configuracoes) {
  return removerEstadoDoTexto(
    configuracoes?.preferencias?.cidadePadrao ||
    configuracoes?.estudio?.cidade ||
    configuracoes?.usuario?.cidade ||
    '',
  )
}

export default function NovoEnsaioPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [form, setForm]       = useState(INITIAL_FORM)
  const [errors, setErrors]   = useState({})
  const [loading, setLoading] = useState(false)
  const [toast, setToast]     = useState(null)
  const [clientesSugeridos, setClientesSugeridos] = useState([])
  const [conflitoAgenda, setConflitoAgenda] = useState(null)
  const [clienteSelecionadoId, setClienteSelecionadoId] = useState(searchParams.get('clienteId'))
  const [activeProgressSection, setActiveProgressSection] = useState('cliente')
  const clienteIdExistente = searchParams.get('clienteId')

  useEffect(() => {
  const dataUrl = searchParams.get('data')
  const dataValida = /^\d{4}-\d{2}-\d{2}$/.test(dataUrl || '')

  if (dataValida) {
    setForm((prev) => ({
      ...prev,
      data: prev.data || dataUrl,
    }))
  }

  async function carregarPreferencias() {
    try {
      const configuracoes = await configuracoesService.buscar()
      const preferencias = configuracoes?.preferencias

      if (!preferencias) return
      const cidadePadrao = getCidadePadrao(configuracoes)

      setForm((prev) => ({
        ...prev,
        data: dataValida ? dataUrl : prev.data,
        fotos: preferencias.qtdFotosPadrao ?? prev.fotos,
        extra:
          preferencias.valorFotoExtraPadrao !== null &&
          preferencias.valorFotoExtraPadrao !== undefined
            ? formatCurrencyInput(preferencias.valorFotoExtraPadrao)
            : prev.extra,
        cidadeEnsaio: prev.cidadeEnsaio || cidadePadrao || '',
      }))
    } catch (error) {
      console.error('[NovoEnsaio] Erro ao carregar preferências:', error)
    }
  }

  carregarPreferencias()
}, [searchParams])

  useEffect(() => {
    if (!clienteIdExistente) return

    let cancelado = false

    async function carregarClienteExistente() {
      try {
        const response = await clientesService.buscarPorId(clienteIdExistente)
        const cliente = response.data

        if (cancelado || !cliente) return

        setForm((prev) => ({
          ...prev,
          cliente: prev.cliente || cliente.nome || '',
          telefone: prev.telefone || cliente.telefone || '',
          email: prev.email || cliente.email || '',
          cpf: prev.cpf || cliente.cpf || '',
          cidade: prev.cidade || cliente.cidade || '',
          indicacao: prev.indicacao || cliente.indicacao || '',
        }))
        setClienteSelecionadoId(cliente.id)
      } catch (error) {
        console.error('[NovoEnsaio] Erro ao carregar cliente existente:', error?.response?.data || error)
        setToast({ message: 'Não foi possível preencher os dados selecionados.', type: 'error' })
      }
    }

    carregarClienteExistente()

    return () => {
      cancelado = true
    }
  }, [clienteIdExistente])

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
    if (field === 'cliente') {
      setClienteSelecionadoId(null)
    }
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: '' }))
  }

  const handleSelectCliente = (cliente) => {
    setClienteSelecionadoId(cliente.id)
    setForm((prev) => ({
      ...prev,
      cliente: cliente.nome || '',
      telefone: cliente.telefone || '',
      email: cliente.email || '',
      cpf: cliente.cpf || '',
      cidade: cliente.cidade || '',
      indicacao: cliente.indicacao || '',
    }))
    setErrors((prev) => ({ ...prev, cliente: '', telefone: '', email: '', cpf: '' }))
  }

  useEffect(() => {
    const busca = form.cliente || form.email || form.telefone

    if (clienteSelecionadoId || busca.trim().length < 2) {
      setClientesSugeridos([])
      return
    }

    let cancelado = false
    const timer = window.setTimeout(async () => {
      try {
        const response = await clientesService.listar({ busca })
        if (cancelado) return
        setClientesSugeridos(Array.isArray(response.data) ? response.data.slice(0, 5) : [])
      } catch (error) {
        if (!cancelado) {
          console.error('[NovoEnsaio] Erro ao buscar clientes:', error?.response?.data || error)
          setClientesSugeridos([])
        }
      }
    }, 250)

    return () => {
      cancelado = true
      window.clearTimeout(timer)
    }
  }, [clienteSelecionadoId, form.cliente, form.email, form.telefone])

  useEffect(() => {
    if (!form.data || !form.hora) {
      setConflitoAgenda(null)
      return
    }

    const dataEnsaio = new Date(`${form.data}T${form.hora}:00`)
    if (Number.isNaN(dataEnsaio.getTime())) {
      setConflitoAgenda(null)
      return
    }

    let cancelado = false
    const timer = window.setTimeout(async () => {
      try {
        const response = await ensaiosService.buscarConflitoAgenda(dataEnsaio.toISOString())
        if (cancelado) return
        setConflitoAgenda(response.data?.conflito ? response.data : null)
      } catch (error) {
        if (!cancelado) {
          console.error('[NovoEnsaio] Erro ao verificar agenda:', error?.response?.data || error)
          setConflitoAgenda(null)
        }
      }
    }, 250)

    return () => {
      cancelado = true
      window.clearTimeout(timer)
    }
  }, [form.data, form.hora])

  function validate() {
    const e = {}
    if (form.cliente.trim().length < 3)
      e.cliente = 'Informe o nome completo'
    if (!form.cidade.trim())
      e.cidade = 'Informe a cidade'
    if (!form.tipo)
      e.tipo = 'Selecione o tipo de ensaio'
    if (form.tipo === 'Outro' && !form.tipoCustom?.trim())
      e.tipo = 'Descreva o tipo de ensaio'
    if (!form.data)
      e.data = 'Informe a data'
    if (!form.hora)
      e.hora = 'Informe o horário'
    if (!form.local.trim())
      e.local = 'Informe o local'
    if (!form.valor || parseCurrencyBR(form.valor) <= 0)
      e.valor = 'Informe o valor do pacote'
    if (!form.fotos || parseInt(form.fotos) <= 0)
      e.fotos = 'Informe o nº de fotos'
    if (form.extraAtivo && (!form.extra || parseCurrencyBR(form.extra) <= 0))
      e.extra = 'Informe o valor por foto extra'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!validate()) return

    setLoading(true)
    try {
      // ── Passo 1: criar o cliente ──────────────────────────────────────────
      let clienteId = clienteSelecionadoId || clienteIdExistente

      if (!clienteId) {
        const clientePayload = {
          nome:      form.cliente.trim(),
          telefone:  form.telefone?.trim()           || null,
          email:     form.email?.trim()              || null,
          cpf:       onlyDigits(form.cpf)             || null,
          cidade:    form.cidade.trim(),
          indicacao: form.indicacao                  || null,
        }

        const clienteRes = await clientesService.criar(clientePayload)
        clienteId = clienteRes.data.id
      }

      // ── Passo 2: criar o ensaio ───────────────────────────────────────────
      const tipoEnum =
        form.tipo === 'Outro'
          ? 'OUTRO'
          : TIPO_ENUM_MAP[form.tipo] ?? form.tipo.toUpperCase()

      const ensaioPayload = {
        clienteId,
        clienteNome: form.cliente.trim(),
        clienteTelefone: form.telefone?.trim() || null,
        clienteEmail: form.email?.trim() || null,
        clienteCpf: onlyDigits(form.cpf) || null,
        clienteCidade: form.cidade.trim(),
        clienteIndicacao: form.indicacao || null,
        tipo:            tipoEnum,
        tipoPersonalizado:
          tipoEnum === 'OUTRO' ? form.tipoCustom.trim() : null,
        dataEnsaio: new Date(`${form.data}T${form.hora}:00`).toISOString(),
        local:           form.local.trim(),
        cidadeEnsaio:    form.cidadeEnsaio.trim() || null,
        estadoEnsaio:    null,
        enderecoCompleto: form.enderecoCompleto?.trim() || null,
        referenciaLocal: form.referenciaLocal?.trim() || null,
        qtdFotosPacote:  parseInt(form.fotos),
        valorPacote:     parseCurrencyBR(form.valor),
        cobrarFotoExtra: form.extraAtivo,
        valorFotoExtra:  form.extraAtivo && form.extra ? parseCurrencyBR(form.extra) : null,
        observacoes:     form.obs?.trim() || null,
        status:          'AGENDADO',
      }

      await ensaiosService.criar(ensaioPayload)

      setToast({ message: 'Ensaio cadastrado com sucesso!', type: 'success' })
      setTimeout(() => {
        navigate('/ensaios?grupo=ativos')
      }, 900)

    } catch (err) {
      console.error('[NovoEnsaio] Erro:', err?.response?.data)

      const status = err?.response?.status
      const data   = err?.response?.data
      let msg = 'Erro ao salvar. Tente novamente.'

      if (status === 400)
        msg = data?.message || data?.error || 'Dados inválidos. Verifique o formulário.'
      else if (status === 401)
        msg = 'Sessão expirada. Faça login novamente.'
      else if (status === 403)
        msg = 'Sem permissão. Verifique se está logado.'
      else if (status === 409)
        msg = 'CPF ou e-mail já cadastrado para outro cliente.'

      setToast({ message: msg, type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Header />

      <main className="ensaios-management-page relative z-[1] mx-auto max-w-[1320px] px-6 pb-16 pt-[84px] animate-[fadeUp_0.55s_cubic-bezier(0.22,1,0.36,1)_both] max-md:px-4 lg:pt-8">
        <div className="absolute right-6 top-6 hidden lg:block">
          <AppTopControls />
        </div>

        <div className="mb-6 flex items-center gap-2">
          <button
            onClick={() => navigate('/ensaios')}
            className="cursor-pointer text-[12px] text-[var(--text-muted)] transition-colors hover:text-[var(--gold)]"
          >
            Ensaios
          </button>
          <span className="text-[11px] text-[var(--text-muted)]">›</span>
          <span className="text-[12px] text-[var(--text)]">Novo ensaio</span>
        </div>

        <div className="mb-6">
          <h1 className="font-serif text-[38px] font-light leading-none tracking-normal text-[var(--text)]">
            Novo Ensaio
          </h1>
          <p className="mt-3 text-[14px] text-[var(--text-muted)]">
            Preencha os dados de contato e do ensaio para registrar.
          </p>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="grid grid-cols-[minmax(0,1fr)_360px] items-start gap-5 xl:grid-cols-[minmax(0,1fr)_380px] max-lg:grid-cols-1">
            <div className="min-w-0">
              <FormInfoSection
                form={form}
                errors={errors}
                clientesSugeridos={clientesSugeridos}
                conflitoAgenda={conflitoAgenda}
                onChange={handleChange}
                onSelectCliente={handleSelectCliente}
                onSectionFocus={setActiveProgressSection}
              />
              <FormObsSection
                form={form}
                onChange={handleChange}
                onSectionFocus={setActiveProgressSection}
              />
              <FormPacoteSection
                form={form}
                errors={errors}
                onChange={handleChange}
                onSectionFocus={setActiveProgressSection}
              />
            </div>
            <ResumeSidebar
              form={form}
              loading={loading}
              activeSection={activeProgressSection}
            />
          </div>
        </form>
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
