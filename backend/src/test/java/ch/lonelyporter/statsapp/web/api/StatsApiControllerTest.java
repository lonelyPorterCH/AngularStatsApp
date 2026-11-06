package ch.lonelyporter.statsapp.web.api;

import ch.lonelyporter.statsapp.exception.InvalidDataPointException;
import ch.lonelyporter.statsapp.service.StatisticService;
import ch.lonelyporter.statsapp.web.handler.GlobalExceptionHandler;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class StatsApiControllerTest {
    private StatisticService service;
    private MockMvc mvc;

    @BeforeEach
    void setUp() {
        service = mock(StatisticService.class);
        mvc = MockMvcBuilders.standaloneSetup(new StatsApiController(service))
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    void includeZeroEndpointAcceptsBothBooleanSettings() throws Exception {
        for (boolean includeZero : new boolean[]{true, false}) {
            mvc.perform(patch("/api/stats/cumulus/include-zero")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"includeZero\":" + includeZero + "}"))
                    .andExpect(status().isOk());
            verify(service).setIncludeZero("cumulus", includeZero);
        }
    }

    @Test
    void includeZeroEndpointRejectsMissingNullAndInvalidSettings() throws Exception {
        for (String body : new String[]{"{}", "{\"includeZero\":null}", "{\"includeZero\":{}}"}) {
            mvc.perform(patch("/api/stats/cumulus/include-zero")
                            .contentType(MediaType.APPLICATION_JSON).content(body))
                    .andExpect(status().isBadRequest());
        }
        verifyNoInteractions(service);
    }

    @Test
    void stackedEndpointAcceptsBothBooleanSettings() throws Exception {
        for (boolean stacked : new boolean[]{true, false}) {
            mvc.perform(patch("/api/stats/cumulus/stacked")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"stacked\":" + stacked + "}"))
                    .andExpect(status().isOk());
            verify(service).setStacked("cumulus", stacked);
        }
    }

    @Test
    void stackedEndpointRejectsMissingOrNullSettings() throws Exception {
        for (String body : new String[]{"{}", "{\"stacked\":null}"}) {
            mvc.perform(patch("/api/stats/cumulus/stacked")
                            .contentType(MediaType.APPLICATION_JSON).content(body))
                    .andExpect(status().isBadRequest());
        }
        verifyNoInteractions(service);
    }

    @Test
    void stackedEndpointReportsDatasetValidationFailures() throws Exception {
        doThrow(new InvalidDataPointException("Stacked line charts require at least two datasets"))
                .when(service).setStacked("cumulus", true);
        mvc.perform(patch("/api/stats/cumulus/stacked")
                        .contentType(MediaType.APPLICATION_JSON).content("{\"stacked\":true}"))
                .andExpect(status().isBadRequest());
    }

            @Test
            void chartTypeEndpointAcceptsLineAndBar() throws Exception {
            for (String chartType : new String[]{"line", "bar"}) {
                mvc.perform(patch("/api/stats/chart/chart-type")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"chartType\":\"" + chartType + "\"}"))
                    .andExpect(status().isOk());
                verify(service).setChartType("chart", chartType);
            }
            }

            @Test
            void chartTypeEndpointReportsValidationAndReadOnlyFailures() throws Exception {
            doThrow(new InvalidDataPointException("Chart type must be line or bar"))
                .when(service).setChartType(eq("chart"), nullable(String.class));
            for (String body : new String[]{"{}", "{\"chartType\":null}", "{\"chartType\":\"pie\"}", "{\"chartType\":{}}"}) {
                mvc.perform(patch("/api/stats/chart/chart-type")
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                    .andExpect(status().isBadRequest());
            }
            doThrow(new ch.lonelyporter.statsapp.exception.StatisticConflictException("Archived"))
                .when(service).setChartType("archived", "bar");
            mvc.perform(patch("/api/stats/archived/chart-type")
                    .contentType(MediaType.APPLICATION_JSON).content("{\"chartType\":\"bar\"}"))
                .andExpect(status().isConflict());
            doThrow(new ch.lonelyporter.statsapp.exception.StatisticNotFoundException("missing"))
                .when(service).setChartType("missing", "bar");
            mvc.perform(patch("/api/stats/missing/chart-type")
                    .contentType(MediaType.APPLICATION_JSON).content("{\"chartType\":\"bar\"}"))
                .andExpect(status().isNotFound());
            }
}
