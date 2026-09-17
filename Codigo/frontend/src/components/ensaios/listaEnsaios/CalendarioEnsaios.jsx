import { useMemo, useState } from 'react'
import {
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Info,
  MoreVertical,
} from 'lucide-react'

import Icon from './Icon'
import StatusBadge from './StatusBadge'
import { formatCurrency, getInitials, getStatusInfo, getTipoExibicao } from './ensaioHelpers'

const WEEK_DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab']
const MONTH_OPTIONS = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
]

const MONTH_LABEL = new Intl.DateTimeFormat('pt-BR', {
  month: 'long',
  year: 'numeric',
})

const DAY_LABEL = new Intl.DateTimeFormat('pt-BR', {
  weekday: 'long',
  day: '2-digit',
  month: 'long',
})

const CONFLICT_DATE_LABEL = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: 'long',
  year: 'numeric',
})

const STATUS_DOT = {
  AGENDADO: 'bg-[var(--status-scheduled)]',
  REALIZADO: 'bg-[var(--status-completed)]',
  EM_SELECAO: 'bg-[var(--status-selection)]',
  EM_EDICAO: 'bg-[var(--status-editing)]',
  FINALIZADO: 'bg-[var(--status-delivered)]',
  CANCELADO: 'bg-[var(--status-cancelled)]',
}

const STATUS_TONE = {
  AGENDADO: {
    event: 'border-[rgba(113,103,232,0.22)] bg-[rgba(113,103,232,0.10)] text-[#1F1F21]',
    accent: 'bg-[var(--status-scheduled)]',
    icon: 'text-[var(--status-scheduled)]',
  },
  REALIZADO: {
    event: 'border-[rgba(98,168,62,0.22)] bg-[rgba(98,168,62,0.10)] text-[#1F1F21]',
    accent: 'bg-[var(--status-completed)]',
    icon: 'text-[var(--status-completed)]',
  },
  EM_SELECAO: {
    event: 'border-[rgba(242,154,46,0.24)] bg-[rgba(242,154,46,0.12)] text-[#1F1F21]',
    accent: 'bg-[var(--status-selection)]',
    icon: 'text-[var(--status-selection)]',
  },
  EM_EDICAO: {
    event: 'border-[rgba(59,130,246,0.22)] bg-[rgba(59,130,246,0.10)] text-[#1F1F21]',
    accent: 'bg-[var(--status-editing)]',
    icon: 'text-[var(--status-editing)]',
  },
  FINALIZADO: {
    event: 'border-[rgba(32,184,166,0.22)] bg-[rgba(32,184,166,0.10)] text-[#1F1F21]',
    accent: 'bg-[var(--status-delivered)]',
    icon: 'text-[var(--status-delivered)]',
  },
  CANCELADO: {
    event: 'border-[rgba(239,83,80,0.24)] bg-[rgba(239,83,80,0.10)] text-[#1F1F21]',
    accent: 'bg-[var(--status-cancelled)]',
    icon: 'text-[var(--status-cancelled)]',
  },
}

const STATUS_ICON = {
  AGENDADO: 'calendar',
  REALIZADO: 'check',
  EM_SELECAO: 'eye',
  EM_EDICAO: 'edit',
  FINALIZADO: 'file',
  CANCELADO: 'close',
}

const MIN_YEAR = 2000
const MAX_YEAR = 2100

const pad = (value) => String(value).padStart(2, '0')

const isValidDate = (date) =>
  date instanceof Date && !Number.isNaN(date.getTime())

const clampYear = (year) =>
  Math.min(MAX_YEAR, Math.max(MIN_YEAR, year))

