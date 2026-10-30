package ch.lonelyporter.statsapp.service;

import ch.lonelyporter.statsapp.domain.harvest.HarvestEntry;
import ch.lonelyporter.statsapp.domain.harvest.HarvestSeason;
import ch.lonelyporter.statsapp.domain.harvest.Plant;
import ch.lonelyporter.statsapp.exception.InvalidDataPointException;
import ch.lonelyporter.statsapp.exception.StatisticConflictException;
import ch.lonelyporter.statsapp.exception.StatisticNotFoundException;
import ch.lonelyporter.statsapp.exception.StatisticStorageException;
import ch.lonelyporter.statsapp.persistence.HarvestRepository;
import ch.lonelyporter.statsapp.web.model.HarvestView;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.*;

@Service
@RequiredArgsConstructor
public class HarvestService {
    private final HarvestRepository repository;

    /**
     * Returns the years for which harvest data is stored, in descending order.
     *
     * @return stored harvest years
     * @throws StatisticStorageException if the harvest directory cannot be read
     */
    public List<Integer> getYears() {
        return repository.findYears();
    }

    /**
     * Builds the season view, including sorted plant harvests and cumulative chart series.
     *
     * @param year season year
     * @return the season's plants, totals, and chart series
     * @throws StatisticStorageException if season data cannot be read
     */
    public HarvestView getSeason(int year) {
        HarvestSeason season = repository.findOrCreate(year);
        List<HarvestView.PlantView> plants = season.getPlants().stream()
                .sorted(Comparator.comparing(Plant::getName, String.CASE_INSENSITIVE_ORDER))
                .map(plant -> new HarvestView.PlantView(plant.getId(), plant.getName(), sortedHarvests(plant)))
                .toList();

        List<HarvestView.PlantTotal> totals = new ArrayList<>();
        List<HarvestView.SeriesView> series = new ArrayList<>();
        Map<LocalDate, Integer> globalDaily = new HashMap<>();
        for (Plant plant : season.getPlants()) {
            Map<LocalDate, Integer> daily = dailyTotals(plant);
            int cumulative = 0;
            List<HarvestView.ChartPoint> points = new ArrayList<>();
            for (Map.Entry<LocalDate, Integer> entry : daily.entrySet()) {
                cumulative += entry.getValue();
                points.add(new HarvestView.ChartPoint(entry.getKey(), cumulative));
                globalDaily.merge(entry.getKey(), entry.getValue(), Integer::sum);
            }
            totals.add(new HarvestView.PlantTotal(plant.getId(), plant.getName(), cumulative));
            series.add(new HarvestView.SeriesView(plant.getId(), plant.getName(), points));
        }

        int globalCumulative = 0;
        List<HarvestView.ChartPoint> globalSeries = new ArrayList<>();
        for (Map.Entry<LocalDate, Integer> entry : new java.util.TreeMap<>(globalDaily).entrySet()) {
            globalCumulative += entry.getValue();
            globalSeries.add(new HarvestView.ChartPoint(entry.getKey(), globalCumulative));
        }

        return new HarvestView(year, plants, totals, series, globalSeries, globalCumulative);
    }

    /**
     * Add a new plant for a given year
     *
     * @param year season where it should be added
     * @param name name of the plant
     * @throws InvalidDataPointException  if the name is null or blank
     * @throws StatisticConflictException if plant already exists
     * @throws StatisticStorageException  if saving failed
     */
    public void addPlant(int year, String name) {
        String normalizedName = requireText(name);
        HarvestSeason season = repository.findOrCreate(year);
        if (season.getPlants().stream().anyMatch(plant -> plant.getName().equalsIgnoreCase(normalizedName))) {
            throw new StatisticConflictException("Plant already exists: " + normalizedName);
        }
        season.getPlants().add(new Plant(UUID.randomUUID().toString(), normalizedName, new ArrayList<>()));
        repository.save(season);
    }

    /**
     * Renames a plant in the given season. The new name cannot be null or blank.
     *
     * @param year    season
     * @param plantId unique id
     * @param name    new name
     * @throws StatisticConflictException if name already exists
     * @throws InvalidDataPointException  if name is invalid
     * @throws StatisticNotFoundException if the season or plant does not exist
     * @throws StatisticStorageException  if saving failed
     */
    public void renamePlant(int year, String plantId, String name) {
        String normalizedName = requireText(name);
        HarvestSeason season = repository.findByYear(year);
        Plant plant = findPlant(season, plantId);
        if (season.getPlants().stream().anyMatch(other -> !other.getId().equals(plantId)
                && other.getName().equalsIgnoreCase(normalizedName))) {
            throw new StatisticConflictException("Plant already exists: " + normalizedName);
        }
        plant.setName(normalizedName);
        repository.save(season);
    }

