export const TIPOS_PERIODO = [
  {
    value: 'MENSAL',
    label: 'Mensal',
    detalhe: 'Por mês',
  },
  {
    value: 'TRIMESTRAL',
    label: 'Trimestral',
    detalhe: 'Por trimestre',
  },
  {
    value: 'SEMESTRAL',
    label: 'Semestral',
    detalhe: 'Por semestre',
  },
  {
    value: 'ANUAL',
    label: 'Anual',
    detalhe: 'Total por ano',
  },
]

export function formatMoney(valor) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(valor || 0).replace(/\s/g, '\u00A0')
}

export function formatDateBR(date) {
  if (!date) return '—'

  return new Intl.DateTimeFormat('pt-BR').format(
    new Date(`${date}T00:00:00`)
  )
}

export function getAnosDisponiveis() {
  return Array.from({ length: 15 }, (_, index) => 2026 + index)
}

export function getTipoPeriodoLabel(tipo) {
  const tipoEncontrado = TIPOS_PERIODO.find((item) => item.value === tipo)

  return tipoEncontrado?.label || tipo
}
