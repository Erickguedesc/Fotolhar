package com.fotolhar.dto;

import com.fotolhar.enums.TipoEnsaio;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class EnsaioRequest {

    @NotNull(message = "Cliente e obrigatorio")
    private UUID clienteId;

    @Size(max = 200, message = "Nome deve ter no máximo 200 caracteres")
    private String clienteNome;

    @Size(max = 200, message = "E-mail deve ter no máximo 200 caracteres")
    private String clienteEmail;

    @Size(max = 30, message = "Telefone deve ter no máximo 30 caracteres")
    private String clienteTelefone;

    @Size(max = 20, message = "CPF deve ter no máximo 20 caracteres")
    private String clienteCpf;

    @Size(max = 120, message = "Cidade deve ter no maximo 120 caracteres")
    private String clienteCidade;

    @Size(max = 120, message = "Indicacao deve ter no maximo 120 caracteres")
    private String clienteIndicacao;

    @NotNull(message = "Tipo do ensaio e obrigatorio")
    private TipoEnsaio tipo;

    @Size(max = 120, message = "Tipo personalizado deve ter no maximo 120 caracteres")
    private String tipoPersonalizado;

    @NotNull(message = "Data do ensaio e obrigatoria")
    private OffsetDateTime dataEnsaio;

    @NotBlank(message = "Local e obrigatorio")
    private String local;

    @Size(max = 120, message = "Cidade do ensaio deve ter no maximo 120 caracteres")
    private String cidadeEnsaio;

    @Size(max = 2, message = "Estado do ensaio deve ser uma UF valida")
    @Pattern(
            regexp = "^(|AC|AL|AP|AM|BA|CE|DF|ES|GO|MA|MT|MS|MG|PA|PB|PR|PE|PI|RJ|RN|RS|RO|RR|SC|SP|SE|TO)$",
            message = "Estado do ensaio deve ser uma UF valida"
    )
    private String estadoEnsaio;

    @Size(max = 300, message = "Endereco completo deve ter no maximo 300 caracteres")
    private String enderecoCompleto;

    @Size(max = 300, message = "Referencia do local deve ter no maximo 300 caracteres")
    private String referenciaLocal;

    @NotNull(message = "Quantidade de fotos do pacote e obrigatoria")
    @Min(value = 1, message = "Deve ter pelo menos 1 foto no pacote")
    private Integer qtdFotosPacote;

    @DecimalMin(value = "0.01", inclusive = true, message = "Valor do pacote deve ser maior que zero")
    private BigDecimal valorPacote;

    private BigDecimal valorFotoExtra;

    @NotNull(message = "Informe se cobra foto extra")
    private Boolean cobrarFotoExtra;

    private BigDecimal valorFinalEnsaio;

    @Size(max = 30, message = "Status de valores deve ter no maximo 30 caracteres")
    private String statusValores;

    @Size(max = 500, message = "Observacao de valores deve ter no maximo 500 caracteres")
    private String observacaoValores;

    @Size(max = 1000, message = "Observacoes deve ter no maximo 1000 caracteres")
    private String observacoes;
}
