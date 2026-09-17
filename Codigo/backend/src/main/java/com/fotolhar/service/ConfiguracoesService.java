package com.fotolhar.service;

import com.fotolhar.dto.*;
import com.fotolhar.model.ConfiguracaoEstudio;
import com.fotolhar.model.ConfiguracaoEmail;
import com.fotolhar.model.Usuario;
import com.fotolhar.model.PreferenciasSistema;
import com.fotolhar.model.*;
import com.fotolhar.repository.AlbumRepository;
import com.fotolhar.repository.ClienteRepository;
import com.fotolhar.repository.ConfiguracaoEmailRepository;
import com.fotolhar.repository.ConfiguracaoEstudioRepository;
import com.fotolhar.repository.EnsaioRepository;
import com.fotolhar.repository.FotoRepository;
import com.fotolhar.repository.UsuarioRepository;
import com.fotolhar.repository.HistoricoStatusEnsaioRepository;
import com.fotolhar.repository.ModeloContratoRepository;
import com.fotolhar.repository.PreferenciasSistemaRepository;
import com.fotolhar.repository.SelecaoFotoRepository;
import com.fotolhar.security.JwtUtil;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.lowagie.text.Document;
import com.lowagie.text.Element;
import com.lowagie.text.Font;
import com.lowagie.text.PageSize;
import com.lowagie.text.Paragraph;
import com.lowagie.text.Phrase;
import com.lowagie.text.Rectangle;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;
@Service
@RequiredArgsConstructor

public class ConfiguracoesService {

    private final UsuarioRepository usuarioRepository;
    private final ConfiguracaoEstudioRepository configuracaoEstudioRepository;
    private final ConfiguracaoEmailRepository configuracaoEmailRepository;
    private final PreferenciasSistemaRepository preferenciasSistemaRepository;
    private final PasswordEncoder passwordEncoder;
    private final CloudinaryService cloudinaryService;
    private final MarcaDaguaService marcaDaguaService;
    private final ModeloContratoService modeloContratoService;
    private final ClienteRepository clienteRepository;
    private final EnsaioRepository ensaioRepository;
    private final AlbumRepository albumRepository;
    private final FotoRepository fotoRepository;
    private final SelecaoFotoRepository selecaoFotoRepository;
    private final HistoricoStatusEnsaioRepository historicoStatusEnsaioRepository;
    private final ModeloContratoRepository modeloContratoRepository;
    private final ObjectMapper objectMapper;
    private final EmailService emailService;
    private final JwtUtil jwtUtil;

    @Value("${spring.mail.username:}")
    private String mailUsername;

    @Value("${spring.mail.password:}")
    private String mailPassword;

    @Transactional
    public ConfiguracoesResponseDTO buscarConfiguracoes() {
        Usuario usuario = getUsuarioLogado();
        ConfiguracaoEstudio estudio = getOuCriarEstudio(usuario);
        PreferenciasSistema preferencias = getOuCriarPreferencias(usuario);
        ConfiguracaoEmail email = getOuCriarEmail(usuario);

       return ConfiguracoesResponseDTO.builder()
        .usuario(toUsuarioDTO(usuario))
        .estudio(toEstudioDTO(estudio))
        .preferencias(toPreferenciasDTO(preferencias))
        .marcaDagua(marcaDaguaService.buscarMarcaDagua())
        .email(toEmailDTO(email))
        .modelosContrato(modeloContratoService.listarGarantindoPadrao())
        .onboardingConcluido(Boolean.TRUE.equals(usuario.getOnboardingConcluido()))
        .onboardingConcluidoEm(usuario.getOnboardingConcluidoEm())
        .build();
    }

    @Transactional
    public ConfiguracoesResponseDTO concluirOnboarding() {
        Usuario usuario = getUsuarioLogado();

        if (!Boolean.TRUE.equals(usuario.getOnboardingConcluido())) {
            usuario.setOnboardingConcluido(true);
            usuario.setOnboardingConcluidoEm(OffsetDateTime.now());
            usuarioRepository.save(usuario);
        } else if (usuario.getOnboardingConcluidoEm() == null) {
            usuario.setOnboardingConcluidoEm(OffsetDateTime.now());
            usuarioRepository.save(usuario);
        }

        return buscarConfiguracoes();
    }

    @Transactional
    public byte[] gerarBackupMetadadosZip() {
        Map<String, Object> backup = gerarBackupMetadados();

        try {
            ByteArrayOutputStream outputStream = new ByteArrayOutputStream();

            try (ZipOutputStream zip = new ZipOutputStream(outputStream, StandardCharsets.UTF_8)) {
                zip.putNextEntry(new ZipEntry("backup-tecnico.json"));
                zip.write(objectMapper.writerWithDefaultPrettyPrinter().writeValueAsBytes(backup));
                zip.closeEntry();

                zip.putNextEntry(new ZipEntry("resumo-do-backup.pdf"));
                zip.write(gerarResumoBackupPdf(backup));
                zip.closeEntry();
            }

            return outputStream.toByteArray();
        } catch (Exception e) {
            throw new ResponseStatusException(
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    "Nao foi possivel gerar o pacote de backup"
            );
        }
    }

