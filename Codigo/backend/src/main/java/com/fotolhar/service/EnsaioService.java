package com.fotolhar.service;

import com.fotolhar.dto.EnsaioRequest;
import com.fotolhar.dto.EnsaioConflitoAgendaResponse;
import com.fotolhar.dto.EnsaioDetalhesResponse;
import com.fotolhar.dto.EnsaioNotasInternasRequest;
import com.fotolhar.dto.EnsaioObservacoesRequest;
import com.fotolhar.dto.EnsaioResponse;
import com.fotolhar.dto.EnsaioStatusRequest;
import com.fotolhar.dto.FotoResponse;
import com.fotolhar.dto.HistoricoStatusEnsaioResponse;
import com.fotolhar.dto.AlbumAdminResponseDTO;
import com.fotolhar.dto.SelecaoResponse;
import com.fotolhar.enums.StatusEnsaio;
import com.fotolhar.model.Cliente;
import com.fotolhar.model.Ensaio;
import com.fotolhar.model.Foto;
import com.fotolhar.model.Album;
import com.fotolhar.model.Usuario;
import com.fotolhar.repository.AlbumRepository;
import com.fotolhar.repository.ClienteRepository;
import com.fotolhar.repository.EnsaioRepository;
import com.fotolhar.repository.FotoRepository;
import com.fotolhar.repository.PreferenciasSistemaRepository;
import com.fotolhar.repository.SelecaoFotoRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
// Adiciona esse import no topo
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import com.fotolhar.enums.TipoEnsaio;
import com.fotolhar.specification.EnsaioSpecification;
import java.time.OffsetDateTime;
import java.util.Comparator;

@Service
@RequiredArgsConstructor
public class EnsaioService {

    private final EnsaioRepository ensaioRepository;
    private final ClienteRepository clienteRepository;
    private final FotoRepository fotoRepository;
    private final AlbumRepository albumRepository;
    private final SelecaoFotoRepository selecaoFotoRepository;
    private final PreferenciasSistemaRepository preferenciasSistemaRepository;
    private final EmailService emailService;
    private final UsuarioContextService usuarioContextService;
    private final FotoService fotoService;
    private final AlbumService albumService;
    private final AlbumPublicoService albumPublicoService;
    private final HistoricoStatusEnsaioService historicoStatusEnsaioService;

    
    

    @Transactional
    public EnsaioResponse criar(EnsaioRequest request) {
        Usuario usuario = usuarioContextService.getUsuarioLogado();
        Cliente cliente = buscarCliente(request.getClienteId());
        validarClienteDaUsuario(cliente, usuario);
        atualizarDadosCliente(cliente, request);
        cliente.setAtivo(true);
        

boolean cobrar = Boolean.TRUE.equals(request.getCobrarFotoExtra());

    if (cobrar && (request.getValorFotoExtra() == null ||
            request.getValorFotoExtra().compareTo(BigDecimal.ZERO) <= 0)) {
        throw new ResponseStatusException(
            HttpStatus.BAD_REQUEST,
            "Informe o valor da foto extra quando cobrar_foto_extra for true"
        );
    }


    // Logo após a validação do cobrarFotoExtra, adicionar:
if (request.getValorPacote() == null || 
    request.getValorPacote().compareTo(BigDecimal.ZERO) <= 0) {
    throw new ResponseStatusException(
        HttpStatus.BAD_REQUEST,
        "Informe o valor do pacote"
    );
}
Ensaio ensaio = Ensaio.builder()
        .cliente(cliente)
        .tipo(request.getTipo())
        .tipoPersonalizado(resolverTipoPersonalizado(request, null))
        .status(StatusEnsaio.AGENDADO)
        .dataEnsaio(request.getDataEnsaio())
        .local(request.getLocal())
        .cidadeEnsaio(normalizarTexto(request.getCidadeEnsaio()))
        .estadoEnsaio(normalizarUf(request.getEstadoEnsaio()))
        .enderecoCompleto(normalizarTexto(request.getEnderecoCompleto()))
        .referenciaLocal(normalizarTexto(request.getReferenciaLocal()))
        .qtdFotosPacote(request.getQtdFotosPacote())
        .valorPacote(request.getValorPacote())
        .cobrarFotoExtra(cobrar)
         .valorFotoExtra(cobrar ? request.getValorFotoExtra() : null)
        .valorFinalEnsaio(request.getValorFinalEnsaio())
        .statusValores(normalizarStatusValores(request.getStatusValores()))
        .observacaoValores(normalizarTexto(request.getObservacaoValores()))
        .observacoes(request.getObservacoes())
        .progresso(resolverProgresso(StatusEnsaio.AGENDADO))
        .build();

        Ensaio salvo = ensaioRepository.save(ensaio);
        executarAposCommit(() -> emailService.avisarEnsaioAgendado(salvo));

        return toResponse(salvo);
    }
@Transactional(readOnly = true)
public List<EnsaioResponse> listar(
        StatusEnsaio status,
        TipoEnsaio tipo,
        OffsetDateTime dataInicio,
        OffsetDateTime dataFim,
        String clienteNome
) {
    Usuario usuario = usuarioContextService.getUsuarioLogado();
    List<Ensaio> ensaios = ensaioRepository.findAll(
            EnsaioSpecification.filtrar(usuario.getId(), status, tipo, dataInicio, dataFim, clienteNome));
    EnsaioResponseContext responseContext = criarResponseContext(ensaios);

    return ensaios
            .stream()
            .map(ensaio -> toResponse(ensaio, responseContext))
            .collect(Collectors.toList());
}

