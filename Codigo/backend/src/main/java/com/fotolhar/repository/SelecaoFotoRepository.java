package com.fotolhar.repository;

import com.fotolhar.model.SelecaoFoto;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

public interface SelecaoFotoRepository extends JpaRepository<SelecaoFoto, UUID> {

    boolean existsByAlbumId(UUID albumId);

    List<SelecaoFoto> findByAlbumId(UUID albumId);

    List<SelecaoFoto> findByAlbumIdIn(Collection<UUID> albumIds);

    void deleteByAlbumId(UUID albumId);

    void deleteByFotoId(UUID fotoId);
}
