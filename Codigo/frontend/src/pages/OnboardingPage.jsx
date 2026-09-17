import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowRight,
  CalendarPlus,
  Camera,
  CheckCircle2,
  FileText,
  Image,
  Loader2,
  Mail,
  Palette,
  Settings,
  SkipForward,
  Upload,
  UserRound,
} from 'lucide-react'

import Header from '../components/layout/Header'
import { clientesService } from '../services/clientesService'
import { configuracoesService } from '../services/configuracoesService'
import { ensaiosService } from '../services/ensaiosService'
import {
  completeOnboarding,
  getDemoEnsaioId,
  migrateOnboardingAccountKeys,
  setDemoEnsaioId,
} from '../utils/onboarding'
import {
  getCurrentAuthSessionKey,
  isCurrentAuthSession,
  isStaleSessionError,
} from '../utils/authSession'
import { invalidateOnboardingRouteCache } from '../utils/onboardingRouteCache'

const steps = [
  { id: 'perfil', label: 'Perfil', icon: UserRound },
  { id: 'marca', label: 'Marca', icon: Palette },
  { id: 'galeria', label: 'Galeria', icon: Image },
  { id: 'demo', label: 'Demo', icon: Camera },
  { id: 'conclusao', label: 'Conclusão', icon: CheckCircle2 },
]

const inputClass =
  'theme-input h-11 w-full rounded-[9px] border px-3.5 text-sm outline-none transition focus:border-[var(--gold-border)] focus:bg-[var(--gold-dim)]'

const textareaClass =
  'theme-input min-h-[92px] w-full resize-none rounded-[9px] border px-3.5 py-3 text-sm leading-6 outline-none transition focus:border-[var(--gold-border)] focus:bg-[var(--gold-dim)]'

function fieldValue(value, fallback = '') {
  return value ?? fallback
}

function tomorrowAtTenIso() {
  const date = new Date()
  date.setDate(date.getDate() + 2)
  date.setHours(10, 0, 0, 0)
  return date.toISOString()
}

function normalizeAxiosData(response) {
  return response?.data ?? response
}

