package com.fotolhar.service;

import com.fotolhar.dto.MarcaDaguaConfigDTO;
import com.fotolhar.dto.MarcaDaguaReprocessarResponse;
import com.fotolhar.dto.MarcaDaguaUpdateRequest;
import com.fotolhar.enums.MarcaDaguaPosicao;
import com.fotolhar.enums.MarcaDaguaTamanho;
import com.fotolhar.model.ConfiguracaoEstudio;
import com.fotolhar.model.Usuario;
import com.fotolhar.model.Foto;
import com.fotolhar.repository.ConfiguracaoEstudioRepository;
import com.fotolhar.repository.UsuarioRepository;
import com.fotolhar.repository.FotoRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.util.List;
import java.util.Map;

import com.fotolhar.dto.MarcaDaguaTextoRequest;
import com.fotolhar.enums.MarcaDaguaCor;
import com.fotolhar.enums.MarcaDaguaEstilo;
import com.fotolhar.enums.MarcaDaguaFonte;
import com.fotolhar.enums.MarcaDaguaTipo;
import com.fotolhar.enums.MarcaDaguaTextoModo;

import javax.imageio.ImageIO;
import java.awt.*;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;

@Service
@RequiredArgsConstructor
public class MarcaDaguaService {

    private final CloudinaryService cloudinaryService;
    private final UsuarioRepository usuarioRepository;
    private final ConfiguracaoEstudioRepository configuracaoEstudioRepository;
    private final FotoRepository fotoRepository;

    @Transactional(readOnly = true)
    public MarcaDaguaConfigDTO buscarMarcaDagua() {
        Usuario usuario = getUsuarioLogado();
        ConfiguracaoEstudio estudio = getOuCriarEstudio(usuario);

        return toDTO(estudio);
    }

    @Transactional
    public MarcaDaguaConfigDTO atualizarMarcaDagua(MarcaDaguaUpdateRequest request) {
        Usuario usuario = getUsuarioLogado();
        ConfiguracaoEstudio estudio = getOuCriarEstudio(usuario);

        if (request.getMarcaDaguaAtiva() != null) {
            estudio.setMarcaDaguaAtiva(request.getMarcaDaguaAtiva());
        }

        if (request.getMarcaDaguaPosicao() != null) {
            estudio.setMarcaDaguaPosicao(request.getMarcaDaguaPosicao());
        }

        if (request.getMarcaDaguaTamanho() != null) {
            estudio.setMarcaDaguaTamanho(request.getMarcaDaguaTamanho());
        }

        if (request.getMarcaDaguaOpacidade() != null) {
            int opacidade = Math.max(10, Math.min(100, request.getMarcaDaguaOpacidade()));
            estudio.setMarcaDaguaOpacidade(opacidade);
        }

        if (request.getMarcaDaguaMargem() != null) {
            int margem = Math.max(0, Math.min(100, request.getMarcaDaguaMargem()));
            estudio.setMarcaDaguaMargem(margem);
        }

        configuracaoEstudioRepository.save(estudio);

        return toDTO(estudio);
    }

    @Transactional
    public MarcaDaguaConfigDTO uploadImagemMarcaDagua(MultipartFile arquivo) {
        validarImagem(arquivo);

        Usuario usuario = getUsuarioLogado();
        ConfiguracaoEstudio estudio = getOuCriarEstudio(usuario);

        try {
            if (estudio.getMarcaDaguaPublicId() != null && !estudio.getMarcaDaguaPublicId().isBlank()) {
                cloudinaryService.deletar(estudio.getMarcaDaguaPublicId());
            }

            Map<String, Object> uploadResult =
                    cloudinaryService.uploadConfiguracao(arquivo, "marca-dagua");

            String url = String.valueOf(uploadResult.get("secure_url"));
            String publicId = String.valueOf(uploadResult.get("public_id"));

            

            estudio.setMarcaDaguaUrl(url);
            estudio.setMarcaDaguaPublicId(publicId);
            estudio.setMarcaDaguaAtiva(true);
            estudio.setMarcaDaguaTipo(MarcaDaguaTipo.IMAGEM);
            estudio.setMarcaDaguaTexto(null);
            estudio.setMarcaDaguaFonte(null);
            estudio.setMarcaDaguaCor(null);
            estudio.setMarcaDaguaEstilo(null);

            garantirPadroes(estudio);

            configuracaoEstudioRepository.save(estudio);

            return toDTO(estudio);
        } catch (IOException e) {
            throw new ResponseStatusException(
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    "Não foi possível enviar a marca d'água"
            );
        }
    }

