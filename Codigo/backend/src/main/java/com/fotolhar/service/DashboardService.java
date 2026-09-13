package com.fotolhar.service;

import com.fotolhar.dto.DashboardAtencaoResponse;
import com.fotolhar.dto.DashboardEnsaioResumoResponse;
import com.fotolhar.dto.DashboardFluxoEtapaResponse;
import com.fotolhar.dto.DashboardReceitaHistoricoResponse;
import com.fotolhar.dto.DashboardRegiaoDemandaResponse;
import com.fotolhar.dto.DashboardResumoResponse;
import com.fotolhar.dto.RelatorioTipoEnsaioResponse;
import com.fotolhar.enums.StatusEnsaio;
import com.fotolhar.enums.TipoEnsaio;
import com.fotolhar.model.Album;
import com.fotolhar.model.Cliente;
import com.fotolhar.model.Ensaio;
import com.fotolhar.model.Foto;
import com.fotolhar.model.HistoricoStatusEnsaio;
import com.fotolhar.model.SelecaoFoto;
import com.fotolhar.model.Usuario;
import com.fotolhar.repository.AlbumRepository;
import com.fotolhar.repository.ClienteRepository;
import com.fotolhar.repository.EnsaioRepository;
import com.fotolhar.repository.FotoRepository;
import com.fotolhar.repository.HistoricoStatusEnsaioRepository;
import com.fotolhar.repository.PreferenciasSistemaRepository;
import com.fotolhar.repository.SelecaoFotoRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.YearMonth;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DashboardService {

    private static final int DIAS_EDICAO_ATRASADA = 14;
    private static final int HISTORICO_RECENTE_DIAS = 180;
    private static final String RECEITA_PERIODO_PADRAO = "ESTE_MES";
    private static final ZoneId APP_ZONE = ZoneId.of("America/Sao_Paulo");

    private final EnsaioRepository ensaioRepository;
    private final ClienteRepository clienteRepository;
    private final FotoRepository fotoRepository;
    private final AlbumRepository albumRepository;
    private final HistoricoStatusEnsaioRepository historicoStatusEnsaioRepository;
    private final SelecaoFotoRepository selecaoFotoRepository;
    private final PreferenciasSistemaRepository preferenciasSistemaRepository;
    private final UsuarioContextService usuarioContextService;

    @Transactional(readOnly = true)
    public DashboardResumoResponse buscarResumo() {
        Usuario usuario = usuarioContextService.getUsuarioLogado();
        List<Ensaio> ensaios = ensaioRepository.findByClienteUsuarioId(usuario.getId());
        Map<UUID, Album> albumPorEnsaio = buscarAlbunsPorEnsaio(usuario);
        Map<UUID, List<Foto>> fotosPorEnsaio = buscarFotosPorEnsaio(ensaios);
        Map<UUID, List<SelecaoFoto>> selecoesPorAlbum = buscarSelecoesPorAlbum(albumPorEnsaio);
        Map<UUID, List<HistoricoStatusEnsaio>> historicoPorEnsaio = buscarHistoricoPorEnsaio(ensaios);
        String capaAlbumPadrao = buscarCapaAlbumPadrao(usuario);

        OffsetDateTime agora = agoraNoFusoDoApp();
        YearMonth mesAtual = YearMonth.from(agora);
        OffsetDateTime daquiSeteDias = agora.plusDays(7);

        long totalEnsaios = ensaios.stream()
                .filter(ensaio -> ensaio.getStatus() != StatusEnsaio.CANCELADO)
                .count();

        List<Ensaio> ensaiosEsteMes = ensaios.stream()
                .filter(ensaio -> pertenceAoMes(ensaio, mesAtual))
                .filter(ensaio -> ensaio.getStatus() != StatusEnsaio.CANCELADO)
                .toList();

        Map<UUID, Integer> totalSelecoesPorAlbum = contarSelecoesPorAlbum(
                albumPorEnsaio,
                selecoesPorAlbum
        );

        BigDecimal receitaEstimada = ensaiosEsteMes.stream()
                .map(ensaio -> calcularValorTotalDoEnsaio(
                        ensaio,
                        albumPorEnsaio,
                        totalSelecoesPorAlbum
                ))
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        List<DashboardReceitaHistoricoResponse> receitaPrevistaHistorico = montarHistoricoReceitaEstimada(
                ensaios,
                albumPorEnsaio,
                totalSelecoesPorAlbum,
                mesAtual
        );

        List<Ensaio> ensaiosDoDia = buscarEnsaiosDoDia(ensaios, agora);
        int ensaiosHoje = ensaiosDoDia.size();
        int selecoesEnviadas = contarSelecoesEnviadas(ensaios, albumPorEnsaio, selecoesPorAlbum);
        int ensaiosSemFotosEnviadas = contarEnsaiosSemFotos(ensaios, fotosPorEnsaio);
        int ensaiosFinalizadosMes = contarFinalizados(ensaiosEsteMes);

        List<Ensaio> proximosEnsaiosFuturos = buscarProximosEnsaiosFuturos(ensaios, agora);

        List<DashboardEnsaioResumoResponse> proximosEnsaios = proximosEnsaiosFuturos.stream()
                .limit(3)
                .map(ensaio -> toEnsaioResumo(ensaio, albumPorEnsaio, fotosPorEnsaio, selecoesPorAlbum, capaAlbumPadrao))
                .toList();

        List<DashboardEnsaioResumoResponse> agendaProxima = proximosEnsaiosFuturos.stream()
                .filter(ensaio -> !ensaio.getDataEnsaio().isAfter(daquiSeteDias))
                .limit(8)
                .map(ensaio -> toEnsaioResumo(ensaio, albumPorEnsaio, fotosPorEnsaio, selecoesPorAlbum, capaAlbumPadrao))
                .toList();

        List<DashboardEnsaioResumoResponse> ensaiosDoDiaResumo = ensaiosDoDia.stream()
                .map(ensaio -> toEnsaioResumo(ensaio, albumPorEnsaio, fotosPorEnsaio, selecoesPorAlbum, capaAlbumPadrao))
                .toList();

        List<Ensaio> ensaiosAtivos = ensaios.stream()
                .filter(this::isEnsaioEmAndamento)
                .sorted(Comparator.comparing(
                        Ensaio::getAtualizadoEm,
                        Comparator.nullsLast(Comparator.reverseOrder())
                ))
                .toList();

        List<DashboardEnsaioResumoResponse> ensaiosEmAndamento = ensaiosAtivos.stream()
                .limit(8)
                .map(ensaio -> toEnsaioResumo(ensaio, albumPorEnsaio, fotosPorEnsaio, selecoesPorAlbum, capaAlbumPadrao))
                .toList();

        List<DashboardEnsaioResumoResponse> ultimasAtualizacoes = ensaios.stream()
                .filter(ensaio -> ensaio.getStatus() != StatusEnsaio.CANCELADO)
                .sorted(Comparator.comparing(
                        Ensaio::getAtualizadoEm,
                        Comparator.nullsLast(Comparator.reverseOrder())
                ))
                .limit(5)
                .map(ensaio -> toEnsaioResumo(ensaio, albumPorEnsaio, fotosPorEnsaio, selecoesPorAlbum, capaAlbumPadrao))
                .toList();

        List<DashboardAtencaoResponse> atencaoNecessaria = montarAtencaoNecessaria(
                ensaios,
                albumPorEnsaio,
                fotosPorEnsaio,
                selecoesPorAlbum,
                historicoPorEnsaio
        );

        return DashboardResumoResponse.builder()
                .ensaiosEsteMes(ensaiosEsteMes.size())
                .totalEnsaios((int) totalEnsaios)
                .ensaiosHoje(ensaiosHoje)
                .ensaiosProximosSeteDias(agendaProxima.size())
                .ensaiosEmAndamentoTotal(ensaiosAtivos.size())
                .selecoesEnviadas(selecoesEnviadas)
                .ensaiosSemFotosEnviadas(ensaiosSemFotosEnviadas)
                .pendenciasTotal(atencaoNecessaria.size())
                .receitaEstimada(receitaEstimada)
                .receitaPrevistaHistorico(receitaPrevistaHistorico)
                .ensaiosFinalizadosMes(ensaiosFinalizadosMes)
                .pipelineStatus(montarPipelineStatus(ensaios))
                .proximoEnsaio(proximosEnsaios.isEmpty() ? null : proximosEnsaios.get(0))
                .ensaiosDoDia(ensaiosDoDiaResumo)
                .agendaProxima(agendaProxima)
                .proximosEnsaios(proximosEnsaios)
                .ensaiosEmAndamento(ensaiosEmAndamento)
                .ultimasAtualizacoes(ultimasAtualizacoes)
                .atencaoNecessaria(atencaoNecessaria)
                .desempenhoFluxo(montarDesempenhoFluxo(
                        ensaios,
                        albumPorEnsaio,
                        selecoesPorAlbum,
                        historicoPorEnsaio,
                        agora
                ))
                .regioesDemanda(montarRegioesDemanda(usuario))
                .receitaPorTipoEnsaio(montarReceitaPorTipoEnsaio(
                        ensaios,
                        albumPorEnsaio,
                        totalSelecoesPorAlbum,
                        resolverPeriodoReceita(RECEITA_PERIODO_PADRAO)
                ))
                .build();
    }

    private List<DashboardReceitaHistoricoResponse> montarHistoricoReceitaEstimada(
            List<Ensaio> ensaios,
            Map<UUID, Album> albumPorEnsaio,
            Map<UUID, Integer> totalSelecoesPorAlbum,
            YearMonth mesAtual
    ) {
        List<DashboardReceitaHistoricoResponse> historico = new ArrayList<>();

        for (int mesesAtras = 5; mesesAtras >= 0; mesesAtras--) {
            YearMonth mes = mesAtual.minusMonths(mesesAtras);
            BigDecimal valor = ensaios.stream()
                    .filter(ensaio -> ensaio.getStatus() != StatusEnsaio.CANCELADO)
                    .filter(ensaio -> pertenceAoMes(ensaio, mes))
                    .map(ensaio -> calcularValorTotalDoEnsaio(
                            ensaio,
                            albumPorEnsaio,
                            totalSelecoesPorAlbum
                    ))
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            historico.add(DashboardReceitaHistoricoResponse.builder()
                    .mes(mes.toString())
                    .valor(valor)
                    .build());
        }

        return historico;
    }

    private Map<UUID, Album> buscarAlbunsPorEnsaio(Usuario usuario) {
        return albumRepository.findByEnsaioClienteUsuarioId(usuario.getId())
                .stream()
                .filter(album -> album.getEnsaio() != null)
                .filter(album -> album.getEnsaio().getId() != null)
                .collect(Collectors.toMap(
                        album -> album.getEnsaio().getId(),
                        Function.identity(),
                        (albumExistente, albumNovo) -> albumExistente
                ));
    }

    private Map<UUID, List<Foto>> buscarFotosPorEnsaio(List<Ensaio> ensaios) {
        List<UUID> ensaioIds = ensaios.stream()
                .map(Ensaio::getId)
                .filter(java.util.Objects::nonNull)
                .toList();

        if (ensaioIds.isEmpty()) {
            return Map.of();
        }

        return fotoRepository.findByEnsaioIdInOrderByOrdemAscEnviadaEmAsc(ensaioIds)
                .stream()
                .filter(foto -> foto.getEnsaio() != null && foto.getEnsaio().getId() != null)
                .collect(Collectors.groupingBy(
                        foto -> foto.getEnsaio().getId(),
                        LinkedHashMap::new,
                        Collectors.toList()
                ));
    }

    private Map<UUID, List<SelecaoFoto>> buscarSelecoesPorAlbum(Map<UUID, Album> albumPorEnsaio) {
        List<UUID> albumIds = albumPorEnsaio.values()
                .stream()
                .map(Album::getId)
                .filter(java.util.Objects::nonNull)
                .toList();

        if (albumIds.isEmpty()) {
            return Map.of();
        }

        return selecaoFotoRepository.findByAlbumIdIn(albumIds)
                .stream()
                .filter(selecao -> selecao.getAlbum() != null && selecao.getAlbum().getId() != null)
                .collect(Collectors.groupingBy(
                        selecao -> selecao.getAlbum().getId(),
                        LinkedHashMap::new,
                        Collectors.toList()
                ));
    }

    private Map<UUID, List<HistoricoStatusEnsaio>> buscarHistoricoPorEnsaio(List<Ensaio> ensaios) {
        List<UUID> ensaioIds = ensaios.stream()
                .map(Ensaio::getId)
                .filter(java.util.Objects::nonNull)
                .toList();

        if (ensaioIds.isEmpty()) {
            return Map.of();
        }

        return historicoStatusEnsaioRepository.findByEnsaioIdInOrderByAlteradoEmAsc(ensaioIds)
                .stream()
                .filter(item -> item.getEnsaio() != null && item.getEnsaio().getId() != null)
                .collect(Collectors.groupingBy(
                        item -> item.getEnsaio().getId(),
                        LinkedHashMap::new,
                        Collectors.toList()
                ));
    }

    private Map<UUID, Integer> contarSelecoesPorAlbum(
            Map<UUID, Album> albumPorEnsaio,
            Map<UUID, List<SelecaoFoto>> selecoesPorAlbum
    ) {
        return albumPorEnsaio.values()
                .stream()
                .collect(Collectors.toMap(
                        Album::getId,
                        album -> selecoesPorAlbum.getOrDefault(album.getId(), List.of()).size()
                ));
    }

    private int contarEnsaiosHoje(List<Ensaio> ensaios, OffsetDateTime agora) {
        return (int) ensaios.stream()
                .filter(ensaio -> ensaio.getStatus() != StatusEnsaio.CANCELADO)
                .filter(ensaio -> ensaio.getDataEnsaio() != null)
                .filter(ensaio -> toAppLocalDate(ensaio.getDataEnsaio()).equals(agora.toLocalDate()))
                .count();
    }

    private List<Ensaio> buscarEnsaiosDoDia(List<Ensaio> ensaios, OffsetDateTime agora) {
        return ensaios.stream()
                .filter(ensaio -> ensaio.getStatus() != StatusEnsaio.CANCELADO)
                .filter(ensaio -> ensaio.getDataEnsaio() != null)
                .filter(ensaio -> toAppLocalDate(ensaio.getDataEnsaio()).equals(agora.toLocalDate()))
                .sorted(Comparator.comparing(Ensaio::getDataEnsaio))
                .toList();
    }

    private int contarSelecoesEnviadas(
            List<Ensaio> ensaios,
            Map<UUID, Album> albumPorEnsaio,
            Map<UUID, List<SelecaoFoto>> selecoesPorAlbum
    ) {
        return (int) ensaios.stream()
                .filter(ensaio -> ensaio.getStatus() == StatusEnsaio.EM_SELECAO)
                .filter(ensaio -> temSelecaoEnviada(ensaio, albumPorEnsaio, selecoesPorAlbum))
                .count();
    }

    private int contarEnsaiosSemFotos(
            List<Ensaio> ensaios,
            Map<UUID, List<Foto>> fotosPorEnsaio
    ) {
        return (int) ensaios.stream()
                .filter(ensaio -> ensaio.getStatus() == StatusEnsaio.REALIZADO)
                .filter(ensaio -> fotosPorEnsaio.getOrDefault(ensaio.getId(), List.of()).isEmpty())
                .count();
    }

    private int contarFinalizados(List<Ensaio> ensaios) {
        return (int) ensaios.stream()
                .filter(ensaio -> ensaio.getStatus() == StatusEnsaio.FINALIZADO)
                .count();
    }

    private List<DashboardFluxoEtapaResponse> montarDesempenhoFluxo(
            List<Ensaio> ensaios,
            Map<UUID, Album> albumPorEnsaio,
            Map<UUID, List<SelecaoFoto>> selecoesPorAlbum,
            Map<UUID, List<HistoricoStatusEnsaio>> historicoPorEnsaio,
            OffsetDateTime agora
    ) {
        OffsetDateTime limiteRecente = agora.minusDays(HISTORICO_RECENTE_DIAS);
        List<BigDecimal> ensaioParaAlbum = new ArrayList<>();
        List<BigDecimal> albumParaSelecao = new ArrayList<>();
        List<BigDecimal> selecaoParaFinalizacao = new ArrayList<>();

        for (Ensaio ensaio : ensaios) {
            Album album = albumPorEnsaio.get(ensaio.getId());

            if (album == null) {
                continue;
            }

            adicionarDuracaoEmDias(
                    ensaioParaAlbum,
                    ensaio.getDataEnsaio(),
                    album.getPublicadoEm(),
                    limiteRecente
            );

            OffsetDateTime dataSelecao = buscarDataSelecao(album, selecoesPorAlbum);

            adicionarDuracaoEmDias(
                    albumParaSelecao,
                    album.getPublicadoEm(),
                    dataSelecao,
                    limiteRecente
            );

            if (ensaio.getStatus() == StatusEnsaio.FINALIZADO) {
                OffsetDateTime dataFinalizacao = buscarUltimaDataStatus(
                                ensaio,
                                StatusEnsaio.FINALIZADO,
                                historicoPorEnsaio
                        )
                        .orElse(ensaio.getAtualizadoEm());

                adicionarDuracaoEmDias(
                        selecaoParaFinalizacao,
                        dataSelecao,
                        dataFinalizacao,
                        limiteRecente
                );
            }
        }

        return List.of(
                montarEtapaFluxo("ENSAIO_ALBUM", "Ensaio → álbum", ensaioParaAlbum, false),
                montarEtapaFluxo("ALBUM_SELECAO", "Álbum → seleção", albumParaSelecao, true),
                montarEtapaFluxo("SELECAO_FINALIZACAO", "Seleção → finalização", selecaoParaFinalizacao, true)
        );
    }

    private DashboardFluxoEtapaResponse montarEtapaFluxo(
            String chave,
            String titulo,
            List<BigDecimal> duracoes,
            boolean parcial
    ) {
        return DashboardFluxoEtapaResponse.builder()
                .chave(chave)
                .titulo(titulo)
                .mediaDias(calcularMediaDias(duracoes))
                .quantidadeAmostras(duracoes.size())
                .parcial(parcial)
                .build();
    }

    private void adicionarDuracaoEmDias(
            List<BigDecimal> duracoes,
            OffsetDateTime inicio,
            OffsetDateTime fim,
            OffsetDateTime limiteRecente
    ) {
        if (inicio == null || fim == null || fim.isBefore(inicio) || fim.isBefore(limiteRecente)) {
            return;
        }

        long minutos = Duration.between(inicio, fim).toMinutes();

        duracoes.add(BigDecimal.valueOf(minutos)
                .divide(BigDecimal.valueOf(1440), 4, RoundingMode.HALF_UP));
    }

    private BigDecimal calcularMediaDias(List<BigDecimal> duracoes) {
        if (duracoes.isEmpty()) {
            return null;
        }

        BigDecimal total = duracoes.stream()
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        return total.divide(BigDecimal.valueOf(duracoes.size()), 1, RoundingMode.HALF_UP);
    }

    private OffsetDateTime buscarDataSelecao(
            Album album,
            Map<UUID, List<SelecaoFoto>> selecoesPorAlbum
    ) {
        return selecoesPorAlbum.getOrDefault(album.getId(), List.of())
                .stream()
                .map(selecao -> selecao.getSelecionadaEm())
                .filter(data -> data != null)
                .max(OffsetDateTime::compareTo)
                .orElse(null);
    }

    private java.util.Optional<OffsetDateTime> buscarUltimaDataStatus(
            Ensaio ensaio,
            StatusEnsaio status,
            Map<UUID, List<HistoricoStatusEnsaio>> historicoPorEnsaio
    ) {
        return historicoPorEnsaio.getOrDefault(ensaio.getId(), List.of())
                .stream()
                .filter(item -> item.getStatus() == status)
                .map(HistoricoStatusEnsaio::getAlteradoEm)
                .filter(data -> data != null)
                .max(OffsetDateTime::compareTo);
    }

    private List<DashboardRegiaoDemandaResponse> montarRegioesDemanda(Usuario usuario) {
        Map<String, RegiaoClienteResumo> contagens = new LinkedHashMap<>();

        clienteRepository.findByUsuarioIdOrderByNomeAsc(usuario.getId())
                .stream()
                .filter(cliente -> cliente.getId() != null)
                .collect(Collectors.toMap(
                        Cliente::getId,
                        Function.identity(),
                        (clienteExistente, clienteDuplicado) -> clienteExistente
                ))
                .values()
                .forEach(cliente -> {
                    String cidade = normalizarCidadeCliente(cliente.getCidade());

                    if (cidade == null) {
                        return;
                    }

                    String chave = cidade.toLowerCase(Locale.ROOT);
                    RegiaoClienteResumo resumo = contagens.computeIfAbsent(
                            chave,
                            ignored -> new RegiaoClienteResumo(cidade)
                    );

                    resumo.incrementar();
                });

        int totalValido = contagens.values()
                .stream()
                .map(RegiaoClienteResumo::getQuantidadeClientes)
                .reduce(0, Integer::sum);

        if (totalValido == 0) {
            return List.of();
        }

        return contagens.values()
                .stream()
                .sorted(Comparator
                        .comparing(RegiaoClienteResumo::getQuantidadeClientes)
                        .reversed()
                        .thenComparing(RegiaoClienteResumo::getRegiao))
                .map(resumo -> DashboardRegiaoDemandaResponse.builder()
                        .regiao(resumo.getRegiao())
                        .quantidadeClientes(resumo.getQuantidadeClientes())
                        .percentual(calcularPercentual(resumo.getQuantidadeClientes(), totalValido))
                        .build())
                .toList();
    }

    private String normalizarCidadeCliente(String valor) {
        if (valor == null) {
            return null;
        }

        String texto = valor.trim().replaceAll("\\s+", " ");

        if (texto.length() < 2 || !texto.matches(".*\\p{L}.*")) {
            return null;
        }

        return texto;
    }

    private BigDecimal calcularPercentual(int quantidade, int total) {
        if (total <= 0) {
            return BigDecimal.ZERO;
        }

        return BigDecimal.valueOf(quantidade)
                .multiply(BigDecimal.valueOf(100))
                .divide(BigDecimal.valueOf(total), 1, RoundingMode.HALF_UP);
    }

    @Transactional(readOnly = true)
    public List<RelatorioTipoEnsaioResponse> buscarReceitaPorTipoEnsaio(String periodo) {
        ReceitaPeriodoRange intervalo = resolverPeriodoReceita(periodo);
        Usuario usuario = usuarioContextService.getUsuarioLogado();
        List<Ensaio> ensaios = ensaioRepository.findByClienteUsuarioId(usuario.getId());
        Map<UUID, Album> albumPorEnsaio = buscarAlbunsPorEnsaio(usuario);
        Map<UUID, List<SelecaoFoto>> selecoesPorAlbum = buscarSelecoesPorAlbum(albumPorEnsaio);
        Map<UUID, Integer> totalSelecoesPorAlbum = contarSelecoesPorAlbum(
                albumPorEnsaio,
                selecoesPorAlbum
        );

        return montarReceitaPorTipoEnsaio(
                ensaios,
                albumPorEnsaio,
                totalSelecoesPorAlbum,
                intervalo
        );
    }

    private List<RelatorioTipoEnsaioResponse> montarReceitaPorTipoEnsaio(
            List<Ensaio> ensaios,
            Map<UUID, Album> albumPorEnsaio,
            Map<UUID, Integer> totalSelecoesPorAlbum,
            ReceitaPeriodoRange intervalo
    ) {

        List<Ensaio> ensaiosPagosNoPeriodo = ensaios.stream()
                .filter(this::isValorRecebido)
                .filter(ensaio -> pertenceAoPeriodoReceita(ensaio, intervalo))
                .toList();

        BigDecimal totalRecebido = ensaiosPagosNoPeriodo.stream()
                .map(ensaio -> calcularValorTotalDoEnsaio(
                        ensaio,
                        albumPorEnsaio,
                        totalSelecoesPorAlbum
                ))
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        return ensaiosPagosNoPeriodo
                .stream()
                .collect(Collectors.groupingBy(
                        this::resolverTipoExibicao,
                        LinkedHashMap::new,
                        Collectors.toList()
                ))
                .entrySet()
                .stream()
                .map(entry -> montarReceitaRecebidaPorTipo(
                        entry.getValue().get(0).getTipo(),
                        entry.getKey(),
                        entry.getValue(),
                        albumPorEnsaio,
                        totalSelecoesPorAlbum,
                        totalRecebido
                ))
                .sorted(Comparator
                        .comparing(RelatorioTipoEnsaioResponse::getFaturamento)
                        .reversed()
                        .thenComparing(RelatorioTipoEnsaioResponse::getTipoExibicao))
                .toList();
    }

    private RelatorioTipoEnsaioResponse montarReceitaRecebidaPorTipo(
            TipoEnsaio tipo,
            String tipoExibicao,
            List<Ensaio> ensaios,
            Map<UUID, Album> albumPorEnsaio,
            Map<UUID, Integer> totalSelecoesPorAlbum,
            BigDecimal totalRecebido
    ) {
        BigDecimal faturamento = ensaios.stream()
                .map(ensaio -> calcularValorTotalDoEnsaio(
                        ensaio,
                        albumPorEnsaio,
                        totalSelecoesPorAlbum
                ))
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        int fotosExtrasVendidas = ensaios.stream()
                .map(ensaio -> calcularQuantidadeFotosExtras(
                        ensaio,
                        albumPorEnsaio,
                        totalSelecoesPorAlbum
                ))
                .reduce(0, Integer::sum);

        return RelatorioTipoEnsaioResponse.builder()
                .tipo(tipo)
                .tipoExibicao(tipoExibicao)
                .faturamento(faturamento)
                .percentualReceita(calcularPercentualReceita(faturamento, totalRecebido))
                .ticketMedio(calcularMedia(faturamento, ensaios.size()))
                .quantidadeEnsaios(ensaios.size())
                .fotosExtrasVendidas(fotosExtrasVendidas)
                .build();
    }

    private ReceitaPeriodoRange resolverPeriodoReceita(String periodo) {
        String periodoNormalizado = periodo == null || periodo.isBlank()
                ? RECEITA_PERIODO_PADRAO
                : periodo.trim().toUpperCase(Locale.ROOT);
        YearMonth mesAtual = YearMonth.now(APP_ZONE);

        return switch (periodoNormalizado) {
            case "MES_PASSADO" -> {
                YearMonth mesPassado = mesAtual.minusMonths(1);
                yield new ReceitaPeriodoRange(mesPassado.atDay(1), mesPassado.atEndOfMonth());
            }
            case "ULTIMOS_3_MESES" -> {
                YearMonth primeiroMes = mesAtual.minusMonths(2);
                yield new ReceitaPeriodoRange(primeiroMes.atDay(1), mesAtual.atEndOfMonth());
            }
            case "ESTE_SEMESTRE" -> {
                int mesInicial = mesAtual.getMonthValue() <= 6 ? 1 : 7;
                int mesFinal = mesInicial == 1 ? 6 : 12;
                yield new ReceitaPeriodoRange(
                        LocalDate.of(mesAtual.getYear(), mesInicial, 1),
                        YearMonth.of(mesAtual.getYear(), mesFinal).atEndOfMonth()
                );
            }
            case "ESTE_ANO" -> new ReceitaPeriodoRange(
                    LocalDate.of(mesAtual.getYear(), 1, 1),
                    LocalDate.of(mesAtual.getYear(), 12, 31)
            );
            case "ESTE_MES" -> new ReceitaPeriodoRange(mesAtual.atDay(1), mesAtual.atEndOfMonth());
            default -> new ReceitaPeriodoRange(mesAtual.atDay(1), mesAtual.atEndOfMonth());
        };
    }

    private List<Ensaio> buscarProximosEnsaiosFuturos(
            List<Ensaio> ensaios,
        OffsetDateTime agora
    ) {
        return ensaios.stream()
                .filter(ensaio -> ensaio.getStatus() == StatusEnsaio.AGENDADO)
                .filter(ensaio -> ensaio.getDataEnsaio() != null)
                .filter(ensaio -> !ensaio.getDataEnsaio().isBefore(agora))
                .sorted(Comparator.comparing(Ensaio::getDataEnsaio))
                .toList();
    }

    private List<DashboardAtencaoResponse> montarAtencaoNecessaria(
            List<Ensaio> ensaios,
            Map<UUID, Album> albumPorEnsaio,
            Map<UUID, List<Foto>> fotosPorEnsaio,
            Map<UUID, List<SelecaoFoto>> selecoesPorAlbum,
            Map<UUID, List<HistoricoStatusEnsaio>> historicoPorEnsaio
    ) {
        List<DashboardAtencaoResponse> itens = new ArrayList<>();
        OffsetDateTime agora = agoraNoFusoDoApp();

        for (Ensaio ensaio : ensaios) {
            int totalFotos = fotosPorEnsaio.getOrDefault(ensaio.getId(), List.of()).size();
            Album album = albumPorEnsaio.get(ensaio.getId());
            boolean albumPublicado = album != null
                    && Boolean.TRUE.equals(album.getAtivo())
                    && Boolean.TRUE.equals(album.getAcessoLiberado());

            if (
                    ensaio.getStatus() == StatusEnsaio.AGENDADO
                    && ensaio.getDataEnsaio() != null
                    && ensaio.getDataEnsaio().isBefore(agora)
            ) {
                itens.add(DashboardAtencaoResponse.builder()
                        .tipo("ENSAIO_ATRASADO")
                        .titulo("Ensaio com data passada")
                        .descricao("Atualizar o status do ensaio")
                        .ensaioId(ensaio.getId())
                        .clienteNome(ensaio.getCliente().getNome())
                        .dataReferencia(ensaio.getDataEnsaio())
                        .build());
            }

            if (ensaio.getStatus() == StatusEnsaio.REALIZADO && totalFotos == 0) {
                itens.add(DashboardAtencaoResponse.builder()
                        .tipo("UPLOAD_PENDENTE")
                        .titulo("Ensaio realizado sem fotos")
                        .descricao("Upload de fotos pendente")
                        .ensaioId(ensaio.getId())
                        .clienteNome(ensaio.getCliente().getNome())
                        .dataReferencia(ensaio.getDataEnsaio())
                        .build());
            }

            if (ensaio.getStatus() == StatusEnsaio.REALIZADO && totalFotos > 0 && !albumPublicado) {
                itens.add(DashboardAtencaoResponse.builder()
                        .tipo("ALBUM_PENDENTE")
                        .titulo("Album ainda não publicado")
                        .descricao("Fotos enviadas aguardando publicação")
                        .ensaioId(ensaio.getId())
                        .clienteNome(ensaio.getCliente().getNome())
                        .dataReferencia(ensaio.getAtualizadoEm())
                        .build());
            }

            if (ensaio.getStatus() == StatusEnsaio.EM_SELECAO
                    && temSelecaoEnviada(ensaio, albumPorEnsaio, selecoesPorAlbum)) {
                itens.add(DashboardAtencaoResponse.builder()
                        .tipo("SELECAO_ENVIADA")
                        .titulo("Cliente com selecao enviada")
                        .descricao("Revisar favoritas da cliente")
                        .ensaioId(ensaio.getId())
                        .clienteNome(ensaio.getCliente().getNome())
                        .dataReferencia(ensaio.getAtualizadoEm())
                        .build());
            }

            if (ensaio.getStatus() == StatusEnsaio.EM_EDICAO) {
                OffsetDateTime desde = buscarDataStatusAtual(ensaio, historicoPorEnsaio);
                long diasEmEdicao = desde == null ? 0 : Duration.between(desde, agora).toDays();

                if (diasEmEdicao >= DIAS_EDICAO_ATRASADA) {
                    itens.add(DashboardAtencaoResponse.builder()
                            .tipo("ENTREGA_ATRASADA")
                            .titulo("Edição atrasada")
                            .descricao("Ensaio em edição há " + diasEmEdicao + " dias")
                            .ensaioId(ensaio.getId())
                            .clienteNome(ensaio.getCliente().getNome())
                            .dataReferencia(desde)
                            .build());
                }
            }

            if (ensaio.getStatus() == StatusEnsaio.FINALIZADO && !isValorRecebido(ensaio)) {
                itens.add(DashboardAtencaoResponse.builder()
                        .tipo("PAGAMENTO_PENDENTE")
                        .titulo("Pagamento pendente ou não informado")
                        .descricao(resolverDescricaoPagamentoPendente(ensaio))
                        .ensaioId(ensaio.getId())
                        .clienteNome(ensaio.getCliente().getNome())
                        .dataReferencia(ensaio.getAtualizadoEm())
                        .build());
            }
        }

        return itens.stream()
                .sorted(Comparator.comparing(
                        DashboardAtencaoResponse::getDataReferencia,
                        Comparator.nullsLast(Comparator.reverseOrder())
                ))
                .toList();
    }

    private Map<String, Integer> montarPipelineStatus(List<Ensaio> ensaios) {
        Map<String, Integer> pipeline = new LinkedHashMap<>();

        Arrays.stream(StatusEnsaio.values())
                .forEach(status -> pipeline.put(status.name(), 0));

        ensaios.stream()
                .filter(ensaio -> ensaio.getStatus() != null)
                .forEach(ensaio -> pipeline.computeIfPresent(
                        ensaio.getStatus().name(),
                        (status, total) -> total + 1
                ));

        return pipeline;
    }

    private DashboardEnsaioResumoResponse toEnsaioResumo(
            Ensaio ensaio,
            Map<UUID, Album> albumPorEnsaio,
            Map<UUID, List<Foto>> fotosPorEnsaio,
            Map<UUID, List<SelecaoFoto>> selecoesPorAlbum,
            String capaAlbumPadrao
    ) {
        UUID ensaioId = ensaio.getId();

        Album album = albumPorEnsaio.get(ensaioId);
        boolean albumPublicado = album != null
                && Boolean.TRUE.equals(album.getAtivo())
                && Boolean.TRUE.equals(album.getAcessoLiberado());
        boolean selecaoEnviada = album != null
                && !selecoesPorAlbum.getOrDefault(album.getId(), List.of()).isEmpty();
        List<Foto> fotos = fotosPorEnsaio.getOrDefault(ensaioId, List.of());

        return DashboardEnsaioResumoResponse.builder()
                .id(ensaioId)
                .clienteNome(ensaio.getCliente().getNome())
                .tipo(ensaio.getTipo())
                .tipoPersonalizado(ensaio.getTipoPersonalizado())
                .tipoExibicao(resolverTipoExibicao(ensaio))
                .status(ensaio.getStatus())
                .dataEnsaio(ensaio.getDataEnsaio())
                .atualizadoEm(ensaio.getAtualizadoEm())
                .local(ensaio.getLocal())
                .progresso(ensaio.getProgresso())
                .valorPacote(ensaio.getValorPacote())
                .totalFotos(fotos.size())
                .capaUrl(buscarCapaUrl(fotos, capaAlbumPadrao))
                .albumPublicado(albumPublicado)
                .selecaoEnviada(selecaoEnviada)
                .build();
    }

    private String resolverTipoExibicao(Ensaio ensaio) {
        if (ensaio == null || ensaio.getTipo() == null) {
            return null;
        }

        if (ensaio.getTipo() == TipoEnsaio.OUTRO
                && ensaio.getTipoPersonalizado() != null
                && !ensaio.getTipoPersonalizado().isBlank()) {
            return ensaio.getTipoPersonalizado().trim();
        }

        return ensaio.getTipo().getDescricao();
    }

    private boolean pertenceAoMes(Ensaio ensaio, YearMonth mes) {
        if (ensaio.getDataEnsaio() == null) {
            return false;
        }

        return YearMonth.from(ensaio.getDataEnsaio().atZoneSameInstant(APP_ZONE)).equals(mes);
    }

    private boolean pertenceAoPeriodoReceita(Ensaio ensaio, ReceitaPeriodoRange intervalo) {
        if (ensaio.getDataEnsaio() == null) {
            return false;
        }

        LocalDate dataEnsaio = toAppLocalDate(ensaio.getDataEnsaio());

        return !dataEnsaio.isBefore(intervalo.getInicio())
                && !dataEnsaio.isAfter(intervalo.getFim());
    }

    private OffsetDateTime agoraNoFusoDoApp() {
        return OffsetDateTime.now(APP_ZONE);
    }

    private java.time.LocalDate toAppLocalDate(OffsetDateTime data) {
        return data.atZoneSameInstant(APP_ZONE).toLocalDate();
    }

    private boolean isEnsaioEmAndamento(Ensaio ensaio) {
        return ensaio.getStatus() == StatusEnsaio.REALIZADO
                || ensaio.getStatus() == StatusEnsaio.EM_SELECAO
                || ensaio.getStatus() == StatusEnsaio.EM_EDICAO;
    }

    private BigDecimal calcularValorTotalDoEnsaio(
            Ensaio ensaio,
            Map<UUID, Album> albumPorEnsaio,
            Map<UUID, Integer> totalSelecoesPorAlbum
    ) {
        if (ensaio.getValorFinalEnsaio() != null) {
            return ensaio.getValorFinalEnsaio();
        }

        BigDecimal valorPacote = ensaio.getValorPacote() == null
                ? BigDecimal.ZERO
                : ensaio.getValorPacote();

        return valorPacote.add(calcularValorExcedenteDoEnsaio(
                ensaio,
                albumPorEnsaio,
                totalSelecoesPorAlbum
        ));
    }

    private BigDecimal calcularValorExcedenteDoEnsaio(
            Ensaio ensaio,
            Map<UUID, Album> albumPorEnsaio,
            Map<UUID, Integer> totalSelecoesPorAlbum
    ) {
        if (!Boolean.TRUE.equals(ensaio.getCobrarFotoExtra())) {
            return BigDecimal.ZERO;
        }

        if (ensaio.getValorFotoExtra() == null || ensaio.getQtdFotosPacote() == null) {
            return BigDecimal.ZERO;
        }

        Album album = albumPorEnsaio.get(ensaio.getId());

        if (album == null) {
            return BigDecimal.ZERO;
        }

        int totalSelecionadas = totalSelecoesPorAlbum.getOrDefault(album.getId(), 0);
        int excedentes = Math.max(0, totalSelecionadas - ensaio.getQtdFotosPacote());

        return ensaio.getValorFotoExtra().multiply(BigDecimal.valueOf(excedentes));
    }

    private int calcularQuantidadeFotosExtras(
            Ensaio ensaio,
            Map<UUID, Album> albumPorEnsaio,
            Map<UUID, Integer> totalSelecoesPorAlbum
    ) {
        if (!Boolean.TRUE.equals(ensaio.getCobrarFotoExtra()) || ensaio.getQtdFotosPacote() == null) {
            return 0;
        }

        Album album = albumPorEnsaio.get(ensaio.getId());

        if (album == null) {
            return 0;
        }

        int totalSelecionadas = totalSelecoesPorAlbum.getOrDefault(album.getId(), 0);

        return Math.max(0, totalSelecionadas - ensaio.getQtdFotosPacote());
    }

    private BigDecimal calcularPercentualReceita(BigDecimal valor, BigDecimal total) {
        if (valor == null || total == null || total.compareTo(BigDecimal.ZERO) <= 0) {
            return BigDecimal.ZERO;
        }

        return valor
                .multiply(BigDecimal.valueOf(100))
                .divide(total, 1, RoundingMode.HALF_UP);
    }

    private BigDecimal calcularMedia(BigDecimal total, int quantidade) {
        if (total == null || quantidade <= 0) {
            return BigDecimal.ZERO;
        }

        return total.divide(BigDecimal.valueOf(quantidade), 2, RoundingMode.HALF_UP);
    }

    private boolean temSelecaoEnviada(
            Ensaio ensaio,
            Map<UUID, Album> albumPorEnsaio,
            Map<UUID, List<SelecaoFoto>> selecoesPorAlbum
    ) {
        Album album = albumPorEnsaio.get(ensaio.getId());

        return album != null && !selecoesPorAlbum.getOrDefault(album.getId(), List.of()).isEmpty();
    }

    private String resolverDescricaoPagamentoPendente(Ensaio ensaio) {
        String statusValores = ensaio.getStatusValores();

        if (statusValores == null || statusValores.isBlank()) {
            return "Ensaio finalizado com pagamento não informado";
        }

        if ("PENDENTE".equalsIgnoreCase(statusValores.trim())) {
            return "Ensaio finalizado com pagamento pendente";
        }

        return "Ensaio finalizado sem pagamento confirmado";
    }

    private boolean isValorRecebido(Ensaio ensaio) {
        return ensaio.getStatusValores() != null
                && "PAGO".equalsIgnoreCase(ensaio.getStatusValores().trim());
    }

    private OffsetDateTime buscarDataStatusAtual(
            Ensaio ensaio,
            Map<UUID, List<HistoricoStatusEnsaio>> historicoPorEnsaio
    ) {
        List<HistoricoStatusEnsaio> historico = historicoPorEnsaio.getOrDefault(ensaio.getId(), List.of());

        return historico.stream()
                .filter(item -> item.getStatus() == ensaio.getStatus())
                .map(HistoricoStatusEnsaio::getAlteradoEm)
                .filter(data -> data != null)
                .max(OffsetDateTime::compareTo)
                .orElse(ensaio.getAtualizadoEm());
    }

    private String buscarCapaUrl(List<Foto> fotos, String capaAlbumPadrao) {
        if (fotos.isEmpty()) {
            return capaAlbumPadrao;
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

        return capaAlbumPadrao;
    }

    private String buscarCapaAlbumPadrao(Usuario usuario) {
        return preferenciasSistemaRepository.findByUsuarioId(usuario.getId())
                .map(preferencias -> preferencias.getCapaAlbumPadraoUrl())
                .orElse(null);
    }

    private static class RegiaoClienteResumo {
        private final String regiao;
        private int quantidadeClientes;

        private RegiaoClienteResumo(String regiao) {
            this.regiao = regiao;
        }

        private void incrementar() {
            quantidadeClientes++;
        }

        private String getRegiao() {
            return regiao;
        }

        private int getQuantidadeClientes() {
            return quantidadeClientes;
        }
    }

    private static class ReceitaPeriodoRange {
        private final LocalDate inicio;
        private final LocalDate fim;

        private ReceitaPeriodoRange(LocalDate inicio, LocalDate fim) {
            this.inicio = inicio;
            this.fim = fim;
        }

        private LocalDate getInicio() {
            return inicio;
        }

        private LocalDate getFim() {
            return fim;
        }
    }
}
