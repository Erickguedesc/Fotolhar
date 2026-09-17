import { ClipboardList, ExternalLink, MapPin } from 'lucide-react'

import {
  formatCurrency,
  formatDate,
  getTipoExibicao,
} from '../listaEnsaios/ensaioHelpers'

import SectionTitle from './SectionTitle'
import InfoItem from './InfoItem'
import {
  getGoogleMapsEmbedUrl,
  getGoogleMapsUrl,
  montarConsultaMapa,
} from '../../../utils/localizacaoEnsaio'

const STATUS_VALORES_LABEL = {
  NAO_INFORMADO: 'Não informado',
  PENDENTE: 'Pendente',
  PAGO: 'Pago',
}

const getSafeValue = (value, fallback = '—') => {
  if (value === null || value === undefined || value === '') return fallback
  return value
}

const formatTime = (value) => {
  if (!value) return '—'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'

  return date.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function InformacoesCard({ ensaio, selecao, onEdit }) {
  const fotosIncluidas =
    ensaio?.fotosIncluidas ??
    ensaio?.quantidadeFotos ??
    ensaio?.qtdFotos ??
    ensaio?.qtdFotosPacote ??
    0

  const valorFotoExtra =
    ensaio?.valorFotoExtra ??
    ensaio?.valorPorFotoExtra ??
    0

  const valorPacote = Number(ensaio?.valorPacote || 0)
  const valorExtras = Number(selecao?.valorExcedente || 0)
  const fotosExtras = Number(selecao?.excedente || 0)
  const valorPrevisto = valorPacote + valorExtras
  const valorFinalInformado =
    ensaio?.valorFinalEnsaio !== null &&
    ensaio?.valorFinalEnsaio !== undefined &&
    ensaio?.valorFinalEnsaio !== ''
  const valorConsiderado = valorFinalInformado
    ? Number(ensaio.valorFinalEnsaio)
    : valorPrevisto
  const statusValores =
    STATUS_VALORES_LABEL[ensaio?.statusValores] ||
    STATUS_VALORES_LABEL.NAO_INFORMADO
  const cidadeUf = [ensaio?.cidadeEnsaio, ensaio?.estadoEnsaio].filter(Boolean).join(', ')

  return (
    <section className="rounded-[14px] border border-[var(--border)] bg-white/78 shadow-[0_14px_34px_rgba(31,31,33,0.055)]">
      <SectionTitle
        title="Dados do ensaio"
        icon={ClipboardList}
        actionLabel="Editar"
        onAction={onEdit}
        compact
      />

      <div className="grid grid-cols-[minmax(0,1fr)_minmax(300px,430px)] items-start gap-5 p-5 max-xl:grid-cols-1 max-md:p-4">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-x-6 gap-y-4 max-md:grid-cols-1">
            <InfoItem label="Local" value={getSafeValue(ensaio.local)} compact />
            <InfoItem label="Tipo" value={getTipoExibicao(ensaio)} compact />

            <InfoItem label="Cidade do ensaio" value={getSafeValue(cidadeUf)} compact />
            <InfoItem label="Referência" value={getSafeValue(ensaio.referenciaLocal)} compact />

            <InfoItem label="Data" value={formatDate(ensaio.dataEnsaio)} compact />
            <InfoItem label="Horário" value={formatTime(ensaio.dataEnsaio)} compact />

            <InfoItem label="Contato" value={getSafeValue(ensaio.clienteNome)} compact />

            <InfoItem
              label="Fotos incluídas"
              value={`${fotosIncluidas} fotos`}
              compact
            />

            <InfoItem
              label="Valor por foto extra"
              value={formatCurrency(valorFotoExtra)}
              compact
            />

            <InfoItem
              label="Valor do pacote"
              value={formatCurrency(ensaio.valorPacote)}
              highlight
              compact
            />
          </div>

          <div className="border-t border-[var(--border)] pt-3">
            <p className="mb-1.5 text-[10.5px] text-[var(--text-muted)]">
              Observações
            </p>

            <p className="text-[13px] leading-5 text-[var(--text)]">
              {getSafeValue(
                ensaio.observacoes,
                'Nenhuma observação cadastrada.'
              )}
            </p>
          </div>
        </div>

        <div>
          <LocationPreview ensaio={ensaio} />
        </div>

        <div className="col-span-2 max-xl:col-span-1">
          <ValoresResumoCard
            fotosExtras={fotosExtras}
            statusValores={statusValores}
            valorConsiderado={valorConsiderado}
            valorExtras={valorExtras}
            valorFinalInformado={valorFinalInformado}
            valorPacote={valorPacote}
            valorPrevisto={valorPrevisto}
            observacaoValores={ensaio?.observacaoValores}
          />
        </div>
      </div>
    </section>
  )
}

function ValoresResumoCard({
  fotosExtras,
  observacaoValores,
  statusValores,
  valorConsiderado,
  valorExtras,
  valorFinalInformado,
  valorPacote,
  valorPrevisto,
}) {
  return (
    <div className="rounded-[12px] border border-[var(--border)] bg-[linear-gradient(135deg,rgba(255,255,255,0.84),rgba(247,239,229,0.54))] p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--gold)]">
            Resumo de valores
          </p>
          <p className="mt-1 text-[12px] text-[var(--text-muted)]">
            Controle interno, sem cobrança online.
          </p>
        </div>

        <span className="rounded-full border border-[var(--border)] bg-white/78 px-3 py-1.5 text-[11px] text-[var(--text-muted)]">
          {statusValores}
        </span>
      </div>

      <div className="grid grid-cols-4 gap-3 max-lg:grid-cols-2 max-sm:grid-cols-1">
        <ValorItem label="Pacote" value={formatCurrency(valorPacote)} />
        <ValorItem label="Fotos extras" value={formatCurrency(valorExtras)} meta={`${fotosExtras} fotos`} />
        <ValorItem label="Total previsto" value={formatCurrency(valorPrevisto)} highlight />
        <ValorItem label="Valor final" value={formatCurrency(valorConsiderado)} highlight={valorFinalInformado} />
      </div>

      <p className="mt-4 max-w-[760px] text-[12px] leading-5 text-[var(--text-muted)]">
        Valor final pode ser informado manualmente via botão editar caso o valor final tenha sido outro após acordos fora da plataforma. O total previsto permanece como referencia automatica.
      </p>

      {observacaoValores ? (
        <div className="mt-3 rounded-lg border border-[var(--border)] bg-white/58 p-3">
          <p className="mb-1 text-[11px] text-[var(--text-muted)]">
            Observação de valores  
          </p>
          <p className="text-[13px] leading-5 text-[var(--text)]">
            {observacaoValores}
          </p>
        </div>
      ) : null}
    </div>
  )
}

function ValorItem({ label, value, meta, highlight }) {
  return (
    <div className="min-w-0 rounded-[9px] border border-[var(--border)] bg-white/68 px-4 py-3">
      <p className={`truncate text-[15px] ${highlight ? 'text-[var(--gold)]' : 'text-[var(--text)]'}`}>
        {value}
      </p>
      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
        <p className="text-[10px] uppercase tracking-normal text-[var(--text-muted)]">
          {label}
        </p>
        {meta ? (
          <span className="text-[11px] text-[var(--text-muted)]">
            {meta}
          </span>
        ) : null}
      </div>
    </div>
  )
}

function LocationPreview({ ensaio }) {
  const local = ensaio?.local?.trim()
  const cidadeUf = [ensaio?.cidadeEnsaio, ensaio?.estadoEnsaio].filter(Boolean).join(', ')
  const query = montarConsultaMapa({
    cidade: ensaio?.cidadeEnsaio,
    estado: ensaio?.estadoEnsaio,
  }).trim()
  const label = cidadeUf || ensaio?.cidadeEnsaio?.trim()

  if (!query) {
    return (
      <div className="flex min-h-[152px] flex-col items-center justify-center rounded-[12px] border border-dashed border-[var(--border)] bg-white/60 p-4 text-center">
        <span className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-[var(--gold-dim)] text-[var(--gold)]">
          <MapPin size={18} />
        </span>
        <p className="mt-3 text-[13px] font-medium text-[var(--text)]">
          Cidade do ensaio não informada
        </p>
        {local ? (
          <p className="mt-1 max-w-[260px] text-[12px] leading-5 text-[var(--text-muted)]">
            Local: {local}
          </p>
        ) : null}
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-[12px] border border-[var(--border)] bg-white">
      <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] px-3.5 py-2.5">
        <span className="flex min-w-0 items-center gap-2 text-[12px] font-medium text-[var(--text)]">
          <MapPin size={15} className="shrink-0 text-[var(--gold)]" />
          <span className="truncate">{label}</span>
        </span>

        <a
          href={getGoogleMapsUrl(query)}
          target="_blank"
          rel="noreferrer"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] border border-[var(--border)] text-[var(--text-muted)] transition hover:border-[var(--gold-border)] hover:text-[var(--gold)]"
          title="Abrir no mapa"
          aria-label="Abrir no mapa"
        >
          <ExternalLink size={14} />
        </a>
      </div>

      <iframe
        title={`Mapa de ${label}`}
        src={getGoogleMapsEmbedUrl(query)}
        className="block h-[218px] w-full border-0 max-md:h-[190px]"
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
      />
    </div>
  )
}
