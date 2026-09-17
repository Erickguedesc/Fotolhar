import { useState } from 'react'
import { CheckCircle2, Heart } from 'lucide-react'

import useBodyScrollLock from '../../../hooks/useBodyScrollLock'
import FotoPreviewImage from './FotoPreviewImage'
import SectionTitle from './SectionTitle'

const LIMITE_PREVIA = 6

const getNomeFoto = (foto) => {
  if (!foto) return 'foto-nao-encontrada.jpg'

  if (foto.nomeOriginal) {
    return foto.nomeOriginal
  }

  if (foto.cloudinaryId) {
    const partes = foto.cloudinaryId.split('/')
    return partes[partes.length - 1]
  }

  return `${foto.id}.jpg`
}

export default function SelecaoClienteCard({
  fotos = [],
  selecao,
  loading,
  onBuscarSelecao,
  onAprovarSelecao,
  aprovandoSelecao = false,
  podeAprovarSelecao = false,
  showResumo = true,
}) {
  const [jaConsultouSelecao, setJaConsultouSelecao] = useState(false)
  const [erroConsulta, setErroConsulta] = useState(null)
  const [modalAberto, setModalAberto] = useState(false)

  useBodyScrollLock(modalAberto)

  const fotosSelecionadas = selecao?.fotosIds
    ? fotos.filter((foto) => selecao.fotosIds.includes(foto.id))
    : []

  const fotosPrevias = fotosSelecionadas.slice(0, LIMITE_PREVIA)
  const temMaisFotos = fotosSelecionadas.length > LIMITE_PREVIA

  const getObservacao = (fotoId) =>
    selecao?.observacoesPorFoto?.[fotoId]?.trim() || ''

  const semSelecao =
    !selecao || !selecao.totalSelecionadas || selecao.totalSelecionadas === 0

  const handleBuscarSelecao = async () => {
    try {
      setErroConsulta(null)
      await onBuscarSelecao()
      setJaConsultouSelecao(true)
    } catch (error) {
      console.error('[Seleção] Erro ao consultar seleção:', error)
      setErroConsulta('Não foi possível consultar a seleção no momento.')
      setJaConsultouSelecao(true)
    }
  }

  const baixarLista = () => {
    const conteudo = fotosSelecionadas
      .map((foto) => `"${getNomeFoto(foto)}"`)
      .join(' OR ')

    const blob = new Blob([conteudo], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)

    const link = document.createElement('a')
    link.href = url
    link.download = 'Filtro-fotos-selecionadas.txt'
    link.click()

    URL.revokeObjectURL(url)
  }

  const renderFotoSelecionada = (foto) => {
    const observacao = getObservacao(foto.id)

    return (
      <article
        key={foto.id}
        className="overflow-hidden rounded-xl border border-[var(--border)] bg-white/55"
      >
        <div className="relative">
          <FotoPreviewImage
            foto={foto}
            alt={getNomeFoto(foto)}
            className="aspect-[4/3] w-full object-cover"
          />
        </div>

        <div className="p-3">
          <p className="truncate text-[12px] text-[var(--text)]">
            {getNomeFoto(foto)}
          </p>

          {observacao ? (
            <div className="mt-3 rounded-lg border border-[var(--gold-border)] bg-[var(--gold-dim)] p-3">
              <p className="mb-1 text-[10px] uppercase tracking-[0.14em] text-[var(--gold)]">
                Observação recebida
              </p>
              <p className="text-[12px] leading-5 text-[var(--text)]">
                {observacao}
              </p>
            </div>
          ) : null}
        </div>
      </article>
    )
  }

  return (
    <section className="rounded-[14px] border border-[var(--border)] bg-white/78 shadow-[0_14px_34px_rgba(31,31,33,0.055)]">
      <SectionTitle title="Fotos selecionadas" icon={Heart} />

      {semSelecao ? (
        <div className="flex min-h-[190px] flex-col items-center justify-center p-8 text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-[var(--gold-border)] bg-[var(--gold-dim)] text-[var(--gold)]">
            ⏱
          </div>

          {erroConsulta ? (
            <>
              <p className="text-[14px] text-red-700">
                {erroConsulta}
              </p>

              <p className="mt-1 text-[12px] text-[var(--text-muted)]">
                Tente consultar novamente em alguns instantes.
              </p>
            </>
          ) : jaConsultouSelecao ? (
            <>
              <p className="text-[14px] text-[var(--text)]">
                Seleção ainda não realizada.
              </p>

              <p className="mt-1 text-[12px] text-[var(--text-muted)]">
                Quando a seleção for finalizada, as fotos escolhidas aparecerão aqui.
              </p>
            </>
          ) : (
            <>
              <p className="text-[14px] text-[var(--text)]">
                Aguardando seleção.
              </p>

              <p className="mt-1 text-[12px] text-[var(--text-muted)]">
                Quando a escolha for finalizada, a seleção aparecerá aqui.
              </p>
            </>
          )}

          <button
            type="button"
            disabled={loading}
            onClick={handleBuscarSelecao}
            className="mt-5 rounded-lg border border-[var(--gold-border)] px-4 py-2 text-[12px] text-[var(--gold)] transition hover:bg-[var(--gold-dim)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? 'Consultando...' : 'Consultar seleção'}
          </button>
        </div>
      ) : (
        <div className="p-5">
          {showResumo ? (
            <>
              <div className="mb-5 grid grid-cols-4 gap-3 max-md:grid-cols-2">
                <Resumo label="Selecionadas" value={selecao.totalSelecionadas} />
                <Resumo label="Limite" value={selecao.limitePlano} />
                <Resumo
                  label="Excedente"
                  value={selecao.excedente}
                  danger={selecao.excedente > 0}
                />
                <Resumo
                  label="Valor extra"
                  value={Number(selecao.valorExcedente || 0).toLocaleString('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                  })}
                  danger={selecao.excedente > 0}
                />
              </div>

              {selecao.excedente > 0 && (
                <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-[13px] text-red-700">
                  A seleção ultrapassou o limite do pacote.
                </div>
              )}
            </>
          ) : (
            <div className="mb-5 rounded-xl border border-[var(--gold-border)] bg-[var(--gold-dim)] p-4 text-[13px] leading-5 text-[var(--gold)]">
              Seleção finalizada com {selecao.totalSelecionadas} foto{selecao.totalSelecionadas === 1 ? '' : 's'}.
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
            {fotosPrevias.map(renderFotoSelecionada)}
          </div>

          {temMaisFotos && (
            <div className="mt-5 flex items-center justify-between gap-3 rounded-xl border border-[var(--border)] bg-white/55 p-4 max-sm:flex-col max-sm:items-start">
              <p className="text-[13px] text-[var(--text-muted)]">
                Exibindo {LIMITE_PREVIA} de {fotosSelecionadas.length} fotos selecionadas.
              </p>

              <button
                type="button"
                onClick={() => setModalAberto(true)}
                className="rounded-lg border border-[var(--gold-border)] px-4 py-2 text-[12px] text-[var(--gold)] transition hover:bg-[var(--gold-dim)]"
              >
                Ver seleção completa
              </button>
            </div>
          )}

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={baixarLista}
              className="rounded-lg border border-[var(--gold-border)] px-4 py-2 text-[12px] text-[var(--gold)] transition hover:bg-[var(--gold-dim)]"
            >
              Baixar lista para filtro
            </button>

            {podeAprovarSelecao ? (
              <button
                type="button"
                disabled={aprovandoSelecao}
                onClick={onAprovarSelecao}
                className="inline-flex items-center gap-2 rounded-lg bg-[#C84F32] px-4 py-2 text-[12px] font-medium text-white transition hover:bg-[#AE3F28] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <CheckCircle2 size={15} strokeWidth={1.8} />
                {aprovandoSelecao
                  ? 'Aprovando...'
                  : 'Aprovar seleção e avançar para edição'}
              </button>
            ) : null}
          </div>

          {modalAberto && (
            <div className="fixed inset-0 z-[70] flex items-center justify-center overflow-hidden bg-black/80 p-8 backdrop-blur max-sm:p-4">
              <div className="flex max-h-[84vh] w-full max-w-5xl flex-col rounded-2xl border border-[var(--gold-border)] bg-[#121212] shadow-2xl">
                <div className="flex items-center justify-between gap-4 border-b border-white/[0.08] px-7 py-6 max-sm:px-5">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--gold)]">
                      Seleção de fotos
                    </p>
                    <h3 className="mt-1 font-serif text-2xl font-light text-white">
                      Todas as fotos selecionadas
                    </h3>
                  </div>

                  <button
                    type="button"
                    onClick={() => setModalAberto(false)}
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-xl text-white/55 transition hover:border-white/25 hover:text-white"
                  >
                    ×
                  </button>
                </div>

                <div className="min-h-0 flex-1 overscroll-contain overflow-y-auto px-7 py-6 max-sm:px-5">
                  <div className="grid grid-cols-2 gap-5 md:grid-cols-3">
                    {fotosSelecionadas.map(renderFotoSelecionada)}
                  </div>

                  <div className="mt-5 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={baixarLista}
                      className="rounded-lg border border-[var(--gold-border)] px-4 py-2 text-[12px] text-[var(--gold)] transition hover:bg-[var(--gold-dim)]"
                    >
                      Baixar lista para filtro
                    </button>

                    {podeAprovarSelecao ? (
                      <button
                        type="button"
                        disabled={aprovandoSelecao}
                        onClick={onAprovarSelecao}
                        className="inline-flex items-center gap-2 rounded-lg bg-[#C84F32] px-4 py-2 text-[12px] font-medium text-white transition hover:bg-[#AE3F28] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <CheckCircle2 size={15} strokeWidth={1.8} />
                        {aprovandoSelecao
                          ? 'Aprovando...'
                          : 'Aprovar seleção e avançar para edição'}
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  )
}

function Resumo({ label, value, danger }) {
  return (
    <div
      className={`rounded-xl border px-3 py-4 text-center ${
        danger
          ? 'border-red-200 bg-red-50'
          : 'border-[var(--border)] bg-white/55'
      }`}
    >
      <p className={danger ? 'text-[15px] text-red-700' : 'text-[15px] text-[var(--text)]'}>
        {value}
      </p>

      <p className="mt-1 text-[10px] uppercase tracking-[0.08em] text-[var(--text-muted)]">
        {label}
      </p>
    </div>
  )
}
