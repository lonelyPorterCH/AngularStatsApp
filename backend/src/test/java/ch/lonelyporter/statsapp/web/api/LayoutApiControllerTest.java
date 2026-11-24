package ch.lonelyporter.statsapp.web.api;

import ch.lonelyporter.statsapp.service.LayoutService;
import ch.lonelyporter.statsapp.service.StatisticService;
import ch.lonelyporter.statsapp.web.model.DashboardLayout;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.List;

import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class LayoutApiControllerTest {
    @Test
    void layoutRouteTakesPrecedenceOverStatisticIdAndSavesTheLayout() throws Exception {
        LayoutService layoutService = mock(LayoutService.class);
        StatisticService statistics = mock(StatisticService.class);
        DashboardLayout layout = new DashboardLayout(List.of(), List.of());
        when(layoutService.load()).thenReturn(layout);
        MockMvc mvc = MockMvcBuilders.standaloneSetup(
                new LayoutApiController(layoutService), new StatsApiController(statistics)).build();

        mvc.perform(get("/api/stats/layout")).andExpect(status().isOk())
                .andExpect(jsonPath("$.charts").isArray())
                .andExpect(jsonPath("$.groups").isEmpty());
        mvc.perform(put("/api/stats/layout").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"charts\":[],\"groups\":[]}"))
                .andExpect(status().isOk());
        verify(layoutService).save(layout);
        verifyNoInteractions(statistics);
    }
}
