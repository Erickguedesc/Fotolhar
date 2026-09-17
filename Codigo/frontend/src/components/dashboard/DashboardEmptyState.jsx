import { Link } from 'react-router-dom'
import { Camera, Settings } from 'lucide-react'

import Header from '../layout/Header'

export default function DashboardEmptyState() {
    return (
        <>
            <Header />

            <main className="theme-page flex min-h-screen items-center justify-center px-4 pt-20">
                <section className="theme-card w-full max-w-3xl rounded-3xl border p-8 text-center shadow-2xl md:p-12">
                    <p className="theme-muted text-xs uppercase tracking-[0.28em]">
                        Primeiros passos
                    </p>

                    <h1 className="theme-title mt-4 font-serif text-5xl font-light md:text-6xl">
                        Comece seu primeiro fluxo
                    </h1>

                    <p className="theme-muted mx-auto mt-5 max-w-xl text-sm leading-7">
                        Agende um ensaio para cadastrar o contato e acompanhar agenda,
                        fotos, seleção, entregas e muito mais aqui na sua Dashboard.
                    </p>

                    <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                        <Link
                            to="/novo-ensaio"
                            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#C84F32] px-5 py-3 text-sm font-medium text-[#FFFFFF] shadow-[0_14px_30px_rgba(200,79,50,0.18)] transition hover:bg-[#AE3F28]"
                        >
                            <Camera size={17} />
                            Novo ensaio
                        </Link>

                        <Link
                            to="/configuracoes"
                            className="theme-card inline-flex items-center justify-center gap-2 rounded-2xl border px-5 py-3 text-sm font-semibold transition hover:border-[var(--gold-border)]"
                        >
                            <Settings size={17} />
                            Configurar estúdio
                        </Link>
                    </div>
                </section>
            </main>
        </>
    )
}
