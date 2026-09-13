package com.fotolhar.service;

import com.fotolhar.dto.DashboardInsightsAgendaResponse;
import com.fotolhar.dto.DashboardInsightsClienteDestaqueResponse;
import com.fotolhar.dto.DashboardInsightsClientesResponse;
import com.fotolhar.dto.DashboardInsightsFinanceiroResponse;
import com.fotolhar.dto.DashboardInsightsFrequenciaClienteResponse;
import com.fotolhar.dto.DashboardInsightsHorarioResponse;
import com.fotolhar.dto.DashboardInsightsMesResponse;
import com.fotolhar.dto.DashboardInsightsProducaoResponse;
import com.fotolhar.dto.DashboardInsightsQuantidadeResponse;
import com.fotolhar.dto.DashboardInsightsResponse;
import com.fotolhar.dto.RelatorioEnsaioMaisRealizadoResponse;
import com.fotolhar.dto.RelatorioFaturamentoResponse;
import com.fotolhar.enums.StatusEnsaio;
import com.fotolhar.enums.TipoPeriodoRelatorio;
import com.fotolhar.model.Cliente;
import com.fotolhar.model.Ensaio;
import com.fotolhar.model.HistoricoStatusEnsaio;
import com.fotolhar.model.Usuario;
import com.fotolhar.repository.EnsaioRepository;
import com.fotolhar.repository.HistoricoStatusEnsaioRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.DayOfWeek;
import java.time.Duration;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Métricas de negócio para o Dashboard. As métricas históricas não recebem filtro
 * de período; agenda, produção por tipo e financeiro usam o intervalo informado.
 */
@Service
@RequiredArgsConstructor
public class DashboardInsightService {

    private static final ZoneId APP_ZONE = ZoneId.of("America/Sao_Paulo");
    private static final BigDecimal DIAS_POR_MES = new BigDecimal("30.44");

    private final EnsaioRepository ensaioRepository;
    private final HistoricoStatusEnsaioRepository historicoStatusEnsaioRepository;
    private final RelatorioService relatorioService;
    private final UsuarioContextService usuarioContextService;

    @Transactional(readOnly = true)
    public DashboardInsightsResponse buscarInsights(LocalDate inicio, LocalDate fim) {
        Periodo periodo = resolverPeriodo(inicio, fim);
        Usuario usuario = usuarioContextService.getUsuarioLogado();

        List<Ensaio> ensaiosDoUsuario = ensaioRepository.findByClienteUsuarioId(usuario.getId());
        List<Ensaio> ensaiosValidos = ensaiosDoUsuario.stream()
                .filter(this::naoCancelado)
                .toList();
        List<Ensaio> ensaiosDoPeriodo = ensaiosValidos.stream()
                .filter(ensaio -> estaNoPeriodo(ensaio, periodo))
                .toList();

        Map<UUID, List<HistoricoStatusEnsaio>> historicosPorEnsaio = carregarHistoricos(ensaiosValidos);
        RelatorioFaturamentoResponse financeiroExistente = relatorioService.buscarFaturamento(
                TipoPeriodoRelatorio.MENSAL,
                periodo.fim().getYear(),
                periodo.inicio(),
                periodo.fim());

        return DashboardInsightsResponse.builder()
                .clientes(montarClientes(ensaiosValidos))
                .agenda(montarAgenda(ensaiosDoPeriodo))
                .financeiro(montarFinanceiro(financeiroExistente))
                .producao(montarProducao(ensaiosValidos, historicosPorEnsaio, financeiroExistente))
                .build();
    }

