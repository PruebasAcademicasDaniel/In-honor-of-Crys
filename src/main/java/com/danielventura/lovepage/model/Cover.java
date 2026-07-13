package com.danielventura.lovepage.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

/** Imagen y titulo de la portada, definidos en media-config.json. */
@JsonIgnoreProperties(ignoreUnknown = true)
public record Cover(String src, String title) {}