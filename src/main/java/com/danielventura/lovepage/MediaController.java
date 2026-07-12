package com.danielventura.lovepage;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.core.io.ClassPathResource;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Expone el contenido de la pagina (portada, fotos, frases, cancion).
 *
 * Las fotos "de base" viven en static/media-config.json (bundled en el
 * jar). Las fotos que se suben desde el boton "Subir fotos" del frontend
 * se guardan en Cloudinary (para que sobrevivan a redeploys de Render, que
 * no tiene disco persistente en el plan free) y Cloudinary tambien guarda
 * el caption como metadata, asi no hace falta una base de datos aparte.
 */
@RestController
@RequestMapping("/api")
public class MediaController {

    private static final String UPLOAD_FOLDER = "love-page";
    private static final List<String> ALLOWED_CONTENT_TYPES = List.of(
            "image/jpeg", "image/png", "image/webp", "image/heic", "image/heif");

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final Cloudinary cloudinary;
    private final String uploadPin;

    public MediaController() {
        String cloudinaryUrl = System.getenv("CLOUDINARY_URL");
        this.cloudinary = (cloudinaryUrl == null || cloudinaryUrl.isBlank())
                ? null
                : new Cloudinary(cloudinaryUrl);
        this.uploadPin = System.getenv("UPLOAD_PIN");
    }

    @GetMapping(value = "/media", produces = MediaType.APPLICATION_JSON_VALUE)
    public Map<String, Object> getMedia() throws IOException {
        Map<String, Object> config = readLocalConfig();

        List<Map<String, Object>> photos = new ArrayList<>();
        photos.addAll(localPhotos(config));
        photos.addAll(fetchUploadedPhotos());

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("cover", config.get("cover"));
        response.put("photos", photos);
        response.put("song", config.get("song"));
        return response;
    }

    @PostMapping(value = "/photos", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<Map<String, Object>> uploadPhoto(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "caption", required = false, defaultValue = "") String caption,
            @RequestParam("pin") String pin) {

        if (cloudinary == null || uploadPin == null || uploadPin.isBlank()) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                    .body(error("La subida de fotos no esta configurada todavia."));
        }
        if (!uploadPin.equals(pin)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(error("PIN incorrecto."));
        }
        if (file.isEmpty() || file.getContentType() == null
                || !ALLOWED_CONTENT_TYPES.contains(file.getContentType().toLowerCase())) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(error("El archivo debe ser una imagen (jpg, png, webp o heic)."));
        }

        try {
            Map<?, ?> uploadResult = cloudinary.uploader().upload(file.getBytes(), ObjectUtils.asMap(
                    "folder", UPLOAD_FOLDER,
                    "context", "caption=" + encodeContextValue(caption)));

            Map<String, Object> photo = new LinkedHashMap<>();
            photo.put("src", uploadResult.get("secure_url"));
            photo.put("caption", caption);
            return ResponseEntity.status(HttpStatus.CREATED).body(photo);
        } catch (IOException e) {
            return ResponseEntity.status(HttpStatus.BAD_GATEWAY)
                    .body(error("No se pudo subir la foto. Intenta de nuevo."));
        }
    }

    private Map<String, Object> error(String message) {
        return Map.of("error", message);
    }

    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> localPhotos(Map<String, Object> config) {
        List<Map<String, Object>> photos = new ArrayList<>();
        if (config.get("photos") instanceof List<?> list) {
            for (Object item : list) {
                if (item instanceof Map<?, ?> map) {
                    photos.add((Map<String, Object>) map);
                }
            }
        }
        return photos;
    }

    private Map<String, Object> readLocalConfig() throws IOException {
        ClassPathResource resource = new ClassPathResource("static/media-config.json");
        try (InputStream is = resource.getInputStream()) {
            return objectMapper.readValue(is, Map.class);
        }
    }

    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> fetchUploadedPhotos() {
        if (cloudinary == null) {
            return List.of();
        }
        try {
            Map<String, Object> result = cloudinary.search()
                    .expression("folder:" + UPLOAD_FOLDER)
                    .sortBy("created_at", "asc")
                    .maxResults(100)
                    .withField("context")
                    .execute();

            Object rawResources = result.get("resources");
            if (!(rawResources instanceof List<?> resources)) {
                return List.of();
            }

            List<Map<String, Object>> photos = new ArrayList<>();
            for (Object item : resources) {
                if (item instanceof Map<?, ?> resource) {
                    Map<String, Object> photo = new LinkedHashMap<>();
                    photo.put("src", resource.get("secure_url"));
                    photo.put("caption", extractCaption((Map<String, Object>) resource));
                    photos.add(photo);
                }
            }
            return photos;
        } catch (Exception e) {
            // Si Cloudinary no responde, mostramos igual las fotos locales
            // en vez de romper la pagina.
            return List.of();
        }
    }

    @SuppressWarnings("unchecked")
    private String extractCaption(Map<String, Object> resource) {
        if (resource.get("context") instanceof Map<?, ?> context) {
            if (context.get("custom") instanceof Map<?, ?> custom
                    && custom.get("caption") instanceof String caption) {
                return caption;
            }
            if (context.get("caption") instanceof String caption) {
                return caption;
            }
        }
        return "";
    }

    private String encodeContextValue(String value) {
        return value.replace("\\", "\\\\").replace("=", "\\=").replace("|", "\\|");
    }
}
