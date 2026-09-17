import { useNavigate } from 'react-router-dom'

const STEP_LABELS = ['Cliente', 'Ensaio', 'Pacote', 'Resumo']
const STEP_HINTS = [
  'Preencha os dados de contato',
  'Preencha as informações do ensaio',
  'Defina o pacote e valor',
  'Revise os dados e salve o ensaio',
]

function fmtDate(value) {
  if (!value) return '—'

  const [year, month, day] = value.split('-')
  if (!year || !month || !day) return '—'

  return `${day}/${month}/${year}`
}

function fmtMoney(value) {
  return value ? `R$ ${String(value)}` : 'R$ —'
}

function parseCurrencyBR(value) {
  const normalized = String(value || '')
    .replace(/[^\d,.-]/g, '')
    .replace(/\./g, '')
    .replace(',', '.')

  return Number(normalized || 0)
}

function SummaryRow({ label, value, strong = false }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-[var(--border)] py-2.5 last:border-b-0">
      <span className="shrink-0 text-[12px] text-[var(--text-muted)]">{label}</span>
      <span
        className={`min-w-0 break-words text-right text-[13px] ${
          strong ? 'font-medium text-[var(--gold)]' : 'text-[var(--text)]'
        }`}
      >
        {value || '—'}
      </span>
    </div>
  )
}

function SidebarHeader({ icon, title }) {
  return (
    <div className="flex items-center gap-3 border-b border-[var(--border)] px-5 py-4">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] border border-[var(--gold-border)] bg-[var(--gold-dim)] text-[var(--gold)]">
        {icon}
      </span>
      <span className="text-[15px] font-medium text-[var(--text)]">{title}</span>
    </div>
  )
}

