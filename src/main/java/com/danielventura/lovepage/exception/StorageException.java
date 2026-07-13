package com.danielventura.lovepage.exception;

/**
 * Fallo al hablar con el proveedor de almacenamiento (Cloudinary).
 * Desacopla a AlbumService del tipo de excepcion concreto del SDK.
 */
public class StorageException extends RuntimeException {

    public StorageException(Throwable cause) {
        super(cause);
    }
}