    @Transactional
    public Map<String, Object> gerarBackupMetadados() {
        Usuario usuario = getUsuarioLogado();
        ConfiguracaoEstudio estudio = getOuCriarEstudio(usuario);
        PreferenciasSistema preferencias = getOuCriarPreferencias(usuario);
        ConfiguracaoEmail email = getOuCriarEmail(usuario);
        OffsetDateTime geradoEm = OffsetDateTime.now();

        preferencias.setUltimoBackupMetadadosEm(geradoEm);
        preferenciasSistemaRepository.save(preferencias);

        List<Cliente> clientes = clienteRepository.findByUsuarioIdOrderByNomeAsc(usuario.getId());
        List<Ensaio> ensaios = ensaioRepository.findByClienteUsuarioId(usuario.getId());
        List<Album> albuns = albumRepository.findByEnsaioClienteUsuarioId(usuario.getId());
        Set<java.util.UUID> ensaioIds = ensaios.stream().map(Ensaio::getId).collect(java.util.stream.Collectors.toSet());
        Set<java.util.UUID> albumIds = albuns.stream().map(Album::getId).collect(java.util.stream.Collectors.toSet());
        List<Foto> fotos = fotoRepository.findAll()
                .stream()
                .filter(foto -> foto.getEnsaio() != null && ensaioIds.contains(foto.getEnsaio().getId()))
                .toList();
        List<SelecaoFoto> selecoes = selecaoFotoRepository.findAll()
                .stream()
                .filter(selecao -> selecao.getAlbum() != null && albumIds.contains(selecao.getAlbum().getId()))
                .toList();
        List<HistoricoStatusEnsaio> historico = historicoStatusEnsaioRepository.findAll()
                .stream()
                .filter(item -> item.getEnsaio() != null && ensaioIds.contains(item.getEnsaio().getId()))
                .toList();
        List<ModeloContrato> modelos = modeloContratoRepository
                .findByUsuarioIdOrderByPadraoDescAtualizadoEmDesc(usuario.getId());

        return mapa(
                "tipo", "FOTOLHAR_BACKUP_METADADOS",
                "versao", 1,
                "geradoEm", geradoEm,
                "nomeArquivo", "fotolhar-backup-" + geradoEm.format(DateTimeFormatter.ofPattern("yyyyMMdd-HHmmss")) + ".json",
                "observacao", "Backup de metadados. Fotos permanecem armazenadas no Cloudinary; este arquivo guarda referencias e dados do sistema.",
                "resumo", mapa(
                        "clientes", clientes.size(),
                        "ensaios", ensaios.size(),
                        "albuns", albuns.size(),
                        "fotos", fotos.size(),
                        "selecoes", selecoes.size()
                ),
                "dados", mapa(
                        "usuario", mapa(
                                "id", usuario.getId(),
                                "nome", usuario.getNome(),
                                "email", usuario.getEmail(),
                                "telefone", usuario.getTelefone(),
                                "cidade", usuario.getCidade(),
                                "cnpj", usuario.getCnpj(),
                                "logoUrl", usuario.getLogoUrl(),
                                "fotoPerfilUrl", usuario.getFotoPerfilUrl(),
                                "ativo", usuario.getAtivo(),
                                "onboardingConcluido", usuario.getOnboardingConcluido(),
                                "onboardingConcluidoEm", usuario.getOnboardingConcluidoEm(),
                                "criadoEm", usuario.getCriadoEm(),
                                "atualizadoEm", usuario.getAtualizadoEm()
                        ),
                        "estudio", mapa(
                                "id", estudio.getId(),
                                "nomeEstudio", estudio.getNomeEstudio(),
                                "nomeComercial", estudio.getNomeComercial(),
                                "email", estudio.getEmail(),
                                "telefone", estudio.getTelefone(),
                                "instagram", estudio.getInstagram(),
                                "cidade", estudio.getCidade(),
                                "endereco", estudio.getEndereco(),
                                "cnpj", estudio.getCnpj(),
                                "logoUrl", estudio.getLogoUrl(),
                                "marcaDaguaUrl", estudio.getMarcaDaguaUrl(),
                                "marcaDaguaPublicId", estudio.getMarcaDaguaPublicId(),
                                "marcaDaguaTexto", estudio.getMarcaDaguaTexto(),
                                "marcaDaguaAtiva", estudio.getMarcaDaguaAtiva(),
                                "marcaDaguaTipo", estudio.getMarcaDaguaTipo(),
                                "marcaDaguaPosicao", estudio.getMarcaDaguaPosicao(),
                                "marcaDaguaOpacidade", estudio.getMarcaDaguaOpacidade(),
                                "marcaDaguaTamanho", estudio.getMarcaDaguaTamanho(),
                                "marcaDaguaMargem", estudio.getMarcaDaguaMargem(),
                                "marcaDaguaFonte", estudio.getMarcaDaguaFonte(),
                                "marcaDaguaCor", estudio.getMarcaDaguaCor(),
                                "marcaDaguaEstilo", estudio.getMarcaDaguaEstilo(),
                                "marcaDaguaTextoModo", estudio.getMarcaDaguaTextoModo()
                        ),
                        "preferencias", mapa(
                                "id", preferencias.getId(),
                                "qtdFotosPadrao", preferencias.getQtdFotosPadrao(),
                                "valorFotoExtraPadrao", preferencias.getValorFotoExtraPadrao(),
                                "prazoExpiracaoAlbumDias", preferencias.getPrazoExpiracaoAlbumDias(),
                                "cidadePadrao", preferencias.getCidadePadrao(),
                                "mensagemEnvioAlbum", preferencias.getMensagemEnvioAlbum(),
                                "mensagemSelecaoRecebida", preferencias.getMensagemSelecaoRecebida(),
                                "capaAlbumPadraoUrl", preferencias.getCapaAlbumPadraoUrl(),
                                "capaAlbumPadraoPublicId", preferencias.getCapaAlbumPadraoPublicId(),
                                "ultimoBackupMetadadosEm", preferencias.getUltimoBackupMetadadosEm()
                        ),
                        "email", mapa(
                                "id", email.getId(),
                                "ativo", email.getAtivo(),
                                "nomeRemetente", email.getNomeRemetente(),
                                "emailUsuarioAvisos", email.getEmailUsuarioAvisos(),
                                "enviarAlbumPublicado", email.getEnviarAlbumPublicado(),
                                "avisarSelecaoRecebida", email.getAvisarSelecaoRecebida(),
                                "enviarConfirmacaoSelecaoCliente", email.getEnviarConfirmacaoSelecaoCliente(),
                                "enviarMudancaStatus", email.getEnviarMudancaStatus(),
                                "mensagemAlbumPublicado", email.getMensagemAlbumPublicado(),
                                "mensagemSelecaoRecebida", email.getMensagemSelecaoRecebida()
                        ),
                        "clientes", clientes.stream().map(this::backupCliente).toList(),
                        "ensaios", ensaios.stream().map(this::backupEnsaio).toList(),
                        "albuns", albuns.stream().map(this::backupAlbum).toList(),
                        "fotos", fotos.stream().map(this::backupFoto).toList(),
                        "selecoes", selecoes.stream().map(this::backupSelecao).toList(),
                        "historicoStatus", historico.stream().map(this::backupHistorico).toList(),
                        "modelosContrato", modelos.stream().map(this::backupModeloContrato).toList()
                )
        );
    }