    @Transactional
    public MarcaDaguaConfigDTO removerImagemMarcaDagua() {
        Usuario usuario = getUsuarioLogado();
        ConfiguracaoEstudio estudio = getOuCriarEstudio(usuario);

        try {
            if (estudio.getMarcaDaguaPublicId() != null && !estudio.getMarcaDaguaPublicId().isBlank()) {
                cloudinaryService.deletar(estudio.getMarcaDaguaPublicId());
            }

            estudio.setMarcaDaguaUrl(null);
            estudio.setMarcaDaguaPublicId(null);
            estudio.setMarcaDaguaAtiva(false);

            configuracaoEstudioRepository.save(estudio);

            return toDTO(estudio);
        } catch (IOException e) {
            throw new ResponseStatusException(
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    "Não foi possível remover a marca d'água"
            );
        }
    }

    @Transactional
    public MarcaDaguaReprocessarResponse reprocessarFotosExistentes() {
        Usuario usuario = getUsuarioLogado();
        ConfiguracaoEstudio estudio = getOuCriarEstudio(usuario);

        List<Foto> fotos = fotoRepository.findByEnsaioClienteUsuarioId(usuario.getId());

        int total = 0;

        for (Foto foto : fotos) {
            if (foto.getUrlOriginal() == null || foto.getUrlOriginal().isBlank()) {
                continue;
            }

            String urlWatermark = gerarUrlComMarcaDagua(foto.getUrlOriginal(), estudio);
            foto.setUrlWatermark(urlWatermark);
            total++;
        }

        fotoRepository.saveAll(fotos);

        return MarcaDaguaReprocessarResponse.builder()
                .totalFotosReprocessadas(total)
                .mensagem(total + " foto(s) reprocessada(s) com sucesso.")
                .build();
    }

    @Transactional(readOnly = true)
    public String gerarUrlComMarcaDagua(String urlOriginal) {
        Usuario usuario = getUsuarioLogado();
        ConfiguracaoEstudio estudio = getOuCriarEstudio(usuario);

        return gerarUrlComMarcaDagua(urlOriginal, estudio);
    }

    public String gerarUrlComMarcaDagua(String urlOriginal, ConfiguracaoEstudio estudio) {
        if (urlOriginal == null || urlOriginal.isBlank()) {
            return urlOriginal;
        }

        if (estudio == null) {
            return urlOriginal;
        }

        if (!Boolean.TRUE.equals(estudio.getMarcaDaguaAtiva())) {
            return urlOriginal;
        }

        if (estudio.getMarcaDaguaPublicId() == null || estudio.getMarcaDaguaPublicId().isBlank()) {
            return urlOriginal;
        }

        if (!urlOriginal.contains("/upload/")) {
            return urlOriginal;
        }

        String overlayPublicId = prepararPublicIdOverlay(estudio.getMarcaDaguaPublicId());
        boolean textoRepetido =
                estudio.getMarcaDaguaTipo() == MarcaDaguaTipo.TEXTO &&
                getModoTexto(estudio) == MarcaDaguaTextoModo.REPETIDA;
        String gravidade = mapearGravidade(estudio.getMarcaDaguaPosicao());
        int largura = mapearLargura(estudio.getMarcaDaguaTamanho());
        int opacidade = estudio.getMarcaDaguaOpacidade() == null ? 35 : estudio.getMarcaDaguaOpacidade();
        int margem = estudio.getMarcaDaguaMargem() == null ? 30 : estudio.getMarcaDaguaMargem();

        String transformacao;
        String baseTransform = "c_limit,w_1800,h_1800,q_auto";

        if (textoRepetido) {
            transformacao = String.format(
                    "/upload/%s/l_%s,c_fill,w_1.0,h_1.0,fl_relative,o_%d/fl_layer_apply,g_center/",
                    baseTransform,
                    overlayPublicId,
                    opacidade
            );
        } else if ("center".equals(gravidade)) {
            transformacao = String.format(
                    "/upload/%s/l_%s,w_%d,o_%d,fl_no_overflow/fl_layer_apply,g_%s/",
                    baseTransform,
                    overlayPublicId,
                    largura,
                    opacidade,
                    gravidade
            );
        } else {
            transformacao = String.format(
                    "/upload/%s/l_%s,w_%d,o_%d,fl_no_overflow/fl_layer_apply,g_%s,x_%d,y_%d/",
                    baseTransform,
                    overlayPublicId,
                    largura,
                    opacidade,
                    gravidade,
                    margem,
                    margem
            );
        }

        return urlOriginal.replace("/upload/", transformacao);
    }

    private void garantirPadroes(ConfiguracaoEstudio estudio) {
        if (estudio.getMarcaDaguaPosicao() == null) {
            estudio.setMarcaDaguaPosicao(MarcaDaguaPosicao.INFERIOR_DIREITA);
        }

        if (estudio.getMarcaDaguaTamanho() == null) {
            estudio.setMarcaDaguaTamanho(MarcaDaguaTamanho.MEDIA);
        }

        if (estudio.getMarcaDaguaOpacidade() == null) {
            estudio.setMarcaDaguaOpacidade(35);
        }

        if (estudio.getMarcaDaguaMargem() == null) {
            estudio.setMarcaDaguaMargem(30);
        }

        if (estudio.getMarcaDaguaTextoModo() == null) {
            estudio.setMarcaDaguaTextoModo(MarcaDaguaTextoModo.REPETIDA);
        }
    }

