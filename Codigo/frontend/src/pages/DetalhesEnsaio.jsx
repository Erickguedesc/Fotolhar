  import { useEffect, useMemo, useState } from 'react'
  import { useLocation, useNavigate, useParams } from 'react-router-dom'
  import { Heart, Images, Info, ListChecks, UserRound } from 'lucide-react'

  import Header from '../components/layout/Header'
  import Toast from '../components/ui/Toast'

  import { ensaiosService } from '../services/ensaiosService'
  import { clientesService } from '../services/clientesService'
  import { fotosService } from '../services/fotosService'
  import { albumService } from '../services/albumService'

  import EditEnsaioModal from '../components/ensaios/listaEnsaios/EditEnsaioModal'
  import BaseModal from '../components/ensaios/listaEnsaios/BaseModal'
  import ConfirmDeleteModal from '../components/ensaios/listaEnsaios/ConfirmDeleteModal'
  import ConfirmActionModal from '../components/ui/ConfirmActionModal'
  import EnsaioHero from '../components/ensaios/detalhesEnsaio/EnsaioHero'
  import LinhaTempo from '../components/ensaios/detalhesEnsaio/LinhaTempo'
  import InformacoesCard from '../components/ensaios/detalhesEnsaio/InformacoesCard'
  import AlbumUpload from '../components/ensaios/detalhesEnsaio/AlbumUpload'
  import AlbumFotoGrid from '../components/ensaios/detalhesEnsaio/AlbumFotoGrid'
  import AlbumPublicadoResumo from '../components/ensaios/detalhesEnsaio/AlbumPublicadoResumo'
  import SelecaoClienteCard from '../components/ensaios/detalhesEnsaio/SelecaoClienteCard'
  import StatusSidebar from '../components/ensaios/detalhesEnsaio/StatusSidebar'
  import PublicacaoCard from '../components/ensaios/detalhesEnsaio/PublicacaoCard'
  import AcoesGerais from '../components/ensaios/detalhesEnsaio/AcoesGerais'
  import SectionTitle from '../components/ensaios/detalhesEnsaio/SectionTitle'
  import { configuracoesService } from '../services/configuracoesService'

  const extrairTokenDoLink = (url) => {
    if (!url) return ''

    const partes = url.split('/')
    return partes[partes.length - 1] || ''
  }

  const UPLOAD_BATCH_SIZE = 3
  const MAX_UPLOAD_FILE_SIZE_MB = 10
  const MAX_UPLOAD_BATCH_SIZE_MB = 45
  const MAX_UPLOAD_FILE_SIZE = MAX_UPLOAD_FILE_SIZE_MB * 1024 * 1024
  const MAX_UPLOAD_BATCH_SIZE = MAX_UPLOAD_BATCH_SIZE_MB * 1024 * 1024

  const dividirEmLotes = (arquivos, tamanhoLote = UPLOAD_BATCH_SIZE) => {
    const lotes = []
    let loteAtual = []
    let tamanhoAtual = 0

    for (const arquivo of arquivos) {
      const excedeQuantidade = loteAtual.length >= tamanhoLote
      const excedeTamanho =
        loteAtual.length > 0 && tamanhoAtual + arquivo.size > MAX_UPLOAD_BATCH_SIZE

      if (excedeQuantidade || excedeTamanho) {
        lotes.push(loteAtual)
        loteAtual = []
        tamanhoAtual = 0
      }

      loteAtual.push(arquivo)
      tamanhoAtual += arquivo.size
    }

    if (loteAtual.length) lotes.push(loteAtual)

    return lotes
  }

  const aguardar = (tempoMs) => new Promise((resolve) => {
    window.setTimeout(resolve, tempoMs)
  })

  const validarArquivosUpload = (arquivos) => {
    const tiposPermitidos = ['image/jpeg', 'image/png', 'image/webp']

    const invalidos = arquivos.filter((arquivo) => !tiposPermitidos.includes(arquivo.type))
    const grandes = arquivos.filter((arquivo) => arquivo.size > MAX_UPLOAD_FILE_SIZE)

    if (invalidos.length) {
      return `Remova arquivos fora do formato permitido. Envie apenas JPG, PNG ou WEBP.`
    }

    if (grandes.length) {
      const nomes = grandes
        .slice(0, 3)
        .map((arquivo) => arquivo.name)
        .join(', ')

      return `Algumas fotos passam de ${MAX_UPLOAD_FILE_SIZE_MB}MB: ${nomes}${grandes.length > 3 ? '...' : ''}. Reduza o tamanho e tente novamente.`
    }

    return null
  }

  const pluralizarFotos = (total) => `${total} foto${total === 1 ? '' : 's'}`

  const getValorCliente = (ensaio, chaves = []) => {
    for (const chave of chaves) {
      const valor = ensaio?.[chave] ?? ensaio?.cliente?.[chave]
      if (valor !== null && valor !== undefined && valor !== '') return valor
    }

    return '—'
  }

  const getClienteId = (ensaio) =>
    ensaio?.clienteId ?? ensaio?.cliente?.id ?? ensaio?.cliente?.clienteId ?? null

  const getClienteFormData = (ensaio) => ({
    nome: getValorCliente(ensaio, ['clienteNome', 'nome']) === '—'
      ? ''
      : getValorCliente(ensaio, ['clienteNome', 'nome']),
    telefone: getValorCliente(ensaio, [
      'clienteTelefone',
      'telefoneCliente',
      'telefone',
      'clienteWhatsapp',
      'whatsapp',
    ]) === '—'
      ? ''
      : getValorCliente(ensaio, [
        'clienteTelefone',
        'telefoneCliente',
        'telefone',
        'clienteWhatsapp',
        'whatsapp',
      ]),
    email: getValorCliente(ensaio, ['clienteEmail', 'emailCliente', 'email']) === '—'
      ? ''
      : getValorCliente(ensaio, ['clienteEmail', 'emailCliente', 'email']),
    cpf: getValorCliente(ensaio, ['clienteCpf', 'cpf']) === '—'
      ? ''
      : getValorCliente(ensaio, ['clienteCpf', 'cpf']),
    cidade: getValorCliente(ensaio, ['clienteCidade', 'cidade']) === '—'
      ? ''
      : getValorCliente(ensaio, ['clienteCidade', 'cidade']),
    indicacao: getValorCliente(ensaio, ['clienteIndicacao', 'indicacao']) === '—'
      ? ''
      : getValorCliente(ensaio, ['clienteIndicacao', 'indicacao']),
  })

  const getApiErrorMessage = (error, fallback) => {
    const data = error?.response?.data

    if (typeof data === 'string' && data.trim()) return data

    return (
      data?.message ||
      data?.erro ||
      data?.error ||
      data?.detail ||
      fallback
    )
  }

  export default function DetalhesEnsaio() {
    const { id } = useParams()
    const navigate = useNavigate()
    const location = useLocation()

    const [ensaio, setEnsaio] = useState(null)
    const [fotos, setFotos] = useState([])
    const [album, setAlbum] = useState(null)
    const [selecao, setSelecao] = useState(null)

    const [loading, setLoading] = useState(true)
    const [fotosLoading, setFotosLoading] = useState(false)
    const [uploadLoading, setUploadLoading] = useState(false)
    const [actionLoading, setActionLoading] = useState(false)
    const [publicando, setPublicando] = useState(false)
    const [buscandoSelecao, setBuscandoSelecao] = useState(false)
    const [salvandoNotasInternas, setSalvandoNotasInternas] = useState(false)

    const [editModalOpen, setEditModalOpen] = useState(false)
    const [editLoading, setEditLoading] = useState(false)
    const [clienteModalOpen, setClienteModalOpen] = useState(false)
    const [clienteEditLoading, setClienteEditLoading] = useState(false)

    const [deleteModalOpen, setDeleteModalOpen] = useState(false)
    const [deleteLoading, setDeleteLoading] = useState(false)

    const [toast, setToast] = useState(null)
    const [historicoStatus, setHistoricoStatus] = useState([])
    const [confirmAction, setConfirmAction] = useState(null)

    const [uploadProgress, setUploadProgress] = useState(0)
    const [uploadTotal, setUploadTotal] = useState(0)
    const [uploadStatus, setUploadStatus] = useState('')
    const [configuracoes, setConfiguracoes] = useState(null)
    const [activeTab, setActiveTab] = useState('informacoes')
    const deveFocarValores = useMemo(() => {
      const searchParams = new URLSearchParams(location.search)
      return searchParams.get('editar') === 'valores'
    }, [location.search])

    const albumToken = useMemo(() => {
      if (album?.tokenUrl) return album.tokenUrl
      return extrairTokenDoLink(album?.urlAcesso)
    }, [album])

    const albumPublicado = Boolean(
      album?.urlAcesso &&
      album?.ativo !== false &&
      album?.acessoLiberado !== false
    )

    const totalSelecionadas = useMemo(() => {
      const total = Number(selecao?.totalSelecionadas || 0)
      if (total > 0) return total

      return Array.isArray(selecao?.fotosIds) ? selecao.fotosIds.length : 0
    }, [selecao])

    const selecaoFinalizada = totalSelecionadas > 0
    const badgeSelecao = selecaoFinalizada
      ? pluralizarFotos(totalSelecionadas)
      : 'Pendente'

    const tabs = [
      { id: 'informacoes', label: 'Informações', icon: Info, description: 'Resumo do ensaio' },
      { id: 'album', label: 'Criar álbum', icon: Images, badge: pluralizarFotos(fotos.length) },
      { id: 'selecao', label: 'Seleção de fotos', icon: Heart, badge: badgeSelecao },
    ]

    useEffect(() => {
      if (!uploadLoading) return undefined

      const handleBeforeUnload = (event) => {
        event.preventDefault()
        event.returnValue = ''
      }

      window.addEventListener('beforeunload', handleBeforeUnload)

      return () => {
        window.removeEventListener('beforeunload', handleBeforeUnload)
      }
    }, [uploadLoading])

    const showToast = (message, type = 'success') => {
      setToast({ message, type })
    }
  const loadEnsaio = async () => {
    try {
      const response = await ensaiosService.buscarPorId(id)
      setEnsaio(response.data)
      return response.data
    } catch (error) {
      console.error('[DetalhesEnsaio] Erro ao carregar ensaio:', error?.response?.data || error)
      showToast('Não foi possível carregar os detalhes do ensaio.', 'error')
      return null
    }
  }

    const loadFotos = async () => {
      setFotosLoading(true)

      try {
        const response = await fotosService.listarPorEnsaio(id)
        const data = Array.isArray(response.data) ? response.data : []

        setFotos(data)
        return data
      } catch (error) {
        console.error('[DetalhesEnsaio] Erro ao carregar fotos:', error?.response?.data || error)
        showToast('Não foi possível carregar as fotos do ensaio.', 'error')
        return []
      } finally {
        setFotosLoading(false)
      }
    }

    const loadHistoricoStatus = async () => {
    try {
      const response = await ensaiosService.buscarHistoricoStatus(id)
      setHistoricoStatus(Array.isArray(response.data) ? response.data : [])
    } catch (error) {
      console.error('[DetalhesEnsaio] Erro ao carregar histórico de status:', error?.response?.data || error)
      setHistoricoStatus([])
    }
  }
    const loadAlbum = async () => {
      try {
        const response = await albumService.buscarPorEnsaio(id)
        setAlbum(response.data)
        return response.data
      } catch (error) {
        if (error?.response?.status !== 404) {
          console.error('[DetalhesEnsaio] Erro ao carregar álbum:', error?.response?.data || error)
        }

        setAlbum(null)
        return null
      }
    }
  const loadInitialData = async () => {
    setLoading(true)

    try {
      const [detalhesResponse] = await Promise.all([
        ensaiosService.buscarDetalhes(id),
        loadConfiguracoes(),
      ])

      const detalhes = detalhesResponse.data || {}

      setEnsaio(detalhes.ensaio || null)
      setFotos(Array.isArray(detalhes.fotos) ? detalhes.fotos : [])
      setAlbum(detalhes.album || null)
      setHistoricoStatus(Array.isArray(detalhes.historicoStatus) ? detalhes.historicoStatus : [])
      setSelecao(detalhes.selecao || null)
    } catch (error) {
      console.error('[DetalhesEnsaio] Erro ao carregar detalhes:', error?.response?.data || error)

      const ensaioFallback = await loadEnsaio()

      if (!ensaioFallback) {
        setEnsaio(null)
        setFotos([])
        setAlbum(null)
        setHistoricoStatus([])
        setSelecao(null)
        return
      }

      const [albumFallback] = await Promise.all([
        loadAlbum(),
        loadFotos(),
        loadHistoricoStatus(),
      ])

      const tokenFallback = albumFallback?.tokenUrl || extrairTokenDoLink(albumFallback?.urlAcesso)
      const albumFallbackPublicado = Boolean(
        albumFallback?.urlAcesso &&
        albumFallback?.ativo !== false &&
        albumFallback?.acessoLiberado !== false
      )

      if (albumFallbackPublicado && tokenFallback) {
        try {
          const selecaoResponse = await albumService.buscarSelecao(tokenFallback)
          setSelecao(selecaoResponse.data)
        } catch {
          setSelecao(null)
        }
      } else {
        setSelecao(null)
      }

      console.warn('[DetalhesEnsaio] Ensaio aberto com carregamento complementar parcial.')
    } finally {
      setLoading(false)
    }
  }

  const shouldRetryUpload = (error) => {
    const status = error?.response?.status

    if (!status) return true

    return status === 408 || status === 429 || status >= 500
  }

  const getUploadErrorMessage = (error) =>
    getApiErrorMessage(
      error,
      'Não foi possível concluir o envio agora. Tente novamente em instantes.',
    )

    useEffect(() => {
      loadInitialData()
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id])

    useEffect(() => {
      if (!ensaio || !deveFocarValores) return

      setActiveTab('informacoes')
      setEditModalOpen(true)
    }, [deveFocarValores, ensaio])

    const limparParametroEditar = () => {
      if (!deveFocarValores) return

      const searchParams = new URLSearchParams(location.search)
      searchParams.delete('editar')

      const nextSearch = searchParams.toString()
      navigate(
        {
          pathname: location.pathname,
          search: nextSearch ? `?${nextSearch}` : '',
        },
        { replace: true },
      )
    }

    const handleCloseEditModal = () => {
      if (editLoading) return

      setEditModalOpen(false)
      limparParametroEditar()
    }

    const handleEdit = async (payload) => {
      if (!ensaio) return

      setEditLoading(true)

      try {
        await ensaiosService.atualizar(ensaio.id, payload)
        showToast('Ensaio atualizado com sucesso.')
        setEditModalOpen(false)
        limparParametroEditar()
        await loadEnsaio()
        await loadHistoricoStatus()
      } catch (error) {
        const msg =
          error?.response?.data?.message ||
          error?.response?.data?.error ||
          'Não foi possível salvar as alterações.'

        showToast(msg, 'error')
      } finally {
        setEditLoading(false)
      }
    }

    const handleOpenClienteEdit = () => {
      if (!getClienteId(ensaio)) {
        showToast('Não foi possível identificar o contato deste ensaio.', 'error')
        return
      }

      setClienteModalOpen(true)
    }

    const handleClienteEdit = async (payload) => {
      const clienteId = getClienteId(ensaio)

      if (!clienteId) {
        showToast('Não foi possível identificar o contato deste ensaio.', 'error')
        return
      }

      setClienteEditLoading(true)

      try {
        const response = await clientesService.atualizar(clienteId, payload)
        const clienteAtualizado = response.data || payload

        setEnsaio((current) => current ? ({
          ...current,
          cliente: {
            ...(current.cliente || {}),
            ...clienteAtualizado,
          },
          clienteNome: clienteAtualizado.nome ?? payload.nome,
          clienteTelefone: clienteAtualizado.telefone ?? payload.telefone,
          clienteEmail: clienteAtualizado.email ?? payload.email,
          clienteCpf: clienteAtualizado.cpf ?? payload.cpf,
          clienteCidade: clienteAtualizado.cidade ?? payload.cidade,
          clienteIndicacao: clienteAtualizado.indicacao ?? payload.indicacao,
        }) : current)

        showToast('Contato atualizado com sucesso.')
        setClienteModalOpen(false)
        await loadEnsaio()
      } catch (error) {
        showToast(getApiErrorMessage(error, 'Não foi possível salvar os dados.'), 'error')
      } finally {
        setClienteEditLoading(false)
      }
    }

    const handleStatusChange = async (status) => {
    if (!ensaio || ensaio.status === status) return

    setActionLoading(true)

    try {
      const response = await ensaiosService.atualizarStatus(ensaio.id, status)
      const ensaioAtualizado = response?.data

      if (ensaioAtualizado) {
        setEnsaio((current) => current ? { ...current, ...ensaioAtualizado } : current)
      }

      showToast('Status atualizado com sucesso.')
      void Promise.all([loadEnsaio(), loadHistoricoStatus()])
    } catch (error) {
      const msg =
        error?.response?.data?.message ||
        'Não foi possível atualizar o status.'

      showToast(msg, 'error')
    } finally {
      setActionLoading(false)
    }
  }

  const handleAprovarSelecao = async () => {
    if (!ensaio || ensaio.status === 'EM_EDICAO') return

    setActionLoading(true)

    try {
      const response = await ensaiosService.aprovarSelecao(ensaio.id)
      const ensaioAtualizado = response?.data

      if (ensaioAtualizado) {
        setEnsaio((current) => current ? { ...current, ...ensaioAtualizado } : current)
      }

      showToast('Seleção aprovada. Ensaio movido para edição.')
      void Promise.all([loadEnsaio(), loadHistoricoStatus()])
    } catch (error) {
      const msg = getApiErrorMessage(
        error,
        error?.response?.status === 404
          ? 'Rota de aprovação não encontrada. Reinicie o backend e tente novamente.'
          : 'Não foi possível aprovar a seleção.',
      )

      showToast(msg, 'error')
    } finally {
      setActionLoading(false)
    }
  }

  const handleSalvarNotasInternas = async (notasInternas) => {
    if (!ensaio) return

    setSalvandoNotasInternas(true)

    try {
      const response = await ensaiosService.atualizarNotasInternas(
        ensaio.id,
        notasInternas.trim() || null,
      )
      setEnsaio(response.data)
      showToast('Notas do ensaio salvas com sucesso.')
    } catch (error) {
      console.error('[DetalhesEnsaio] Erro ao salvar notas internas:', error?.response?.data || error)

      const backendMessage = getApiErrorMessage(
        error,
        'Não foi possível salvar as notas do ensaio.',
      )
      const msg = error?.response?.status === 404
        ? 'Rota de notas internas não encontrada. Reinicie o backend e tente novamente.'
        : String(backendMessage || '').includes('notas_internas')
          ? 'O banco ainda não criou o campo de notas internas. Reinicie o backend para aplicar a atualização.'
          : backendMessage

      showToast(msg, 'error')
      throw error
    } finally {
      setSalvandoNotasInternas(false)
    }
  }

  const openConfirmAction = (config) => {
    setConfirmAction(config)
  }

  const closeConfirmAction = () => {
    if (publicando || uploadLoading || deleteLoading) return
    setConfirmAction(null)
  }


  const handleUploadFotos = async (arquivos) => {
  if (albumPublicado) {
    showToast(
      'O álbum já foi publicado. Para evitar alterar a galeria enviada, o upload foi bloqueado.',
      'error'
    )
    return
  }

  if (!arquivos?.length) return

  const erroValidacao = validarArquivosUpload(arquivos)

  if (erroValidacao) {
    showToast(erroValidacao, 'error')
    return
  }

  setUploadLoading(true)
  setUploadProgress(0)
  setUploadTotal(arquivos.length)
  setUploadStatus(`Preparando ${arquivos.length} foto${arquivos.length === 1 ? '' : 's'} para envio...`)

  try {
    const lotes = dividirEmLotes(arquivos)
    let fotosEnviadas = 0
    let fotosProcessadas = 0
    const falhas = []

    const atualizarProgressoTotal = (progressoItem = 0) => {
      const progressoSeguro = Math.max(0, Math.min(100, Number(progressoItem || 0)))
      const progressoTotal = Math.round(
        ((fotosProcessadas + (progressoSeguro / 100)) * 100) / arquivos.length,
      )

      setUploadProgress(Math.min(progressoTotal, 99))
    }

    const enviarArquivos = async (arquivosDoEnvio, progressoCallback = atualizarProgressoTotal) => {
      try {
        return await fotosService.upload(id, arquivosDoEnvio, progressoCallback)
      } catch (error) {
        if (!shouldRetryUpload(error)) throw error

        await aguardar(900)
        return fotosService.upload(id, arquivosDoEnvio, progressoCallback)
      }
    }

    for (let index = 0; index < lotes.length; index += 1) {
      const lote = lotes[index]
      const loteAtual = index + 1

      setUploadStatus(
        `Enviando lote ${loteAtual} de ${lotes.length} - ${fotosEnviadas} de ${arquivos.length} fotos concluídas.`,
      )

      try {
        await enviarArquivos(lote, (progressoLote) => {
          const fotosDoLoteEnviadas = Math.floor((progressoLote / 100) * lote.length)
          const progressoTotal = Math.round(
            ((fotosEnviadas + fotosDoLoteEnviadas) * 100) / arquivos.length,
          )

          setUploadProgress(Math.min(progressoTotal, 99))
        })

        fotosEnviadas += lote.length
        fotosProcessadas += lote.length
      } catch (error) {
        if (lote.length === 1) {
          falhas.push({ arquivo: lote[0], error })
          fotosProcessadas += 1
          atualizarProgressoTotal(100)
          continue
        }

        setUploadStatus(
          `Lote ${loteAtual} falhou. Tentando as ${lote.length} fotos uma por uma...`,
        )

        for (const arquivo of lote) {
          try {
            await enviarArquivos([arquivo])
            fotosEnviadas += 1
          } catch (individualError) {
            falhas.push({ arquivo, error: individualError })
          } finally {
            fotosProcessadas += 1
            atualizarProgressoTotal(100)
          }
        }
      }

      setUploadProgress(Math.min(Math.round((fotosProcessadas * 100) / arquivos.length), 99))
      await loadFotos()
    }

    setUploadStatus('Finalizando e atualizando a galeria...')
    setUploadProgress(100)
    await loadFotos()

    if (falhas.length) {
      const primeiraFalha = falhas[0]?.error
      const detalheFalha = getUploadErrorMessage(primeiraFalha)
      const restante = falhas.length
      const enviadasLabel = `${fotosEnviadas} de ${arquivos.length} foto${arquivos.length === 1 ? '' : 's'}`

      showToast(
        fotosEnviadas > 0
          ? `${enviadasLabel} foram enviadas. ${restante} falhou${restante === 1 ? '' : 'ram'}. ${detalheFalha}`
          : detalheFalha,
        'error',
      )

      return
    }

    showToast(`${arquivos.length} foto${arquivos.length === 1 ? '' : 's'} enviada${arquivos.length === 1 ? '' : 's'} com sucesso.`)
  } catch (error) {
    const msg = getUploadErrorMessage(error)

    showToast(msg, 'error')

    try {
      await loadFotos()
    } catch {
      // Se a atualização falhar, a próxima abertura da tela buscará o estado salvo.
    }
  } finally {
    setUploadLoading(false)

    setTimeout(() => {
      setUploadProgress(0)
      setUploadTotal(0)
      setUploadStatus('')
    }, 1200)
  }
}

    const handleDefinirCapa = async (fotoId) => {
      if (albumPublicado) {
        showToast('O álbum já foi publicado. A capa não pode ser alterada agora.', 'error')
        return
      }

      try {
        await fotosService.definirCapa(fotoId)
        setFotos((current) =>
          current.map((foto) => ({
            ...foto,
            ehCapa: foto.id === fotoId,
          })),
        )
        showToast('Capa atualizada com sucesso.')
      } catch (error) {
        const msg =
          error?.response?.data?.message ||
          'Não foi possível definir a capa.'

        showToast(msg, 'error')
      }
    }

    const handleRemoverFoto = async (fotoId) => {
    if (albumPublicado) {
      showToast('O álbum já foi publicado. Não é possível remover fotos agora.', 'error')
      return
    }

    openConfirmAction({
      type: 'danger',
      title: 'Remover foto?',
      description:
        'Essa foto será removida do ensaio e também do armazenamento. Esta ação não poderá ser desfeita.',
      confirmText: 'Remover foto',
      onConfirm: async () => {
        setUploadLoading(true)

        try {
          await fotosService.remover(fotoId)
          showToast('Foto removida com sucesso.')
          setConfirmAction(null)
          await loadFotos()
        } catch (error) {
          const msg =
            error?.response?.data?.message ||
            'Não foi possível remover a foto.'

          showToast(msg, 'error')
        } finally {
          setUploadLoading(false)
        }
      },
    })
  }

  const handleRemoverFotos = async (fotosIds) => {
  if (albumPublicado) {
    showToast('O álbum já foi publicado. Não é possível remover fotos agora.', 'error')
    return
  }

  if (!fotosIds?.length) return

  openConfirmAction({
    type: 'danger',
    title: 'Apagar fotos selecionadas?',
    description: `${fotosIds.length} foto${fotosIds.length === 1 ? '' : 's'} será${fotosIds.length === 1 ? '' : 'ão'} removida${fotosIds.length === 1 ? '' : 's'} do ensaio e do armazenamento. Esta ação não poderá ser desfeita.`,
    confirmText: 'Apagar fotos',
    onConfirm: async () => {
      setUploadLoading(true)

      try {
        const resultado = await fotosService.removerVarios(fotosIds, (progresso) => {
          setUploadStatus(
            `Removendo fotos... ${progresso.concluidas} de ${progresso.total} processadas.`,
          )
        })

        if (resultado.falhas.length) {
          showToast(
            `${resultado.removidas.length} foto${resultado.removidas.length === 1 ? '' : 's'} removida${resultado.removidas.length === 1 ? '' : 's'}. ${resultado.falhas.length} não pôde${resultado.falhas.length === 1 ? '' : 'ram'} ser removida${resultado.falhas.length === 1 ? '' : 's'}.`,
            'error',
          )
        } else {
          showToast('Fotos removidas com sucesso.')
          setConfirmAction(null)
        }

        await loadFotos()
      } catch (error) {
        const msg =
          error?.response?.data?.message ||
          'Não foi possível remover as fotos selecionadas.'

        showToast(msg, 'error')
      } finally {
        setUploadLoading(false)
      }
    },
  })
}
  const publicarAlbum = async ({ successMessage, errorMessage } = {}) => {
    setPublicando(true)

    try {
      const publicarResponse = await albumService.gerar(id)

      let adminAlbum = null

      try {
        const adminResponse = await albumService.buscarPorEnsaio(id)
        adminAlbum = adminResponse.data
      } catch (error) {
        console.error(
          '[DetalhesEnsaio] Álbum publicado, mas não foi possível recarregar admin:',
          error?.response?.data || error
        )
      }

      setAlbum({
        ...(adminAlbum || {}),
        urlAcesso: publicarResponse.data?.urlAcesso || adminAlbum?.urlAcesso,
        senhaAcesso: publicarResponse.data?.senhaAcesso,
        ativo: adminAlbum?.ativo ?? true,
        acessoLiberado: adminAlbum?.acessoLiberado ?? true,
      })

      await Promise.all([
        loadEnsaio(),
        loadHistoricoStatus(),
      ])

      showToast(
        successMessage ||
        (album?.urlAcesso
          ? 'Nova senha gerada com sucesso. Envie a senha atualizada junto com o link do álbum.'
          : 'Álbum publicado com sucesso. As fotos foram bloqueadas para preservar a galeria enviada.'
        )
      )
    } catch (error) {
      const msg =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        errorMessage ||
        'Não foi possível concluir a publicação do álbum.'

      showToast(msg, 'error')
    } finally {
      setPublicando(false)
    }
  }

  const handlePublicar = async () => {
    if (albumPublicado) {
      openConfirmAction({
        type: 'warning',
        title: 'Gerar nova senha?',
        description:
          'Gerar uma nova senha vai invalidar a senha anterior. O álbum poderá ser acessado somente com a nova senha.',
        confirmText: 'Gerar nova senha',
        onConfirm: async () => {
          setConfirmAction(null)
          await publicarAlbum({
            successMessage: 'Nova senha gerada com sucesso. Envie a senha atualizada junto com o link do álbum.',
            errorMessage: 'Nao foi possivel gerar uma nova senha para o album.',
          })
        },
      })

      return
    }

    const fotosAtuais = fotos.length ? fotos : await loadFotos()

    if (!fotosAtuais.length) {
      showToast('Envie fotos antes de publicar o álbum.', 'error')
      return
    }

    if (album?.urlAcesso && !albumPublicado) {
      openConfirmAction({
        type: 'gold',
        title: 'Publicar novamente?',
        description:
          'O álbum será liberado novamente e uma nova senha de acesso será gerada.',
        confirmText: 'Publicar novamente',
        onConfirm: async () => {
          setConfirmAction(null)
          await publicarAlbum({
            successMessage: 'Álbum publicado novamente. Envie o link e a nova senha de acesso.',
            errorMessage: 'Nao foi possivel publicar novamente o album.',
          })
        },
      })

      return
    }

    await publicarAlbum({
      successMessage: 'Album publicado com sucesso. As fotos foram bloqueadas para preservar a galeria enviada.',
      errorMessage: 'Nao foi possivel publicar o album.',
    })
  }

    const handleReabrirAlbum = async () => {
    openConfirmAction({
      type: 'warning',
      title: 'Reabrir álbum?',
      description:
        'O acesso ao álbum será pausado temporariamente e você poderá editar as fotos. Depois será necessário publicar novamente e enviar uma nova senha.',
      confirmText: 'Reabrir álbum',
      onConfirm: async () => {
        setPublicando(true)

        try {
          const response = await albumService.reabrir(id)
          setAlbum(response.data)
          setSelecao(null)
          setConfirmAction(null)

          showToast('Álbum reaberto para edição. O acesso ao álbum foi pausado.')
        } catch (error) {
          const msg =
            error?.response?.data?.message ||
            'Não foi possível reabrir o álbum.'

          showToast(msg, 'error')
        } finally {
          setPublicando(false)
        }
      },
    })
  }

    const handleBuscarSelecao = async () => {
      if (!albumToken) {
        showToast('Publique o álbum primeiro para consultar a seleção.', 'error')
        return
      }

      if (!albumPublicado) {
        showToast('O álbum está pausado. Publique novamente antes de consultar a seleção.', 'error')
        return
      }

      setBuscandoSelecao(true)

      try {
        const response = await albumService.buscarSelecao(albumToken)
        setSelecao(response.data)
        showToast('Seleção consultada com sucesso.')
      } catch (error) {
        const msg =
          error?.response?.data?.message ||
          'Ainda não existe seleção enviada.'

        showToast(msg, 'error')
      } finally {
        setBuscandoSelecao(false)
      }
    }

    const handleCopyLink = async () => {
      if (!album?.urlAcesso) {
        showToast('O álbum ainda precisa ser publicado.', 'error')
        return
      }

      try {
        await navigator.clipboard.writeText(album.urlAcesso)
        showToast('Link copiado com sucesso.')
      } catch {
        showToast('Não foi possível copiar o link.', 'error')
      }
    }

  const limparTelefone = (valor) => {
    const apenasNumeros = String(valor || '').replace(/\D/g, '')

    if (!apenasNumeros) return ''

    if (apenasNumeros.startsWith('55')) {
      return apenasNumeros
    }

    return `55${apenasNumeros}`
  }

  const handleWhatsApp = () => {
    const telefoneBruto =
      ensaio?.clienteWhatsapp ||
      ensaio?.whatsapp ||
      ensaio?.clienteTelefone ||
      ensaio?.telefoneCliente ||
      ensaio?.telefone ||
      ensaio?.cliente?.telefone ||
      ensaio?.cliente?.whatsapp

    const telefone = limparTelefone(telefoneBruto)

    if (!telefone) {
      showToast('Este ensaio não possui WhatsApp cadastrado.', 'error')
      return
    }

    if (album?.urlAcesso && !albumPublicado) {
      showToast('O álbum está pausado. Publique novamente antes de compartilhar o acesso.', 'error')
      return
    }

 const mensagemPadraoAlbum =
  configuracoes?.preferencias?.mensagemEnvioAlbum?.trim() ||
  'Olá! Seu álbum já está disponível.'

const texto =
  album?.urlAcesso && albumPublicado
    ? [
        mensagemPadraoAlbum,
        `Link: ${album.urlAcesso}`,
        album?.senhaAcesso ? `Senha: ${album.senhaAcesso}` : null,
      ]
        .filter(Boolean)
        .join('\n\n')
    : 'Olá! Estou entrando em contato sobre seu ensaio.'
    window.open(
      `https://wa.me/${telefone}?text=${encodeURIComponent(texto)}`,
      '_blank'
    )
  }

  const handleExportPdf = async () => {
  if (!ensaio?.id) {
    showToast('Ensaio não encontrado para exportação.', 'error')
    return
  }

  try {
    await ensaiosService.exportarPdf(ensaio.id)
    showToast('PDF exportado com sucesso.')
  } catch (error) {
    console.error('[DetalhesEnsaio] Erro ao exportar PDF:', error?.response || error)

    const msg =
      error?.response?.data?.message ||
      error?.response?.data?.erro ||
      'Não foi possível exportar o PDF do ensaio.'

    showToast(msg, 'error')
  }
}
    const handleDelete = () => {
      setDeleteModalOpen(true)
    }

    const handleConfirmDelete = async () => {
      if (!ensaio) return

      setDeleteLoading(true)

      try {
        await ensaiosService.excluir(ensaio.id)
        showToast('Ensaio excluído com sucesso.')
        setDeleteModalOpen(false)

        setTimeout(() => {
          navigate('/ensaios')
        }, 600)
      } catch (error) {
        const msg =
          error?.response?.data?.erro ||
          error?.response?.data?.message ||
          'Não foi possível excluir este ensaio.'

        showToast(msg, 'error')
      } finally {
        setDeleteLoading(false)
      }
    }

    const loadConfiguracoes = async () => {
  try {
    const data = await configuracoesService.buscar()
    setConfiguracoes(data)
    return data
  } catch (error) {
    console.error('[DetalhesEnsaio] Erro ao carregar configurações:', error)
    setConfiguracoes(null)
    return null
  }
}

    if (loading) {
      return (
        <>
          <Header />

          <main className="ensaios-management-page mx-auto max-w-[1280px] px-8 pt-[110px] max-md:px-4">
            <div className="rounded-[14px] border border-[var(--border)] bg-white/78 p-8 text-[var(--text-muted)] shadow-[0_14px_34px_rgba(31,31,33,0.055)]">
              Carregando detalhes do ensaio...
            </div>
          </main>
        </>
      )
    }

    if (!ensaio) {
      return (
        <>
          <Header />

          <main className="ensaios-management-page mx-auto max-w-[1280px] px-8 pt-[110px] max-md:px-4">
            <div className="rounded-[14px] border border-[var(--border)] bg-white/78 p-8 shadow-[0_14px_34px_rgba(31,31,33,0.055)]">
              <h1 className="font-serif text-2xl text-[var(--text)]">
                Ensaio não encontrado
              </h1>

              <p className="mt-2 text-sm text-[var(--text-muted)]">
                Não foi possível encontrar os dados deste ensaio.
              </p>

              <button
                type="button"
                onClick={() => navigate('/ensaios')}
                className="mt-5 rounded-lg border border-[var(--gold-border)] px-4 py-2 text-sm text-[var(--gold)] transition hover:bg-[var(--gold-dim)]"
              >
                Voltar para ensaios
              </button>
            </div>
          </main>
        </>
      )
    }

    return (
      <>
        <Header />

        <main className="ensaios-management-page mx-auto max-w-[1280px] px-8 pb-16 pt-[92px] max-md:px-4 lg:pt-8">
          <div className="mb-6 flex items-center gap-2 border-b border-[var(--border)] pb-6 text-[13px] text-[var(--text-muted)]">
            <button
              type="button"
              onClick={() => navigate('/ensaios')}
              className="transition hover:text-[var(--gold)]"
            >
              Ensaios
            </button>

            <span>›</span>
            <span className="font-medium text-[var(--text)]">{ensaio.clienteNome}</span>
          </div>

          <EnsaioHero
            ensaio={ensaio}
            fotos={fotos}
            savingNotes={salvandoNotasInternas}
            onEdit={() => setEditModalOpen(true)}
            onSaveNotes={handleSalvarNotasInternas}
            onPreContrato={() => navigate(`/ensaios/${ensaio.id}/pre-contrato`)}
            onWhatsApp={handleWhatsApp}
            onBack={() => navigate('/ensaios')}
          />

          <section className="mt-6 grid grid-cols-3 gap-3 max-lg:grid-cols-1">
            {tabs.map((tab) => {
              const active = activeTab === tab.id
              const Icon = tab.icon
              const tone = tab.id === 'informacoes'
                ? 'border-[#E8E3DF] bg-[#F8EDE8] text-[#C84F32]'
                : tab.id === 'album'
                  ? 'border-violet-100 bg-violet-50 text-violet-600'
                  : 'border-rose-100 bg-rose-50 text-rose-600'

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`group relative min-h-[72px] overflow-hidden rounded-[10px] border bg-white px-4 py-3 text-left shadow-[0_10px_24px_rgba(31,31,33,0.04)] transition hover:-translate-y-0.5 hover:border-[var(--gold-border)] ${
                    active
                      ? 'border-[var(--gold-border)]'
                      : 'border-[var(--border)]'
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[11px] border ${tone}`}>
                      <Icon size={18} strokeWidth={1.8} />
                    </span>

                    <span className="min-w-0">
                      <span className="block truncate text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text)]">
                        {tab.label}
                      </span>

                      {tab.description || tab.badge ? (
                        <span className="mt-1 block truncate text-[12px] text-[var(--text-muted)]">
                          {tab.description || tab.badge}
                        </span>
                      ) : null}
                    </span>
                  </span>

                  {active ? (
                    <span className={`absolute inset-x-3 bottom-0 h-[2px] rounded-t-full ${tab.id === 'album' ? 'bg-violet-500' : tab.id === 'selecao' ? 'bg-rose-500' : 'bg-[var(--gold)]'}`} />
                  ) : null}
                </button>
              )
            })}
          </section>

          {activeTab === 'informacoes' && (
            <div className="mt-6 grid grid-cols-[minmax(0,1fr)_320px] gap-6 max-lg:grid-cols-1">
              <div className="space-y-5">
                <LinhaTempo
                  ensaio={ensaio}
                  historicoStatus={historicoStatus}
                />

                <InformacoesCard
                  ensaio={ensaio}
                  selecao={selecao}
                  onEdit={() => setEditModalOpen(true)}
                />

                <AcoesGerais
                  variant="administrativo"
                  onExportPdf={handleExportPdf}
                  onDelete={handleDelete}
                />
              </div>

              <aside className="space-y-5">
                <StatusSidebar
                  ensaio={ensaio}
                  loading={actionLoading}
                  onStatusChange={handleStatusChange}
                />

                <DadosClienteCard
                  ensaio={ensaio}
                  onEdit={handleOpenClienteEdit}
                />
              </aside>
            </div>
          )}

          {activeTab === 'album' && (
            <div className="mt-6 grid grid-cols-[minmax(0,1fr)_320px] gap-6 max-lg:grid-cols-1">
              <div className="space-y-5">
                {albumPublicado ? (
                  <AlbumPublicadoResumo fotos={fotos} />
                ) : (
                  <>
                    <AlbumUpload
                      totalFotos={fotos.length}
                      loading={uploadLoading}
                      disabled={albumPublicado}
                      uploadProgress={uploadProgress}
                      uploadTotal={uploadTotal}
                      uploadStatus={uploadStatus}
                      onUpload={handleUploadFotos}
                    />

                    <AlbumFotoGrid
                      fotos={fotos}
                      loading={fotosLoading}
                      disabled={albumPublicado}
                      onDefinirCapa={handleDefinirCapa}
                      onRemoverFoto={handleRemoverFoto}
                      onRemoverFotos={handleRemoverFotos}
                    />
                  </>
                )}
              </div>

              <aside className="space-y-5">
                <PublicacaoCard
                  album={album}
                  totalFotos={fotos.length}
                  loading={publicando}
                  albumPublicado={albumPublicado}
                  onPublicar={handlePublicar}
                  onReabrir={handleReabrirAlbum}
                />

                <AcoesGerais
                  variant="entrega"
                  onWhatsApp={handleWhatsApp}
                  onCopyLink={handleCopyLink}
                />
              </aside>
            </div>
          )}

          {activeTab === 'selecao' && (
            <div className="mt-6 grid grid-cols-[minmax(0,1fr)_320px] gap-6 max-lg:grid-cols-1">
              <SelecaoClienteCard
                fotos={fotos}
                selecao={selecao}
                loading={buscandoSelecao}
                onBuscarSelecao={handleBuscarSelecao}
                onAprovarSelecao={handleAprovarSelecao}
                aprovandoSelecao={actionLoading}
                podeAprovarSelecao={
                  selecaoFinalizada &&
                  !['EM_EDICAO', 'FINALIZADO', 'CANCELADO'].includes(ensaio?.status)
                }
                showResumo={false}
              />

              <SelecaoResumoCard
                selecao={selecao}
                totalFotos={fotos.length}
                onBuscarSelecao={handleBuscarSelecao}
                loading={buscandoSelecao}
              />
            </div>
          )}
        </main>

  <EditEnsaioModal
    open={editModalOpen}
    ensaio={ensaio}
    loading={editLoading}
    focusSection={deveFocarValores ? 'valores' : null}
    showClienteFields={false}
    onClose={handleCloseEditModal}
    onSave={handleEdit}
  />

  <EditClienteModal
    open={clienteModalOpen}
    ensaio={ensaio}
    loading={clienteEditLoading}
    onClose={() => {
      if (!clienteEditLoading) setClienteModalOpen(false)
    }}
    onSave={handleClienteEdit}
  />

  <ConfirmDeleteModal
    open={deleteModalOpen}
    ensaio={ensaio}
    loading={deleteLoading}
    onClose={() => {
      if (!deleteLoading) setDeleteModalOpen(false)
    }}
    onConfirm={handleConfirmDelete}
  />

  <ConfirmActionModal
    open={Boolean(confirmAction)}
    type={confirmAction?.type}
    title={confirmAction?.title}
    description={confirmAction?.description}
    confirmText={confirmAction?.confirmText}
    loading={publicando || uploadLoading}
    onClose={closeConfirmAction}
    onConfirm={confirmAction?.onConfirm}
  />

  {toast && (
    <Toast
      message={toast.message}
      type={toast.type}
      onClose={() => setToast(null)}
    />
  )}
      </>
    )
  }

  function DadosClienteCard({ ensaio, onEdit }) {
    const dados = [
      {
        label: 'Nome',
        value: getValorCliente(ensaio, ['clienteNome', 'nome']),
      },
      {
        label: 'Telefone',
        value: getValorCliente(ensaio, [
          'clienteTelefone',
          'telefoneCliente',
          'telefone',
          'clienteWhatsapp',
          'whatsapp',
        ]),
      },
      {
        label: 'E-mail',
        value: getValorCliente(ensaio, ['clienteEmail', 'emailCliente', 'email']),
      },
      {
        label: 'Cidade',
        value: getValorCliente(ensaio, ['clienteCidade', 'cidade']),
      },
      {
        label: 'Indicação',
        value: getValorCliente(ensaio, ['clienteIndicacao', 'indicacao']),
      },
    ]

    return (
      <section className="rounded-[14px] border border-[var(--border)] bg-white/78 shadow-[0_14px_34px_rgba(31,31,33,0.055)]">
        <SectionTitle
          title="Dados de contato"
          icon={UserRound}
          actionLabel="Editar"
          onAction={onEdit}
        />

        <div className="divide-y divide-[var(--border)] p-5">
          {dados.map((item) => (
            <div key={item.label} className="py-3 first:pt-0 last:pb-0">
              <p className="text-[11px] text-[var(--text-muted)]">
                {item.label}
              </p>

              <p className="mt-1 break-words text-[13px] text-[var(--text)]">
                {item.value}
              </p>
            </div>
          ))}
        </div>
      </section>
    )
  }

  function EditClienteModal({ open, ensaio, loading, onClose, onSave }) {
    const [form, setForm] = useState(() => getClienteFormData(ensaio))

    useEffect(() => {
      if (open) setForm(getClienteFormData(ensaio))
    }, [open, ensaio])

    const change = (field, value) => {
      setForm((current) => ({ ...current, [field]: value }))
    }

    const submit = (event) => {
      event.preventDefault()

      onSave({
        nome: form.nome.trim(),
        telefone: form.telefone.trim() || null,
        email: form.email.trim() || null,
        cpf: form.cpf.trim() || null,
        cidade: form.cidade.trim() || null,
        indicacao: form.indicacao.trim() || null,
      })
    }

    return (
      <BaseModal
        open={open}
        title="Editar contato"
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
              form="edit-cliente-form"
              disabled={loading}
              className="rounded-lg bg-[#C84F32] px-5 py-2.5 text-[12px] font-medium tracking-[0.1em] text-white transition hover:bg-[#AE3F28] disabled:opacity-60"
            >
              {loading ? 'Salvando...' : 'Salvar alterações'}
            </button>
          </>
        )}
      >
        <form id="edit-cliente-form" onSubmit={submit} className="space-y-4">
          <label className="block">
            <span className="theme-muted mb-1.5 block text-[10.5px] uppercase tracking-[0.13em]">
              Nome completo
            </span>
            <input
              required
              value={form.nome}
              onChange={(event) => change('nome', event.target.value)}
              className="theme-input w-full rounded-lg border px-3.5 py-2.5 text-[13px] outline-none transition focus:border-[var(--gold-border)] focus:bg-[var(--gold-dim)]"
              placeholder="Nome completo"
            />
          </label>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label>
              <span className="theme-muted mb-1.5 block text-[10.5px] uppercase tracking-[0.13em]">
                Telefone / WhatsApp
              </span>
              <input
                value={form.telefone}
                onChange={(event) => change('telefone', event.target.value)}
                className="theme-input w-full rounded-lg border px-3.5 py-2.5 text-[13px] outline-none transition focus:border-[var(--gold-border)] focus:bg-[var(--gold-dim)]"
                placeholder="(31) 99999-9999"
              />
            </label>

            <label>
              <span className="theme-muted mb-1.5 block text-[10.5px] uppercase tracking-[0.13em]">
                E-mail
              </span>
              <input
                type="email"
                value={form.email}
                onChange={(event) => change('email', event.target.value)}
                className="theme-input w-full rounded-lg border px-3.5 py-2.5 text-[13px] outline-none transition focus:border-[var(--gold-border)] focus:bg-[var(--gold-dim)]"
                placeholder="cliente@email.com"
              />
            </label>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label>
              <span className="theme-muted mb-1.5 block text-[10.5px] uppercase tracking-[0.13em]">
                Cidade
              </span>
              <input
                value={form.cidade}
                onChange={(event) => change('cidade', event.target.value)}
                className="theme-input w-full rounded-lg border px-3.5 py-2.5 text-[13px] outline-none transition focus:border-[var(--gold-border)] focus:bg-[var(--gold-dim)]"
                placeholder="Belo Horizonte, MG"
              />
            </label>

            <label>
              <span className="theme-muted mb-1.5 block text-[10.5px] uppercase tracking-[0.13em]">
                CPF
              </span>
              <input
                value={form.cpf}
                onChange={(event) => change('cpf', event.target.value)}
                className="theme-input w-full rounded-lg border px-3.5 py-2.5 text-[13px] outline-none transition focus:border-[var(--gold-border)] focus:bg-[var(--gold-dim)]"
                placeholder="000.000.000-00"
              />
            </label>
          </div>

          <label className="block">
            <span className="theme-muted mb-1.5 block text-[10.5px] uppercase tracking-[0.13em]">
              Indicação
            </span>
            <input
              value={form.indicacao}
              onChange={(event) => change('indicacao', event.target.value)}
              className="theme-input w-full rounded-lg border px-3.5 py-2.5 text-[13px] outline-none transition focus:border-[var(--gold-border)] focus:bg-[var(--gold-dim)]"
              placeholder="Instagram, indicação, Google..."
            />
          </label>
        </form>
      </BaseModal>
    )
  }

  function SelecaoResumoCard({
    selecao,
    totalFotos,
    loading,
    onBuscarSelecao,
  }) {
    const totalSelecionadas = Number(selecao?.totalSelecionadas || 0)
    const limitePlano = Number(selecao?.limitePlano || 0)
    const excedente = Number(selecao?.excedente || 0)
    const valorExcedente = Number(selecao?.valorExcedente || 0)
    const temSelecao = totalSelecionadas > 0
    const excedenteLabel =
      excedente > 0
        ? `+${excedente} foto${excedente === 1 ? '' : 's'}`
        : '0 fotos'

    const valorFormatado = valorExcedente.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    })

    return (
      <aside className="space-y-5">
        <section className="rounded-[14px] border border-[var(--border)] bg-white/78 shadow-[0_14px_34px_rgba(31,31,33,0.055)]">
          <SectionTitle title="Resumo" icon={ListChecks} />

          <div className="p-5">
            <ResumoSelecaoLinha
              label="Fotos selecionadas"
              value={temSelecao ? totalSelecionadas : '—'}
            />
            <ResumoSelecaoLinha
              label="Incluídas no pacote"
              value={limitePlano || totalFotos || '—'}
            />
            <ResumoSelecaoLinha
              label="Excedente"
              value={temSelecao ? excedenteLabel : '—'}
              danger={excedente > 0}
            />
            <ResumoSelecaoLinha
              label="Valor adicional"
              value={temSelecao ? valorFormatado : '—'}
              highlight={excedente > 0}
            />

            {excedente > 0 ? (
              <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-[12px] leading-5 text-red-700">
                A seleção ultrapassou o pacote. Confirme o valor antes da entrega.
              </div>
            ) : null}

            <button
              type="button"
              disabled={loading}
              onClick={onBuscarSelecao}
              className="mt-5 w-full rounded-[10px] border border-[var(--gold-border)] bg-white/55 px-4 py-3 text-[12px] font-medium text-[var(--gold)] transition hover:bg-[var(--gold-dim)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? 'Consultando...' : 'Atualizar seleção'}
            </button>
          </div>
        </section>
      </aside>
    )
  }

  function ResumoSelecaoLinha({ label, value, danger, highlight }) {
    return (
      <div className="flex items-center justify-between gap-4 border-b border-[var(--border)] py-3 first:pt-0 last:border-b-0 last:pb-0">
        <span className="text-[13px] text-[var(--text)]">
          {label}
        </span>

        <span
          className={`text-right text-[13px] font-medium ${
            danger
              ? 'text-red-700'
              : highlight
                ? 'text-[var(--gold)]'
                : 'text-[var(--text)]'
          }`}
        >
          {value}
        </span>
      </div>
    )
  }
