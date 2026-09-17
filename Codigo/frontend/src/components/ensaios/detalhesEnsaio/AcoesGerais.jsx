import { ChevronRight, FileText, Link2, MessageCircle, Send, Trash2, Workflow } from 'lucide-react'

export default function AcoesGerais({
  variant = 'completo',
  onWhatsApp,
  onCopyLink,
  onExportPdf,
  onDelete,
}) {
  const mostrarEntrega = variant === 'completo' || variant === 'entrega'
  const mostrarAdministrativo = variant === 'completo' || variant === 'administrativo'
  const isEntrega = variant === 'entrega'
  const title = variant === 'entrega'
    ? 'Ações de entrega'
    : variant === 'administrativo'
      ? 'Ações administrativas'
      : 'Ações gerais'
  const HeaderIcon = variant === 'entrega' ? Send : Workflow

  return (
    <section className="rounded-[14px] border border-[var(--border)] bg-white/78 px-4 py-4 shadow-[0_14px_34px_rgba(31,31,33,0.055)]">
      <div className="mb-4 flex items-center gap-3">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--gold-dim)] text-[var(--gold)]">
          <HeaderIcon size={15} strokeWidth={1.8} />
        </span>

        <h2 className="text-[15px] font-semibold text-[var(--text)]">
          {title}
        </h2>
      </div>

      <div className={isEntrega ? 'grid gap-3' : 'grid gap-4 md:grid-cols-2'}>
        {mostrarEntrega && (
          <>
            <ActionButton
              icon={MessageCircle}
              iconTone="whatsapp"
              delivery
              title="Enviar link pelo WhatsApp"
              description="Compartilhar acesso ao álbum"
              onClick={onWhatsApp}
            />

            <ActionButton
              icon={Link2}
              iconTone="gold"
              delivery
              title="Copiar link do álbum"
              description="Para compartilhar em outro canal"
              onClick={onCopyLink}
            />
          </>
        )}

        {mostrarAdministrativo && (
          <>
            <ActionButton
              icon={FileText}
              title="Exportar PDF do ensaio"
              description="Resumo com todas informações"
              onClick={onExportPdf}
            />

            <ActionButton
              danger
              icon={Trash2}
              title="Excluir ensaio"
              description="Ação irreversível"
              onClick={onDelete}
            />
          </>
        )}
      </div>
    </section>
  )
}

function ActionButton({ title, description, danger, delivery, icon: Icon = FileText, iconTone, onClick }) {
  const iconClass = danger
    ? 'bg-red-50 text-red-500'
    : iconTone === 'whatsapp'
      ? 'bg-green-100 text-green-700'
      : iconTone === 'gold'
        ? 'bg-[var(--gold-dim)] text-[var(--gold)]'
        : 'bg-transparent text-[var(--text)]'

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center justify-between gap-4 rounded-[8px] border text-left transition ${
        danger
          ? 'border-red-200 bg-red-50/70 text-red-700 hover:bg-red-50'
          : 'border-[var(--border)] bg-white/55 text-[var(--text)] hover:border-[var(--gold-border)] hover:bg-[var(--gold-dim)] hover:text-[var(--gold)]'
      } ${delivery ? 'px-4 py-3.5' : 'px-4 py-3'}`}
    >
      <span className="flex min-w-0 items-center gap-3">
        <span className={`flex shrink-0 items-center justify-center rounded-full ${delivery ? 'h-11 w-11' : 'h-10 w-10'} ${iconClass}`}>
          <Icon size={22} strokeWidth={1.8} />
        </span>

        <span className="min-w-0">
          <span className="block truncate text-[12.5px] font-semibold">{title}</span>
          <span className="mt-1 block truncate text-[11px] opacity-55">
            {description}
          </span>
        </span>
      </span>

      <ChevronRight
        size={16}
        strokeWidth={1.8}
        className={`shrink-0 ${danger ? 'text-red-500' : 'text-[var(--text-muted)]'}`}
      />
    </button>
  )
}
