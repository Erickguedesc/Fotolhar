import { useEffect, useState } from 'react'

import {
  getStatusInfo,
  getTipoExibicao,
} from '../listaEnsaios/ensaioHelpers'

function formatarDataHora(valor) {
  if (!valor) return 'Data não informada'

  const data = new Date(valor)

  if (Number.isNaN(data.getTime())) return 'Data não informada'

  return data.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }) + ', ' + data.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function CalendarIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" className="text-current">
      <path d="M8 2V5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M16 2V5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <rect x="3" y="4" width="18" height="17" rx="2" stroke="currentColor" strokeWidth="1.8" />
      <path d="M3 9H21" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  )
}

function LocationIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" className="text-current">
      <path
        d="M12 21C12 21 18 15.6 18 10.2C18 6.78 15.31 4 12 4C8.69 4 6 6.78 6 10.2C6 15.6 12 21 12 21Z"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <circle cx="12" cy="10" r="2.4" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  )
}

function EditIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-current">
      <path d="M12 20H21" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path
        d="M16.5 3.5C17.3284 2.67157 18.6716 2.67157 19.5 3.5C20.3284 4.32843 20.3284 5.67157 19.5 6.5L8 18L3 19L4 14L16.5 3.5Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  )
}
function BackIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-current">
      <path
        d="M19 12H5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M12 19L5 12L12 5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
function FileIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-current">
      <path
        d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M14 2V8H20" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8 13H16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M8 17H13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}
function WhatsAppIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-current">
      <path
        d="M4.5 19.5L5.7 15.8C4.95 14.6 4.55 13.25 4.55 11.85C4.55 7.7 7.92 4.35 12.08 4.35C16.23 4.35 19.6 7.7 19.6 11.85C19.6 16 16.23 19.35 12.08 19.35C10.75 19.35 9.47 19 8.35 18.35L4.5 19.5Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M9.5 9.25C9.72 11.75 11.35 13.45 14.05 14.35L15 13.2"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function NotesIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" className="text-[var(--gold)]">
      <path d="M7 4H17C18.1 4 19 4.9 19 6V18C19 19.1 18.1 20 17 20H7C5.9 20 5 19.1 5 18V6C5 4.9 5.9 4 7 4Z" stroke="currentColor" strokeWidth="1.8" />
      <path d="M8.5 9H15.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M8.5 13H15.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M8.5 17H12.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

