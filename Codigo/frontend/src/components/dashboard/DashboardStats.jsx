import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
    Activity,
    ArrowUpRight,
    CalendarDays,
    CheckCircle2,
    Circle,
    Eye,
    EyeOff,
    PackageCheck,
} from 'lucide-react'

import { formatarMoeda } from '../../utils/dashboardFormatters'

function getMesAtualParams() {
    const hoje = new Date()
    const ano = hoje.getFullYear()
    const mes = hoje.getMonth()
    const inicio = new Date(ano, mes, 1)
    const fim = new Date(ano, mes + 1, 0)

    const format = (date) => {
        const year = date.getFullYear()
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const day = String(date.getDate()).padStart(2, '0')

        return `${year}-${month}-${day}`
    }

    return `dataInicio=${format(inicio)}&dataFim=${format(fim)}`
}

export default function DashboardStats({ dashboard }) {
    const [showValue, setShowValue] = useState(true)
    const receitaEstimada = Number(dashboard?.receitaEstimada || 0)
    const mesAtualParams = getMesAtualParams()
    const ensaiosEsteMes = Number(dashboard?.ensaiosEsteMes || 0)
    const totalEnsaios = Number(dashboard?.totalEnsaios || 0)
    const andamentoTotal = Number(dashboard?.ensaiosEmAndamentoTotal || 0)
    const selecoesEnviadas = Number(dashboard?.selecoesEnviadas || 0)
    const entregasMes = Number(dashboard?.ensaiosFinalizadosMes || 0)
    const percentEnsaiosMes = totalEnsaios > 0 ? Math.round((ensaiosEsteMes / totalEnsaios) * 100) : 0

    const stats = [
        {
            titulo: 'Ensaios no mês',
            valor: ensaiosEsteMes,
            descricao: 'agendados e realizados',
            footerType: 'progress',
            footerLabel: totalEnsaios > 0 ? `${percentEnsaiosMes}% dos ensaios cadastrados` : 'Sem ensaios cadastrados',
            footerMeta: `${totalEnsaios} no total`,
            progress: percentEnsaiosMes,
            barColor: '#C84F32',
            icon: CalendarDays,
            to: `/ensaios?${mesAtualParams}&grupo=todos`,
        },
        {
            titulo: 'Em andamento',
            valor: andamentoTotal,
            descricao: 'realizados, seleção e edição',
            footerType: andamentoTotal > 0 ? 'action' : 'neutral',
            footerLabel: andamentoTotal > 0 ? `${andamentoTotal} em fluxo ativo` : 'Nenhum ensaio ativo',
            footerMeta: andamentoTotal > 0 ? 'Acompanhar' : '',
            barColor: '#C84F32',
            icon: Activity,
            to: '/ensaios?grupo=andamento',
        },
        {
            titulo: 'Seleções recebidas',
            valor: selecoesEnviadas,
            descricao: 'aguardando revisão',
            footerType: selecoesEnviadas > 0 ? 'action' : 'neutral',
            footerLabel: selecoesEnviadas > 0 ? `${selecoesEnviadas} aguardando revisão` : 'Sem alterações',
            footerMeta: selecoesEnviadas > 0 ? 'Revisar' : '',
            barColor: '#C84F32',
            icon: CheckCircle2,
            to: '/ensaios?status=EM_SELECAO',
        },
        {
            titulo: 'Entregas do mês',
            valor: entregasMes,
            descricao: 'finalizados no mês',
            footerType: entregasMes > 0 ? 'action' : 'neutral',
            footerLabel: entregasMes > 0 ? `${entregasMes} entrega concluida` : 'Nenhuma entrega no mês',
            footerMeta: entregasMes > 0 ? 'Ver finalizados' : '',
            barColor: '#C84F32',
            icon: PackageCheck,
            to: `/ensaios?${mesAtualParams}&status=FINALIZADO`,
        },
    ]

    return (
        <section className="theme-card rounded-[18px] border p-4">
            <div className="grid gap-3 xl:grid-cols-[repeat(4,minmax(0,1fr))_minmax(280px,1.45fr)]">
                {stats.map((stat) => (
                    <MiniStatCard key={stat.titulo} {...stat} />
                ))}

                <article className="relative isolate overflow-hidden rounded-[14px] border border-[var(--border)] p-5 xl:min-h-[152px]">
                    <div className="pointer-events-none absolute inset-y-0 right-0 -z-10 hidden w-[46%] bg-[linear-gradient(90deg,transparent,rgba(201,164,89,0.10))] lg:block" />

                    <div className="flex items-center justify-between gap-3">
                        <p className="theme-muted text-xs font-semibold uppercase tracking-[0.18em]">
                            Valor previsto
                        </p>

                        <button
                            type="button"
                            onClick={() => setShowValue((current) => !current)}
                            title={showValue ? 'Ocultar valor previsto' : 'Mostrar valor previsto'}
                            aria-label={showValue ? 'Ocultar valor previsto' : 'Mostrar valor previsto'}
                            className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--gold-border)] bg-[var(--gold-dim)] text-[var(--gold)] transition hover:bg-[var(--gold-dim)]/80"
                        >
                            {showValue ? <Eye size={15} /> : <EyeOff size={15} />}
                        </button>
                    </div>

                    <h2 className="theme-title mt-7 text-5xl font-normal leading-none">
                        {showValue
                            ? receitaEstimada > 0 ? formatarMoeda(receitaEstimada) : 'Sem previsao'
                            : 'R$ -----'}
                    </h2>

                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                        <p className="theme-muted text-sm">
                            {receitaEstimada > 0 ? 'pacotes e fotos extras do mês' : 'sem valores previstos no mês'}
                        </p>

                        <Link
                            to="/relatorios"
                            className="rounded-full bg-white/80 px-4 py-2 text-xs font-semibold text-[#AE3F28] transition hover:bg-white"
                        >
                            Ver detalhes
                        </Link>
                    </div>
                </article>
            </div>
        </section>
    )
}