    @Transactional
    public UsuarioConfigDTO atualizarUsuario(UsuarioUpdateRequest request) {
        Usuario usuario = getUsuarioLogado();
        boolean emailAlterado = !usuario.getEmail().equalsIgnoreCase(request.getEmail());

        if (emailAlterado) {
            boolean emailJaExiste = usuarioRepository.findByEmail(request.getEmail())
                    .filter(f -> !f.getId().equals(usuario.getId()))
                    .isPresent();

            if (emailJaExiste) {
                throw new ResponseStatusException(
                        HttpStatus.CONFLICT,
                        "Já existe uma conta com este e-mail"
                );
            }
        }

        usuario.setNome(request.getNome());
        usuario.setEmail(request.getEmail());
        usuario.setTelefone(request.getTelefone());
        usuario.setCidade(request.getCidade());
        usuario.setFotoPerfilUrl(request.getFotoPerfilUrl());

        usuarioRepository.save(usuario);

        UsuarioConfigDTO dto = toUsuarioDTO(usuario);

        if (emailAlterado) {
            dto.setToken(jwtUtil.gerarToken(usuario.getEmail()));
        }

        return dto;
    }

    @Transactional
    public EstudioConfigDTO atualizarEstudio(EstudioUpdateRequest request) {
        Usuario usuario = getUsuarioLogado();
        ConfiguracaoEstudio estudio = getOuCriarEstudio(usuario);

        estudio.setNomeEstudio(request.getNomeEstudio());
        estudio.setNomeComercial(request.getNomeComercial());
        estudio.setEmail(request.getEmail());
        estudio.setTelefone(request.getTelefone());
        estudio.setInstagram(request.getInstagram());
        estudio.setCidade(request.getCidade());
        estudio.setEndereco(request.getEndereco());
        estudio.setCnpj(request.getCnpj());
        estudio.setLogoUrl(request.getLogoUrl());

        configuracaoEstudioRepository.save(estudio);

        return toEstudioDTO(estudio);
    }

    @Transactional
    public PreferenciasConfigDTO atualizarPreferencias(PreferenciasUpdateRequest request) {
        Usuario usuario = getUsuarioLogado();
        PreferenciasSistema preferencias = getOuCriarPreferencias(usuario);

        preferencias.setQtdFotosPadrao(request.getQtdFotosPadrao());
        preferencias.setValorFotoExtraPadrao(request.getValorFotoExtraPadrao());
        preferencias.setPrazoExpiracaoAlbumDias(request.getPrazoExpiracaoAlbumDias());
        preferencias.setCidadePadrao(request.getCidadePadrao());
        preferencias.setMensagemEnvioAlbum(request.getMensagemEnvioAlbum());
        preferencias.setMensagemSelecaoRecebida(request.getMensagemSelecaoRecebida());
        preferencias.setCapaAlbumPadraoUrl(request.getCapaAlbumPadraoUrl());

        preferenciasSistemaRepository.save(preferencias);

        return toPreferenciasDTO(preferencias);
    }

