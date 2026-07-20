package ch.lonelyporter.statsapp.exception;

public class InvalidDataPointException extends RuntimeException {
    public InvalidDataPointException(String message) {
        super(message);
    }
}