export default function OnboardingPage() {
  const navigate = useNavigate()

  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [savedItems, setSavedItems] = useState([])
  const [fotoPerfilFile, setFotoPerfilFile] = useState(null)
  const [logoFile, setLogoFile] = useState(null)
  const [capaAlbumFile, setCapaAlbumFile] = useState(null)
  const [demoId, setDemoId] = useState(() => getDemoEnsaioId())

  const [perfil, setPerfil] = useState({
    nome: localStorage.getItem('usuarioNome') || '',
    email: localStorage.getItem('usuarioEmail') || '',
    telefone: '',
    cidade: '',
    fotoPerfilUrl: '',
  })

  const [marca, setMarca] = useState({
    nomeEstudio: '',
    nomeComercial: '',
    email: localStorage.getItem('usuarioEmail') || '',
    telefone: '',
    instagram: '',
    cidade: '',
    endereco: '',
    cnpj: '',
  })

  const [album, setAlbum] = useState({
    prazoExpiracaoAlbumDias: 15,
    mensagemEnvioAlbum: 'Seu album ja esta disponivel para selecao.',
    mensagemSelecaoRecebida: 'Recebemos sua selecao. Em breve seguimos com a proxima etapa.',
    capaAlbumPadraoUrl: '',
  })

  useEffect(() => {
    let mounted = true
    const sessionKey = getCurrentAuthSessionKey()

    async function loadConfig() {
      try {
        const data = await configuracoesService.buscar({ force: true })

        if (!mounted || !isCurrentAuthSession(sessionKey)) return

        setPerfil((current) => ({
          ...current,
          nome: fieldValue(data?.usuario?.nome, current.nome),
          email: fieldValue(data?.usuario?.email, current.email),
          telefone: fieldValue(data?.usuario?.telefone, current.telefone),
          cidade: fieldValue(data?.usuario?.cidade, current.cidade),
          fotoPerfilUrl: fieldValue(data?.usuario?.fotoPerfilUrl, current.fotoPerfilUrl),
        }))

        setMarca((current) => ({
          ...current,
          nomeEstudio: fieldValue(data?.estudio?.nomeEstudio, current.nomeEstudio),
          nomeComercial: fieldValue(data?.estudio?.nomeComercial, current.nomeComercial),
          email: fieldValue(data?.estudio?.email, current.email),
          telefone: fieldValue(data?.estudio?.telefone, current.telefone),
          instagram: fieldValue(data?.estudio?.instagram, current.instagram),
          cidade: fieldValue(data?.estudio?.cidade, current.cidade),
          endereco: fieldValue(data?.estudio?.endereco, current.endereco),
          cnpj: fieldValue(data?.estudio?.cnpj, current.cnpj),
        }))

        setAlbum((current) => ({
          ...current,
          prazoExpiracaoAlbumDias: fieldValue(data?.preferencias?.prazoExpiracaoAlbumDias, current.prazoExpiracaoAlbumDias),
          mensagemEnvioAlbum: fieldValue(data?.preferencias?.mensagemEnvioAlbum, current.mensagemEnvioAlbum),
          mensagemSelecaoRecebida: fieldValue(data?.preferencias?.mensagemSelecaoRecebida, current.mensagemSelecaoRecebida),
          capaAlbumPadraoUrl: fieldValue(data?.preferencias?.capaAlbumPadraoUrl, current.capaAlbumPadraoUrl),
        }))

      } catch (err) {
        if (!isStaleSessionError(err)) {
          console.error(err)
        }
      } finally {
        if (mounted && isCurrentAuthSession(sessionKey)) setLoading(false)
      }
    }

    loadConfig()

    return () => {
      mounted = false
    }
  }, [])

  const currentStep = steps[step]
  const progress = useMemo(() => Math.round(((step + 1) / steps.length) * 100), [step])

  function remember(item) {
    setSavedItems((current) => (current.includes(item) ? current : [...current, item]))
  }

  function nextStep() {
    setError('')
    setStep((current) => Math.min(current + 1, steps.length - 1))
  }

  function previousStep() {
    setError('')
    setStep((current) => Math.max(current - 1, 0))
  }

  async function finish(path = '/novo-ensaio') {
    await runSave(async () => {
      const data = await configuracoesService.concluirOnboarding()
      completeOnboarding(data?.onboardingConcluidoEm || new Date().toISOString())
      navigate(path)
    })
  }

  async function handleSavePerfil() {
    if (!perfil.nome.trim() || !perfil.email.trim()) {
      setError('Informe pelo menos nome e email para alimentar o pre-contrato.')
      return
    }

    await runSave(async () => {
      const previousEmail = localStorage.getItem('usuarioEmail') || perfil.email
      let data = await configuracoesService.atualizarUsuario(perfil)
      const nextEmail = data?.email || perfil.email

      migrateOnboardingAccountKeys(previousEmail, nextEmail, {
        onboardingConcluido: data?.onboardingConcluido,
        onboardingConcluidoEm: data?.onboardingConcluidoEm,
      })

      if (data?.token) {
        localStorage.setItem('token', data.token)
        configuracoesService.invalidateAllUserCaches()
        invalidateOnboardingRouteCache()
      }

      localStorage.setItem('usuarioNome', data?.nome || perfil.nome)
      localStorage.setItem('usuarioEmail', nextEmail)

      if (fotoPerfilFile) {
        data = await configuracoesService.uploadFotoPerfil(fotoPerfilFile)
        setFotoPerfilFile(null)
      }

      localStorage.setItem('usuarioNome', data?.nome || perfil.nome)
      localStorage.setItem('usuarioEmail', data?.email || perfil.email)
      window.dispatchEvent(new CustomEvent('fotolhar:usuario-atualizado', { detail: data }))
      remember('Perfil do usuário')
      nextStep()
    })
  }

  async function handleSaveMarca() {
    await runSave(async () => {
      if (logoFile) {
        await configuracoesService.uploadLogoEstudio(logoFile)
      }

      await configuracoesService.atualizarEstudio({
        nomeEstudio: marca.nomeEstudio,
        nomeComercial: marca.nomeComercial,
        email: marca.email,
        telefone: marca.telefone,
        instagram: marca.instagram,
        cidade: marca.cidade,
        endereco: marca.endereco,
        cnpj: marca.cnpj,
      })

      await configuracoesService.atualizarEmail({
        ativo: Boolean(marca.email),
        nomeRemetente: marca.nomeComercial || marca.nomeEstudio || perfil.nome,
        emailUsuarioAvisos: marca.email || perfil.email,
        enviarAlbumPublicado: true,
        avisarSelecaoRecebida: true,
        enviarConfirmacaoSelecaoCliente: true,
        enviarMudancaStatus: true,
      })

      remember('Marca e email')
      nextStep()
    })
  }

  async function handleSaveAlbum() {
    await runSave(async () => {
      if (capaAlbumFile) {
        const data = await configuracoesService.uploadCapaAlbumPadrao(capaAlbumFile)
        setAlbum((current) => ({
          ...current,
          capaAlbumPadraoUrl: data?.capaAlbumPadraoUrl || current.capaAlbumPadraoUrl,
        }))
        setCapaAlbumFile(null)
      }

      await configuracoesService.atualizarPreferencias({
        prazoExpiracaoAlbumDias: Number(album.prazoExpiracaoAlbumDias) || 15,
        mensagemEnvioAlbum: album.mensagemEnvioAlbum,
        mensagemSelecaoRecebida: album.mensagemSelecaoRecebida,
      })

      await ensureInitialContract()

      remember('Galeria')
      remember('Modelo de contrato')
      nextStep()
    })
  }

  async function ensureInitialContract() {
    const modelos = await configuracoesService.listarModelosContrato()
    const list = Array.isArray(modelos) ? modelos : []

    if (list.length > 0) return

    await configuracoesService.criarModeloContrato({
      nome: 'Modelo inicial Fotolhar',
      tipoEnsaio: null,
      padrao: true,
      ativo: true,
      clausulas:
        '1. O ensaio sera realizado na data e local combinados entre as partes.\n\n2. A galeria digital sera disponibilizada pelo estudio para visualizacao e selecao das imagens.\n\n3. Prazos, entregas e valores seguem as condicoes combinadas no atendimento.\n\n4. Alteracoes de data, local ou escopo devem ser registradas entre as partes.',
      textoAceite:
        'Declaro que li e aceito as condicoes deste pre-contrato digital.',
    })
  }

  async function handleCreateDemo() {
    if (demoId) {
      remember('Ensaio demo')
      nextStep()
      return
    }

    await runSave(async () => {
      const clienteResponse = await clientesService.criar({
        nome: 'Cliente Demo Fotolhar',
        email: null,
        telefone: '(00) 00000-0000',
        cidade: marca.cidade || perfil.cidade || 'Cidade demo',
        indicacao: 'Onboarding Fotolhar',
      })

      const cliente = normalizeAxiosData(clienteResponse)
      const clienteId = cliente?.id

      if (!clienteId) {
        throw new Error('Cliente demo criado sem identificador.')
      }

      const ensaioResponse = await ensaiosService.criar({
        clienteId,
        clienteNome: cliente.nome || 'Cliente Demo Fotolhar',
        clienteEmail: cliente.email || null,
        clienteTelefone: cliente.telefone || '(00) 00000-0000',
        clienteCidade: cliente.cidade || marca.cidade || perfil.cidade || '',
        clienteIndicacao: 'Onboarding Fotolhar',
        tipo: 'OUTRO',
        tipoPersonalizado: 'Ensaio demo',
        dataEnsaio: tomorrowAtTenIso(),
        local: marca.endereco || 'Estudio demo Fotolhar',
        qtdFotosPacote: 20,
        valorPacote: 500,
        cobrarFotoExtra: false,
        valorFotoExtra: 0,
        observacoes: 'Ensaio ficticio criado pelo onboarding para testar agenda, contrato, upload, album e selecao.',
      })

      const ensaio = normalizeAxiosData(ensaioResponse)
      const nextDemoId = ensaio?.id

      setDemoId(nextDemoId)
      setDemoEnsaioId(nextDemoId)
      remember('Ensaio demo')
      nextStep()
    })
  }

  async function runSave(action) {
    try {
      setSaving(true)
      setError('')
      await action()
    } catch (err) {
      console.error(err)
      setError(err?.response?.data?.message || err?.message || 'Nao foi possivel salvar esta etapa.')
    } finally {
      setSaving(false)
    }
  }

  const stepActions = [
    handleSavePerfil,
    handleSaveMarca,
    handleSaveAlbum,
    handleCreateDemo,
    () => finish('/novo-ensaio'),
  ]

  return (
    <>
      <Header />

      <main className="theme-page min-h-screen px-4 pb-12 pt-24 md:px-8">
        <div className="mx-auto max-w-6xl">
          <section className="mb-5 flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <p className="theme-muted text-xs font-semibold uppercase tracking-[0.28em]">
                Configuração guiada
              </p>
              <h1 className="theme-title mt-3 font-serif text-4xl font-light md:text-5xl">
                Deixe o Fotolhar pronto antes do primeiro ensaio
              </h1>
              <p className="theme-muted mt-3 max-w-2xl text-sm leading-6">
                Cinco passos curtos para montar perfil, marca, galeria, contrato e um ensaio de exemplo demo deixando o sistema com sua identidade.
              </p>
            </div>

            <button
              type="button"
              onClick={() => finish('/dashboard')}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-[9px] border border-[var(--border)] px-4 text-sm font-medium text-[var(--text-muted)] transition hover:border-[var(--gold-border)] hover:text-[var(--gold)]"
            >
              <SkipForward size={16} />
              Pular onboarding
            </button>
          </section>

          <section className="theme-card overflow-hidden rounded-[14px] border">
            <div className="border-b border-[var(--border)] px-5 py-4">
              <div className="flex flex-wrap items-center gap-3">
                {steps.map((item, index) => {
                  const Icon = item.icon
                  const active = index === step
                  const done = index < step

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setStep(index)}
                      className={`inline-flex h-10 items-center gap-2 rounded-[9px] border px-3 text-xs font-semibold uppercase tracking-[0.10em] transition ${
                        active
                          ? 'border-[var(--gold-border)] bg-[var(--gold-dim)] text-[var(--gold)]'
                          : done
                            ? 'border-emerald-400/25 text-emerald-300'
                            : 'border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--gold-border)] hover:text-[var(--text)]'
                      }`}
                    >
                      <Icon size={15} />
                      {item.label}
                    </button>
                  )
                })}
              </div>

              <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-black/20">
                <span
                  className="block h-full rounded-full bg-[var(--gold)] transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_320px]">
              <div className="min-h-[520px] p-5 md:p-7">
                {loading ? (
                  <div className="flex min-h-[360px] items-center justify-center text-[var(--text-muted)]">
                    <Loader2 className="mr-2 animate-spin" size={18} />
                    Carregando configuracoes
                  </div>
                ) : (
                  <>
                    <StepTitle step={currentStep} />

                    {step === 0 && (
                      <PerfilStep
                        perfil={perfil}
                        setPerfil={setPerfil}
                        fotoPerfilFile={fotoPerfilFile}
                        setFotoPerfilFile={setFotoPerfilFile}
                      />
                    )}

                    {step === 1 && (
                      <MarcaStep
                        marca={marca}
                        setMarca={setMarca}
                        logoFile={logoFile}
                        setLogoFile={setLogoFile}
                      />
                    )}

                    {step === 2 && (
                      <AlbumStep
                        album={album}
                        setAlbum={setAlbum}
                        capaAlbumFile={capaAlbumFile}
                        setCapaAlbumFile={setCapaAlbumFile}
                      />
                    )}

                    {step === 3 && (
                      <DemoStep demoId={demoId} />
                    )}

                    {step === 4 && (
                      <ConclusaoStep savedItems={savedItems} demoId={demoId} />
                    )}

                    {error && (
                      <div className="mt-5 rounded-[9px] border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-200">
                        {error}
                      </div>
                    )}
                  </>
                )}
              </div>

              <aside className="border-t border-[var(--border)] p-5 lg:border-l lg:border-t-0">
                <div className="theme-panel rounded-[12px] border p-4">
                  <p className="theme-muted text-xs font-semibold uppercase tracking-[0.20em]">
                    O que fica pronto
                  </p>

                  <div className="mt-4 space-y-3">
                    {[
                      ['Pré-contrato', 'Dados do perfil.'],
                      ['Marca', 'Logo, tema, contato e remetente.'],
                      ['Galeria', 'Prazo, mensagens, capa e proteção ficam prontos.'],
                      ['Demo', 'Um ensaio ficticio para testar o fluxo.'],
                    ].map(([title, description]) => (
                      <div key={title} className="flex gap-3">
                        <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-[8px] border border-[var(--gold-border)] bg-[var(--gold-dim)] text-[var(--gold)]">
                          <CheckCircle2 size={15} />
                        </span>
                        <span>
                          <strong className="block text-sm text-[var(--text)]">{title}</strong>
                          <span className="theme-muted text-xs leading-5">{description}</span>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-4 rounded-[12px] border border-[var(--border)] p-4">
                  <p className="theme-muted text-xs font-semibold uppercase tracking-[0.18em]">
                    Salvo nesta sessão
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {savedItems.length === 0 ? (
                      <span className="theme-muted text-sm">Nada salvo ainda.</span>
                    ) : (
                      savedItems.map((item) => (
                        <span
                          key={item}
                          className="rounded-full border border-emerald-400/25 bg-emerald-400/10 px-3 py-1 text-xs text-emerald-300"
                        >
                          {item}
                        </span>
                      ))
                    )}
                  </div>
                </div>
              </aside>
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-[var(--border)] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={previousStep}
                disabled={step === 0 || saving}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-[9px] border border-[var(--border)] px-4 text-sm font-medium text-[var(--text-muted)] transition hover:border-[var(--gold-border)] hover:text-[var(--text)] disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ArrowLeft size={16} />
                Voltar
              </button>

              <div className="flex flex-col gap-3 sm:flex-row">
                {step < steps.length - 1 && (
                  <button
                    type="button"
                    onClick={nextStep}
                    disabled={saving}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-[9px] border border-[var(--border)] px-4 text-sm font-medium text-[var(--text-muted)] transition hover:border-[var(--gold-border)] hover:text-[var(--gold)] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <SkipForward size={16} />
                    Pular etapa
                  </button>
                )}

                <button
                  type="button"
                  onClick={stepActions[step]}
                  disabled={saving || loading}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-[9px] bg-[var(--gold)] px-5 text-sm font-semibold text-white transition hover:bg-[var(--gold-light)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? <Loader2 className="animate-spin" size={16} /> : step === 4 ? <CalendarPlus size={16} /> : <ArrowRight size={16} />}
                  {step === 3 ? (demoId ? 'Continuar' : 'Criar demo') : step === 4 ? 'Criar primeiro ensaio real' : 'Salvar e continuar'}
                </button>
              </div>
            </div>
          </section>
        </div>
      </main>
    </>
  )
}

function StepTitle({ step }) {
  const Icon = step.icon

  return (
    <div className="mb-6 flex items-start gap-3">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] border border-[var(--gold-border)] bg-[var(--gold-dim)] text-[var(--gold)]">
        <Icon size={20} />
      </span>
      <div>
        <p className="theme-muted text-xs font-semibold uppercase tracking-[0.20em]">
          Etapa atual
        </p>
        <h2 className="theme-title mt-1 text-2xl font-semibold">{step.label}</h2>
      </div>
    </div>
  )
}

