package com.fotolhar.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DashboardInsightsClientesResponse {

    private int totalComContratacao;
    private int recorrentes;
    private BigDecimal taxaRetorno;
    private int inativos;
    private DashboardInsightsClienteDestaqueResponse clienteQueMaisContratou;
    private BigDecimal intervaloMedioRetornoMeses;
    private int clientesComIntervaloRetorno;
    private List<DashboardInsightsFrequenciaClienteResponse> frequenciaContratacao;
}
