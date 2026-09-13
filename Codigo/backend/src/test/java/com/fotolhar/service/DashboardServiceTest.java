package com.fotolhar.service;

import com.fotolhar.dto.DashboardResumoResponse;
import com.fotolhar.dto.DashboardReceitaHistoricoResponse;
import com.fotolhar.dto.RelatorioTipoEnsaioResponse;
import com.fotolhar.enums.StatusEnsaio;
import com.fotolhar.enums.TipoEnsaio;
import com.fotolhar.model.Album;
import com.fotolhar.model.Cliente;
import com.fotolhar.model.Ensaio;
import com.fotolhar.model.Usuario;
import com.fotolhar.repository.AlbumRepository;
import com.fotolhar.repository.ClienteRepository;
import com.fotolhar.repository.EnsaioRepository;
import com.fotolhar.repository.FotoRepository;
import com.fotolhar.repository.HistoricoStatusEnsaioRepository;
import com.fotolhar.repository.PreferenciasSistemaRepository;
import com.fotolhar.repository.SelecaoFotoRepository;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.time.YearMonth;
import java.time.ZoneId;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class DashboardServiceTest {

    private static final ZoneId APP_ZONE = ZoneId.of("America/Sao_Paulo");

    private final EnsaioRepository ensaioRepository = mock(EnsaioRepository.class);
    private final ClienteRepository clienteRepository = mock(ClienteRepository.class);
    private final FotoRepository fotoRepository = mock(FotoRepository.class);
    private final AlbumRepository albumRepository = mock(AlbumRepository.class);
    private final HistoricoStatusEnsaioRepository historicoStatusEnsaioRepository =
            mock(HistoricoStatusEnsaioRepository.class);
    private final SelecaoFotoRepository selecaoFotoRepository = mock(SelecaoFotoRepository.class);
    private final PreferenciasSistemaRepository preferenciasSistemaRepository =
            mock(PreferenciasSistemaRepository.class);
    private final UsuarioContextService usuarioContextService = mock(UsuarioContextService.class);

    private final DashboardService service = new DashboardService(
            ensaioRepository,
            clienteRepository,
            fotoRepository,
            albumRepository,
            historicoStatusEnsaioRepository,
            selecaoFotoRepository,
            preferenciasSistemaRepository,
            usuarioContextService
    );

    @Test
    void receitaPorTipoConsideraSomenteValoresPagosNoPeriodoSemExigirFinalizado() {
        UUID usuarioId = UUID.randomUUID();
        Usuario usuario = Usuario.builder()
                .id(usuarioId)
                .build();
        OffsetDateTime dataEsteMes = YearMonth.now(APP_ZONE)
                .atDay(10)
                .atTime(10, 0)
                .atZone(APP_ZONE)
                .toOffsetDateTime();
        OffsetDateTime dataMesPassado = dataEsteMes.minusMonths(1);

        when(usuarioContextService.getUsuarioLogado()).thenReturn(usuario);
        when(ensaioRepository.findByClienteUsuarioId(usuarioId)).thenReturn(List.of(
                ensaio(TipoEnsaio.GESTANTE, StatusEnsaio.EM_EDICAO, " PAGO ", dataEsteMes, "700.00"),
                ensaio(TipoEnsaio.FAMILIA, StatusEnsaio.FINALIZADO, "PENDENTE", dataEsteMes, "1000.00"),
                ensaio(TipoEnsaio.NEWBORN, StatusEnsaio.FINALIZADO, "PAGO", dataEsteMes, "900.00"),
                ensaio(TipoEnsaio.BOOK, StatusEnsaio.EM_EDICAO, "PAGO", dataMesPassado, "500.00")
        ));
        when(albumRepository.findByEnsaioClienteUsuarioId(usuarioId)).thenReturn(List.of());

        List<RelatorioTipoEnsaioResponse> resultado = service.buscarReceitaPorTipoEnsaio("ESTE_MES");

        assertThat(resultado)
                .extracting(RelatorioTipoEnsaioResponse::getTipo)
                .containsExactly(TipoEnsaio.NEWBORN, TipoEnsaio.GESTANTE);
        assertThat(resultado.get(0).getFaturamento()).isEqualByComparingTo("900.00");
        assertThat(resultado.get(0).getPercentualReceita()).isEqualByComparingTo("56.3");
        assertThat(resultado.get(1).getFaturamento()).isEqualByComparingTo("700.00");
        assertThat(resultado.get(1).getPercentualReceita()).isEqualByComparingTo("43.8");
    }

    @Test
    void dashboardMostraSomenteEnsaiosAgendadosComoProximos() {
        UUID usuarioId = UUID.randomUUID();
        Usuario usuario = Usuario.builder()
                .id(usuarioId)
                .build();
        OffsetDateTime agora = OffsetDateTime.now(APP_ZONE);
        Ensaio realizadoFuturo = ensaio(TipoEnsaio.FAMILIA, StatusEnsaio.REALIZADO, "PENDENTE", agora.plusDays(15), "800.00");
        Ensaio selecaoFutura = ensaio(TipoEnsaio.GESTANTE, StatusEnsaio.EM_SELECAO, "PENDENTE", agora.plusMonths(2), "900.00");
        Ensaio agendadoFuturo = ensaio(TipoEnsaio.NEWBORN, StatusEnsaio.AGENDADO, "PENDENTE", agora.plusMonths(4), "1000.00");
        Ensaio finalizadoFuturo = ensaio(TipoEnsaio.BOOK, StatusEnsaio.FINALIZADO, "PAGO", agora.plusDays(1), "700.00");
        Ensaio canceladoFuturo = ensaio(TipoEnsaio.EVENTO, StatusEnsaio.CANCELADO, "PENDENTE", agora.plusDays(2), "700.00");

        when(usuarioContextService.getUsuarioLogado()).thenReturn(usuario);
        when(ensaioRepository.findByClienteUsuarioId(usuarioId)).thenReturn(List.of(
                selecaoFutura,
                canceladoFuturo,
                agendadoFuturo,
                realizadoFuturo,
                finalizadoFuturo
        ));
        when(albumRepository.findByEnsaioClienteUsuarioId(usuarioId)).thenReturn(List.of());
        when(clienteRepository.findByUsuarioIdOrderByNomeAsc(usuarioId)).thenReturn(List.of());

        DashboardResumoResponse resultado = service.buscarResumo();

        assertThat(resultado.getProximosEnsaios())
                .extracting(item -> item.getStatus())
                .containsExactly(StatusEnsaio.AGENDADO);
    }

    @Test
    void dashboardIncluiHistoricoDeReceitaPrevistaComMesAtualEAnterior() {
        UUID usuarioId = UUID.randomUUID();
        Usuario usuario = Usuario.builder()
                .id(usuarioId)
                .build();
        OffsetDateTime dataEsteMes = YearMonth.now(APP_ZONE)
                .atDay(10)
                .atTime(10, 0)
                .atZone(APP_ZONE)
                .toOffsetDateTime();
        OffsetDateTime dataMesPassado = dataEsteMes.minusMonths(1);

        when(usuarioContextService.getUsuarioLogado()).thenReturn(usuario);
        when(ensaioRepository.findByClienteUsuarioId(usuarioId)).thenReturn(List.of(
                ensaio(TipoEnsaio.GESTANTE, StatusEnsaio.AGENDADO, "PENDENTE", dataEsteMes, "800.00"),
                ensaio(TipoEnsaio.FAMILIA, StatusEnsaio.FINALIZADO, "PAGO", dataMesPassado, "500.00"),
                ensaio(TipoEnsaio.BOOK, StatusEnsaio.CANCELADO, "PENDENTE", dataEsteMes, "900.00")
        ));
        when(albumRepository.findByEnsaioClienteUsuarioId(usuarioId)).thenReturn(List.of());
        when(clienteRepository.findByUsuarioIdOrderByNomeAsc(usuarioId)).thenReturn(List.of());

        DashboardResumoResponse resultado = service.buscarResumo();

        assertThat(resultado.getReceitaPrevistaHistorico()).hasSize(6);
        assertThat(resultado.getReceitaPrevistaHistorico())
                .extracting(DashboardReceitaHistoricoResponse::getValor)
                .endsWith(new BigDecimal("500.00"), new BigDecimal("800.00"));
        assertThat(resultado.getReceitaEstimada()).isEqualByComparingTo("800.00");
    }

    @Test
    void dashboardCarregaDadosRelacionadosEmLote() {
        UUID usuarioId = UUID.randomUUID();
        Ensaio ensaio = ensaio(
                TipoEnsaio.FAMILIA,
                StatusEnsaio.AGENDADO,
                "PENDENTE",
                OffsetDateTime.now(APP_ZONE).plusDays(1),
                "800.00"
        );
        Album album = Album.builder()
                .id(UUID.randomUUID())
                .ensaio(ensaio)
                .build();

        when(usuarioContextService.getUsuarioLogado()).thenReturn(Usuario.builder().id(usuarioId).build());
        when(ensaioRepository.findByClienteUsuarioId(usuarioId)).thenReturn(List.of(ensaio));
        when(albumRepository.findByEnsaioClienteUsuarioId(usuarioId)).thenReturn(List.of(album));

        service.buscarResumo();

        verify(fotoRepository).findByEnsaioIdInOrderByOrdemAscEnviadaEmAsc(List.of(ensaio.getId()));
        verify(selecaoFotoRepository).findByAlbumIdIn(List.of(album.getId()));
        verify(historicoStatusEnsaioRepository).findByEnsaioIdInOrderByAlteradoEmAsc(List.of(ensaio.getId()));
        verify(fotoRepository, never()).countByEnsaioId(any());
        verify(fotoRepository, never()).findByEnsaioIdOrderByOrdemAscEnviadaEmAsc(any());
        verify(selecaoFotoRepository, never()).findByAlbumId(any());
        verify(selecaoFotoRepository, never()).existsByAlbumId(any());
        verify(historicoStatusEnsaioRepository, never()).findByEnsaioIdOrderByAlteradoEmAsc(any());
    }

    private Ensaio ensaio(
            TipoEnsaio tipo,
            StatusEnsaio status,
            String statusValores,
            OffsetDateTime dataEnsaio,
            String valorPacote
    ) {
        return Ensaio.builder()
                .id(UUID.randomUUID())
                .cliente(Cliente.builder().id(UUID.randomUUID()).nome("Cliente Teste").build())
                .tipo(tipo)
                .status(status)
                .statusValores(statusValores)
                .dataEnsaio(dataEnsaio)
                .valorPacote(new BigDecimal(valorPacote))
                .qtdFotosPacote(20)
                .cobrarFotoExtra(false)
                .build();
    }
}
