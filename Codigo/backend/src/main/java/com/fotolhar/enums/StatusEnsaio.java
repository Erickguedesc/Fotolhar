package com.fotolhar.enums;

/**
 * Linha do tempo do ensaio (RF04, RF08).
 * O usuário atualiza manualmente (R03).
 */
public enum StatusEnsaio {

    AGENDADO,     // Ensaio marcado, ainda não realizado
    REALIZADO,    // Fotos tiradas, ainda não editadas
    EM_SELECAO,    // FOTOS EM SELECAO //
    EM_EDICAO,    // Edição em andamento
    FINALIZADO,  // Cliente selecionou, aguardando entrega final
    CANCELADO;    // Ensaio cancelado

    /** Retorna true se o ensaio está em um estado final (não muda mais) */
    public boolean isFinal() {
        return this == FINALIZADO || this == CANCELADO;
    }
}
