export const TIPO_LABELS = {
  NEWBORN: 'Newborn',
  GESTANTE: 'Gestante',
  FAMILIA: 'Familia',
  INFANTIL: 'Infantil',
  FEMININO: 'Feminino',
  CASAL: 'Casal',
  BOOK: 'Book',
  BATIZADO: 'Batizado',
  EXTERNO: 'Externo',
  FORMATURA: 'Formatura',
  EVENTO: 'Evento',
  DEBUTANTE: 'Debutante',
  OUTRO: 'Outro',
}

const pad = (value) => String(value).padStart(2, '0')

export function formatTipo(value = '') {
  return TIPO_LABELS[value] || value || ''
}

export function formatDate(value, fallback = '') {
  if (!value) return fallback
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return fallback
  return date.toLocaleDateString('pt-BR')
}

export function formatLongDate(value, fallback = '') {
  if (!value) return fallback
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return fallback
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

export function formatCurrency(value, fallback = 'R$ 0,00') {
  const number = Number(value)
  if (Number.isNaN(number)) return fallback
  return number.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function parseCurrencyValue(value) {
  if (value === null || value === undefined || value === '') return 0
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0

  let text = String(value).trim()
  if (!text) return 0

  text = text.replace(/[^\d,.-]/g, '')

  if (text.includes(',')) {
    text = text.replace(/\./g, '').replace(',', '.')
  }

  const number = Number.parseFloat(text)
  return Number.isNaN(number) ? 0 : number
}

export function parseQuantityValue(value, fallback = 0) {
  if (value === null || value === undefined || value === '') return fallback
  if (typeof value === 'number') return Number.isFinite(value) ? value : fallback

  const text = String(value).replace(/[^\d,.-]/g, '').replace(',', '.')
  const number = Number.parseFloat(text)
  return Number.isNaN(number) ? fallback : number
}

export function normalizeMoneyInput(value, fallback = '') {
  if (value === null || value === undefined || value === '') return ''
  const number = parseCurrencyValue(value)
  return number > 0 ? formatCurrency(number) : fallback || String(value)
}

export function normalizeFotoExtraInput(value) {
  if (value === null || value === undefined || value === '') return ''
  const number = parseCurrencyValue(value)
  return number > 0 ? `${formatCurrency(number)} / foto` : String(value)
}

export const DEFAULT_CONTRACT_CLAUSES = [
  'O presente pre-contrato tem validade de {validade} a partir da data de emissao. Apos este prazo, os valores estao sujeitos a revisao.',
  'O agendamento e confirmado mediante o pagamento do sinal informado neste documento. A data e o horario ficam reservados apos a confirmacao.',
  'Em caso de cancelamento pela contratante com menos de 48 horas de antecedencia, o sinal nao sera reembolsado. Reagendamentos serao aceitos com aviso previo minimo de 5 dias.',
  'As fotos editadas serao entregues via galeria online exclusiva com link protegido por senha. O prazo de entrega e combinado entre as partes.',
  "As imagens exibidas na galeria poderao conter marca d'agua visivel. As fotos editadas em alta resolucao serao disponibilizadas apos quitacao integral.",
  'O profissional contratado reserva o direito de uso das imagens produzidas em portfolio, salvo acordo diferente formalizado por escrito.',
  'Caso sejam selecionadas mais fotos do que o pacote inclui, será gerado valor adicional por foto excedente, a ser quitado antes da entrega final.',
]

export const DEFAULT_ACCEPT_TEXT =
  'Ao assinar este documento, as partes declaram ter lido e compreendido todos os termos acima, concordando com as condicoes estabelecidas neste pre-contrato de prestacao de servicos fotograficos.'

export function splitContractClauses(value) {
  if (!value) return DEFAULT_CONTRACT_CLAUSES

  const clauses = String(value)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)

  return clauses.length ? clauses : DEFAULT_CONTRACT_CLAUSES
}

export function buildContractVariables(draft) {
  return {
    cliente_nome: draft.clienteNome || '',
    cliente_cpf: draft.clienteCpf || '',
    cliente_telefone: draft.clienteTelefone || '',
    cliente_email: draft.clienteEmail || '',
    tipo_ensaio: draft.tipoEnsaio || '',
    data_ensaio: draft.dataEnsaio || '',
    horario_ensaio: draft.horario || '',
    local_ensaio: draft.local || '',
    qtd_fotos: draft.qtdFotos || '',
    valor_pacote: draft.valorPacote || '',
    valor_foto_extra: draft.valorFotoExtra || '',
    total_pacote: draft.totalPacote || '',
    sinal: draft.sinal || '',
    saldo: draft.saldo || '',
    condicoes_comerciais: draft.condicoesComerciais || '',
    nome_profissional: draft.profissionalNome || '',
    cidade_assinatura: draft.cidadeAssinatura || '',
    data_emissao: draft.dataEmissao || '',
    validade: draft.validade || '',
  }
}

export function renderContractTemplate(text, draft) {
  const variables = buildContractVariables(draft)

  return String(text || '').replace(/\{([a-zA-Z0-9_]+)\}/g, (match, key) => {
    const value = variables[key]
    return value === undefined || value === null || value === '' ? match : value
  })
}

export function applyModeloContratoToDraft(draft, modelo) {
  if (!modelo) return draft

  const base = { ...draft }
  const clausulasContrato = splitContractClauses(modelo.clausulas)
    .map((clausula) => renderContractTemplate(clausula, base))

  const textoAceiteContrato = renderContractTemplate(
    modelo.textoAceite || DEFAULT_ACCEPT_TEXT,
    base,
  )

  return {
    ...base,
    modeloContratoId: modelo.id,
    modeloContratoNome: modelo.nome,
    clausulasContrato,
    textoAceiteContrato,
  }
}

export function updateContractClause(draft, index, value) {
  const clauses = Array.isArray(draft.clausulasContrato)
    ? [...draft.clausulasContrato]
    : [...DEFAULT_CONTRACT_CLAUSES]

  clauses[index] = value

  return {
    ...draft,
    clausulasContrato: clauses,
  }
}

export function recalculateFinancialDraft(draft, changedField) {
  const next = { ...draft }

  if (changedField === 'valorPacote') next.valorPacote = normalizeMoneyInput(next.valorPacote)
  if (changedField === 'valorFotoExtra') next.valorFotoExtra = normalizeFotoExtraInput(next.valorFotoExtra)
  if (changedField === 'sinal') next.sinal = normalizeMoneyInput(next.sinal)

  const quantidadePacote = parseQuantityValue(next.quantidadePacote, 1) || 1
  const valorPacote = parseCurrencyValue(next.valorPacote)
  const subtotalPacote = quantidadePacote * valorPacote

  const qtdFotosExtras = parseQuantityValue(next.qtdFotosExtras, 0)
  const valorFotoExtra = parseCurrencyValue(next.valorFotoExtra)
  const subtotalFotosExtras = qtdFotosExtras * valorFotoExtra

  const total = subtotalPacote + subtotalFotosExtras

  next.subtotalPacote = subtotalPacote > 0 ? formatCurrency(subtotalPacote) : ''
  next.subtotalFotosExtras = subtotalFotosExtras > 0 ? formatCurrency(subtotalFotosExtras) : 'A calcular'
  next.totalPacote = total > 0 ? formatCurrency(total) : ''

  return next
}

export function onlyDigits(value = '') {
  return String(value).replace(/\D/g, '')
}

export function formatPhone(value = '') {
  const digits = onlyDigits(value)
  if (digits.length === 11) return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
  if (digits.length === 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`
  return value || ''
}

export function buildDocumentNumber(id) {
  const now = new Date()
  const suffix = String(id || Math.floor(Math.random() * 9999)).replace(/\D/g, '').slice(-4).padStart(4, '0')
  return `#${now.getFullYear()}-${suffix}`
}

export function buildInitialDraft({ ensaio, cliente, configuracoes }) {
  const hoje = new Date()
  const validade = new Date(hoje)
  validade.setDate(validade.getDate() + 15)

  const valorPacote = ensaio?.valorPacote ?? ''
  const qtdFotos = ensaio?.qtdFotosPacote ?? ''
  const valorFotoExtra = ensaio?.valorFotoExtra ?? ''

  const clienteNome = cliente?.nome || ensaio?.clienteNome || ''
  const tipo = ensaio?.tipo || ''
  const tipoExibicao = ensaio?.tipoExibicao || formatTipo(tipo)
  const usuario = configuracoes?.usuario || {}
  const estudio = configuracoes?.estudio || {}
  const nomeEstudio = estudio.nomeComercial || estudio.nomeEstudio || usuario.nome || 'Fotolhar Fotografia'
  const emailEstudio = estudio.email || usuario.email || ''
  const telefoneEstudio = estudio.telefone || usuario.telefone || ''
  const cidadeEstudio = estudio.cidade || usuario.cidade || ''
  const documentoEstudio = estudio.cnpj ? `CNPJ ${estudio.cnpj}` : ''

  const initialDraft = {
    numeroDocumento: buildDocumentNumber(ensaio?.id),
    dataEmissao: formatLongDate(hoje),
    dataEmissaoCurta: formatDate(hoje),
    validade: formatLongDate(validade),
    cidadeAssinatura: cidadeEstudio || 'Belo Horizonte',

    profissionalNome: nomeEstudio,
    profissionalEmail: emailEstudio,
    profissionalTelefone: telefoneEstudio,
    profissionalCidade: cidadeEstudio,
    profissionalDocumento: documentoEstudio,

    clienteNome,
    clienteCpf: cliente?.cpf || '',
    clienteTelefone: formatPhone(cliente?.telefone || ''),
    clienteEmail: cliente?.email || '',
    clienteCidade: cliente?.cidade || '',
    clienteIndicacao: cliente?.indicacao || '',

    tipoEnsaio: tipoExibicao,
    dataEnsaio: formatLongDate(ensaio?.dataEnsaio, ''),
    horario: '',
    local: ensaio?.local || '',
    observacoes: ensaio?.observacoes || '',

    descricaoPacote: tipo ? `Ensaio ${formatTipo(tipo)} - pacote completo` : 'Ensaio fotografico - pacote completo',
    quantidadePacote: '1',
    valorPacote: valorPacote ? formatCurrency(valorPacote) : '',
    subtotalPacote: valorPacote ? formatCurrency(valorPacote) : '',
    qtdFotos: qtdFotos ? `${qtdFotos} fotos` : '',
    qtdFotosExtras: '',
    valorFotoExtra: valorFotoExtra ? `${formatCurrency(valorFotoExtra)} / foto` : '',
    subtotalFotosExtras: 'A calcular',
    totalPacote: valorPacote ? formatCurrency(valorPacote) : '',
    formaPagamento: 'PIX / Transferencia',
    sinal: '',
    saldo: '',
    condicoesComerciais: 'Deslocamento, descontos, taxas adicionais ou outros combinados serao definidos entre as partes, quando aplicavel.',
    clausulasContrato: DEFAULT_CONTRACT_CLAUSES,
    textoAceiteContrato: DEFAULT_ACCEPT_TEXT,
    modeloContratoId: null,
    modeloContratoNome: '',
  }

  if (tipo) {
    initialDraft.descricaoPacote = `Ensaio ${tipoExibicao} - pacote completo`
  }

  return recalculateFinancialDraft(initialDraft)
}