    private DashboardInsightsClientesResponse montarClientes(List<Ensaio> ensaiosValidos) {
        Map<UUID, List<Ensaio>> ensaiosPorCliente = ensaiosValidos.stream()
                .filter(ensaio -> ensaio.getCliente() != null && ensaio.getCliente().getId() != null)
                .collect(Collectors.groupingBy(ensaio -> ensaio.getCliente().getId()));

        List<DashboardInsightsFrequenciaClienteResponse> frequencias = ensaiosPorCliente.values().stream()
                .map(this::montarFrequencia)
                .sorted(Comparator.comparing(DashboardInsightsFrequenciaClienteResponse::getQuantidadeEnsaios)
                        .reversed()
                        .thenComparing(DashboardInsightsFrequenciaClienteResponse::getClienteNome,
                                Comparator.nullsLast(String::compareToIgnoreCase)))
                .toList();

        int totalComContratacao = frequencias.size();
        int recorrentes = (int) frequencias.stream()
                .filter(cliente -> cliente.getQuantidadeEnsaios() >= 2)
                .count();

        DashboardInsightsClienteDestaqueResponse destaque = ensaiosPorCliente.values().stream()
                .map(this::montarDestaqueCliente)
                .max(Comparator.comparing(DashboardInsightsClienteDestaqueResponse::getQuantidadeEnsaios)
                        .thenComparing(destaqueCliente -> ultimoEnsaio(ensaiosPorCliente.get(destaqueCliente.getId())))
                        .thenComparing(DashboardInsightsClienteDestaqueResponse::getNome,
                                Comparator.nullsLast(String::compareToIgnoreCase)))
                .orElse(null);

        BigDecimal intervaloMedioRetorno = media(
                frequencias.stream()
                        .map(DashboardInsightsFrequenciaClienteResponse::getIntervaloMedioMeses)
                        .filter(valor -> valor != null)
                        .toList());
        int clientesComIntervaloRetorno = (int) frequencias.stream()
                .map(DashboardInsightsFrequenciaClienteResponse::getIntervaloMedioMeses)
                .filter(valor -> valor != null)
                .count();

        int inativos = (int) ensaiosPorCliente.values().stream()
                .filter(this::clienteInativo)
                .count();

        return DashboardInsightsClientesResponse.builder()
                .totalComContratacao(totalComContratacao)
                .recorrentes(recorrentes)
                .taxaRetorno(percentual(recorrentes, totalComContratacao))
                .inativos(inativos)
                .clienteQueMaisContratou(destaque)
                .intervaloMedioRetornoMeses(intervaloMedioRetorno)
                .clientesComIntervaloRetorno(clientesComIntervaloRetorno)
                .frequenciaContratacao(frequencias)
                .build();
    }

    private DashboardInsightsFrequenciaClienteResponse montarFrequencia(List<Ensaio> ensaios) {
        List<Ensaio> ordenados = ensaios.stream()
                .sorted(Comparator.comparing(Ensaio::getDataEnsaio))
                .toList();
        Cliente cliente = ordenados.getFirst().getCliente();
        int quantidade = ordenados.size();

        List<BigDecimal> intervalos = new ArrayList<>();
        for (int indice = 1; indice < ordenados.size(); indice++) {
            long dias = ChronoUnit.DAYS.between(
                    dataLocal(ordenados.get(indice - 1).getDataEnsaio()),
                    dataLocal(ordenados.get(indice).getDataEnsaio()));
            if (dias >= 0) {
                intervalos.add(BigDecimal.valueOf(dias)
                        .divide(DIAS_POR_MES, 2, RoundingMode.HALF_UP));
            }
        }

        return DashboardInsightsFrequenciaClienteResponse.builder()
                .clienteId(cliente.getId())
                .clienteNome(cliente.getNome())
                .quantidadeEnsaios(quantidade)
                .classificacao(classificarFrequencia(quantidade))
                .ultimoEnsaio(dataLocal(ordenados.getLast().getDataEnsaio()))
                .intervaloMedioMeses(media(intervalos))
                .build();
    }

    private DashboardInsightsClienteDestaqueResponse montarDestaqueCliente(List<Ensaio> ensaios) {
        Cliente cliente = ensaios.getFirst().getCliente();
        return DashboardInsightsClienteDestaqueResponse.builder()
                .id(cliente.getId())
                .nome(cliente.getNome())
                .quantidadeEnsaios(ensaios.size())
                .build();
    }

