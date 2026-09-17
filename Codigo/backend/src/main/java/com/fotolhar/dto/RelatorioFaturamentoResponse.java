package com.fotolhar.dto;

import com.fotolhar.enums.TipoPeriodoRelatorio;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RelatorioFaturamentoResponse {

    private TipoPeriodoRelatorio tipo;
    private Integer ano;
    private String periodoDescricao;
    private String unidadePeriodo;

    private BigDecimal faturamentoTotal;
    private BigDecimal mediaPorPeriodo;
    private BigDecimal ticketMedioEnsaio;
    private Integer ensaiosRealizados;
    private Integer clientesNovos;
    private Integer fotosExtrasVendidas;

    private BigDecimal faturamentoBruto;
    private BigDecimal excedentesCobrados;
    private BigDecimal ajustesManuais;
    private BigDecimal totalLiquido;
    private BigDecimal valorRecebido;
    private BigDecimal valorPendente;

    private RelatorioDestaqueResponse destaques;
    private RelatorioComparativoResponse comparativo;

    private List<RelatorioPeriodoResponse> periodos;
    private List<RelatorioTipoEnsaioResponse> tiposEnsaio;
    private List<RelatorioEnsaioMaisRealizadoResponse> ensaiosMaisRealizados;
    private List<RelatorioTrabalhoMaiorValorResponse> trabalhosMaiorValor;
}