    @Transactional(readOnly = true)
    public EnsaioResponse buscarPorId(UUID id) {
        return toResponse(buscarEnsaio(id));
    }

    @Transactional(readOnly = true)
    public EnsaioDetalhesResponse buscarDetalhes(UUID id) {
        EnsaioResponse ensaio = buscarPorId(id);
        List<FotoResponse> fotos = fotoService.listarPorEnsaio(id);
        List<HistoricoStatusEnsaioResponse> historicoStatus =
                historicoStatusEnsaioService.listarPorEnsaio(id);

        AlbumAdminResponseDTO album = null;
        SelecaoResponse selecao = null;

        try {
            album = albumService.buscarAlbumPorEnsaio(id);

            boolean albumPublicado =
                    Boolean.TRUE.equals(album.getAtivo()) &&
                    Boolean.TRUE.equals(album.getAcessoLiberado());

            if (albumPublicado && album.getTokenUrl() != null) {
                try {
                    selecao = albumPublicoService.buscarSelecao(album.getTokenUrl());
                } catch (ResponseStatusException ex) {
                    if (ex.getStatusCode() != HttpStatus.NOT_FOUND) {
                        throw ex;
                    }
                }
            }
        } catch (ResponseStatusException ex) {
            if (ex.getStatusCode() != HttpStatus.NOT_FOUND) {
                throw ex;
            }
        }

        return EnsaioDetalhesResponse.builder()
                .ensaio(ensaio)
                .fotos(fotos)
                .album(album)
                .historicoStatus(historicoStatus)
                .selecao(selecao)
                .build();
    }

    @Transactional(readOnly = true)
    public EnsaioConflitoAgendaResponse buscarConflitoAgenda(OffsetDateTime dataEnsaio) {
        if (dataEnsaio == null) {
            return EnsaioConflitoAgendaResponse.builder()
                    .conflito(false)
                    .build();
        }

        OffsetDateTime inicio = dataEnsaio.minusMinutes(90);
        OffsetDateTime fim = dataEnsaio.plusMinutes(90);
        Usuario usuario = usuarioContextService.getUsuarioLogado();

        return ensaioRepository
                .findByClienteUsuarioIdAndDataEnsaioBetweenAndStatusNotOrderByDataEnsaioAsc(
                        usuario.getId(),
                        inicio,
                        fim,
                        StatusEnsaio.CANCELADO
                )
                .stream()
                .min(Comparator.comparing(ensaio ->
                        Math.abs(ensaio.getDataEnsaio().toInstant().toEpochMilli()
                                - dataEnsaio.toInstant().toEpochMilli())
                ))
                .map(this::toConflitoAgendaResponse)
                .orElseGet(() -> EnsaioConflitoAgendaResponse.builder()
                        .conflito(false)
                        .build());
    }

