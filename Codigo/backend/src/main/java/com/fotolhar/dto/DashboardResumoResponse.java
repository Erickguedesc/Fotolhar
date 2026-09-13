package com.fotolhar.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DashboardResumoResponse {

    private Integer ensaiosEsteMes;
    private Integer totalEnsaios;
    private Integer ensaiosHoje;
    private Integer ensaiosProximosSeteDias;
    private Integer ensaiosEmAndamentoTotal;
    private Integer selecoesEnviadas;
    private Integer ensaiosSemFotosEnviadas;
    private Integer pendenciasTotal;
    private BigDecimal receitaEstimada;
    private List<DashboardReceitaHistoricoResponse> receitaPrevistaHistorico;

    private Integer ensaiosFinalizadosMes;
    private Map<String, Integer> pipelineStatus;

    private DashboardEnsaioResumoResponse proximoEnsaio;
    private List<DashboardEnsaioResumoResponse> ensaiosDoDia;
    private List<DashboardEnsaioResumoResponse> agendaProxima;
    private List<DashboardEnsaioResumoResponse> proximosEnsaios;
    private List<DashboardEnsaioResumoResponse> ensaiosEmAndamento;
    private List<DashboardEnsaioResumoResponse> ultimasAtualizacoes;
    private List<DashboardAtencaoResponse> atencaoNecessaria;
    private List<DashboardFluxoEtapaResponse> desempenhoFluxo;
    private List<DashboardRegiaoDemandaResponse> regioesDemanda;
    private List<RelatorioTipoEnsaioResponse> receitaPorTipoEnsaio;
}
