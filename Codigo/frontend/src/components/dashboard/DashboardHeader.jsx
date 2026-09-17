import { Link } from 'react-router-dom'
import {
    ArrowRight,
    CalendarDays,
    Sparkles,
} from 'lucide-react'

import { formatarHora } from '../../utils/dashboardFormatters'
import { getOnboardingKey } from '../../utils/onboarding'

function isSameLocalDay(left, right) {
    return (
        left.getFullYear() === right.getFullYear() &&
        left.getMonth() === right.getMonth() &&
        left.getDate() === right.getDate()
    )
}

function getFirstName(name = '') {
    return name
        .trim()
        .split(' ')
        .filter(Boolean)[0] || ''
}

function getWeekDays(today) {
    return Array.from({ length: 7 }, (_, index) => {
        const date = new Date(today)
        date.setDate(today.getDate() + index)

        return date
    })
}

function getEnsaiosDoDia(ensaios = [], date) {
    return ensaios.filter((ensaio) => {
        if (!ensaio?.dataEnsaio) return false

        const ensaioDate = new Date(ensaio.dataEnsaio)

        return !Number.isNaN(ensaioDate.getTime()) && isSameLocalDay(ensaioDate, date)
    })
}

function getResumoHoje(ensaios = [], today) {
    const ensaiosHoje = getEnsaiosDoDia(ensaios, today)

    if (!ensaiosHoje.length) {
        return 'Hoje: nenhum ensaio agendado'
    }

    const primeiroHorario = ensaiosHoje
        .map((ensaio) => new Date(ensaio.dataEnsaio))
        .filter((date) => !Number.isNaN(date.getTime()))
        .sort((left, right) => left - right)[0]

    const label = ensaiosHoje.length === 1 ? 'ensaio agendado' : 'ensaios agendados'

    return `Hoje: ${ensaiosHoje.length} ${label}${primeiroHorario ? ` as ${formatarHora(primeiroHorario)}` : ''}`
}

function getAgendaDaySummary(ensaiosDia = [], date) {
    const data = date.toLocaleDateString('pt-BR', {
        weekday: 'long',
        day: '2-digit',
        month: '2-digit',
    })
    const dataLabel = data.charAt(0).toUpperCase() + data.slice(1)

    if (!ensaiosDia.length) {
        return `${dataLabel}: nenhum ensaio agendado`
    }

    const label = ensaiosDia.length === 1 ? 'ensaio agendado' : 'ensaios agendados'
    const horarios = ensaiosDia
        .map((ensaio) => new Date(ensaio.dataEnsaio))
        .filter((ensaioDate) => !Number.isNaN(ensaioDate.getTime()))
        .sort((left, right) => left - right)
        .map(formatarHora)
        .join(', ')

    return `${dataLabel}: ${ensaiosDia.length} ${label}${horarios ? ` as ${horarios}` : ''}`
}

function getDashboardTip(dashboard, agenda, today) {
    const ensaiosHoje = getEnsaiosDoDia(agenda, today)

    if (ensaiosHoje.length > 0) {
        return {
            title: 'Ensaio hoje',
            text: 'Confira horário, local e detalhes do atendimento antes de sair para o ensaio.',
            to: '/ensaios?view=calendar&grupo=todos',
        }
    }

    if (Number(dashboard?.selecoesEnviadas || 0) > 0) {
        return {
            title: 'Seleções recebidas',
            text: 'Revise as seleções pendentes para liberar a edição e acelerar a entrega.',
            to: '/ensaios?status=EM_SELECAO',
        }
    }

    if (Number(dashboard?.pendenciasTotal || 0) > 0) {
        return {
            title: 'Atenção necessária',
            text: 'Resolva os itens de atenção para evitar atraso em álbuns, fotos ou entregas.',
            to: '/dashboard',
        }
    }

    if (Number(dashboard?.ensaiosSemFotosEnviadas || 0) > 0) {
        return {
            title: 'Fotos pendentes',
            text: 'Envie as fotos dos ensaios sem upload para deixar a galeria pronta para acesso.',
            to: '/ensaios?grupo=ativos',
        }
    }

    if (Number(dashboard?.ensaiosProximosSeteDias || 0) > 0) {
        return {
            title: 'Agenda da semana',
            text: 'Revise os próximos ensaios e confirme detalhes de horário, local e contrato.',
            to: '/ensaios?view=calendar&grupo=todos',
        }
    }

    return {
        title: 'Tudo organizado',
        text: 'Sua agenda está tranquila. Aproveite para revisar mensagens, contratos e configurações.',
        to: '/configuracoes',
    }
}