    @Transactional
    public EnsaioResponse atualizar(UUID id, EnsaioRequest request) {
        Usuario usuario = usuarioContextService.getUsuarioLogado();
        Ensaio ensaio = buscarEnsaio(id);
        Cliente cliente = buscarCliente(request.getClienteId());
        validarClienteDaUsuario(cliente, usuario);
        atualizarDadosCliente(cliente, request);

        ensaio.setCliente(cliente);
        ensaio.setTipo(request.getTipo());
        ensaio.setTipoPersonalizado(resolverTipoPersonalizado(request, ensaio));
        ensaio.setDataEnsaio(request.getDataEnsaio());
        ensaio.setLocal(request.getLocal());
        ensaio.setCidadeEnsaio(normalizarTexto(request.getCidadeEnsaio()));
        ensaio.setEstadoEnsaio(normalizarUf(request.getEstadoEnsaio()));
        ensaio.setEnderecoCompleto(normalizarTexto(request.getEnderecoCompleto()));
        ensaio.setReferenciaLocal(normalizarTexto(request.getReferenciaLocal()));
        // ✅ Direto — @NotNull no DTO já protege
         ensaio.setQtdFotosPacote(request.getQtdFotosPacote());
        ensaio.setValorPacote(request.getValorPacote());
        ensaio.setObservacoes(request.getObservacoes()); 
       
boolean cobrar = Boolean.TRUE.equals(request.getCobrarFotoExtra());
if (cobrar && (request.getValorFotoExtra() == null ||
        request.getValorFotoExtra().compareTo(BigDecimal.ZERO) <= 0)) {
    throw new ResponseStatusException(
        HttpStatus.BAD_REQUEST,
        "Informe o valor da foto extra quando cobrar_foto_extra for true"
    );
}

if (request.getValorPacote() == null || 
    request.getValorPacote().compareTo(BigDecimal.ZERO) <= 0) {
    throw new ResponseStatusException(
        HttpStatus.BAD_REQUEST,
        "Informe o valor do pacote"
    );
}
ensaio.setCobrarFotoExtra(cobrar);
ensaio.setValorFotoExtra(cobrar ? request.getValorFotoExtra() : null);
ensaio.setValorFinalEnsaio(request.getValorFinalEnsaio());
ensaio.setStatusValores(normalizarStatusValores(request.getStatusValores()));
ensaio.setObservacaoValores(normalizarTexto(request.getObservacaoValores()));

        return toResponse(ensaioRepository.save(ensaio));
    }


@Transactional
public void deletar(UUID id) {
    Ensaio ensaio = buscarEnsaio(id);

    if (ensaio.getStatus() != StatusEnsaio.AGENDADO &&
        ensaio.getStatus() != StatusEnsaio.CANCELADO) {
        throw new IllegalStateException(
            "Ensaio só pode ser deletado se estiver AGENDADO ou CANCELADO. " +
            "Status atual: " + ensaio.getStatus()
        );
    }

    ensaioRepository.delete(ensaio);
}

    /**
     * PATCH /ensaios/{id}/status
     * Atualiza o status e recalcula o progresso automaticamente.
     */
    @Transactional
    public EnsaioResponse atualizarStatus(UUID id, EnsaioStatusRequest request) {
        Ensaio ensaio = buscarEnsaio(id);
        ensaio.setStatus(request.getStatus());
        ensaio.setProgresso(resolverProgresso(request.getStatus()));
        Ensaio salvo = ensaioRepository.save(ensaio);
        emailService.avisarStatusAlterado(salvo, request.getStatus());
        return toResponse(salvo);
    }

    @Transactional
    public EnsaioResponse atualizarObservacoes(UUID id, EnsaioObservacoesRequest request) {
        Ensaio ensaio = buscarEnsaio(id);
        ensaio.setObservacoes(normalizarTexto(request.getObservacoes()));
        return toResponse(ensaioRepository.save(ensaio));
    }

