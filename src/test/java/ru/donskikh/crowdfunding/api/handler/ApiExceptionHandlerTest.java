package ru.donskikh.crowdfunding.api.handler;

import jakarta.persistence.EntityNotFoundException;
import org.junit.jupiter.api.Test;
import org.springframework.core.MethodParameter;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.BeanPropertyBindingResult;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.multipart.MaxUploadSizeExceededException;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

class ApiExceptionHandlerTest {

    private final ApiExceptionHandler handler = new ApiExceptionHandler();

    @Test
    void notFoundBuildsStandardPayload() {
        ResponseEntity<?> response = handler.notFound(new EntityNotFoundException("Missing"));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(response.getBody()).isEqualTo(Map.of("code", "NOT_FOUND", "message", "Missing"));
    }

    @Test
    void badRequestBuildsStandardPayload() {
        ResponseEntity<?> response = handler.badRequest(new IllegalArgumentException("Bad input"));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody()).isEqualTo(Map.of("code", "BAD_REQUEST", "message", "Bad input"));
    }

    @Test
    void validationBuildsFieldDetailsPayload() {
        BeanPropertyBindingResult bindingResult = new BeanPropertyBindingResult(new Object(), "request");
        bindingResult.addError(new FieldError("request", "email", "must not be blank"));
        bindingResult.addError(new FieldError("request", "password", "too short"));
        MethodArgumentNotValidException exception = new MethodArgumentNotValidException(mock(MethodParameter.class), bindingResult);

        ResponseEntity<?> response = handler.validation(exception);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody()).isEqualTo(Map.of(
                "code", "VALIDATION_ERROR",
                "message", "Validation failed",
                "details", Map.of("email", "must not be blank", "password", "too short")
        ));
    }

    @Test
    void maxUploadReturnsReadableMessage() {
        ResponseEntity<?> response = handler.maxUpload(new MaxUploadSizeExceededException(5_000_000));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody()).isEqualTo(Map.of("code", "BAD_REQUEST", "message", "Image must be 5 MB or smaller"));
    }
}
