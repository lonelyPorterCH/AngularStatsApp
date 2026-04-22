package ch.lonelyporter.statsapp.web.handler;

import ch.lonelyporter.statsapp.exception.StatisticStorageException;
import org.springframework.http.HttpStatus;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseStatus;

@ControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(StatisticStorageException.class)
    @ResponseStatus(HttpStatus.INTERNAL_SERVER_ERROR)
    public String handleStorageException(StatisticStorageException e, Model model) {
        model.addAttribute("error", e.getMessage());
        model.addAttribute("cause", e.getCause().getMessage());
        return "error";
    }
}