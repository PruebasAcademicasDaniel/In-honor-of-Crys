package com.danielventura.lovepage;

import org.springframework.core.io.ClassPathResource;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;

/**
 * Expone el contenido de la pagina (fotos, frases, cancion) leyendo
 * media-config.json desde los recursos estaticos.
 *
 * Para agregar mas fotos o activar la cancion de fondo en el futuro:
 * 1. Sube el archivo a static/img (o static/audio)
 * 2. Agrega una entrada en static/media-config.json
 * 3. Vuelve a desplegar
 * No hace falta tocar este codigo ni el frontend.
 */
@RestController
@CrossOrigin(origins = "*")
public class MediaController {

    @GetMapping(value = "/api/media", produces = MediaType.APPLICATION_JSON_VALUE)
    public String getMedia() throws IOException {
        ClassPathResource resource = new ClassPathResource("static/media-config.json");
        try (InputStream is = resource.getInputStream()) {
            return new String(is.readAllBytes(), StandardCharsets.UTF_8);
        }
    }

}
