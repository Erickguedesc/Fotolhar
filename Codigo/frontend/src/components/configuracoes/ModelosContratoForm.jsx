import { CheckCircle2, FileText, ListChecks, Plus, Save, Star, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import ConfirmActionModal from '../ui/ConfirmActionModal'
import { FormField, TextareaField } from './FormField'
import InfoBox from './InfoBox'

const TIPO_OPTIONS = [
  { value: '', label: 'Todos os tipos' },
  { value: 'NEWBORN', label: 'Newborn' },
  { value: 'GESTANTE', label: 'Gestante' },
  { value: 'FAMILIA', label: 'Familia' },
  { value: 'INFANTIL', label: 'Infantil' },
  { value: 'FEMININO', label: 'Feminino' },
  { value: 'CASAL', label: 'Casal' },
  { value: 'BOOK', label: 'Book' },
  { value: 'BATIZADO', label: 'Batizado' },
  { value: 'EXTERNO', label: 'Externo' },
  { value: 'FORMATURA', label: 'Formatura' },
  { value: 'EVENTO', label: 'Evento' },
  { value: 'DEBUTANTE', label: 'Debutante' },
  { value: 'OUTRO', label: 'Outro' },
]

const DEFAULT_CLAUSULAS = [
  'O presente pre-contrato tem validade de {validade} a partir da data de emissao. Apos este prazo, os valores estao sujeitos a revisao.',
  'O agendamento e confirmado mediante o pagamento do sinal informado neste documento. A data e o horario ficam reservados apos a confirmacao.',
  'As fotos editadas serao entregues via galeria online exclusiva com link protegido por senha. O prazo de entrega e combinado entre as partes.',
  'Caso sejam selecionadas mais fotos do que o pacote inclui, será gerado valor adicional por foto excedente, a ser quitado antes da entrega final.',
].join('\n')

const DEFAULT_ACEITE =
  'Ao assinar este documento, as partes declaram ter lido e compreendido todos os termos acima, concordando com as condicoes estabelecidas neste pre-contrato de prestacao de servicos fotograficos.'

const emptyForm = {
  id: null,
  nome: '',
  tipoEnsaio: '',
  clausulas: DEFAULT_CLAUSULAS,
  textoAceite: DEFAULT_ACEITE,
  padrao: false,
}

function tipoLabel(value) {
  return TIPO_OPTIONS.find((option) => option.value === value)?.label || 'Todos os tipos'
}

function statusModeloLabel(modelo) {
  return modelo?.padrao ? 'Usado automaticamente' : 'Disponivel para escolher'
}

function splitClausulas(value) {
  return String(value || '')
    .split(/\n+/)
    .map((clausula) => clausula.trim())
    .filter(Boolean)
}

function getClausulasEditor(value) {
  const linhas = String(value ?? '').split('\n')
  return linhas.length ? linhas : ['']
}

export default function ModelosContratoForm({
  data = [],
  loading,
  onCreate,
  onUpdate,
  onDelete,
}) {
  const modelos = useMemo(() => Array.isArray(data) ? data : [], [data])
  const [selectedId, setSelectedId] = useState(null)
  const [isDraftNew, setIsDraftNew] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [clausulasModalOpen, setClausulasModalOpen] = useState(false)
  const clausulasPreview = useMemo(() => splitClausulas(form.clausulas), [form.clausulas])
  const clausulasEditor = useMemo(() => getClausulasEditor(form.clausulas), [form.clausulas])

  useEffect(() => {
    if (isDraftNew) return

    if (!modelos.length) {
      setSelectedId(null)
      setForm(emptyForm)
      return
    }

    const selected = modelos.find((modelo) => modelo.id === selectedId) || modelos[0]
    setSelectedId(selected.id)
    setForm({
      id: selected.id,
      nome: selected.nome || '',
      tipoEnsaio: selected.tipoEnsaio || '',
      clausulas: selected.clausulas || DEFAULT_CLAUSULAS,
      textoAceite: selected.textoAceite || DEFAULT_ACEITE,
      padrao: Boolean(selected.padrao),
    })
  }, [isDraftNew, modelos, selectedId])

  function handleChange(event) {
    const { name, value, type, checked } = event.target
    setForm((current) => ({
      ...current,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  function handleNew() {
    setIsDraftNew(true)
    setSelectedId(null)
    setForm({
      ...emptyForm,
      nome: `Modelo ${modelos.length + 1}`,
    })
  }

  function handleSelect(modelo) {
    setIsDraftNew(false)
    setSelectedId(modelo.id)
  }

  function handleClausulaChange(index, value) {
    setForm((current) => {
      const itens = getClausulasEditor(current.clausulas)
      const novasLinhas = String(value).split('\n')
      itens.splice(index, 1, ...novasLinhas)

      return {
        ...current,
        clausulas: itens.join('\n'),
      }
    })
  }

  function handleAddClausula() {
    setForm((current) => {
      const itens = getClausulasEditor(current.clausulas)
      return {
        ...current,
        clausulas: [...itens, ''].join('\n'),
      }
    })
  }

  function handleRemoveClausula(index) {
    setForm((current) => {
      const itens = getClausulasEditor(current.clausulas)
      itens.splice(index, 1)

      return {
        ...current,
        clausulas: (itens.length ? itens : ['']).join('\n'),
      }
    })
  }

  async function handleSubmit(event) {
    event.preventDefault()

    const payload = {
      nome: form.nome,
      tipoEnsaio: form.tipoEnsaio || null,
      clausulas: form.clausulas,
      textoAceite: form.textoAceite,
      padrao: form.padrao,
      ativo: true,
    }

    if (form.id) {
      await onUpdate?.(form.id, payload)
      return
    }

    await onCreate?.(payload)
    setIsDraftNew(false)
    setSelectedId(null)
  }

  const hasModelos = modelos.length > 0

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="theme-title font-serif text-2xl font-light">
            Modelos de contrato
          </h3>
          <p className="theme-muted mt-1 text-sm">
            Configure clausulas reutilizaveis para o pre-contrato. O modelo automatico aparece indicado na lista.
          </p>
        </div>

        <button
          type="button"
          onClick={handleNew}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--gold)] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--gold-light)]"
        >
          <Plus size={16} />
          Novo modelo
        </button>
      </div>

      <div className="grid gap-5 lg:grid-cols-[280px_1fr]">
        <aside className="space-y-3">
          {hasModelos ? modelos.map((modelo) => {
            const active = modelo.id === form.id

            return (
              <button
                key={modelo.id}
                type="button"
                onClick={() => handleSelect(modelo)}
                className={`theme-panel w-full rounded-2xl border p-4 text-left transition ${
                  active ? 'border-[var(--gold-border)] bg-[var(--gold-dim)]' : 'hover:border-[var(--gold-border)]'
                }`}
              >
                <span className="flex items-start justify-between gap-3">
                  <span className="min-w-0">
                    <span className="flex min-w-0 items-center gap-2">
                      {active ? (
                        <CheckCircle2 size={15} className="shrink-0 text-emerald-300" />
                      ) : null}

                      <span className="theme-title block truncate text-sm font-semibold">
                        {modelo.nome}
                      </span>
                    </span>

                    <span className="theme-muted mt-1 block text-xs">
                      {tipoLabel(modelo.tipoEnsaio)}
                    </span>

                    {active ? (
                      <span className="mt-3 inline-flex rounded-full border border-emerald-400/35 bg-emerald-400/10 px-2.5 py-1 text-[10px] font-medium text-emerald-300">
                        Selecionado
                      </span>
                    ) : null}

                    <span className={`mt-3 inline-flex rounded-full border px-2.5 py-1 text-[10px] font-medium ${
                      modelo.padrao
                        ? 'border-[var(--gold-border)] bg-[var(--gold-dim)] text-[var(--gold)]'
                        : 'border-[var(--border)] text-[var(--text-muted)]'
                    }`}>
                      {statusModeloLabel(modelo)}
                    </span>
                  </span>

                  {modelo.padrao && (
                    <span className="rounded-full border border-[var(--gold-border)] bg-[var(--gold-dim)] p-1 text-[var(--gold)]">
                      <Star size={13} />
                    </span>
                  )}
                </span>
              </button>
            )
          }) : (
            <div className="theme-panel rounded-2xl border p-4 text-sm">
              Nenhum modelo cadastrado.
            </div>
          )}

          {hasModelos ? (
            <div className="theme-muted rounded-2xl border border-[var(--border)] px-4 py-3 text-xs leading-5">
              {modelos.length} modelo{modelos.length === 1 ? '' : 's'} cadastrado{modelos.length === 1 ? '' : 's'}.
              {' '}O selo <span className="text-[var(--gold)]">Usado automaticamente</span> mostra qual entra primeiro no pre-contrato.
            </div>
          ) : null}
        </aside>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="theme-panel rounded-2xl border p-5">
            <div className="mb-5 flex items-center gap-3">
              <span className="rounded-xl border border-[var(--gold-border)] bg-[var(--gold-dim)] p-2 text-[var(--gold)]">
                <FileText size={18} />
              </span>
              <div>
                <h4 className="theme-title text-sm font-semibold">
                  {form.id ? 'Editar modelo' : 'Novo modelo'}
                </h4>
                <p className="theme-muted mt-1 text-xs">
                  Cada item abaixo vira uma clausula no pre-contrato.
                </p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                label="Nome do modelo"
                name="nome"
                value={form.nome}
                onChange={handleChange}
                placeholder="Ex: Contrato Newborn"
              />

              <label className="block">
                <span className="theme-muted mb-2 block text-xs uppercase tracking-[0.14em]">
                  Tipo de ensaio
                </span>

                <select
                  name="tipoEnsaio"
                  value={form.tipoEnsaio}
                  onChange={handleChange}
                  className="theme-input w-full rounded-xl border px-4 py-3 text-sm outline-none transition focus:border-[var(--gold-border)]"
                >
                  {TIPO_OPTIONS.map((option) => (
                    <option key={option.value || 'todos'} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="mt-4">
              <label className="theme-card flex items-center justify-between gap-4 rounded-2xl border p-4">
                <span>
                  <span className="theme-title block text-sm font-medium">
                    Usar este modelo automaticamente
                  </span>
                  <span className="theme-muted mt-1 block text-xs">
                    Este sera sugerido primeiro ao abrir o pre-contrato.
                  </span>
                </span>
                <input
                  type="checkbox"
                  name="padrao"
                  checked={form.padrao}
                  onChange={handleChange}
                  className="h-4 w-4 accent-[var(--gold)]"
                />
              </label>
            </div>
          </div>

          <section className="theme-panel rounded-2xl border p-5">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="inline-flex items-center gap-2">
                  <ListChecks size={16} className="text-[var(--gold)]" />
                  <span className="theme-muted text-xs uppercase tracking-[0.14em]">
                    Clausulas do contrato
                  </span>
                </div>
                <p className="theme-muted mt-2 text-xs leading-5">
                  Escreva como no Word: um ponto para cada paragrafo. Enter cria uma nova clausula.
                </p>
              </div>

              <span className="rounded-full border border-[var(--gold-border)] bg-[var(--gold-dim)] px-3 py-1 text-[11px] font-medium text-[var(--gold)]">
                {clausulasPreview.length} clausula{clausulasPreview.length === 1 ? '' : 's'}
              </span>
            </div>

            <ClausulasEditor
              clausulas={clausulasEditor}
              onChange={handleClausulaChange}
              onRemove={handleRemoveClausula}
            />

            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleAddClausula}
                className="inline-flex items-center gap-2 rounded-xl border border-[var(--gold-border)] px-4 py-2 text-xs font-medium text-[var(--gold)] transition hover:bg-[var(--gold-dim)]"
              >
                <Plus size={14} />
                Adicionar clausula
              </button>

              {clausulasPreview.length > 4 ? (
                <button
                  type="button"
                  onClick={() => setClausulasModalOpen(true)}
                  className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] px-4 py-2 text-xs font-medium text-[var(--text)] transition hover:border-[var(--gold-border)] hover:text-[var(--gold)]"
                >
                  <ListChecks size={14} />
                  Editar em card maior
                </button>
              ) : null}
            </div>
          </section>

          <TextareaField
            label="Texto de aceite"
            name="textoAceite"
            value={form.textoAceite}
            onChange={handleChange}
            rows={4}
          />

          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--gold)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[var(--gold-light)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Save size={16} />
              {loading ? 'Salvando...' : 'Salvar modelo'}
            </button>

            {form.id && (
              <button
                type="button"
                disabled={loading}
                onClick={() => setDeleteTarget(form)}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-400/25 px-5 py-3 text-sm font-medium text-red-300 transition hover:bg-red-400/10 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Trash2 size={16} />
                Excluir
              </button>
            )}
          </div>

          <InfoBox
            title="Variaveis disponiveis"
            description="Use as variaveis abaixo no texto. O sistema troca pelos dados reais ao abrir o pre-contrato."
            items={[
              '{cliente_nome}, {tipo_ensaio}, {data_ensaio}, {local_ensaio}',
              '{valor_pacote}, {qtd_fotos}, {valor_foto_extra}, {nome_profissional}',
              '{data_emissao}, {validade}, {cidade_assinatura}, {condicoes_comerciais}',
              'Na tela de contrato, cada cláusula deve poder ser editada individualmente.',
              'Crie modelos de contrato para cadastrar diferentes tipos de contrato, como: Contrato Gestante, Contrato Família, Contrato Feminino, entre outros.'
               
            ]}
          />
        </form>
      </div>

      <ConfirmActionModal
        open={Boolean(deleteTarget)}
        type="danger"
        title="Excluir modelo?"
        description="Este modelo sera removido das configuracoes. Contratos ja exportados nao serao alterados."
        confirmText="Excluir"
        cancelText="Cancelar"
        loading={loading}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          const id = deleteTarget?.id
          setDeleteTarget(null)
          if (id) onDelete?.(id)
        }}
      />

      {clausulasModalOpen ? (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 p-6 backdrop-blur-sm max-sm:p-4">
          <div className="theme-card flex max-h-[88vh] w-full max-w-5xl flex-col rounded-2xl border border-[var(--gold-border)] shadow-2xl">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--gold-border)] px-6 py-5">
              <div>
                <p className="theme-muted text-xs uppercase tracking-[0.14em]">
                  Clausulas do contrato
                </p>
                <h4 className="theme-title mt-1 font-serif text-2xl font-light">
                  Editar em card maior
                </h4>
              </div>

              <button
                type="button"
                onClick={() => setClausulasModalOpen(false)}
                className="rounded-xl border border-[var(--border)] px-4 py-2 text-sm text-[var(--text)] transition hover:border-[var(--gold-border)] hover:text-[var(--gold)]"
              >
                Fechar
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-6">
              <ClausulasEditor
                clausulas={clausulasEditor}
                onChange={handleClausulaChange}
                onRemove={handleRemoveClausula}
              />

              <button
                type="button"
                onClick={handleAddClausula}
                className="mt-4 inline-flex items-center gap-2 rounded-xl border border-[var(--gold-border)] px-4 py-2 text-xs font-medium text-[var(--gold)] transition hover:bg-[var(--gold-dim)]"
              >
                <Plus size={14} />
                Adicionar clausula
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function ClausulasEditor({ clausulas, onChange, onRemove }) {
  return (
    <div className="space-y-3">
      {clausulas.map((clausula, index) => (
        <div
          key={`clausula-${index}`}
          className="theme-input grid grid-cols-[34px_minmax(0,1fr)] rounded-xl border transition focus-within:border-[var(--gold-border)]"
        >
          <div className="flex justify-center pt-5">
            <span className="h-2 w-2 rounded-full bg-[var(--gold)]" />
          </div>

          <div className="min-w-0 py-2 pr-3">
            <textarea
              value={clausula}
              onChange={(event) => onChange(index, event.target.value)}
              rows={2}
              className="min-h-[52px] w-full resize-y bg-transparent py-1 text-sm leading-6 text-[var(--text)] outline-none placeholder:text-[var(--text-muted)]"
              placeholder={`Clausula ${index + 1}`}
            />

            {clausulas.length > 1 ? (
              <button
                type="button"
                onClick={() => onRemove(index)}
                className="theme-muted mt-1 text-[11px] transition hover:text-red-300"
              >
                Remover clausula
              </button>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  )
}
