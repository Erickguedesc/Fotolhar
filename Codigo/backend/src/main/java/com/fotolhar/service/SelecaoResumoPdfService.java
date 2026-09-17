package com.fotolhar.service;

import com.fotolhar.model.Album;
import com.fotolhar.model.Ensaio;
import com.fotolhar.model.Foto;
import com.fotolhar.model.SelecaoFoto;
import com.lowagie.text.Document;
import com.lowagie.text.Element;
import com.lowagie.text.Font;
import com.lowagie.text.Image;
import com.lowagie.text.PageSize;
import com.lowagie.text.Paragraph;
import com.lowagie.text.Phrase;
import com.lowagie.text.Rectangle;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import org.springframework.stereotype.Service;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.net.URI;
import java.text.NumberFormat;
import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;

@Service
public class SelecaoResumoPdfService {

    private static final DateTimeFormatter DATA_HORA =
            DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");

    public byte[] gerarPdf(
            Album album,
            List<SelecaoFoto> selecoes,
            int totalSelecionadas,
            int limitePlano,
            int excedente,
            BigDecimal valorExcedente
    ) {
        try {
            ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
            Document document = new Document(PageSize.A4, 36, 36, 34, 34);

            PdfWriter.getInstance(document, outputStream);
            document.open();

            Ensaio ensaio = album.getEnsaio();
            Font titulo = new Font(Font.HELVETICA, 18, Font.BOLD, new Color(35, 35, 35));
            Font subtitulo = new Font(Font.HELVETICA, 10, Font.NORMAL, new Color(100, 100, 100));
            Font secao = new Font(Font.HELVETICA, 12, Font.BOLD, new Color(45, 45, 45));
            Font texto = new Font(Font.HELVETICA, 9, Font.NORMAL, new Color(55, 55, 55));
            Font destaque = new Font(Font.HELVETICA, 9, Font.BOLD, new Color(35, 35, 35));

            Paragraph title = new Paragraph("Resumo da selecao de fotos", titulo);
            title.setSpacingAfter(6);
            document.add(title);

            Paragraph meta = new Paragraph(
                    "Cliente: " + valorOuTraco(ensaio.getCliente().getNome()) +
                            " | Ensaio: " + resolverTipoExibicao(ensaio) +
                            " | Gerado em: " + OffsetDateTime.now().format(DATA_HORA),
                    subtitulo
            );
            meta.setSpacingAfter(18);
            document.add(meta);

            document.add(new Paragraph("Resumo", secao));
            document.add(tabelaResumo(totalSelecionadas, limitePlano, excedente, valorExcedente, texto, destaque));

            document.add(new Paragraph("Fotos selecionadas", secao));
            document.add(tabelaFotos(selecoes, texto, destaque));

            Paragraph nota = new Paragraph(
                    "Este documento confirma a relação de fotos enviada pela galeria online.",
                    subtitulo
            );
            nota.setSpacingBefore(14);
            document.add(nota);

            document.close();
            return outputStream.toByteArray();
        } catch (Exception e) {
            throw new IllegalStateException("Nao foi possivel gerar o PDF da selecao", e);
        }
    }

    private PdfPTable tabelaResumo(
            int totalSelecionadas,
            int limitePlano,
            int excedente,
            BigDecimal valorExcedente,
            Font texto,
            Font destaque
    ) {
        PdfPTable table = new PdfPTable(4);
        table.setWidthPercentage(100);
        table.setSpacingAfter(16);

        addHeader(table, "Selecionadas", destaque);
        addHeader(table, "Pacote", destaque);
        addHeader(table, "Extras", destaque);
        addHeader(table, "Valor extra", destaque);
        addCell(table, String.valueOf(totalSelecionadas), texto);
        addCell(table, String.valueOf(limitePlano), texto);
        addCell(table, String.valueOf(excedente), texto);
        addCell(table, moeda(valorExcedente), texto);

        return table;
    }

