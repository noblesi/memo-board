package com.mskim.memo_api.common;

import jakarta.servlet.http.HttpServletRequest;
import java.util.stream.Collectors;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.server.ResponseStatusException;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<ApiError> handleResponseStatusException(
        ResponseStatusException e,
        HttpServletRequest request
    ) {
        HttpStatus status = HttpStatus.valueOf(e.getStatusCode().value());
        String message = e.getReason() != null ? e.getReason() : status.getReasonPhrase();

        return ResponseEntity.status(status).body(
            ApiError.of(
                status.value(),
                status.getReasonPhrase(),
                message,
                request.getRequestURI()
            )
        );
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiError> handleValidationException(
        MethodArgumentNotValidException e,
        HttpServletRequest request
    ) {
        String message = e.getBindingResult()
            .getFieldErrors()
            .stream()
            .map(this::toMessage)
            .collect(Collectors.joining(", "));

        if (message.isBlank()) {
            message = "validation failed";
        }

        return ResponseEntity.badRequest().body(
            ApiError.of(
                HttpStatus.BAD_REQUEST.value(),
                HttpStatus.BAD_REQUEST.getReasonPhrase(),
                message,
                request.getRequestURI()
            )
        );
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ApiError> handleDataIntegrityViolation(
        DataIntegrityViolationException e,
        HttpServletRequest request
    ) {
        return ResponseEntity.status(HttpStatus.CONFLICT).body(
            ApiError.of(
                HttpStatus.CONFLICT.value(),
                HttpStatus.CONFLICT.getReasonPhrase(),
                "data integrity violation",
                request.getRequestURI()
            )
        );
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiError> handleException(
        Exception e,
        HttpServletRequest request
    ) {
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(
            ApiError.of(
                HttpStatus.INTERNAL_SERVER_ERROR.value(),
                HttpStatus.INTERNAL_SERVER_ERROR.getReasonPhrase(),
                "internal server error",
                request.getRequestURI()
            )
        );
    }

    private String toMessage(FieldError fieldError) {
        String defaultMessage = fieldError.getDefaultMessage();
        if (defaultMessage == null || defaultMessage.isBlank()) {
            return fieldError.getField() + ": invalid value";
        }
        return fieldError.getField() + ": " + defaultMessage;
    }
}