    @Transactional
    public EmailConfigDTO atualizarEmail(EmailConfigUpdateRequest request) {
        Usuario usuario = getUsuarioLogado();
        ConfiguracaoEmail email = getOuCriarEmail(usuario);

        email.setAtivo(Boolean.TRUE.equals(request.getAtivo()));
        email.setNomeRemetente(normalizarTexto(request.getNomeRemetente()));
        email.setEmailUsuarioAvisos(normalizarTexto(request.getEmailUsuarioAvisos()));
        email.setEnviarAlbumPublicado(Boolean.TRUE.equals(request.getEnviarAlbumPublicado()));
        email.setAvisarSelecaoRecebida(Boolean.TRUE.equals(request.getAvisarSelecaoRecebida()));
        email.setEnviarConfirmacaoSelecaoCliente(Boolean.TRUE.equals(request.getEnviarConfirmacaoSelecaoCliente()));
        email.setEnviarMudancaStatus(Boolean.TRUE.equals(request.getEnviarMudancaStatus()));
        email.setMensagemAlbumPublicado(normalizarTexto(request.getMensagemAlbumPublicado()));
        email.setMensagemSelecaoRecebida(normalizarTexto(request.getMensagemSelecaoRecebida()));

        configuracaoEmailRepository.save(email);

        return toEmailDTO(email);
    }

    @Transactional
    public EmailConfigDTO enviarEmailTeste() {
        Usuario usuario = getUsuarioLogado();
        ConfiguracaoEmail email = getOuCriarEmail(usuario);

        emailService.enviarTeste(email);

        return toEmailDTO(email);
    }