function Label({ children }) {
  return (
    <label className="space-y-2">
      <span className="theme-muted block text-xs font-semibold uppercase tracking-[0.12em]">
        {children}
      </span>
    </label>
  )
}

function getInitials(nome = '') {
  return nome
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase() || 'FT'
}

function PerfilStep({ perfil, setPerfil, fotoPerfilFile, setFotoPerfilFile }) {
  const previewUrl = useMemo(
    () => (fotoPerfilFile ? URL.createObjectURL(fotoPerfilFile) : perfil.fotoPerfilUrl),
    [fotoPerfilFile, perfil.fotoPerfilUrl],
  )

  useEffect(() => {
    return () => {
      if (fotoPerfilFile && previewUrl) {
        URL.revokeObjectURL(previewUrl)
      }
    }
  }, [fotoPerfilFile, previewUrl])

  return (
    <div className="space-y-5">
      <div className="theme-panel flex flex-col gap-5 rounded-[12px] border p-5 sm:flex-row sm:items-center">
        <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[var(--gold-border)] bg-[var(--gold-dim)] font-serif text-2xl text-[var(--gold)]">
          {previewUrl ? (
            <img
              src={previewUrl}
              alt="Foto do perfil"
              className="h-full w-full object-cover"
            />
          ) : (
            getInitials(perfil.nome)
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-[var(--text)]">
            Foto ou iniciais do perfil
          </p>
          <p className="theme-muted mt-1 text-sm leading-6">
            Usado no canto superior direito do painel administrativo.
          </p>
          <p className="theme-muted mt-2 truncate text-xs">
            {fotoPerfilFile?.name || perfil.fotoPerfilUrl || 'Nenhuma foto enviada'}
          </p>
        </div>

        <label className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-[9px] border border-[var(--border)] px-4 text-sm font-medium text-[var(--text-muted)] transition hover:border-[var(--gold-border)] hover:text-[var(--gold)]">
          <Upload size={15} />
          Alterar foto
          <input
            className="hidden"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(event) => setFotoPerfilFile(event.target.files?.[0] || null)}
          />
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Seu nome">
          <input className={inputClass} value={perfil.nome} onChange={(event) => setPerfil({ ...perfil, nome: event.target.value })} />
        </Field>
        <Field label="Email principal">
          <input className={inputClass} type="email" value={perfil.email} onChange={(event) => setPerfil({ ...perfil, email: event.target.value })} />
        </Field>
        <Field label="Telefone">
          <input className={inputClass} value={perfil.telefone} onChange={(event) => setPerfil({ ...perfil, telefone: event.target.value })} />
        </Field>
        <Field label="Cidade">
          <input className={inputClass} value={perfil.cidade} onChange={(event) => setPerfil({ ...perfil, cidade: event.target.value })} />
        </Field>
      </div>

      <div className="theme-panel rounded-[12px] border p-4 md:col-span-2">
        <div className="flex gap-3">
          <FileText className="mt-0.5 text-[var(--gold)]" size={18} />
          <p className="theme-muted text-sm leading-6">
            Estes dados alimentam automaticamente o pré-contrato e evitam redigitar informações comerciais a cada ensaio.
          </p>
        </div>
      </div>
    </div>
  )
}

function MarcaStep({ marca, setMarca, logoFile, setLogoFile }) {
  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Nome do estudio">
          <input className={inputClass} value={marca.nomeEstudio} onChange={(event) => setMarca({ ...marca, nomeEstudio: event.target.value })} />
        </Field>
        <Field label="Nome comercial">
          <input className={inputClass} value={marca.nomeComercial} onChange={(event) => setMarca({ ...marca, nomeComercial: event.target.value })} />
        </Field>
        <Field label="Email de contato">
          <input className={inputClass} type="email" value={marca.email} onChange={(event) => setMarca({ ...marca, email: event.target.value })} />
        </Field>
        <Field label="Telefone comercial">
          <input className={inputClass} value={marca.telefone} onChange={(event) => setMarca({ ...marca, telefone: event.target.value })} />
        </Field>
        <Field label="Instagram">
          <input className={inputClass} value={marca.instagram} onChange={(event) => setMarca({ ...marca, instagram: event.target.value })} />
        </Field>
        <Field label="Cidade">
          <input className={inputClass} value={marca.cidade} onChange={(event) => setMarca({ ...marca, cidade: event.target.value })} />
        </Field>
        <Field label="Endereco">
          <input className={inputClass} value={marca.endereco} onChange={(event) => setMarca({ ...marca, endereco: event.target.value })} />
        </Field>
        <Field label="CNPJ">
          <input className={inputClass} value={marca.cnpj} onChange={(event) => setMarca({ ...marca, cnpj: event.target.value })} />
        </Field>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="theme-panel flex min-h-[118px] cursor-pointer flex-col justify-center rounded-[12px] border p-4 transition hover:border-[var(--gold-border)]">
          <span className="flex items-center gap-2 text-sm font-semibold text-[var(--text)]">
            <Upload size={17} />
            Logo ou marca
          </span>
          <span className="theme-muted mt-2 text-xs leading-5">
            {logoFile ? logoFile.name : 'PNG, JPG ou WEBP para aparecer nas configuracoes do estudio.'}
          </span>
          <input
            className="hidden"
            type="file"
            accept="image/*"
            onChange={(event) => setLogoFile(event.target.files?.[0] || null)}
          />
        </label>
      </div>

      <div className="theme-panel rounded-[12px] border p-4">
        <div className="flex gap-3">
          <Mail className="mt-0.5 text-[var(--gold)]" size={18} />
          <p className="theme-muted text-sm leading-6">
            O email de contato também fica preparado como remetente e canal de avisos de álbum, seleção e mudanças de status.
          </p>
        </div>
      </div>
    </div>
  )
}

