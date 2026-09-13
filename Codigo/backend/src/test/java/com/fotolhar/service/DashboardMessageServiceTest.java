package com.fotolhar.service;

import com.fotolhar.dto.DashboardInsightsResponse;
import com.fotolhar.dto.DashboardInsightsAgendaResponse;
import com.fotolhar.dto.DashboardInsightsClienteDestaqueResponse;
import com.fotolhar.dto.DashboardInsightsClientesResponse;
import com.fotolhar.dto.DashboardInsightsFinanceiroResponse;
import com.fotolhar.dto.DashboardInsightsFrequenciaClienteResponse;
import com.fotolhar.dto.DashboardInsightsHorarioResponse;
import com.fotolhar.dto.DashboardInsightsMesResponse;
import com.fotolhar.dto.DashboardInsightsProducaoResponse;
import com.fotolhar.dto.DashboardInsightsQuantidadeResponse;
import com.fotolhar.dto.DashboardMensagemResponse;
import com.fotolhar.dto.DashboardMensagensResponse;
import com.fotolhar.dto.DashboardResumoResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class DashboardMessageServiceTest {

    private final DashboardInsightService insightService = mock(DashboardInsightService.class);
    private final DashboardService dashboardService = mock(DashboardService.class);
    private final DashboardMessageService service = new DashboardMessageService(insightService, dashboardService);

    @BeforeEach
    void prepararResumo() {
        when(dashboardService.buscarResumo()).thenReturn(DashboardResumoResponse.builder()
                .ultimasAtualizacoes(List.of())
                .atencaoNecessaria(List.of())
                .build());
    }

    @Test
    void naoGeraTaxaRetornoSemAmostraMinimaMasGeraComCincoClientes() {
        when(insightService.buscarInsights(any(), any())).thenReturn(insights(4, 1, 25, 0, null,
                List.of(), 5, 1, null, null, null, null, null, null));

        assertThat(chaves()).doesNotContain("TAXA_RETORNO");

        when(insightService.buscarInsights(any(), any())).thenReturn(insights(5, 2, 40, 0, null,
                List.of(), 5, 1, null, null, null, null, null, null));

        assertThat(chaves()).contains("TAXA_RETORNO");
    }

    @Test
    void naoGeraClienteDestaqueComUmEnsaioEGeraOportunidadeParaInativos() {
        DashboardInsightsClienteDestaqueResponse cliente = DashboardInsightsClienteDestaqueResponse.builder()
                .id(UUID.randomUUID()).nome("Ana").quantidadeEnsaios(1).build();
        when(insightService.buscarInsights(any(), any())).thenReturn(insights(1, 0, 0, 2, cliente,
                List.of(), 0, 0, null, null, null, null, null, null));

        List<DashboardMensagemResponse> mensagens = mensagens();

        assertThat(mensagens).extracting(DashboardMensagemResponse::getChave)
                .contains("CLIENTES_INATIVOS")
                .doesNotContain("CLIENTE_MAIS_FREQUENTE");
    }

    @Test
    void naoGeraOportunidadeInativosQuandoNaoHaInativosNemHorarioComAmostraInsuficiente() {
        DashboardInsightsHorarioResponse horarioUnico = DashboardInsightsHorarioResponse.builder()
                .hora(16).quantidade(1).percentual(new BigDecimal("20")).build();
        when(insightService.buscarInsights(any(), any())).thenReturn(insights(5, 0, 0, 0, null,
                List.of(), 5, 2, horarioUnico, null, null, null, null, null));

        assertThat(chaves())
                .doesNotContain("CLIENTES_INATIVOS", "HORARIO_MAIS_PROCURADO");
    }

    @Test
    void geraHorarioQuandoAtendeAmostraMinima() {
        DashboardInsightsHorarioResponse horario = DashboardInsightsHorarioResponse.builder()
                .hora(16).quantidade(2).percentual(new BigDecimal("40")).build();
        when(insightService.buscarInsights(any(), any())).thenReturn(insights(0, 0, 0, 0, null,
                List.of(), 5, 1, horario, null, null, null, null, null));

        assertThat(chaves()).contains("HORARIO_MAIS_PROCURADO");
    }

    @Test
    void naoGeraMediasSemDadosCompletosEUsaLinguagemDeValorPrevisto() {
        DashboardInsightsFinanceiroResponse financeiro = DashboardInsightsFinanceiroResponse.builder()
                .ticketMedio(new BigDecimal("850.00"))
                .fotosExtrasVendidas(4)
                .receitaFotosExtras(new BigDecimal("120.00"))
                .build();
        when(insightService.buscarInsights(any(), any())).thenReturn(insights(0, 0, 0, 0, null,
                List.of(), 0, 0, null, null, financeiro,
                DashboardInsightsProducaoResponse.builder().build(), null, null));

        List<DashboardMensagemResponse> mensagens = mensagens();

        assertThat(mensagens).extracting(DashboardMensagemResponse::getChave)
                .contains("TICKET_MEDIO", "RECEITA_FOTOS_EXTRAS")
                .doesNotContain("TEMPO_MEDIO_EDICAO", "TEMPO_MEDIO_FLUXO");
        assertThat(mensagens.stream().map(DashboardMensagemResponse::getMensagem))
                .anyMatch(texto -> texto.contains("valor médio previsto"))
                .anyMatch(texto -> texto.contains("estão previstos em fotos extras"))
                .noneMatch(texto -> texto.toLowerCase().contains("receb"));
    }

    @Test
    void geraMediasApenasComDuasAmostrasValidas() {
        DashboardInsightsProducaoResponse producao = DashboardInsightsProducaoResponse.builder()
                .tempoMedioEdicaoDias(new BigDecimal("5"))
                .amostrasTempoEdicao(2)
                .tempoMedioFluxoDias(new BigDecimal("19"))
                .amostrasTempoFluxo(2)
                .build();
        when(insightService.buscarInsights(any(), any())).thenReturn(insights(0, 0, 0, 0, null,
                List.of(), 0, 0, null, null, null, producao, null, null));

        assertThat(chaves()).contains("TEMPO_MEDIO_EDICAO", "TEMPO_MEDIO_FLUXO");
    }

    @Test
    void usaTipoMaisRealizadoEOrdenaOportunidadeEInsight() {
        DashboardInsightsQuantidadeResponse tipo = DashboardInsightsQuantidadeResponse.builder()
                .descricao("Família").quantidade(5).percentual(new BigDecimal("50")).build();
        DashboardResumoResponse resumo = DashboardResumoResponse.builder()
                .ultimasAtualizacoes(List.of())
                .atencaoNecessaria(List.of())
                .build();
        when(dashboardService.buscarResumo()).thenReturn(resumo);
        when(insightService.buscarInsights(any(), any())).thenReturn(insights(5, 1, 20, 1, null,
                List.of(), 0, 0, null, null, null,
                DashboardInsightsProducaoResponse.builder().tipoMaisContratado(tipo).build(), null, null));

        List<DashboardMensagemResponse> mensagens = mensagens();

        assertThat(mensagens).extracting(DashboardMensagemResponse::getChave)
                .contains("TIPO_MAIS_REALIZADO", "CLIENTES_INATIVOS");
        assertThat(mensagens.stream().filter(item -> item.getChave().equals("TIPO_MAIS_REALIZADO"))
                .map(DashboardMensagemResponse::getMensagem))
                .containsExactly("Família foi o tipo de ensaio mais realizado no período.");
        assertThat(mensagens).extracting(DashboardMensagemResponse::getPrioridade)
                .isSortedAccordingTo(java.util.Comparator.reverseOrder());
    }

    @Test
    void clienteMuitoFrequenteSubstituiMensagemDuplicadaDeClienteDestaque() {
        UUID clienteId = UUID.randomUUID();
        DashboardInsightsClienteDestaqueResponse destaque = DashboardInsightsClienteDestaqueResponse.builder()
                .id(clienteId).nome("Maria").quantidadeEnsaios(8).build();
        DashboardInsightsFrequenciaClienteResponse frequente = DashboardInsightsFrequenciaClienteResponse.builder()
                .clienteId(clienteId).clienteNome("Maria").quantidadeEnsaios(8)
                .classificacao("MUITO_FREQUENTE").build();
        when(insightService.buscarInsights(any(), any())).thenReturn(insights(8, 4, 50, 0, destaque,
                List.of(frequente), 0, 0, null, null, null, null, null, null));

        assertThat(chaves()).contains("CLIENTE_MUITO_FREQUENTE")
                .doesNotContain("CLIENTE_MAIS_FREQUENTE");
    }

    @Test
    void transformaSomenteOsInsightsJaFiltradosDaFotografaAutenticada() {
        DashboardInsightsClienteDestaqueResponse clienteDaFotografa = DashboardInsightsClienteDestaqueResponse.builder()
                .id(UUID.randomUUID()).nome("Cliente da fotógrafa").quantidadeEnsaios(2).build();
        when(insightService.buscarInsights(any(), any())).thenReturn(insights(2, 1, 50, 0, clienteDaFotografa,
                List.of(), 0, 0, null, null, null, null, null, null));

        assertThat(mensagens().stream().map(DashboardMensagemResponse::getMensagem))
                .anyMatch(texto -> texto.contains("Cliente da fotógrafa"))
                .noneMatch(texto -> texto.contains("Cliente de outra fotógrafa"));
    }

    private List<String> chaves() {
        return mensagens().stream().map(DashboardMensagemResponse::getChave).toList();
    }

    private List<DashboardMensagemResponse> mensagens() {
        DashboardMensagensResponse resposta = service.buscarMensagens(LocalDate.of(2026, 1, 1), LocalDate.of(2026, 12, 31));
        return resposta.getMensagens();
    }

    private DashboardInsightsResponse insights(
            int totalClientes, int recorrentes, int taxa, int inativos,
            DashboardInsightsClienteDestaqueResponse destaque,
            List<DashboardInsightsFrequenciaClienteResponse> frequencias,
            int ensaiosPeriodo, int mesesComDados,
            DashboardInsightsHorarioResponse horario,
            DashboardInsightsQuantidadeResponse dia,
            DashboardInsightsFinanceiroResponse financeiro,
            DashboardInsightsProducaoResponse producao,
            DashboardInsightsQuantidadeResponse faixa,
            DashboardInsightsMesResponse mes) {
        return DashboardInsightsResponse.builder()
                .clientes(DashboardInsightsClientesResponse.builder()
                        .totalComContratacao(totalClientes).recorrentes(recorrentes)
                        .taxaRetorno(BigDecimal.valueOf(taxa)).inativos(inativos)
                        .clienteQueMaisContratou(destaque).frequenciaContratacao(frequencias).build())
                .agenda(DashboardInsightsAgendaResponse.builder()
                        .quantidadeEnsaiosConsiderados(ensaiosPeriodo).quantidadeMesesComDados(mesesComDados)
                        .horarioMaisProcurado(horario).diaMaisProcurado(dia).faixaMaisProcurada(faixa)
                        .mesMaisMovimentado(mes).build())
                .financeiro(financeiro == null ? DashboardInsightsFinanceiroResponse.builder()
                        .ticketMedio(BigDecimal.ZERO).fotosExtrasVendidas(0).receitaFotosExtras(BigDecimal.ZERO).build() : financeiro)
                .producao(producao == null ? DashboardInsightsProducaoResponse.builder().build() : producao)
                .build();
    }
}
