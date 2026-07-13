package com.danielventura.lovepage.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonInclude;

/**
 * Una foto: url publica, frase opcional y, si viene de Cloudinary, el
 * publicId necesario para poder borrarla despues. publicId se omite del
 * JSON cuando es null (fotos "de base" que no viven en Cloudinary).
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
@JsonIgnoreProperties(ignoreUnknown = true)
public record Photo(String src, String caption, String publicId) {

    public Photo(String src, String caption) {
        this(src, caption, null);
    }
}