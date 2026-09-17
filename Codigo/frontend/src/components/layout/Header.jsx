import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  BarChart3,
  CalendarDays,
  ChevronUp,
  LayoutDashboard,
  LogOut,
  PlusCircle,
  Settings,
  Sparkles,
  Users,
} from 'lucide-react'

import { configuracoesService } from '../../services/configuracoesService'
import { ensaiosService } from '../../services/ensaiosService'
import { getPreservedOnboardingEntries } from '../../utils/onboarding'
import {
  getCurrentAuthSessionKey,
  isCurrentAuthSession,
  isStaleSessionError,
  normalizeAccountEmail,
} from '../../utils/authSession'
import { invalidateOnboardingRouteCache } from '../../utils/onboardingRouteCache'
import fotolharWordmark from '../../assets/home-logo-wordmark.png'
import AppTopControls from './AppTopControls'

const LOGIN_DISPLAY_NAME_KEY = 'fotolhar-login-display-name'
const USER_PROFILE_CACHE_KEY = 'fotolhar-usuario-perfil'
const SIDEBAR_TIP_ROTATION_INTERVAL_MS = 10 * 60 * 1000

function readStoredUsuarioIdentity() {
  const nome = localStorage.getItem('usuarioNome') || ''
  const email = localStorage.getItem('usuarioEmail') || ''

  return nome || email ? { nome, email } : null
}

function isCachedUsuarioForCurrentAccount(usuario) {
  const currentEmail = normalizeAccountEmail(localStorage.getItem('usuarioEmail') || '')
  const cachedEmail = normalizeAccountEmail(usuario?.email || '')

  return !currentEmail || !cachedEmail || currentEmail === cachedEmail
}

function readCachedUsuario() {
  try {
    const cached = localStorage.getItem(USER_PROFILE_CACHE_KEY)
    const usuario = cached ? JSON.parse(cached) : null

    if (usuario && isCachedUsuarioForCurrentAccount(usuario)) {
      return usuario
    }

    if (usuario) {
      localStorage.removeItem(USER_PROFILE_CACHE_KEY)
    }

    return readStoredUsuarioIdentity()
  } catch {
    localStorage.removeItem(USER_PROFILE_CACHE_KEY)
    return readStoredUsuarioIdentity()
  }
}

function cacheUsuario(usuario) {
  if (!usuario) {
    localStorage.removeItem(USER_PROFILE_CACHE_KEY)
    return
  }

  const usuarioCache = {
    id: usuario.id,
    nome: usuario.nome,
    email: usuario.email,
    telefone: usuario.telefone,
    cidade: usuario.cidade,
    fotoPerfilUrl: usuario.fotoPerfilUrl,
  }

  localStorage.setItem(USER_PROFILE_CACHE_KEY, JSON.stringify(usuarioCache))
  if (usuarioCache.nome) localStorage.setItem('usuarioNome', usuarioCache.nome)
  if (usuarioCache.email) localStorage.setItem('usuarioEmail', usuarioCache.email)
}

function isGenericLoginDisplayName(name = '') {
  const normalized = name.trim().toLowerCase()
  return [
    'seu estudio',
    'seu estúdio',
    'seu estudio fotografico',
    'seu estúdio fotográfico',
  ].includes(normalized)
}

function FotolharLogo({ compact = false }) {
  return (
    <img
      src={fotolharWordmark}
      alt="Fotolhar"
      className={`block h-auto object-contain brightness-0 invert ${compact ? 'w-[118px]' : 'w-[152px]'}`}
    />
  )
}

