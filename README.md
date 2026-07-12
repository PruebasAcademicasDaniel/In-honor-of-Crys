# love-page

Página web con una portada ("Our Story"), una foto a pantalla completa y un
mensaje, pensada para abrirse escaneando un código QR desde cualquier
celular (Android, iPhone o Google Lens). Desde la portada se puede entrar a
ver las fotos en formato libro (una por una) o subir fotos nuevas
directamente desde el celular, sin pasar por el IDE.

## Stack

- **Backend:** Java 21 + Spring Boot 3.3 (Maven)
- **Frontend:** HTML/CSS/JS servido como recursos estáticos
- **Contenido de base:** editable vía `src/main/resources/static/media-config.json`
  (sin tocar código); las fotos que se suben desde la propia web se guardan
  en **Cloudinary** (para que sobrevivan a los redeploys de Render)
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

## Cómo agregar fotos

**Desde el celular (recomendado):** en la portada, tocar "Subir fotos",
poner el PIN (ver variable `UPLOAD_PIN` abajo), elegir la imagen y una
frase opcional. Queda guardada en Cloudinary y aparece al toque en la
vista de fotos, sin redeploy.

**A mano (para las fotos "de base" del repo):**

1. Sube la imagen a `src/main/resources/static/img/` (ej: `photo-2.png`)
2. Edita `media-config.json`:

```json
{
  "cover": { "src": "/img/photo-3.jpeg", "title": "Our Story" },
  "photos": [
    { "src": "/img/photo-2.jpeg", "caption": "Eres todo lo que quiero cuando no buscaba nada." },
    { "src": "/img/photo-3.jpeg", "caption": "Otro momento que quiero recordar." }
  ],
  "song": { "src": "/audio/song.mp3" }
}
```

`cover.src` puede ser cualquier imagen de `static/img/` — usa una que se vea
bien de fondo completo (foto derecha, no un recorte tipo story con texto o
iconos ya incluidos en la imagen).

3. Vuelve a subir los cambios a GitHub → Render despliega automáticamente

El frontend soporta cualquier cantidad de fotos (vista tipo libro, se pasan
tocando la mitad de la pantalla, con las flechas, o con swipe) y un botón
de sonido que aparece solo si hay canción configurada. No hace falta tocar
`app.js` ni `index.html`.

## Variables de entorno (subida de fotos desde la web)

Para que el botón "Subir fotos" funcione hacen falta estas variables de
entorno (si no están configuradas, la página funciona igual con las fotos
de `media-config.json`, pero el botón de subir muestra un aviso):

| Variable         | Para qué sirve                                                        |
|------------------|------------------------------------------------------------------------|
| `CLOUDINARY_URL` | Credenciales de Cloudinary, formato `cloudinary://API_KEY:API_SECRET@CLOUD_NAME` |
| `UPLOAD_PIN`     | PIN que se pide antes de subir una foto (la página es pública, se comparte por QR) |

**Cómo conseguir `CLOUDINARY_URL`:**

1. Crea una cuenta gratis en https://cloudinary.com
2. En el Dashboard, copia el valor "API Environment variable" (ya viene
   armado como `CLOUDINARY_URL=cloudinary://...`)
3. En Render: el servicio → **Environment** → agrega `CLOUDINARY_URL` y
   `UPLOAD_PIN` (elegí cualquier PIN, ej. `2468`)
4. Redeploy (Render lo hace solo al guardar las env vars)

Para probar local, exporta las mismas variables antes de `mvn spring-boot:run`.

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