    @Transactional
    public EnsaioResponse atualizarNotasInternas(UUID id, EnsaioNotasInternasRequest request) {
        Ensaio ensaio = buscarEnsaio(id);
        ensaio.setNotasInternas(normalizarTexto(request.getNotasInternas()));
        return toResponse(ensaioRepository.save(ensaio));
    }

    // ── helpers ─────────────────────────────────────────────────────────────

    @Transactional
    public EnsaioResponse aprovarSelecao(UUID id) {
        Ensaio ensaio = buscarEnsaio(id);

        if (ensaio.getStatus() == StatusEnsaio.FINALIZADO ||
                ensaio.getStatus() == StatusEnsaio.CANCELADO) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Nao e possivel aprovar selecao para um ensaio finalizado ou cancelado"
            );
        }

        Album album = albumRepository.findByEnsaioIdAndEnsaioClienteUsuarioId(
                        id,
                        ensaio.getCliente().getUsuario().getId()
                )
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "Publique o album antes de aprovar a selecao"
                ));

        if (!selecaoFotoRepository.existsByAlbumId(album.getId())) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "A seleção ainda não foi enviada"
            );
        }

        ensaio.setStatus(StatusEnsaio.EM_EDICAO);
        ensaio.setProgresso(resolverProgresso(StatusEnsaio.EM_EDICAO));

        Ensaio salvo = ensaioRepository.save(ensaio);
        emailService.avisarStatusAlterado(salvo, StatusEnsaio.EM_EDICAO);

        return toResponse(salvo);
    }

    private Ensaio buscarEnsaio(UUID id) {
        Usuario usuario = usuarioContextService.getUsuarioLogado();

        return ensaioRepository.findByIdAndClienteUsuarioId(id, usuario.getId())
                .orElseThrow(() -> new EntityNotFoundException("Ensaio não encontrado com id: " + id));
    }

    private Cliente buscarCliente(UUID clienteId) {
        Usuario usuario = usuarioContextService.getUsuarioLogado();

        return clienteRepository.findByIdAndUsuarioId(clienteId, usuario.getId())
                .orElseThrow(() -> new EntityNotFoundException("Cliente não encontrado com id: " + clienteId));
    }

    private void validarClienteDaUsuario(Cliente cliente, Usuario usuario) {
        if (cliente.getUsuario() == null || !cliente.getUsuario().getId().equals(usuario.getId())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Cliente não encontrado com id: " + cliente.getId());
        }
    }

    /**
     * Regra de negócio: progresso automático por status.
     * AGENDADO=0 | REALIZADO=25 | EM_SELECAO=50 | EM_EDICAO=75 | FINALIZADO=100 | CANCELADO=0
     */
    private Short resolverProgresso(StatusEnsaio status) {
        return (short) switch (status) {
            case AGENDADO   -> 0;
            case REALIZADO  -> 25;
            case EM_SELECAO -> 50;
            case EM_EDICAO  -> 75;
            case FINALIZADO -> 100;
            case CANCELADO  -> 0;
        };
    }


    private void atualizarDadosCliente(Cliente cliente, EnsaioRequest request) {
    if (request.getClienteNome() != null && !request.getClienteNome().trim().isEmpty()) {
        cliente.setNome(request.getClienteNome().trim());
    }

    if (request.getClienteEmail() != null) {
        cliente.setEmail(normalizarTexto(request.getClienteEmail()));
    }

    if (request.getClienteTelefone() != null) {
        cliente.setTelefone(normalizarTexto(request.getClienteTelefone()));
    }

    if (request.getClienteCpf() != null) {
        cliente.setCpf(normalizarTexto(request.getClienteCpf()));
    }

    if (request.getClienteCidade() != null) {
        cliente.setCidade(normalizarTexto(request.getClienteCidade()));
    }

    if (request.getClienteIndicacao() != null) {
        cliente.setIndicacao(normalizarTexto(request.getClienteIndicacao()));
    }
}

private String normalizarTexto(String valor) {
    if (valor == null) return null;

    String texto = valor.trim();

    return texto.isEmpty() ? null : texto;
}

private String normalizarUf(String valor) {
    String texto = normalizarTexto(valor);
    return texto == null ? null : texto.toUpperCase();
}

