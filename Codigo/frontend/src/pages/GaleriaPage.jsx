import { useEffect, useState } from 'react'
import { Navigate, useParams } from 'react-router-dom'

import AlbumExpiredState from '../components/album/galeria/AlbumExpiredState'
import ConfirmSelectionModal from '../components/album/galeria/ConfirmSelectionModal'
import FavoritesView from '../components/album/galeria/FavoritesView'
import FloatingSelectionBar from '../components/album/galeria/FloatingSelectionBar'
import GalleryGrid from '../components/album/galeria/GalleryGrid'
import GalleryHero from '../components/album/galeria/GalleryHero'
import GalleryLightbox from '../components/album/galeria/GalleryLightbox'
import GalleryTabs from '../components/album/galeria/GalleryTabs'
import SelectionSentNotice from '../components/album/galeria/SelectionSentNotice'
import SelectionSuccessModal from '../components/album/galeria/SelectionSuccessModal'
import {
  LIMITE_PADRAO,
  VALOR_EXTRA_PADRAO,
  calcularTempoRestante,
  formatDate,
  getFotoUrl,
} from '../services/galeriaUtils'
import {
  acessarAlbumComSenha,
  buscarSelecaoAlbum,
  enviarSelecaoFotos,
  validarAlbumPorToken,
} from '../services/albumAccessService'

function getSelectionDraftStorageKey(token) {
  return `fotolhar_album_${token}_selecao_rascunho`
}

function lerRascunhoSelecao(token) {
  try {
    const raw = localStorage.getItem(getSelectionDraftStorageKey(token))
    const rascunho = raw ? JSON.parse(raw) : null

    return {
      fotosIds: Array.isArray(rascunho?.fotosIds) ? rascunho.fotosIds : [],
      observacoesPorFoto: rascunho?.observacoesPorFoto && typeof rascunho.observacoesPorFoto === 'object'
        ? rascunho.observacoesPorFoto
        : {},
    }
  } catch {
    return { fotosIds: [], observacoesPorFoto: {} }
  }
}

