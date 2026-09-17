package com.fotolhar.service;

import com.fotolhar.dto.ClienteRequest;
import com.fotolhar.dto.ClienteResponse;
import com.fotolhar.enums.SituacaoCliente;
import com.fotolhar.enums.StatusEnsaio;
import com.fotolhar.model.Cliente;
import com.fotolhar.model.Ensaio;
import com.fotolhar.model.Usuario;
import com.fotolhar.repository.ClienteRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ClienteService {

    private final ClienteRepository repository;
    private final UsuarioContextService usuarioContextService;

    @Transactional
    public ClienteResponse criar(ClienteRequest request) {
        Usuario usuario = usuarioContextService.getUsuarioLogado();
        String nome = normalizarTexto(request.getNome());
        String email = normalizarEmail(request.getEmail());
        String telefone = normalizarTelefone(request.getTelefone());
        String cpf = normalizarCpf(request.getCpf());

        if (nome == null || nome.length() < 3) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Informe o nome completo");
        }

        if (email != null && repository.existsByUsuarioIdAndEmail(usuario.getId(), email)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "E-mail ja cadastrado para outro cliente");
        }

        if (cpf != null && repository.existsByUsuarioIdAndCpf(usuario.getId(), cpf)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "CPF ja cadastrado para outro cliente");
        }

        Cliente cliente = Cliente.builder()
                .usuario(usuario)
                .nome(nome)
                .email(email)
                .telefone(telefone)
                .cpf(cpf)
                .cidade(normalizarTexto(request.getCidade()))
                .indicacao(normalizarTexto(request.getIndicacao()))
                .ativo(true)
                .build();

        return toResponse(repository.save(cliente));
    }

    @Transactional
    public ClienteResponse arquivar(UUID id) {
        Cliente cliente = buscarCliente(id);
        cliente.setAtivo(false);
        return toResponse(repository.save(cliente));
    }

    @Transactional
    public ClienteResponse reativar(UUID id) {
        Cliente cliente = buscarCliente(id);
        cliente.setAtivo(true);
        return toResponse(repository.save(cliente));
    }

    @Transactional(readOnly = true)
    public List<ClienteResponse> listar(String busca) {
        Usuario usuario = usuarioContextService.getUsuarioLogado();
        String termo = normalizarTexto(busca);
        List<Cliente> clientes = termo == null
                ? repository.findByUsuarioIdOrderByNomeAsc(usuario.getId())
                : repository.buscarPorTermo(usuario.getId(), termo, somenteDigitos(termo));

        return clientes.stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public ClienteResponse buscarPorId(UUID id) {
        return toResponse(buscarCliente(id));
    }

    @Transactional
    public ClienteResponse atualizar(UUID id, ClienteRequest request) {
        Usuario usuario = usuarioContextService.getUsuarioLogado();
        Cliente cliente = buscarCliente(id);
        String nome = normalizarTexto(request.getNome());
        String email = normalizarEmail(request.getEmail());
        String telefone = normalizarTelefone(request.getTelefone());
        String cpf = normalizarCpf(request.getCpf());

        if (nome == null || nome.length() < 3) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Informe o nome completo");
        }

        if (email != null) {
            repository.findByUsuarioIdAndEmail(usuario.getId(), email).ifPresent(existente -> {
                if (!existente.getId().equals(id)) {
                    throw new ResponseStatusException(HttpStatus.CONFLICT, "E-mail ja cadastrado em outro cliente");
                }
            });
        }

        if (cpf != null) {
            repository.findByUsuarioIdAndCpf(usuario.getId(), cpf).ifPresent(existente -> {
                if (!existente.getId().equals(id)) {
                    throw new ResponseStatusException(HttpStatus.CONFLICT, "CPF ja cadastrado em outro cliente");
                }
            });
        }

        cliente.setNome(nome);
        cliente.setEmail(email);
        cliente.setTelefone(telefone);
        cliente.setCpf(cpf);
        cliente.setCidade(normalizarTexto(request.getCidade()));
        cliente.setIndicacao(normalizarTexto(request.getIndicacao()));

        return toResponse(repository.save(cliente));
    }

    @Transactional
    public void deletar(UUID id) {
        Cliente cliente = buscarCliente(id);

        if (!cliente.getEnsaios().isEmpty()) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Cliente vinculado a ensaio(s) nao pode ser deletado"
            );
        }

        repository.delete(cliente);
    }

    private Cliente buscarCliente(UUID id) {
        Usuario usuario = usuarioContextService.getUsuarioLogado();

        return repository.findByIdAndUsuarioId(id, usuario.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Cliente nao encontrado"));
    }

    private ClienteResponse toResponse(Cliente cliente) {
        return ClienteResponse.builder()
                .id(cliente.getId())
                .nome(cliente.getNome())
                .email(cliente.getEmail())
                .telefone(cliente.getTelefone())
                .cpf(cliente.getCpf())
                .cidade(cliente.getCidade())
                .indicacao(cliente.getIndicacao())
                .ativo(cliente.getAtivo())
                .situacao(resolverSituacao(cliente))
                .build();
    }

    private SituacaoCliente resolverSituacao(Cliente cliente) {
        List<Ensaio> ensaios = cliente.getEnsaios();

        if (Boolean.FALSE.equals(cliente.getAtivo())) {
            return SituacaoCliente.ARQUIVADO;
        }

        boolean temFluxoAtivo = ensaios.stream()
                .map(Ensaio::getStatus)
                .anyMatch(this::isStatusFluxoAtivo);

        if (temFluxoAtivo) {
            return SituacaoCliente.EM_ANDAMENTO;
        }

        boolean temEntregue = ensaios.stream()
                .map(Ensaio::getStatus)
                .anyMatch(status -> status == StatusEnsaio.FINALIZADO);

        if (temEntregue) {
            return SituacaoCliente.ENTREGUE;
        }

        return ensaios.isEmpty() ? SituacaoCliente.SEM_ENSAIOS : SituacaoCliente.SEM_FLUXO;
    }

    private boolean isStatusFluxoAtivo(StatusEnsaio status) {
        return status == StatusEnsaio.AGENDADO
                || status == StatusEnsaio.REALIZADO
                || status == StatusEnsaio.EM_SELECAO
                || status == StatusEnsaio.EM_EDICAO;
    }

    private String normalizarTexto(String valor) {
        if (valor == null) return null;
        String texto = valor.trim();
        return texto.isEmpty() ? null : texto;
    }

    private String normalizarEmail(String valor) {
        String email = normalizarTexto(valor);
        return email == null ? null : email.toLowerCase();
    }

    private String normalizarCpf(String valor) {
        String cpf = somenteDigitos(valor);
        return cpf.isEmpty() ? null : cpf;
    }

    private String normalizarTelefone(String valor) {
        String telefone = somenteDigitos(valor);
        return telefone.isEmpty() ? null : telefone;
    }

    private String somenteDigitos(String valor) {
        return valor == null ? "" : valor.replaceAll("\\D", "");
    }
}
