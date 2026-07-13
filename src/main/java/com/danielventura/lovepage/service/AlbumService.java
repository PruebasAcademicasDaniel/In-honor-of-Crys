package com.danielventura.lovepage.service;

import com.danielventura.lovepage.exception.ApiException;
import com.danielventura.lovepage.exception.StorageException;
import com.danielventura.lovepage.model.Album;
import com.danielventura.lovepage.model.LocalConfig;
import com.danielventura.lovepage.model.MediaResponse;
import com.danielventura.lovepage.model.Photo;
import com.danielventura.lovepage.storage.PhotoStorage;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

/**
 * Reglas de negocio de albumes y fotos: arma la respuesta de /api/media,
 * valida PIN y datos de entrada, y coordina MediaConfigService (fotos de
 * base) con PhotoStorage (fotos subidas por los usuarios).
 */
@Service
public class AlbumService {

    private static final String UPLOAD_FOLDER = "love-page";
    private static final List<String> ALLOWED_CONTENT_TYPES = List.of(
            "image/jpeg", "image/png", "image/webp", "image/heic", "image/heif");

    private final MediaConfigService configService;
    private final PhotoStorage photoStorage;
    private final String uploadPin;

    public AlbumService(MediaConfigService configService,
                         PhotoStorage photoStorage,
                         @Value("${UPLOAD_PIN:}") String uploadPin) {
        this.configService = configService;
        this.photoStorage = photoStorage;
        this.uploadPin = uploadPin;
    }

    public MediaResponse getMedia() throws IOException {
        LocalConfig config = configService.readConfig();

        List<Photo> defaultPhotos = new ArrayList<>();
        if (config.photos() != null) {
            defaultPhotos.addAll(config.photos());
        }
        defaultPhotos.addAll(photoStorage.listPhotos(UPLOAD_FOLDER));

        List<Album> albums = new ArrayList<>();
        albums.add(new Album(null, defaultPhotos));
        for (String albumName : photoStorage.listAlbumFolders(UPLOAD_FOLDER)) {
            albums.add(new Album(albumName, photoStorage.listPhotos(UPLOAD_FOLDER + "/" + albumName)));
        }

        return new MediaResponse(config.cover(), albums, config.song());
    }

    public String createAlbum(String name, String pin) {
        requireWriteEnabled("La creacion de albumes no esta configurada todavia.");
        requireValidPin(pin);
        String albumName = sanitizeAlbumName(name);

        try {
            photoStorage.createFolder(UPLOAD_FOLDER + "/" + albumName);
        } catch (StorageException e) {
            throw new ApiException(HttpStatus.BAD_GATEWAY, "No se pudo crear el album. Intenta de nuevo.");
        }
        return albumName;
    }

    public Photo uploadPhoto(MultipartFile file, String caption, String album, String pin) {
        requireWriteEnabled("La subida de fotos no esta configurada todavia.");
        requireValidPin(pin);
        String albumName = sanitizeAlbumName(album);
        validateFile(file);

        try {
            return photoStorage.upload(file, UPLOAD_FOLDER + "/" + albumName, caption);
        } catch (StorageException e) {
            throw new ApiException(HttpStatus.BAD_GATEWAY, "No se pudo subir la foto. Intenta de nuevo.");
        }
    }

    public void deletePhoto(String publicId, String pin) {
        requireWriteEnabled("La eliminacion de fotos no esta configurada todavia.");
        requireValidPin(pin);
        if (publicId == null || !publicId.startsWith(UPLOAD_FOLDER + "/")) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Foto invalida.");
        }

        try {
            photoStorage.delete(publicId);
        } catch (StorageException e) {
            throw new ApiException(HttpStatus.BAD_GATEWAY, "No se pudo borrar la foto. Intenta de nuevo.");
        }
    }

    private void requireWriteEnabled(String message) {
        if (!photoStorage.isConfigured() || uploadPin == null || uploadPin.isBlank()) {
            throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE, message);
        }
    }

    private void requireValidPin(String pin) {
        if (!uploadPin.equals(pin)) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "PIN incorrecto.");
        }
    }

    private String sanitizeAlbumName(String raw) {
        String trimmed = raw == null ? "" : raw.trim();
        if (trimmed.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Ponle un nombre al album.");
        }
        if (trimmed.length() > 60) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "El nombre del album es muy largo.");
        }
        if (trimmed.contains("/") || trimmed.contains("\\")) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "El nombre del album no puede tener / ni \\.");
        }
        return trimmed;
    }

    private void validateFile(MultipartFile file) {
        if (file.isEmpty() || file.getContentType() == null
                || !ALLOWED_CONTENT_TYPES.contains(file.getContentType().toLowerCase())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "El archivo debe ser una imagen (jpg, png, webp o heic).");
        }
    }
}