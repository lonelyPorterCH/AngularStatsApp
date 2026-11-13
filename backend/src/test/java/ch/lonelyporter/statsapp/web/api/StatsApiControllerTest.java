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
    void smoothingWindowEndpointValidatesWholePositiveMeasurements() throws Exception {
        String path = "/api/stats/chart/dataset/Series/smoothing-window";
        mvc.perform(patch(path).contentType(MediaType.APPLICATION_JSON).content("{\"smoothingWindow\":3}"))
                .andExpect(status().isOk());
        verify(service).setDatasetSmoothingWindow("chart", "Series", 3);
        clearInvocations(service);
        for (String body : new String[]{"{}", "{\"smoothingWindow\":null}", "{\"smoothingWindow\":0}",
                "{\"smoothingWindow\":-1}", "{\"smoothingWindow\":1.5}", "{\"smoothingWindow\":2147483648}",
                "{\"smoothingWindow\":{}}"}) {
            mvc.perform(patch(path).contentType(MediaType.APPLICATION_JSON).content(body))
                    .andExpect(status().isBadRequest());
        }
        verifyNoInteractions(service);
    }

    @Test
    void yAxisBoundsEndpointAcceptsOptionalBoundsAndClearingBoth() throws Exception {
        mvc.perform(patch("/api/stats/chart/y-axis-bounds")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"yAxisMin\":-10.5,\"yAxisMax\":0}"))
                .andExpect(status().isOk());
        verify(service).setYAxisBounds("chart", -10.5, 0.0);
        mvc.perform(patch("/api/stats/chart/y-axis-bounds")
                        .contentType(MediaType.APPLICATION_JSON).content("{\"yAxisMax\":100}"))
                .andExpect(status().isOk());
        verify(service).setYAxisBounds("chart", null, 100.0);
        mvc.perform(patch("/api/stats/chart/y-axis-bounds")
                        .contentType(MediaType.APPLICATION_JSON).content("{\"yAxisMin\":0}"))
                .andExpect(status().isOk());
        verify(service).setYAxisBounds("chart", 0.0, null);
        mvc.perform(patch("/api/stats/chart/y-axis-bounds")
                        .contentType(MediaType.APPLICATION_JSON).content("{\"yAxisMin\":null,\"yAxisMax\":null}"))
                .andExpect(status().isOk());
        verify(service).setYAxisBounds("chart", null, null);
    }

    @Test
    void yAxisBoundsEndpointRejectsInvalidTypesAndReportsRangeValidation() throws Exception {
        for (String body : new String[]{"{\"yAxisMin\":{}}", "{\"yAxisMax\":\"invalid\"}"}) {
            mvc.perform(patch("/api/stats/chart/y-axis-bounds")
                            .contentType(MediaType.APPLICATION_JSON).content(body))
                    .andExpect(status().isBadRequest());
        }
        verifyNoInteractions(service);
        doThrow(new InvalidDataPointException("Y-axis minimum must be less than maximum"))
                .when(service).setYAxisBounds("chart", 10.0, 5.0);
        mvc.perform(patch("/api/stats/chart/y-axis-bounds")
                        .contentType(MediaType.APPLICATION_JSON).content("{\"yAxisMin\":10,\"yAxisMax\":5}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void effortComparisonEndpointAcceptsBothSettingsAndRejectsMissingNullAndInvalidValues() throws Exception {
        for (boolean enabled : new boolean[]{true, false}) {
            mvc.perform(patch("/api/stats/runs/effort-comparison")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"effortComparison\":" + enabled + "}"))
                    .andExpect(status().isOk());
            verify(service).setEffortComparison("runs", enabled);
        }
        clearInvocations(service);
        for (String body : new String[]{"{}", "{\"effortComparison\":null}", "{\"effortComparison\":{}}"}) {
            mvc.perform(patch("/api/stats/runs/effort-comparison")
                            .contentType(MediaType.APPLICATION_JSON).content(body))
                    .andExpect(status().isBadRequest());
        }
        verifyNoInteractions(service);
    }

    @Test
    void yAxisFormatEndpointAcceptsBothFormatsAndReportsValidationFailures() throws Exception {
        for (String format : new String[]{"number", "pace"}) {
            mvc.perform(patch("/api/stats/runs/y-axis-format")
                            .contentType(MediaType.APPLICATION_JSON).content("{\"yAxisFormat\":\"" + format + "\"}"))
                    .andExpect(status().isOk());
            verify(service).setYAxisFormat("runs", format);
        }
        doThrow(new InvalidDataPointException("Y axis format must be number or pace"))
                .when(service).setYAxisFormat(eq("runs"), nullable(String.class));
        for (String body : new String[]{"{}", "{\"yAxisFormat\":null}", "{\"yAxisFormat\":\"invalid\"}"}) {
            mvc.perform(patch("/api/stats/runs/y-axis-format")
                            .contentType(MediaType.APPLICATION_JSON).content(body))
                    .andExpect(status().isBadRequest());
        }
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
