import { useState } from 'react'
import { CalendarDays, Check, Copy, Eye, ImageIcon, KeyRound, Link2, LockKeyhole, RefreshCw, Send } from 'lucide-react'

const formatarDataHora = (valor) => {
  if (!valor) return null

  const data = new Date(valor)

  if (Number.isNaN(data.getTime())) return null

  return data.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const albumEstaExpirado = (valor) => {
  if (!valor) return false

  const data = new Date(valor)

  if (Number.isNaN(data.getTime())) return false

  return data < new Date()
}

export default function PublicacaoCard({
  album,
  totalFotos = 0,
  loading,
  albumPublicado,
  onPublicar,
  onReabrir,
}) {
  const temAlbum = Boolean(album?.urlAcesso)
  const [linkCopiado, setLinkCopiado] = useState(false)

  const expiraEm =
    album?.expiraEm ||
    album?.dataExpiracao ||
    album?.expira_em ||
    null

  const expiraEmFormatado = formatarDataHora(expiraEm)
  const expirado = albumEstaExpirado(expiraEm)

  const buttonLabel = loading
    ? 'Processando...'
    : albumPublicado
      ? 'Nova senha'
      : temAlbum
        ? 'Publicar novamente'
        : 'Publicar álbum'
  const PrimaryButtonIcon = albumPublicado ? KeyRound : Send

  const copiarLink = async () => {
    if (!album?.urlAcesso) return

    try {
      await navigator.clipboard.writeText(album.urlAcesso)
      setLinkCopiado(true)
      window.setTimeout(() => setLinkCopiado(false), 1800)
    } catch {
      setLinkCopiado(false)
    }
  }

  return (
    <section className="overflow-hidden rounded-[16px] border border-[var(--border)] bg-[#fffefd] p-4 shadow-[0_14px_34px_rgba(31,31,33,0.055)]">
      <div className="mb-4 flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-[#FCEFEA] text-[#C84F32]">
          <Send size={20} strokeWidth={1.8} />
        </span>

        <div>
          <h2 className="text-[18px] font-semibold leading-6 text-[var(--text)]">Publicação</h2>
          <p className="mt-1 text-[12px] leading-5 text-[var(--text-muted)]">
            Compartilhe seu álbum com praticidade.
          </p>
        </div>
      </div>

      <div>
        <button
          type="button"
          disabled={loading}
          onClick={onPublicar}
          className="inline-flex w-full items-center justify-center gap-2.5 rounded-[10px] bg-gradient-to-r from-[#C84F32] to-[#B9412B] px-4 py-3 text-[14px] font-semibold !text-white shadow-[0_10px_20px_rgba(200,79,50,0.18)] transition hover:from-[#B9432C] hover:to-[#A63A27] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <PrimaryButtonIcon className="!text-white" size={18} strokeWidth={2} />
          <span className="!text-white">{buttonLabel}</span>
        </button>

        {albumPublicado && (
          <button
            type="button"
            disabled={loading}
            onClick={onReabrir}
            className="mt-3 inline-flex w-full items-center justify-center gap-2.5 rounded-[10px] border border-[#F2D9D0] bg-[#FFFDFC] px-4 py-3 text-[14px] font-semibold text-[#C84F32] shadow-[0_6px_16px_rgba(200,79,50,0.04)] transition hover:bg-[#FFF7F3] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw size={19} strokeWidth={2} />
            Reabrir para edição
          </button>
        )}

        {temAlbum && (
          <div className="mt-4 rounded-[14px] border border-[var(--border)] bg-white p-3.5">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#FCEFEA] text-[#C84F32]">
                <Link2 size={18} strokeWidth={1.9} />
              </span>
              <div>
                <p className="text-[14px] font-semibold text-[var(--text)]">Link gerado</p>
                <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">Use para compartilhar seu álbum.</p>
              </div>
            </div>

            <div className="mt-3 flex items-center gap-2 rounded-[10px] border border-[var(--border)] bg-[#FFFEFD] px-3 py-2">
              <p className="min-w-0 flex-1 break-all text-[12px] leading-5 text-[var(--text)]">
                {album.urlAcesso}
              </p>
              <button
                type="button"
                onClick={copiarLink}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] bg-[#FCEFEA] text-[#C84F32] transition hover:bg-[#F6E0D8] focus:outline-none focus:ring-2 focus:ring-[#E5B8A9]"
                aria-label={linkCopiado ? 'Link copiado' : 'Copiar link do álbum'}
                title={linkCopiado ? 'Link copiado' : 'Copiar link'}
              >
                {linkCopiado ? <Check size={17} strokeWidth={2} /> : <Copy size={17} strokeWidth={1.9} />}
              </button>
            </div>

            {(expiraEmFormatado || album?.senhaAcesso) && (
              <div className="mt-3 space-y-2">
                {album?.senhaAcesso && (
                  <div className="flex items-center gap-3 rounded-[10px] border border-[#F0D8CE] bg-[#FFF7F3] px-3.5 py-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#FCE8E0] text-[#C84F32]">
                      <LockKeyhole size={18} strokeWidth={1.9} />
                    </span>
                    <div className="min-w-0">
                      <p className="text-[10px] font-medium text-[var(--text-muted)]">Senha de acesso</p>
                      <p className="mt-0.5 font-mono text-[18px] font-semibold leading-5 tracking-[0.16em] text-[#C84F32]">
                        {album.senhaAcesso}
                      </p>
                    </div>
                  </div>
                )}

                {expiraEmFormatado && (
                  <div className={`flex items-center justify-between gap-3 rounded-[10px] border px-3.5 py-2.5 ${
                    expirado ? 'border-red-400/25 bg-red-400/10' : 'border-[var(--border)] bg-[#FFFEFD]'
                  }`}>
                    <span className="flex items-center gap-2 text-[11px] text-[var(--text-muted)]">
                      <CalendarDays className={expirado ? 'text-red-700' : 'text-[#C84F32]'} size={17} strokeWidth={1.9} />
                      {expirado ? 'Expirado em' : 'Link válido até'}
                    </span>
                    <span className={`whitespace-nowrap text-[12px] font-semibold ${expirado ? 'text-red-700' : 'text-[#C84F32]'}`}>
                      {expiraEmFormatado}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {!albumPublicado && temAlbum && (
          <div className="mt-4 rounded-xl border border-orange-200 bg-orange-50 p-4 text-[12px] font-medium leading-5 text-orange-700">
            Álbum reaberto para edição. O acesso ao álbum está pausado até a próxima publicação.
          </div>
        )}

        <div className="mt-4 grid grid-cols-2 gap-3">
          <Stat icon={ImageIcon} label="Fotos" value={totalFotos} />
          <Stat icon={Eye} label="Views" value={album?.views ?? 0} />
        </div>
      </div>
    </section>
  )
}

function Stat({ icon: Icon, label, value }) {
  return (
    <div className="flex min-h-[88px] items-center gap-3 rounded-[14px] border border-[#F0DED5] bg-[#FFF9F6] p-3.5">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#FCEFEA] text-[#C84F32]">
        <Icon size={20} strokeWidth={1.8} />
      </span>
      <div>
        <p className="text-[24px] font-semibold leading-6 text-[var(--text)]">{value}</p>
        <p className="mt-1 text-[12px] font-medium text-[var(--text-muted)]">{label}</p>
      </div>
    </div>
  )
}
