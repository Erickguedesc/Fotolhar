export default function PreContratoTop({ clienteNome, sourceLabel, onCopyLink, onExportPDF }) {
  return (
    <div className="precontrato-page-top">
      <div>
        <h1 className="precontrato-title">Pré-contrato</h1>
        <p className="precontrato-sub">Gerado a partir dos dados {sourceLabel} · {clienteNome || 'complete os dados de contato'}</p>
      </div>

      <div className="precontrato-actions">
        <button type="button" className="precontrato-btn-outline" onClick={onCopyLink}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
          Copiar link
        </button>
        <button type="button" className="precontrato-btn-gold" onClick={onExportPDF}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          Exportar PDF
        </button>
      </div>
    </div>
  )
}
