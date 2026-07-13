package com.danielventura.lovepage.model;

import java.util.List;

/**
 * Un album de fotos. name es null para el album "de base" (fotos de
 * media-config.json + fotos sueltas subidas antes de que existieran los
 * albumes), que el frontend agrupa bajo el nombre "Fotos".
 */
public record Album(String name, List<Photo> photos) {}