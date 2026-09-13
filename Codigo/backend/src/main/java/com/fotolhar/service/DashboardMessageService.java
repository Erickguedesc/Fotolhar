package com.fotolhar.service;

import com.fotolhar.dto.DashboardEnsaioResumoResponse;
import com.fotolhar.dto.DashboardInsightsResponse;
import com.fotolhar.dto.DashboardInsightsClienteDestaqueResponse;
import com.fotolhar.dto.DashboardInsightsFrequenciaClienteResponse;
import com.fotolhar.dto.DashboardInsightsQuantidadeResponse;
import com.fotolhar.dto.DashboardMensagemResponse;
import com.fotolhar.dto.DashboardMensagensResponse;
import com.fotolhar.dto.DashboardResumoResponse;
import com.fotolhar.enums.StatusEnsaio;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.text.DecimalFormat;
import java.text.DecimalFormatSymbols;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;

/** Converte métricas e eventos existentes em mensagens elegíveis para o Dashboard. */
@Service
@RequiredArgsConstructor
public class DashboardMessageService {

    private static final ZoneId APP_ZONE = ZoneId.of("America/Sao_Paulo");
    private static final int MINIMO_CLIENTES_TAXA_RETORNO = 5;
    private static final int MINIMO_ENSAIOS_AGENDA = 5;
    private static final int MINIMO_OCORRENCIAS_HORARIO = 2;
    private static final int MINIMO_MESES_COM_DADOS = 3;
    private static final int MINIMO_AMOSTRAS_MEDIA = 2;
    private static final int LIMITE_ATUALIZACOES = 3;
    private static final int MINUTOS_ATUALIZACAO_FINALIZADA = 10;

    private final DashboardInsightService dashboardInsightService;
    private final DashboardService dashboardService;

    @Transactional(readOnly = true)
    public DashboardMensagensResponse buscarMensagens(LocalDate inicio, LocalDate fim) {
        DashboardInsightsResponse insights = dashboardInsightService.buscarInsights(inicio, fim);
        DashboardResumoResponse resumo = dashboardService.buscarResumo();
        List<DashboardMensagemResponse> mensagens = new ArrayList<>();

        adicionarAtualizacoes(mensagens, resumo);
        adicionarOportunidades(mensagens, insights);
        adicionarInsights(mensagens, insights);

        mensagens.sort(Comparator.comparing(DashboardMensagemResponse::getPrioridade).reversed()
                .thenComparing(DashboardMensagemResponse::getChave));
        return DashboardMensagensResponse.builder().mensagens(mensagens).build();
    }

    private void adicionarAtualizacoes(List<DashboardMensagemResponse> mensagens, DashboardResumoResponse resumo) {
        OffsetDateTime agora = OffsetDateTime.now(APP_ZONE);
        resumo.getUltimasAtualizacoes().stream()
                .filter(ensaio -> atualizacaoAindaRelevante(ensaio, agora))
                .filter(ensaio -> mensagens.stream().noneMatch(mensagem -> java.util.Objects.equals(
                        ensaio.getId(), mensagem.getEntidadeId())))
                .limit(LIMITE_ATUALIZACOES)
                .forEach(ensaio -> mensagens.add(mensagem("ATUALIZACAO", "ATUALIZACAO_STATUS_" + ensaio.getId(),
                        "Atualização recente",
                        "O ensaio de " + ensaio.getClienteNome() + " está em " + descricaoStatus(ensaio.getStatus()) + ".",
                        100, "ENSAIO", ensaio.getId(), ensaio.getAtualizadoEm())));
    }

    private boolean atualizacaoAindaRelevante(DashboardEnsaioResumoResponse ensaio, OffsetDateTime agora) {
        if (ensaio.getAtualizadoEm() == null) {
            return false;
        }

        OffsetDateTime limite = ensaio.getStatus() == StatusEnsaio.FINALIZADO
                ? agora.minusMinutes(MINUTOS_ATUALIZACAO_FINALIZADA)
                : agora.minusDays(7);

        return !ensaio.getAtualizadoEm().isBefore(limite);
    }

