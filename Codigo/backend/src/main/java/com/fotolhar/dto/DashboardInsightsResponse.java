package com.fotolhar.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DashboardInsightsResponse {

    private DashboardInsightsClientesResponse clientes;
    private DashboardInsightsAgendaResponse agenda;
    private DashboardInsightsFinanceiroResponse financeiro;
    private DashboardInsightsProducaoResponse producao;
}