private String normalizarStatusValores(String valor) {
    String status = normalizarTexto(valor);

    if (status == null) {
        return "NAO_INFORMADO";
    }

    return status;
}

private String resolverTipoPersonalizado(EnsaioRequest request, Ensaio ensaioAtual) {
    if (request.getTipo() != TipoEnsaio.OUTRO) {
        return null;
    }

    String tipoPersonalizado = normalizarTexto(request.getTipoPersonalizado());

    if (tipoPersonalizado != null) {
        return tipoPersonalizado;
    }

    if (ensaioAtual != null) {
        return ensaioAtual.getTipoPersonalizado();
    }

    throw new ResponseStatusException(
            HttpStatus.BAD_REQUEST,
            "Informe o tipo personalizado quando o tipo do ensaio for Outro"
    );
}

private String resolverTipoExibicao(Ensaio ensaio) {
    if (ensaio == null || ensaio.getTipo() == null) {
        return null;
    }

    if (ensaio.getTipo() == TipoEnsaio.OUTRO) {
        String tipoPersonalizado = normalizarTexto(ensaio.getTipoPersonalizado());
        if (tipoPersonalizado != null) {
            return tipoPersonalizado;
        }
    }

    return ensaio.getTipo().getDescricao();
}

private record EnsaioResponseContext(
        Map<UUID, Integer> totalFotosPorEnsaio,
        Map<UUID, String> capaUrlPorEnsaio,
        String capaAlbumPadraoUrl
) {
}

private EnsaioResponseContext criarResponseContext(List<Ensaio> ensaios) {
    if (ensaios == null || ensaios.isEmpty()) {
        return new EnsaioResponseContext(Map.of(), Map.of(), null);
    }

    List<UUID> ensaioIds = ensaios.stream()
            .map(Ensaio::getId)
            .toList();
    List<Foto> fotos = fotoRepository.findByEnsaioIdInOrderByOrdemAscEnviadaEmAsc(ensaioIds);
    Map<UUID, Integer> totalFotosPorEnsaio = new HashMap<>();
    Map<UUID, Foto> capaPorEnsaio = new HashMap<>();
    String capaAlbumPadraoUrl = buscarCapaAlbumPadrao();

    for (Foto foto : fotos) {
        UUID ensaioId = foto.getEnsaio().getId();
        Foto capaAtual = capaPorEnsaio.get(ensaioId);

        totalFotosPorEnsaio.merge(ensaioId, 1, Integer::sum);

        if (capaAtual == null || (!Boolean.TRUE.equals(capaAtual.getEhCapa()) && Boolean.TRUE.equals(foto.getEhCapa()))) {
            capaPorEnsaio.put(ensaioId, foto);
        }
    }

    Map<UUID, String> capaUrlPorEnsaio = capaPorEnsaio.entrySet()
            .stream()
            .collect(Collectors.toMap(
                    Map.Entry::getKey,
                    entry -> resolverCapaUrl(entry.getValue(), capaAlbumPadraoUrl)
            ));

    return new EnsaioResponseContext(totalFotosPorEnsaio, capaUrlPorEnsaio, capaAlbumPadraoUrl);
}

private String resolverCapaUrl(Foto capa, String capaAlbumPadraoUrl) {
    return capa == null
            ? capaAlbumPadraoUrl
            : resolverCapaUrl(capa.getUrlWatermark(), capa.getUrlOriginal(), capaAlbumPadraoUrl);
}

private String resolverCapaUrl(String urlWatermark, String urlOriginal, String capaAlbumPadraoUrl) {
    if (urlWatermark != null && !urlWatermark.isBlank()) {
        return urlWatermark;
    }

    if (urlOriginal != null && !urlOriginal.isBlank()) {
        return urlOriginal;
    }

    return capaAlbumPadraoUrl;
}

private String resolverCapaUrl(UUID ensaioId, EnsaioResponseContext responseContext) {
    return responseContext.capaUrlPorEnsaio().getOrDefault(ensaioId, responseContext.capaAlbumPadraoUrl());
}

private int resolverTotalFotos(UUID ensaioId, EnsaioResponseContext responseContext) {
    return responseContext.totalFotosPorEnsaio().getOrDefault(ensaioId, 0);
}

