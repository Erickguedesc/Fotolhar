import { normalizarEstadoUf } from './brasil'

export function montarConsultaMapa({ enderecoCompleto, cidade, estado, local }) {
  const cidadeEstado = [cidade, estado].filter(Boolean).join(', ')
  return enderecoCompleto || cidadeEstado || local || ''
}

export function getGoogleMapsUrl(query) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`
}

export function getGoogleMapsEmbedUrl(query) {
  return `https://maps.google.com/maps?q=${encodeURIComponent(query)}&output=embed`
}

export function interpretarTextoLocalizacao(value) {
  const texto = String(value || '').trim()
  if (!texto) {
    return {
      local: '',
      cidade: '',
      estado: '',
    }
  }

  const partes = texto
    .replace(/\s+[–—-]\s+/g, ', ')
    .split(',')
    .map((parte) => parte.trim())
    .filter(Boolean)

  let estado = ''
  let cidade = ''

  if (partes.length >= 2) {
    const ultimo = partes[partes.length - 1]
    const uf = normalizarEstadoUf(ultimo)

    if (uf) {
      estado = uf
      partes.pop()
      cidade = partes.length ? partes.pop() : ''
    }
  }

  return {
    local: partes.join(', ') || texto,
    cidade,
    estado,
  }
}
