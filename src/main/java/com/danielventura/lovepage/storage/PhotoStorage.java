package com.danielventura.lovepage.storage;

import com.danielventura.lovepage.model.Photo;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

/**
 * Abstraccion del almacenamiento de fotos. AlbumService depende de esta
 * interfaz, no de Cloudinary directamente, para poder cambiar de proveedor
 * (u otro para tests) sin tocar la logica de negocio.
 */
public interface PhotoStorage {

    boolean isConfigured();

    List<Photo> listPhotos(String folder);

    List<String> listAlbumFolders(String parentFolder);

    void createFolder(String path);

    Photo upload(MultipartFile file, String folder, String caption);

    void delete(String publicId);
}