    /**
     * Deletes a plant by given year and id.
     *
     * @param year    season
     * @param plantId unique id
     * @throws StatisticNotFoundException if plant not found
     * @throws StatisticStorageException  if saving failed
     */
    public void deletePlant(int year, String plantId) {
        HarvestSeason season = repository.findByYear(year);
        boolean removed = season.getPlants().removeIf(plant -> plant.getId().equals(plantId));
        if (!removed) {
            throw new StatisticNotFoundException("Plant not found: " + plantId);
        }
        repository.save(season);
    }

    /**
     * Adds a harvest entry to a plant.
     *
     * @param year     season year
     * @param plantId  id of the plant
     * @param date     harvest date, which must belong to {@code year}
     * @param quantity positive harvest quantity
     * @throws InvalidDataPointException  if the date is null, outside the season, or quantity is not positive
     * @throws StatisticNotFoundException if the season or plant does not exist
     * @throws StatisticStorageException  if saving failed
     */
    public void addHarvest(int year, String plantId, LocalDate date, int quantity) {
        validateEntry(year, date, quantity);
        HarvestSeason season = repository.findByYear(year);
        Plant plant = findPlant(season, plantId);
        plant.getHarvests().add(new HarvestEntry(UUID.randomUUID().toString(), date, quantity));
        repository.save(season);
    }

    /**
     * Updates the date and quantity of an existing harvest entry.
     *
     * @param year      season year
     * @param plantId   id of the plant
     * @param harvestId id of the harvest entry
     * @param date      new harvest date, which must belong to {@code year}
     * @param quantity  new positive harvest quantity
     * @throws InvalidDataPointException  if the date is null, outside the season, or quantity is not positive
     * @throws StatisticNotFoundException if the season, plant, or harvest entry does not exist
     * @throws StatisticStorageException  if saving failed
     */
    public void updateHarvest(int year, String plantId, String harvestId, LocalDate date, int quantity) {
        validateEntry(year, date, quantity);
        HarvestSeason season = repository.findByYear(year);
        Plant plant = findPlant(season, plantId);
        HarvestEntry entry = plant.getHarvests().stream()
                .filter(harvest -> harvest.getId().equals(harvestId))
                .findFirst()
                .orElseThrow(() -> new StatisticNotFoundException("Harvest not found: " + harvestId));
        entry.setDate(date);
        entry.setQuantity(quantity);
        repository.save(season);
    }

    /**
     * Deletes a harvest entry from a plant.
     *
     * @param year      season year
     * @param plantId   id of the plant
     * @param harvestId id of the harvest entry
     * @throws StatisticNotFoundException if the season, plant, or harvest entry does not exist
     * @throws StatisticStorageException  if saving failed
     */
    public void deleteHarvest(int year, String plantId, String harvestId) {
        HarvestSeason season = repository.findByYear(year);
        Plant plant = findPlant(season, plantId);
        if (plant.getHarvests().removeIf(harvest -> harvest.getId().equals(harvestId))) {
            repository.save(season);
            return;
        }
        throw new StatisticNotFoundException("Harvest not found: " + harvestId);
    }

    private Plant findPlant(HarvestSeason season, String plantId) {
        return season.getPlants().stream()
                .filter(plant -> plant.getId().equals(plantId))
                .findFirst()
                .orElseThrow(() -> new StatisticNotFoundException("Plant not found: " + plantId));
    }

    private void validateEntry(int year, LocalDate date, int quantity) {
        if (date == null || date.getYear() != year) {
            throw new InvalidDataPointException("Harvest date must belong to the selected year");
        }
        if (quantity <= 0) {
            throw new InvalidDataPointException("Harvest quantity must be greater than zero");
        }
    }

    private String requireText(String value) {
        if (value == null || value.trim().isEmpty()) {
            throw new InvalidDataPointException("Plant name is required");
        }
        return value.trim();
    }

    private List<HarvestEntry> sortedHarvests(Plant plant) {
        return plant.getHarvests().stream()
                .sorted(Comparator.comparing(HarvestEntry::getDate).thenComparing(HarvestEntry::getId))
                .toList();
    }

    private Map<LocalDate, Integer> dailyTotals(Plant plant) {
        Map<LocalDate, Integer> totals = new java.util.TreeMap<>();
        for (HarvestEntry entry : plant.getHarvests()) {
            totals.merge(entry.getDate(), entry.getQuantity(), Integer::sum);
        }
        return totals;
    }
}
