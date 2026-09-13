import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, CalendarDays, Grid2X2, ImageOff, List, MapPin } from 'lucide-react'

import EnsaioDashboardCard from './EnsaioDashboardCard'
import {
    formatarDataCurta,
    formatarStatusEnsaio,
} from '../../utils/dashboardFormatters'

const CARD_MAX_HEIGHT = 620
const LIST_MAX_HEIGHT = 484

const STATUS_COLORS = {
    AGENDADO: 'border-[#d6a027]/35 bg-[#d6a027]/10 text-[#b7831f]',
    REALIZADO: 'border-[#36a35c]/30 bg-[#36a35c]/10 text-[#2d8d4d]',
    EM_SELECAO: 'border-[#d6a027]/35 bg-[#d6a027]/10 text-[#b7831f]',
    EM_EDICAO: 'border-[#6bb9f0]/35 bg-[#6bb9f0]/12 text-[#3b8cc5]',
    FINALIZADO: 'border-[#36a35c]/30 bg-[#36a35c]/10 text-[#2d8d4d]',
    CANCELADO: 'border-[#d95d54]/30 bg-[#d95d54]/10 text-[#c3433b]',
}

const STATUS_DESCRIPTIONS = {
    AGENDADO: 'Preparando o ensaio',
    REALIZADO: 'Ensaio realizado',
    EM_SELECAO: 'Selecao enviada para o cliente',
    EM_EDICAO: 'Edicao em andamento',
    FINALIZADO: 'Entrega finalizada',
    CANCELADO: 'Ensaio cancelado',
}

export default function EnsaiosEmAndamento({
    ensaios,
}) {
    const [viewMode, setViewMode] = useState('cards')

    if (!ensaios?.length) {
        return (
            <section className="space-y-5">
                <SectionHeader viewMode={viewMode} onViewModeChange={setViewMode} />

                <div className="theme-card rounded-3xl border border-dashed py-14 text-center">
                    <h3 className="theme-title text-lg font-medium">
                        Nenhum ensaio em andamento
                    </h3>

                    <p className="theme-muted mt-2 text-sm">
                        Os ensaios ativos aparecerao aqui.
                    </p>
                </div>
            </section>
        )
    }

    return (
        <section className="space-y-5">
            <SectionHeader viewMode={viewMode} onViewModeChange={setViewMode} />

            {viewMode === 'cards' ? (
                <div
                    className="theme-scrollbar overflow-y-auto pr-1"
                    style={{ maxHeight: `${CARD_MAX_HEIGHT}px` }}
                >
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
                        {ensaios.map((ensaio) => (
                            <EnsaioDashboardCard
                                key={ensaio.id}
                                ensaio={ensaio}
                            />
                        ))}
                    </div>
                </div>
            ) : (
                <div className="space-y-4">
                    <div
                        className="theme-scrollbar space-y-3 overflow-y-auto pr-1"
                        style={{ maxHeight: `${LIST_MAX_HEIGHT}px` }}
                    >
                        {ensaios.map((ensaio) => (
                            <EnsaioRow key={ensaio.id} ensaio={ensaio} />
                        ))}
                    </div>

                    <div className="text-center">
                        <Link
                            to="/ensaios?grupo=andamento"
                            className="theme-muted inline-flex items-center gap-2 text-sm transition hover:text-[var(--gold)]"
                        >
                            Ver todos os ensaios em andamento
                            <ArrowRight size={15} />
                        </Link>
                    </div>
                </div>
            )}
        </section>
    )
}

function SectionHeader({ viewMode, onViewModeChange }) {
    return (
        <div className="theme-divider flex items-center justify-between gap-4 border-b pb-4">
            <h2 className="theme-muted text-xs uppercase tracking-[0.25em]">
                Ensaios em andamento
            </h2>

            <div className="flex items-center gap-2">
                <button
                    type="button"
                    title="Ver em cards"
                    aria-label="Ver ensaios em andamento em cards"
                    onClick={() => onViewModeChange('cards')}
                    className={`theme-icon-button flex h-9 w-9 items-center justify-center rounded-full border transition ${
                        viewMode === 'cards' ? 'border-[var(--gold-border)] text-[var(--gold)]' : ''
                    }`}
                >
                    <Grid2X2 size={16} />
                </button>

                <button
                    type="button"
                    title="Ver em lista"
                    aria-label="Ver ensaios em andamento em lista"
                    onClick={() => onViewModeChange('list')}
                    className={`theme-icon-button flex h-9 w-9 items-center justify-center rounded-full border transition ${
                        viewMode === 'list' ? 'border-[var(--gold-border)] text-[var(--gold)]' : ''
                    }`}
                >
                    <List size={17} />
                </button>
            </div>
        </div>
    )
}

