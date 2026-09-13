package com.fotolhar.service;

import com.fotolhar.dto.DashboardInsightsResponse;
import com.fotolhar.dto.RelatorioFaturamentoResponse;
import com.fotolhar.enums.StatusEnsaio;
import com.fotolhar.enums.TipoEnsaio;
import com.fotolhar.model.Cliente;
import com.fotolhar.model.Ensaio;
import com.fotolhar.model.HistoricoStatusEnsaio;
import com.fotolhar.model.Usuario;
import com.fotolhar.repository.EnsaioRepository;
import com.fotolhar.repository.HistoricoStatusEnsaioRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class DashboardInsightServiceTest {

    private static final ZoneId APP_ZONE = ZoneId.of("America/Sao_Paulo");

    private final EnsaioRepository ensaioRepository = mock(EnsaioRepository.class);
    private final HistoricoStatusEnsaioRepository historicoRepository = mock(HistoricoStatusEnsaioRepository.class);
    private final RelatorioService relatorioService = mock(RelatorioService.class);
    private final UsuarioContextService usuarioContextService = mock(UsuarioContextService.class);

    private final DashboardInsightService service = new DashboardInsightService(
            ensaioRepository,
            historicoRepository,
            relatorioService,
            usuarioContextService
    );

    private final UUID usuarioA = UUID.randomUUID();

    @BeforeEach
    void prepararRelatorio() {
        when(usuarioContextService.getUsuarioLogado()).thenReturn(Usuario.builder().id(usuarioA).build());
        when(relatorioService.buscarFaturamento(any(), anyInt(), any(), any()))
                .thenReturn(RelatorioFaturamentoResponse.builder()
                        .ticketMedioEnsaio(new BigDecimal("850.00"))
                        .fotosExtrasVendidas(2)
                        .excedentesCobrados(new BigDecimal("100.00"))
                        .ensaiosMaisRealizados(List.of())
                        .build());
    }

    @Test
    void calculaRecorrenciaTaxaEIgnoraCancelados() {
        Cliente pontual = cliente("Pontual");
        Cliente recorrente = cliente("Recorrente");
        Cliente somenteCancelado = cliente("Cancelado");
        OffsetDateTime data = agora().minusMonths(3);

        when(ensaioRepository.findByClienteUsuarioId(usuarioA)).thenReturn(List.of(
                ensaio(pontual, data, StatusEnsaio.FINALIZADO),
                ensaio(recorrente, data.minusMonths(5), StatusEnsaio.FINALIZADO),
                ensaio(recorrente, data, StatusEnsaio.EM_EDICAO),
                ensaio(somenteCancelado, data, StatusEnsaio.CANCELADO)
        ));
        when(historicoRepository.findByEnsaioIdInOrderByAlteradoEmAsc(any())).thenReturn(List.of());

        DashboardInsightsResponse resposta = buscarTodosOsDados();

        assertThat(resposta.getClientes().getTotalComContratacao()).isEqualTo(2);
        assertThat(resposta.getClientes().getRecorrentes()).isEqualTo(1);
        assertThat(resposta.getClientes().getTaxaRetorno()).isEqualByComparingTo("50.00");
        assertThat(resposta.getClientes().getClienteQueMaisContratou().getNome()).isEqualTo("Recorrente");
        assertThat(resposta.getClientes().getClienteQueMaisContratou().getQuantidadeEnsaios()).isEqualTo(2);
        assertThat(resposta.getClientes().getFrequenciaContratacao())
                .extracting(item -> item.getClassificacao())
                .containsExactly("RECORRENTE", "PONTUAL");
    }

    @Test
    void calculaInatividadeDeDozeMesesSemUsarArquivamentoManual() {
        Cliente inativo = cliente("Inativo");
        inativo.setAtivo(true);
        Cliente recente = cliente("Recente");
        recente.setAtivo(false);

        when(ensaioRepository.findByClienteUsuarioId(usuarioA)).thenReturn(List.of(
                ensaio(inativo, agora().minusMonths(12), StatusEnsaio.FINALIZADO),
                ensaio(recente, agora().minusMonths(11), StatusEnsaio.FINALIZADO)
        ));
        when(historicoRepository.findByEnsaioIdInOrderByAlteradoEmAsc(any())).thenReturn(List.of());

        DashboardInsightsResponse resposta = buscarTodosOsDados();

        assertThat(resposta.getClientes().getInativos()).isEqualTo(1);
    }

    @Test
    void calculaFaixaHorarioDiaEMesComDesempateDeterministico() {
        Cliente cliente = cliente("Agenda");
        OffsetDateTime segundaNove = data(2026, 3, 2, 9);
        OffsetDateTime tercaNove = data(2026, 3, 3, 9);
        OffsetDateTime segundaQuatorze = data(2026, 3, 9, 14);
        OffsetDateTime sextaQuatorze = data(2026, 4, 3, 14);

        when(ensaioRepository.findByClienteUsuarioId(usuarioA)).thenReturn(List.of(
                ensaio(cliente, segundaNove, StatusEnsaio.AGENDADO),
                ensaio(cliente, tercaNove, StatusEnsaio.AGENDADO),
                ensaio(cliente, segundaQuatorze, StatusEnsaio.AGENDADO),
                ensaio(cliente, sextaQuatorze, StatusEnsaio.AGENDADO)
        ));
        when(historicoRepository.findByEnsaioIdInOrderByAlteradoEmAsc(any())).thenReturn(List.of());

        DashboardInsightsResponse resposta = service.buscarInsights(
                LocalDate.of(2026, 1, 1), LocalDate.of(2026, 12, 31));

        assertThat(resposta.getAgenda().getDiaMaisProcurado().getDescricao()).isEqualTo("segunda-feira");
        assertThat(resposta.getAgenda().getFaixaMaisProcurada().getDescricao()).isEqualTo("Manhã");
        assertThat(resposta.getAgenda().getHorarioMaisProcurado().getHora()).isEqualTo(9);
        assertThat(resposta.getAgenda().getMesMaisMovimentado().getMes()).isEqualTo(3);
        assertThat(resposta.getAgenda().getMesMaisMovimentado().getAno()).isEqualTo(2026);
    }

    @Test
    void calculaTemposSomenteQuandoHistoricoEstaCompleto() {
        Cliente cliente = cliente("Produção");
        Ensaio completo = ensaio(cliente, agora().minusDays(10), StatusEnsaio.FINALIZADO);
        Ensaio incompleto = ensaio(cliente, agora().minusDays(8), StatusEnsaio.EM_EDICAO);
        OffsetDateTime finalizado = completo.getDataEnsaio().plusDays(10);

        when(ensaioRepository.findByClienteUsuarioId(usuarioA)).thenReturn(List.of(completo, incompleto));
        when(historicoRepository.findByEnsaioIdInOrderByAlteradoEmAsc(any())).thenReturn(List.of(
                historico(completo, StatusEnsaio.EM_EDICAO, finalizado.minusDays(5)),
                historico(completo, StatusEnsaio.FINALIZADO, finalizado),
                historico(incompleto, StatusEnsaio.EM_EDICAO, agora().minusDays(4))
        ));

        DashboardInsightsResponse resposta = buscarTodosOsDados();

        assertThat(resposta.getProducao().getTempoMedioEdicaoDias()).isEqualByComparingTo("5.00");
        assertThat(resposta.getProducao().getTempoMedioFluxoDias()).isEqualByComparingTo("10.00");
    }

    @Test
    void consultaApenasEnsaiosDaFotografaAutenticada() {
        Cliente clienteA = cliente("Cliente A");
        Cliente clienteDeOutroUsuario = cliente("Não deve aparecer");
        UUID usuarioB = UUID.randomUUID();

        when(ensaioRepository.findByClienteUsuarioId(usuarioA)).thenReturn(List.of(
                ensaio(clienteA, agora().minusDays(3), StatusEnsaio.AGENDADO)
        ));
        when(historicoRepository.findByEnsaioIdInOrderByAlteradoEmAsc(any())).thenReturn(List.of());

        DashboardInsightsResponse resposta = buscarTodosOsDados();

        assertThat(resposta.getClientes().getFrequenciaContratacao())
                .extracting(item -> item.getClienteNome())
                .containsExactly("Cliente A")
                .doesNotContain(clienteDeOutroUsuario.getNome());
        verify(ensaioRepository).findByClienteUsuarioId(usuarioA);
        assertThat(usuarioB).isNotEqualTo(usuarioA);
    }

    private DashboardInsightsResponse buscarTodosOsDados() {
        return service.buscarInsights(LocalDate.now(APP_ZONE).minusYears(2), LocalDate.now(APP_ZONE).plusDays(1));
    }

    private Cliente cliente(String nome) {
        return Cliente.builder().id(UUID.randomUUID()).nome(nome).ativo(true).build();
    }

    private Ensaio ensaio(Cliente cliente, OffsetDateTime data, StatusEnsaio status) {
        return Ensaio.builder()
                .id(UUID.randomUUID())
                .cliente(cliente)
                .tipo(TipoEnsaio.FAMILIA)
                .status(status)
                .dataEnsaio(data)
                .local("Estúdio")
                .qtdFotosPacote(20)
                .valorPacote(new BigDecimal("800.00"))
                .build();
    }

    private HistoricoStatusEnsaio historico(Ensaio ensaio, StatusEnsaio status, OffsetDateTime alteradoEm) {
        return HistoricoStatusEnsaio.builder()
                .id(UUID.randomUUID())
                .ensaio(ensaio)
                .status(status)
                .alteradoEm(alteradoEm)
                .build();
    }

    private OffsetDateTime agora() {
        return OffsetDateTime.now(APP_ZONE).withMinute(0).withSecond(0).withNano(0);
    }

    private OffsetDateTime data(int ano, int mes, int dia, int hora) {
        return OffsetDateTime.of(ano, mes, dia, hora, 0, 0, 0, APP_ZONE.getRules().getOffset(java.time.Instant.now()));
    }
}
