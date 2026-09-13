package com.fotolhar.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DashboardInsightsFrequenciaClienteResponse {

    private UUID clienteId;
    private String clienteNome;
    private int quantidadeEnsaios;
    private String classificacao;
    private LocalDate ultimoEnsaio;
    private BigDecimal intervaloMedioMeses;
}
