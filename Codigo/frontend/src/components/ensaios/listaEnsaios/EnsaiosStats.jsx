import {
  Activity,
  CalendarDays,
  Camera,
  Image as ImageIcon,
  ListFilter,
  PackageCheck,
  PencilLine,
  XCircle,
} from 'lucide-react'

const SUMMARY_ITEMS = [
  { value: 'todos', label: 'Todos', Icon: ListFilter, colorClass: 'text-[var(--color-primary)]' },
  { value: 'ativos', label: 'Ativos', Icon: Activity, colorClass: 'text-[var(--status-delivered)]' },
  { value: 'AGENDADO', label: 'Agendado', Icon: CalendarDays, colorClass: 'text-[var(--status-scheduled)]' },
  { value: 'REALIZADO', label: 'Realizado', Icon: Camera, colorClass: 'text-[var(--status-completed)]' },
  { value: 'EM_SELECAO', label: 'Em seleção', Icon: ImageIcon, colorClass: 'text-[var(--status-selection)]' },
  { value: 'EM_EDICAO', label: 'Em edição', Icon: PencilLine, colorClass: 'text-[var(--status-editing)]' },
  { value: 'FINALIZADO', label: 'Entregue', Icon: PackageCheck, colorClass: 'text-[var(--status-delivered)]' },
  { value: 'CANCELADO', label: 'Cancelado', Icon: XCircle, colorClass: 'text-[var(--status-cancelled)]' },
]

function getPercent(count, total) {
  if (!total) return 0
  return Math.round((count / total) * 100)
}

export default function EnsaiosStats({ activeGrupo, counts, loading = false, onChange }) {
  const total = Number(counts.todos || 0)

  return (
    <section className="mb-6 overflow-hidden rounded-[8px] border border-[var(--border)] bg-[rgba(255,255,255,0.86)] shadow-[0_18px_42px_rgba(31,31,33,0.065)] backdrop-blur">
      <div className="grid divide-y divide-[var(--border)] sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-4 xl:grid-cols-8">
        {SUMMARY_ITEMS.map(({ value, label, Icon, colorClass }) => {
          const count = Number(counts[value] || 0)
          const active = activeGrupo === value
          const percent = getPercent(count, total)

          return (
            <button
              key={value}
              type="button"
              disabled={loading}
              onClick={() => onChange(value)}
              className={`min-h-[82px] px-4 py-4 text-left transition hover:bg-white/70 disabled:cursor-wait ${
                active ? 'bg-white/80 shadow-[inset_0_-2px_0_var(--gold)]' : ''
              }`}
            >
              <span className="flex items-center gap-2">
                <Icon size={20} strokeWidth={1.8} className={colorClass} />
                <span className="truncate text-[12px] font-medium text-[var(--text)]">
                  {label}
                </span>
              </span>

              <span className="mt-2 flex items-end justify-between gap-3">
                {loading ? (
                  <>
                    <span className="h-6 w-10 animate-pulse rounded bg-[rgba(92,82,72,0.12)]" />
                    <span className="h-3 w-8 animate-pulse rounded bg-[rgba(31,31,33,0.065)]" />
                  </>
                ) : (
                  <>
                    <strong className="text-[22px] font-medium leading-none tracking-[-0.02em] text-[var(--text)]">
                      {count}
                    </strong>
                    <span className="text-[11px] text-[var(--text-muted)]">
                      {percent}%
                    </span>
                  </>
                )}
              </span>
            </button>
          )
        })}
      </div>
    </section>
  )
}
