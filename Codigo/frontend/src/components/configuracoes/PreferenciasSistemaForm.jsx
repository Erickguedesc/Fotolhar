import { Save, Trash2, Upload } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { FormField, TextareaField } from './FormField'
import InfoBox from './InfoBox'

const emptyForm = {
  qtdFotosPadrao: '',
  valorFotoExtraPadrao: '',
  prazoExpiracaoAlbumDias: '',
  cidadePadrao: '',
  mensagemEnvioAlbum: '',
  mensagemSelecaoRecebida: '',
  capaAlbumPadraoUrl: '',
}

export default function PreferenciasSistemaForm({
  data,
  loading,
  uploadCapaLoading,
  onSubmit,
  onUploadCapaAlbum,
  onRemoverCapaAlbum,
}) {
  const [form, setForm] = useState(emptyForm)
  const fileInputRef = useRef(null)

  useEffect(() => {
    setForm({
      qtdFotosPadrao: data?.qtdFotosPadrao ?? '',
      valorFotoExtraPadrao: data?.valorFotoExtraPadrao ?? '',
      prazoExpiracaoAlbumDias: data?.prazoExpiracaoAlbumDias ?? '',
      cidadePadrao: data?.cidadePadrao || '',
      mensagemEnvioAlbum: data?.mensagemEnvioAlbum || '',
      mensagemSelecaoRecebida: data?.mensagemSelecaoRecebida || '',
      capaAlbumPadraoUrl: data?.capaAlbumPadraoUrl || '',
    })
  }, [data])

  function handleChange(event) {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  function handleSelectCapa(event) {
  const arquivo = event.target.files?.[0]

  if (!arquivo) return

  onUploadCapaAlbum?.(arquivo)

  event.target.value = ''
}

  function handleSubmit(event) {
    event.preventDefault()

    onSubmit({
      ...form,
      qtdFotosPadrao: form.qtdFotosPadrao ? Number(form.qtdFotosPadrao) : null,
      valorFotoExtraPadrao: form.valorFotoExtraPadrao
        ? Number(String(form.valorFotoExtraPadrao).replace(',', '.'))
        : null,
      prazoExpiracaoAlbumDias: form.prazoExpiracaoAlbumDias
        ? Number(form.prazoExpiracaoAlbumDias)
        : null,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <FormField label="Fotos padrão no pacote" name="qtdFotosPadrao" value={form.qtdFotosPadrao} onChange={handleChange} />
        <FormField label="Valor padrão por foto extra" name="valorFotoExtraPadrao" value={form.valorFotoExtraPadrao} onChange={handleChange} />
        <FormField label="Expiração padrão do álbum em dias" name="prazoExpiracaoAlbumDias" value={form.prazoExpiracaoAlbumDias} onChange={handleChange} />
        <FormField label="Cidade padrão" name="cidadePadrao" value={form.cidadePadrao} onChange={handleChange} />
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-hover)] p-5 md:col-span-2">
          <div className="flex flex-col gap-5 md:flex-row md:items-center">
            <div className="h-28 w-44 overflow-hidden rounded-xl border border-[var(--border)] bg-white/70">
              {form.capaAlbumPadraoUrl ? (
                <img
                  src={form.capaAlbumPadraoUrl}
                  alt="Capa padrão do álbum"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xs uppercase tracking-[0.14em] text-[var(--text-muted)]">
                  Sem capa
                </div>
              )}
            </div>

            <div className="flex-1">
              <h3 className="text-sm font-medium text-[var(--text)]">
                Capa padrão do álbum
              </h3>

              <p className="mt-1 text-sm leading-relaxed text-[var(--text-muted)]">
                Essa imagem será usada na capa dos albuns enquanto não tiver fotos oficiais do ensaio. Será vista na tela Dashboard.
              </p>

              <p className="mt-2 break-all text-xs text-[var(--text-muted)]">
                {form.capaAlbumPadraoUrl || 'Nenhuma imagem enviada'}
              </p>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleSelectCapa}
              className="hidden"
            />

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={uploadCapaLoading}
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-white px-4 py-2 text-sm text-[var(--text)] transition hover:border-[var(--gold-border)] hover:bg-[var(--gold-dim)] hover:text-[var(--gold)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Upload size={15} />
                {uploadCapaLoading
                  ? 'Enviando...'
                  : form.capaAlbumPadraoUrl
                    ? 'Editar capa'
                    : 'Enviar capa'}
              </button>

              {form.capaAlbumPadraoUrl && (
                <button
                  type="button"
                  disabled={uploadCapaLoading}
                  onClick={onRemoverCapaAlbum}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-2 text-sm text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Trash2 size={15} />
                  Remover
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <TextareaField
        label="Mensagem padrão para envio do álbum"
        name="mensagemEnvioAlbum"
        value={form.mensagemEnvioAlbum}
        onChange={handleChange}
      />

      <TextareaField
        label="Mensagem padrão após seleção recebida"
        name="mensagemSelecaoRecebida"
        value={form.mensagemSelecaoRecebida}
        onChange={handleChange}
      />

      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-hover)] p-5">
        <h3 className="text-sm font-medium text-[var(--text)]">Importante</h3>

        <p className="mt-2 text-sm leading-relaxed text-[var(--text-muted)]">
          Esses valores são apenas padrões automáticos. Na criação de cada
          ensaio, você ainda pode alterar valor do pacote, quantidade de
          fotos e cobrança por excedentes.
        </p>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--gold)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[var(--gold-light)] disabled:cursor-not-allowed disabled:opacity-60"
      >
        <Save size={16} />
        {loading ? 'Salvando...' : 'Salvar preferências'}
      </button>

      <InfoBox
  title="Sobre as preferências do sistema"
  description="Use esta área para definir valores padrão usados automaticamente em outras telas."
  items={[
    'A quantidade de fotos e o valor por foto extra são usados como sugestão ao criar novos ensaios.',
    'A expiração do álbum define por quantos dias o link de acesso ficará válido.',
    'As mensagens padrão são usadas no envio do álbum e nos fluxos de comunicação.',
    'Esses valores são apenas padrões: ainda podem ser alterados manualmente em cada ensaio.',
  ]}
/>
    </form>
  )
}