    private boolean clienteInativo(List<Ensaio> ensaios) {
        LocalDate hoje = LocalDate.now(APP_ZONE);
        return ensaios.stream()
                .map(Ensaio::getDataEnsaio)
                .filter(data -> data != null && !dataLocal(data).isAfter(hoje))
                .map(this::dataLocal)
                .max(Comparator.naturalOrder())
                .map(ultimoEnsaio -> ChronoUnit.MONTHS.between(ultimoEnsaio, hoje) >= 12)
                .orElse(false);
    }

    private DashboardInsightsAgendaResponse montarAgenda(List<Ensaio> ensaios) {
        return DashboardInsightsAgendaResponse.builder()
                .quantidadeEnsaiosConsiderados(ensaios.size())
                .quantidadeMesesComDados((int) ensaios.stream()
                        .map(ensaio -> AnoMes.of(dataLocal(ensaio.getDataEnsaio())))
                        .distinct()
                        .count())
                .diaMaisProcurado(maisProcuradoPorDia(ensaios))
                .faixaMaisProcurada(maisProcuradoPorFaixa(ensaios))
                .horarioMaisProcurado(maisProcuradoPorHora(ensaios))
                .mesMaisMovimentado(mesMaisMovimentado(ensaios))
                .build();
    }

    private DashboardInsightsQuantidadeResponse maisProcuradoPorDia(List<Ensaio> ensaios) {
        Map<DayOfWeek, Long> quantidadePorDia = ensaios.stream()
                .collect(Collectors.groupingBy(ensaio -> noFuso(ensaio.getDataEnsaio()).getDayOfWeek(),
                        () -> new EnumMap<>(DayOfWeek.class), Collectors.counting()));
        return quantidadePorDia.entrySet().stream()
                .max(Map.Entry.<DayOfWeek, Long>comparingByValue()
                        .thenComparing(entry -> -entry.getKey().getValue()))
                .map(entry -> quantidade(entry.getKey().getDisplayName(java.time.format.TextStyle.FULL,
                        new java.util.Locale("pt", "BR")), entry.getValue(), ensaios.size()))
                .orElse(null);
    }

    private DashboardInsightsQuantidadeResponse maisProcuradoPorFaixa(List<Ensaio> ensaios) {
        Map<FaixaHorario, Long> quantidadePorFaixa = ensaios.stream()
                .collect(Collectors.groupingBy(ensaio -> FaixaHorario.daHora(noFuso(ensaio.getDataEnsaio()).getHour()),
                        () -> new EnumMap<>(FaixaHorario.class), Collectors.counting()));
        return quantidadePorFaixa.entrySet().stream()
                .max(Map.Entry.<FaixaHorario, Long>comparingByValue()
                        .thenComparing(entry -> -entry.getKey().ordinal()))
                .map(entry -> quantidade(entry.getKey().getDescricao(), entry.getValue(), ensaios.size()))
                .orElse(null);
    }

    private DashboardInsightsHorarioResponse maisProcuradoPorHora(List<Ensaio> ensaios) {
        return ensaios.stream()
                .collect(Collectors.groupingBy(ensaio -> noFuso(ensaio.getDataEnsaio()).getHour(), Collectors.counting()))
                .entrySet().stream()
                .max(Map.Entry.<Integer, Long>comparingByValue().thenComparing(entry -> -entry.getKey()))
                .map(entry -> DashboardInsightsHorarioResponse.builder()
                        .hora(entry.getKey())
                        .quantidade(entry.getValue().intValue())
                        .percentual(percentual(entry.getValue().intValue(), ensaios.size()))
                        .build())
                .orElse(null);
    }

    private DashboardInsightsMesResponse mesMaisMovimentado(List<Ensaio> ensaios) {
        return ensaios.stream()
                .collect(Collectors.groupingBy(ensaio -> AnoMes.of(dataLocal(ensaio.getDataEnsaio())), Collectors.counting()))
                .entrySet().stream()
                .max(Map.Entry.<AnoMes, Long>comparingByValue()
                        .thenComparing(entry -> entry.getKey().ano())
                        .thenComparing(entry -> entry.getKey().mes()))
                .map(entry -> DashboardInsightsMesResponse.builder()
                        .mes(entry.getKey().mes())
                        .ano(entry.getKey().ano())
                        .quantidadeEnsaios(entry.getValue().intValue())
                        .build())
                .orElse(null);
    }

