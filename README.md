# love-page

Página web con una foto a pantalla completa y un mensaje, pensada para
abrirse escaneando un código QR desde cualquier celular (Android, iPhone
o Google Lens).

## Stack

- **Backend:** Java 21 + Spring Boot 3.3 (Maven)
- **Frontend:** HTML/CSS/JS servido como recursos estáticos
- **Contenido:** editable vía `src/main/resources/static/media-config.json`
  (sin tocar código)
- **Despliegue:** Docker → Render

## Estructura

```
love-page/
├── pom.xml
├── Dockerfile
├── render.yaml
├── src/main/java/com/danielventura/lovepage/
│   ├── LovePageApplication.java
│   └── MediaController.java
└── src/main/resources/
    ├── application.properties
    └── static/
        ├── index.html
        ├── media-config.json   ← aquí agregas fotos/canción
        ├── css/style.css
        ├── js/app.js
        ├── img/photo-1.png
        └── audio/              ← aquí van canciones (mp3)
```

## Cómo agregar más fotos o una canción (a futuro)

1. Sube la imagen a `src/main/resources/static/img/` (ej: `photo-2.png`)
2. Edita `media-config.json`:

```json
{
  "photos": [
    { "src": "/img/photo-1.png", "caption": "Eres todo lo que quiero cuando no buscaba nada." },
    { "src": "/img/photo-2.png", "caption": "Otro momento que quiero recordar." }
  ],
  "song": { "src": "/audio/song.mp3" }
}
```

3. Vuelve a subir los cambios a GitHub → Render despliega automáticamente

El frontend ya soporta varias fotos (rotan solas cada 6s con puntos
indicadores arriba) y un botón de sonido que aparece solo si hay canción
configurada. No hace falta tocar `app.js` ni `index.html`.

## Probar en tu computadora (opcional)

Necesitas tener instalado Java 21 y Maven.

```bash
mvn spring-boot:run
```

Abre `http://localhost:8080` en el navegador.

## Desplegar en Render

### 1. Sube el proyecto a GitHub

```bash
cd love-page
git init
git add .
git commit -m "Primera version"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/love-page.git
git push -u origin main
```

(Crea antes el repositorio vacío en https://github.com/new)

### 2. Crea el servicio en Render

1. Entra a https://render.com y crea una cuenta (puedes usar GitHub para
   registrarte, así quedan conectados automáticamente)
2. Click en **New +** → **Web Service**
3. Conecta tu repositorio `love-page`
4. Render detectará el `render.yaml` y el `Dockerfile` automáticamente.
   Si te pregunta manualmente:
   - **Runtime:** Docker
   - **Plan:** Free
   - Deja el resto por defecto
5. Click en **Create Web Service**

La primera build tarda unos 3-5 minutos (Maven descarga dependencias y
compila). Cuando termine, Render te da una URL pública, algo como:

```
https://love-page.onrender.com
```

Esa es la URL que va dentro del QR.

### 3. Nota sobre el plan gratuito

El plan free "duerme" el servicio tras ~15 min sin tráfico. La primera
persona que escanee el QR después de eso espera unos 20-30 segundos en
lo que el servicio despierta. Si esto es para un evento puntual y quieres
que cargue al instante, dímelo y vemos opciones (plan pago, o un ping
externo periódico gratuito).

## Generar el QR

Una vez tengas la URL de Render, dime cuál es y te genero el QR listo
para escanear (o puedes usar cualquier generador de QR online pegando
la URL, por ejemplo qr-code-generator.com).
