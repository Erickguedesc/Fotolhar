package com.fotolhar.event;

import com.fotolhar.enums.StatusEnsaio;

import java.util.UUID;

/** Evento disparado após a confirmação de uma alteração de status. */
public record EnsaioStatusAlteradoEvent(UUID ensaioId, StatusEnsaio status) {
}