    private PdfPTable tabelaFotos(List<SelecaoFoto> selecoes, Font texto, Font destaque) {
        PdfPTable table = new PdfPTable(4);
        table.setWidthPercentage(100);
        table.setSpacingAfter(12);

        List<SelecaoFoto> ordenadas = selecoes.stream()
                .sorted(Comparator.comparing(
                        s -> s.getFoto() != null ? s.getFoto().getOrdem() : null,
                        Comparator.nullsLast(Integer::compareTo)
                ))
                .toList();

        for (int index = 0; index < ordenadas.size(); index++) {
            SelecaoFoto selecao = ordenadas.get(index);
            addFotoCard(table, selecao, index + 1, texto, destaque);
        }

        if (ordenadas.isEmpty()) {
            addCell(table, "Nenhuma foto selecionada.", texto, 4);
            return table;
        }

        int resto = ordenadas.size() % 4;

        if (resto > 0) {
            for (int index = resto; index < 4; index++) {
                addEmptyCard(table);
            }
        }

        return table;
    }

    private void addHeader(PdfPTable table, String value, Font font) {
        PdfPCell cell = new PdfPCell(new Phrase(value, font));
        cell.setBorder(Rectangle.BOTTOM);
        cell.setPadding(7);
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
        cell.setPadding(7);
        table.addCell(cell);
    }

    private void addFotoCard(PdfPTable table, SelecaoFoto selecao, int numero, Font texto, Font destaque) {
        Foto foto = selecao.getFoto();
        PdfPCell cell = new PdfPCell();
        cell.setBorder(Rectangle.BOX);
        cell.setBorderColor(new Color(230, 230, 230));
        cell.setPadding(6);
        cell.setMinimumHeight(138);
        cell.setHorizontalAlignment(Element.ALIGN_CENTER);
        cell.setVerticalAlignment(Element.ALIGN_TOP);

        try {
            String url = foto != null && foto.getUrlWatermark() != null && !foto.getUrlWatermark().isBlank()
                    ? foto.getUrlWatermark()
                    : foto != null ? foto.getUrlOriginal() : null;

            if (url == null || url.isBlank()) {
                cell.addElement(new Paragraph("Imagem indisponivel", texto));
            } else {
                Image imagem = Image.getInstance(URI.create(gerarUrlMiniaturaCloudinary(url)).toURL());
                imagem.scaleToFit(112, 74);
                imagem.setAlignment(Element.ALIGN_CENTER);
                cell.addElement(imagem);
            }
        } catch (Exception e) {
            cell.addElement(new Paragraph("Imagem indisponivel", new Font(Font.HELVETICA, 7, Font.NORMAL, new Color(100, 100, 100))));
        }

        Paragraph arquivo = new Paragraph(
                numero + ". " + truncar(foto != null ? valorOuTraco(foto.getNomeOriginal()) : "-", 30),
                destaque
        );
        arquivo.setSpacingBefore(4);
        cell.addElement(arquivo);

        String observacao = selecao.getObservacao();

        if (observacao != null && !observacao.isBlank()) {
            Paragraph obs = new Paragraph("Obs: " + truncar(observacao.trim(), 55), texto);
            obs.setSpacingBefore(2);
            cell.addElement(obs);
        }

        table.addCell(cell);
    }

    private void addEmptyCard(PdfPTable table) {
        PdfPCell cell = new PdfPCell(new Phrase(""));
        cell.setBorder(Rectangle.NO_BORDER);
        cell.setPadding(6);
        table.addCell(cell);
    }

    private String gerarUrlMiniaturaCloudinary(String url) {
        if (url == null || url.isBlank() || !url.contains("/upload/")) {
            return url;
        }

        return url.replace(
                "/upload/",
                "/upload/c_fill,w_260,h_170,q_auto,f_jpg/"
        );
    }

    private String truncar(String valor, int limite) {
        if (valor == null) {
            return "-";
        }

        String texto = valor.trim();

        if (texto.length() <= limite) {
            return texto;
        }

        return texto.substring(0, Math.max(0, limite - 3)) + "...";
    }

    private String moeda(BigDecimal valor) {
        BigDecimal seguro = valor == null ? BigDecimal.ZERO : valor;
        return NumberFormat.getCurrencyInstance(Locale.forLanguageTag("pt-BR")).format(seguro);
    }

    private String valorOuTraco(String valor) {
        return valor == null || valor.isBlank() ? "-" : valor.trim();
    }

    private String resolverTipoExibicao(Ensaio ensaio) {
        if (ensaio == null || ensaio.getTipo() == null) {
            return "-";
        }

        if (ensaio.getTipo().name().equals("OUTRO")
                && ensaio.getTipoPersonalizado() != null
                && !ensaio.getTipoPersonalizado().isBlank()) {
            return ensaio.getTipoPersonalizado().trim();
        }

        return ensaio.getTipo().getDescricao();
    }
}
