package com.fotolhar.repository;

import com.fotolhar.model.HistoricoStatusEnsaio;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

public interface HistoricoStatusEnsaioRepository extends JpaRepository<HistoricoStatusEnsaio, UUID> {

    List<HistoricoStatusEnsaio> findByEnsaioIdOrderByAlteradoEmAsc(UUID ensaioId);

    List<HistoricoStatusEnsaio> findByEnsaioIdInOrderByAlteradoEmAsc(Collection<UUID> ensaioIds);
}