function AlbumStep({
  album,
  setAlbum,
  capaAlbumFile,
  setCapaAlbumFile,
}) {
  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-[240px_minmax(0,1fr)]">
        <Field label="Prazo do álbum">
          <input className={inputClass} type="number" min="1" value={album.prazoExpiracaoAlbumDias} onChange={(event) => setAlbum({ ...album, prazoExpiracaoAlbumDias: event.target.value })} />
        </Field>
        <div className="theme-panel rounded-[12px] border p-4">
          <div className="flex gap-3">
            <Image className="mt-0.5 text-[var(--gold)]" size={18} />
            <div>
              <p className="text-sm font-semibold text-[var(--text)]">
                Como o acesso será compartilhado
              </p>
              <p className="theme-muted mt-1 text-sm leading-6">
                "Seu album ficara disponivel por {Number(album.prazoExpiracaoAlbumDias) || 15} dias", com capa padrão e mensagens personalizadas.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Mensagem de álbum publicado">
          <textarea className={textareaClass} value={album.mensagemEnvioAlbum} onChange={(event) => setAlbum({ ...album, mensagemEnvioAlbum: event.target.value })} />
        </Field>
        <Field label="Mensagem de seleção recebida">
          <textarea className={textareaClass} value={album.mensagemSelecaoRecebida} onChange={(event) => setAlbum({ ...album, mensagemSelecaoRecebida: event.target.value })} />
        </Field>
      </div>

      <div className="rounded-[12px] border border-[var(--border)] p-4">
        <div className="flex flex-col gap-4 sm:flex-row">
          <div className="h-28 w-full overflow-hidden rounded-[10px] border border-[var(--border)] bg-black/10 sm:w-44">
            {album.capaAlbumPadraoUrl ? (
              <img
                src={album.capaAlbumPadraoUrl}
                alt="Capa padrao do album"
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-xs uppercase tracking-[0.14em] text-[var(--text-muted)]">
                Sem capa
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-[var(--text)]">
              Capa padrão do álbum
            </p>
            <p className="theme-muted mt-1 text-sm leading-6">
              Usada quando o álbum ainda nao tem uma foto principal definida.
            </p>
            <p className="theme-muted mt-2 truncate text-xs">
              {capaAlbumFile?.name || album.capaAlbumPadraoUrl || 'Nenhuma imagem selecionada'}
            </p>

            <label className="mt-3 inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-[9px] border border-[var(--gold-border)] px-4 text-sm font-medium text-[var(--gold)] transition hover:bg-[var(--gold-dim)]">
              <Upload size={15} />
              Enviar capa
              <input
                className="hidden"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(event) => setCapaAlbumFile(event.target.files?.[0] || null)}
              />
            </label>
          </div>
        </div>
      </div>

      <div className="rounded-[12px] border border-[var(--gold-border)] bg-[var(--gold-dim)] p-4">
        <div className="flex gap-3">
          <Settings className="mt-0.5 shrink-0 text-[var(--gold)]" size={18} />
          <div>
            <p className="text-sm font-semibold text-[var(--text)]">
              Você pode ajustar isso depois
            </p>
            <p className="theme-muted mt-1 text-sm leading-6">
              Depois de concluir o onboarding, essas mensagens, prazo do álbum e capa padrão ficam disponíveis no menu Configurações. A marca d'agua também pode ser configurada por lá com mais controle.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function DemoStep({ demoId }) {
  return (
    <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_280px]">
      <div className="theme-panel rounded-[12px] border p-5">
        <div className="flex h-14 w-14 items-center justify-center rounded-[12px] border border-[var(--gold-border)] bg-[var(--gold-dim)] text-[var(--gold)]">
          <Camera size={24} />
        </div>
        <h3 className="mt-5 text-xl font-semibold text-[var(--text)]">
          {demoId ? 'Seu ensaio demo ja foi criado' : 'Crie um ensaio ficticio de verdade'}
        </h3>
        <p className="theme-muted mt-3 text-sm leading-7">
          Ele entra na agenda e nos detalhes como um ensaio normal. Você pode testar upload, álbum, pré-contrato e seleção sem alterar dados reais.
        </p>

        {demoId && (
          <Link
            to={`/ensaios/${demoId}`}
            className="mt-5 inline-flex h-10 items-center justify-center gap-2 rounded-[9px] border border-[var(--gold-border)] px-4 text-sm font-medium text-[var(--gold)] transition hover:bg-[var(--gold-dim)]"
          >
            Abrir ensaio demo
            <ArrowRight size={15} />
          </Link>
        )}
      </div>

      <div className="rounded-[12px] border border-[var(--border)] p-5">
        <p className="theme-muted text-xs font-semibold uppercase tracking-[0.18em]">Demo</p>
        <div className="mt-4 space-y-3 text-sm">
          <InfoRow icon={UserRound} label="Contato" value="Contato Demo Fotolhar" />
          <InfoRow icon={Image} label="Tipo" value="Ensaio demo" />
          <InfoRow icon={CalendarPlus} label="Agenda" value="Daqui 2 dias, 10:00" />
          <InfoRow icon={FileText} label="Contrato" value="Modelo inicial" />
        </div>
      </div>
    </div>
  )
}