    private MarcaDaguaTextoModo getModoTexto(ConfiguracaoEstudio estudio) {
        return estudio.getMarcaDaguaTextoModo() == null
                ? MarcaDaguaTextoModo.REPETIDA
                : estudio.getMarcaDaguaTextoModo();
    }

    private String prepararPublicIdOverlay(String publicId) {
        return publicId.replace("/", ":");
    }

    private String mapearGravidade(MarcaDaguaPosicao posicao) {
        if (posicao == null) {
            return "south_east";
        }

        return switch (posicao) {
            case SUPERIOR_ESQUERDA -> "north_west";
            case SUPERIOR_DIREITA -> "north_east";
            case CENTRO -> "center";
            case INFERIOR_ESQUERDA -> "south_west";
            case INFERIOR_DIREITA -> "south_east";
        };
    }

    private int mapearLargura(MarcaDaguaTamanho tamanho) {
        if (tamanho == null) {
            return 250;
        }

        return switch (tamanho) {
            case PEQUENA -> 160;
            case MEDIA -> 250;
            case GRANDE -> 360;
        };
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
                                .marcaDaguaAtiva(false)
                                .marcaDaguaPosicao(MarcaDaguaPosicao.INFERIOR_DIREITA)
                                .marcaDaguaOpacidade(35)
                                .marcaDaguaTamanho(MarcaDaguaTamanho.MEDIA)
                                .marcaDaguaMargem(30)
                                .build()
                ));
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

    private MarcaDaguaConfigDTO toDTO(ConfiguracaoEstudio estudio) {
        garantirPadroes(estudio);

        return MarcaDaguaConfigDTO.builder()
                .marcaDaguaUrl(estudio.getMarcaDaguaUrl())
                .marcaDaguaPublicId(estudio.getMarcaDaguaPublicId())
                .marcaDaguaAtiva(estudio.getMarcaDaguaAtiva())
                .marcaDaguaPosicao(estudio.getMarcaDaguaPosicao())
                .marcaDaguaOpacidade(estudio.getMarcaDaguaOpacidade())
                .marcaDaguaTamanho(estudio.getMarcaDaguaTamanho())
                .marcaDaguaMargem(estudio.getMarcaDaguaMargem())
                .marcaDaguaTipo(estudio.getMarcaDaguaTipo())
                .marcaDaguaTexto(estudio.getMarcaDaguaTexto())
                .marcaDaguaFonte(estudio.getMarcaDaguaFonte())
                .marcaDaguaCor(estudio.getMarcaDaguaCor())
                .marcaDaguaEstilo(estudio.getMarcaDaguaEstilo())
                .marcaDaguaTextoModo(getModoTexto(estudio))
                .build();
                
    }



    @Transactional
public MarcaDaguaConfigDTO gerarMarcaDaguaTexto(MarcaDaguaTextoRequest request) {
    Usuario usuario = getUsuarioLogado();
    ConfiguracaoEstudio estudio = getOuCriarEstudio(usuario);

    String texto = request.getTexto() == null ? "" : request.getTexto().trim();

    if (texto.isBlank()) {
        throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "Informe o texto da marca d'água"
        );
    }

    try {
        if (estudio.getMarcaDaguaPublicId() != null && !estudio.getMarcaDaguaPublicId().isBlank()) {
            cloudinaryService.deletar(estudio.getMarcaDaguaPublicId());
        }

        byte[] imagemTexto = gerarPngTextoTransparente(
                texto,
                request.getFonte(),
                request.getCor(),
                request.getEstilo(),
                request.getModo()
        );

        Map<String, Object> uploadResult =
                cloudinaryService.uploadBytes(imagemTexto, "marca-dagua");

        String url = String.valueOf(uploadResult.get("secure_url"));
        String publicId = String.valueOf(uploadResult.get("public_id"));

        estudio.setMarcaDaguaUrl(url);
        estudio.setMarcaDaguaPublicId(publicId);
        estudio.setMarcaDaguaAtiva(true);

        estudio.setMarcaDaguaTipo(MarcaDaguaTipo.TEXTO);
        estudio.setMarcaDaguaTexto(texto);
        estudio.setMarcaDaguaFonte(request.getFonte() != null ? request.getFonte() : MarcaDaguaFonte.MODERNA);
        estudio.setMarcaDaguaCor(request.getCor() != null ? request.getCor() : MarcaDaguaCor.BRANCO);
        estudio.setMarcaDaguaEstilo(request.getEstilo() != null ? request.getEstilo() : MarcaDaguaEstilo.NORMAL);
        estudio.setMarcaDaguaTextoModo(request.getModo() != null ? request.getModo() : MarcaDaguaTextoModo.REPETIDA);

        garantirPadroes(estudio);

        configuracaoEstudioRepository.save(estudio);

        return toDTO(estudio);
    } catch (IOException e) {
        throw new ResponseStatusException(
                HttpStatus.INTERNAL_SERVER_ERROR,
                "Não foi possível gerar a marca d'água por texto"
        );
    }
}


