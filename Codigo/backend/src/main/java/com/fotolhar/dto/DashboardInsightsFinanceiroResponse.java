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
public class DashboardInsightsFinanceiroResponse {

    private BigDecimal ticketMedio;
    private int fotosExtrasVendidas;
    private BigDecimal receitaFotosExtras;
}
