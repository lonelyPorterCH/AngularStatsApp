package ch.lonelyporter.statsapp.web.handler;

import ch.lonelyporter.statsapp.exception.InvalidDataPointException;
import ch.lonelyporter.statsapp.exception.StatisticConflictException;
import ch.lonelyporter.statsapp.exception.StatisticNotFoundException;
import ch.lonelyporter.statsapp.exception.StatisticStorageException;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import static org.assertj.core.api.Assertions.assertThat;

class GlobalExceptionHandlerTest {
    @Test
    void storageExceptionReturnsInternalServerErrorWithoutRequiringCause() {
        StatisticStorageException exception = new StatisticStorageException("Storage failed", null);

        ResponseEntity<String> response = new GlobalExceptionHandler().handleStorageException(exception);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.INTERNAL_SERVER_ERROR);
        assertThat(response.getBody()).isEqualTo("Storage failed");
    }

    @Test
    void conflictExceptionReturnsConflict() {
        StatisticConflictException exception = new StatisticConflictException("Already exists");

        ResponseEntity<String> response = new GlobalExceptionHandler().handleConflictException(exception);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(response.getBody()).isEqualTo("Already exists");
    }

    @Test
    void notFoundExceptionReturnsNotFound() {
        StatisticNotFoundException exception = new StatisticNotFoundException("chart");

        ResponseEntity<String> response = new GlobalExceptionHandler().handleNotFoundException(exception);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(response.getBody()).isEqualTo("Statistic not found: chart");
    }

    @Test
    void invalidDataPointExceptionReturnsBadRequest() {
        InvalidDataPointException exception = new InvalidDataPointException("Invalid value");

        ResponseEntity<String> response = new GlobalExceptionHandler().handleInvalidDataPointException(exception);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody()).isEqualTo("Invalid value");
    }
}