function EnsaioRow({ ensaio }) {
    const [imageError, setImageError] = useState(false)
    const hasImage = ensaio.capaUrl && !imageError
    const isCapaPadrao = Number(ensaio.totalFotos || 0) === 0
    const progress = ensaio.progresso || 0
    const statusClass = STATUS_COLORS[ensaio.status] || 'border-[var(--border)] bg-[var(--card-hover)] text-[var(--muted)]'
    const progressDescription = isCapaPadrao
        ? 'Aguardando envio das fotos'
        : STATUS_DESCRIPTIONS[ensaio.status] || 'Acompanhamento em andamento'

    return (
        <Link
            to={`/ensaios/${ensaio.id}`}
            className="theme-card group grid min-h-[118px] overflow-hidden rounded-[14px] border p-3 transition hover:-translate-y-0.5 hover:border-[var(--gold-border)] hover:shadow-[0_18px_36px_rgba(0,0,0,0.08)] md:grid-cols-[104px_minmax(0,1fr)_150px]"
        >
            <div className="theme-panel h-24 w-24 overflow-hidden rounded-[14px] border border-[var(--gold-border)]/60">
                {hasImage ? (
                    <img
                        src={ensaio.capaUrl}
                        alt={ensaio.clienteNome}
                        onError={() => setImageError(true)}
                        className={`h-full w-full transition duration-500 group-hover:scale-[1.02] ${
                            isCapaPadrao
                                ? 'object-contain bg-[#0b0b0b] p-3'
                                : 'object-cover'
                        }`}
                    />
                ) : (
                    <div className="flex h-full w-full flex-col items-center justify-center bg-[#111111] px-4 text-center">
                        <span className="mb-2 flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white/42">
                            <ImageOff size={18} strokeWidth={1.8} />
                        </span>

                        <p className="text-[11px] tracking-wide text-white/45">
                            Sem fotos publicadas
                        </p>
                    </div>
                )}
            </div>

            <div className="min-w-0 self-center px-4 py-1">
                <h3 className="theme-title truncate font-serif text-xl font-light leading-tight">
                    {ensaio.clienteNome}
                </h3>

                <p className="theme-muted mt-1 truncate text-sm">
                    {ensaio.tipoExibicao || ensaio.tipo || 'Nao informado'}
                </p>

                <div className="theme-muted mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-medium">
                    <span className="inline-flex items-center gap-2">
                        <CalendarDays size={14} className="text-[var(--gold)]" />
                        {formatarDataCurta(ensaio.dataEnsaio)}
                    </span>

                    <span className="inline-flex min-w-0 items-center gap-2">
                        <MapPin size={14} className="shrink-0 text-[var(--gold)]" />
                        <span className="truncate">{ensaio.local || 'Nao informado'}</span>
                    </span>
                </div>
            </div>

            <div className="flex flex-col justify-center px-2 pb-1 md:items-end md:py-1">
                <span className={`inline-flex w-fit rounded-full border px-3 py-1 text-[10px] font-bold uppercase ${statusClass}`}>
                    {formatarStatusEnsaio(ensaio.status)}
                </span>

                <div className="mt-3 w-full max-w-[132px]">
                    <div className="mb-1.5 flex items-end justify-between gap-3">
                        <span className="theme-muted text-[10px] font-semibold uppercase tracking-[0.16em]">
                            Progresso
                        </span>

                        <span className="font-serif text-xl font-light text-[var(--gold)]">
                            {progress}%
                        </span>
                    </div>

                    <div className="theme-soft h-1.5 overflow-hidden rounded-full">
                        <div
                            className="h-full rounded-full bg-[var(--gold)]"
                            style={{ width: `${progress}%` }}
                        />
                    </div>

                    <p className="theme-muted mt-2 truncate text-[11px]">
                        {progressDescription}
                    </p>
                </div>
            </div>
        </Link>
    )
}
