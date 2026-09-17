package com.fotolhar.service;

import com.fotolhar.enums.StatusEnsaio;
import com.fotolhar.model.Album;
import com.fotolhar.model.ConfiguracaoEmail;
import com.fotolhar.model.Ensaio;
import com.fotolhar.model.SelecaoFoto;
import com.fotolhar.repository.AlbumRepository;
import com.fotolhar.repository.ConfiguracaoEmailRepository;
import com.fotolhar.repository.SelecaoFotoRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.scheduling.annotation.Async;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class EmailService {

    private static final DateTimeFormatter DATA_BR =
            DateTimeFormatter.ofPattern("dd/MM/yyyy");
    private static final DateTimeFormatter DATA_HORA_BR =
            DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");

    private final ConfiguracaoEmailRepository configuracaoEmailRepository;
    private final AlbumRepository albumRepository;
    private final SelecaoFotoRepository selecaoFotoRepository;
    private final EmailDeliveryService emailDeliveryService;
    private final SelecaoResumoPdfService selecaoResumoPdfService;

    @Value("${spring.mail.username:}")
    private String emailSistema;

    @Value("${spring.mail.password:}")
    private String senhaSistema;

    public void enviarAlbumPublicado(Ensaio ensaio, Album album, String senha, String urlAcesso) {
        ConfiguracaoEmail config = buscarConfiguracao(ensaio);

        if (!envioHabilitado(config) || !Boolean.TRUE.equals(config.getEnviarAlbumPublicado())) {
            return;
        }

        String destino = ensaio.getCliente().getEmail();

        if (isBlank(destino)) {
            return;
        }

        String validade = album.getExpiraEm() == null
                ? "validade nao informada"
                : album.getExpiraEm().format(DATA_BR);

        String mensagem = valorOuPadrao(
                config.getMensagemAlbumPublicado(),
                "Olá! Seu álbum já está disponivel. Acesse pelo link abaixo usando a senha enviada."
        );

        String corpo = String.join("\n\n",
                mensagem,
                "Contato: " + ensaio.getCliente().getNome(),
                "Link do álbum: " + urlAcesso,
                "Senha: " + senha,
                "Disponivel até: " + validade,
                "Com carinho,\n" + valorOuPadrao(config.getNomeRemetente(), "Seu Estudio Fotografico")
        );

        enviar(config, destino, "Seu álbum está disponivel", corpo);
    }

    public void avisarSelecaoRecebida(Album album, int totalSelecionadas, int excedente) {
        Ensaio ensaio = album.getEnsaio();
        ConfiguracaoEmail config = buscarConfiguracao(ensaio);

        if (!envioHabilitado(config) || !Boolean.TRUE.equals(config.getAvisarSelecaoRecebida())) {
            return;
        }

        String destino = config.getEmailUsuarioAvisos();

        if (isBlank(destino)) {
            return;
        }

        String mensagem = valorOuPadrao(
                config.getMensagemSelecaoRecebida(),
                "A seleção de fotos foi enviada. Acesse o sistema para conferir os detalhes."
        );

        String corpo = String.join("\n\n",
                mensagem,
                "Contato: " + ensaio.getCliente().getNome(),
                "Tipo do ensaio: " + resolverTipoExibicao(ensaio),
                "Fotos selecionadas: " + totalSelecionadas,
                "Fotos extras: " + excedente
        );

        enviar(config, destino, "Seleção de fotos recebida", corpo);
    }

    public void enviarConfirmacaoSelecaoCliente(
            Album album,
            List<SelecaoFoto> selecoes,
            int totalSelecionadas,
            int limitePlano,
            int excedente,
            BigDecimal valorExcedente
    ) {
        try {
            Ensaio ensaio = album.getEnsaio();
            ConfiguracaoEmail config = buscarConfiguracao(ensaio);

            if (!envioHabilitado(config) || !Boolean.TRUE.equals(config.getEnviarConfirmacaoSelecaoCliente())) {
                return;
            }

            String destino = ensaio.getCliente().getEmail();

            if (isBlank(destino)) {
                return;
            }

            byte[] pdf = selecaoResumoPdfService.gerarPdf(
                    album,
                    selecoes,
                    totalSelecionadas,
                    limitePlano,
                    excedente,
                    valorExcedente
            );

            String nomeCliente = valorOuPadrao(ensaio.getCliente().getNome(), "pessoa convidada");
            String nomeRemetente = valorOuPadrao(config.getNomeRemetente(), "Seu Estudio Fotografico");
            String corpo = String.join("\n\n",
                    "Olá, " + nomeCliente + ". Tudo bem?",
                    "Recebemos a relação das fotos que voçê selecionou.\nSegue em anexo um PDF com o resumo da sua seleção.",
                    "Um abraço,\n" + nomeRemetente
            );

            emailDeliveryService.enviarAutomaticoComAnexo(
                    destino,
                    "Confirmacao de selecao finalizada",
                    corpo,
                    nomeRemetente,
                    config.getEmailUsuarioAvisos(),
                    "resumo-da-selecao.pdf",
                    pdf
            );
        } catch (Exception error) {
            log.warn("[EmailService] Nao foi possivel preparar a confirmacao da selecao: {}", error.getMessage());
        }
    }

    @Async("emailTaskExecutor")
    @Transactional(readOnly = true)
    public void enviarNotificacoesSelecaoAsync(
            UUID albumId,
            int totalSelecionadas,
            int limitePlano,
            int excedente,
            BigDecimal valorExcedente
    ) {
        try {
            Album album = albumRepository.findById(albumId).orElse(null);

            if (album == null) {
                log.warn("[EmailService] Album {} nao encontrado para notificacoes de selecao.", albumId);
                return;
            }

            List<SelecaoFoto> selecoes = selecaoFotoRepository.findByAlbumId(albumId);

            avisarSelecaoRecebida(album, totalSelecionadas, excedente);
            enviarConfirmacaoSelecaoCliente(
                    album,
                    selecoes,
                    totalSelecionadas,
                    limitePlano,
                    excedente,
                    valorExcedente
            );
        } catch (Exception error) {
            log.warn("[EmailService] Nao foi possivel preparar notificacoes da selecao: {}", error.getMessage());
        }
    }

    public void avisarStatusAlterado(Ensaio ensaio, StatusEnsaio status) {
        ConfiguracaoEmail config = buscarConfiguracao(ensaio);

        if (!envioHabilitado(config) || !Boolean.TRUE.equals(config.getEnviarMudancaStatus())) {
            return;
        }

        String destino = ensaio.getCliente().getEmail();

        if (isBlank(destino)) {
            return;
        }

        String corpo = resolverMensagemStatus(config, ensaio, status);

        enviar(config, destino, "Atualizaçao do seu ensaio", corpo);
    }

    public void avisarEnsaioAgendado(Ensaio ensaio) {
        ConfiguracaoEmail config = buscarConfiguracao(ensaio);

        if (!envioHabilitado(config) || !Boolean.TRUE.equals(config.getEnviarMudancaStatus())) {
            return;
        }

        String destino = ensaio.getCliente().getEmail();

        if (isBlank(destino)) {
            return;
        }

        String data = ensaio.getDataEnsaio() == null
                ? "data a definir"
                : ensaio.getDataEnsaio().format(DATA_HORA_BR);

        String corpo = String.join("\n\n",
                "Olá, " + valorOuPadrao(ensaio.getCliente().getNome(), "pessoa convidada") + ".",
                "Seu ensaio foi agendado.",
                "Tipo do ensaio: " + resolverTipoExibicao(ensaio),
                "Data: " + data,
                "Com carinho,\n" + valorOuPadrao(config.getNomeRemetente(), "Seu Estudio Fotografico")
        );

        enviar(config, destino, "Ensaio agendado", corpo);
    }

    public void enviarTeste(ConfiguracaoEmail config) {
        if (!smtpConfigurado()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Servidor de e-mail não configurado. Configure MAIL_USERNAME e MAIL_PASSWORD no backend para liberar os envios."
            );
        }

        String destino = config.getEmailUsuarioAvisos();

        if (isBlank(destino)) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Informe um e-mail para receber avisos antes de testar."
            );
        }

        String corpo = String.join("\n\n",
                "Este é um e-mail de teste do Fotolhar.",
                "Se voce recebeu está mensagem, o envio de e-mails esta funcionando.",
                "Remetente: " + valorOuPadrao(config.getNomeRemetente(), "Seu Estudio Fotografico")
        );

        enviarObrigatorio(config, destino, "Teste de e-mail Fotolhar", corpo);
    }

    private ConfiguracaoEmail buscarConfiguracao(Ensaio ensaio) {
        if (ensaio != null
                && ensaio.getCliente() != null
                && ensaio.getCliente().getUsuario() != null) {
            return configuracaoEmailRepository
                    .findByUsuarioId(ensaio.getCliente().getUsuario().getId())
                    .orElse(null);
        }

        return buscarConfiguracaoUsuarioLogada().orElse(null);
    }

    private boolean envioHabilitado(ConfiguracaoEmail config) {
        return config != null && Boolean.TRUE.equals(config.getAtivo()) && smtpConfigurado();
    }

    private void enviar(ConfiguracaoEmail config, String destino, String assunto, String corpo) {
        emailDeliveryService.enviarAutomatico(
                destino,
                assunto,
                corpo,
                valorOuPadrao(config.getNomeRemetente(), "Seu Estudio Fotografico"),
                config.getEmailUsuarioAvisos()
        );
    }

    private void enviarObrigatorio(ConfiguracaoEmail config, String destino, String assunto, String corpo) {
        emailDeliveryService.enviarObrigatorio(
                destino,
                assunto,
                corpo,
                valorOuPadrao(config.getNomeRemetente(), "Seu Estudio Fotografico"),
                config.getEmailUsuarioAvisos()
        );
    }

    private Optional<ConfiguracaoEmail> buscarConfiguracaoUsuarioLogada() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        if (authentication == null || !authentication.isAuthenticated()) {
            return Optional.empty();
        }

        String email = authentication.getName();

        if (isBlank(email) || "anonymousUser".equals(email)) {
            return Optional.empty();
        }

        return configuracaoEmailRepository.findAll()
                .stream()
                .filter(config -> config.getUsuario() != null
                        && email.equalsIgnoreCase(config.getUsuario().getEmail()))
                .findFirst();
    }

    private boolean smtpConfigurado() {
        return !isBlank(emailSistema) && !isBlank(senhaSistema);
    }

    private String formatarStatus(StatusEnsaio status) {
        return switch (status) {
            case AGENDADO -> "Agendado";
            case REALIZADO -> "Realizado";
            case EM_SELECAO -> "Em selecao";
            case EM_EDICAO -> "Em edicao";
            case FINALIZADO -> "Finalizado";
            case CANCELADO -> "Cancelado";
        };
    }

    private String valorOuPadrao(String value, String fallback) {
        return isBlank(value) ? fallback : value.trim();
    }

    private String resolverMensagemStatus(ConfiguracaoEmail config, Ensaio ensaio, StatusEnsaio status) {
        return String.join("\n\n",
                "Olá, " + valorOuPadrao(ensaio.getCliente().getNome(), "pessoa convidada") + ".",
                "O status do seu ensaio foi atualizado para: " + formatarStatus(status) + ".",
                "Com carinho,\n" + valorOuPadrao(config.getNomeRemetente(), "Seu Estudio Fotografico")
        );
    }

    private boolean isBlank(String value) {
        return value == null || value.trim().isEmpty();
    }

    private String resolverTipoExibicao(Ensaio ensaio) {
        if (ensaio == null || ensaio.getTipo() == null) {
            return "Nao informado";
        }

        if (ensaio.getTipo().name().equals("OUTRO")
                && ensaio.getTipoPersonalizado() != null
                && !ensaio.getTipoPersonalizado().isBlank()) {
            return ensaio.getTipoPersonalizado().trim();
        }

        return ensaio.getTipo().getDescricao();
    }
}