const toDateKey = (value) => {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

const toInputDate = (date) =>
  isValidDate(date)
    ? `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
    : ''

const formatTime = (value) => {
  if (!value) return '--:--'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '--:--'
  return date.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

const getCapaUrl = (ensaio) =>
  ensaio?.capaUrl ||
  ensaio?.fotoCapaUrl ||
  ensaio?.capa?.urlWatermark ||
  ensaio?.capa?.urlOriginal ||
  ''

const buildMonthDays = (monthDate) => {
  if (!isValidDate(monthDate)) return []

  const year = monthDate.getFullYear()
  const month = monthDate.getMonth()
  const firstDay = new Date(year, month, 1)
  const start = new Date(year, month, 1 - firstDay.getDay())

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start)
    date.setDate(start.getDate() + index)
    return date
  })
}

export default function CalendarioEnsaios({
  ensaios = [],
  onView,
  onCreateForDate,
}) {
  const hoje = new Date()
  const [mesAtual, setMesAtual] = useState(
    new Date(hoje.getFullYear(), hoje.getMonth(), 1)
  )
  const [anoDigitado, setAnoDigitado] = useState(String(hoje.getFullYear()))
  const [diaSelecionado, setDiaSelecionado] = useState(toInputDate(hoje))
  const hojeKey = toInputDate(hoje)

  const ensaiosPorDia = useMemo(() => {
    return ensaios.reduce((acc, ensaio) => {
      const key = toDateKey(ensaio.dataEnsaio)
      if (!key) return acc

      if (!acc[key]) acc[key] = []
      acc[key].push(ensaio)
      return acc
    }, {})
  }, [ensaios])

  const diasDoMes = useMemo(() => buildMonthDays(mesAtual), [mesAtual])

  const ensaiosDoMes = useMemo(() => {
    return ensaios.filter((ensaio) => {
      const date = new Date(ensaio.dataEnsaio)
      return (
        !Number.isNaN(date.getTime()) &&
        date.getFullYear() === mesAtual.getFullYear() &&
        date.getMonth() === mesAtual.getMonth()
      )
    })
  }, [ensaios, mesAtual])

  const diasOcupadosNoMes = useMemo(() => {
    return new Set(ensaiosDoMes.map((ensaio) => toDateKey(ensaio.dataEnsaio))).size
  }, [ensaiosDoMes])

  const conflitosNoMes = useMemo(() => {
    return Object.entries(ensaiosPorDia).filter(([key, itens]) => {
      const [year, month] = key.split('-').map(Number)
      return (
        year === mesAtual.getFullYear() &&
        month === mesAtual.getMonth() + 1 &&
        itens.length > 1 &&
        key >= hojeKey
      )
    }).length
  }, [ensaiosPorDia, mesAtual, hojeKey])

  const conflitosDetalhesNoMes = useMemo(() => {
    return Object.entries(ensaiosPorDia)
      .filter(([key, itens]) => {
        const [year, month] = key.split('-').map(Number)
        return (
          year === mesAtual.getFullYear() &&
          month === mesAtual.getMonth() + 1 &&
          itens.length > 1 &&
          key >= hojeKey
        )
      })
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, itens]) => {
        const [year, month, day] = key.split('-').map(Number)
        const date = new Date(year, month - 1, day)

        return {
          key,
          label: CONFLICT_DATE_LABEL.format(date),
          ensaios: [...itens].sort(
            (a, b) => new Date(a.dataEnsaio).getTime() - new Date(b.dataEnsaio).getTime()
          ),
        }
      })
  }, [ensaiosPorDia, mesAtual, hojeKey])

  const ensaiosSelecionados = [...(ensaiosPorDia[diaSelecionado] || [])].sort(
    (a, b) => new Date(a.dataEnsaio).getTime() - new Date(b.dataEnsaio).getTime()
  )

  const selectedDate = (() => {
    const [year, month, day] = diaSelecionado.split('-').map(Number)
    const date = new Date(year, month - 1, day)
    return isValidDate(date) ? date : hoje
  })()
  const deveAlertarConflitoSelecionado = ensaiosSelecionados.length > 1 && diaSelecionado >= hojeKey

  const irParaMes = (delta) => {
    setMesAtual((prev) => {
      const proximoMes = new Date(prev.getFullYear(), prev.getMonth() + delta, 1)
      const anoSeguro = clampYear(proximoMes.getFullYear())
      const dataSegura = new Date(anoSeguro, proximoMes.getMonth(), 1)
      setAnoDigitado(String(dataSegura.getFullYear()))
      return dataSegura
    })
  }

  const irParaHoje = () => {
    const now = new Date()
    setMesAtual(new Date(now.getFullYear(), now.getMonth(), 1))
    setAnoDigitado(String(now.getFullYear()))
    setDiaSelecionado(toInputDate(now))
  }

  const handleMesChange = (value) => {
    const mes = Number(value)

    if (Number.isNaN(mes) || mes < 0 || mes > 11) return

    setMesAtual((prev) => new Date(prev.getFullYear(), mes, 1))
  }

  const handleAnoChange = (value) => {
    const normalizado = value.replace(/\D/g, '').slice(0, 4)
    setAnoDigitado(normalizado)

    if (normalizado.length !== 4) return

    const ano = Number(normalizado)

    if (ano < MIN_YEAR || ano > MAX_YEAR) return

    setMesAtual((prev) => new Date(ano, prev.getMonth(), 1))
  }

  const handleAnoBlur = () => {
    const ano = Number(anoDigitado)

    if (anoDigitado.length !== 4 || Number.isNaN(ano) || ano < MIN_YEAR || ano > MAX_YEAR) {
      setAnoDigitado(String(mesAtual.getFullYear()))
    }
  }

  return (
    <section className="overflow-hidden rounded-[14px] border border-[var(--border)] bg-white/84 shadow-[0_18px_42px_rgba(31,31,33,0.055)]">
      <div className="grid grid-cols-[minmax(0,1fr)_330px] max-xl:grid-cols-1">
        <div className="min-w-0 p-5">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-[9px] bg-[var(--gold-dim)] text-[var(--gold)]">
                <CalendarDays size={20} strokeWidth={1.8} />
              </span>

              <div>
                <h2 className="text-[17px] font-semibold text-[var(--text)]">
                  Calendário de ensaios
                </h2>
                <p className="mt-1 text-[12px] text-[var(--text-muted)]">
                  Visualize e gerencie seus ensaios do mês.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => irParaMes(-1)}
                className="flex h-9 w-9 items-center justify-center rounded-[8px] border border-[var(--border)] bg-white/70 text-[var(--text)] transition hover:border-[var(--gold-border)] hover:text-[var(--gold)]"
                title="Mês anterior"
              >
                <ChevronLeft size={16} strokeWidth={1.8} />
              </button>

              <div className="flex h-9 items-center gap-1 rounded-[8px] border border-[var(--border)] bg-white/70 px-2">
                <select
                  value={mesAtual.getMonth()}
                  onChange={(event) => handleMesChange(event.target.value)}
                  className="bg-transparent px-1 text-[12px] text-[var(--text)] outline-none"
                  title="Selecionar mês"
                >
                  {MONTH_OPTIONS.map((mes, index) => (
                    <option key={mes} value={index}>
                      {mes}
                    </option>
                  ))}
                </select>

                <input
                  type="text"
                  inputMode="numeric"
                  value={anoDigitado}
                  onChange={(event) => handleAnoChange(event.target.value)}
                  onBlur={handleAnoBlur}
                  maxLength={4}
                  className="w-[52px] bg-transparent text-[12px] text-[var(--text)] outline-none"
                  title="Selecionar ano"
                />
              </div>

              <button
                type="button"
                onClick={() => irParaMes(1)}
                className="flex h-9 w-9 items-center justify-center rounded-[8px] border border-[var(--border)] bg-white/70 text-[var(--text)] transition hover:border-[var(--gold-border)] hover:text-[var(--gold)]"
                title="Próximo mês"
              >
                <ChevronRight size={16} strokeWidth={1.8} />
              </button>
            </div>
          </div>

          <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <ResumoCalendario icon={CalendarDays} label="Ensaios no mês" value={ensaiosDoMes.length} />
            <ResumoCalendario icon={Clock3} label="Dias ocupados" value={diasOcupadosNoMes} tone="violet" />
            <ResumoCalendario icon={CheckCircle2} label="Hoje selecionado" value={diaSelecionado === hojeKey ? 'Sim' : 'Não'} tone="amber" />
            <ResumoCalendario
              icon={CheckCircle2}
              label="Possíveis conflitos"
              value={conflitosNoMes}
              tone="emerald"
              danger={conflitosNoMes > 0}
              tooltipTitle="Dias com possíveis conflitos"
              tooltipItems={conflitosDetalhesNoMes}
            />
          </div>

          <div className="grid grid-cols-7 overflow-hidden rounded-[12px] border border-[var(--border)] bg-white/62">
            {WEEK_DAYS.map((dia) => (
              <div
                key={dia}
                className="border-b border-r border-[var(--border)] px-2 py-3 text-center text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)] last:border-r-0"
              >
                {dia}
              </div>
            ))}

            {diasDoMes.map((date, index) => {
              const key = toInputDate(date)
              const eventos = ensaiosPorDia[key] || []
              const foraDoMes = date.getMonth() !== mesAtual.getMonth()
              const selecionado = key === diaSelecionado
              const hojeSelecionado = key === hojeKey

              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setDiaSelecionado(key)}
                  className={`min-h-[92px] border-b border-r border-[var(--border)] p-2 text-left transition hover:bg-white ${
                    (index + 1) % 7 === 0 ? 'border-r-0' : ''
                  } ${index >= 35 ? 'border-b-0' : ''} ${
                    foraDoMes ? 'bg-white/35 text-[var(--text-muted)]/35' : 'bg-white/55 text-[var(--text)]'
                  } ${selecionado ? 'bg-[var(--gold-dim)] ring-1 ring-inset ring-[var(--gold-border)]' : ''}`}
                >
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <span
                      className={`flex h-7 w-7 items-center justify-center rounded-[8px] text-[12px] ${
                        hojeSelecionado
                          ? 'bg-[var(--gold-dim)] text-[var(--gold)] shadow-[0_6px_14px_rgba(200,79,50,0.10)]'
                          : selecionado
                            ? 'text-[var(--gold)]'
                            : ''
                      }`}
                    >
                      {date.getDate()}
                    </span>

                    {hojeSelecionado && (
                      <span className="h-1.5 w-1.5 rounded-full bg-[var(--gold)]" />
                    )}
                  </div>

                  <div className="space-y-1">
                    {eventos.length === 1 ? (
                      <EventoComCapa ensaio={eventos[0]} />
                    ) : (
                      <>
                        {eventos.slice(0, 3).map((ensaio) => (
                          <EventoCompacto key={ensaio.id} ensaio={ensaio} />
                        ))}

                        {eventos.length > 3 && (
                          <p className="pl-1 text-[10px] font-medium text-[var(--gold)]">
                            +{eventos.length - 3} ensaio{eventos.length - 3 === 1 ? '' : 's'}
                          </p>
                        )}
                      </>
                    )}
                  </div>
                </button>
              )
            })}
          </div>

          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-[10px] text-[var(--text-muted)]">
            {Object.entries(STATUS_DOT).map(([status, color]) => (
              <span key={status} className="inline-flex items-center gap-1.5">
                <span className={`h-2 w-2 rounded-full ${color}`} />
                {getStatusInfo(status).label}
              </span>
            ))}
          </div>
        </div>

        <aside className="border-l border-[var(--border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.72),rgba(247,239,229,0.46))] p-5 max-xl:border-l-0 max-xl:border-t">
          <div className="mb-5 flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--gold-dim)] text-[var(--gold)]">
              <CalendarDays size={16} strokeWidth={1.8} />
            </span>
            <p className="text-[12px] font-semibold text-[var(--text)]">
              Dia selecionado
            </p>
          </div>

          <div className="flex items-start justify-between gap-3">
            <h3 className="text-[20px] font-semibold capitalize leading-tight tracking-[-0.01em] text-[var(--text)]">
              {DAY_LABEL.format(selectedDate)}
            </h3>

            {diaSelecionado === hojeKey && (
              <span className="rounded-full bg-[var(--gold-dim)] px-3 py-1 text-[11px] font-semibold text-[var(--gold)]">
                Hoje
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={() => onCreateForDate(diaSelecionado)}
            className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-[8px] bg-[#C84F32] px-4 py-3 text-[12px] font-semibold text-white shadow-[0_12px_24px_rgba(200,79,50,0.15)] transition hover:bg-[#AE3F28]"
          >
            <Icon name="plus" size={14} />
            Novo ensaio
          </button>

          {deveAlertarConflitoSelecionado && (
            <div className="mt-5 rounded-[10px] border border-sky-100 bg-sky-50 p-4 text-[12px] leading-5 text-[var(--text)]">
              <div className="mb-2 flex items-center gap-2 text-sky-700">
                <Info size={15} strokeWidth={1.8} />
                <span className="font-semibold">Dica importante</span>
              </div>
              Há mais de um ensaio neste dia. Confira horários e deslocamento antes de confirmar novos agendamentos.
            </div>
          )}

          <div className="mt-5 rounded-[12px] border border-[var(--border)] bg-white/70 p-4">
            <div className="mb-4 flex items-center gap-2">
              <p className="text-[13px] font-semibold text-[var(--text)]">
                Ensaios do dia
              </p>
              <span className="rounded-full bg-[var(--gold-dim)] px-2 py-0.5 text-[11px] font-semibold text-[var(--gold)]">
                {ensaiosSelecionados.length}
              </span>
            </div>

            <div className="space-y-3">
              {ensaiosSelecionados.length === 0 ? (
                <div className="rounded-[10px] border border-dashed border-[var(--border)] bg-white/55 p-4 text-center">
                  <p className="text-[12px] text-[var(--text-muted)]">
                    Nenhum ensaio marcado para este dia.
                  </p>
                </div>
              ) : (
                ensaiosSelecionados.map((ensaio) => {
                  const tone = STATUS_TONE[ensaio.status] || STATUS_TONE.AGENDADO
                  const statusIcon = STATUS_ICON[ensaio.status] || 'calendar'

                  return (
                    <article key={ensaio.id} className="group flex items-center gap-3 rounded-[10px] p-2 transition hover:bg-white">
                      <span className={`h-2 w-2 shrink-0 rounded-full ${tone.accent}`} />

                      <button
                        type="button"
                        onClick={() => onView(ensaio)}
                        className="min-w-0 flex-1 text-left"
                      >
                        <p className="truncate text-[12px] font-medium text-[var(--text)]">
                          {ensaio.clienteNome || 'Cliente sem nome'}
                        </p>
                        <p className="mt-1 truncate text-[10px] text-[var(--text-muted)]">
                          {formatTime(ensaio.dataEnsaio)} · {getTipoExibicao(ensaio)}
                        </p>
                      </button>

                      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] border ${tone.event}`}>
                        <Icon name={statusIcon} size={14} className={tone.icon} />
                      </span>

                      <button
                        type="button"
                        onClick={() => onView(ensaio)}
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] border border-[var(--border)] bg-white/70 text-[var(--text-muted)] transition hover:border-[var(--gold-border)] hover:text-[var(--gold)]"
                        title="Abrir detalhes"
                      >
                        <MoreVertical size={15} strokeWidth={1.8} />
                      </button>
                    </article>
                  )
                })
              )}
            </div>
          </div>

        </aside>
      </div>
    </section>
  )
}