private byte[] gerarPngTextoTransparente(
        String texto,
        MarcaDaguaFonte fonte,
        MarcaDaguaCor cor,
        MarcaDaguaEstilo estilo,
        MarcaDaguaTextoModo modo
) throws IOException {
    int fontStyle = Font.PLAIN;

    if (estilo == MarcaDaguaEstilo.NEGRITO) {
        fontStyle = Font.BOLD;
    } else if (estilo == MarcaDaguaEstilo.ITALICO) {
        fontStyle = Font.ITALIC;
    }

    String fontFamily = switch (fonte != null ? fonte : MarcaDaguaFonte.MODERNA) {
        case ELEGANTE -> "Serif";
        case CLASSICA -> "Serif";
        case MODERNA -> "SansSerif";
    };

    if (modo == MarcaDaguaTextoModo.UNICA) {
        return gerarPngTextoUnico(texto, fontFamily, fontStyle, cor);
    }

    Font font = new Font(fontFamily, fontStyle, 58);

    int width = 1800;
    int height = 1800;
    int stepX = 430;
    int stepY = 260;

    BufferedImage image = new BufferedImage(width, height, BufferedImage.TYPE_INT_ARGB);
    Graphics2D graphics = image.createGraphics();

    graphics.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
    graphics.setRenderingHint(RenderingHints.KEY_TEXT_ANTIALIASING, RenderingHints.VALUE_TEXT_ANTIALIAS_ON);
    graphics.setFont(font);

    Color baseColor = switch (cor != null ? cor : MarcaDaguaCor.BRANCO) {
        case BRANCO -> Color.WHITE;
        case PRETO -> Color.BLACK;
        case DOURADO -> new Color(212, 175, 55);
    };

    Color shadowColor = new Color(0, 0, 0, 45);
    Color textColor = new Color(baseColor.getRed(), baseColor.getGreen(), baseColor.getBlue(), 175);

    graphics.rotate(Math.toRadians(-35), width / 2.0, height / 2.0);

    for (int y = -height; y < height * 2; y += stepY) {
        for (int x = -width; x < width * 2; x += stepX) {
            graphics.setColor(shadowColor);
            graphics.drawString(texto, x + 3, y + 3);

            graphics.setColor(textColor);
            graphics.drawString(texto, x, y);
        }
    }

    graphics.dispose();

    ByteArrayOutputStream output = new ByteArrayOutputStream();
    ImageIO.write(image, "png", output);

    return output.toByteArray();
}

private byte[] gerarPngTextoUnico(
        String texto,
        String fontFamily,
        int fontStyle,
        MarcaDaguaCor cor
) throws IOException {
    Font font = new Font(fontFamily, fontStyle, 96);

    BufferedImage temp = new BufferedImage(1, 1, BufferedImage.TYPE_INT_ARGB);
    Graphics2D tempGraphics = temp.createGraphics();
    tempGraphics.setFont(font);

    FontMetrics metrics = tempGraphics.getFontMetrics();

    int paddingX = 80;
    int paddingY = 60;

    int width = metrics.stringWidth(texto) + paddingX * 2;
    int height = metrics.getHeight() + paddingY * 2;

    tempGraphics.dispose();

    BufferedImage image = new BufferedImage(width, height, BufferedImage.TYPE_INT_ARGB);
    Graphics2D graphics = image.createGraphics();

    graphics.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
    graphics.setRenderingHint(RenderingHints.KEY_TEXT_ANTIALIASING, RenderingHints.VALUE_TEXT_ANTIALIAS_ON);

    graphics.setFont(font);

    int x = paddingX;
    int y = paddingY + metrics.getAscent();

    Color textColor = switch (cor != null ? cor : MarcaDaguaCor.BRANCO) {
        case BRANCO -> Color.WHITE;
        case PRETO -> Color.BLACK;
        case DOURADO -> new Color(212, 175, 55);
    };

    graphics.setColor(new Color(0, 0, 0, 80));
    graphics.drawString(texto, x + 4, y + 4);

    graphics.setColor(textColor);
    graphics.drawString(texto, x, y);

    graphics.dispose();

    ByteArrayOutputStream output = new ByteArrayOutputStream();
    ImageIO.write(image, "png", output);

    return output.toByteArray();
}


}