    @Transactional
    public void alterarSenha(AlterarSenhaRequest request) {
        Usuario usuario = getUsuarioLogado();

        if (!passwordEncoder.matches(request.getSenhaAtual(), usuario.getSenhaHash())) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Senha atual incorreta"
            );
        }

        if (!request.getNovaSenha().equals(request.getConfirmarNovaSenha())) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "A confirmação da nova senha não confere"
            );
        }

        if (request.getNovaSenha().length() < 6) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "A nova senha deve ter pelo menos 6 caracteres"
            );
        }

        usuario.setSenhaHash(passwordEncoder.encode(request.getNovaSenha()));
        usuarioRepository.save(usuario);
    }

    private Usuario getUsuarioLogado() {
        String email = SecurityContextHolder.getContext()
                .getAuthentication()
                .getName();

        return usuarioRepository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.UNAUTHORIZED,
                        "Perfil autenticado não encontrado"
                ));
    }

    private ConfiguracaoEstudio getOuCriarEstudio(Usuario usuario) {
        return configuracaoEstudioRepository.findByUsuarioId(usuario.getId())
                .orElseGet(() -> configuracaoEstudioRepository.save(
                        ConfiguracaoEstudio.builder()
                                .usuario(usuario)
                                .nomeEstudio("Seu Estúdio Fotográfico")
                                .nomeComercial("Seu Estúdio")
                                .email(usuario.getEmail())
                                .telefone(usuario.getTelefone())
                                .cnpj(usuario.getCnpj())
                                .logoUrl(usuario.getLogoUrl())
                                .build()
                ));
    }

    private PreferenciasSistema getOuCriarPreferencias(Usuario usuario) {
        return preferenciasSistemaRepository.findByUsuarioId(usuario.getId())
                .orElseGet(() -> preferenciasSistemaRepository.save(
                        PreferenciasSistema.builder()
                                .usuario(usuario)
                                .qtdFotosPadrao(20)
                                .prazoExpiracaoAlbumDias(30)
                                .mensagemEnvioAlbum("Olá! Seu álbum já está disponível. Acesse pelo link usando a senha enviada.")
                                .mensagemSelecaoRecebida("Recebemos sua seleção de fotos. Em breve entraremos em contato com os próximos passos.")
                                .build()
                ));
    }

    private ConfiguracaoEmail getOuCriarEmail(Usuario usuario) {
        return configuracaoEmailRepository.findByUsuarioId(usuario.getId())
                .orElseGet(() -> configuracaoEmailRepository.save(
                        ConfiguracaoEmail.builder()
                                .usuario(usuario)
                                .ativo(false)
                                .nomeRemetente("Seu Estúdio Fotográfico")
                                .emailUsuarioAvisos(usuario.getEmail())
                                .enviarAlbumPublicado(true)
                                .avisarSelecaoRecebida(true)
                                .enviarConfirmacaoSelecaoCliente(true)
                                .enviarMudancaStatus(false)
                                .mensagemAlbumPublicado("Olá! Seu álbum já está disponível. Acesse pelo link abaixo usando a senha enviada.")
                                .mensagemSelecaoRecebida("A seleção de fotos foi enviada. Acesse o sistema para conferir os detalhes.")
                                .build()
                ));
    }

    private UsuarioConfigDTO toUsuarioDTO(Usuario usuario) {
        return UsuarioConfigDTO.builder()
                .id(usuario.getId())
                .nome(usuario.getNome())
                .email(usuario.getEmail())
                .telefone(usuario.getTelefone())
                .cidade(usuario.getCidade())
                .fotoPerfilUrl(usuario.getFotoPerfilUrl())
                .onboardingConcluido(Boolean.TRUE.equals(usuario.getOnboardingConcluido()))
                .onboardingConcluidoEm(usuario.getOnboardingConcluidoEm())
                .build();
    }

    private EstudioConfigDTO toEstudioDTO(ConfiguracaoEstudio estudio) {
        return EstudioConfigDTO.builder()
                .id(estudio.getId())
                .nomeEstudio(estudio.getNomeEstudio())
                .nomeComercial(estudio.getNomeComercial())
                .email(estudio.getEmail())
                .telefone(estudio.getTelefone())
                .instagram(estudio.getInstagram())
                .cidade(estudio.getCidade())
                .endereco(estudio.getEndereco())
                .cnpj(estudio.getCnpj())
                .logoUrl(estudio.getLogoUrl())
                .build();
    }

    private String normalizarTexto(String valor) {
        if (valor == null) {
            return null;
        }

        String texto = valor.trim();

        return texto.isEmpty() ? null : texto;
    }

    private PreferenciasConfigDTO toPreferenciasDTO(PreferenciasSistema preferencias) {
        return PreferenciasConfigDTO.builder()
                .id(preferencias.getId())
                .qtdFotosPadrao(preferencias.getQtdFotosPadrao())
                .valorFotoExtraPadrao(preferencias.getValorFotoExtraPadrao())
                .prazoExpiracaoAlbumDias(preferencias.getPrazoExpiracaoAlbumDias())
                .cidadePadrao(preferencias.getCidadePadrao())
                .mensagemEnvioAlbum(preferencias.getMensagemEnvioAlbum())
                .mensagemSelecaoRecebida(preferencias.getMensagemSelecaoRecebida())
                .capaAlbumPadraoUrl(preferencias.getCapaAlbumPadraoUrl())
                .capaAlbumPadraoPublicId(preferencias.getCapaAlbumPadraoPublicId())
                .ultimoBackupMetadadosEm(preferencias.getUltimoBackupMetadadosEm())
                .build();
    }

    private EmailConfigDTO toEmailDTO(ConfiguracaoEmail email) {
        boolean smtpConfigurado = smtpConfigurado();
        boolean envioDisponivel = Boolean.TRUE.equals(email.getAtivo()) && smtpConfigurado;

        return EmailConfigDTO.builder()
                .id(email.getId())
                .ativo(email.getAtivo())
                .nomeRemetente(email.getNomeRemetente())
                .emailUsuarioAvisos(email.getEmailUsuarioAvisos())
                .enviarAlbumPublicado(email.getEnviarAlbumPublicado())
                .avisarSelecaoRecebida(email.getAvisarSelecaoRecebida())
                .enviarConfirmacaoSelecaoCliente(email.getEnviarConfirmacaoSelecaoCliente())
                .enviarMudancaStatus(email.getEnviarMudancaStatus())
                .mensagemAlbumPublicado(email.getMensagemAlbumPublicado())
                .mensagemSelecaoRecebida(email.getMensagemSelecaoRecebida())
                .smtpConfigurado(smtpConfigurado)
                .envioDisponivel(envioDisponivel)
                .motivoIndisponivel(resolverMotivoEmailIndisponivel(email, smtpConfigurado))
                .build();
    }

    private boolean smtpConfigurado() {
        return !isBlank(mailUsername) && !isBlank(mailPassword);
    }

    private String resolverMotivoEmailIndisponivel(ConfiguracaoEmail email, boolean smtpConfigurado) {
        if (!Boolean.TRUE.equals(email.getAtivo())) {
            return "Envio automatico desativado.";
        }

        if (!smtpConfigurado) {
            return "Servidor de e-mail não configurado. Configure MAIL_USERNAME e MAIL_PASSWORD no backend para liberar os envios.";
        }

        return null;
    }

    private boolean isBlank(String valor) {
        return valor == null || valor.trim().isEmpty();
    }
    @Transactional
public UsuarioConfigDTO uploadFotoPerfil(MultipartFile arquivo) {
    validarImagem(arquivo);

    Usuario usuario = getUsuarioLogado();

    try {
        Map<String, Object> uploadResult =
                cloudinaryService.uploadConfiguracao(arquivo, "perfil");

        String url = String.valueOf(uploadResult.get("secure_url"));

        usuario.setFotoPerfilUrl(url);
        usuarioRepository.save(usuario);

        return toUsuarioDTO(usuario);
    } catch (IOException e) {
        throw new ResponseStatusException(
                HttpStatus.INTERNAL_SERVER_ERROR,
                "Não foi possível enviar a foto de perfil"
        );
    }
}