export default function DashboardHeader({ dashboard }) {
    const hoje = new Date()
    const primeiroNome = getFirstName(localStorage.getItem('usuarioNome') || '')
    const onboardingCompletedAt = localStorage.getItem(getOnboardingKey('completedAt'))
    const onboardingDate = onboardingCompletedAt ? new Date(onboardingCompletedAt) : null
    const firstAccess =
        !onboardingDate ||
        Number.isNaN(onboardingDate.getTime()) ||
        isSameLocalDay(onboardingDate, hoje)
    const saudacao = firstAccess ? 'Bem-vindo' : 'Bem-vindo de volta'
    const saudacaoNome = primeiroNome ? `${saudacao}, ${primeiroNome}!` : `${saudacao}!`
    const agenda = dashboard?.agendaProxima || []
    const weekDays = getWeekDays(hoje)
    const tip = getDashboardTip(dashboard, agenda, hoje)

    const dataFormatada = hoje.toLocaleDateString(
        'pt-BR',
        {
            weekday: 'long',
            day: '2-digit',
            month: 'long',
            year: 'numeric',
        }
    )

    return (
        <section className="grid items-stretch gap-5 lg:grid-cols-[minmax(0,1.45fr)_minmax(340px,0.75fr)]">
            <div>
                <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-[9px] border border-[var(--gold-border)] bg-[var(--gold-dim)] text-[var(--gold)]">
                        <CalendarDays size={16} />
                    </span>

                    <p className="theme-muted text-xs font-semibold uppercase tracking-[0.28em]">
                        {dataFormatada}
                    </p>
                </div>

                <h1 className="theme-title mt-5 font-serif text-5xl font-light tracking-normal md:text-6xl">
                    {saudacaoNome}
                </h1>

                <p className="theme-muted mt-3 text-base font-medium">
                    Aqui está o resumo do que acontece no seu estúdio hoje.
                </p>

                <Link
                    to={tip.to}
                    className="theme-card mt-5 flex min-h-[64px] items-center gap-4 rounded-[14px] border px-4 py-3 transition hover:border-[var(--gold-border)]"
                >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--gold-dim)] text-[var(--gold)]">
                        <Sparkles size={18} />
                    </span>

                    <span className="min-w-0 flex-1">
                        <strong className="block text-sm font-semibold text-[var(--gold)]">
                            {tip.title}
                        </strong>
                        <span className="theme-muted block truncate text-sm">
                            {tip.text}
                        </span>
                    </span>

                    <ArrowRight size={18} className="shrink-0 text-[var(--gold)]" />
                </Link>
            </div>

            <div className="flex h-full flex-col">
                <section className="theme-card flex h-full flex-col justify-between rounded-[18px] border p-5">
                    <div className="mb-4 flex items-center justify-between gap-3">
                        <h2 className="theme-muted text-xs font-semibold uppercase tracking-[0.18em]">
                            Agenda da semana
                        </h2>

                        <Link
                            to="/ensaios?view=calendar&grupo=todos"
                            className="theme-muted inline-flex items-center gap-2 text-xs font-medium transition hover:text-[var(--gold)]"
                        >
                            Ver agenda
                            <CalendarDays size={13} />
                        </Link>
                    </div>

                    <div className="grid grid-cols-7 gap-1.5">
                        {weekDays.map((date, index) => {
                            const ensaiosDia = getEnsaiosDoDia(agenda, date)
                            const active = index === 0

                            return (
                                <button
                                    key={date.toISOString()}
                                    type="button"
                                    title={getAgendaDaySummary(ensaiosDia, date)}
                                    aria-label={getAgendaDaySummary(ensaiosDia, date)}
                                    className={`group relative flex min-h-[68px] flex-col items-center justify-center rounded-[12px] border text-center outline-none transition hover:border-[var(--gold-border)] hover:bg-[var(--gold-dim)] focus-visible:border-[var(--gold-border)] focus-visible:bg-[var(--gold-dim)] focus-visible:ring-2 focus-visible:ring-[var(--gold)]/20 ${
                                        active
                                            ? 'border-[var(--gold-border)] bg-[var(--gold-dim)]'
                                            : 'border-transparent'
                                    }`}
                                >
                                    <span className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 w-max max-w-[220px] -translate-x-1/2 rounded-lg border border-[var(--gold-border)] bg-[var(--card)] px-3 py-2 text-center text-[11px] font-medium leading-4 text-[var(--text)] opacity-0 shadow-xl shadow-black/20 transition group-hover:opacity-100 group-focus-visible:opacity-100">
                                        {getAgendaDaySummary(ensaiosDia, date)}
                                    </span>
                                    <span className="theme-muted text-[10px] font-semibold uppercase">
                                        {date.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')}
                                    </span>
                                    <span className="theme-title mt-1 text-base">
                                        {String(date.getDate()).padStart(2, '0')}
                                    </span>
                                    <span className={`mt-1 h-1.5 w-1.5 rounded-full ${ensaiosDia.length ? 'bg-[var(--gold)]' : 'bg-transparent'}`} />
                                </button>
                            )
                        })}
                    </div>

                    <div className="theme-divider mt-4 flex items-center justify-between gap-3 border-t pt-3">
                        <p className="theme-muted inline-flex min-w-0 items-center gap-2 truncate text-sm">
                            <CalendarDays size={15} className="text-[var(--gold)]" />
                            {getResumoHoje(agenda, hoje)}
                        </p>

                        <Link
                            to="/ensaios?view=calendar&grupo=todos"
                            aria-label="Abrir agenda"
                            className="text-[var(--gold)] transition hover:translate-x-0.5"
                        >
                            <ArrowRight size={17} />
                        </Link>
                    </div>
                </section>
            </div>
        </section>
    )
}