private EnsaioResponse toResponse(Ensaio ensaio) {
    return toResponse(ensaio, criarResponseContext(List.of(ensaio)));
}

private EnsaioResponse toResponse(Ensaio ensaio, EnsaioResponseContext responseContext) {
    return EnsaioResponse.builder()
            .id(ensaio.getId())

            .clienteId(ensaio.getCliente().getId())
            .clienteNome(ensaio.getCliente().getNome())
            .clienteTelefone(ensaio.getCliente().getTelefone())
            .clienteEmail(ensaio.getCliente().getEmail())
            .clienteCpf(ensaio.getCliente().getCpf())
            .clienteCidade(ensaio.getCliente().getCidade())
            .clienteIndicacao(ensaio.getCliente().getIndicacao())

            .tipo(ensaio.getTipo())
            .tipoPersonalizado(ensaio.getTipoPersonalizado())
            .tipoExibicao(resolverTipoExibicao(ensaio))
            .status(ensaio.getStatus())
            .dataEnsaio(ensaio.getDataEnsaio())
            .local(ensaio.getLocal())
            .cidadeEnsaio(ensaio.getCidadeEnsaio())
            .estadoEnsaio(ensaio.getEstadoEnsaio())
            .enderecoCompleto(ensaio.getEnderecoCompleto())
            .referenciaLocal(ensaio.getReferenciaLocal())

            .qtdFotosPacote(ensaio.getQtdFotosPacote())
            .valorPacote(ensaio.getValorPacote())
            .valorFotoExtra(ensaio.getValorFotoExtra())
            .cobrarFotoExtra(ensaio.getCobrarFotoExtra())
            .valorFinalEnsaio(ensaio.getValorFinalEnsaio())
            .statusValores(ensaio.getStatusValores())
            .observacaoValores(ensaio.getObservacaoValores())

            .observacoes(ensaio.getObservacoes())
            .notasInternas(ensaio.getNotasInternas())
            .progresso(ensaio.getProgresso())
            .totalFotos(resolverTotalFotos(ensaio.getId(), responseContext))
            .capaUrl(resolverCapaUrl(ensaio.getId(), responseContext))

            .criadoEm(ensaio.getCriadoEm())
            .atualizadoEm(ensaio.getAtualizadoEm())
            .build();
}

private EnsaioConflitoAgendaResponse toConflitoAgendaResponse(Ensaio ensaio) {
    return EnsaioConflitoAgendaResponse.builder()
            .conflito(true)
            .ensaioId(ensaio.getId())
            .clienteId(ensaio.getCliente().getId())
            .clienteNome(ensaio.getCliente().getNome())
            .dataEnsaio(ensaio.getDataEnsaio())
            .local(ensaio.getLocal())
            .status(ensaio.getStatus())
            .build();
}

private String buscarCapaUrl(UUID ensaioId) {
    List<Foto> fotos = fotoRepository.findByEnsaioIdOrderByOrdemAscEnviadaEmAsc(ensaioId);

    if (fotos.isEmpty()) {
        return buscarCapaAlbumPadrao();
    }

    Foto capa = fotos.stream()
            .filter(foto -> Boolean.TRUE.equals(foto.getEhCapa()))
            .findFirst()
            .orElse(fotos.get(0));

    if (capa.getUrlWatermark() != null && !capa.getUrlWatermark().isBlank()) {
        return capa.getUrlWatermark();
    }

    if (capa.getUrlOriginal() != null && !capa.getUrlOriginal().isBlank()) {
        return capa.getUrlOriginal();
    }

    return buscarCapaAlbumPadrao();
}

private String buscarCapaAlbumPadrao() {
    Usuario usuario = usuarioContextService.getUsuarioLogado();

    return preferenciasSistemaRepository.findByUsuarioId(usuario.getId())
            .map(preferencias -> preferencias.getCapaAlbumPadraoUrl())
            .orElse(null);
}

private void executarAposCommit(Runnable action) {
    if (TransactionSynchronizationManager.isSynchronizationActive()) {
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                action.run();
            }
        });
        return;
    }

    action.run();
}
}
