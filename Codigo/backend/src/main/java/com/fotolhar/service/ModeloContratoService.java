package com.fotolhar.service;

import com.fotolhar.dto.ModeloContratoDTO;
import com.fotolhar.dto.ModeloContratoRequest;
import com.fotolhar.model.Usuario;
import com.fotolhar.model.ModeloContrato;
import com.fotolhar.repository.UsuarioRepository;
import com.fotolhar.repository.ModeloContratoRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ModeloContratoService {

    private static final String CLAUSULAS_PADRAO = String.join("\n",
            "O presente pre-contrato tem validade de {validade} a partir da data de emissao. Apos este prazo, os valores estao sujeitos a revisao.",
            "O agendamento e confirmado mediante o pagamento do sinal informado neste documento. A data e o horario ficam reservados apos a confirmacao.",
            "Em caso de cancelamento pela contratante com menos de 48 horas de antecedencia, o sinal nao sera reembolsado. Reagendamentos serao aceitos com aviso previo minimo de 5 dias.",
            "As fotos editadas serao entregues via galeria online exclusiva com link protegido por senha. O prazo de entrega e combinado entre as partes.",
            "As imagens exibidas na galeria poderao conter marca d'agua visivel. As fotos editadas em alta resolucao serao disponibilizadas apos quitacao integral.",
            "O profissional contratado reserva o direito de uso das imagens produzidas em portfolio, salvo acordo diferente formalizado por escrito.",
            "Caso sejam selecionadas mais fotos do que o pacote inclui, será gerado valor adicional por foto excedente, a ser quitado antes da entrega final."
    );

    private static final String ACEITE_PADRAO =
            "Ao assinar este documento, as partes declaram ter lido e compreendido todos os termos acima, concordando com as condicoes estabelecidas neste pre-contrato de prestacao de servicos fotograficos.";

    private final ModeloContratoRepository modeloContratoRepository;
    private final UsuarioRepository usuarioRepository;

    @Transactional(readOnly = true)
    public List<ModeloContratoDTO> listar() {
        Usuario usuario = getUsuarioLogado();
        return modeloContratoRepository
                .findByUsuarioIdOrderByPadraoDescAtualizadoEmDesc(usuario.getId())
                .stream()
                .map(this::toDTO)
                .toList();
    }

    @Transactional
    public List<ModeloContratoDTO> listarGarantindoPadrao() {
        Usuario usuario = getUsuarioLogado();
        garantirModeloPadrao(usuario);
        return modeloContratoRepository
                .findByUsuarioIdOrderByPadraoDescAtualizadoEmDesc(usuario.getId())
                .stream()
                .map(this::toDTO)
                .toList();
    }

    @Transactional
    public ModeloContratoDTO criar(ModeloContratoRequest request) {
        Usuario usuario = getUsuarioLogado();

        ModeloContrato modelo = ModeloContrato.builder()
                .usuario(usuario)
                .nome(normalizarObrigatorio(request.getNome(), "Informe o nome do modelo"))
                .tipoEnsaio(normalizarTexto(request.getTipoEnsaio()))
                .clausulas(normalizarObrigatorio(request.getClausulas(), "Informe as clausulas do modelo"))
                .textoAceite(normalizarTexto(request.getTextoAceite()))
                .padrao(Boolean.TRUE.equals(request.getPadrao()))
                .ativo(request.getAtivo() == null || Boolean.TRUE.equals(request.getAtivo()))
                .build();

        if (Boolean.TRUE.equals(modelo.getPadrao())) {
            limparPadrao(usuario.getId(), null);
        }

        return toDTO(modeloContratoRepository.save(modelo));
    }

    @Transactional
    public ModeloContratoDTO atualizar(UUID id, ModeloContratoRequest request) {
        Usuario usuario = getUsuarioLogado();
        ModeloContrato modelo = buscarDoUsuario(id, usuario.getId());

        modelo.setNome(normalizarObrigatorio(request.getNome(), "Informe o nome do modelo"));
        modelo.setTipoEnsaio(normalizarTexto(request.getTipoEnsaio()));
        modelo.setClausulas(normalizarObrigatorio(request.getClausulas(), "Informe as clausulas do modelo"));
        modelo.setTextoAceite(normalizarTexto(request.getTextoAceite()));
        modelo.setPadrao(Boolean.TRUE.equals(request.getPadrao()));
        modelo.setAtivo(request.getAtivo() == null || Boolean.TRUE.equals(request.getAtivo()));

        if (Boolean.TRUE.equals(modelo.getPadrao())) {
            limparPadrao(usuario.getId(), modelo.getId());
        }

        return toDTO(modeloContratoRepository.save(modelo));
    }

    @Transactional
    public void remover(UUID id) {
        Usuario usuario = getUsuarioLogado();
        ModeloContrato modelo = buscarDoUsuario(id, usuario.getId());
        modeloContratoRepository.delete(modelo);
    }

    private void garantirModeloPadrao(Usuario usuario) {
        if (modeloContratoRepository.existsByUsuarioId(usuario.getId())) {
            return;
        }

        modeloContratoRepository.save(ModeloContrato.builder()
                .usuario(usuario)
                .nome("Contrato padrao")
                .clausulas(CLAUSULAS_PADRAO)
                .textoAceite(ACEITE_PADRAO)
                .padrao(true)
                .ativo(true)
                .build());
    }

    private void limparPadrao(UUID usuarioId, UUID manterId) {
        modeloContratoRepository.findByUsuarioIdOrderByPadraoDescAtualizadoEmDesc(usuarioId)
                .forEach(modelo -> {
                    if (manterId == null || !modelo.getId().equals(manterId)) {
                        modelo.setPadrao(false);
                    }
                });
    }

    private ModeloContrato buscarDoUsuario(UUID id, UUID usuarioId) {
        return modeloContratoRepository.findByIdAndUsuarioId(id, usuarioId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Modelo de contrato nao encontrado"
                ));
    }

    private Usuario getUsuarioLogado() {
        String email = SecurityContextHolder.getContext()
                .getAuthentication()
                .getName();

        return usuarioRepository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.UNAUTHORIZED,
                        "Usuario autenticado nao encontrada"
                ));
    }

    private String normalizarTexto(String valor) {
        if (valor == null) return null;
        String texto = valor.trim();
        return texto.isEmpty() ? null : texto;
    }

    private String normalizarObrigatorio(String valor, String mensagem) {
        String texto = normalizarTexto(valor);
        if (texto == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, mensagem);
        }
        return texto;
    }

    private ModeloContratoDTO toDTO(ModeloContrato modelo) {
        return ModeloContratoDTO.builder()
                .id(modelo.getId())
                .nome(modelo.getNome())
                .tipoEnsaio(modelo.getTipoEnsaio())
                .clausulas(modelo.getClausulas())
                .textoAceite(modelo.getTextoAceite())
                .padrao(modelo.getPadrao())
                .ativo(modelo.getAtivo())
                .atualizadoEm(modelo.getAtualizadoEm())
                .build();
    }
}
