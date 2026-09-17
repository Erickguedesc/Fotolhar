import { useRef, useState } from 'react'
import { ImageIcon, TriangleAlert, UploadCloud } from 'lucide-react'

export default function AlbumUpload({
  totalFotos = 0,
  loading,
  disabled,
  uploadProgress = 0,
  uploadTotal = 0,
  uploadStatus = '',
  onUpload,
}) {
  const inputRef = useRef(null)
  const [dragActive, setDragActive] = useState(false)

  const isFinalizando = loading && uploadProgress >= 100

  const handleFiles = (fileList) => {
    if (disabled || loading) return

    const arquivos = Array.from(fileList || [])

    if (!arquivos.length) return

    onUpload(arquivos)

    if (inputRef.current) {
      inputRef.current.value = ''
    }
  }

  return (
    <section className="rounded-[14px] border border-[var(--border)] bg-white/78 p-4 shadow-[0_14px_34px_rgba(31,31,33,0.055)]">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-[9px] bg-[var(--gold-dim)] text-[var(--gold)]">
            <ImageIcon size={18} strokeWidth={1.8} />
          </span>

          <h2 className="text-[17px] font-semibold text-[var(--text)]">
            Álbum compartilhado
          </h2>
        </div>

        <span className="rounded-full bg-[var(--gold-dim)] px-3 py-1 text-[11px] font-semibold text-[var(--gold)]">
          {totalFotos} fotos
        </span>
      </div>

      <div>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          disabled={disabled || loading}
          onChange={(event) => handleFiles(event.target.files)}
        />

        <button
          type="button"
          disabled={loading || disabled}
          onClick={() => {
            if (!disabled && !loading) inputRef.current?.click()
          }}
          onDragEnter={(event) => {
            event.preventDefault()
            if (!disabled && !loading) setDragActive(true)
          }}
          onDragOver={(event) => {
            event.preventDefault()
            if (!disabled && !loading) setDragActive(true)
          }}
          onDragLeave={(event) => {
            event.preventDefault()
            setDragActive(false)
          }}
          onDrop={(event) => {
            event.preventDefault()
            setDragActive(false)
            handleFiles(event.dataTransfer.files)
          }}
          className={`flex min-h-[190px] w-full flex-col items-center justify-center rounded-xl border border-dashed px-6 text-center transition disabled:cursor-not-allowed ${
            disabled
              ? 'border-emerald-200 bg-emerald-50 opacity-80'
              : dragActive
                ? 'border-[var(--gold-border)] bg-[var(--gold-dim)]'
                : 'border-[var(--gold-border)]/65 bg-white/45 hover:border-[var(--gold-border)] hover:bg-[var(--gold-dim)]'
          }`}
        >
          <div
            className={`mb-4 flex h-12 w-12 items-center justify-center rounded-full border ${
              disabled
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                : 'border-[var(--gold-border)] bg-[var(--gold-dim)] text-[var(--gold)]'
            }`}
          >
            {disabled ? '✓' : loading ? '...' : <UploadCloud size={24} strokeWidth={1.7} />}
          </div>

          <p
            className={`text-[13px] font-semibold ${
              disabled
                ? 'text-emerald-700'
                : loading
                  ? 'text-[var(--gold)]'
                  : 'text-[var(--text)]'
            }`}
          >
            {disabled
              ? 'Álbum publicado'
              : loading
                ? uploadStatus ||
                  (isFinalizando
                    ? 'Finalizando envio de fotos...Aguarde!!'
                    : `Enviando ${uploadTotal || ''} foto${uploadTotal === 1 ? '' : 's'}...`)
                : 'Arraste fotos aqui'}
          </p>

          <p className="mt-1 text-[12px] text-[var(--text-muted)]">
            {disabled
              ? 'Uploads bloqueados para não alterar a galeria enviada.'
              : loading
                ? 'Não feche a página até o envio terminar.'
                : 'ou clique para selecionar arquivos — JPG, PNG, WEBP'}
          </p>

          {!disabled && !loading && (
            <p className="mt-4 inline-flex items-center gap-2 rounded-lg border border-[var(--gold-border)] bg-[var(--gold-dim)] px-3 py-2 text-[11.5px] font-semibold text-[var(--gold)]">
              <TriangleAlert size={13} strokeWidth={1.8} />
              <span>Atenção: o tamanho máximo por imagem é de 10 MB.</span>
            </p>
          )}

          {loading && (
            <div className="mt-5 w-full max-w-[420px]">
              <div className="mb-2 flex items-center justify-between text-[11px] text-[var(--text-muted)]">
                <span>
                  {isFinalizando ? 'Processando imagens' : 'Progresso total do upload'}
                </span>

                <span className="text-[var(--gold)]">
                  {uploadProgress}%
                </span>
              </div>

              <div className="h-2 overflow-hidden rounded-full bg-[var(--border)]">
                      <div
                        className="h-full rounded-full bg-emerald-500/80 transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      />
              </div>
            </div>
          )}
        </button>
      </div>
    </section>
  )
}
