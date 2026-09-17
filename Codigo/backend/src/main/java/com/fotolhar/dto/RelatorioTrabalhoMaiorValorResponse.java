package com.fotolhar.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.UUID;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RelatorioTrabalhoMaiorValorResponse {

    private UUID ensaioId;
    private String tipoExibicao;
    private String clienteNome;
    private BigDecimal valor;
}
