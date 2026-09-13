package com.fotolhar.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;
import java.util.UUID;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DashboardMensagemResponse {

    private String tipo;
    private String chave;
    private String titulo;
    private String mensagem;
    private int prioridade;
    private String entidade;
    private UUID entidadeId;
    private OffsetDateTime criadoEm;
}
