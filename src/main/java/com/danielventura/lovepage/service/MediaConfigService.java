package com.danielventura.lovepage.service;

import com.danielventura.lovepage.model.LocalConfig;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.io.InputStream;

/**
 * Lee el contenido "de base" del sitio (portada, fotos y cancion) desde
 * static/media-config.json, bundled en el jar.
 */
@Service
public class MediaConfigService {

    private final ObjectMapper objectMapper = new ObjectMapper()
            .configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);

    public LocalConfig readConfig() throws IOException {
        ClassPathResource resource = new ClassPathResource("static/media-config.json");
        try (InputStream is = resource.getInputStream()) {
            return objectMapper.readValue(is, LocalConfig.class);
        }
    }
}