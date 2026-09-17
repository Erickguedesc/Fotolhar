import { Camera, Star, TrendingDown, TrendingUp } from 'lucide-react'
import { formatMoney } from '../../utils/relatoriosUtils'
import { getTipoLabel } from '../ensaios/listaEnsaios/ensaioHelpers'

export default function RelatorioDestaques({ destaques, periodos = [], ensaiosMaisRealizados = [] }) {
  const periodosComReceita = periodos.filter(
    (periodo) => Number(periodo?.totalLiquido || 0) > 0,
  )
  const temComparacaoInterna = periodosComReceita.length > 1
  const comparacaoLabel = periodosComReceita.length === 0
    ? 'Sem receita'
    : 'Apenas 1 período com receita'
  const tipoMaisRealizado = Array.isArray(ensaiosMaisRealizados)
    ? ensaiosMaisRealizados[0]
    : null
  const quantidadeTipo = Number(tipoMaisRealizado?.quantidadeEnsaios || 0)
  const tipoMaisRealizadoLabel = tipoMaisRealizado
    ? `${tipoMaisRealizado.tipoExibicao || getTipoLabel(tipoMaisRealizado.tipo)} · ${quantidadeTipo} ensaio${quantidadeTipo === 1 ? '' : 's'}`
    : 'Sem ensaios'
  const melhorPeriodoLabel = periodosComReceita.length > 0
    ? destaques?.melhorPeriodo || '—'
    : 'Sem receita'

  return (
    <section className="rounded-[16px] border border-[#E8E3DF] bg-white p-4 shadow-[0_10px_24px_rgba(31,31,33,0.04)] sm:p-5">
      <h2 className="text-[18px] font-medium text-[#2B2520]">Destaques do período</h2>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <DestaqueItem
          icon={<Star size={17} />}
          label="Melhor período"
          value={melhorPeriodoLabel}
          variant={periodosComReceita.length > 0 ? 'gold' : 'neutral'}
        />

        <DestaqueItem
          icon={<TrendingUp size={18} />}
          label="Maior valor"
          value={formatMoney(destaques?.maiorReceita)}
          variant="green"
        />

        <DestaqueItem
          icon={<TrendingDown size={18} />}
          label="Menor valor"
          value={temComparacaoInterna ? formatMoney(destaques?.menorReceita) : comparacaoLabel}
          variant={temComparacaoInterna ? 'red' : 'neutral'}
        />

        <DestaqueItem
          icon={<Camera size={18} />}
          label="Tipo mais realizado"
          value={tipoMaisRealizadoLabel}
          variant="blue"
        />
      </div>
    </section>
  )
}

function DestaqueItem({ icon, label, value, variant }) {
  const variants = {
    gold: 'border-[#F8EDE8] bg-[#F8EDE8] text-[#C84F32]',
    green: 'border-green-100 bg-green-50 text-green-700',
    red: 'border-red-100 bg-red-50 text-red-600',
    blue: 'border-sky-100 bg-sky-50 text-sky-700',
    neutral: 'border-[#E8E3DF] bg-[#F5F3F1] text-[#96928E]',
  }

  return (
    <article className="flex min-h-[88px] min-w-0 items-center gap-3 rounded-[11px] border border-[#E8E3DF] bg-white px-3.5 py-3">
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[9px] border ${variants[variant]}`}>
        {icon}
      </span>

      <div className="min-w-0">
        <p className="truncate text-xs font-medium text-[#6F6D6B]" title={label}>
          {label}
        </p>
        <p className="mt-1 truncate text-[17px] font-semibold leading-tight text-[#1F1F21]" title={value}>
          {value}
        </p>
      </div>
    </article>
  )
}
