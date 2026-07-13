package com.danielventura.lovepage.model;

/** Cuerpo de respuesta uniforme para errores de negocio ({"error": "..."}). */
public record ErrorResponse(String error) {}