export default function ResumeSidebar({ form, loading }) {
  const navigate = useNavigate()

  const clienteDone = form.cliente.trim().length >= 3 && Boolean(form.cidade.trim())
  const tipoDone = form.tipo === 'Outro' ? Boolean(form.tipoCustom?.trim()) : Boolean(form.tipo)
  const ensaioDone = Boolean(tipoDone && form.data && form.hora && form.local)
  const pacoteDone = Boolean(
    parseInt(form.fotos || 0) > 0 &&
      parseCurrencyBR(form.valor) > 0 &&
      (!form.extraAtivo || parseCurrencyBR(form.extra) > 0)
  )
  const completedStep = clienteDone && ensaioDone && pacoteDone
    ? 3
    : clienteDone && ensaioDone
      ? 2
      : clienteDone
        ? 1
        : 0
  const step = completedStep
  const tipoLabel = form.tipo === 'Outro' ? form.tipoCustom || '—' : form.tipo || '—'

  const clienteRows = [
    { label: 'Nome', value: form.cliente },
    { label: 'Telefone', value: form.telefone },
    { label: 'E-mail', value: form.email },
    { label: 'Cidade', value: form.cidade },
  ]

  const ensaioRows = [
    { label: 'Tipo', value: tipoLabel },
    { label: 'Data', value: fmtDate(form.data) },
    { label: 'Horário', value: form.hora },
    { label: 'Local', value: form.local },
    { label: 'Cidade ensaio', value: form.cidadeEnsaio },
    { label: 'Referência', value: form.referenciaLocal },
    { label: 'Fotos incluídas', value: form.fotos },
    {
      label: 'Foto extra',
      value: form.extraAtivo ? (form.extra ? `R$ ${form.extra} / foto` : 'Pendente') : 'Não',
    },
  ]

  return (
    <aside className="sticky top-20 flex min-w-0 flex-col gap-4 max-lg:static">
      <section className="overflow-hidden rounded-[14px] border border-[var(--border)] bg-white/78 shadow-[0_14px_34px_rgba(31,31,33,0.055)]">
        <SidebarHeader
          title="Progresso do formulário"
          icon={
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M4 19V7a2 2 0 0 1 2-2h3" />
              <path d="M15 5h3a2 2 0 0 1 2 2v12" />
              <path d="M9 5a3 3 0 0 1 6 0" />
              <path d="M8 13h8" />
              <path d="M8 17h5" />
            </svg>
          }
        />

        <div className="px-5 py-5">
          <div className="flex items-start">
            {STEP_LABELS.map((label, index) => {
              const completed = index < completedStep
              const active = index === step

              return (
                <div key={label} className="flex flex-1 items-start last:flex-none">
                  <div className="flex min-w-0 flex-col items-center">
                    <span
                      className={`flex h-4 w-4 items-center justify-center rounded-full border transition-all ${
                        completed
                          ? 'border-emerald-500 bg-emerald-500'
                          : active
                            ? 'border-[var(--gold)] bg-[var(--gold)] shadow-[0_0_0_4px_rgba(200,79,50,0.14)]'
                            : 'border-[var(--border)] bg-white'
                      }`}
                    >
                      {completed && (
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </span>
                    <span
                      className={`mt-2 text-center text-[10px] leading-tight ${
                        active ? 'font-medium text-[var(--gold)]' : 'text-[var(--text-muted)]'
                      }`}
                    >
                      {label}
                    </span>
                  </div>

                  {index < STEP_LABELS.length - 1 && (
                    <span
                      className={`mx-2 mt-2 h-px flex-1 ${
                        index < completedStep ? 'bg-emerald-300' : 'bg-[var(--border)]'
                      }`}
                    />
                  )}
                </div>
              )
            })}
          </div>

          <p className="mt-5 text-center text-[12px] text-[var(--text-muted)]">
            {STEP_HINTS[step]}
          </p>
        </div>
      </section>

      <section className="overflow-hidden rounded-[14px] border border-[var(--border)] bg-white/78 shadow-[0_14px_34px_rgba(31,31,33,0.055)]">
        <SidebarHeader
          title="Resumo do ensaio"
          icon={
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <rect x="5" y="3" width="14" height="18" rx="2" />
              <path d="M9 7h6" />
              <path d="M9 11h6" />
              <path d="M9 15h4" />
            </svg>
          }
        />

        <div className="px-5 py-4">
          <h3 className="mb-2 text-[12px] font-semibold text-[var(--text)]">Cliente</h3>
          <div>
            {clienteRows.map((row) => (
              <SummaryRow key={row.label} {...row} />
            ))}
          </div>

          <h3 className="mb-2 mt-5 text-[12px] font-semibold text-[var(--text)]">Ensaio</h3>
          <div>
            {ensaioRows.map((row) => (
              <SummaryRow key={row.label} {...row} />
            ))}
          </div>

          <div className="mt-4 flex items-center justify-between gap-4 rounded-[10px] border border-[var(--gold-border)] bg-[var(--black-dim)] px-4 py-3">
            <span className="text-[12px] text-[var(--text)]">Valor total</span>
            <span className="font-serif text-[20px] font-light text-[var(--gold)]">
              {fmtMoney(form.valor)}
            </span>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-[0.8fr_1.2fr] gap-3 max-sm:grid-cols-1">
        <button
          type="button"
          onClick={() => navigate('/ensaios')}
          className="h-12 rounded-[9px] border border-[var(--border)] bg-white/60 px-4 text-[13px] text-[var(--text-muted)] transition hover:border-[var(--gold-border)] hover:bg-white hover:text-[var(--text)]"
        >
          Cancelar
        </button>

        <button
          type="submit"
          disabled={loading}
          className="flex h-12 items-center justify-center gap-2 rounded-[9px] border border-transparent bg-[#C84F32] hover:bg-[#AE3F28] px-4 text-[13px] font-medium text-white shadow-[0_12px_28px_rgba(200,79,50,0.18)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-75 disabled:translate-y-0"
        >
          {loading ? (
            <>
              <span className="h-3.5 w-3.5 rounded-full border-2 border-white/35 border-t-white animate-spin" />
              Salvando...
            </>
          ) : (
            <>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Salvar ensaio
            </>
          )}
        </button>
      </div>
    </aside>
  )
}