    private void adicionarOportunidades(List<DashboardMensagemResponse> mensagens, DashboardInsightsResponse insights) {
        var clientes = insights.getClientes();
        if (clientes.getInativos() > 0) {
            mensagens.add(mensagem("OPORTUNIDADE", "CLIENTES_INATIVOS", "Clientes para reaproximar",
                    clientes.getInativos() + " " + pluralizar(clientes.getInativos(), "cliente não contrata", "clientes não contratam")
                            + " um novo ensaio há mais de 12 meses.",
                    65, null, null, null));
        }
        if (clientes.getRecorrentes() > 0) {
            mensagens.add(mensagem("OPORTUNIDADE", "CLIENTES_RECORRENTES", "Relacionamentos recorrentes",
                    clientes.getRecorrentes() + " " + pluralizar(clientes.getRecorrentes(), "cliente já voltou", "clientes já voltaram")
                            + " para realizar novos ensaios com você.",
                    60, null, null, null));
        }

        clienteMuitoFrequente(clientes.getFrequenciaContratacao()).ifPresent(cliente -> mensagens.add(mensagem(
                "OPORTUNIDADE", "CLIENTE_MUITO_FREQUENTE", "Cliente fiel",
                cliente.getClienteNome() + " já realizou " + cliente.getQuantidadeEnsaios() + " ensaios com você.",
                62, "CLIENTE", cliente.getClienteId(), null)));
    }

    private void adicionarInsights(List<DashboardMensagemResponse> mensagens, DashboardInsightsResponse insights) {
        var clientes = insights.getClientes();
        var agenda = insights.getAgenda();
        var financeiro = insights.getFinanceiro();
        var producao = insights.getProducao();

        if (clientes.getTotalComContratacao() >= MINIMO_CLIENTES_TAXA_RETORNO) {
            mensagens.add(mensagem("INSIGHT", "TAXA_RETORNO", "Seus clientes estão voltando",
                    percentual(clientes.getTaxaRetorno()) + " dos seus clientes já contrataram mais de um ensaio.",
                    45, null, null, null));
        }

        DashboardInsightsClienteDestaqueResponse clienteDestaque = clientes.getClienteQueMaisContratou();
        boolean existeClienteMuitoFrequente = clienteMuitoFrequente(clientes.getFrequenciaContratacao()).isPresent();
        if (clienteDestaque != null && clienteDestaque.getQuantidadeEnsaios() >= 2 && !existeClienteMuitoFrequente) {
            mensagens.add(mensagem("INSIGHT", "CLIENTE_MAIS_FREQUENTE", "Cliente em destaque",
                    clienteDestaque.getNome() + " já realizou " + clienteDestaque.getQuantidadeEnsaios() + " ensaios com você.",
                    40, "CLIENTE", clienteDestaque.getId(), null));
        }

        if (clientes.getIntervaloMedioRetornoMeses() != null && clientes.getClientesComIntervaloRetorno() >= 2) {
            mensagens.add(mensagem("INSIGHT", "INTERVALO_MEDIO_RETORNO", "Quando seus clientes voltam",
                    "Seus clientes recorrentes costumam retornar após aproximadamente "
                            + numero(clientes.getIntervaloMedioRetornoMeses()) + " meses.",
                    38, null, null, null));
        }

        if (agenda.getQuantidadeEnsaiosConsiderados() >= MINIMO_ENSAIOS_AGENDA) {
            adicionarInsightAgenda(mensagens, "DIA_MAIS_PROCURADO", "Dia mais procurado", agenda.getDiaMaisProcurado(),
                    " concentra ", " dos seus ensaios.", 37);
            adicionarInsightAgenda(mensagens, "FAIXA_MAIS_PROCURADA", "Período preferido", agenda.getFaixaMaisProcurada(),
                    " concentra ", " dos seus ensaios.", 36);
        }

        if (agenda.getQuantidadeEnsaiosConsiderados() >= MINIMO_ENSAIOS_AGENDA
                && agenda.getHorarioMaisProcurado() != null
                && agenda.getHorarioMaisProcurado().getQuantidade() >= MINIMO_OCORRENCIAS_HORARIO) {
            mensagens.add(mensagem("INSIGHT", "HORARIO_MAIS_PROCURADO", "Horário em destaque",
                    agenda.getHorarioMaisProcurado().getHora() + "h é o horário com mais ensaios.",
                    35, null, null, null));
        }

        if (agenda.getQuantidadeMesesComDados() >= MINIMO_MESES_COM_DADOS && agenda.getMesMaisMovimentado() != null) {
            String mes = java.time.Month.of(agenda.getMesMaisMovimentado().getMes())
                    .getDisplayName(java.time.format.TextStyle.FULL, new Locale("pt", "BR"));
            mensagens.add(mensagem("INSIGHT", "MES_MAIS_MOVIMENTADO", "Mês em destaque",
                    capitalizar(mes) + " foi seu mês com mais ensaios, com "
                            + agenda.getMesMaisMovimentado().getQuantidadeEnsaios() + " trabalhos.",
                    34, null, null, null));
        }

        if (financeiro.getTicketMedio() != null && financeiro.getTicketMedio().compareTo(BigDecimal.ZERO) > 0) {
            mensagens.add(mensagem("INSIGHT", "TICKET_MEDIO", "Seu ticket médio",
                    "O valor médio previsto por ensaio foi de " + moeda(financeiro.getTicketMedio()) + ".",
                    33, null, null, null));
        }

        if (producao.getTempoMedioEdicaoDias() != null && producao.getAmostrasTempoEdicao() >= MINIMO_AMOSTRAS_MEDIA) {
            mensagens.add(mensagem("INSIGHT", "TEMPO_MEDIO_EDICAO", "Ritmo de edição",
                    "Seus trabalhos permanecem em edição por uma média de "
                            + numero(producao.getTempoMedioEdicaoDias()) + " dias.",
                    32, null, null, null));
        }
        if (producao.getTempoMedioFluxoDias() != null && producao.getAmostrasTempoFluxo() >= MINIMO_AMOSTRAS_MEDIA) {
            mensagens.add(mensagem("INSIGHT", "TEMPO_MEDIO_FLUXO", "Tempo de produção",
                    "Da realização até a finalização, seus trabalhos levam em média "
                            + numero(producao.getTempoMedioFluxoDias()) + " dias.",
                    31, null, null, null));
        }
        if (producao.getTipoMaisContratado() != null) {
            mensagens.add(mensagem("INSIGHT", "TIPO_MAIS_REALIZADO", "Tipo mais realizado",
                    producao.getTipoMaisContratado().getDescricao() + " foi o tipo de ensaio mais realizado no período.",
                    30, null, null, null));
        }
        if (financeiro.getFotosExtrasVendidas() > 0) {
            mensagens.add(mensagem("INSIGHT", "FOTOS_EXTRAS", "Fotos extras",
                    financeiro.getFotosExtrasVendidas() + " fotos extras foram selecionadas no período.",
                    29, null, null, null));
        }
        if (financeiro.getReceitaFotosExtras() != null
                && financeiro.getReceitaFotosExtras().compareTo(BigDecimal.ZERO) > 0) {
            mensagens.add(mensagem("INSIGHT", "RECEITA_FOTOS_EXTRAS", "Extras no período",
                    moeda(financeiro.getReceitaFotosExtras()) + " estão previstos em fotos extras.",
                    28, null, null, null));
        }
    }

