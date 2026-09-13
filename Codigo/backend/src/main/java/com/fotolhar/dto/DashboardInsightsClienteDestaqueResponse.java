package com.fotolhar.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DashboardInsightsClienteDestaqueResponse {

    private UUID id;
    private String nome;
    private int quantidadeEnsaios;
}