const navLinks = [
  { label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
  { label: 'Ensaios', to: '/ensaios', icon: CalendarDays },
  { label: 'Clientes', to: '/clientes', icon: Users },
  { label: 'Novo Ensaio', to: '/novo-ensaio', icon: PlusCircle },
  { label: 'Relatórios', to: '/relatorios' },
  { label: 'Configurações', to: '/configuracoes', icon: Settings },
]

const SIDEBAR_QUICK_TIPS = [
  {
    id: 'CLIENTES_REGIAO',
    title: 'Organize sua base',
    text: 'Manter a região dos clientes atualizada ajuda a entender onde seu trabalho tem mais presença.',
    button: 'Ver clientes',
    route: '/clientes',
  },
  {
    id: 'AGENDA',
    title: 'Planeje a agenda',
    text: 'Cadastre seus próximos ensaios para visualizar o mês e se preparar com antecedência.',
    button: 'Novo ensaio',
    route: '/novo-ensaio',
  },
  {
    id: 'PROXIMOS_ENSAIOS',
    title: 'Próximos ensaios',
    text: '',
    button: 'Ver agenda',
    route: '/ensaios?view=calendar',
  },
  {
    id: 'ALBUNS',
    title: 'Apresente seu trabalho',
    text: 'Crie álbuns para reunir fotos, valorizar a entrega e facilitar o compartilhamento com cada cliente.',
    button: 'Ver ensaios',
    route: '/ensaios',
  },
  {
    id: 'FINANCEIRO',
    title: 'Cuide do financeiro',
    text: 'Registrar valores e formas de pagamento torna seus relatórios mais úteis para o planejamento do estúdio.',
    button: 'Ver relatórios',
    route: '/relatorios',
  },
  {
    id: 'ROTINA',
    title: 'Organize sua rotina',
    text: 'Reserve alguns minutos para revisar sua agenda e deixar os próximos atendimentos bem preparados.',
    button: 'Ver agenda',
    route: '/ensaios?view=calendar',
  },
  {
    id: 'PORTFOLIO',
    title: 'Valorize suas entregas',
    text: 'Revisitar trabalhos concluídos é uma boa oportunidade para selecionar imagens para o seu portfólio.',
    button: 'Ver ensaios',
    route: '/ensaios?status=FINALIZADO',
  },
  {
    id: 'PREFERENCIAS',
    title: 'Personalize o estúdio',
    text: 'Ajuste suas preferências para deixar o sistema mais alinhado à sua forma de trabalhar.',
    button: 'Abrir configurações',
    route: '/configuracoes',
  },
]

const FALLBACK_SIDEBAR_TIP_IDS = ['ROTINA', 'PORTFOLIO', 'PREFERENCIAS']

function getTipById(id) {
  return SIDEBAR_QUICK_TIPS.find((tip) => tip.id === id)
}

function getSidebarQuickTip(rotationSlot = 0, context = null) {
  const clientesSemCidade = Number(context?.clientesSemCidade || 0)
  const ensaiosDoMes = context?.ensaiosDoMes
  const ensaiosAgendados = Number(context?.ensaiosAgendados || 0)
  const naoExistemAlbunsCriados = context?.naoExistemAlbunsCriados === true
  const dadosFinanceirosIncompletos = context?.dadosFinanceirosIncompletos === true

  if (clientesSemCidade > 0) return getTipById('CLIENTES_REGIAO')
  if (ensaiosDoMes === 0) return getTipById('AGENDA')
  if (naoExistemAlbunsCriados) return getTipById('ALBUNS')
  if (dadosFinanceirosIncompletos) return getTipById('FINANCEIRO')
  if (ensaiosAgendados > 0) {
    const tip = getTipById('PROXIMOS_ENSAIOS')
    const descricao = ensaiosAgendados === 1
      ? 'Você tem 1 ensaio agendado.'
      : `Você tem ${ensaiosAgendados} ensaios agendados.`

    return {
      ...tip,
      text: `${descricao} Revise datas e confirme os detalhes com antecedência.`,
    }
  }

  return getTipById(FALLBACK_SIDEBAR_TIP_IDS[rotationSlot % FALLBACK_SIDEBAR_TIP_IDS.length])
}

function getInitials(nome = '') {
  const initials = nome
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()

  return initials || 'FT'
}

export default function Header({ quickTipContext = null }) {
  const location = useLocation()
  const navigate = useNavigate()
  const menuRef = useRef(null)

  const [menuOpen, setMenuOpen] = useState(false)
  const [usuario, setUsuario] = useState(() => readCachedUsuario())
  const [tipRotationSlot, setTipRotationSlot] = useState(() =>
    Math.floor(Date.now() / SIDEBAR_TIP_ROTATION_INTERVAL_MS)
  )

  useEffect(() => {
    document.body.classList.add('fotolhar-has-sidebar')

    return () => {
      document.body.classList.remove('fotolhar-has-sidebar')
    }
  }, [])

  useEffect(() => {
    let isMounted = true

    async function carregarUsuario() {
      const sessionKey = getCurrentAuthSessionKey()

      try {
        const data = await configuracoesService.buscar()
        if (isMounted && isCurrentAuthSession(sessionKey)) {
          const nextUsuario = data?.usuario || null
          setUsuario(nextUsuario)
          cacheUsuario(nextUsuario)
        }
      } catch (error) {
        if (isMounted && !isStaleSessionError(error) && isCurrentAuthSession(sessionKey)) {
          setUsuario(null)
        }
      }
    }

    function handleUsuarioAtualizado(event) {
      if (event.detail) {
        setUsuario(event.detail)
        cacheUsuario(event.detail)
        return
      }

      carregarUsuario()
    }

    carregarUsuario()

    window.addEventListener('fotolhar:usuario-atualizado', handleUsuarioAtualizado)

    return () => {
      isMounted = false
      window.removeEventListener('fotolhar:usuario-atualizado', handleUsuarioAtualizado)
    }
  }, [])

  useEffect(() => {
    const interval = window.setInterval(() => {
      setTipRotationSlot(Math.floor(Date.now() / SIDEBAR_TIP_ROTATION_INTERVAL_MS))
    }, 60000)

    return () => window.clearInterval(interval)
  }, [])

  useEffect(() => {
    if (!usuario?.fotoPerfilUrl) return

    const image = new Image()
    image.src = usuario.fotoPerfilUrl
  }, [usuario?.fotoPerfilUrl])

  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const initials = useMemo(() => getInitials(usuario?.nome), [usuario])
  const quickTip = useMemo(
    () => getSidebarQuickTip(tipRotationSlot, quickTipContext),
    [tipRotationSlot, quickTipContext]
  )
  const usuarioNome = usuario?.nome || usuario?.email || 'Usuário'
  const usuarioDetalhe = 'Profissional'

  const isActive = (to) =>
    to === '/ensaios'
      ? location.pathname.startsWith('/ensaios')
      : to === '/clientes'
        ? location.pathname.startsWith('/clientes')
      : location.pathname === to

  const handleLogout = () => {
    const usuarioEmail = usuario?.email || localStorage.getItem('usuarioEmail') || ''
    const loginDisplayName = usuario?.nome || localStorage.getItem('usuarioNome')
    const onboardingEntries = getPreservedOnboardingEntries()

    configuracoesService.invalidateAllUserCaches()
    invalidateOnboardingRouteCache()
    localStorage.clear()

    onboardingEntries.forEach(([key, value]) => localStorage.setItem(key, value))
    if (usuarioEmail && loginDisplayName && !isGenericLoginDisplayName(loginDisplayName)) {
      localStorage.setItem(`${LOGIN_DISPLAY_NAME_KEY}:${usuarioEmail.trim().toLowerCase()}`, loginDisplayName)
    }

    setMenuOpen(false)
    navigate('/login')
  }

  const handleNavIntent = (to) => {
    if (to === '/ensaios') {
      ensaiosService.prefetchListar()
    }
  }

  return (
    <header className="app-sidebar-shell">
      <aside className="theme-static fixed inset-y-0 left-0 z-[100] hidden w-[216px] flex-col border-r border-[#2A2D2F] bg-[#111315] px-4 py-7 text-[#FFFFFF] shadow-[12px_0_36px_rgba(0,0,0,0.28)] lg:flex">
        <Link to="/dashboard" className="flex h-10 items-center no-underline">
          <FotolharLogo />
        </Link>

        <nav className="mt-4 space-y-1.5">
          {navLinks.map((link) => {
            const active = isActive(link.to)
            const LinkIcon = link.icon || BarChart3

            return (
              <Link
                key={link.to}
                to={link.to}
                aria-current={active ? 'page' : undefined}
                onMouseEnter={() => handleNavIntent(link.to)}
                onFocus={() => handleNavIntent(link.to)}
                className={`flex h-11 items-center gap-3.5 rounded-[10px] px-3.5 text-[12px] font-medium no-underline transition ${
                  active
                    ? 'bg-[#C84F32] text-[#FFFFFF] shadow-[0_12px_24px_rgba(200,79,50,0.18)] hover:bg-[#AE3F28]'
                    : 'text-[#D9D9DA] hover:bg-[#1A1D1F] hover:text-[#FFFFFF]'
                }`}
              >
                <LinkIcon size={17} strokeWidth={active ? 2.15 : 1.8} />
                <span>{link.label}</span>
              </Link>
            )
          })}
        </nav>

        <div className="mt-auto space-y-3">
          <article className="rounded-[9px] border border-[#4A2B24] bg-[#17191B] p-4 shadow-[0_14px_32px_rgba(0,0,0,0.18)]">
            <div className="flex items-center gap-2 text-[#E36A4D]">
              <Sparkles size={15} strokeWidth={1.8} />
              <h2 className="text-[12px] font-semibold">Dica rápida</h2>
            </div>

            <strong className="mt-3 block text-[11px] font-semibold leading-4 text-[#FFFFFF]">
              {quickTip.title}
            </strong>

            <p className="mt-1.5 text-[10.5px] leading-4 text-[#B9B9BA]">
              {quickTip.text}
            </p>

            <Link
              to={quickTip.route}
              className="mt-3 flex h-9 items-center justify-center rounded-[7px] border border-[#C84F32] bg-transparent px-2.5 text-center text-[10.5px] font-semibold text-[#F8EDE8] no-underline transition hover:border-[#AE3F28] hover:bg-[#2A1713] hover:text-[#FFFFFF]"
            >
              {quickTip.button}
            </Link>
          </article>

          <div ref={menuRef} className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((current) => !current)}
              title="Seus Dados"
              className="flex w-full items-center gap-2.5 rounded-[9px] border border-[#2A2D2F] bg-[#17191B] p-3 text-left transition hover:border-[#684235] hover:bg-[#1B1E20]"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[#2A2D2F] bg-[#242729] text-[10px] font-bold text-[#F8EDE8]">
                {usuario?.fotoPerfilUrl ? (
                  <img
                    src={usuario.fotoPerfilUrl}
                    alt={usuarioNome}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  initials
                )}
              </span>

              <span className="min-w-0 flex-1">
                <strong className="block truncate text-[11px] font-semibold leading-4 text-[#FFFFFF]">
                  {usuarioNome}
                </strong>
                <span className="block truncate text-[10px] leading-3 text-[#B9B9BA]">
                  {usuarioDetalhe}
                </span>
              </span>

              <ChevronUp
                size={15}
                strokeWidth={1.8}
                className={`shrink-0 text-[#B9B9BA] transition ${menuOpen ? '' : 'rotate-180'}`}
              />
            </button>

            {menuOpen && (
              <div className="header-popover absolute bottom-[64px] left-0 w-full overflow-hidden rounded-[8px] border border-[#2A2D2F] bg-[#17191B] shadow-[0_18px_44px_rgba(0,0,0,0.36)]">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex w-full items-center gap-3 px-3 py-3 text-left text-[13px] text-red-300 transition hover:bg-red-500/10 hover:text-red-200"
                >
                  <LogOut size={16} />
                  Sair
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      <div className="theme-static fixed left-0 right-0 top-0 z-[100] flex h-[60px] items-center gap-3 border-b border-[#2A2D2F] bg-[#111315] px-4 text-[#FFFFFF] shadow-[0_10px_28px_rgba(0,0,0,0.24)] lg:hidden">
        <Link to="/dashboard" className="flex shrink-0 items-center no-underline">
          <FotolharLogo compact />
        </Link>

        <nav className="ml-auto flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
          {navLinks.map((link) => {
            const active = isActive(link.to)
            const LinkIcon = link.icon || BarChart3

            return (
              <Link
                key={link.to}
                to={link.to}
                title={link.label}
                aria-current={active ? 'page' : undefined}
                onMouseEnter={() => handleNavIntent(link.to)}
                onFocus={() => handleNavIntent(link.to)}
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px] transition ${
                  active
                    ? 'bg-[#C84F32] text-[#FFFFFF]'
                    : 'text-[#B9B9BA] hover:bg-[#1A1D1F] hover:text-[#FFFFFF]'
                }`}
              >
                <LinkIcon size={16} />
              </Link>
            )
          })}
        </nav>

        <AppTopControls compact surface="dark" />
      </div>
    </header>
  )
}
