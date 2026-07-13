package com.danielventura.lovepage.controller;

import com.danielventura.lovepage.exception.ApiException;
import com.danielventura.lovepage.model.AlbumResponse;
import com.danielventura.lovepage.model.DeletedResponse;
import com.danielventura.lovepage.model.ErrorResponse;
import com.danielventura.lovepage.model.MediaResponse;
import com.danielventura.lovepage.model.Photo;
import com.danielventura.lovepage.service.AlbumService;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;

/**
 * Expone el contenido de la pagina (portada, fotos, frases, cancion) y las
 * operaciones de albumes/fotos. Toda la logica de negocio vive en
 * AlbumService; este controller solo mapea HTTP <-> servicio.
 */
@RestController
@RequestMapping("/api")
public class MediaController {

    private final AlbumService albumService;

    public MediaController(AlbumService albumService) {
        this.albumService = albumService;
    }

    @GetMapping(value = "/media", produces = MediaType.APPLICATION_JSON_VALUE)
    public MediaResponse getMedia() throws IOException {
        return albumService.getMedia();
    }

    @PostMapping(value = "/albums", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<AlbumResponse> createAlbum(
            @RequestParam("name") String name,
            @RequestParam("pin") String pin) {

        String albumName = albumService.createAlbum(name, pin);
        return ResponseEntity.status(HttpStatus.CREATED).body(new AlbumResponse(albumName));
    }

    @PostMapping(value = "/photos", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<Photo> uploadPhoto(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "caption", required = false, defaultValue = "") String caption,
            @RequestParam("album") String album,
            @RequestParam("pin") String pin) {

        Photo photo = albumService.uploadPhoto(file, caption, album, pin);
        return ResponseEntity.status(HttpStatus.CREATED).body(photo);
    }

    @DeleteMapping(value = "/photos", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<DeletedResponse> deletePhoto(
            @RequestParam("publicId") String publicId,
            @RequestParam("pin") String pin) {

        albumService.deletePhoto(publicId, pin);
        return ResponseEntity.ok(new DeletedResponse(true));
    }

    @ExceptionHandler(ApiException.class)
    public ResponseEntity<ErrorResponse> handleApiException(ApiException e) {
        return ResponseEntity.status(e.getStatus()).body(new ErrorResponse(e.getMessage()));
    }
}