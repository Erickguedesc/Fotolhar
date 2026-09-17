package com.fotolhar.service;

import com.fotolhar.dto.RelatorioDestaqueResponse;
import com.fotolhar.dto.RelatorioEnsaioMaisRealizadoResponse;
import com.fotolhar.dto.RelatorioFaturamentoResponse;
import com.fotolhar.dto.RelatorioPeriodoResponse;
import com.fotolhar.dto.RelatorioTipoEnsaioResponse;
import com.fotolhar.dto.RelatorioTrabalhoMaiorValorResponse;
import com.fotolhar.enums.StatusEnsaio;
import com.fotolhar.enums.TipoEnsaio;
import com.fotolhar.enums.TipoPeriodoRelatorio;
import com.fotolhar.model.Album;
import com.fotolhar.model.Ensaio;
import com.fotolhar.model.Usuario;
import com.fotolhar.repository.AlbumRepository;
import com.fotolhar.repository.EnsaioRepository;
import com.fotolhar.repository.SelecaoFotoRepository;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.Month;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.Comparator;
import java.util.EnumSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import com.fotolhar.dto.RelatorioComparativoResponse;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class RelatorioService {

        private static final int LIMITE_ENSAIOS_MAIS_REALIZADOS = 5;
        private static final int LIMITE_TRABALHOS_MAIOR_VALOR = 5;
        private static final Set<StatusEnsaio> STATUS_ENSAIOS_REALIZADOS = EnumSet.of(
                        StatusEnsaio.REALIZADO,
                        StatusEnsaio.EM_SELECAO,
                        StatusEnsaio.EM_EDICAO,
                        StatusEnsaio.FINALIZADO);

        private final EnsaioRepository ensaioRepository;
        private final AlbumRepository albumRepository;
        private final SelecaoFotoRepository selecaoFotoRepository;
        private final UsuarioContextService usuarioContextService;

        @Transactional(readOnly = true)
        public RelatorioFaturamentoResponse buscarFaturamento(TipoPeriodoRelatorio tipo, Integer ano) {
                return buscarFaturamento(tipo, ano, null, null);
        }

        @Transactional(readOnly = true)
        public RelatorioFaturamentoResponse buscarFaturamento(
                        TipoPeriodoRelatorio tipo,
                        Integer ano,
                        LocalDate dataInicio,
                        LocalDate dataFim) {
                TipoPeriodoRelatorio tipoFinal = tipo == null ? TipoPeriodoRelatorio.MENSAL : tipo;
                int anoFinal = ano == null ? LocalDate.now().getYear() : ano;

                List<PeriodoRelatorioInterno> periodosInternos = gerarPeriodos(tipoFinal, anoFinal, dataInicio, dataFim);

                Usuario usuario = usuarioContextService.getUsuarioLogado();
                List<Ensaio> ensaios = ensaioRepository.findByClienteUsuarioId(usuario.getId());

                Map<UUID, Album> albumPorEnsaio = albumRepository.findByEnsaioClienteUsuarioId(usuario.getId())
                                .stream()
                                .filter(album -> album.getEnsaio() != null)
                                .filter(album -> album.getEnsaio().getId() != null)
                                .collect(Collectors.toMap(
                                                album -> album.getEnsaio().getId(),
                                                Function.identity(),
                                                (albumExistente, albumNovo) -> albumExistente));

                Map<UUID, Integer> totalSelecoesPorAlbum = albumPorEnsaio.values()
                                .stream()
                                .collect(Collectors.toMap(
                                                Album::getId,
                                                album -> selecaoFotoRepository.findByAlbumId(album.getId()).size()));

                List<RelatorioPeriodoResponse> periodos = periodosInternos.stream()
                                .map(periodo -> montarPeriodo(
                                                periodo,
                                                ensaios,
                                                albumPorEnsaio,
                                                totalSelecoesPorAlbum))
                                .toList();

BigDecimal faturamentoBruto = somar(periodos, RelatorioPeriodoResponse::getFaturamento);
BigDecimal excedentesCobrados = somar(periodos, RelatorioPeriodoResponse::getExcedentesCobrados);
BigDecimal ajustesManuais = somar(periodos, RelatorioPeriodoResponse::getAjustesManuais);
BigDecimal totalLiquido = faturamentoBruto.add(excedentesCobrados).add(ajustesManuais);
BigDecimal valorRecebido = somar(periodos, RelatorioPeriodoResponse::getValorRecebido);
BigDecimal valorPendente = totalLiquido.subtract(valorRecebido);

int ensaiosRealizados = periodos.stream()
        .map(RelatorioPeriodoResponse::getQuantidadeEnsaios)
        .reduce(0, Integer::sum);

int clientesNovos = periodos.stream()
        .map(RelatorioPeriodoResponse::getClientesNovos)
        .reduce(0, Integer::sum);

int fotosExtrasVendidas = periodos.stream()
        .map(RelatorioPeriodoResponse::getFotosExtrasVendidas)
        .reduce(0, Integer::sum);

BigDecimal mediaPorPeriodo = calcularMedia(totalLiquido, periodos.size());
BigDecimal ticketMedioEnsaio = calcularMedia(totalLiquido, ensaiosRealizados);

List<RelatorioTipoEnsaioResponse> tiposEnsaio = montarTiposEnsaio(
        ensaios,
        periodosInternos,
        albumPorEnsaio,
        totalSelecoesPorAlbum,
        totalLiquido
);

List<RelatorioEnsaioMaisRealizadoResponse> ensaiosMaisRealizados = montarEnsaiosMaisRealizados(
        ensaios,
        periodosInternos
);

List<RelatorioTrabalhoMaiorValorResponse> trabalhosMaiorValor = montarTrabalhosMaiorValor(
        ensaios,
        periodosInternos,
        albumPorEnsaio,
        totalSelecoesPorAlbum
);

RelatorioDestaqueResponse destaques = montarDestaques(periodos, ensaiosMaisRealizados);

int anoComparado = anoFinal - 1;

List<PeriodoRelatorioInterno> periodosInternosAnoAnterior =
        gerarPeriodos(
                tipoFinal,
                anoComparado,
                dataInicio != null ? dataInicio.minusYears(1) : null,
                dataFim != null ? dataFim.minusYears(1) : null);

List<RelatorioPeriodoResponse> periodosAnoAnterior = periodosInternosAnoAnterior.stream()
        .map(periodo -> montarPeriodo(
                periodo,
                ensaios,
                albumPorEnsaio,
                totalSelecoesPorAlbum
        ))
        .toList();

BigDecimal totalLiquidoAnoAnterior =
        somar(periodosAnoAnterior, RelatorioPeriodoResponse::getTotalLiquido);

int ensaiosAnoAnterior = periodosAnoAnterior.stream()
        .map(RelatorioPeriodoResponse::getQuantidadeEnsaios)
        .reduce(0, Integer::sum);

RelatorioComparativoResponse comparativo = montarComparativo(
        totalLiquido,
        totalLiquidoAnoAnterior,
        ensaiosRealizados,
        ensaiosAnoAnterior,
        anoComparado
);

           return RelatorioFaturamentoResponse.builder()
        .tipo(tipoFinal)
        .ano(anoFinal)
        .periodoDescricao(montarDescricao(tipoFinal, anoFinal, dataInicio, dataFim))
        .unidadePeriodo(resolverUnidadePeriodo(tipoFinal))
        .faturamentoTotal(totalLiquido)
        .mediaPorPeriodo(mediaPorPeriodo)
        .ticketMedioEnsaio(ticketMedioEnsaio)
        .ensaiosRealizados(ensaiosRealizados)
        .clientesNovos(clientesNovos)
        .fotosExtrasVendidas(fotosExtrasVendidas)
        .faturamentoBruto(faturamentoBruto)
        .excedentesCobrados(excedentesCobrados)
        .ajustesManuais(ajustesManuais)
        .totalLiquido(totalLiquido)
        .valorRecebido(valorRecebido)
        .valorPendente(valorPendente)
        .destaques(destaques)
        .comparativo(comparativo)
        .periodos(periodos)
        .tiposEnsaio(tiposEnsaio)
        .ensaiosMaisRealizados(ensaiosMaisRealizados)
        .trabalhosMaiorValor(trabalhosMaiorValor)
        .build();
        }

        private RelatorioPeriodoResponse montarPeriodo(
                        PeriodoRelatorioInterno periodo,
                        List<Ensaio> ensaios,
                        Map<UUID, Album> albumPorEnsaio,
                        Map<UUID, Integer> totalSelecoesPorAlbum) {
                List<Ensaio> ensaiosDoPeriodo = ensaios.stream()
                                .filter(this::isEnsaioFinanceiro)
                                .filter(ensaio -> estaDentroDoPeriodo(ensaio, periodo))
                                .toList();

                BigDecimal faturamento = ensaiosDoPeriodo.stream()
                                .map(Ensaio::getValorPacote)
                                .filter(valor -> valor != null)
                                .reduce(BigDecimal.ZERO, BigDecimal::add);

                BigDecimal excedentes = ensaiosDoPeriodo.stream()
                                .map(ensaio -> calcularExcedenteDoEnsaio(
                                                ensaio,
                                                albumPorEnsaio,
                                                totalSelecoesPorAlbum))
                                .reduce(BigDecimal.ZERO, BigDecimal::add);

                BigDecimal ajustesManuais = ensaiosDoPeriodo.stream()
                                .map(ensaio -> calcularAjusteManualDoEnsaio(
                                                ensaio,
                                                albumPorEnsaio,
                                                totalSelecoesPorAlbum))
                                .reduce(BigDecimal.ZERO, BigDecimal::add);

                BigDecimal totalLiquido = faturamento.add(excedentes).add(ajustesManuais);

                BigDecimal valorRecebido = ensaiosDoPeriodo.stream()
                                .filter(this::isValorRecebido)
                                .map(ensaio -> calcularTotalLiquidoDoEnsaio(
                                                ensaio,
                                                albumPorEnsaio,
                                                totalSelecoesPorAlbum))
                                .reduce(BigDecimal.ZERO, BigDecimal::add);

                BigDecimal valorPendente = totalLiquido.subtract(valorRecebido);

                int clientesNovos = contarClientesComPrimeiroEnsaioNoPeriodo(ensaios, periodo);

                int fotosExtrasVendidas = ensaiosDoPeriodo.stream()
                                .map(ensaio -> calcularQuantidadeFotosExtras(
                                                ensaio,
                                                albumPorEnsaio,
                                                totalSelecoesPorAlbum))
                                .reduce(0, Integer::sum);

                return RelatorioPeriodoResponse.builder()
                                .label(periodo.getLabel())
                                .inicio(periodo.getInicio())
                                .fim(periodo.getFim())
                                .faturamento(faturamento)
                                .excedentesCobrados(excedentes)
                                .ajustesManuais(ajustesManuais)
                                .totalLiquido(totalLiquido)
                                .valorRecebido(valorRecebido)
                                .valorPendente(valorPendente)
                                .quantidadeEnsaios(ensaiosDoPeriodo.size())
                                .clientesNovos(clientesNovos)
                                .fotosExtrasVendidas(fotosExtrasVendidas)
                                .build();
        }

        private List<RelatorioTipoEnsaioResponse> montarTiposEnsaio(
                        List<Ensaio> ensaios,
                        List<PeriodoRelatorioInterno> periodos,
                        Map<UUID, Album> albumPorEnsaio,
                        Map<UUID, Integer> totalSelecoesPorAlbum,
                        BigDecimal totalLiquidoGeral) {
                return ensaios.stream()
                                .filter(this::isEnsaioFinanceiro)
                                .filter(ensaio -> pertenceAAlgumPeriodo(ensaio, periodos))
                                .collect(Collectors.groupingBy(this::resolverTipoExibicao))
                                .entrySet()
                                .stream()
                                .map(entry -> montarTipoEnsaio(
                                                entry.getValue().get(0).getTipo(),
                                                entry.getKey(),
                                                entry.getValue(),
                                                albumPorEnsaio,
                                                totalSelecoesPorAlbum,
                                                totalLiquidoGeral))
                                .sorted(Comparator.comparing(RelatorioTipoEnsaioResponse::getFaturamento).reversed())
                                .toList();
        }

        private List<RelatorioEnsaioMaisRealizadoResponse> montarEnsaiosMaisRealizados(
                        List<Ensaio> ensaios,
                        List<PeriodoRelatorioInterno> periodos) {
                List<Ensaio> ensaiosValidos = ensaios.stream()
                                .filter(this::isEnsaioRealizadoParaRanking)
                                .filter(ensaio -> pertenceAAlgumPeriodo(ensaio, periodos))
                                .toList();

                int totalEnsaios = ensaiosValidos.size();

                if (totalEnsaios == 0) {
                        return List.of();
                }

                return ensaiosValidos.stream()
                                .collect(Collectors.groupingBy(this::resolverTipoExibicao))
                                .entrySet()
                                .stream()
                                .map(entry -> RelatorioEnsaioMaisRealizadoResponse.builder()
                                                .tipo(entry.getValue().get(0).getTipo())
                                                .tipoExibicao(entry.getKey())
                                                .quantidadeEnsaios(entry.getValue().size())
                                                .percentual(calcularPercentualQuantidade(
                                                                entry.getValue().size(),
                                                                totalEnsaios))
                                                .build())
                                .sorted(Comparator
                                                .comparing(RelatorioEnsaioMaisRealizadoResponse::getQuantidadeEnsaios)
                                                .reversed()
                                                .thenComparing(RelatorioEnsaioMaisRealizadoResponse::getTipoExibicao))
                                .limit(LIMITE_ENSAIOS_MAIS_REALIZADOS)
                                .toList();
        }

        private List<RelatorioTrabalhoMaiorValorResponse> montarTrabalhosMaiorValor(
                        List<Ensaio> ensaios,
                        List<PeriodoRelatorioInterno> periodos,
                        Map<UUID, Album> albumPorEnsaio,
                        Map<UUID, Integer> totalSelecoesPorAlbum) {
                return ensaios.stream()
                                .filter(this::isEnsaioFinanceiro)
                                .filter(this::isValorRecebido)
                                .filter(ensaio -> pertenceAAlgumPeriodo(ensaio, periodos))
                                .map(ensaio -> RelatorioTrabalhoMaiorValorResponse.builder()
                                                .ensaioId(ensaio.getId())
                                                .tipoExibicao(resolverTipoExibicao(ensaio))
                                                .clienteNome(resolverNomeCliente(ensaio))
                                                .valor(calcularTotalLiquidoDoEnsaio(
                                                                ensaio,
                                                                albumPorEnsaio,
                                                                totalSelecoesPorAlbum))
                                                .build())
                                .filter(trabalho -> trabalho.getValor().compareTo(BigDecimal.ZERO) > 0)
                                .sorted(Comparator
                                                .comparing(RelatorioTrabalhoMaiorValorResponse::getValor)
                                                .reversed()
                                                .thenComparing(RelatorioTrabalhoMaiorValorResponse::getClienteNome))
                                .limit(LIMITE_TRABALHOS_MAIOR_VALOR)
                                .toList();
        }

        private RelatorioTipoEnsaioResponse montarTipoEnsaio(
                        TipoEnsaio tipo,
                        String tipoExibicao,
                        List<Ensaio> ensaios,
                        Map<UUID, Album> albumPorEnsaio,
                        Map<UUID, Integer> totalSelecoesPorAlbum,
                        BigDecimal totalLiquidoGeral) {
                BigDecimal faturamento = ensaios.stream()
                                .map(ensaio -> calcularTotalLiquidoDoEnsaio(
                                                ensaio,
                                                albumPorEnsaio,
                                                totalSelecoesPorAlbum))
                                .reduce(BigDecimal.ZERO, BigDecimal::add);

                BigDecimal percentualReceita = calcularPercentualParticipacao(
                                faturamento,
                                totalLiquidoGeral);

                BigDecimal ticketMedio = calcularMedia(faturamento, ensaios.size());

                int fotosExtrasVendidas = ensaios.stream()
                                .map(ensaio -> calcularQuantidadeFotosExtras(
                                                ensaio,
                                                albumPorEnsaio,
                                                totalSelecoesPorAlbum))
                                .reduce(0, Integer::sum);

                return RelatorioTipoEnsaioResponse.builder()
                                .tipo(tipo)
                                .tipoExibicao(tipoExibicao)
                                .faturamento(faturamento)
                                .percentualReceita(percentualReceita)
                                .ticketMedio(ticketMedio)
                                .quantidadeEnsaios(ensaios.size())
                                .fotosExtrasVendidas(fotosExtrasVendidas)
                                .build();
        }

        private boolean pertenceAAlgumPeriodo(
                        Ensaio ensaio,
                        List<PeriodoRelatorioInterno> periodos) {
                return periodos.stream()
                                .anyMatch(periodo -> estaDentroDoPeriodo(ensaio, periodo));
        }

        private BigDecimal calcularTotalLiquidoDoEnsaio(
                        Ensaio ensaio,
                        Map<UUID, Album> albumPorEnsaio,
                        Map<UUID, Integer> totalSelecoesPorAlbum) {
                BigDecimal valorPacote = ensaio.getValorPacote() == null
                                ? BigDecimal.ZERO
                                : ensaio.getValorPacote();

                return valorPacote
                                .add(calcularExcedenteDoEnsaio(
                                                ensaio,
                                                albumPorEnsaio,
                                                totalSelecoesPorAlbum))
                                .add(calcularAjusteManualDoEnsaio(
                                                ensaio,
                                                albumPorEnsaio,
                                                totalSelecoesPorAlbum));
        }

        private String resolverNomeCliente(Ensaio ensaio) {
                if (ensaio.getCliente() == null || ensaio.getCliente().getNome() == null
                                || ensaio.getCliente().getNome().isBlank()) {
                        return "Cliente";
                }

                return ensaio.getCliente().getNome();
        }

        private boolean isEnsaioFinanceiro(Ensaio ensaio) {
                return ensaio.getStatus() != StatusEnsaio.CANCELADO;
        }

        private boolean isEnsaioRealizadoParaRanking(Ensaio ensaio) {
                return ensaio.getStatus() != null && STATUS_ENSAIOS_REALIZADOS.contains(ensaio.getStatus());
        }

        private boolean isValorRecebido(Ensaio ensaio) {
                return ensaio.getStatusValores() != null
                                && "PAGO".equalsIgnoreCase(ensaio.getStatusValores().trim());
        }

        private boolean estaDentroDoPeriodo(Ensaio ensaio, PeriodoRelatorioInterno periodo) {
                if (ensaio.getDataEnsaio() == null) {
                        return false;
                }

                return estaDataDentroDoPeriodo(ensaio.getDataEnsaio(), periodo);
        }

        private int contarClientesComPrimeiroEnsaioNoPeriodo(
                        List<Ensaio> ensaios,
                        PeriodoRelatorioInterno periodo) {
                return (int) ensaios.stream()
                                .filter(ensaio -> ensaio.getCliente() != null)
                                .filter(ensaio -> ensaio.getCliente().getId() != null)
                                .collect(Collectors.groupingBy(ensaio -> ensaio.getCliente().getId()))
                                .values()
                                .stream()
                                .map(this::buscarDataPrimeiroEnsaio)
                                .filter(data -> data != null && estaDataDentroDoPeriodo(data, periodo))
                                .count();
        }

        private OffsetDateTime buscarDataPrimeiroEnsaio(List<Ensaio> ensaios) {
                return ensaios.stream()
                                .map(Ensaio::getDataEnsaio)
                                .filter(data -> data != null)
                                .min(OffsetDateTime::compareTo)
                                .orElse(null);
        }

        private boolean estaDataDentroDoPeriodo(OffsetDateTime data, PeriodoRelatorioInterno periodo) {
                OffsetDateTime inicio = periodo.getInicio()
                                .atStartOfDay()
                                .atOffset(ZoneOffset.UTC);

                OffsetDateTime fimExclusivo = periodo.getFim()
                                .plusDays(1)
                                .atStartOfDay()
                                .atOffset(ZoneOffset.UTC);

                return !data.isBefore(inicio) && data.isBefore(fimExclusivo);
        }

        private BigDecimal calcularExcedenteDoEnsaio(
                        Ensaio ensaio,
                        Map<UUID, Album> albumPorEnsaio,
                        Map<UUID, Integer> totalSelecoesPorAlbum) {
                if (ensaio.getValorFotoExtra() == null) {
                        return BigDecimal.ZERO;
                }

                int excedentes = calcularQuantidadeFotosExtras(
                                ensaio,
                                albumPorEnsaio,
                                totalSelecoesPorAlbum);

                return ensaio.getValorFotoExtra().multiply(BigDecimal.valueOf(excedentes));
        }

        private int calcularQuantidadeFotosExtras(
                        Ensaio ensaio,
                        Map<UUID, Album> albumPorEnsaio,
                        Map<UUID, Integer> totalSelecoesPorAlbum) {
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

        private BigDecimal calcularAjusteManualDoEnsaio(
                        Ensaio ensaio,
                        Map<UUID, Album> albumPorEnsaio,
                        Map<UUID, Integer> totalSelecoesPorAlbum) {
                if (ensaio.getValorFinalEnsaio() == null) {
                        return BigDecimal.ZERO;
                }

                BigDecimal valorPacote = ensaio.getValorPacote() == null
                                ? BigDecimal.ZERO
                                : ensaio.getValorPacote();

                BigDecimal valorAutomatico = valorPacote.add(calcularExcedenteDoEnsaio(
                                ensaio,
                                albumPorEnsaio,
                                totalSelecoesPorAlbum));

                return ensaio.getValorFinalEnsaio().subtract(valorAutomatico);
        }

        private List<PeriodoRelatorioInterno> gerarPeriodos(
                        TipoPeriodoRelatorio tipo,
                        int ano,
                        LocalDate dataInicio,
                        LocalDate dataFim) {
                if (dataInicio != null || dataFim != null) {
                        LocalDate inicio = dataInicio != null ? dataInicio : LocalDate.of(ano, 1, 1);
                        LocalDate fim = dataFim != null ? dataFim : LocalDate.of(ano, 12, 31);

                        if (fim.isBefore(inicio)) {
                                LocalDate originalInicio = inicio;
                                inicio = fim;
                                fim = originalInicio;
                        }

                        return gerarPeriodosNoIntervalo(tipo, inicio, fim);
                }

                return gerarPeriodos(tipo, ano);
        }

        private List<PeriodoRelatorioInterno> gerarPeriodos(TipoPeriodoRelatorio tipo, int ano) {
                return switch (tipo) {
                        case DIARIO -> gerarPeriodosDiarios(LocalDate.of(ano, 1, 1), LocalDate.of(ano, 12, 31));
                        case SEMANAL -> gerarPeriodosSemanais(LocalDate.of(ano, 1, 1), LocalDate.of(ano, 12, 31));
                        case ANUAL -> gerarPeriodoAnual(ano);
                        case SEMESTRAL -> gerarPeriodosSemestrais(ano);
                        case TRIMESTRAL -> gerarPeriodosTrimestrais(ano);
                        case MENSAL -> gerarPeriodosMensais(ano);
                };
        }

        private List<PeriodoRelatorioInterno> gerarPeriodosNoIntervalo(
                        TipoPeriodoRelatorio tipo,
                        LocalDate inicio,
                        LocalDate fim) {
                return switch (tipo) {
                        case DIARIO -> gerarPeriodosDiarios(inicio, fim);
                        case SEMANAL -> gerarPeriodosSemanais(inicio, fim);
                        case MENSAL -> gerarPeriodosMensais(inicio, fim);
                        case TRIMESTRAL -> gerarPeriodosTrimestrais(inicio, fim);
                        case SEMESTRAL -> gerarPeriodosSemestrais(inicio, fim);
                        case ANUAL -> gerarPeriodosAnuais(inicio, fim);
                };
        }

        private List<PeriodoRelatorioInterno> gerarPeriodosDiarios(LocalDate inicio, LocalDate fim) {
                List<PeriodoRelatorioInterno> periodos = new java.util.ArrayList<>();
                DateTimeFormatter formatter = DateTimeFormatter.ofPattern("dd/MM");
                LocalDate cursor = inicio;

                while (!cursor.isAfter(fim)) {
                        periodos.add(periodo(cursor.format(formatter), cursor, cursor));
                        cursor = cursor.plusDays(1);
                }

                return periodos;
        }

        private List<PeriodoRelatorioInterno> gerarPeriodosSemanais(LocalDate inicio, LocalDate fim) {
                List<PeriodoRelatorioInterno> periodos = new java.util.ArrayList<>();
                DateTimeFormatter formatter = DateTimeFormatter.ofPattern("dd/MM");
                LocalDate cursor = inicio;

                while (!cursor.isAfter(fim)) {
                        LocalDate fimSemana = cursor.plusDays(6);
                        LocalDate fimPeriodo = fimSemana.isAfter(fim) ? fim : fimSemana;
                        periodos.add(periodo(
                                        cursor.format(formatter) + " - " + fimPeriodo.format(formatter),
                                        cursor,
                                        fimPeriodo));
                        cursor = fimPeriodo.plusDays(1);
                }

                return periodos;
        }

        private List<PeriodoRelatorioInterno> gerarPeriodosMensais(int ano) {
                return List.of(
                                periodo("Jan", LocalDate.of(ano, Month.JANUARY, 1),
                                                LocalDate.of(ano, Month.JANUARY, 31)),
                                periodo("Fev", LocalDate.of(ano, Month.FEBRUARY, 1),
                                                LocalDate.of(ano, Month.FEBRUARY,
                                                                LocalDate.of(ano, Month.FEBRUARY, 1).lengthOfMonth())),
                                periodo("Mar", LocalDate.of(ano, Month.MARCH, 1), LocalDate.of(ano, Month.MARCH, 31)),
                                periodo("Abr", LocalDate.of(ano, Month.APRIL, 1), LocalDate.of(ano, Month.APRIL, 30)),
                                periodo("Mai", LocalDate.of(ano, Month.MAY, 1), LocalDate.of(ano, Month.MAY, 31)),
                                periodo("Jun", LocalDate.of(ano, Month.JUNE, 1), LocalDate.of(ano, Month.JUNE, 30)),
                                periodo("Jul", LocalDate.of(ano, Month.JULY, 1), LocalDate.of(ano, Month.JULY, 31)),
                                periodo("Ago", LocalDate.of(ano, Month.AUGUST, 1), LocalDate.of(ano, Month.AUGUST, 31)),
                                periodo("Set", LocalDate.of(ano, Month.SEPTEMBER, 1),
                                                LocalDate.of(ano, Month.SEPTEMBER, 30)),
                                periodo("Out", LocalDate.of(ano, Month.OCTOBER, 1),
                                                LocalDate.of(ano, Month.OCTOBER, 31)),
                                periodo("Nov", LocalDate.of(ano, Month.NOVEMBER, 1),
                                                LocalDate.of(ano, Month.NOVEMBER, 30)),
                                periodo("Dez", LocalDate.of(ano, Month.DECEMBER, 1),
                                                LocalDate.of(ano, Month.DECEMBER, 31)));
        }

        private List<PeriodoRelatorioInterno> gerarPeriodosMensais(LocalDate inicio, LocalDate fim) {
                List<PeriodoRelatorioInterno> periodos = new java.util.ArrayList<>();
                LocalDate cursor = inicio;

                while (!cursor.isAfter(fim)) {
                        LocalDate fimMes = cursor.withDayOfMonth(cursor.lengthOfMonth());
                        LocalDate fimPeriodo = fimMes.isAfter(fim) ? fim : fimMes;
                        periodos.add(periodo(
                                        abreviarMes(cursor.getMonth()) + "/" + String.valueOf(cursor.getYear()).substring(2),
                                        cursor,
                                        fimPeriodo));
                        cursor = fimPeriodo.plusDays(1);
                }

                return periodos;
        }

        private List<PeriodoRelatorioInterno> gerarPeriodosTrimestrais(int ano) {
                return List.of(
                                periodo("1º trim.", LocalDate.of(ano, 1, 1), LocalDate.of(ano, 3, 31)),
                                periodo("2º trim.", LocalDate.of(ano, 4, 1), LocalDate.of(ano, 6, 30)),
                                periodo("3º trim.", LocalDate.of(ano, 7, 1), LocalDate.of(ano, 9, 30)),
                                periodo("4º trim.", LocalDate.of(ano, 10, 1), LocalDate.of(ano, 12, 31)));
        }

        private List<PeriodoRelatorioInterno> gerarPeriodosTrimestrais(LocalDate inicio, LocalDate fim) {
                List<PeriodoRelatorioInterno> periodos = new java.util.ArrayList<>();
                LocalDate cursor = inicio;

                while (!cursor.isAfter(fim)) {
                        int trimestre = ((cursor.getMonthValue() - 1) / 3) + 1;
                        int mesFinalTrimestre = trimestre * 3;
                        LocalDate fimTrimestre = LocalDate
                                        .of(cursor.getYear(), mesFinalTrimestre, 1)
                                        .withDayOfMonth(LocalDate.of(cursor.getYear(), mesFinalTrimestre, 1).lengthOfMonth());
                        LocalDate fimPeriodo = fimTrimestre.isAfter(fim) ? fim : fimTrimestre;
                        periodos.add(periodo(
                                        trimestre + "º trim. " + cursor.getYear(),
                                        cursor,
                                        fimPeriodo));
                        cursor = fimPeriodo.plusDays(1);
                }

                return periodos;
        }

        private List<PeriodoRelatorioInterno> gerarPeriodosSemestrais(LocalDate inicio, LocalDate fim) {
                List<PeriodoRelatorioInterno> periodos = new java.util.ArrayList<>();
                LocalDate cursor = inicio;

                while (!cursor.isAfter(fim)) {
                        boolean primeiroSemestre = cursor.getMonthValue() <= 6;
                        LocalDate fimSemestre = primeiroSemestre
                                        ? LocalDate.of(cursor.getYear(), 6, 30)
                                        : LocalDate.of(cursor.getYear(), 12, 31);
                        LocalDate fimPeriodo = fimSemestre.isAfter(fim) ? fim : fimSemestre;
                        periodos.add(periodo(
                                        (primeiroSemestre ? "1º sem. " : "2º sem. ") + cursor.getYear(),
                                        cursor,
                                        fimPeriodo));
                        cursor = fimPeriodo.plusDays(1);
                }

                return periodos;
        }

        private List<PeriodoRelatorioInterno> gerarPeriodosAnuais(LocalDate inicio, LocalDate fim) {
                List<PeriodoRelatorioInterno> periodos = new java.util.ArrayList<>();
                LocalDate cursor = inicio;

                while (!cursor.isAfter(fim)) {
                        LocalDate fimAno = LocalDate.of(cursor.getYear(), 12, 31);
                        LocalDate fimPeriodo = fimAno.isAfter(fim) ? fim : fimAno;
                        periodos.add(periodo("Ano " + cursor.getYear(), cursor, fimPeriodo));
                        cursor = fimPeriodo.plusDays(1);
                }

                return periodos;
        }

        private String abreviarMes(Month mes) {
                return switch (mes) {
                        case JANUARY -> "Jan";
                        case FEBRUARY -> "Fev";
                        case MARCH -> "Mar";
                        case APRIL -> "Abr";
                        case MAY -> "Mai";
                        case JUNE -> "Jun";
                        case JULY -> "Jul";
                        case AUGUST -> "Ago";
                        case SEPTEMBER -> "Set";
                        case OCTOBER -> "Out";
                        case NOVEMBER -> "Nov";
                        case DECEMBER -> "Dez";
                };
        }

        private PeriodoRelatorioInterno periodo(String label, LocalDate inicio, LocalDate fim) {
                return new PeriodoRelatorioInterno(label, inicio, fim);
        }

        private RelatorioDestaqueResponse montarDestaques(
                        List<RelatorioPeriodoResponse> periodos,
                        List<RelatorioEnsaioMaisRealizadoResponse> ensaiosMaisRealizados) {
                RelatorioPeriodoResponse maior = periodos.stream()
                                .filter(periodo -> periodo.getTotalLiquido().compareTo(BigDecimal.ZERO) > 0)
                                .max(Comparator.comparing(RelatorioPeriodoResponse::getTotalLiquido))
                                .orElse(null);

                RelatorioPeriodoResponse menor = periodos.stream()
                                .filter(periodo -> periodo.getTotalLiquido().compareTo(BigDecimal.ZERO) > 0)
                                .min(Comparator.comparing(RelatorioPeriodoResponse::getTotalLiquido))
                                .orElse(null);

                RelatorioEnsaioMaisRealizadoResponse tipoMaisRealizado = ensaiosMaisRealizados.stream()
                                .findFirst()
                                .orElse(null);

                return RelatorioDestaqueResponse.builder()
                                .melhorPeriodo(maior != null ? maior.getLabel() : "-")
                                .maiorReceita(maior != null ? maior.getTotalLiquido() : BigDecimal.ZERO)
                                .menorReceita(menor != null ? menor.getTotalLiquido() : BigDecimal.ZERO)
                                .tipoMaisRealizado(tipoMaisRealizado != null ? tipoMaisRealizado.getTipo() : null)
                                .tipoMaisRealizadoExibicao(tipoMaisRealizado != null
                                                ? tipoMaisRealizado.getTipoExibicao()
                                                : null)
                                .quantidadeTipoMaisRealizado(tipoMaisRealizado != null
                                                ? tipoMaisRealizado.getQuantidadeEnsaios()
                                                : 0)
                                .build();
        }

        private String resolverTipoExibicao(Ensaio ensaio) {
                if (ensaio == null || ensaio.getTipo() == null) {
                        return "Nao informado";
                }

                if (ensaio.getTipo() == TipoEnsaio.OUTRO
                                && ensaio.getTipoPersonalizado() != null
                                && !ensaio.getTipoPersonalizado().isBlank()) {
                        return ensaio.getTipoPersonalizado().trim();
                }

                return ensaio.getTipo().getDescricao();
        }

        private List<PeriodoRelatorioInterno> gerarPeriodoAnual(int ano) {
                return List.of(
                                periodo("Ano " + ano, LocalDate.of(ano, 1, 1), LocalDate.of(ano, 12, 31)));
        }

        private BigDecimal calcularMedia(BigDecimal total, int quantidadePeriodos) {
                if (quantidadePeriodos <= 0) {
                        return BigDecimal.ZERO;
                }

                return total.divide(
                                BigDecimal.valueOf(quantidadePeriodos),
                                2,
                                RoundingMode.HALF_UP);
        }

        private BigDecimal somar(
                        List<RelatorioPeriodoResponse> periodos,
                        FunctionRelatorio mapper) {
                return periodos.stream()
                                .map(mapper::getValor)
                                .filter(valor -> valor != null)
                                .reduce(BigDecimal.ZERO, BigDecimal::add);
        }

        private List<PeriodoRelatorioInterno> gerarPeriodosSemestrais(int ano) {
                return List.of(
                                periodo("1º sem.", LocalDate.of(ano, 1, 1), LocalDate.of(ano, 6, 30)),
                                periodo("2º sem.", LocalDate.of(ano, 7, 1), LocalDate.of(ano, 12, 31)));
        }

        private String montarDescricao(TipoPeriodoRelatorio tipo, int ano) {
                return resolverNomeAgrupamento(tipo) + " - " + ano;
        }

        private String montarDescricao(TipoPeriodoRelatorio tipo, int ano, LocalDate dataInicio, LocalDate dataFim) {
                if (dataInicio == null && dataFim == null) {
                        return montarDescricao(tipo, ano);
                }

                LocalDate inicio = dataInicio != null ? dataInicio : LocalDate.of(ano, 1, 1);
                LocalDate fim = dataFim != null ? dataFim : LocalDate.of(ano, 12, 31);

                if (fim.isBefore(inicio)) {
                        LocalDate originalInicio = inicio;
                        inicio = fim;
                        fim = originalInicio;
                }

                DateTimeFormatter formatter = DateTimeFormatter.ofPattern("dd/MM/yyyy");

                return resolverNomeAgrupamento(tipo) + " - " + inicio.format(formatter) + " a " + fim.format(formatter);
        }

        private String resolverNomeAgrupamento(TipoPeriodoRelatorio tipo) {
                return switch (tipo) {
                        case DIARIO -> "Diario";
                        case SEMANAL -> "Semanal";
                        case ANUAL -> "Anual";
                        case SEMESTRAL -> "Semestral";
                        case TRIMESTRAL -> "Trimestral";
                        case MENSAL -> "Mensal";
                };
        }

        @FunctionalInterface
        private interface FunctionRelatorio {
                BigDecimal getValor(RelatorioPeriodoResponse periodo);
        }

        @Getter
        @AllArgsConstructor
        private static class PeriodoRelatorioInterno {
                private String label;
                private LocalDate inicio;
                private LocalDate fim;
        }

        private RelatorioComparativoResponse montarComparativo(
        BigDecimal totalAtual,
        BigDecimal totalAnterior,
        int ensaiosAtual,
        int ensaiosAnterior,
        int anoComparado
) {
    BigDecimal percentualFaturamento = calcularPercentualVariacao(totalAtual, totalAnterior);
    int diferencaEnsaios = ensaiosAtual - ensaiosAnterior;

    return RelatorioComparativoResponse.builder()
            .anoComparado(anoComparado)
            .percentualFaturamento(percentualFaturamento)
            .diferencaEnsaios(diferencaEnsaios)
            .descricaoFaturamento(montarDescricaoFaturamento(
                    percentualFaturamento,
                    totalAtual,
                    totalAnterior,
                    anoComparado
            ))
            .descricaoEnsaios(montarDescricaoEnsaios(diferencaEnsaios, anoComparado))
            .tendenciaFaturamento(resolverTendenciaPercentual(percentualFaturamento))
            .tendenciaEnsaios(resolverTendenciaNumero(diferencaEnsaios))
            .build();
}

private BigDecimal calcularPercentualVariacao(BigDecimal atual, BigDecimal anterior) {
    if (anterior == null || anterior.compareTo(BigDecimal.ZERO) == 0) {
        return null;
    }

    return atual.subtract(anterior)
            .multiply(BigDecimal.valueOf(100))
            .divide(anterior, 2, RoundingMode.HALF_UP);
}

private BigDecimal calcularPercentualParticipacao(BigDecimal valor, BigDecimal total) {
    if (valor == null || total == null || total.compareTo(BigDecimal.ZERO) == 0) {
        return BigDecimal.ZERO;
    }

    return valor.multiply(BigDecimal.valueOf(100))
            .divide(total, 2, RoundingMode.HALF_UP);
}

private BigDecimal calcularPercentualQuantidade(int quantidade, int total) {
    if (total <= 0) {
        return BigDecimal.ZERO;
    }

    return BigDecimal.valueOf(quantidade)
            .multiply(BigDecimal.valueOf(100))
            .divide(BigDecimal.valueOf(total), 1, RoundingMode.HALF_UP);
}

private String montarDescricaoFaturamento(
        BigDecimal percentual,
        BigDecimal totalAtual,
        BigDecimal totalAnterior,
        int anoComparado
) {
    if (percentual == null) {
        if (totalAtual.compareTo(BigDecimal.ZERO) > 0 &&
                totalAnterior.compareTo(BigDecimal.ZERO) == 0) {
            return "Sem base em " + anoComparado;
        }

        return "Sem valores em " + anoComparado;
    }

    if (percentual.compareTo(BigDecimal.ZERO) == 0) {
        return "Sem variação vs " + anoComparado;
    }

    BigDecimal percentualFormatado = percentual.abs().setScale(0, RoundingMode.HALF_UP);

    if (percentual.compareTo(BigDecimal.ZERO) > 0) {
        return "↑ +" + percentualFormatado + "% vs " + anoComparado;
    }

    return "↓ -" + percentualFormatado + "% vs " + anoComparado;
}

private String montarDescricaoEnsaios(int diferencaEnsaios, int anoComparado) {
    if (diferencaEnsaios > 0) {
        return "↑ " + diferencaEnsaios + " a mais que " + anoComparado;
    }

    if (diferencaEnsaios < 0) {
        return "↓ " + Math.abs(diferencaEnsaios) + " a menos que " + anoComparado;
    }

    return "Igual a " + anoComparado;
}

private String resolverTendenciaPercentual(BigDecimal percentual) {
    if (percentual == null) {
        return "SEM_BASE";
    }

    if (percentual.compareTo(BigDecimal.ZERO) > 0) {
        return "ALTA";
    }

    if (percentual.compareTo(BigDecimal.ZERO) < 0) {
        return "QUEDA";
    }

    return "NEUTRO";
}

private String resolverTendenciaNumero(int valor) {
    if (valor > 0) {
        return "ALTA";
    }

    if (valor < 0) {
        return "QUEDA";
    }

    return "NEUTRO";
}

private String resolverUnidadePeriodo(TipoPeriodoRelatorio tipo) {
    return switch (tipo) {
        case DIARIO -> "dia";
        case SEMANAL -> "semana";
        case ANUAL -> "ano";
        case SEMESTRAL -> "semestre";
        case TRIMESTRAL -> "trimestre";
        case MENSAL -> "mês";
    };
}
}
