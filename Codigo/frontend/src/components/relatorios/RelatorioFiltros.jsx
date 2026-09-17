import { Funnel, Loader2 } from 'lucide-react'
import { TIPOS_PERIODO } from '../../utils/relatoriosUtils'

export default function RelatorioFiltros({
  tipo,
  ano,
  dataInicio,
  dataFim,
  anosDisponiveis,
  loading,
  onTipoChange,
  onAnoChange,
  onDataInicioChange,
  onDataFimChange,
  onLimparDatas,
  onFiltrar,
}) {
  return (
    <section className="grid gap-4 lg:grid-cols-[minmax(170px,0.85fr)_minmax(130px,0.55fr)_minmax(330px,1.7fr)_minmax(170px,0.8fr)] lg:items-end">
      <FilterField label="Agrupar por">
        <select
          value={tipo}
          onChange={(event) => onTipoChange(event.target.value)}
          className="h-11 w-full cursor-pointer rounded-[9px] border border-[#E8E3DF] bg-white px-3.5 text-sm font-medium text-[#1F1F21] outline-none transition focus:border-[#C84F32] focus:ring-4 focus:ring-[#C84F32]/10"
        >
          {TIPOS_PERIODO.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
      </FilterField>

      <FilterField label="Ano">
        <select
          value={ano}
          onChange={(event) => onAnoChange(Number(event.target.value))}
          className="h-11 w-full cursor-pointer rounded-[9px] border border-[#E8E3DF] bg-white px-3.5 text-sm font-medium text-[#1F1F21] outline-none transition focus:border-[#C84F32] focus:ring-4 focus:ring-[#C84F32]/10"
        >
          {anosDisponiveis.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </FilterField>

      <FilterField label="Período personalizado">
        <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:items-center">
          <input
            type="date"
            value={dataInicio}
            onChange={(event) => onDataInicioChange(event.target.value)}
            aria-label="Data inicial"
            className="h-11 min-w-0 rounded-[9px] border border-[#E8E3DF] bg-white px-3.5 text-sm text-[#1F1F21] outline-none transition focus:border-[#C84F32] focus:ring-4 focus:ring-[#C84F32]/10"
          />

          <span className="hidden text-center text-xs font-medium text-[#6F6D6B] sm:block">até</span>

          <input
            type="date"
            value={dataFim}
            onChange={(event) => onDataFimChange(event.target.value)}
            aria-label="Data final"
            className="h-11 min-w-0 rounded-[9px] border border-[#E8E3DF] bg-white px-3.5 text-sm text-[#1F1F21] outline-none transition focus:border-[#C84F32] focus:ring-4 focus:ring-[#C84F32]/10"
          />
        </div>
      </FilterField>

      <div className="flex min-w-0 flex-col justify-end gap-1.5">
        {(dataInicio || dataFim) ? (
          <button
            type="button"
            onClick={onLimparDatas}
            className="self-start text-xs font-medium text-[#96928E] transition hover:text-[#C84F32]"
          >
            Limpar datas
          </button>
        ) : (
          <span className="hidden text-xs sm:block" aria-hidden="true">&nbsp;</span>
        )}

        <button
          type="button"
          onClick={onFiltrar}
          disabled={loading}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-[9px] bg-[#C84F32] px-5 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(200,79,50,0.14)] transition hover:bg-[#AE3F28] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Carregando
            </>
          ) : (
            <>
              <Funnel size={16} />
              Filtrar dados
            </>
          )}
        </button>
      </div>
    </section>
  )
}

function FilterField({ label, children }) {
  return (
    <label className="block min-w-0">
      <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.2em] text-[#C84F32]">
        {label}
      </span>
      {children}
    </label>
  )
}
