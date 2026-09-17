import { BarChart3, Image, Trophy, Wallet } from 'lucide-react'
import { formatMoney } from '../../utils/relatoriosUtils'

const toNumber = (value) => Number(value || 0)

const formatPercent = (value) =>
  `${value.toLocaleString('pt-BR', {
    maximumFractionDigits: 1,
    minimumFractionDigits: 1,
  })}%`

export default function RelatorioResumoConsolidado({ relatorio, tituloFallback }) {
  const recebido = toNumber(relatorio?.valorRecebido)
  const aReceber = toNumber(relatorio?.valorPendente)
  const previsto = toNumber(relatorio?.totalLiquido)
  const taxaRecebimento = previsto > 0 ? (recebido / previsto) * 100 : 0
  const taxaAReceber = previsto > 0 ? (aReceber / previsto) * 100 : 0
  const progressoRecebido = Math.min(100, Math.max(0, taxaRecebimento))
  const periodo = relatorio?.periodoDescricao || tituloFallback
  const trabalhosMaiorValor = Array.isArray(relatorio?.trabalhosMaiorValor)
    ? relatorio.trabalhosMaiorValor
    : []

  return (
    <section className="grid gap-4 xl:h-[430px] xl:grid-cols-[1.35fr_1fr_1fr] xl:items-stretch">
      <article className="rounded-[16px] border border-[#E8E3DF] bg-white p-4 shadow-[0_12px_30px_rgba(31,31,33,0.04)] sm:p-5 xl:h-full">
        <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
          <div className="flex min-w-0 gap-3">
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#F8EDE8] bg-[#fff8ec] text-[#C84F32]">
              <BarChart3 size={16} />
            </span>

            <div className="min-w-0">
              <p className="text-[15px] font-semibold leading-5 tracking-[-0.01em] text-[#292625]">
                Resumo financeiro
              </p>

              <p className="mt-1.5 truncate text-[13px] font-medium text-[#6F6D6B]" title={periodo?.replace(' - ', ' · ')}>
                {periodo?.replace(' - ', ' · ')}
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3 md:divide-x md:divide-[#eee7df]">
          <FinancialMetric
            icon={<Wallet size={16} />}
            label="Recebido"
            value={formatMoney(recebido)}
            detail={`${formatPercent(taxaRecebimento)} do previsto`}
            valueClassName="text-green-700"
            valueSizeClassName="text-[18px] min-[1440px]:text-[21px]"
          />

          <FinancialMetric
            icon={<Wallet size={16} />}
            label="A receber"
            value={formatMoney(aReceber)}
            detail={`${formatPercent(taxaAReceber)} do previsto`}
            valueClassName="text-[#b5741d]"
            valueSizeClassName="text-[18px] min-[1440px]:text-[20px]"
          />

          <FinancialMetric
            icon={<span className="text-sm font-semibold leading-none">%</span>}
            label="Taxa de recebimento"
            value={formatPercent(taxaRecebimento)}
            detail="Recebido sobre previsto"
            valueClassName="text-[#2b2520]"
          />
        </div>

        <div className="mt-6 border-t border-[#eee7df] pt-5">
          <div className="h-2.5 overflow-hidden rounded-full bg-[#ebe6df]">
            <div
              className="h-full rounded-full bg-green-700/75 transition-all"
              style={{ width: `${progressoRecebido}%` }}
            />
          </div>

          <div className="mt-3 flex flex-col gap-2 text-[13px] text-[#6F6D6B] sm:flex-row sm:items-center sm:justify-between">
            <span>{formatMoney(recebido)} recebidos</span>
            <span>{formatMoney(previsto)} previsto</span>
          </div>
        </div>
      </article>

      <CompositionCard relatorio={relatorio} />

      <TopTrabalhosMaiorValorCard
        trabalhos={trabalhosMaiorValor}
        periodo={periodo}
      />
    </section>
  )
}

function TopTrabalhosMaiorValorCard({ trabalhos, periodo }) {
  const ranking = Array.isArray(trabalhos) ? trabalhos.slice(0, 5) : []

  return (
    <article className="flex min-h-0 flex-col overflow-hidden rounded-[16px] border border-[#E8E3DF] bg-white p-4 shadow-[0_12px_30px_rgba(31,31,33,0.04)] sm:p-5 xl:h-full">
      <div className="mb-5 flex shrink-0 items-start gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#F8EDE8] bg-[#fff8ec] text-[#C84F32]">
            <Trophy size={16} />
          </span>

          <div className="min-w-0">
            <p className="text-[15px] font-semibold leading-5 tracking-[-0.01em] text-[#292625]">
              Top 5 trabalhos de maior valor
            </p>

            <p className="mt-1.5 text-[13px] text-[#6F6D6B]">
              Ensaios individuais com maior valor no período
            </p>
          </div>
        </div>
      </div>

      {ranking.length ? (
        <div className="theme-scrollbar min-h-0 flex-1 space-y-1 overflow-y-auto pr-1">
          {ranking.map((item, index) => (
            <TopTrabalhosMaiorValorRow
              key={item?.ensaioId || index}
              index={index}
              tipo={item?.tipoExibicao || 'Ensaio'}
              cliente={item?.clienteNome || 'Cliente'}
              valor={item?.valor}
            />
          ))}
        </div>
      ) : (
        <div className="flex min-h-[205px] flex-1 items-center justify-center rounded-[12px] border border-dashed border-[#E8E3DF] px-4 text-center text-sm text-[#6F6D6B]">
          Ainda não há trabalhos com valores pagos no período.
        </div>
      )}

      {ranking.length ? (
        <p className="mt-4 shrink-0 border-t border-[#EEEAE7] pt-3 text-[11px] leading-4 text-[#8B8076]">
          Período: {periodo?.replace(' - ', ' · ')}. Considera trabalhos com valores pagos.
        </p>
      ) : null}
    </article>
  )
}

function CompositionCard({ relatorio }) {
  const itens = [
    { label: 'Pacotes', valor: Number(relatorio?.faturamentoBruto || 0), cor: '#4332c8' },
    { label: 'Fotos extras', valor: Number(relatorio?.excedentesCobrados || 0), cor: '#62ff00' },
    { label: 'Ajustes manuais', valor: Number(relatorio?.ajustesManuais || 0), cor: '#ff6200' },
  ]
  const totalParaGrafico = itens.reduce((total, item) => total + Math.max(0, item.valor), 0)
  let acumulado = 0
  const fatias = itens
    .filter((item) => item.valor > 0)
    .map((item) => {
      const inicio = totalParaGrafico > 0 ? (acumulado / totalParaGrafico) * 360 : 0
      acumulado += item.valor
      const fim = totalParaGrafico > 0 ? (acumulado / totalParaGrafico) * 360 : 0

      return { ...item, inicio, fim }
    })
  const pontoDoArco = (angulo) => {
    const radianos = ((angulo - 90) * Math.PI) / 180
    const raio = 46

    return {
      x: 50 + raio * Math.cos(radianos),
      y: 50 + raio * Math.sin(radianos),
    }
  }
  const caminhoDaFatia = (inicio, fim) => {
    const pontoInicial = pontoDoArco(inicio)
    const pontoFinal = pontoDoArco(fim)
    const arcoMaior = fim - inicio > 180 ? 1 : 0

    return [
      'M 50 50',
      `L ${pontoInicial.x} ${pontoInicial.y}`,
      `A 46 46 0 ${arcoMaior} 1 ${pontoFinal.x} ${pontoFinal.y}`,
      'Z',
    ].join(' ')
  }

  return (
    <article className="flex min-h-0 flex-col overflow-hidden rounded-[16px] border border-[#E8E3DF] bg-white p-4 shadow-[0_12px_30px_rgba(31,31,33,0.04)] sm:p-5 xl:h-full">
      <div className="flex shrink-0 items-start gap-3">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#F8EDE8] bg-[#fff8ec] text-[#C84F32]">
          <Image size={16} />
        </span>

        <div>
          <p className="text-[15px] font-semibold leading-5 tracking-[-0.01em] text-[#292625]">
            Composição do previsto
          </p>

          <p className="mt-1.5 text-[13px] text-[#6F6D6B]">
            De onde vem o valor total
          </p>
        </div>
      </div>

      <div className="flex flex-1 flex-col justify-center py-4">
        <svg
          viewBox="0 0 100 100"
          className="mx-auto h-36 w-36 shrink-0 drop-shadow-[0_8px_20px_rgba(200,79,50,0.1)]"
          role="img"
          aria-label="Gráfico de composição do valor previsto"
        >
          {fatias.length === 0 ? (
            <circle cx="50" cy="50" r="46" fill="#F5F3F1" />
          ) : fatias.length === 1 ? (
            <circle cx="50" cy="50" r="46" fill={fatias[0].cor} />
          ) : (
            fatias.map((fatia) => (
              <path
                key={fatia.label}
                d={caminhoDaFatia(fatia.inicio, fatia.fim)}
                fill={fatia.cor}
                stroke="#FFFFFF"
                strokeWidth="0.45"
                strokeLinejoin="round"
              />
            ))
          )}
        </svg>

        <div className="mt-5 space-y-2.5">
          {itens.map((item) => {
            const percentual = totalParaGrafico > 0
              ? (Math.max(0, item.valor) / totalParaGrafico) * 100
              : 0

            return (
              <div key={item.label} className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 text-[12px]">
                <span className="flex min-w-0 items-center gap-2 text-[#6F6D6B]">
                  <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: item.cor }} />
                  <span className="truncate">{item.label}</span>
                </span>

                <span className="whitespace-nowrap text-right font-semibold text-[#2B2520]">
                  {formatMoney(item.valor)}
                </span>

                <span className="w-[36px] text-right text-[#6F6D6B]">
                  {percentual.toLocaleString('pt-BR', {
                    maximumFractionDigits: 1,
                    minimumFractionDigits: 1,
                  })}%
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </article>
  )
}

function TopTrabalhosMaiorValorRow({ index, tipo, cliente, valor }) {
  const isLeader = index === 0

  return (
    <div className={`grid min-h-[48px] grid-cols-[42px_minmax(0,1fr)_auto] items-center gap-3 rounded-[10px] px-2 py-2 ${
      isLeader ? 'bg-[#fff8f0]' : 'border-b border-[#eee7df] last:border-b-0'
    }`}>
      <span className={`flex h-8 w-8 items-center justify-center rounded-full border text-sm font-semibold ${
        isLeader ? 'border-[#D8CFC7] bg-[#F7F3EF] text-[#4F4A45]' : 'border-[#E8E3DF] bg-white text-[#8A8580]'
      }`}>
        {index + 1}
      </span>

      <div className="min-w-0">
        <p className="truncate text-[13px] font-semibold text-[#2B2520]" title={`${tipo} · ${cliente}`}>
          {tipo}<span className="font-normal text-[#8B8076]"> · {cliente}</span>
        </p>
      </div>

      <span className={`shrink-0 text-right text-[13px] font-semibold ${
        isLeader ? 'text-[#AE3F28]' : 'text-[#6F6D6B]'
      }`} title={formatMoney(valor)}>
        {formatMoney(valor)}
      </span>
    </div>
  )
}

function FinancialMetric({
  icon,
  label,
  value,
  detail,
  valueClassName,
  valueSizeClassName = 'text-[26px]',
}) {
  return (
    <div className="min-w-0 overflow-hidden md:px-4 md:first:pl-0 md:last:pr-0">
      <span className="mb-3 flex h-8 w-8 items-center justify-center rounded-full border border-[#eee4d9] bg-[#faf6ef] text-[#7c7167]">
        {icon}
      </span>

      <p className="text-[13px] font-medium text-[#6F6D6B]">
        {label}
      </p>

      <p
        title={value}
        className={`mt-2 max-w-full break-words font-semibold leading-tight tracking-normal [overflow-wrap:anywhere] ${valueSizeClassName} ${valueClassName}`}
      >
        {value}
      </p>

      <p className="mt-1.5 text-xs text-[#8b8076]">
        {detail}
      </p>
    </div>
  )
}
