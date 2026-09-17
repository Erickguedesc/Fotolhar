import { Image as ImageIcon, RotateCcw, Save, Trash2, Upload } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import ConfirmActionModal from '../ui/ConfirmActionModal'
const posicoes = [
  { value: 'SUPERIOR_ESQUERDA', label: 'Superior esquerda' },
  { value: 'SUPERIOR_DIREITA', label: 'Superior direita' },
  { value: 'CENTRO', label: 'Centro' },
  { value: 'INFERIOR_ESQUERDA', label: 'Inferior esquerda' },
  { value: 'INFERIOR_DIREITA', label: 'Inferior direita' },
]

const tamanhos = [
  { value: 'PEQUENA', label: 'Pequena' },
  { value: 'MEDIA', label: 'Média' },
  { value: 'GRANDE', label: 'Grande' },
]

const fontesTexto = [
  { value: 'MODERNA', label: 'Moderna' },
  { value: 'ELEGANTE', label: 'Elegante' },
  { value: 'CLASSICA', label: 'Clássica' },
]

const coresTexto = [
  { value: 'BRANCO', label: 'Branco' },
  { value: 'PRETO', label: 'Preto' },
  { value: 'DOURADO', label: 'Dourado' },
]

const estilosTexto = [
  { value: 'NORMAL', label: 'Normal' },
  { value: 'NEGRITO', label: 'Negrito' },
  { value: 'ITALICO', label: 'Itálico' },
]

const emptyTextoForm = {
  texto: '',
  fonte: 'MODERNA',
  cor: 'BRANCO',
  estilo: 'NORMAL',
  modo: 'REPETIDA',
}

const emptyForm = {
  marcaDaguaUrl: '',
  marcaDaguaAtiva: false,
  marcaDaguaPosicao: 'INFERIOR_DIREITA',
  marcaDaguaOpacidade: 35,
  marcaDaguaTamanho: 'MEDIA',
  marcaDaguaMargem: 30,
}

const previewFotos = [
  {
    id: 'casamento',
    label: 'Foto escura',
    orientation: 'landscape',
    url: 'https://images.unsplash.com/photo-1606216794074-735e91aa2c92?auto=format&fit=crop&w=900&q=80',
  },
  {
    id: 'infantil',
    label: 'Foto clara',
    orientation: 'portrait',
    url: 'https://i.pinimg.com/474x/0f/40/13/0f40131c6347faa8e93350016197dffd.jpg',
  },
  {
    id: 'retrato',
    label: 'Retrato',
    orientation: 'portrait',
    url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=900&q=80',
  },
]

const panelClass = 'rounded-2xl border border-[var(--border)] bg-[var(--card-hover)] p-5'
const panelTitleClass = 'text-sm font-medium text-[var(--text)]'
const panelTextClass = 'text-sm leading-6 text-[var(--text-muted)]'
const fieldLabelClass = 'mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]'
const fieldControlClass = 'w-full rounded-xl border border-[var(--border)] bg-white px-4 py-3 text-sm text-[var(--text)] outline-none transition placeholder:text-[#96928E] focus:border-[var(--gold-border)] focus:ring-4 focus:ring-[#C84F32]/10'
const inactiveChoiceClass = 'border-[var(--border)] bg-white text-[var(--text-muted)] hover:border-[var(--gold-border)] hover:bg-[var(--gold-dim)] hover:text-[var(--gold)]'
const outlineActionClass = 'inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-white px-4 py-2 text-sm font-medium text-[var(--text)] transition hover:border-[var(--gold-border)] hover:bg-[var(--gold-dim)] hover:text-[var(--gold)] disabled:cursor-not-allowed disabled:opacity-60'