function MiniStatCard({
    titulo,
    valor,
    descricao,
    footerType = 'neutral',
    footerLabel,
    footerMeta,
    progress = 0,
    barColor = 'var(--gold)',
    icon: Icon,
    to,
}) {
    return (
        <Link
            to={to}
            className="block rounded-[14px] border border-[var(--border)] p-4 transition hover:-translate-y-0.5 hover:border-[var(--gold-border)] hover:bg-[var(--card-hover)]"
        >
            <div className="mb-6 flex items-start justify-between gap-3">
                <p className="theme-muted max-w-[110px] text-[10px] font-semibold uppercase leading-4 tracking-[0.18em]">
                    {titulo}
                </p>

                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[var(--gold-border)] bg-[var(--gold-dim)] text-[var(--gold)]">
                    <Icon size={15} />
                </span>
            </div>

            <h2 className="theme-title font-serif text-4xl font-light leading-none">
                {valor}
            </h2>

            <p className="theme-muted mt-3 text-xs">
                {descricao}
            </p>

            <div className="theme-divider mt-5 border-t pt-4">
                {footerType === 'progress' ? (
                    <div>
                        <div className="h-2 overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--text-muted)_16%,transparent)]">
                            <span
                                className="block h-full rounded-full"
                                style={{
                                    width: `${Math.min(Math.max(progress, 0), 100)}%`,
                                    backgroundColor: barColor,
                                }}
                            />
                        </div>

                        <div className="mt-3 flex items-center justify-between gap-3 text-xs">
                            <span className="theme-muted">{footerLabel}</span>
                            <span className="theme-muted">{footerMeta}</span>
                        </div>
                    </div>
                ) : (
                    <div className="flex items-center justify-between gap-3 text-xs">
                        <span className="theme-muted inline-flex min-w-0 items-center gap-2">
                            {footerType === 'action' ? (
                                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-400/12 text-emerald-300">
                                    <ArrowUpRight size={13} />
                                </span>
                            ) : (
                                <Circle size={10} className="shrink-0 text-[var(--text-muted)] opacity-45" />
                            )}
                            <span className="truncate">{footerLabel}</span>
                        </span>

                        {footerMeta ? (
                            <span className="shrink-0 text-[var(--text-muted)]">
                                {footerMeta}
                            </span>
                        ) : null}
                    </div>
                )}
            </div>
        </Link>
    )
}
