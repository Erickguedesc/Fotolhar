import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import {
  AlertTriangle,
  Bell,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock3,
  CreditCard,
  FileText,
  Hourglass,
  Images,
  Timer,
  X,
} from 'lucide-react'

import { notificacoesService } from '../../services/notificacoesService'

const CONFIG = {
  ENSAIO_ATRASADO: {
    icon: AlertTriangle,
    accent: 'text-[#D95732]',
    dot: 'bg-[#D95732]',
    line: 'bg-[#D95732]',
    iconBg: 'bg-[#F8EDE8]',
    chip: 'bg-[#F8EDE8] text-[#D95732]',
  },
  SELECAO_ENVIADA: {
    icon: CheckCircle2,
    accent: 'text-[#16A56E]',
    dot: 'bg-[#16A56E]',
    line: 'bg-[#16A56E]',
    iconBg: 'bg-[#E7F8EF]',
    chip: 'bg-[#E7F8EF] text-[#168956]',
  },
  ALBUM_EXPIRANDO: {
    icon: Images,
    accent: 'text-[#2F78D8]',
    dot: 'bg-[#2F78D8]',
    line: 'bg-[#2F78D8]',
    iconBg: 'bg-[#EAF2FF]',
    chip: 'bg-[#EAF2FF] text-[#2F6EBF]',
  },
  SELECAO_SEM_RESPOSTA: {
    icon: Hourglass,
    accent: 'text-[#E49A12]',
    dot: 'bg-[#E49A12]',
    line: 'bg-[#E49A12]',
    iconBg: 'bg-[#FFF4DD]',
    chip: 'bg-[#FFF4DD] text-[#C98208]',
  },
  STATUS_PARADO: {
    icon: Timer,
    accent: 'text-[#8067D8]',
    dot: 'bg-[#8067D8]',
    line: 'bg-[#8067D8]',
    iconBg: 'bg-[#F0EAFF]',
    chip: 'bg-[#F0EAFF] text-[#735BC7]',
  },
  ENTREGA_ATRASADA: {
    icon: Clock3,
    accent: 'text-[#D94343]',
    dot: 'bg-[#D94343]',
    line: 'bg-[#D94343]',
    iconBg: 'bg-[#FFF0F0]',
    chip: 'bg-[#FFF0F0] text-[#C73535]',
  },
  PAGAMENTO_PENDENTE: {
    icon: CreditCard,
    accent: 'text-[#D95732]',
    dot: 'bg-[#D95732]',
    line: 'bg-[#D95732]',
    iconBg: 'bg-[#F8EDE8]',
    chip: 'bg-[#F8EDE8] text-[#D95732]',
  },
}

const prioridadeLabel = {
  ALTA: 'Urgente',
  MEDIA: 'Atenção',
  BAIXA: 'Info',
}

function formatDate(value) {
  if (!value) return ''

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
  })
}

function formatRelativeTime(value) {
  if (!value) return 'Agora'

  const date = new Date(value)
  const timestamp = date.getTime()
  if (Number.isNaN(timestamp)) return 'Agora'

  const diffMs = Date.now() - timestamp
  if (diffMs < 60 * 1000) return 'Agora'

  const diffMinutes = Math.floor(diffMs / 60000)
  if (diffMinutes < 60) return `${diffMinutes}min atrás`

  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) return `${diffHours}h atrás`

  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 7) return `${diffDays}d atrás`

  return formatDate(value)
}