function EventoComCapa({ ensaio }) {
  const statusInfo = getStatusInfo(ensaio.status)
  const capaUrl = getCapaUrl(ensaio)
  const tone = STATUS_TONE[ensaio.status] || STATUS_TONE.AGENDADO

  return (
    <div className={`grid grid-cols-[42px_minmax(0,1fr)] gap-2 rounded-[8px] border p-1.5 ${tone.event}`}>
      <div className="h-11 w-11 overflow-hidden rounded-[6px] border border-white/70 bg-white/65">
        {capaUrl ? (
          <img
            src={capaUrl}
            alt={ensaio.clienteNome || 'Capa do ensaio'}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-[var(--gold-dim)] text-[10px] font-medium text-[var(--gold)]">
            {getInitials(ensaio.clienteNome)}
          </div>
        )}
      </div>

      <div className="min-w-0">
        <p className="truncate text-[10.5px] font-semibold text-[var(--text)]">
          {ensaio.clienteNome || 'Cliente sem nome'}
        </p>
        <p className="mt-0.5 truncate text-[9.5px] text-[var(--text-muted)]">
          {formatTime(ensaio.dataEnsaio)}
        </p>
        <span className={`mt-1 inline-flex max-w-full items-center rounded-full border bg-white/65 px-1.5 py-0.5 text-[9px] leading-none ${statusInfo.chipClass}`}>
          <span className="truncate">{statusInfo.label}</span>
        </span>
      </div>
    </div>
  )
}

