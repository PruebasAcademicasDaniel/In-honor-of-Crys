package com.danielventura.lovepage.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.util.List;

/** Contenido "de base" del sitio, tal como esta en static/media-config.json. */
@JsonIgnoreProperties(ignoreUnknown = true)
public record LocalConfig(Cover cover, List<Photo> photos, Song song) {}