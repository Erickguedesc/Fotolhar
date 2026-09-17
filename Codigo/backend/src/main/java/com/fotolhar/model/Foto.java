package com.fotolhar.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "foto")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Foto {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    /** Qual ensaio esta foto pertence */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "ensaio_id", nullable = false)
    private Ensaio ensaio;

    /** ID único da foto no Cloudinary */
    @Column(name = "cloudinary_id", nullable = false, unique = true, length = 300)
    private String cloudinaryId;

    /** Nome original do arquivo enviado pelo usuário */
    @Column(name = "nome_original", length = 255)
    private String nomeOriginal;

    /** URL com marca d'água exibida na galeria compartilhada (R04) */
    @Column(name = "url_watermark", nullable = false, columnDefinition = "TEXT")
    private String urlWatermark;

    /** URL original em alta resolução — entregue só após quitação (R04) */
    @Column(name = "url_original", columnDefinition = "TEXT")
    private String urlOriginal;

    /** Ordem de exibição na galeria */
    @Builder.Default
    @Column(nullable = false)
    private Integer ordem = 0;

    /** Se verdadeiro, é usada como capa do ensaio */
    @Builder.Default
    @Column(name = "eh_capa", nullable = false)
    private Boolean ehCapa = false;

    @Column(name = "enviada_em", updatable = false)
    private OffsetDateTime enviadaEm;

    @PrePersist
    protected void onCreate() {
        enviadaEm = OffsetDateTime.now();
    }
}
