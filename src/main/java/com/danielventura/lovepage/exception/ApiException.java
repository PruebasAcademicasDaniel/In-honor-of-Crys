package com.danielventura.lovepage.exception;

import org.springframework.http.HttpStatus;

/**
 * Error de negocio con su codigo HTTP asociado. El controller la traduce
 * a la respuesta JSON {"error": mensaje} sin necesitar un catch por caso.
 */
public class ApiException extends RuntimeException {

    private final HttpStatus status;

    public ApiException(HttpStatus status, String message) {
        super(message);
        this.status = status;
    }

    public HttpStatus getStatus() {
        return status;
    }
}