package com.mskim.memo_api;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.List;

@RestControllerAdvice
public class GlobalExceptionHandler {

    public record FieldErrorRes(String field, String message) {}

    public record ErrorRes(
            Instant timestamp,
            int status,
            String error,
            String message,
            String path,
            List<FieldErrorRes> fieldErrors
    ) {}

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorRes> handleValidation(MethodArgumentNotValidException ex, HttpServletRequest req) {
        List<FieldErrorRes> fields = ex.getBindingResult().getFieldErrors().stream()
                .map(this::toFieldErrorRes)
                .toList();

        ErrorRes body = new ErrorRes(
                Instant.now(),
                HttpStatus.BAD_REQUEST.value(),
                HttpStatus.BAD_REQUEST.getReasonPhrase(),
                "validation failed",
                req.getRequestURI(),
                fields
        );
        return ResponseEntity.badRequest().body(body);
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ErrorRes> handleBadJson(HttpMessageNotReadableException ex, HttpServletRequest req) {
        ErrorRes body = new ErrorRes(
                Instant.now(),
                HttpStatus.BAD_REQUEST.value(),
                HttpStatus.BAD_REQUEST.getReasonPhrase(),
                "invalid json",
                req.getRequestURI(),
                List.of()
        );
        return ResponseEntity.badRequest().body(body);
    }

    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<ErrorRes> handleStatus(ResponseStatusException ex, HttpServletRequest req) {
        int status = ex.getStatusCode().value();
        ErrorRes body = new ErrorRes(
                Instant.now(),
                status,
                ex.getStatusCode().toString(),
                ex.getReason() != null ? ex.getReason() : "error",
                req.getRequestURI(),
                List.of()
        );
        return ResponseEntity.status(status).body(body);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorRes> handleOther(Exception ex, HttpServletRequest req) {
        ErrorRes body = new ErrorRes(
                Instant.now(),
                HttpStatus.INTERNAL_SERVER_ERROR.value(),
                HttpStatus.INTERNAL_SERVER_ERROR.getReasonPhrase(),
                "unexpected error",
                req.getRequestURI(),
                List.of()
        );
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(body);
    }

    private FieldErrorRes toFieldErrorRes(FieldError e) {
        String msg = (e.getDefaultMessage() != null) ? e.getDefaultMessage() : "invalid";
        return new FieldErrorRes(e.getField(), msg);
    }
}