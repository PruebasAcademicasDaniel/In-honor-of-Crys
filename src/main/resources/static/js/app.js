/**
 * Pagina "Para ti"
 * -----------------
 * Lee /api/media (fotos + cancion opcional) y arma la escena.
 * Preparado para escalar: si "photos" tiene mas de un elemento,
 * se muestran en secuencia con puntos indicadores, sin cambiar nada mas.
 */
(function () {
  const scene = document.getElementById('scene');
  const loader = document.getElementById('loader');
  const soundToggle = document.getElementById('soundToggle');
  const bgAudio = document.getElementById('bgAudio');

  const SLIDE_DURATION_MS = 6000;

  fetch('/api/media')
    .then((res) => res.json())
    .then((data) => renderScene(data))
    .catch(() => renderError());

  function renderScene(data) {
    const photos = Array.isArray(data.photos) ? data.photos : [];
    if (photos.length === 0) {
      renderError();
      return;
    }

    loader.remove();

    // ---- Construir slides ----
    photos.forEach((photo, index) => {
      const slide = document.createElement('div');
      slide.className = 'slide' + (index === 0 ? ' is-active' : '');
      slide.dataset.index = String(index);

      const img = document.createElement('img');
      img.className = 'slide__img';
      img.src = photo.src;
      img.alt = photo.caption || 'Foto';

      const scrim = document.createElement('div');
      scrim.className = 'slide__scrim';

      const caption = document.createElement('div');
      caption.className = 'caption';
      caption.innerHTML = `
        <div class="caption__mark"></div>
        <p class="caption__text">${escapeHtml(photo.caption || '')}</p>
      `;

      slide.appendChild(img);
      slide.appendChild(scrim);
      slide.appendChild(caption);
      scene.appendChild(slide);
    });

    // ---- Puntos indicadores (solo si hay mas de 1 foto) ----
    if (photos.length > 1) {
      const dots = document.createElement('div');
      dots.className = 'dots';
      photos.forEach((_, index) => {
        const dot = document.createElement('span');
        if (index === 0) dot.className = 'is-active';
        dots.appendChild(dot);
      });
      scene.appendChild(dots);
      startCarousel(photos.length, dots);
    }

    // ---- Cancion de fondo (opcional) ----
    if (data.song && data.song.src) {
      setupAudio(data.song.src);
    }
  }

  function startCarousel(total, dotsEl) {
    let current = 0;
    setInterval(() => {
      const slides = scene.querySelectorAll('.slide');
      const dots = dotsEl.querySelectorAll('span');

      slides[current].classList.remove('is-active');
      dots[current].classList.remove('is-active');

      current = (current + 1) % total;

      slides[current].classList.add('is-active');
      dots[current].classList.add('is-active');
    }, SLIDE_DURATION_MS);
  }

  function setupAudio(src) {
    bgAudio.src = src;
    soundToggle.hidden = false;

    let playing = false;
    soundToggle.addEventListener('click', () => {
      if (playing) {
        bgAudio.pause();
        soundToggle.classList.remove('is-playing');
        soundToggle.classList.add('is-muted');
      } else {
        bgAudio.play().catch(() => {});
        soundToggle.classList.add('is-playing');
        soundToggle.classList.remove('is-muted');
      }
      playing = !playing;
    });
  }

  function renderError() {
    loader.remove();
    scene.innerHTML = `
      <div style="position:absolute;inset:0;display:flex;align-items:center;
                  justify-content:center;color:#f3ecdf;font-family:Jost,sans-serif;
                  text-align:center;padding:24px;">
        No se pudo cargar el contenido. Intenta de nuevo.
      </div>`;
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
})();