function ConclusaoStep({ savedItems, demoId }) {
  const items = savedItems.length > 0
    ? savedItems
    : ['Perfil', 'Marca', 'Galeria', 'Contrato', 'Demo opcional']

  return (
    <div className="space-y-5">
      <div className="theme-panel rounded-[12px] border p-5">
        <CheckCircle2 className="text-emerald-300" size={30} />
        <h3 className="mt-4 text-2xl font-semibold text-[var(--text)]">
          Pronto para criar o primeiro ensaio real
        </h3>
        <p className="theme-muted mt-3 max-w-2xl text-sm leading-7">
          O sistema já tem uma base inicial para contrato, marca, preferências de álbum e fluxo demo. Agora o melhor próximo passo é cadastrar um ensaio real. Veja, edite e personalize tudo isso e muito mais nas configurações do seu perfil!
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {items.map((item) => (
          <div key={item} className="flex items-center gap-3 rounded-[12px] border border-[var(--border)] p-4">
            <CheckCircle2 className="text-emerald-300" size={18} />
            <span className="text-sm font-medium text-[var(--text)]">{item}</span>
          </div>
        ))}
      </div>

      <div className="rounded-[12px] border border-[var(--gold-border)] bg-[var(--gold-dim)] p-4">
        <p className="text-sm font-semibold text-[var(--gold)]">Galeria demo</p>
        <p className="theme-muted mt-2 text-sm leading-6">
          {demoId
            ? 'O ensaio demo está criado. Abra os detalhes, envie algumas fotos e publique o álbum para ver exatamente como o acesso será exibido.'
            : 'Voce pulou a criacao do demo. Pode criar um ensaio real agora e publicar a primeira galeria quando quiser.'}
        </p>
        {demoId && (
          <Link to={`/ensaios/${demoId}`} className="mt-3 inline-flex text-sm font-semibold text-[var(--gold)]">
            Abrir demo
          </Link>
        )}
      </div>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div>
      <Label>{label}</Label>
      <div className="mt-2">{children}</div>
    </div>
  )
}

function InfoRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="theme-muted inline-flex items-center gap-2">
        <Icon size={15} />
        {label}
      </span>
      <strong className="text-right text-[var(--text)]">{value}</strong>
    </div>
  )
}
