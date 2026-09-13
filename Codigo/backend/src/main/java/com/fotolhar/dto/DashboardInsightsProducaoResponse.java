package com.fotolhar.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DashboardInsightsProducaoResponse {

    private BigDecimal tempoMedioEdicaoDias;
    private int amostrasTempoEdicao;
    private BigDecimal tempoMedioFluxoDias;
    private int amostrasTempoFluxo;
    private DashboardInsightsQuantidadeResponse tipoMaisContratado;
}