    private void adicionarInsightAgenda(
            List<DashboardMensagemResponse> mensagens,
            String chave,
            String titulo,
            DashboardInsightsQuantidadeResponse dado,
            String antesPercentual,
            String depoisPercentual,
            int prioridade) {
        if (dado == null) {
            return;
        }
        mensagens.add(mensagem("INSIGHT", chave, titulo,
                capitalizar(dado.getDescricao()) + antesPercentual + percentual(dado.getPercentual()) + depoisPercentual,
                prioridade, null, null, null));
    }

    private java.util.Optional<DashboardInsightsFrequenciaClienteResponse> clienteMuitoFrequente(
            List<DashboardInsightsFrequenciaClienteResponse> frequencias) {
        return frequencias.stream()
                .filter(cliente -> "MUITO_FREQUENTE".equals(cliente.getClassificacao()))
                .findFirst();
    }

    private DashboardMensagemResponse mensagem(
            String tipo, String chave, String titulo, String texto, int prioridade,
            String entidade, java.util.UUID entidadeId, OffsetDateTime criadoEm) {
        return DashboardMensagemResponse.builder()
                .tipo(tipo)
                .chave(chave)
                .titulo(titulo)
                .mensagem(texto)
                .prioridade(prioridade)
                .entidade(entidade)
                .entidadeId(entidadeId)
                .criadoEm(criadoEm)
                .build();
    }

    private String descricaoStatus(StatusEnsaio status) {
        if (status == null) {
            return "atualização pendente";
        }
        return switch (status) {
            case AGENDADO -> "agenda";
            case REALIZADO -> "realizado";
            case EM_SELECAO -> "seleção";
            case EM_EDICAO -> "edição";
            case FINALIZADO -> "finalizado";
            case CANCELADO -> "cancelado";
        };
    }

    private String percentual(BigDecimal valor) {
        return numero(valor) + "%";
    }

    private String numero(BigDecimal valor) {
        DecimalFormat formato = new DecimalFormat("0.##", DecimalFormatSymbols.getInstance(new Locale("pt", "BR")));
        return formato.format(valor.setScale(2, RoundingMode.HALF_UP));
    }

    private String moeda(BigDecimal valor) {
        return java.text.NumberFormat.getCurrencyInstance(new Locale("pt", "BR")).format(valor);
    }

    private String capitalizar(String texto) {
        if (texto == null || texto.isBlank()) {
            return texto;
        }
        return texto.substring(0, 1).toUpperCase(new Locale("pt", "BR")) + texto.substring(1);
    }

    private String pluralizar(int quantidade, String singular, String plural) {
        return quantidade == 1 ? singular : plural;
    }
}
