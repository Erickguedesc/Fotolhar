import ContractSection from './ContractSection'
import DataCell from './DataCell'
import EditableField from './EditableField'
import FotolharIcon from './FotolharIcon'
import {
  DEFAULT_ACCEPT_TEXT,
  DEFAULT_CONTRACT_CLAUSES,
  recalculateFinancialDraft,
  updateContractClause,
} from './preContratoHelpers'

const UserIcon = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#C84F32" strokeWidth="1.8"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
const ImageIcon = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#C84F32" strokeWidth="1.8"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>
const MoneyIcon = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#C84F32" strokeWidth="1.8"><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>
const FileIcon = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#C84F32" strokeWidth="1.8"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg>
const PenIcon = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#C84F32" strokeWidth="1.8"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" /></svg>

export default function ContractDocument({ draft, onChange }) {
  const set = (field) => (value) => onChange({ ...draft, [field]: value })
  const setFinancial = (field) => (value) => onChange(recalculateFinancialDraft({ ...draft, [field]: value }, field))
  const profissionalNome = draft.profissionalNome || ''
  const profissionalEmail = draft.profissionalEmail || ''
  const profissionalTelefone = draft.profissionalTelefone || ''
  const profissionalCidade = draft.profissionalCidade || ''
  const profissionalDocumento = draft.profissionalDocumento || ''
  const clauses = Array.isArray(draft.clausulasContrato) && draft.clausulasContrato.length
    ? draft.clausulasContrato
    : DEFAULT_CONTRACT_CLAUSES
  const setClause = (index) => (value) => onChange(updateContractClause(draft, index, value))

  return (
    <div className="precontrato-wrap" id="contractDoc">
      <div className="precontrato-contract-header">
        <div className="precontrato-brand">
          <div className="precontrato-logo-row">
            <FotolharIcon />
            <span className="precontrato-logo-text">
              <EditableField value={profissionalNome} onChange={set('profissionalNome')} />
            </span>
          </div>
          <div className="precontrato-brand-sub">Fotografia Profissional</div>
          <div className="precontrato-brand-contact">
            <EditableField value={profissionalNome} onChange={set('profissionalNome')} /><br />
            <span><EditableField value={profissionalEmail} onChange={set('profissionalEmail')} /></span> - <span><EditableField value={profissionalTelefone} onChange={set('profissionalTelefone')} /></span><br />
            <EditableField value={profissionalCidade} onChange={set('profissionalCidade')} />
          </div>
        </div>

        <div className="precontrato-doc-info">
          <div className="precontrato-num-label">Numero do documento</div>
          <div className="precontrato-num"><EditableField value={draft.numeroDocumento} onChange={set('numeroDocumento')} /></div>
          <div className="precontrato-date-row">
            <span>Emitido em</span>
            <EditableField value={draft.dataEmissao} onChange={set('dataEmissao')} />
          </div>
          <div className="precontrato-date-row small">
            <span>Valido ate</span>
            <EditableField value={draft.validade} onChange={set('validade')} />
          </div>
        </div>
      </div>

      <div className="precontrato-title-band">
        <div className="precontrato-title-main">Pre-Contrato de Servicos Fotograficos</div>
      </div>

      <div className="precontrato-body">
        <ContractSection title="1. Dados para contratação" subtitle="Pessoa contratante" icon={<UserIcon />}>
          <div className="precontrato-data-grid three">
            <DataCell label="Nome completo" value={draft.clienteNome} onChange={set('clienteNome')} />
            <DataCell label="CPF" value={draft.clienteCpf} onChange={set('clienteCpf')} />
            <DataCell label="Telefone" value={draft.clienteTelefone} onChange={set('clienteTelefone')} />
            <DataCell label="E-mail" value={draft.clienteEmail} onChange={set('clienteEmail')} />
            <DataCell label="Cidade" value={draft.clienteCidade} onChange={set('clienteCidade')} />
            <DataCell label="Indicacao" value={draft.clienteIndicacao} onChange={set('clienteIndicacao')} muted />
          </div>
        </ContractSection>

        <div className="precontrato-divider" />

        <ContractSection title="2. Dados do Ensaio" subtitle="Objeto do contrato" icon={<ImageIcon />}>
          <div className="precontrato-data-grid">
            <DataCell label="Tipo de ensaio" value={draft.tipoEnsaio} onChange={set('tipoEnsaio')} />
            <DataCell label="Data" value={draft.dataEnsaio} onChange={set('dataEnsaio')} />
            <DataCell label="Horario" value={draft.horario} onChange={set('horario')} />
            <DataCell label="Local" value={draft.local} onChange={set('local')} />
            <DataCell label="Observacoes" value={draft.observacoes} onChange={set('observacoes')} full muted multiline />
          </div>
        </ContractSection>

        <div className="precontrato-divider" />

        <ContractSection title="3. Pacote e Valores" subtitle="Condicoes financeiras" icon={<MoneyIcon />}>
          <table className="precontrato-valores-table">
            <thead>
              <tr>
                <th>Descricao</th>
                <th>Qtd.</th>
                <th>Valor unit.</th>
                <th>Subtotal</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><EditableField value={draft.descricaoPacote} onChange={set('descricaoPacote')} /></td>
                <td><EditableField value={draft.quantidadePacote} onChange={setFinancial('quantidadePacote')} /></td>
                <td><EditableField value={draft.valorPacote} onChange={setFinancial('valorPacote')} /></td>
                <td>{draft.subtotalPacote || '-'}</td>
              </tr>
              <tr>
                <td>Fotos editadas incluidas</td>
                <td><EditableField value={draft.qtdFotos} onChange={set('qtdFotos')} /></td>
                <td>-</td>
                <td>Incluido</td>
              </tr>
              <tr className="muted-row">
                <td>Fotos extras, se houver</td>
                <td><EditableField value={draft.qtdFotosExtras} onChange={setFinancial('qtdFotosExtras')} placeholder="0" /></td>
                <td><EditableField value={draft.valorFotoExtra} onChange={setFinancial('valorFotoExtra')} /></td>
                <td>{draft.subtotalFotosExtras || 'A calcular'}</td>
              </tr>
              <tr className="total-row">
                <td>Total do pacote</td>
                <td />
                <td />
                <td className="td-total">{draft.totalPacote || '-'}</td>
              </tr>
            </tbody>
          </table>

          <div className="precontrato-payment-grid precontrato-data-grid three">
            <DataCell label="Forma de pagamento" value={draft.formaPagamento} onChange={set('formaPagamento')} />
            <DataCell label="Entrada / sinal" value={draft.sinal} onChange={setFinancial('sinal')} gold />
            <DataCell label="Saldo / restante" value={draft.saldo} onChange={set('saldo')} />
            <DataCell
              label="Condicoes comerciais"
              value={draft.condicoesComerciais}
              onChange={set('condicoesComerciais')}
              full
              muted
              multiline
            />
          </div>

          <div className="precontrato-note">
            <strong>Nota:</strong> O total acima e uma referencia do pacote e das fotos extras. Deslocamento, descontos, taxas adicionais ou outros combinados serao definidos entre as partes, quando aplicavel.
          </div>
        </ContractSection>

        <div className="precontrato-divider" />

        <ContractSection title="4. Clausulas" subtitle="Termos e condicoes" icon={<FileIcon />}>
          <div className="precontrato-clausulas">
            {clauses.map((clausula, index) => (
              <div key={`${index}-${clausula.slice(0, 16)}`}>
                <span>{index + 1}.</span>
                <p>
                  <EditableField value={clausula} onChange={setClause(index)} multiline />
                </p>
              </div>
            ))}
          </div>
        </ContractSection>

        <div className="precontrato-divider" />

        <ContractSection title="5. Assinatura" subtitle="Aceite e vigencia" icon={<PenIcon />}>
          <div className="precontrato-accept">
            <EditableField
              value={draft.textoAceiteContrato || DEFAULT_ACCEPT_TEXT}
              onChange={set('textoAceiteContrato')}
              multiline
            />
          </div>
          <div className="precontrato-sign-row">
            <div className="precontrato-sign-box">
              <div className="precontrato-data-key">Contratada(o) - Profissional</div>
              <div className="precontrato-sign-line" />
              <div className="precontrato-sign-name"><EditableField value={profissionalNome} onChange={set('profissionalNome')} /></div>
              <div className="precontrato-sign-role">Profissional de fotografia - <EditableField value={profissionalDocumento} onChange={set('profissionalDocumento')} /></div>
            </div>
            <div className="precontrato-sign-box">
              <div className="precontrato-data-key">Pessoa contratante</div>
              <div className="precontrato-sign-line" />
              <div className="precontrato-sign-name"><EditableField value={draft.clienteNome} onChange={set('clienteNome')} /></div>
              <div className="precontrato-sign-role">CPF <EditableField value={draft.clienteCpf} onChange={set('clienteCpf')} /></div>
            </div>
          </div>
          <div className="precontrato-sign-date">
            <EditableField value={draft.cidadeAssinatura} onChange={set('cidadeAssinatura')} /> - <EditableField value={draft.dataEmissao} onChange={set('dataEmissao')} /> - Documento gerado automaticamente pelo sistema Fotolhar
          </div>
        </ContractSection>
      </div>

      <footer className="precontrato-footer">
        <div>
          {profissionalNome} - {profissionalEmail}<br />
          {profissionalCidade}, Brasil
        </div>
        <div>
          Documento {draft.numeroDocumento} - Gerado em {draft.dataEmissaoCurta}<br />
        </div>
      </footer>
    </div>
  )
}
