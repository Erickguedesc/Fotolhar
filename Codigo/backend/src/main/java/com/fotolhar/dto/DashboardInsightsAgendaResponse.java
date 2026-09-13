package com.fotolhar.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DashboardInsightsAgendaResponse {

    private int quantidadeEnsaiosConsiderados;
    private int quantidadeMesesComDados;
    private DashboardInsightsQuantidadeResponse diaMaisProcurado;
    private DashboardInsightsHorarioResponse horarioMaisProcurado;
    private DashboardInsightsQuantidadeResponse faixaMaisProcurada;
    private DashboardInsightsMesResponse mesMaisMovimentado;
}
