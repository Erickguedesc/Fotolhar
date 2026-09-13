package com.fotolhar.controller;

import com.fotolhar.dto.DashboardResumoResponse;
import com.fotolhar.dto.DashboardInsightsResponse;
import com.fotolhar.dto.DashboardMensagensResponse;
import com.fotolhar.dto.RelatorioTipoEnsaioResponse;
import com.fotolhar.service.DashboardInsightService;
import com.fotolhar.service.DashboardMessageService;
import com.fotolhar.service.DashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/dashboard")
@RequiredArgsConstructor
public class DashboardController {

    private final DashboardService dashboardService;
    private final DashboardInsightService dashboardInsightService;
    private final DashboardMessageService dashboardMessageService;

    @GetMapping("/resumo")
    public DashboardResumoResponse buscarResumo() {
        return dashboardService.buscarResumo();
    }

    @GetMapping("/receita-por-tipo")
    public List<RelatorioTipoEnsaioResponse> buscarReceitaPorTipo(
            @RequestParam(required = false, defaultValue = "ESTE_MES") String periodo
    ) {
        return dashboardService.buscarReceitaPorTipoEnsaio(periodo);
    }

    @GetMapping("/insights")
    public DashboardInsightsResponse buscarInsights(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate inicio,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fim
    ) {
        return dashboardInsightService.buscarInsights(inicio, fim);
    }

    @GetMapping("/mensagens")
    public DashboardMensagensResponse buscarMensagens(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate inicio,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fim
    ) {
        return dashboardMessageService.buscarMensagens(inicio, fim);
    }
}