export default function MarcaDaguaForm({
  data,
  loading,
  uploadLoading,
  gerarTextoLoading,
  reprocessLoading,
  onSubmit,
  onUploadImagem,
  onGerarTexto,
  onRemoverImagem,
  onReprocessar,
}) {
  const [form, setForm] = useState(emptyForm)
  const fileInputRef = useRef(null)
  const [textoForm, setTextoForm] = useState(emptyTextoForm)
  const [confirmModal, setConfirmModal] = useState(null)
  const [previewFotoId, setPreviewFotoId] = useState(previewFotos[0].id)

  useEffect(() => {
    setForm({
      marcaDaguaUrl: data?.marcaDaguaUrl || '',
      marcaDaguaAtiva: Boolean(data?.marcaDaguaAtiva),
      marcaDaguaPosicao: data?.marcaDaguaPosicao || 'INFERIOR_DIREITA',
      marcaDaguaOpacidade: data?.marcaDaguaOpacidade ?? 35,
      marcaDaguaTamanho: data?.marcaDaguaTamanho || 'MEDIA',
      marcaDaguaMargem: data?.marcaDaguaMargem ?? 30,
    })

    setTextoForm({
  texto: data?.marcaDaguaTexto || '',
  fonte: data?.marcaDaguaFonte || 'MODERNA',
  cor: data?.marcaDaguaCor || 'BRANCO',
  estilo: data?.marcaDaguaEstilo || 'NORMAL',
  modo: data?.marcaDaguaTextoModo || 'REPETIDA',
})

  }, [data])

  function handleChange(event) {
    const { name, value, type, checked } = event.target

    setForm((current) => ({
      ...current,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  function handleSubmit(event) {
    event.preventDefault()

    onSubmit({
      marcaDaguaAtiva: form.marcaDaguaAtiva,
      marcaDaguaPosicao: form.marcaDaguaPosicao,
      marcaDaguaOpacidade: Number(form.marcaDaguaOpacidade),
      marcaDaguaTamanho: form.marcaDaguaTamanho,
      marcaDaguaMargem: Number(form.marcaDaguaMargem),
    })
  }

  function handleSelectFile(event) {
    const arquivo = event.target.files?.[0]

    if (!arquivo) return

    onUploadImagem?.(arquivo)

    event.target.value = ''
  }

  function handleTextoChange(event) {
  const { name, value } = event.target

  setTextoForm((current) => ({
    ...current,
    [name]: value,
  }))
}

function handleGerarTexto() {
  const texto = textoForm.texto.trim()

  if (!texto) return

  onGerarTexto?.({
    texto,
    fonte: textoForm.fonte,
    cor: textoForm.cor,
    estilo: textoForm.estilo,
    modo: textoForm.modo,
  })
}

  const posicaoPreview = {
    SUPERIOR_ESQUERDA: 'items-start justify-start',
    SUPERIOR_DIREITA: 'items-start justify-end',
    CENTRO: 'items-center justify-center',
    INFERIOR_ESQUERDA: 'items-end justify-start',
    INFERIOR_DIREITA: 'items-end justify-end',
  }[form.marcaDaguaPosicao]

  const tamanhoPreview = {
    PEQUENA: 'w-24',
    MEDIA: 'w-36',
    GRANDE: 'w-48',
  }[form.marcaDaguaTamanho]

  const temMarcaDagua = Boolean(form.marcaDaguaUrl)
  const marcaPorTexto = data?.marcaDaguaTipo === 'TEXTO'
  const textoRepetidoPreview = marcaPorTexto && (data?.marcaDaguaTextoModo || 'REPETIDA') === 'REPETIDA'
  const previewFoto = previewFotos.find((foto) => foto.id === previewFotoId) || previewFotos[0]
  const previewVertical = previewFoto.orientation === 'portrait'
  const gerarTextoDisabled = gerarTextoLoading || !textoForm.texto.trim()

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className={panelClass}>
        <h3 className="text-sm font-semibold text-[var(--text)]">
          Sobre a marca d’água
        </h3>

       <p className={`mt-2 ${panelTextClass}`}>
  Configure a marca aplicada nas fotos exibidas na galeria compartilhada.
  Você pode enviar uma imagem/logo (preferencialmente PNG) ou criar uma marca d’água por texto.
  A imagem original continua preservada, e a galeria exibe apenas a versão protegida.
</p>

<ul className="mt-4 grid gap-2 text-sm text-[var(--text-muted)]">
  <li>• Protege as fotos antes da entrega final.</li>
  <li>• Permite usar uma imagem/logo como marca d’água.</li>
  <li>• Permite criar uma marca d’água digitando um texto personalizado.</li>
  <li>• Será aplicada nas novas fotos enviadas.</li>
  <li>• Fotos antigas podem ser reprocessadas com a nova configuração de marca d'água.</li>
</ul>
      </div>

      <div className={`${panelClass} flex flex-col gap-5 md:flex-row md:items-center`}>
        <div className="flex h-20 w-32 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[var(--gold-border)] bg-[var(--gold-dim)] font-serif text-xs tracking-[0.16em] text-[var(--gold)]">
          {form.marcaDaguaUrl ? (
            <img
              src={form.marcaDaguaUrl}
              alt="Marca d’água"
              className="h-full w-full object-contain p-2"
            />
          ) : (
            'ENVIAR MARCA'
          )}
        </div>

        <div className="flex-1">
          <h3 className={panelTitleClass}>
            Logo/marca d’água das fotos
          </h3>

          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Imagem aplicada sobre as fotos exibidas na galeria compartilhada. Preferencialmente PNG
          </p>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleSelectFile}
          className="hidden"
        />

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={uploadLoading}
            onClick={() => fileInputRef.current?.click()}
            className={outlineActionClass}
          >
            <Upload size={15} />
            {uploadLoading ? 'Enviando...' : 'Alterar marca'}
          </button>

          {form.marcaDaguaUrl && (
            <button
              type="button"
              disabled={uploadLoading}
              onClick={() => setConfirmModal('remover')}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Trash2 size={15} />
              Remover
            </button>
          )}
        </div>
      </div>

      <div className={panelClass}>
  <div className="mb-5">
    <h3 className={panelTitleClass}>
      Criar marca d’água por texto
    </h3>

    <p className="mt-1 text-sm text-[var(--text-muted)]">
      Digite um texto para o sistema gerar uma proteção repetida sobre toda a foto.
    </p>

    {data?.marcaDaguaTipo === 'TEXTO' && data?.marcaDaguaTexto && (
      <p className="mt-3 inline-flex rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-xs text-emerald-300">
        Marca atual criada por texto: {data.marcaDaguaTexto}
      </p>
    )}
  </div>

  <div className="grid gap-4 md:grid-cols-2">
    <div className="md:col-span-2">
      <label className={fieldLabelClass}>
        Texto da marca d’água
      </label>

      <input
        type="text"
        name="texto"
        value={textoForm.texto}
        onChange={handleTextoChange}
        placeholder="Ex: © Fotolhar Fotografia"
        maxLength={200}
        className={fieldControlClass}
      />
    </div>

    <div>
      <label className={fieldLabelClass}>
        Fonte
      </label>

      <select
        name="fonte"
        value={textoForm.fonte}
        onChange={handleTextoChange}
        className={fieldControlClass}
      >
        {fontesTexto.map((fonte) => (
          <option key={fonte.value} value={fonte.value}>
            {fonte.label}
          </option>
        ))}
      </select>
    </div>

    <div>
      <label className={fieldLabelClass}>
        Cor
      </label>

      <select
        name="cor"
        value={textoForm.cor}
        onChange={handleTextoChange}
        className={fieldControlClass}
      >
        {coresTexto.map((cor) => (
          <option key={cor.value} value={cor.value}>
            {cor.label}
          </option>
        ))}
      </select>
    </div>

    <div>
      <label className={fieldLabelClass}>
        Estilo
      </label>

      <select
        name="estilo"
        value={textoForm.estilo}
        onChange={handleTextoChange}
        className={fieldControlClass}
      >
        {estilosTexto.map((estilo) => (
          <option key={estilo.value} value={estilo.value}>
            {estilo.label}
          </option>
        ))}
      </select>
    </div>

    <div className="md:col-span-2">
      <label className={fieldLabelClass}>
        Como aplicar o texto
      </label>

      <div className="grid gap-2 md:grid-cols-2">
        {[
          {
            value: 'REPETIDA',
            title: 'Repetida na foto toda',
            description: 'Protecao mais forte para selecao de fotos.',
          },
          {
            value: 'UNICA',
            title: 'Texto unico',
            description: 'Assinatura discreta usando posicao e tamanho.',
          },
        ].map((modo) => {
          const active = textoForm.modo === modo.value

          return (
            <label
              key={modo.value}
              className={`cursor-pointer rounded-xl border p-4 transition ${
                active
                  ? 'border-[var(--gold-border)] bg-[var(--gold-dim)] text-[var(--gold)]'
                  : inactiveChoiceClass
              }`}
            >
              <input
                type="radio"
                name="modo"
                value={modo.value}
                checked={active}
                onChange={handleTextoChange}
                className="sr-only"
              />
              <span className="block text-sm font-medium">
                {modo.title}
              </span>
              <span
                className={`mt-1 block text-xs leading-5 ${
                  active ? 'text-[#B45A42]' : 'text-[#6F6D6B]'
                }`}
              >
                {modo.description}
              </span>
            </label>
          )
        })}
      </div>
    </div>

    <div className="flex items-end">
      <button
        type="button"
        disabled={gerarTextoDisabled}
        onClick={handleGerarTexto}
        className={`inline-flex w-full items-center justify-center gap-2 rounded-xl border px-5 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-100 ${
          gerarTextoDisabled
            ? 'border-[#D8D2CD] bg-[#F5F3F1] text-[#4F4D4A]'
            : 'border-[var(--gold-border)] bg-[var(--gold-dim)] text-[var(--gold)] hover:bg-[var(--gold)] hover:text-[#FFFFFF]'
        }`}
      >
        {gerarTextoLoading ? 'Gerando...' : 'Gerar marca por texto'}
      </button>
    </div>
  </div>
</div>

      <div className={panelClass}>
        <div className="mb-5 flex items-center justify-between gap-4 border-b border-[var(--border)] pb-5">
          <div>
            <h3 className={panelTitleClass}>
              Aplicação da marca d’água
            </h3>

            <p className="mt-1 text-sm text-[var(--text-muted)]">
              Ative ou desative a proteção nas fotos da galeria.
            </p>
          </div>

<label
  className={`flex items-center gap-3 ${
    temMarcaDagua ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'
  }`}
>  <span
    className={`text-sm ${
      form.marcaDaguaAtiva ? 'text-emerald-600' : 'text-[var(--text-muted)]'
    }`}
  >
    {form.marcaDaguaAtiva ? 'Ativada' : 'Desativada'}
  </span>

  <input
  type="checkbox"
  name="marcaDaguaAtiva"
  checked={form.marcaDaguaAtiva}
  disabled={!temMarcaDagua}
  onChange={handleChange}
  className="sr-only"
/>

  <span
    className={`relative h-7 w-12 rounded-full border transition ${
      form.marcaDaguaAtiva
        ? 'border-emerald-400/40 bg-emerald-400/15'
        : 'border-[var(--border)] bg-white'
    }`}
  >
    <span
      className={`absolute top-1 h-5 w-5 rounded-full transition ${
        form.marcaDaguaAtiva
          ? 'left-6 bg-emerald-300'
          : 'left-1 bg-[var(--text-muted)]'
      }`}
    />
  </span>
</label>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <p className={fieldLabelClass}>
              Posição
            </p>

            <div className="grid gap-2">
              {posicoes.map((posicao) => (
                <label
                  key={posicao.value}
                  className={`cursor-pointer rounded-xl border px-4 py-3 text-sm transition ${
                    form.marcaDaguaPosicao === posicao.value
                      ? 'border-[var(--gold-border)] bg-[var(--gold-dim)] text-[var(--gold)]'
                      : inactiveChoiceClass
                  }`}
                >
                  <input
                    type="radio"
                    name="marcaDaguaPosicao"
                    value={posicao.value}
                    checked={form.marcaDaguaPosicao === posicao.value}
                    onChange={handleChange}
                    className="sr-only"
                  />

                  {posicao.label}
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-5">
            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
                  Opacidade
                </p>

                <span className="text-sm text-[var(--gold)]">
                  {form.marcaDaguaOpacidade}%
                </span>
              </div>

              <input
                type="range"
                name="marcaDaguaOpacidade"
                min="10"
                max="100"
                value={form.marcaDaguaOpacidade}
                onChange={handleChange}
                className="w-full accent-[var(--gold)]"
              />
            </div>

            <div>
              <p className={fieldLabelClass}>
                Tamanho
              </p>

              <div className="grid grid-cols-3 gap-2">
                {tamanhos.map((tamanho) => (

                    
                  <label
                    key={tamanho.value}
                    className={`cursor-pointer rounded-xl border px-3 py-3 text-center text-sm transition ${
                      form.marcaDaguaTamanho === tamanho.value
                        ? 'border-[var(--gold-border)] bg-[var(--gold-dim)] text-[var(--gold)]'
                        : inactiveChoiceClass
                    }`}
                  >
                    <input
                      type="radio"
                      name="marcaDaguaTamanho"
                      value={tamanho.value}
                      checked={form.marcaDaguaTamanho === tamanho.value}
                      onChange={handleChange}
                      className="sr-only"
                    />

                    {tamanho.label}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
                  Margem da borda
                </p>

                <span className="text-sm text-[var(--gold)]">
                  {form.marcaDaguaMargem}px
                </span>
              </div>

              <input
                type="range"
                name="marcaDaguaMargem"
                min="0"
                max="80"
                step="5"
                value={form.marcaDaguaMargem}
                onChange={handleChange}
                className="w-full accent-[var(--gold)]"
              />
            </div>
          </div>
        </div>
      </div>

      <div className={panelClass}>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ImageIcon size={17} className="text-[var(--gold)]" />

            <h3 className={panelTitleClass}>
              Pré-visualização na galeria
            </h3>
          </div>

          <div className="flex flex-wrap gap-2">
            {previewFotos.map((foto) => {
              const active = previewFotoId === foto.id

              return (
                <button
                  key={foto.id}
                  type="button"
                  onClick={() => setPreviewFotoId(foto.id)}
                  className={`rounded-lg border px-3 py-1.5 text-xs transition ${
                    active
                      ? 'border-[var(--gold-border)] bg-[var(--gold-dim)] text-[var(--gold)]'
                      : inactiveChoiceClass
                  }`}
                >
                  {foto.label}
                </button>
              )
            })}
          </div>
        </div>

        <div
          className={`overflow-hidden rounded-2xl border border-[var(--border)] ${
            previewVertical
              ? 'flex justify-center bg-[#0f0f0f] p-4'
              : 'bg-[#181818]'
          }`}
        >
          <div className={`relative overflow-hidden ${previewVertical ? 'max-w-full rounded-xl' : 'w-full'}`}>
            <img
              src={previewFoto.url}
              alt={`Prévia de marca d'água em ${previewFoto.label.toLowerCase()}`}
              className={
                previewVertical
                  ? 'h-[520px] max-h-[68vh] w-auto max-w-full object-contain brightness-75'
                  : 'h-[320px] w-full object-cover brightness-75'
              }
            />

            {form.marcaDaguaAtiva && (
              <div
                className={textoRepetidoPreview ? 'absolute inset-0' : `absolute inset-0 flex ${posicaoPreview}`}
                style={textoRepetidoPreview ? undefined : { padding: `${form.marcaDaguaMargem}px` }}
              >
                {form.marcaDaguaUrl && (
                  <img
                    src={form.marcaDaguaUrl}
                    alt="Prévia da marca d’água"
                    className={textoRepetidoPreview ? 'h-full w-full object-cover' : `${tamanhoPreview} object-contain`}
                    style={{ opacity: Number(form.marcaDaguaOpacidade) / 100 }}
                  />
                )}
              </div>
            )}
          </div>
        </div>

      <p className="mt-3 text-xs leading-5 text-[var(--text-muted)]">
  {form.marcaDaguaUrl
    ? 'Esta prévia mostra como a marca d’água aparecerá na galeria. A imagem original permanece preservada.'
    : 'Envie uma imagem de marca d’água para visualizar e aplicar a proteção nas fotos da galeria.'}
</p>
      </div>

      <div className="flex flex-wrap gap-3">
       <button
        type="submit"
        disabled={loading || !temMarcaDagua}          
        className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--gold)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[var(--gold-light)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Save size={16} />
          {loading ? 'Salvando...' : 'Salvar'}
        </button>

        <button
          type="button"
disabled={reprocessLoading || !temMarcaDagua}
          onClick={() => setConfirmModal('reprocessar')}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-white px-5 py-3 text-sm font-medium text-[var(--text-muted)] transition hover:border-[var(--gold-border)] hover:bg-[var(--gold-dim)] hover:text-[var(--gold)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RotateCcw size={16} />
          {reprocessLoading ? 'Reprocessando...' : 'Reprocessar fotos já enviadas'}
        </button>
      </div>

      <ConfirmActionModal
  open={confirmModal === 'remover'}
  type="danger"
  title="Remover marca d’água?"
  description="A marca atual será removida das configurações. As fotos novas deixarão de receber essa proteção até que uma nova marca seja enviada ou criada por texto."
  confirmText="Remover"
  cancelText="Cancelar"
  loading={uploadLoading}
  onClose={() => setConfirmModal(null)}
  onConfirm={() => {
    setConfirmModal(null)
    onRemoverImagem?.()
  }}
/>

<ConfirmActionModal
  open={confirmModal === 'reprocessar'}
  type="gold"
  title="Reprocessar fotos?"
  description="As fotos já enviadas serão atualizadas com a configuração atual da marca d’água. Isso pode alterar a visualização da galeria."
  confirmText="Reprocessar"
  cancelText="Cancelar"
  loading={reprocessLoading}
  onClose={() => setConfirmModal(null)}
  onConfirm={() => {
    setConfirmModal(null)
    onReprocessar?.()
  }}
/>

      
    </form>
  )
}