@Transactional
public EstudioConfigDTO uploadLogoEstudio(MultipartFile arquivo) {
    validarImagem(arquivo);

    Usuario usuario = getUsuarioLogado();
    ConfiguracaoEstudio estudio = getOuCriarEstudio(usuario);

    try {
        Map<String, Object> uploadResult =
                cloudinaryService.uploadConfiguracao(arquivo, "estudio");

        String url = String.valueOf(uploadResult.get("secure_url"));

        estudio.setLogoUrl(url);
        configuracaoEstudioRepository.save(estudio);

        return toEstudioDTO(estudio);
    } catch (IOException e) {
        throw new ResponseStatusException(
                HttpStatus.INTERNAL_SERVER_ERROR,
                "Não foi possível enviar a logo do estúdio"
        );
    }
}
private void validarImagem(MultipartFile arquivo) {
    if (arquivo == null || arquivo.isEmpty()) {
        throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "Arquivo de imagem inválido"
        );
    }

    String contentType = arquivo.getContentType();

    boolean tipoValido =
            "image/jpeg".equals(contentType) ||
            "image/png".equals(contentType) ||
            "image/webp".equals(contentType);

    if (!tipoValido) {
        throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "Formato inválido. Envie apenas JPG, PNG ou WEBP"
        );
    }
}
@Transactional
public PreferenciasConfigDTO uploadCapaAlbumPadrao(MultipartFile arquivo) {
    validarImagem(arquivo);

    Usuario usuario = getUsuarioLogado();
    PreferenciasSistema preferencias = getOuCriarPreferencias(usuario);

    String publicIdAntigo = preferencias.getCapaAlbumPadraoPublicId();

    try {
        Map<String, Object> uploadResult =
                cloudinaryService.uploadConfiguracao(arquivo, "album-capa");

        String url = String.valueOf(uploadResult.get("secure_url"));
        String publicId = String.valueOf(uploadResult.get("public_id"));

        preferencias.setCapaAlbumPadraoUrl(url);
        preferencias.setCapaAlbumPadraoPublicId(publicId);

        preferenciasSistemaRepository.save(preferencias);

        if (publicIdAntigo != null && !publicIdAntigo.isBlank()) {
            try {
                cloudinaryService.deletar(publicIdAntigo);
            } catch (IOException ignored) {
                // Não quebra o fluxo se a imagem antiga não puder ser removida.
            }
        }

        return toPreferenciasDTO(preferencias);
    } catch (IOException e) {
        throw new ResponseStatusException(
                HttpStatus.INTERNAL_SERVER_ERROR,
                "Não foi possível enviar a capa padrão do álbum"
        );
    }
}

@Transactional
public PreferenciasConfigDTO removerCapaAlbumPadrao() {
    Usuario usuario = getUsuarioLogado();
    PreferenciasSistema preferencias = getOuCriarPreferencias(usuario);
    String publicIdAntigo = preferencias.getCapaAlbumPadraoPublicId();

    preferencias.setCapaAlbumPadraoUrl(null);
    preferencias.setCapaAlbumPadraoPublicId(null);
    preferenciasSistemaRepository.save(preferencias);

    if (publicIdAntigo != null && !publicIdAntigo.isBlank()) {
        try {
            cloudinaryService.deletar(publicIdAntigo);
        } catch (IOException ignored) {
            // A capa deixa de ser usada mesmo se a limpeza remota falhar.
        }
    }

    return toPreferenciasDTO(preferencias);
}

private Map<String, Object> backupCliente(Cliente cliente) {
    return mapa(
            "id", cliente.getId(),
            "nome", cliente.getNome(),
            "email", cliente.getEmail(),
            "telefone", cliente.getTelefone(),
            "cpf", cliente.getCpf(),
            "cidade", cliente.getCidade(),
            "indicacao", cliente.getIndicacao(),
            "ativo", cliente.getAtivo(),
            "criadoEm", cliente.getCriadoEm(),
            "atualizadoEm", cliente.getAtualizadoEm()
    );
}

private Map<String, Object> backupEnsaio(Ensaio ensaio) {
    return mapa(
            "id", ensaio.getId(),
            "clienteId", ensaio.getCliente().getId(),
            "tipo", ensaio.getTipo(),
            "tipoPersonalizado", ensaio.getTipoPersonalizado(),
            "status", ensaio.getStatus(),
            "dataEnsaio", ensaio.getDataEnsaio(),
            "local", ensaio.getLocal(),
            "cidadeEnsaio", ensaio.getCidadeEnsaio(),
            "estadoEnsaio", ensaio.getEstadoEnsaio(),
            "qtdFotosPacote", ensaio.getQtdFotosPacote(),
            "valorPacote", ensaio.getValorPacote(),
            "valorFotoExtra", ensaio.getValorFotoExtra(),
            "cobrarFotoExtra", ensaio.getCobrarFotoExtra(),
            "valorFinalEnsaio", ensaio.getValorFinalEnsaio(),
            "statusValores", ensaio.getStatusValores(),
            "observacaoValores", ensaio.getObservacaoValores(),
            "observacoes", ensaio.getObservacoes(),
            "notasInternas", ensaio.getNotasInternas(),
            "progresso", ensaio.getProgresso(),
            "criadoEm", ensaio.getCriadoEm(),
            "atualizadoEm", ensaio.getAtualizadoEm()
    );
}