    private DashboardInsightsFinanceiroResponse montarFinanceiro(RelatorioFaturamentoResponse relatorio) {
        return DashboardInsightsFinanceiroResponse.builder()
                .ticketMedio(relatorio.getTicketMedioEnsaio())
                .fotosExtrasVendidas(relatorio.getFotosExtrasVendidas())
                .receitaFotosExtras(relatorio.getExcedentesCobrados())
                .build();
    }

    private DashboardInsightsProducaoResponse montarProducao(
            List<Ensaio> ensaiosValidos,
            Map<UUID, List<HistoricoStatusEnsaio>> historicosPorEnsaio,
            RelatorioFaturamentoResponse relatorio) {
        RelatorioEnsaioMaisRealizadoResponse tipoMaisContratado = relatorio.getEnsaiosMaisRealizados().stream()
                .findFirst()
                .orElse(null);

        List<BigDecimal> duracoesEdicao = mediaDuracao(ensaiosValidos, historicosPorEnsaio, true);
        List<BigDecimal> duracoesFluxo = mediaDuracao(ensaiosValidos, historicosPorEnsaio, false);

        return DashboardInsightsProducaoResponse.builder()
                .tempoMedioEdicaoDias(media(duracoesEdicao))
                .amostrasTempoEdicao(duracoesEdicao.size())
                .tempoMedioFluxoDias(media(duracoesFluxo))
                .amostrasTempoFluxo(duracoesFluxo.size())
                .tipoMaisContratado(tipoMaisContratado == null ? null : DashboardInsightsQuantidadeResponse.builder()
                        .descricao(tipoMaisContratado.getTipoExibicao())
                        .quantidade(tipoMaisContratado.getQuantidadeEnsaios())
                        .percentual(tipoMaisContratado.getPercentual())
                        .build())
                .build();
    }

    private List<BigDecimal> mediaDuracao(
            List<Ensaio> ensaios,
            Map<UUID, List<HistoricoStatusEnsaio>> historicosPorEnsaio,
            boolean somenteEdicao) {
        return ensaios.stream()
                .map(ensaio -> calcularDuracao(ensaio, historicosPorEnsaio.getOrDefault(ensaio.getId(), List.of()), somenteEdicao))
                .filter(valor -> valor != null)
                .toList();
    }

    private BigDecimal calcularDuracao(
            Ensaio ensaio,
            List<HistoricoStatusEnsaio> historicos,
            boolean somenteEdicao) {
        OffsetDateTime finalizadoEm = historicos.stream()
                .filter(historico -> historico.getStatus() == StatusEnsaio.FINALIZADO)
                .map(HistoricoStatusEnsaio::getAlteradoEm)
                .filter(data -> data != null)
                .max(Comparator.naturalOrder())
                .orElse(null);
        if (finalizadoEm == null) {
            return null;
        }

        OffsetDateTime inicio = somenteEdicao
                ? historicos.stream()
                        .filter(historico -> historico.getStatus() == StatusEnsaio.EM_EDICAO)
                        .map(HistoricoStatusEnsaio::getAlteradoEm)
                        .filter(data -> data != null && !data.isAfter(finalizadoEm))
                        .max(Comparator.naturalOrder())
                        .orElse(null)
                : ensaio.getDataEnsaio();

        if (inicio == null || inicio.isAfter(finalizadoEm)) {
            return null;
        }

        return BigDecimal.valueOf(Duration.between(inicio, finalizadoEm).toMinutes())
                .divide(BigDecimal.valueOf(60 * 24), 2, RoundingMode.HALF_UP);
    }

