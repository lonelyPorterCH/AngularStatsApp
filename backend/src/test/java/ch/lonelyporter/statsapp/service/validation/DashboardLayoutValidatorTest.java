package ch.lonelyporter.statsapp.service.validation;

import ch.lonelyporter.statsapp.exception.InvalidDataPointException;
import ch.lonelyporter.statsapp.web.model.DashboardLayout;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThatThrownBy;

class DashboardLayoutValidatorTest {

    private final DashboardLayoutValidator validator = new DashboardLayoutValidator();

    @Test
    void acceptsValidNonOverlappingChartPlacements() {
        validator.validate(new DashboardLayout(List.of(
                chart("one", 0, 0, 6, 4),
                chart("two", 6, 0, 6, 4)
        ), List.of()));
    }

    @Test
    void rejectsOverlappingAndDuplicatePlacementsAcrossGroups() {
        DashboardLayout overlap = new DashboardLayout(List.of(
                chart("one", 0, 0, 6, 4),
                chart("two", 5, 0, 6, 4)
        ), List.of());
        assertThatThrownBy(() -> validator.validate(overlap))
                .isInstanceOf(InvalidDataPointException.class)
                .hasMessage("Chart placements must not overlap");

        DashboardLayout duplicate = new DashboardLayout(
                List.of(chart("same", 0, 0, 6, 4)),
                List.of(new DashboardLayout.Group("group", "Group", List.of(chart("same", 0, 0, 6, 4))))
        );
        assertThatThrownBy(() -> validator.validate(duplicate))
                .isInstanceOf(InvalidDataPointException.class)
                .hasMessage("Invalid chart placement");
    }

    private static DashboardLayout.Chart chart(String id, int x, int y, int width, int height) {
        return new DashboardLayout.Chart(id, x, y, width, height);
    }
}