export default function NotificationBell() {
  const navigate = useNavigate()
  const containerRef = useRef(null)

  const [open, setOpen] = useState(false)
  const [allNotificationsOpen, setAllNotificationsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [markAllLoading, setMarkAllLoading] = useState(false)
  const [notificacoes, setNotificacoes] = useState([])

  const total = notificacoes.length
  const urgentes = useMemo(
    () => notificacoes.filter((item) => item.prioridade === 'ALTA').length,
    [notificacoes]
  )

  const carregar = async () => {
    try {
      setLoading(true)
      const data = await notificacoesService.listar()
      setNotificacoes(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('[Notificacoes] Erro ao carregar:', error?.response?.data || error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    carregar()

    const interval = window.setInterval(carregar, 60000)

    return () => window.clearInterval(interval)
  }, [])

  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)

    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (!allNotificationsOpen) return undefined

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [allNotificationsOpen])

  const handleMarkAllAsRead = async () => {
    if (!notificacoes.length || markAllLoading) return

    const atuais = notificacoes
    setMarkAllLoading(true)
    setNotificacoes([])

    try {
      await Promise.all(atuais.map((notificacao) => notificacoesService.dispensar(notificacao.chave)))
    } catch (error) {
      console.error('[Notificacoes] Erro ao dispensar todas:', error?.response?.data || error)
      carregar()
    } finally {
      setMarkAllLoading(false)
    }
  }

  const handleDismissNotification = async (event, notificacao) => {
    event.stopPropagation()

    setNotificacoes((current) =>
      current.filter((item) => item.chave !== notificacao.chave)
    )

    try {
      await notificacoesService.dispensar(notificacao.chave)
    } catch (error) {
      console.error('[Notificacoes] Erro ao dispensar:', error?.response?.data || error)
      carregar()
    }
  }

  const handleOpenNotification = (notificacao) => {
    setOpen(false)
    setAllNotificationsOpen(false)
    navigate(notificacao.actionUrl || '/ensaios')
  }

  const handleOpenAllNotifications = () => {
    setOpen(false)
    setAllNotificationsOpen(true)
  }

  const allNotificationsModal = allNotificationsOpen ? (
    <div className="fixed inset-0 z-[520] flex items-center justify-center bg-[#1F1F21]/35 px-4 py-6 backdrop-blur-sm">
      <section className="flex max-h-[min(760px,calc(100vh-48px))] w-full max-w-[620px] flex-col overflow-hidden rounded-[18px] border border-[#E8E3DF] bg-white shadow-[0_28px_80px_rgba(31,31,33,0.18)]">
        <div className="flex shrink-0 items-center justify-between gap-5 border-b border-[#E8E3DF] px-6 py-5 max-sm:px-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[13px] text-[#D95732]">
              <Bell size={29} strokeWidth={1.6} />
            </span>

            <div className="min-w-0">
              <h2 className="text-[22px] font-semibold leading-tight text-[#1F1F21]">
                Todas as notificações
              </h2>
              <p className="mt-1 text-sm text-[#6F6D6B]">
                {total
                  ? `${total} alerta${total === 1 ? '' : 's'}${urgentes ? ` · ${urgentes} urgente${urgentes === 1 ? '' : 's'}` : ''}`
                  : 'Tudo em dia por aqui'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setAllNotificationsOpen(false)}
            title="Fechar notificações"
            aria-label="Fechar notificações"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#E8E3DF] bg-white text-[#6F6D6B] transition hover:border-[#D95732] hover:text-[#D95732]"
          >
            <X size={18} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 max-sm:px-4">
          {total === 0 ? (
            <div className="px-4 py-14 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-[14px] bg-[#E7F8EF] text-[#16A56E]">
                <CheckCircle2 size={22} />
              </div>

              <p className="mt-3 text-sm font-semibold text-[#1F1F21]">
                Nenhuma notificação
              </p>
              <p className="mx-auto mt-1.5 max-w-[300px] text-xs leading-5 text-[#6F6D6B]">
                Alertas importantes aparecem aqui quando algum ensaio precisa de atenção.
              </p>
            </div>
          ) : (
            notificacoes.map((notificacao) => {
              const config = CONFIG[notificacao.tipo] || CONFIG.STATUS_PARADO
              const Icon = config.icon
              const dateLabel = formatDate(notificacao.dataReferencia)

              return (
                <button
                  key={notificacao.chave}
                  type="button"
                  onClick={() => handleOpenNotification(notificacao)}
                  className="group grid w-full grid-cols-[4px_58px_minmax(0,1fr)_58px] gap-4 border-b border-[#EEEAE7] py-5 text-left transition last:border-b-0 hover:bg-[#FFF9F6] max-sm:grid-cols-[3px_46px_minmax(0,1fr)_48px] max-sm:gap-3"
                >
                  <span className={`my-1 block rounded-full ${config.line}`} />

                  <span className={`flex h-12 w-12 items-center justify-center rounded-[14px] ${config.iconBg} ${config.accent} max-sm:h-11 max-sm:w-11`}>
                    <Icon size={24} strokeWidth={1.7} />
                  </span>

                  <span className="min-w-0">
                    <span className="flex items-center justify-between gap-3">
                      <strong className="block text-[16px] font-semibold leading-5 text-[#1F1F21] max-sm:text-[14px]">
                        {notificacao.titulo}
                      </strong>

                      <span className={`flex shrink-0 items-center gap-2 text-xs font-medium ${config.accent} max-sm:hidden`}>
                        {formatRelativeTime(notificacao.dataReferencia)}
                        <span className={`h-2 w-2 rounded-full ${config.dot}`} />
                      </span>
                    </span>

                    <span className="mt-2 block text-[13px] leading-5 text-[#3F3D3A]">
                      {notificacao.descricao}
                    </span>

                    <span className="mt-3 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1.5 text-[11px] text-[#6F6D6B]">
                      <span className={`rounded-full px-2.5 py-1 font-medium ${config.chip}`}>
                        {prioridadeLabel[notificacao.prioridade] || 'Info'}
                      </span>

                      {notificacao.clienteNome && (
                        <>
                          <span className="h-4 w-px bg-[#D8D2CD]" />
                          <span className="min-w-0 truncate">{notificacao.clienteNome}</span>
                        </>
                      )}

                      {dateLabel && (
                        <>
                          <span className="h-4 w-px bg-[#D8D2CD]" />
                          <span className="inline-flex items-center gap-2">
                            <CalendarDays size={13} />
                            {dateLabel}
                          </span>
                        </>
                      )}
                    </span>
                  </span>

                  <span className="flex items-center justify-end gap-1 text-[#6F6D6B]">
                    <span
                      role="button"
                      tabIndex={0}
                      title="Remover notificação"
                      aria-label="Remover notificação"
                      onClick={(event) => handleDismissNotification(event, notificacao)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          handleDismissNotification(event, notificacao)
                        }
                      }}
                      className="flex h-8 w-8 items-center justify-center rounded-full transition hover:bg-[#F8EDE8] hover:text-[#D95732] max-sm:h-7 max-sm:w-7"
                    >
                      <X size={15} />
                    </span>
                    <ChevronRight size={21} strokeWidth={1.7} className="transition group-hover:text-[#D95732]" />
                  </span>
                </button>
              )
            })
          )}
        </div>

        {total > 0 && (
          <div className="flex shrink-0 justify-end border-t border-[#E8E3DF] px-6 py-4 max-sm:px-4">
            <button
              type="button"
              disabled={markAllLoading}
              onClick={handleMarkAllAsRead}
              className="rounded-full border border-[#E8E3DF] bg-white px-5 py-2.5 text-sm font-semibold text-[#D95732] transition hover:border-[#D95732] hover:bg-[#F8EDE8] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {markAllLoading ? 'Marcando...' : 'Marcar todas como lidas'}
            </button>
          </div>
        )}
      </section>
    </div>
  ) : null

  return (
    <div ref={containerRef} className="relative z-[220] mr-3 flex-shrink-0">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        title="Notificações"
        aria-label="Notificações"
        className="relative flex h-11 w-11 items-center justify-center rounded-full border border-[#E8E3DF] bg-white text-[#1F1F21] shadow-[0_10px_26px_rgba(31,31,33,0.08)] transition hover:border-[#C84F32] hover:bg-[#F8EDE8] hover:text-[#C84F32]"
      >
        <Bell size={21} strokeWidth={1.9} />

        {total > 0 && (
          <span className="absolute -right-1.5 -top-1.5 flex h-6 min-w-6 items-center justify-center rounded-full bg-[#D95732] px-1.5 text-[11px] font-bold leading-none !text-white shadow-[0_8px_18px_rgba(217,87,50,0.28)]">
            {total > 9 ? '9+' : total}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-14 z-[230] w-[430px] overflow-hidden rounded-[16px] border border-[#E8E3DF] bg-white shadow-[0_24px_64px_rgba(31,31,33,0.14)] max-sm:right-[-66px] max-sm:w-[calc(100vw-24px)]">
          <div className="flex items-center justify-between gap-4 border-b border-[#E8E3DF] px-5 py-4 max-sm:px-4">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] text-[#D95732]">
                <Bell size={27} strokeWidth={1.6} />
              </span>

              <div className="min-w-0">
                <p className="text-[21px] font-semibold leading-tight text-[#1F1F21] max-sm:text-[19px]">
                  Notificações
                </p>
                <p className="mt-0.5 text-[13px] text-[#6F6D6B]">
                {total
                  ? `${total} alerta${total === 1 ? '' : 's'}${urgentes ? ` · ${urgentes} urgente${urgentes === 1 ? '' : 's'}` : ''}`
                  : 'Tudo em dia por aqui'}
                </p>
              </div>
            </div>

            {total > 0 && (
              <button
                type="button"
                disabled={markAllLoading}
                onClick={handleMarkAllAsRead}
                className="shrink-0 text-right text-[13px] font-medium text-[#D95732] transition hover:text-[#AE3F28] disabled:cursor-not-allowed disabled:opacity-60 max-sm:text-[12px]"
              >
                {markAllLoading ? 'Marcando...' : 'Marcar todas como lidas'}
              </button>
            )}
          </div>

          {total === 0 ? (
            <div className="px-6 py-9 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-[14px] bg-[#E7F8EF] text-[#16A56E]">
                <CheckCircle2 size={22} />
              </div>

              <p className="mt-3 text-sm font-semibold text-[#1F1F21]">
                Nenhuma notificação
              </p>
              <p className="mx-auto mt-1.5 max-w-[300px] text-xs leading-5 text-[#6F6D6B]">
                Alertas importantes aparecem aqui quando algum ensaio precisa de atenção.
              </p>
            </div>
          ) : (
            <div className="theme-scrollbar max-h-[420px] overflow-y-auto px-5 max-sm:px-4">
              {notificacoes.map((notificacao) => {
                const config = CONFIG[notificacao.tipo] || CONFIG.STATUS_PARADO
                const Icon = config.icon
                const dateLabel = formatDate(notificacao.dataReferencia)

                return (
                  <button
                    key={notificacao.chave}
                    type="button"
                    onClick={() => handleOpenNotification(notificacao)}
                    className="group grid w-full grid-cols-[3px_48px_minmax(0,1fr)_54px] gap-3.5 border-b border-[#EEEAE7] py-4 text-left transition last:border-b-0 hover:bg-[#FFF9F6] max-sm:grid-cols-[3px_44px_minmax(0,1fr)_46px] max-sm:gap-3"
                  >
                    <span className={`my-1 block rounded-full ${config.line}`} />

                    <span className={`flex h-11 w-11 items-center justify-center rounded-[12px] ${config.iconBg} ${config.accent}`}>
                      <Icon size={22} strokeWidth={1.7} />
                    </span>

                    <span className="min-w-0">
                      <span className="flex items-center justify-between gap-3">
                        <strong className="block text-[15px] font-semibold leading-5 text-[#1F1F21] max-sm:text-[14px]">
                          {notificacao.titulo}
                        </strong>

                        <span className={`flex shrink-0 items-center gap-2 text-xs font-medium ${config.accent} max-sm:hidden`}>
                          {formatRelativeTime(notificacao.dataReferencia)}
                          <span className={`h-2 w-2 rounded-full ${config.dot}`} />
                        </span>
                      </span>

                      <span className="mt-2 block text-[13px] leading-5 text-[#3F3D3A]">
                        {notificacao.descricao}
                      </span>

                      <span className="mt-3 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1.5 text-[11px] text-[#6F6D6B]">
                        <span className={`rounded-full px-2.5 py-1 font-medium ${config.chip}`}>
                          {prioridadeLabel[notificacao.prioridade] || 'Info'}
                        </span>

                        {notificacao.clienteNome && (
                          <>
                            <span className="h-4 w-px bg-[#D8D2CD]" />
                            <span className="min-w-0 truncate">{notificacao.clienteNome}</span>
                          </>
                        )}

                        {dateLabel && (
                          <>
                            <span className="h-4 w-px bg-[#D8D2CD]" />
                            <span className="inline-flex items-center gap-2">
                              <CalendarDays size={13} />
                              {dateLabel}
                            </span>
                          </>
                        )}
                      </span>
                    </span>

                    <span className="flex items-center justify-end gap-1 text-[#6F6D6B]">
                      <span
                        role="button"
                        tabIndex={0}
                        title="Remover notificação"
                        aria-label="Remover notificação"
                        onClick={(event) => handleDismissNotification(event, notificacao)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            handleDismissNotification(event, notificacao)
                          }
                        }}
                        className="flex h-7 w-7 items-center justify-center rounded-full transition hover:bg-[#F8EDE8] hover:text-[#D95732]"
                      >
                        <X size={14} />
                      </span>
                      <ChevronRight size={20} strokeWidth={1.7} className="transition group-hover:text-[#D95732]" />
                    </span>
                  </button>
                )
              })}
            </div>
          )}

          {total > 0 && (
            <button
              type="button"
              onClick={handleOpenAllNotifications}
              className="flex h-12 w-full items-center justify-center gap-3 border-t border-[#E8E3DF] bg-white text-[14px] font-medium text-[#1F1F21] transition hover:bg-[#FFF9F6] hover:text-[#D95732]"
            >
              <FileText size={17} className="text-[#D95732]" />
              Ver todas as notificações
              <ChevronRight size={18} className="text-[#6F6D6B]" />
            </button>
          )}

          {loading && total > 0 && (
            <div className="absolute right-4 top-[66px] rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#6F6D6B] shadow-sm">
              Atualizando
            </div>
          )}
        </div>
      )}

      {allNotificationsModal ? createPortal(allNotificationsModal, document.body) : null}
    </div>
  )
}