function EventoCompacto({ ensaio }) {
  const tone = STATUS_TONE[ensaio.status] || STATUS_TONE.AGENDADO

  return (
    <div className={`rounded-[6px] border px-2 py-1 ${tone.event}`}>
      <span className="flex items-center gap-1.5 text-[10px] text-[var(--text)]">
        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${tone.accent}`} />
        <span className="truncate">{ensaio.clienteNome || 'Cliente sem nome'}</span>
      </span>
      <p className="mt-0.5 truncate pl-3 text-[9px] text-[var(--text-muted)]">
        {formatTime(ensaio.dataEnsaio)}
      </p>
    </div>
  )
}

function ResumoCalendario({ icon: IconComponent = CalendarDays, label, value, tone = 'gold', danger, tooltipTitle, tooltipItems = [] }) {
  const hasTooltip = tooltipItems.length > 0
  const toneClass = danger
    ? 'border-red-100 bg-red-50 text-red-600'
    : tone === 'violet'
      ? 'border-violet-100 bg-violet-50 text-violet-600'
      : tone === 'amber'
        ? 'border-amber-100 bg-amber-50 text-amber-600'
        : tone === 'emerald'
          ? 'border-emerald-100 bg-emerald-50 text-emerald-600'
          : 'border-[var(--gold-border)] bg-[var(--gold-dim)] text-[var(--gold)]'

  return (
    <div
      className="group relative flex items-center gap-3 rounded-[10px] border border-[var(--border)] bg-white/70 px-4 py-3 outline-none"
      tabIndex={hasTooltip ? 0 : undefined}
    >
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[8px] border ${toneClass}`}>
        <IconComponent size={18} strokeWidth={1.8} />
      </span>

      <div className="min-w-0">
        <p className="text-[16px] font-semibold text-[var(--text)]">
          {value}
        </p>
        <p className="mt-0.5 truncate text-[10px] text-[var(--text-muted)]">
          {label}
        </p>
      </div>

      {hasTooltip && (
        <div className="pointer-events-none absolute left-0 top-[calc(100%+10px)] z-30 hidden w-[360px] rounded-xl border border-red-100 bg-white p-4 text-left shadow-[0_18px_40px_rgba(78,56,35,0.14)] group-hover:block group-focus:block max-sm:left-auto max-sm:right-0 max-sm:w-[min(82vw,360px)]">
          <p className="text-[11px] uppercase tracking-[0.16em] text-red-500">
            {tooltipTitle}
          </p>

          <div className="mt-3 space-y-3">
            {tooltipItems.slice(0, 4).map((item) => (
              <div key={item.key} className="border-t border-[var(--border)] pt-3 first:border-t-0 first:pt-0">
                <p className="text-[13px] font-medium capitalize text-[var(--text)]">
                  {item.label}
                </p>

                <div className="mt-2 space-y-1.5">
                  {item.ensaios.map((ensaio) => (
                    <p key={ensaio.id} className="flex items-center justify-between gap-3 text-[12px] text-[var(--text-muted)]">
                      <span className="min-w-0 truncate">
                        {ensaio.clienteNome || 'Cliente sem nome'}
                      </span>
                      <span className="shrink-0 text-red-500">
                        {formatTime(ensaio.dataEnsaio)}
                      </span>
                    </p>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {tooltipItems.length > 4 && (
            <p className="mt-3 border-t border-[var(--border)] pt-3 text-[12px] text-[var(--text-muted)]">
              +{tooltipItems.length - 4} dia{tooltipItems.length - 4 === 1 ? '' : 's'} com conflito neste mês.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
