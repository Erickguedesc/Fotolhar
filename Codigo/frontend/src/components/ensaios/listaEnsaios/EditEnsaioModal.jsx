import { useEffect, useMemo, useRef, useState } from 'react'
import { Map, MapPin } from 'lucide-react'

import BaseModal from './BaseModal'
import { formatDateTimeLocal, TIPO_OPTIONS, toApiDateTime } from './ensaioHelpers'
import LocationMapModal from '../../ui/LocationMapModal'
import {
  interpretarTextoLocalizacao,
  montarConsultaMapa,
} from '../../../utils/localizacaoEnsaio'

const inputClass = 'theme-input w-full rounded-lg border px-3.5 py-2.5 text-[13px] outline-none transition focus:border-[var(--gold-border)] focus:bg-[var(--gold-dim)]'
const labelClass = 'theme-muted mb-1.5 block text-[10.5px] uppercase tracking-[0.13em]'
const sectionTitleClass = 'theme-divider border-b pb-2 text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--gold)]'

const STATUS_VALORES_OPTIONS = [
  { value: 'NAO_INFORMADO', label: 'Não informado' },
  { value: 'PENDENTE', label: 'Pendente' },
  { value: 'PAGO', label: 'Pago' },
]

export default function EditEnsaioModal({
  ensaio,
  open,
  loading,
  onClose,
  onSave,
  focusSection = null,
  showClienteFields = true,
}) {
  const [form, setForm] = useState(null)
  const [mapOpen, setMapOpen] = useState(false)
  const valoresSectionRef = useRef(null)

  useEffect(() => {
    if (!ensaio) return

    setForm({
      clienteNome: ensaio.clienteNome || '',
      clienteEmail: ensaio.clienteEmail || '',
      clienteTelefone: ensaio.clienteTelefone || '',
      clienteCpf: ensaio.clienteCpf || '',
      clienteCidade: ensaio.clienteCidade || '',
      clienteIndicacao: ensaio.clienteIndicacao || '',

      tipo: ensaio.tipo || 'NEWBORN',
      dataEnsaio: formatDateTimeLocal(ensaio.dataEnsaio),
      local: ensaio.local || '',
      cidadeEnsaio: ensaio.cidadeEnsaio || '',
      estadoEnsaio: ensaio.estadoEnsaio || '',
      enderecoCompleto: ensaio.enderecoCompleto || '',
      referenciaLocal: ensaio.referenciaLocal || '',
      qtdFotosPacote: ensaio.qtdFotosPacote || 1,
      valorPacote: ensaio.valorPacote || '',
      cobrarFotoExtra: Boolean(ensaio.cobrarFotoExtra),
      valorFotoExtra: ensaio.valorFotoExtra ?? '',
      valorFinalEnsaio: ensaio.valorFinalEnsaio ?? '',
      statusValores: ensaio.statusValores || 'NAO_INFORMADO',
      observacaoValores: ensaio.observacaoValores || '',
      observacoes: ensaio.observacoes || '',
    })
  }, [ensaio])

  useEffect(() => {
    if (!open) setMapOpen(false)
  }, [open])

  useEffect(() => {
    if (!open || !form || focusSection !== 'valores') return undefined

    const timeoutId = window.setTimeout(() => {
      valoresSectionRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      })
    }, 80)

    return () => window.clearTimeout(timeoutId)
  }, [focusSection, form, open])

  const change = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const mapInitialQuery = useMemo(
    () => montarConsultaMapa({
      cidade: form?.cidadeEnsaio,
    }),
    [form?.cidadeEnsaio],
  )

  const handleUseLocationFromMap = (value) => {
    const parsed = interpretarTextoLocalizacao(value)

    change('cidadeEnsaio', parsed.cidade || value)
    change('estadoEnsaio', parsed.estado || '')
    change('enderecoCompleto', '')

    setMapOpen(false)
  }

  const submit = (event) => {
    event.preventDefault()

    if (!form || !ensaio) return

    onSave({
      clienteId: ensaio.clienteId,

      clienteNome: form.clienteNome.trim(),
      clienteEmail: form.clienteEmail.trim() || null,
      clienteTelefone: form.clienteTelefone.trim() || null,
      clienteCpf: form.clienteCpf.trim() || null,
      clienteCidade: form.clienteCidade.trim() || null,
      clienteIndicacao: form.clienteIndicacao.trim() || null,

      tipo: form.tipo,
      dataEnsaio: toApiDateTime(form.dataEnsaio),
      local: form.local.trim(),
      cidadeEnsaio: form.cidadeEnsaio.trim() || null,
      estadoEnsaio: form.estadoEnsaio || null,
      enderecoCompleto: form.enderecoCompleto?.trim() || null,
      referenciaLocal: form.referenciaLocal?.trim() || null,
      qtdFotosPacote: Number(form.qtdFotosPacote),
      valorPacote: Number(form.valorPacote),
      cobrarFotoExtra: Boolean(form.cobrarFotoExtra),
      valorFotoExtra: form.cobrarFotoExtra ? Number(form.valorFotoExtra || 0) : null,
      valorFinalEnsaio: form.valorFinalEnsaio ? Number(form.valorFinalEnsaio) : null,
      statusValores: form.statusValores || 'NAO_INFORMADO',
      observacaoValores: form.observacaoValores?.trim() || null,
      observacoes: form.observacoes?.trim() || null,
    })
  }

  return (
    <BaseModal
      open={open}
      title="Editar ensaio"
      onClose={onClose}
      footer={(
        <>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-lg border border-[var(--border)] px-4 py-2.5 text-[12px] tracking-[0.08em] text-[var(--text-muted)] transition hover:text-[var(--text)] disabled:opacity-50"
          >
            Cancelar
          </button>

          <button
            type="submit"
            form="edit-ensaio-form"
            disabled={loading}
            className="rounded-lg bg-[#C84F32] px-5 py-2.5 text-[12px] font-medium tracking-[0.1em] text-white transition hover:bg-[#AE3F28] disabled:opacity-60"
          >
            {loading ? 'Salvando...' : 'Salvar alterações'}
          </button>
        </>
      )}
    >
      {form && (
        <form id="edit-ensaio-form" onSubmit={submit} className="space-y-5">
          {showClienteFields && (
            <div className="space-y-4">
              <p className={sectionTitleClass}>Dados de contato</p>

              <label className="block">
                <span className={labelClass}>Nome completo</span>
                <input
                  required
                  value={form.clienteNome}
                  onChange={(event) => change('clienteNome', event.target.value)}
                  className={inputClass}
                  placeholder="Nome completo"
                />
              </label>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label>
                  <span className={labelClass}>E-mail</span>
                  <input
                    type="email"
                    value={form.clienteEmail}
                    onChange={(event) => change('clienteEmail', event.target.value)}
                    className={inputClass}
                    placeholder="cliente@email.com"
                  />
                </label>

                <label>
                  <span className={labelClass}>Telefone / WhatsApp</span>
                  <input
                    value={form.clienteTelefone}
                    onChange={(event) => change('clienteTelefone', event.target.value)}
                    className={inputClass}
                    placeholder="(31) 99999-9999"
                  />
                </label>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label>
                  <span className={labelClass}>CPF</span>
                  <input
                    value={form.clienteCpf}
                    onChange={(event) => change('clienteCpf', event.target.value)}
                    className={inputClass}
                    placeholder="000.000.000-00"
                  />
                </label>

                <label>
                  <span className={labelClass}>Cidade</span>
                  <input
                    value={form.clienteCidade}
                    onChange={(event) => change('clienteCidade', event.target.value)}
                    className={inputClass}
                    placeholder="Belo Horizonte, MG"
                  />
                </label>
              </div>

              <label className="block">
                <span className={labelClass}>Indicação</span>
                <input
                  value={form.clienteIndicacao}
                  onChange={(event) => change('clienteIndicacao', event.target.value)}
                  className={inputClass}
                  placeholder="Instagram, indicação, Google..."
                />
              </label>
            </div>
          )}

          <div className="space-y-4">
            <p className={sectionTitleClass}>Dados do ensaio</p>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label>
                <span className={labelClass}>Tipo</span>
                <select
                  value={form.tipo}
                  onChange={(event) => change('tipo', event.target.value)}
                  className={inputClass}
                >
                  {TIPO_OPTIONS.map((tipo) => (
                    <option key={tipo.value} value={tipo.value}>
                      {tipo.label}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span className={labelClass}>Data e horário</span>
                <input
                  required
                  type="datetime-local"
                  value={form.dataEnsaio}
                  onChange={(event) => change('dataEnsaio', event.target.value)}
                  className={inputClass}
                />
              </label>
            </div>

            <label className="block">
              <span className={labelClass}>Local</span>
              <div className="flex min-h-[42px] overflow-hidden rounded-lg border border-[var(--border)] bg-white transition focus-within:border-[var(--gold-border)] focus-within:bg-[var(--gold-dim)]">
                <MapPin className="ml-3.5 mt-3 h-4 w-4 flex-shrink-0 text-[var(--text-muted)]" strokeWidth={1.8} />
                <input
                  required
                  value={form.local}
                  onChange={(event) => change('local', event.target.value)}
                  className="min-w-0 flex-1 bg-transparent px-3 py-2.5 text-[13px] outline-none"
                  placeholder="Ex.: Estúdio, residência, Jardim Botânico"
                />
              </div>
            </label>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label>
                <span className={labelClass}>Cidade do ensaio</span>
                <div className="flex min-h-[42px] overflow-hidden rounded-lg border border-[var(--border)] bg-white transition focus-within:border-[var(--gold-border)] focus-within:bg-[var(--gold-dim)]">
                  <Map className="ml-3.5 mt-3 h-4 w-4 flex-shrink-0 text-[var(--text-muted)]" strokeWidth={1.8} />
                  <input
                    value={form.cidadeEnsaio}
                    onChange={(event) => change('cidadeEnsaio', event.target.value)}
                    className="min-w-0 flex-1 bg-transparent px-3 py-2.5 text-[13px] outline-none"
                    placeholder="Digite a cidade e estado"
                  />
                  <button
                    type="button"
                    onClick={() => setMapOpen(true)}
                    className="flex flex-shrink-0 items-center gap-2 border-l border-[var(--border)] px-3 text-[12px] font-medium text-[#C84F32] transition hover:bg-white hover:text-[#AE3F28] max-sm:px-2.5"
                  >
                    <Map className="h-4 w-4" strokeWidth={1.8} />
                    <span className="max-[420px]:hidden">Mapa</span>
                  </button>
                </div>
              </label>

              <label>
                <span className={labelClass}>Referência do local</span>
                <input
                  value={form.referenciaLocal}
                  onChange={(event) => change('referenciaLocal', event.target.value)}
                  className={inputClass}
                  placeholder="Ex: entrada principal, portão azul"
                />
              </label>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label>
                <span className={labelClass}>Qtd. fotos</span>
                <input
                  required
                  min="1"
                  type="number"
                  value={form.qtdFotosPacote}
                  onChange={(event) => change('qtdFotosPacote', event.target.value)}
                  className={inputClass}
                />
              </label>

              <label>
                <span className={labelClass}>Valor pacote</span>
                <input
                  required
                  min="0.01"
                  step="0.01"
                  type="number"
                  value={form.valorPacote}
                  onChange={(event) => change('valorPacote', event.target.value)}
                  className={inputClass}
                />
              </label>
            </div>

            <label className="theme-text flex items-center gap-2 text-[13px]">
              <input
                type="checkbox"
                checked={form.cobrarFotoExtra}
                onChange={(event) => change('cobrarFotoExtra', event.target.checked)}
              />
              Cobrar foto extra
            </label>

            {form.cobrarFotoExtra && (
              <label className="block">
                <span className={labelClass}>Valor foto extra</span>
                <input
                  required
                  min="0.01"
                  step="0.01"
                  type="number"
                  value={form.valorFotoExtra}
                  onChange={(event) => change('valorFotoExtra', event.target.value)}
                  className={inputClass}
                />
              </label>
            )}

            <div
              ref={valoresSectionRef}
              id="resumo-valores"
              className="theme-panel space-y-4 rounded-xl border p-4 scroll-mt-4"
            >
              <p className={sectionTitleClass}>Resumo de valores</p>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label>
                  <span className={labelClass}>Valor final do ensaio</span>
                  <input
                    min="0"
                    step="0.01"
                    type="number"
                    value={form.valorFinalEnsaio}
                    onChange={(event) => change('valorFinalEnsaio', event.target.value)}
                    className={inputClass}
                    placeholder="Opcional"
                  />
                </label>

                <label>
                  <span className={labelClass}>Status dos valores</span>
                  <select
                    value={form.statusValores}
                    onChange={(event) => change('statusValores', event.target.value)}
                    className={inputClass}
                  >
                    {STATUS_VALORES_OPTIONS.map((status) => (
                      <option key={status.value} value={status.value}>
                        {status.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="block">
                <span className={labelClass}>Observação de valores</span>
                <textarea
                  maxLength="500"
                  rows="3"
                  value={form.observacaoValores}
                  onChange={(event) => change('observacaoValores', event.target.value)}
                  className={`${inputClass} resize-y`}
                  placeholder="Ex: desconto combinado, cortesia de extras, ajuste manual..."
                />
              </label>
            </div>

            <label className="block">
              <span className={labelClass}>Observações</span>
              <textarea
                maxLength="400"
                rows="4"
                value={form.observacoes}
                onChange={(event) => change('observacoes', event.target.value)}
                className={`${inputClass} resize-y`}
              />
            </label>
          </div>
        </form>
      )}
      <LocationMapModal
        initialQuery={mapInitialQuery}
        onClose={() => setMapOpen(false)}
        onUseLocation={handleUseLocationFromMap}
        open={mapOpen}
      />
    </BaseModal>
  )
}
