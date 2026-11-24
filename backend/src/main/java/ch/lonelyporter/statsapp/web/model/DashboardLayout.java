package ch.lonelyporter.statsapp.web.model;

import java.util.List;

public record DashboardLayout(List<Chart> charts, List<Group> groups) {
    public record Group(String id, String title, List<Chart> charts) {
    }

    public record Chart(String statisticId, Integer x, Integer y, Integer width, Integer height) {
    }
}
