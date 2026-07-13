package com.danielventura.lovepage.model;

import java.util.List;

/** Cuerpo de la respuesta de GET /api/media. */
public record MediaResponse(Cover cover, List<Album> albums, Song song) {}