package com.danielventura.lovepage.storage;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import com.danielventura.lovepage.exception.StorageException;
import com.danielventura.lovepage.model.Photo;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * Implementacion de PhotoStorage sobre Cloudinary. Si no hay
 * CLOUDINARY_URL configurada, queda en modo "no disponible" y las
 * operaciones de lectura devuelven listas vacias en vez de fallar.
 */
@Component
public class CloudinaryPhotoStorage implements PhotoStorage {

    private final Cloudinary cloudinary;

    public CloudinaryPhotoStorage(@Value("${CLOUDINARY_URL:}") String cloudinaryUrl) {
        this.cloudinary = (cloudinaryUrl == null || cloudinaryUrl.isBlank())
                ? null
                : new Cloudinary(cloudinaryUrl);
    }

    @Override
    public boolean isConfigured() {
        return cloudinary != null;
    }

    @Override
    public List<Photo> listPhotos(String folder) {
        if (cloudinary == null) {
            return List.of();
        }
        try {
            Map<String, Object> result = cloudinary.search()
                    .expression("folder=" + folder)
                    .sortBy("created_at", "asc")
                    .maxResults(100)
                    .withField("context")
                    .execute();

            Object rawResources = result.get("resources");
            if (!(rawResources instanceof List<?> resources)) {
                return List.of();
            }

            List<Photo> photos = new ArrayList<>();
            for (Object item : resources) {
                if (item instanceof Map<?, ?> resource) {
                    photos.add(new Photo(
                            (String) resource.get("secure_url"),
                            extractCaption(resource),
                            (String) resource.get("public_id")));
                }
            }
            return photos;
        } catch (Exception e) {
            // Si Cloudinary no responde, mostramos igual las fotos locales
            // en vez de romper la pagina.
            return List.of();
        }
    }

    @Override
    public List<String> listAlbumFolders(String parentFolder) {
        if (cloudinary == null) {
            return List.of();
        }
        try {
            Map<String, Object> result = cloudinary.api().subFolders(parentFolder, ObjectUtils.emptyMap());
            Object rawFolders = result.get("folders");
            if (!(rawFolders instanceof List<?> folders)) {
                return List.of();
            }
            List<String> names = new ArrayList<>();
            for (Object item : folders) {
                if (item instanceof Map<?, ?> folder && folder.get("name") instanceof String name) {
                    names.add(name);
                }
            }
            return names;
        } catch (Exception e) {
            // Carpeta love-page todavia no existe (sin fotos subidas) u otro error de Cloudinary.
            return List.of();
        }
    }

    @Override
    public void createFolder(String path) {
        try {
            cloudinary.api().createFolder(path, ObjectUtils.emptyMap());
        } catch (Exception e) {
            throw new StorageException(e);
        }
    }

    @Override
    public Photo upload(MultipartFile file, String folder, String caption) {
        try {
            Map<?, ?> uploadResult = cloudinary.uploader().upload(file.getBytes(), ObjectUtils.asMap(
                    "folder", folder,
                    "context", "caption=" + encodeContextValue(caption)));
            return new Photo((String) uploadResult.get("secure_url"), caption);
        } catch (IOException e) {
            throw new StorageException(e);
        }
    }

    @Override
    public void delete(String publicId) {
        try {
            cloudinary.uploader().destroy(publicId, ObjectUtils.emptyMap());
        } catch (IOException e) {
            throw new StorageException(e);
        }
    }

    private String extractCaption(Map<?, ?> resource) {
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