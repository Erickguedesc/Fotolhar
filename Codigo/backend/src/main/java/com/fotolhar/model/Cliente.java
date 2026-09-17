package com.fotolhar.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.OffsetDateTime;
import java.util.*;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

@Entity
@Table(name = "cliente")
@Getter
@Data
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Cliente {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "usuario_id")
    private Usuario usuario;

    @Column(nullable = false, length = 200)
    @NotBlank(message = "Nome é obrigatório")
    private String nome;

    @Column(length = 200)
    @Email(message = "E-mail inválido")
    private String email;

    // Aceita qualquer formato: (31) 98765-4321 | 31987654321 | 31 98765-4321
    @Pattern(
        regexp = "^[\\d\\s().+-]{8,20}$",
        message = "Telefone inválido"
    )
    @Column(length = 30)
    private String telefone;

    @Column(length = 20)
    private String cpf;

    @Column(length = 120)
    private String cidade;

    @Column(length = 120)
    private String indicacao;

    @Builder.Default
    @Column(nullable = false)
    private Boolean ativo = true;

    @OneToMany(mappedBy = "cliente", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<Ensaio> ensaios = new ArrayList<>();

    @Column(name = "criado_em", updatable = false)
    private OffsetDateTime criadoEm;

    @Column(name = "atualizado_em")
    private OffsetDateTime atualizadoEm;

    @PrePersist
    protected void onCreate() {
        criadoEm = atualizadoEm = OffsetDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        atualizadoEm = OffsetDateTime.now();
    }
}
