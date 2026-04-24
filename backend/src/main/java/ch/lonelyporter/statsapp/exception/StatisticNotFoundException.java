package ch.lonelyporter.statsapp.exception;

public class StatisticNotFoundException extends RuntimeException {
    public StatisticNotFoundException(String id) {
        super("Statistic not found: " + id);
    }
}
