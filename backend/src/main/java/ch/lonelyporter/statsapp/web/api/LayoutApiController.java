package ch.lonelyporter.statsapp.web.api;

import ch.lonelyporter.statsapp.service.LayoutService;
import ch.lonelyporter.statsapp.web.model.DashboardLayout;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/stats/layout")
public class LayoutApiController {
    private final LayoutService layoutService;

    @GetMapping
    public DashboardLayout getLayout() {
        return layoutService.load();
    }

    @PutMapping
    public void saveLayout(@RequestBody DashboardLayout layout) {
        layoutService.save(layout);
    }
}