    private Map<UUID, List<HistoricoStatusEnsaio>> carregarHistoricos(Collection<Ensaio> ensaios) {
        List<UUID> ids = ensaios.stream().map(Ensaio::getId).filter(id -> id != null).toList();
        if (ids.isEmpty()) {
            return Map.of();
        }
        return historicoStatusEnsaioRepository.findByEnsaioIdInOrderByAlteradoEmAsc(ids).stream()
                .filter(historico -> historico.getEnsaio() != null && historico.getEnsaio().getId() != null)
                .collect(Collectors.groupingBy(historico -> historico.getEnsaio().getId()));
    }

    private boolean naoCancelado(Ensaio ensaio) {
        return ensaio.getStatus() != StatusEnsaio.CANCELADO;
    }

    private boolean estaNoPeriodo(Ensaio ensaio, Periodo periodo) {
        LocalDate data = dataLocal(ensaio.getDataEnsaio());
        return !data.isBefore(periodo.inicio()) && !data.isAfter(periodo.fim());
    }

    private Periodo resolverPeriodo(LocalDate inicio, LocalDate fim) {
        LocalDate hoje = LocalDate.now(APP_ZONE);
        LocalDate inicioPadrao = hoje.minusMonths(12).plusDays(1);
        LocalDate inicioFinal = inicio == null ? inicioPadrao : inicio;
        LocalDate fimFinal = fim == null ? hoje : fim;
        if (fimFinal.isBefore(inicioFinal)) {
            return new Periodo(fimFinal, inicioFinal);
        }
        return new Periodo(inicioFinal, fimFinal);
    }

    private DashboardInsightsQuantidadeResponse quantidade(String descricao, long quantidade, int total) {
        return DashboardInsightsQuantidadeResponse.builder()
                .descricao(descricao)
                .quantidade(Math.toIntExact(quantidade))
                .percentual(percentual(Math.toIntExact(quantidade), total))
                .build();
    }

    private BigDecimal percentual(int quantidade, int total) {
        if (total <= 0) {
            return BigDecimal.ZERO;
        }
        return BigDecimal.valueOf(quantidade)
                .multiply(BigDecimal.valueOf(100))
                .divide(BigDecimal.valueOf(total), 2, RoundingMode.HALF_UP);
    }

    private BigDecimal media(List<BigDecimal> valores) {
        if (valores.isEmpty()) {
            return null;
        }
        return valores.stream()
                .reduce(BigDecimal.ZERO, BigDecimal::add)
                .divide(BigDecimal.valueOf(valores.size()), 2, RoundingMode.HALF_UP);
    }

    private OffsetDateTime ultimoEnsaio(List<Ensaio> ensaios) {
        return ensaios.stream().map(Ensaio::getDataEnsaio).max(Comparator.naturalOrder()).orElse(null);
    }

    private LocalDate dataLocal(OffsetDateTime data) {
        return noFuso(data).toLocalDate();
    }

    private ZonedDateTime noFuso(OffsetDateTime data) {
        return data.atZoneSameInstant(APP_ZONE);
    }

    private String classificarFrequencia(int quantidade) {
        if (quantidade == 1) {
            return "PONTUAL";
        }
        if (quantidade <= 3) {
            return "RECORRENTE";
        }
        if (quantidade <= 6) {
            return "FREQUENTE";
        }
        return "MUITO_FREQUENTE";
    }

    private record Periodo(LocalDate inicio, LocalDate fim) { }

    private record AnoMes(int ano, int mes) {
        static AnoMes of(LocalDate data) {
            return new AnoMes(data.getYear(), data.getMonthValue());
        }
    }

    private enum FaixaHorario {
        MADRUGADA("Madrugada"),
        MANHA("Manhã"),
        TARDE("Tarde"),
        NOITE("Noite");

        private final String descricao;

        FaixaHorario(String descricao) {
            this.descricao = descricao;
        }

        public String getDescricao() {
            return descricao;
        }

        static FaixaHorario daHora(int hora) {
            if (hora < 6) {
                return MADRUGADA;
            }
            if (hora < 12) {
                return MANHA;
            }
            if (hora < 18) {
                return TARDE;
            }
            return NOITE;
        }
    }
}
