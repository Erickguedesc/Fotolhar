import { ArrowRight, BarChart3, Check, CircleAlert, FileText, Layers3 } from 'lucide-react'
import { formatMoney } from '../../../services/galeriaUtils'

export default function SelectionSummary({
  totalSelecionadas,
  limite,
  excedente,
  cobraFotoExtra,
  valorFotoExtra,
  valorExcedente,
  progresso,
  erroEnvio,
  enviando,
  selecaoEnviada,
  onOpenConfirm,
}) {
  const dentroDoLimite = totalSelecionadas > 0 && excedente === 0
  const statusSelecao = totalSelecionadas === 0
    ? 'Nenhuma foto'
    : excedente > 0
      ? `${excedente} extra${excedente === 1 ? '' : 's'}`
      : 'Dentro do limite'

  return (
    <aside className="sticky top-24 overflow-hidden rounded-[28px] border border-[#493a2d] bg-[#19140f] text-[#F2E9DE] shadow-[0_20px_45px_rgba(28,19,12,0.26)]">
      <div className="px-7 pb-7 pt-8">
        <h3 className="whitespace-nowrap font-serif text-[31px] font-normal leading-[1.08] tracking-normal text-[#F4ECE2] sm:text-[34px]">
          Resumo da seleção
        </h3>
        <span
          className={`mt-6 inline-flex items-center gap-2 rounded-full border px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.13em] ${
            totalSelecionadas === 0
              ? 'border-white/10 bg-white/5 text-[#B1A69A]'
              : excedente > 0
                ? 'border-[#D86D56]/35 bg-[#D86D56]/10 text-[#F09A86]'
                : 'border-[#79B888]/35 bg-[#79B888]/10 text-[#8CD49D]'
          }`}
        >
          {dentroDoLimite ? <Check size={17} strokeWidth={2.3} /> : null}
          {statusSelecao}
        </span>
      </div>

      <div className="mx-7 border-y border-[#3A2E25]">
        <ResumoLinha icon={FileText} label="Selecionadas" value={totalSelecionadas} valueClassName="text-[#E26342]" />
        <ResumoLinha icon={Layers3} label="Limite do pacote" value={limite} />
        <ResumoLinha icon={CircleAlert} label="Excedente" value={excedente > 0 ? `+${excedente}` : '—'} valueClassName={excedente > 0 ? 'text-[#F09A86]' : ''} />
      </div>

      <div className="mx-7 border-b border-[#3A2E25] py-6">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#513D2D] bg-[#261B13] text-[#D19B78]">
            <BarChart3 size={20} strokeWidth={1.8} />
          </span>
          <div className="flex min-w-0 flex-1 items-center justify-between gap-3">
            <span className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[#B5AAA0]">Progresso</span>
            <span className="font-serif text-[36px] font-normal leading-none tracking-[-0.02em] text-[#F4ECE2]">{progresso}%</span>
          </div>
        </div>
        <div className="ml-[52px] mt-4 h-2 overflow-hidden rounded-full bg-[#372B22]">
          <div
            className={`h-full rounded-full transition-all ${
              excedente > 0 ? 'bg-[#D86D56]' : 'bg-[#E26342]'
            }`}
            style={{ width: `${progresso}%` }}
          />
        </div>
        <p className="ml-[52px] mt-3 text-[13px] text-[#ADA298]">
          {totalSelecionadas} de {limite} arquivos
        </p>
      </div>

      {excedente > 0 ? (
        <div className="mx-7 mt-6 rounded-[16px] border border-[#D86D56]/35 bg-[#D86D56]/10 px-4 py-4">
          <p className="text-sm leading-6 text-[#F09A86]">
            Você selecionou <strong>{excedente}</strong> foto(s) extras.{' '}
            {cobraFotoExtra ? (
              <>
                Cada uma custa <strong>{formatMoney(valorFotoExtra)}</strong>.
              </>
            ) : (
              <>
                O valor adicional será combinado diretamente com o profissional.
              </>
            )}
          </p>
          <p className="mt-4 text-xs uppercase tracking-[0.14em] text-[#F09A86]/70">
            Valor adicional
          </p>
          <strong className="font-serif text-3xl font-light text-[#F09A86]">
            {cobraFotoExtra ? formatMoney(valorExcedente) : 'A combinar'}
          </strong>
        </div>
      ) : totalSelecionadas > 0 ? (
        <div className="mx-7 mt-6 flex items-center gap-3 rounded-[16px] border border-[#79B888]/30 bg-[#79B888]/10 px-4 py-4 text-sm leading-5 text-[#8CD49D]">
          <Check className="shrink-0" size={23} strokeWidth={2.1} />
          <span>Dentro do pacote. Nenhum custo adicional.</span>
        </div>
      ) : null}

      <div className="px-7 pb-8 pt-6">
        {erroEnvio ? (
          <p className="mb-3 rounded-xl border border-[#D86D56]/20 bg-[#D86D56]/10 px-4 py-3 text-sm text-[#F09A86]">
            {erroEnvio}
          </p>
        ) : null}

        <button
          type="button"
          disabled={totalSelecionadas === 0 || enviando || selecaoEnviada}
          onClick={onOpenConfirm}
          className="inline-flex w-full items-center justify-center gap-3 rounded-full bg-gradient-to-r from-[#E26342] to-[#C94A30] px-6 py-5 text-[13px] font-semibold uppercase tracking-[0.16em] text-white shadow-[0_14px_26px_rgba(226,99,66,0.22)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-30"
        >
          {selecaoEnviada ? 'Seleção já enviada' : 'Confirmar seleção'}
          {!selecaoEnviada ? <ArrowRight size={22} strokeWidth={1.9} /> : null}
        </button>

        <p className="mt-4 text-center text-[13px] text-[#ADA298]">
          {totalSelecionadas === 0
            ? 'Selecione fotos para confirmar'
            : excedente > 0
              ? cobraFotoExtra
                ? `Valor extra de ${formatMoney(valorExcedente)}`
                : 'Valor extra a combinar'
              : 'Tudo certo para enviar'}
        </p>
      </div>
    </aside>
  )
}

function ResumoLinha({ icon: Icon, label, value, valueClassName = '' }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-[#3A2E25] py-5 last:border-b-0">
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#513D2D] bg-[#261B13] text-[#D19B78]">
          <Icon size={20} strokeWidth={1.8} />
        </span>
        <span className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[#B5AAA0]">{label}</span>
      </div>
      <strong className={`shrink-0 font-serif text-[42px] font-normal leading-none tracking-[-0.02em] text-[#F4ECE2] ${valueClassName}`}>{value}</strong>
    </div>
  )
}