private Map<String, Object> backupAlbum(Album album) {
    return mapa(
            "id", album.getId(),
            "ensaioId", album.getEnsaio().getId(),
            "acessoLiberado", album.getAcessoLiberado(),
            "tokenUrl", album.getTokenUrl(),
            "publicadoEm", album.getPublicadoEm(),
            "expiraEm", album.getExpiraEm(),
            "ativo", album.getAtivo(),
            "views", album.getViews()
    );
}

private Map<String, Object> backupFoto(Foto foto) {
    return mapa(
            "id", foto.getId(),
            "ensaioId", foto.getEnsaio().getId(),
            "cloudinaryId", foto.getCloudinaryId(),
            "nomeOriginal", foto.getNomeOriginal(),
            "urlWatermark", foto.getUrlWatermark(),
            "urlOriginal", foto.getUrlOriginal(),
            "ordem", foto.getOrdem(),
            "ehCapa", foto.getEhCapa(),
            "enviadaEm", foto.getEnviadaEm()
    );
}

private Map<String, Object> backupSelecao(SelecaoFoto selecao) {
    return mapa(
            "id", selecao.getId(),
            "albumId", selecao.getAlbum().getId(),
            "fotoId", selecao.getFoto().getId(),
            "finalizada", selecao.getFinalizada(),
            "selecionadaEm", selecao.getSelecionadaEm(),
            "totalSelecionadas", selecao.getTotalSelecionadas(),
            "valorExcedente", selecao.getValorExcedente(),
            "observacao", selecao.getObservacao()
    );
}

private Map<String, Object> backupHistorico(HistoricoStatusEnsaio historico) {
    return mapa(
            "id", historico.getId(),
            "ensaioId", historico.getEnsaio().getId(),
            "status", historico.getStatus(),
            "alteradoEm", historico.getAlteradoEm()
    );
}

private Map<String, Object> backupModeloContrato(ModeloContrato modelo) {
    return mapa(
            "id", modelo.getId(),
            "usuarioId", modelo.getUsuario().getId(),
            "nome", modelo.getNome(),
            "tipoEnsaio", modelo.getTipoEnsaio(),
            "clausulas", modelo.getClausulas(),
            "textoAceite", modelo.getTextoAceite(),
            "padrao", modelo.getPadrao(),
            "ativo", modelo.getAtivo(),
            "criadoEm", modelo.getCriadoEm(),
            "atualizadoEm", modelo.getAtualizadoEm()
    );
}

@SuppressWarnings("unchecked")
private byte[] gerarResumoBackupPdf(Map<String, Object> backup) throws Exception {
    ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
    Document document = new Document(PageSize.A4, 36, 36, 34, 34);

    PdfWriter.getInstance(document, outputStream);
    document.open();

    Font titulo = new Font(Font.HELVETICA, 18, Font.BOLD, new Color(38, 38, 38));
    Font subtitulo = new Font(Font.HELVETICA, 10, Font.NORMAL, new Color(110, 110, 110));
    Font secao = new Font(Font.HELVETICA, 12, Font.BOLD, new Color(38, 38, 38));
    Font texto = new Font(Font.HELVETICA, 9, Font.NORMAL, new Color(55, 55, 55));
    Font destaque = new Font(Font.HELVETICA, 9, Font.BOLD, new Color(38, 38, 38));

    Paragraph title = new Paragraph("Resumo do backup Fotolhar", titulo);
    title.setSpacingAfter(6);
    document.add(title);

    Paragraph meta = new Paragraph("Gerado em " + valorTexto(backup.get("geradoEm")) +
            " - Arquivo tecnico incluido neste pacote: backup-tecnico.json", subtitulo);
    meta.setSpacingAfter(18);
    document.add(meta);

    Map<String, Object> resumo = (Map<String, Object>) backup.get("resumo");
    document.add(new Paragraph("Resumo geral", secao));
    document.add(tabelaResumo(resumo, texto, destaque));

    Map<String, Object> dados = (Map<String, Object>) backup.get("dados");
    Map<String, Object> usuario = (Map<String, Object>) dados.get("usuario");
    document.add(new Paragraph("Profissional", secao));
    document.add(paragrafo("Nome: " + valorTexto(usuario.get("nome")) +
            " | Email: " + valorTexto(usuario.get("email")) +
            " | Telefone: " + valorTexto(usuario.get("telefone")), texto));

    List<Map<String, Object>> clientes = (List<Map<String, Object>>) dados.get("clientes");
    List<Map<String, Object>> ensaios = (List<Map<String, Object>>) dados.get("ensaios");

    document.add(new Paragraph("Clientes", secao));
    document.add(tabelaClientes(clientes, texto, destaque));

    document.add(new Paragraph("Ensaios", secao));
    document.add(tabelaEnsaios(ensaios, texto, destaque));

    Paragraph nota = new Paragraph(
            "Observacao: este PDF e para leitura e conferencia. Para restauracao/importacao futura, use o arquivo backup-tecnico.json incluido neste ZIP.",
            subtitulo
    );
    nota.setSpacingBefore(14);
    document.add(nota);

    document.close();
    return outputStream.toByteArray();
}

