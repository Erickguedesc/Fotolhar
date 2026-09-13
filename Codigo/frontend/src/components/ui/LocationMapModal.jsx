import { useEffect, useState } from 'react'
import { Check, ExternalLink, Search, X } from 'lucide-react'

import {
  getGoogleMapsEmbedUrl,
  getGoogleMapsUrl,
} from '../../utils/localizacaoEnsaio'

const inputClass = `
  w-full rounded-[9px] border border-[var(--border)] bg-white/64
  px-3.5 py-[11px] text-[13.5px] font-light
  text-[var(--text)] outline-none shadow-[0_8px_20px_rgba(31,31,33,0.035)]
  transition-all duration-200 placeholder:text-[var(--text-muted)]
  focus:border-[var(--gold-border)] focus:bg-white
`

export default function LocationMapModal({ initialQuery, onClose, onUseLocation, open }) {
  const [search, setSearch] = useState('')
  const [activeQuery, setActiveQuery] = useState('')

  useEffect(() => {
    if (!open) return

    setSearch(initialQuery || '')
    setActiveQuery(initialQuery || '')
  }, [initialQuery, open])

  useEffect(() => {
    if (!open) return undefined

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose, open])

  if (!open) return null

  const query = activeQuery.trim()

  const handleSearch = () => {
    setActiveQuery(search.trim())
  }

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center bg-[rgba(17,19,21,0.42)] px-4 py-6 backdrop-blur-[2px]">
      <div className="w-full max-w-[760px] overflow-hidden rounded-[16px] border border-[var(--border)] bg-white shadow-[0_26px_80px_rgba(17,19,21,0.25)]">
        <div className="flex items-center justify-between gap-4 border-b border-[var(--border)] px-5 py-4">
          <div className="min-w-0">
            <p className="text-[14px] font-medium text-[var(--text)]">
              Conferir no mapa
            </p>
            <p className="mt-0.5 truncate text-[12px] text-[var(--text-muted)]">
              {query || 'Pesquise uma cidade ou endereço'}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-[var(--border)] text-[var(--text-muted)] transition hover:border-[var(--gold-border)] hover:text-[var(--text)]"
            aria-label="Fechar mapa"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 p-5">
          <div className="flex gap-2 max-sm:flex-col">
            <label className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    handleSearch()
                  }
                }}
                className={`${inputClass} pl-10`}
                placeholder="Pesquisar cidade ou endereço"
              />
            </label>

            <button
              type="button"
              onClick={handleSearch}
              className="rounded-[9px] bg-[#C84F32] px-4 text-[12px] font-medium text-white transition hover:bg-[#AE3F28] max-sm:min-h-[42px]"
            >
              Buscar
            </button>
          </div>

          <div className="overflow-hidden rounded-[13px] border border-[var(--border)] bg-[rgba(247,243,238,0.72)]">
            {query ? (
              <iframe
                title="Mapa do local do ensaio"
                src={getGoogleMapsEmbedUrl(query)}
                className="h-[320px] w-full border-0 max-sm:h-[260px]"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            ) : (
              <div className="flex h-[260px] items-center justify-center px-6 text-center text-[13px] text-[var(--text-muted)]">
                Informe uma cidade ou endereço para visualizar o mapa.
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            {query ? (
              <a
                href={getGoogleMapsUrl(query)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 text-[12px] font-medium text-[#C84F32] transition hover:text-[#AE3F28]"
              >
                <ExternalLink className="h-4 w-4" />
                Abrir no Maps
              </a>
            ) : (
              <span className="text-[12px] text-[var(--text-muted)]">
                O mapa é opcional.
              </span>
            )}

            <button
              type="button"
              onClick={() => onUseLocation(search.trim() || query)}
              disabled={!search.trim() && !query}
              className="inline-flex min-h-[42px] items-center gap-2 rounded-[9px] bg-[#C84F32] px-4 text-[12px] font-medium text-white transition hover:bg-[#AE3F28] disabled:cursor-not-allowed disabled:opacity-55"
            >
              <Check className="h-4 w-4" />
              Usar cidade
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
