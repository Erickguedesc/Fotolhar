import { useMemo, useState } from 'react'
import { Map, MapPin } from 'lucide-react'

import FormInput from '../ui/FormInput'
import LocationMapModal from '../ui/LocationMapModal'
import {
  interpretarTextoLocalizacao,
  montarConsultaMapa,
} from '../../utils/localizacaoEnsaio'

const TIPOS = [
  'Feminino', 'Casal', 'Infantil', 'Gestante', 'Batizado', 'Família',
  'Newborn', 'Book', 'Externo', 'Formatura', 'Evento', 'Debutante',
  'Outro',
]

const inputClass = `
  w-full rounded-[9px] border border-[var(--border)] bg-white/64
  px-3.5 py-[11px] text-[13.5px] font-light
  text-[var(--text)] outline-none shadow-[0_8px_20px_rgba(31,31,33,0.035)]
  transition-all duration-200 placeholder:text-[var(--text-muted)]
  focus:border-[var(--gold-border)] focus:bg-white
`

const errorInputClass = 'border-[rgba(201,123,123,0.5)] bg-[rgba(201,123,123,0.07)]'

const compoundInputClass = `
  flex min-h-[45px] w-full items-center overflow-hidden rounded-[9px]
  border border-[var(--border)] bg-white/64
  text-[13.5px] font-light text-[var(--text)]
  shadow-[0_8px_20px_rgba(31,31,33,0.035)] transition-all duration-200
  focus-within:border-[var(--gold-border)] focus-within:bg-white
`

function onlyDigits(value) {
  return String(value || '').replace(/\D/g, '')
}

