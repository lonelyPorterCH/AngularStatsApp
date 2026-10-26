package ch.lonelyporter.statsapp.domain.harvest;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class HarvestEntry {
    private String id;
    private LocalDate date;
    private int quantity;
}
