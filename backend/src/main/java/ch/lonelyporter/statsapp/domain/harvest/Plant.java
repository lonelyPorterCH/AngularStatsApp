package ch.lonelyporter.statsapp.domain.harvest;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Plant {
    private String id;
    private String name;
    private List<HarvestEntry> harvests = new ArrayList<>();
}