function formatTelefone(value) {
  const digits = onlyDigits(value).slice(0, 11)

  if (digits.length <= 2) return digits
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`
  }

  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
}

function formatCpf(value) {
  const digits = onlyDigits(value).slice(0, 11)

  return digits
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
}

function formatConflictDate(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

// ── Ícone de seção reutilizável ──────────────────────────────────────────────
function SectionHeader({ icon, label }) {
  return (
    <div className="flex items-center gap-3 border-b border-[var(--border)] px-5 py-4">
      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-[8px] border border-[var(--gold-border)] bg-[var(--gold-dim)] text-[var(--gold)]">
        {icon}
      </div>
      <span className="text-[15px] font-medium text-[var(--text)]">
        {label}
      </span>
    </div>
  )
}

export default function FormInfoSection({
  form,
  errors,
  clientesSugeridos = [],
  conflitoAgenda,
  onChange,
  onSelectCliente,
  onSectionFocus,
}) {
  const set = (field, value) => onChange(field, value)
  const [mapOpen, setMapOpen] = useState(false)
  const mapInitialQuery = useMemo(
    () => montarConsultaMapa({
      cidade: form.cidadeEnsaio,
    }),
    [form.cidadeEnsaio],
  )

  const handleUseLocationFromMap = (value) => {
    const parsed = interpretarTextoLocalizacao(value)

    set('cidadeEnsaio', parsed.cidade || value)
    set('enderecoCompleto', '')

    setMapOpen(false)
  }

  return (
    <>
      {/* ── CARD 1: Dados do cliente ───────────────────────────────────────── */}
      <div
        className="mb-4 overflow-visible rounded-[14px] border border-[var(--border)] bg-white/78 shadow-[0_14px_34px_rgba(31,31,33,0.055)]"
        onPointerDownCapture={() => onSectionFocus?.('cliente')}
        onFocusCapture={() => onSectionFocus?.('cliente')}
      >

        <SectionHeader
          label="Dados do cliente"
          icon={
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#C84F32" strokeWidth="1.8">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          }
        />

        <div className="flex flex-col gap-4 p-5">

          {/* Nome — obrigatório */}
          <FormInput label="Nome completo" required error={errors.cliente}>
            <div className="relative">
              <input
                type="text"
                placeholder="Ex: Nome Completo do Cliente"
                value={form.cliente}
                onChange={(e) => set('cliente', e.target.value)}
                autoComplete="off"
                className={`${inputClass} ${errors.cliente ? errorInputClass : ''}`}
              />

              {clientesSugeridos.length > 0 && (
                <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-20 overflow-hidden rounded-xl border border-[var(--border)] bg-white shadow-[0_18px_36px_rgba(31,31,33,0.10)]">
                  {clientesSugeridos.map((cliente) => (
                    <button
                      key={cliente.id}
                      type="button"
                      onClick={() => onSelectCliente(cliente)}
                      className="flex w-full items-center justify-between gap-3 border-b border-[var(--border)] px-3.5 py-3 text-left transition last:border-b-0 hover:bg-[var(--gold-dim)]"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-[13px] text-[var(--text)]">
                          {cliente.nome}
                        </span>
                        <span className="mt-0.5 block truncate text-[11px] text-[var(--text-muted)]">
                          {[cliente.telefone, cliente.email].filter(Boolean).join(' · ') || 'Cliente já cadastrado'}
                        </span>
                      </span>
                      <span className="shrink-0 rounded-full border border-[var(--gold-border)] px-2.5 py-1 text-[10px] uppercase tracking-[0.1em] text-[var(--gold)]">
                        Usar
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </FormInput>

          {/* Telefone + Email */}
          <div className="grid grid-cols-2 gap-4 max-md:grid-cols-1">
            <FormInput label="Telefone" error={errors.telefone}>
              <input
                type="tel"
                placeholder="(31) 99999-0000"
                value={formatTelefone(form.telefone)}
                onChange={(e) => set('telefone', formatTelefone(e.target.value))}
                className={`${inputClass} ${errors.telefone ? errorInputClass : ''}`}
              />
            </FormInput>

            <FormInput label="E-mail" error={errors.email}>
              <input
                type="email"
                placeholder="cliente@email.com"
                value={form.email}
                onChange={(e) => set('email', e.target.value)}
                className={`${inputClass} ${errors.email ? errorInputClass : ''}`}
              />
            </FormInput>
          </div>

          {/* CPF + Cidade */}
          <div className="grid grid-cols-2 gap-4 max-md:grid-cols-1">
            <FormInput label="CPF" error={errors.cpf}>
              <input
                type="text"
                placeholder="000.000.000-00"
                value={formatCpf(form.cpf)}
                maxLength={14}
                onChange={(e) => set('cpf', formatCpf(e.target.value))}
                className={`${inputClass} ${errors.cpf ? errorInputClass : ''}`}
              />
            </FormInput>

            <FormInput label="Cidade" required error={errors.cidade}>
              <input
                type="text"
                placeholder="digite a cidade"
                value={form.cidade}
                onChange={(e) => set('cidade', e.target.value)}
                className={`${inputClass} ${errors.cidade ? errorInputClass : ''}`}
              />
            </FormInput>
          </div>

          {/* Indicação */}
          <FormInput label="Como nos conheceu?">
            <div className="relative">
              <select
                value={form.indicacao}
                onChange={(e) => set('indicacao', e.target.value)}
                className={`${inputClass} appearance-none pr-9 cursor-pointer`}
              >
                <option value="">Selecionar (opcional)</option>
                <option value="Instagram">Instagram</option>
                <option value="Facebook">Facebook</option>
                <option value="Google">Google</option>
                <option value="Indicação">Indicação de amigo/familiar</option>
                <option value="WhatsApp">WhatsApp</option>
                <option value="Outro">Outro</option>
              </select>
              <svg
                width="11" height="11" viewBox="0 0 24 24"
                fill="none" stroke="currentColor" strokeWidth="2"
                className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] opacity-70"
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </div>
          </FormInput>

        </div>
      </div>

      {/* ── CARD 2: Informações do ensaio ─────────────────────────────────── */}
      <div
        className="mb-4 overflow-hidden rounded-[14px] border border-[var(--border)] bg-white/78 shadow-[0_14px_34px_rgba(31,31,33,0.055)]"
        onPointerDownCapture={() => onSectionFocus?.('ensaio')}
        onFocusCapture={() => onSectionFocus?.('ensaio')}
      >

        <SectionHeader
          label="Informações do ensaio"
          icon={
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#C84F32" strokeWidth="1.8">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
          }
        />

        <div className="flex flex-col gap-4 p-5">

          {/* Tipo de ensaio */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10.5px] tracking-[0.13em] uppercase text-[var(--text-muted)]">
              Tipo de ensaio
              <span className="text-[var(--gold)] ml-0.5">*</span>
            </label>

            <div className="max-h-[76px] overflow-y-auto pr-1 [scrollbar-color:rgba(200,79,50,0.35)_transparent] [scrollbar-width:thin] max-sm:max-h-[116px]">
              <div className="grid grid-cols-6 gap-1.5 max-xl:grid-cols-4 max-md:grid-cols-3 max-sm:grid-cols-2">
                {TIPOS.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => {
                      set('tipo', t)
                      if (t !== 'Outro') set('tipoCustom', '')
                    }}
                    className={`
                      min-h-8 rounded-[9px] border px-2.5 py-1 text-[11.5px]
                      font-medium tracking-normal transition-all duration-200 cursor-pointer
                      ${form.tipo === t
                        ? 'bg-[var(--gold-dim)] border-[var(--gold-border)] text-[#AE3F28] shadow-[0_8px_18px_rgba(31,31,33,0.055)]'
                        : 'border-[var(--border)] bg-white/50 text-[#4A4642] hover:border-[var(--gold-border)] hover:text-[#2F2C29]'}
                    `}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {form.tipo === 'Outro' && (
              <input
                type="text"
                placeholder="Qual o tipo do ensaio?"
                value={form.tipoCustom}
                onChange={(e) => set('tipoCustom', e.target.value)}
                className={`${inputClass} mt-2`}
              />
            )}

            {errors.tipo && (
              <p className="text-[11.5px] text-[#C97B7B] mt-1">{errors.tipo}</p>
            )}
          </div>

          {/* Data + Horário */}
          <div className="grid grid-cols-2 gap-4 max-md:grid-cols-1">
            <FormInput label="Data" required error={errors.data}>
              <input
                type="date"
                value={form.data}
                onChange={(e) => set('data', e.target.value)}
                className={`${inputClass} ${errors.data ? errorInputClass : ''}`}
              />
            </FormInput>

            <FormInput label="Horário" required error={errors.hora}>
              <input
                type="time"
                value={form.hora}
                onChange={(e) => set('hora', e.target.value)}
                className={`${inputClass} ${errors.hora ? errorInputClass : ''}`}
              />
            </FormInput>
          </div>

          {conflitoAgenda && (
            <div className="rounded-xl border border-amber-300 bg-amber-50 px-3.5 py-3 text-[12px] leading-5 text-amber-800">
              Já existe um ensaio neste dia por volta de {formatConflictDate(conflitoAgenda.dataEnsaio)}
              {conflitoAgenda.clienteNome ? ` para ${conflitoAgenda.clienteNome}` : ''}.
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 max-md:grid-cols-1">
            <FormInput label="Local do ensaio" required error={errors.local}>
              <div className={`${compoundInputClass} ${errors.local ? errorInputClass : ''}`}>
                <MapPin className="ml-3.5 h-4 w-4 flex-shrink-0 text-[var(--text-muted)] opacity-75" strokeWidth={1.8} />
                <input
                  type="text"
                  placeholder="Digite o local do ensaio"
                  value={form.local}
                  onChange={(e) => set('local', e.target.value)}
                  className="min-w-0 flex-1 bg-transparent px-3 py-[11px] text-[13.5px] text-[var(--text)] outline-none placeholder:text-[var(--text-muted)]"
                />
              </div>
            </FormInput>

            <FormInput label="Cidade do ensaio (Opicional, para visualizar no mapa)" error={errors.cidadeEnsaio}>
              <div className={`${compoundInputClass} ${errors.cidadeEnsaio ? errorInputClass : ''}`}>
                <Map className="ml-3.5 h-4 w-4 flex-shrink-0 text-[var(--text-muted)] opacity-75" strokeWidth={1.8} />
                <input
                  type="text"
                  placeholder="Cidade x, Estado y"
                  value={form.cidadeEnsaio}
                  onChange={(e) => set('cidadeEnsaio', e.target.value)}
                  className="min-w-0 flex-1 bg-transparent px-3 py-[11px] text-[13.5px] text-[var(--text)] outline-none placeholder:text-[var(--text-muted)]"
                />
                <button
                  type="button"
                  onClick={() => setMapOpen(true)}
                  className="flex h-full min-h-[45px] flex-shrink-0 items-center gap-2 border-l border-[var(--border)] px-3 text-[12px] font-medium text-[#C84F32] transition hover:bg-[rgba(200,79,50,0.08)] hover:text-[#AE3F28] max-sm:px-2.5"
                >
                  <Map className="h-4 w-4" strokeWidth={1.8} />
                  <span className="max-[420px]:hidden">Mapa</span>
                </button>
              </div>
            </FormInput>
          </div>

          <div className="grid grid-cols-2 gap-4 max-md:grid-cols-1">
            <FormInput label="Referência do local" error={errors.referenciaLocal}>
              <input
                type="text"
                placeholder="Ex: entrada principal, portão azul"
                value={form.referenciaLocal}
                onChange={(e) => set('referenciaLocal', e.target.value)}
                className={`${inputClass} ${errors.referenciaLocal ? errorInputClass : ''}`}
              />
            </FormInput>
          </div>

        </div>
      </div>

      <LocationMapModal
        initialQuery={mapInitialQuery}
        onClose={() => setMapOpen(false)}
        onUseLocation={handleUseLocationFromMap}
        open={mapOpen}
      />
    </>
  )
}
