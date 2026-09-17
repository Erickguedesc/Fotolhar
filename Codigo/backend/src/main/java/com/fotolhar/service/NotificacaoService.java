package com.fotolhar.service;

import com.fotolhar.dto.NotificacaoResponse;
import com.fotolhar.enums.StatusEnsaio;
import com.fotolhar.model.Album;
import com.fotolhar.model.Ensaio;
import com.fotolhar.model.Usuario;
import com.fotolhar.model.HistoricoStatusEnsaio;
import com.fotolhar.model.NotificacaoDispensada;
import com.fotolhar.model.SelecaoFoto;
import com.fotolhar.repository.AlbumRepository;
import com.fotolhar.repository.EnsaioRepository;
import com.fotolhar.repository.UsuarioRepository;
import com.fotolhar.repository.HistoricoStatusEnsaioRepository;
import com.fotolhar.repository.NotificacaoDispensadaRepository;
import com.fotolhar.repository.SelecaoFotoRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class NotificacaoService {

    private static final int DIAS_SEM_SELECAO = 5;
    private static final int DIAS_STATUS_PARADO = 10;
    private static final int DIAS_EDICAO_ATRASADA = 14;
    private static final Duration SILENCIO_ALERTA_CRITICO = Duration.ofHours(2);
    private static final Duration SILENCIO_ALERTA_ACAO = Duration.ofHours(6);
    private static final Duration SILENCIO_ALERTA_PRAZO = Duration.ofHours(12);
    private static final Duration SILENCIO_ALERTA_ACOMPANHAMENTO = Duration.ofHours(24);

    private final EnsaioRepository ensaioRepository;
    private final AlbumRepository albumRepository;
    private final SelecaoFotoRepository selecaoFotoRepository;
    private final HistoricoStatusEnsaioRepository historicoStatusEnsaioRepository;
    private final UsuarioRepository usuarioRepository;
    private final NotificacaoDispensadaRepository notificacaoDispensadaRepository;

    @Transactional(readOnly = true)
    public List<NotificacaoResponse> listar() {
        Usuario usuario = buscarUsuarioLogado();
        OffsetDateTime agora = OffsetDateTime.now();
        Set<String> dispensadas = notificacaoDispensadaRepository.findByUsuarioId(usuario.getId())
                .stream()
                .filter(notificacao -> notificacao.getExpiraEm() != null)
                .filter(notificacao -> notificacao.getExpiraEm().isAfter(agora))
                .map(NotificacaoDispensada::getChave)
                .collect(Collectors.toCollection(HashSet::new));

        List<NotificacaoResponse> notificacoes = gerarNotificacoes(usuario);

        return notificacoes.stream()
                .filter(notificacao -> !dispensadas.contains(notificacao.getChave()))
                .sorted(Comparator
                        .comparing(this::pesoPrioridade)
                        .thenComparing(
                                NotificacaoResponse::getDataReferencia,
                                Comparator.nullsLast(Comparator.reverseOrder())))
                .limit(20)
                .toList();
    }

    @Transactional
    public void dispensar(String chave) {
        if (chave == null || chave.isBlank()) {
            return;
        }

        Usuario usuario = buscarUsuarioLogado();
        OffsetDateTime agora = OffsetDateTime.now();
        String chaveLimpa = chave.trim();
        OffsetDateTime expiraEm = agora.plus(duracaoSilencio(chaveLimpa));

        notificacaoDispensadaRepository.findByUsuarioIdAndChave(usuario.getId(), chaveLimpa)
                .map(notificacao -> {
                    notificacao.setDispensadaEm(agora);
                    notificacao.setExpiraEm(expiraEm);
                    return notificacaoDispensadaRepository.save(notificacao);
                })
                .orElseGet(() -> notificacaoDispensadaRepository.save(
                        NotificacaoDispensada.builder()
                                .usuario(usuario)
                                .chave(chaveLimpa)
                                .dispensadaEm(agora)
                                .expiraEm(expiraEm)
                                .build()));
    }

    @Transactional
    public void limparSilenciosExpirados() {
        Usuario usuario = buscarUsuarioLogado();
        notificacaoDispensadaRepository.deleteByUsuarioIdAndExpiraEmBefore(usuario.getId(), OffsetDateTime.now());
    }

    private List<NotificacaoResponse> gerarNotificacoes(Usuario usuario) {
        List<Ensaio> ensaios = ensaioRepository.findByClienteUsuarioId(usuario.getId());
        OffsetDateTime agora = OffsetDateTime.now();
        var albumPorEnsaio = albumRepository.findByEnsaioClienteUsuarioId(usuario.getId())
                .stream()
                .filter(album -> album.getEnsaio() != null && album.getEnsaio().getId() != null)
                .collect(Collectors.toMap(
                        album -> album.getEnsaio().getId(),
                        Function.identity(),
                        (existente, novo) -> existente));

        List<NotificacaoResponse> itens = new ArrayList<>();

        for (Ensaio ensaio : ensaios) {
            if (ensaio.getStatus() == StatusEnsaio.CANCELADO || ensaio.getStatus() == StatusEnsaio.FINALIZADO) {
                adicionarPagamentoPendente(itens, ensaio);
                continue;
            }

            Album album = albumPorEnsaio.get(ensaio.getId());
            List<SelecaoFoto> selecoes = album == null
                    ? List.of()
                    : selecaoFotoRepository.findByAlbumId(album.getId());

            adicionarEnsaioAgendadoAtrasado(itens, ensaio, agora);
            adicionarSelecaoEnviada(itens, ensaio, selecoes);
            adicionarAlbumExpirando(itens, ensaio, album, selecoes, agora);
            adicionarClienteSemSelecao(itens, ensaio, album, selecoes, agora);
            adicionarStatusParado(itens, ensaio, agora);
            adicionarEntregaAtrasada(itens, ensaio, agora);
            adicionarPagamentoPendente(itens, ensaio);
        }

        return itens;
    }

    private void adicionarEnsaioAgendadoAtrasado(
            List<NotificacaoResponse> itens,
            Ensaio ensaio,
            OffsetDateTime agora
    ) {
        if (ensaio.getStatus() == StatusEnsaio.AGENDADO
                && ensaio.getDataEnsaio() != null
                && ensaio.getDataEnsaio().isBefore(agora)) {
            itens.add(notificacao(
                    "ENSAIO_ATRASADO:" + ensaio.getId(),
                    "ENSAIO_ATRASADO",
                    "ALTA",
                    "Ensaio com data passada",
                    nomeCliente(ensaio) + " esta com data passada e ainda esta agendado.",
                    ensaio,
                    ensaio.getDataEnsaio()));
        }
    }

    private void adicionarSelecaoEnviada(
            List<NotificacaoResponse> itens,
            Ensaio ensaio,
            List<SelecaoFoto> selecoes
    ) {
        if (ensaio.getStatus() != StatusEnsaio.EM_SELECAO || selecoes.isEmpty()) {
            return;
        }

        OffsetDateTime referencia = selecoes.stream()
                .map(SelecaoFoto::getSelecionadaEm)
                .filter(data -> data != null)
                .max(OffsetDateTime::compareTo)
                .orElse(ensaio.getAtualizadoEm());

        itens.add(notificacao(
                "SELECAO_ENVIADA:" + ensaio.getId() + ":" + epoch(referencia),
                "SELECAO_ENVIADA",
                "ALTA",
                "Seleção recebida",
                nomeCliente(ensaio) + " enviou a selecao. Revise as fotos escolhidas.",
                ensaio,
                referencia));
    }

    private void adicionarAlbumExpirando(
            List<NotificacaoResponse> itens,
            Ensaio ensaio,
            Album album,
            List<SelecaoFoto> selecoes,
            OffsetDateTime agora
    ) {
        if (!albumPublicado(album) || album.getExpiraEm() == null) {
            return;
        }

        long dias = Duration.between(agora, album.getExpiraEm()).toDays();

        if (dias >= 0 && dias <= 3) {
            String descricao = selecoes.isEmpty()
                    ? nomeCliente(ensaio) + " ainda nao selecionou fotos e o album expira em " + dias + " dia(s)."
                    : "Album de " + nomeCliente(ensaio) + " expira em " + dias + " dia(s).";

            itens.add(notificacao(
                    "ALBUM_EXPIRANDO:" + ensaio.getId() + ":" + album.getExpiraEm().toLocalDate(),
                    "ALBUM_EXPIRANDO",
                    selecoes.isEmpty() ? "ALTA" : "MEDIA",
                    "Album perto de expirar",
                    descricao,
                    ensaio,
                    album.getExpiraEm()));
        }
    }

    private void adicionarClienteSemSelecao(
            List<NotificacaoResponse> itens,
            Ensaio ensaio,
            Album album,
            List<SelecaoFoto> selecoes,
            OffsetDateTime agora
    ) {
        if (ensaio.getStatus() != StatusEnsaio.EM_SELECAO
                || !albumPublicado(album)
                || album.getPublicadoEm() == null
                || !selecoes.isEmpty()) {
            return;
        }

        long dias = Duration.between(album.getPublicadoEm(), agora).toDays();

        if (dias >= DIAS_SEM_SELECAO) {
            itens.add(notificacao(
                    "SELECAO_SEM_RESPOSTA:" + ensaio.getId() + ":" + album.getPublicadoEm().toLocalDate(),
                    "SELECAO_SEM_RESPOSTA",
                    "MEDIA",
                    "Seleção ainda não recebida",
                    nomeCliente(ensaio) + " ainda nao selecionou as fotos ha " + dias + " dias.",
                    ensaio,
                    album.getPublicadoEm()));
        }
    }

    private void adicionarStatusParado(
            List<NotificacaoResponse> itens,
            Ensaio ensaio,
            OffsetDateTime agora
    ) {
        if (ensaio.getStatus() == null
                || ensaio.getStatus() == StatusEnsaio.AGENDADO
                || ensaio.getStatus() == StatusEnsaio.CANCELADO
                || ensaio.getStatus() == StatusEnsaio.FINALIZADO) {
            return;
        }

        OffsetDateTime desde = buscarDataStatusAtual(ensaio);
        long dias = desde == null ? 0 : Duration.between(desde, agora).toDays();

        if (dias >= DIAS_STATUS_PARADO) {
            itens.add(notificacao(
                    "STATUS_PARADO:" + ensaio.getId() + ":" + ensaio.getStatus() + ":" + desde.toLocalDate(),
                    "STATUS_PARADO",
                    "MEDIA",
                    "Ensaio parado no mesmo status",
                    nomeCliente(ensaio) + " esta ha " + dias + " dias em " + formatarStatus(ensaio.getStatus()) + ".",
                    ensaio,
                    desde));
        }
    }

    private void adicionarEntregaAtrasada(
            List<NotificacaoResponse> itens,
            Ensaio ensaio,
            OffsetDateTime agora
    ) {
        if (ensaio.getStatus() != StatusEnsaio.EM_EDICAO) {
            return;
        }

        OffsetDateTime desde = buscarDataStatusAtual(ensaio);
        long dias = desde == null ? 0 : Duration.between(desde, agora).toDays();

        if (dias >= DIAS_EDICAO_ATRASADA) {
            itens.add(notificacao(
                    "ENTREGA_ATRASADA:" + ensaio.getId() + ":" + desde.toLocalDate(),
                    "ENTREGA_ATRASADA",
                    "ALTA",
                    "Entrega pode estar atrasada",
                    nomeCliente(ensaio) + " esta em edicao ha " + dias + " dias.",
                    ensaio,
                    desde));
        }
    }

    private void adicionarPagamentoPendente(List<NotificacaoResponse> itens, Ensaio ensaio) {
        if (ensaio.getStatus() != StatusEnsaio.FINALIZADO
                || isValorRecebido(ensaio)) {
            return;
        }

        itens.add(notificacao(
                "PAGAMENTO_PENDENTE:" + ensaio.getId(),
                "PAGAMENTO_PENDENTE",
                "MEDIA",
                "Pagamento pendente ou não informado",
                resolverDescricaoPagamentoPendente(ensaio),
                ensaio,
                ensaio.getAtualizadoEm()));
    }

    private boolean isValorRecebido(Ensaio ensaio) {
        return ensaio.getStatusValores() != null
                && "PAGO".equalsIgnoreCase(ensaio.getStatusValores().trim());
    }

    private String resolverDescricaoPagamentoPendente(Ensaio ensaio) {
        String statusValores = ensaio.getStatusValores();
        String cliente = nomeCliente(ensaio);

        if (statusValores == null || statusValores.isBlank()) {
            return cliente + " esta entregue, mas o pagamento ainda nao foi informado.";
        }

        if ("PENDENTE".equalsIgnoreCase(statusValores.trim())) {
            return cliente + " esta entregue, mas os valores continuam pendentes.";
        }

        return cliente + " esta entregue, mas o pagamento ainda nao foi confirmado.";
    }

    private NotificacaoResponse notificacao(
            String chave,
            String tipo,
            String prioridade,
            String titulo,
            String descricao,
            Ensaio ensaio,
            OffsetDateTime dataReferencia
    ) {
        return NotificacaoResponse.builder()
                .chave(chave)
                .tipo(tipo)
                .prioridade(prioridade)
                .titulo(titulo)
                .descricao(descricao)
                .ensaioId(ensaio.getId())
                .clienteNome(nomeCliente(ensaio))
                .actionUrl("PAGAMENTO_PENDENTE".equals(tipo)
                        ? "/ensaios/" + ensaio.getId() + "?editar=valores"
                        : "/ensaios/" + ensaio.getId())
                .dataReferencia(dataReferencia)
                .build();
    }

    private OffsetDateTime buscarDataStatusAtual(Ensaio ensaio) {
        List<HistoricoStatusEnsaio> historico = historicoStatusEnsaioRepository
                .findByEnsaioIdOrderByAlteradoEmAsc(ensaio.getId());

        return historico.stream()
                .filter(item -> item.getStatus() == ensaio.getStatus())
                .map(HistoricoStatusEnsaio::getAlteradoEm)
                .filter(data -> data != null)
                .max(OffsetDateTime::compareTo)
                .orElse(ensaio.getAtualizadoEm());
    }

    private Usuario buscarUsuarioLogado() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();

        return usuarioRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Usuario nao encontrada"));
    }

    private boolean albumPublicado(Album album) {
        return album != null
                && Boolean.TRUE.equals(album.getAtivo())
                && Boolean.TRUE.equals(album.getAcessoLiberado());
    }

    private String nomeCliente(Ensaio ensaio) {
        return ensaio.getCliente() != null && ensaio.getCliente().getNome() != null
                ? ensaio.getCliente().getNome()
                : "Cliente";
    }

    private long epoch(OffsetDateTime data) {
        return data == null ? 0 : data.toEpochSecond();
    }

    private Duration duracaoSilencio(String chave) {
        String tipo = chave == null ? "" : chave.split(":", 2)[0];

        return switch (tipo) {
            case "ENSAIO_ATRASADO", "ENTREGA_ATRASADA" -> SILENCIO_ALERTA_CRITICO;
            case "SELECAO_ENVIADA", "PAGAMENTO_PENDENTE" -> SILENCIO_ALERTA_ACAO;
            case "ALBUM_EXPIRANDO" -> SILENCIO_ALERTA_PRAZO;
            case "SELECAO_SEM_RESPOSTA", "STATUS_PARADO" -> SILENCIO_ALERTA_ACOMPANHAMENTO;
            default -> SILENCIO_ALERTA_ACAO;
        };
    }

    private int pesoPrioridade(NotificacaoResponse notificacao) {
        return switch (notificacao.getPrioridade()) {
            case "ALTA" -> 0;
            case "MEDIA" -> 1;
            default -> 2;
        };
    }

    private String formatarStatus(StatusEnsaio status) {
        return switch (status) {
            case AGENDADO -> "Agendado";
            case REALIZADO -> "Realizado";
            case EM_SELECAO -> "Em selecao";
            case EM_EDICAO -> "Em edicao";
            case FINALIZADO -> "Entregue";
            case CANCELADO -> "Cancelado";
        };
    }
}