export default function GaleriaPage() {
  const { token } = useParams()

  const [album, setAlbum] = useState(() => {
    const raw = sessionStorage.getItem(`fotolhar_album_${token}`)

    if (!raw) return null

    try {
      return JSON.parse(raw)
    } catch {
      sessionStorage.removeItem(`fotolhar_album_${token}`)
      return null
    }
  })

  const [aba, setAba] = useState('galeria')
  const [favoritas, setFavoritas] = useState(() => (
    Array.isArray(album?.fotosSelecionadas)
      ? album.fotosSelecionadas
      : lerRascunhoSelecao(token).fotosIds
  ))
  const [observacoesPorFoto, setObservacoesPorFoto] = useState(() => (
    album?.observacoesPorFoto && typeof album.observacoesPorFoto === 'object'
      ? album.observacoesPorFoto
      : lerRascunhoSelecao(token).observacoesPorFoto
  ))
  const [lightboxIndex, setLightboxIndex] = useState(null)
  const [lightboxOrigem, setLightboxOrigem] = useState('galeria')
  const [modalAberto, setModalAberto] = useState(false)
  const [modalSucessoAberto, setModalSucessoAberto] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [selecaoEnviada, setSelecaoEnviada] = useState(
    Boolean(album?.selecaoEnviada || album?.selecaoFinalizada),
  )
  const [tempoRestante, setTempoRestante] = useState(null)
  const [albumExpirado, setAlbumExpirado] = useState(false)
  const [erroEnvio, setErroEnvio] = useState('')

  useEffect(() => {
    const senhaTemporaria = album?.senhaAcessoTemporaria

    if (!senhaTemporaria) return undefined

    let ativo = true

    async function atualizarFotosDaGaleria() {
      try {
        const fotosAtualizadas = await acessarAlbumComSenha(
          token,
          senhaTemporaria,
        )
        const dadosPublicos = await validarAlbumPorToken(token)

        if (!ativo) return

        setAlbum((albumAtual) => {
          const albumAtualizado = {
            ...(albumAtual || {}),
            ...dadosPublicos,
            fotos: fotosAtualizadas,
            senhaAcessoTemporaria: senhaTemporaria,
          }

          sessionStorage.setItem(
            `fotolhar_album_${token}`,
            JSON.stringify(albumAtualizado),
          )

          return albumAtualizado
        })
      } catch (error) {
        console.error('Erro ao atualizar fotos da galeria:', error)
      }
    }

    atualizarFotosDaGaleria()

    return () => {
      ativo = false
    }
  }, [album?.senhaAcessoTemporaria, token])

  useEffect(() => {
    let ativo = true

    async function carregarSelecaoJaEnviada() {
      try {
        const selecao = await buscarSelecaoAlbum(token)
        const fotosIds = Array.isArray(selecao?.fotosIds) ? selecao.fotosIds : []

        if (!ativo || fotosIds.length === 0) return

        const observacoes = selecao?.observacoesPorFoto && typeof selecao.observacoesPorFoto === 'object'
          ? selecao.observacoesPorFoto
          : {}

        setFavoritas(fotosIds)
        setObservacoesPorFoto(observacoes)
        setSelecaoEnviada(true)

        try {
          localStorage.removeItem(getSelectionDraftStorageKey(token))
        } catch {
          // A seleção confirmada continua sendo recuperada pelo backend.
        }

        setAlbum((albumAtual) => {
          if (!albumAtual) return albumAtual

          const albumAtualizado = {
            ...albumAtual,
            selecaoEnviada: true,
            fotosSelecionadas: fotosIds,
            observacoesPorFoto: observacoes,
          }

          sessionStorage.setItem(`fotolhar_album_${token}`, JSON.stringify(albumAtualizado))
          return albumAtualizado
        })
      } catch (error) {
        // Um rascunho local não deve ser apagado se a consulta estiver indisponível.
        console.error('Erro ao recuperar a seleção enviada:', error)
      }
    }

    carregarSelecaoJaEnviada()

    return () => {
      ativo = false
    }
  }, [token])

  useEffect(() => {
    if (selecaoEnviada) {
      try {
        localStorage.removeItem(getSelectionDraftStorageKey(token))
      } catch {
        // Não impede o uso da galeria se o navegador bloquear o armazenamento.
      }
      return
    }

    try {
      localStorage.setItem(getSelectionDraftStorageKey(token), JSON.stringify({
        fotosIds: favoritas,
        observacoesPorFoto,
      }))
    } catch {
      // O estado da sessão segue funcional mesmo se o storage estiver indisponível.
    }
  }, [favoritas, observacoesPorFoto, selecaoEnviada, token])

  useEffect(() => {
    if (!album?.expiraEm) {
      setAlbumExpirado(false)
      setTempoRestante(null)
      return undefined
    }

    function atualizarContador() {
      const { expirado, tempo } = calcularTempoRestante(album.expiraEm)

      setAlbumExpirado(expirado)
      setTempoRestante(tempo)
    }

    atualizarContador()

    const interval = setInterval(atualizarContador, 1000)

    return () => clearInterval(interval)
  }, [album?.expiraEm])

  if (!album) {
    return <Navigate to={`/album/${token}`} replace />
  }

  if (albumExpirado) {
    return <AlbumExpiredState />
  }

  const fotos = Array.isArray(album.fotos) ? album.fotos : []
  const fotoCapa = fotos.find((foto) => foto.ehCapa) || fotos[0]
  const capaAlbumUrl = getFotoUrl(fotoCapa, { width: 1600 }) || album?.capaAlbumPadraoUrl || ''
  const fotosFavoritas = fotos.filter((foto) => favoritas.includes(foto.id))
  const fotosLightbox = lightboxOrigem === 'favoritas' ? fotosFavoritas : fotos
  const fotoLightbox =
    lightboxIndex !== null ? fotosLightbox[lightboxIndex] : null

  const nomeCliente =
    album.nomeCliente || album.clienteNome || album.nome || 'Cliente'
  const tipoEnsaio = album.tipoEnsaio || album.tipo || 'Ensaio fotográfico'
  const limite =
    album.qtdFotosPacote ||
    album.limiteFotos ||
    album.quantidadeFotosPacote ||
    album.quantidadeFotos ||
    LIMITE_PADRAO
  const dataFormatada = formatDate(album.dataEnsaio)
  const cobraFotoExtra = album.cobrarFotoExtra === true
  const valorFotoExtra = cobraFotoExtra
    ? Number(album.valorFotoExtra || VALOR_EXTRA_PADRAO)
    : 0

  const totalSelecionadas = favoritas.length
  const excedente = Math.max(0, totalSelecionadas - limite)
  const valorExcedente = cobraFotoExtra ? excedente * valorFotoExtra : 0
  const progresso =
    limite > 0
      ? Math.min(100, Math.round((totalSelecionadas / limite) * 100))
      : 0

  function toggleFavorita(fotoId) {
    if (selecaoEnviada) return

    setFavoritas((atual) => {
      if (atual.includes(fotoId)) {
        return atual.filter((id) => id !== fotoId)
      }

      return [...atual, fotoId]
    })
  }

  function handleObservacaoChange(fotoId, observacao) {
    if (selecaoEnviada) return

    setObservacoesPorFoto((atual) => ({
      ...atual,
      [fotoId]: observacao.slice(0, 500),
    }))
  }

  function abrirLightbox(index, origem = 'galeria') {
    setLightboxOrigem(origem)
    setLightboxIndex(index)
  }

  function fecharLightbox() {
    setLightboxIndex(null)
  }

  function moverLightbox(direcao) {
    setLightboxIndex((indexAtual) => {
      if (indexAtual === null || fotosLightbox.length === 0) return null

      return (indexAtual + direcao + fotosLightbox.length) % fotosLightbox.length
    })
  }

  function abrirModalConfirmacao() {
    setErroEnvio('')
    setModalAberto(true)
  }

  async function confirmarSelecao() {
    if (selecaoEnviada) {
      setModalAberto(false)
      setErroEnvio('Esta seleção já foi finalizada e não pode ser alterada.')
      return
    }

    try {
      setEnviando(true)
      setErroEnvio('')

      const observacoesSelecionadas = favoritas.reduce((acc, fotoId) => {
        const observacao = observacoesPorFoto[fotoId]?.trim()

        if (observacao) {
          acc[fotoId] = observacao
        }

        return acc
      }, {})

      await enviarSelecaoFotos(token, favoritas, observacoesSelecionadas)

      setSelecaoEnviada(true)
      setModalAberto(false)
      setModalSucessoAberto(true)

      sessionStorage.setItem(
        `fotolhar_album_${token}`,
        JSON.stringify({
          ...album,
          selecaoEnviada: true,
          fotosSelecionadas: favoritas,
          observacoesPorFoto: observacoesSelecionadas,
        }),
      )
      localStorage.removeItem(getSelectionDraftStorageKey(token))
    } catch (error) {
      const status = error?.response?.status

      setModalAberto(false)

      if (status === 400) {
        setErroEnvio('Esta seleção já foi enviada ou contém fotos inválidas.')
      } else if (status === 403) {
        setErroEnvio('Acesso não autorizado ao álbum.')
      } else {
        setErroEnvio('Não foi possível enviar sua seleção. Tente novamente.')
      }
    } finally {
      setEnviando(false)
    }
  }

  return (
    <main className="theme-static min-h-screen bg-[#FCFCFD] text-[#1F1F21]">
      <GalleryHero
        coverUrl={capaAlbumUrl}
        nomeCliente={nomeCliente}
        tipoEnsaio={tipoEnsaio}
        dataFormatada={dataFormatada}
        limite={limite}
        expiraEm={album.expiraEm}
        tempoRestante={tempoRestante}
      />

      <GalleryTabs
        aba={aba}
        onChangeAba={setAba}
        totalSelecionadas={totalSelecionadas}
        limite={limite}
        excedente={excedente}
      />

      <SelectionSuccessModal
        open={modalSucessoAberto}
        onClose={() => setModalSucessoAberto(false)}
      />

      <SelectionSentNotice visible={selecaoEnviada} />

      {aba === 'galeria' ? (
        <GalleryGrid
          fotos={fotos}
          favoritas={favoritas}
          onOpenLightbox={abrirLightbox}
          onToggleFavorita={toggleFavorita}
        />
      ) : null}

      {aba === 'favoritas' ? (
        <FavoritesView
          fotosFavoritas={fotosFavoritas}
          totalSelecionadas={totalSelecionadas}
          limite={limite}
          excedente={excedente}
          cobraFotoExtra={cobraFotoExtra}
          valorFotoExtra={valorFotoExtra}
          valorExcedente={valorExcedente}
          progresso={progresso}
          erroEnvio={erroEnvio}
          enviando={enviando}
          selecaoEnviada={selecaoEnviada}
          observacoesPorFoto={observacoesPorFoto}
          onExploreGallery={() => setAba('galeria')}
          onOpenLightbox={abrirLightbox}
          onToggleFavorita={toggleFavorita}
          onOpenConfirm={abrirModalConfirmacao}
          onObservacaoChange={handleObservacaoChange}
        />
      ) : null}

      <FloatingSelectionBar
        visible={totalSelecionadas > 0 && aba === 'galeria' && !selecaoEnviada}
        totalSelecionadas={totalSelecionadas}
        excedente={excedente}
        onViewSelection={() => setAba('favoritas')}
      />

      <GalleryLightbox
        foto={fotoLightbox}
        fotos={fotosLightbox}
        index={lightboxIndex}
        favoritas={favoritas}
        observacoesPorFoto={observacoesPorFoto}
        selecaoEnviada={selecaoEnviada}
        onClose={fecharLightbox}
        onMove={moverLightbox}
        onToggleFavorita={toggleFavorita}
        onObservacaoChange={handleObservacaoChange}
      />

      <ConfirmSelectionModal
        open={modalAberto}
        totalSelecionadas={totalSelecionadas}
        limite={limite}
        excedente={excedente}
        cobraFotoExtra={cobraFotoExtra}
        valorExcedente={valorExcedente}
        enviando={enviando}
        onCancel={() => setModalAberto(false)}
        onConfirm={confirmarSelecao}
      />
    </main>
  )
}