private PdfPTable tabelaResumo(Map<String, Object> resumo, Font texto, Font destaque) {
    PdfPTable table = new PdfPTable(5);
    table.setWidthPercentage(100);
    table.setSpacingAfter(16);

    addHeader(table, "Clientes", destaque);
    addHeader(table, "Ensaios", destaque);
    addHeader(table, "Albuns", destaque);
    addHeader(table, "Fotos", destaque);
    addHeader(table, "Selecoes", destaque);
    addCell(table, valorTexto(resumo.get("clientes")), texto);
    addCell(table, valorTexto(resumo.get("ensaios")), texto);
    addCell(table, valorTexto(resumo.get("albuns")), texto);
    addCell(table, valorTexto(resumo.get("fotos")), texto);
    addCell(table, valorTexto(resumo.get("selecoes")), texto);

    return table;
}

private PdfPTable tabelaClientes(List<Map<String, Object>> clientes, Font texto, Font destaque) {
    PdfPTable table = new PdfPTable(new float[] { 2.4f, 2.6f, 1.7f, 1.5f });
    table.setWidthPercentage(100);
    table.setSpacingAfter(16);

    addHeader(table, "Nome", destaque);
    addHeader(table, "Email", destaque);
    addHeader(table, "Telefone", destaque);
    addHeader(table, "Cidade", destaque);

    clientes.stream().limit(40).forEach(cliente -> {
        addCell(table, valorTexto(cliente.get("nome")), texto);
        addCell(table, valorTexto(cliente.get("email")), texto);
        addCell(table, valorTexto(cliente.get("telefone")), texto);
        addCell(table, valorTexto(cliente.get("cidade")), texto);
    });

    if (clientes.size() > 40) {
        addCell(table, "PDF mostra 40 clientes. O JSON tecnico contem todos os registros.", texto, 4);
    }

    return table;
}

private PdfPTable tabelaEnsaios(List<Map<String, Object>> ensaios, Font texto, Font destaque) {
    PdfPTable table = new PdfPTable(new float[] { 1.5f, 1.4f, 1.5f, 1.5f, 1.2f });
    table.setWidthPercentage(100);
    table.setSpacingAfter(12);

    addHeader(table, "Data", destaque);
    addHeader(table, "Tipo", destaque);
    addHeader(table, "Status", destaque);
    addHeader(table, "Valor final", destaque);
    addHeader(table, "Fotos pacote", destaque);

    ensaios.stream().limit(60).forEach(ensaio -> {
        addCell(table, valorTexto(ensaio.get("dataEnsaio")), texto);
        addCell(table, valorTexto(ensaio.get("tipo")), texto);
        addCell(table, valorTexto(ensaio.get("status")), texto);
        addCell(table, valorTexto(ensaio.get("valorFinalEnsaio")), texto);
        addCell(table, valorTexto(ensaio.get("qtdFotosPacote")), texto);
    });

    if (ensaios.size() > 60) {
        addCell(table, "PDF mostra 60 ensaios. O JSON tecnico contem todos os registros.", texto, 5);
    }

    return table;
}

private Paragraph paragrafo(String valor, Font font) {
    Paragraph paragraph = new Paragraph(valor, font);
    paragraph.setSpacingAfter(14);
    return paragraph;
}

private void addHeader(PdfPTable table, String value, Font font) {
    PdfPCell cell = new PdfPCell(new Phrase(value, font));
    cell.setBorder(Rectangle.BOTTOM);
    cell.setPadding(6);
    cell.setHorizontalAlignment(Element.ALIGN_LEFT);
    cell.setBackgroundColor(new Color(245, 241, 232));
    table.addCell(cell);
}

private void addCell(PdfPTable table, String value, Font font) {
    addCell(table, value, font, 1);
}

private void addCell(PdfPTable table, String value, Font font, int colspan) {
    PdfPCell cell = new PdfPCell(new Phrase(value, font));
    cell.setColspan(colspan);
    cell.setBorder(Rectangle.BOTTOM);
    cell.setPadding(6);
    table.addCell(cell);
}

private String valorTexto(Object valor) {
    if (valor == null) {
        return "-";
    }

    String texto = String.valueOf(valor);
    return texto.isBlank() ? "-" : texto;
}

private Map<String, Object> mapa(Object... valores) {
    Map<String, Object> resultado = new LinkedHashMap<>();

    for (int index = 0; index + 1 < valores.length; index += 2) {
        resultado.put(String.valueOf(valores[index]), valores[index + 1]);
    }

    return resultado;
}


    
}