export default function EnsaioHero({
  ensaio,
  fotos = [],
  savingNotes = false,
  onEdit,
  onSaveNotes,
  onPreContrato,
  onWhatsApp,
  onBack,
}) {
  const statusInfo = getStatusInfo(ensaio?.status)
  const [notes, setNotes] = useState(ensaio?.notasInternas || '')
  const [notesOpen, setNotesOpen] = useState(false)

  useEffect(() => {
    setNotes(ensaio?.notasInternas || '')
  }, [ensaio?.id, ensaio?.notasInternas])

  const notesChanged = notes.trim() !== String(ensaio?.notasInternas || '').trim()
  const notesPreview = notes.trim() || 'Adicionar lembrete ou anotação sobre esse ensaio'

  const fotoCapa =
    fotos.find((foto) => foto.ehCapa)?.urlWatermark ||
    fotos.find((foto) => foto.ehCapa)?.urlOriginal ||
    ensaio?.capaUrl ||
    fotos[0]?.urlWatermark ||
    fotos[0]?.urlOriginal ||
    null

  const fotoCapaOriginal =
    fotos.find((foto) => foto.ehCapa)?.urlOriginal ||
    fotos[0]?.urlOriginal ||
    null

  return (
    <section className="overflow-hidden rounded-[14px] border border-[var(--border)] bg-white/78 shadow-[0_18px_42px_rgba(31,31,33,0.06)]">
      <div className="grid min-h-[300px] grid-cols-[280px_minmax(0,1fr)_320px] max-xl:grid-cols-[280px_minmax(0,1fr)] max-lg:grid-cols-1">
        <div className="relative h-full min-h-[300px] bg-[#F5F3F1] max-lg:min-h-[240px]">
          {fotoCapa ? (
            <img
              src={fotoCapa}
              alt={`Capa do ensaio de ${ensaio?.clienteNome || 'contato'}`}
              className="h-full w-full object-cover"
              onError={(event) => {
                if (fotoCapaOriginal && event.currentTarget.src !== fotoCapaOriginal) {
                  event.currentTarget.src = fotoCapaOriginal
                  return
                }

                event.currentTarget.style.display = 'none'
              }}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-[linear-gradient(135deg,#f7f1e9,#e8ded2)]">
              <div className="text-center">
                <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full border border-[var(--gold-border)] bg-white/70 text-[20px] text-[var(--gold)]">
                  F
                </div>
                <p className="text-[12px] uppercase tracking-[0.16em] text-[var(--text-muted)]">
                  Sem capa
                </p>
              </div>
            </div>
          )}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-black/5 max-lg:bg-gradient-to-t" />
        </div>

        <div className="flex min-w-0 items-center">
          <div className="min-w-0 w-full px-8 py-8 max-md:px-6 max-md:py-7">
            <div className="flex flex-wrap items-center gap-3">
              <span
                className={`inline-flex items-center rounded-full border px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] ${statusInfo.chipClass}`}
              >
                {statusInfo.label}
              </span>

              <span className="inline-flex items-center rounded-full border border-[var(--border)] bg-white/70 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
                {getTipoExibicao(ensaio)}
              </span>
            </div>

            <h1 className="mt-6 max-w-full break-words font-serif text-[48px] font-light leading-[1.05] tracking-normal text-[var(--text)] [overflow-wrap:anywhere] max-lg:text-[42px] max-md:text-[34px]">
              {ensaio?.clienteNome || 'Contato sem nome'}
            </h1>

            <div className="mt-6 flex flex-wrap items-center gap-x-7 gap-y-3 text-[14px] text-[var(--text)]">
              <span className="inline-flex items-center gap-2.5">
                <CalendarIcon />
                {formatarDataHora(ensaio?.dataEnsaio)}
              </span>

              <span className="inline-flex items-center gap-2.5">
                <LocationIcon />
                {ensaio?.local || 'Local não informado'}
              </span>
            </div>

            <div className="mt-7 flex flex-wrap gap-3">
  <button
    type="button"
    onClick={onPreContrato}
    className="inline-flex items-center gap-2 rounded-[9px] border border-[#C84F32] bg-[#C84F32] px-5 py-3 text-[13px] font-semibold text-white shadow-[0_12px_24px_rgba(200,79,50,0.18)] transition hover:bg-[#AE3F28]"
  >
    <FileIcon />
    Pré-contrato
  </button>

  <button
    type="button"
    onClick={onEdit}
    className="inline-flex items-center gap-2 rounded-[9px] border border-[var(--border)] bg-white/58 px-5 py-3 text-[13px] font-medium text-[var(--text)] transition hover:border-[var(--gold-border)] hover:bg-[var(--gold-dim)]"
  >
    <EditIcon />
    Editar
  </button>

  <button
    type="button"
    onClick={onWhatsApp}
    className="inline-flex items-center gap-2 rounded-[9px] border border-[var(--border)] bg-white/58 px-5 py-3 text-[13px] font-medium text-[var(--text)] transition hover:border-[var(--gold-border)] hover:bg-[var(--gold-dim)]"
  >
    <WhatsAppIcon />
    WhatsApp
  </button>

  <button
    type="button"
    onClick={onBack}
    className="inline-flex items-center gap-2 rounded-[9px] border border-[var(--border)] bg-white/40 px-5 py-3 text-[13px] font-medium text-[var(--text-muted)] transition hover:border-[var(--gold-border)] hover:bg-[var(--gold-dim)] hover:text-[var(--text)]"
  >
    <BackIcon />
    Voltar
  </button>
</div>

          </div>
        </div>

        <aside className="flex items-center px-8 py-8 max-xl:col-span-2 max-xl:border-t max-xl:border-[var(--border)] max-lg:col-span-1 max-md:px-6 max-md:py-6">
          <button
            type="button"
            onClick={() => setNotesOpen(true)}
            className="group w-full rounded-[14px] border border-[var(--gold-border)] bg-[linear-gradient(135deg,rgba(255,255,255,0.78),rgba(247,239,229,0.68))] p-5 text-left transition hover:bg-white"
          >
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="inline-flex items-center gap-2">
                <NotesIcon />
                <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--gold)]">
                  Bloco de notas
                </span>
              </div>

              <span className="text-[11px] text-[var(--text-muted)] transition group-hover:text-[var(--gold)]">
                Abrir
              </span>
            </div>

            <p className={`line-clamp-4 min-h-[78px] text-[13px] leading-5 ${
              notes.trim() ? 'text-[var(--text)]' : 'text-[var(--text-muted)]'
            }`}>
              {notesPreview}
            </p>
          </button>
        </aside>
      </div>

      {notesOpen ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/45 p-6 backdrop-blur-sm max-sm:p-4">
          <div className="w-full max-w-2xl rounded-[14px] border border-[var(--border)] bg-[#FFFFFF] shadow-2xl">
            <div className="flex items-center justify-between gap-4 border-b border-[var(--border)] px-6 py-5">
              <div className="inline-flex items-center gap-2">
                <NotesIcon />
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--gold)]">
                    Bloco de notas
                  </p>
                  <p className="mt-1 text-[12px] text-[var(--text-muted)]">
                    Anotações internas deste ensaio.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setNotesOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border)] text-xl text-[var(--text-muted)] transition hover:border-[var(--gold-border)] hover:text-[var(--gold)]"
              >
                ×
              </button>
            </div>

            <div className="p-6">
              <textarea
                value={notes}
                maxLength={1000}
                autoFocus
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Ex: ainda falta separar fotos, combinar pagamento, foi solicitada atenção em tal detalhe..."
                className="min-h-[220px] w-full resize-y rounded-xl border border-[var(--border)] bg-white/70 px-4 py-3 text-[14px] leading-6 text-[var(--text)] outline-none transition placeholder:text-[var(--text-muted)] focus:border-[var(--gold-border)]"
              />

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <span className="text-[11px] text-[var(--text-muted)]">
                  {notes.length} / 1000
                </span>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setNotesOpen(false)}
                    className="rounded-lg border border-[var(--border)] px-4 py-2 text-[12px] font-medium text-[var(--text-muted)] transition hover:border-[var(--gold-border)] hover:text-[var(--text)]"
                  >
                    Fechar
                  </button>

                  <button
                    type="button"
                    disabled={!notesChanged || savingNotes}
                    onClick={async () => {
                      try {
                        await onSaveNotes?.(notes)
                        setNotesOpen(false)
                      } catch {
                        // O toast de erro fica no componente pai.
                      }
                    }}
                    className="rounded-lg border border-[var(--gold-border)] bg-[var(--gold-dim)] px-4 py-2 text-[12px] font-medium text-[var(--gold)] transition hover:bg-[var(--card-hover)] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {savingNotes ? 'Salvando...' : 'Salvar notas'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  )
}
