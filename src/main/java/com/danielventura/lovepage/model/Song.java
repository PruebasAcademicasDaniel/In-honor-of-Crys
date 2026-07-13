package com.danielventura.lovepage.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

/** Cancion de fondo opcional, definida en media-config.json. */
@JsonIgnoreProperties(ignoreUnknown = true)
public record Song(String src) {}