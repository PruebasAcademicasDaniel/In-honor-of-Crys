/**
 * Pagina "Our Story"
 * -------------------
 * Tres pantallas dentro de la misma carga:
 *  - #cover: portada con imagen, titulo y los dos botones de entrada.
 *  - #scene: vista tipo libro (una foto a la vez, se pagina a mano).
 *  - #uploadScreen: formulario para sumar una foto nueva (PIN + archivo).
 *
 * /api/media trae la portada, las fotos "de base" y las que se hayan
 * subido desde el propio formulario (esas viven en Cloudinary).
 */
(function () {
  const PIN_STORAGE_KEY = 'lovePagePin';
  const SWIPE_THRESHOLD_PX = 40;

  const loader = document.getElementById('loader');

  const coverScreen = document.getElementById('cover');
  const coverImg = document.getElementById('coverImg');
  const coverTitle = document.getElementById('coverTitle');
  const viewPhotosBtn = document.getElementById('viewPhotosBtn');
  const uploadPhotosBtn = document.getElementById('uploadPhotosBtn');

  const scene = document.getElementById('scene');
  const soundToggle = document.getElementById('soundToggle');
  const bgAudio = document.getElementById('bgAudio');
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');

  const uploadScreen = document.getElementById('uploadScreen');
  const uploadForm = document.getElementById('uploadForm');
  const uploadStatus = document.getElementById('uploadStatus');
  const uploadPinInput = document.getElementById('uploadPin');
  const uploadFileInput = document.getElementById('uploadFile');
  const uploadCaptionInput = document.getElementById('uploadCaption');

  let mediaData = { cover: null, photos: [], song: null };
  let slidesBuilt = false;
  let audioReady = false;
  let current = 0;
  let total = 0;
  let dotsEl = null;
  let didSwipe = false;
  let touchStartX = null;

  // ---------------------------------------------------------------
  // Carga inicial
  // ---------------------------------------------------------------
  fetch('/api/media')
    .then((res) => res.json())
    .then((data) => {
      applyMediaData(data);
      renderCover();
    })
    .catch(() => renderError());

  function applyMediaData(data) {
    mediaData = {
      cover: data.cover || mediaData.cover,
      photos: Array.isArray(data.photos) ? data.photos : [],
      song: data.song || mediaData.song,
    };
  }

  function renderCover() {
    loader.remove();
    if (mediaData.cover && mediaData.cover.src) {
      coverImg.src = mediaData.cover.src;
    }
    coverTitle.textContent = (mediaData.cover && mediaData.cover.title) || 'Our Story';

    const storedPin = sessionStorage.getItem(PIN_STORAGE_KEY);
    if (storedPin) uploadPinInput.value = storedPin;

    showScreen(coverScreen);
  }

  function renderError() {
    loader.remove();
    document.body.innerHTML = `
      <div style="position:fixed;inset:0;display:flex;align-items:center;
                  justify-content:center;color:#f3ecdf;font-family:Jost,sans-serif;
                  text-align:center;padding:24px;background:#241d17;">
        No se pudo cargar el contenido. Intenta de nuevo.
      </div>`;
  }

  // ---------------------------------------------------------------
  // Navegacion entre pantallas
  // ---------------------------------------------------------------
  function showScreen(target) {
    [coverScreen, scene, uploadScreen].forEach((el) => {
      el.hidden = el !== target;
    });
  }

  viewPhotosBtn.addEventListener('click', () => {
    ensureSlidesBuilt();
    showScreen(scene);
  });

  uploadPhotosBtn.addEventListener('click', () => {
    uploadStatus.textContent = '';
    showScreen(uploadScreen);
  });

  document.querySelectorAll('[data-back]').forEach((btn) => {
    btn.addEventListener('click', () => showScreen(coverScreen));
  });

  // ---------------------------------------------------------------
  // Vista libro
  // ---------------------------------------------------------------
  function ensureSlidesBuilt() {
    if (slidesBuilt) return;
    scene.querySelectorAll('.scene__empty').forEach((el) => el.remove());

    if (mediaData.photos.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'scene__empty';
      empty.textContent = 'Todavia no hay fotos. ¡Subi la primera!';
      scene.appendChild(empty);
    } else {
      buildSlides(mediaData.photos);
      if (mediaData.song && mediaData.song.src) setupAudio(mediaData.song.src);
    }
    slidesBuilt = true;
  }

  function buildSlides(photos) {
    scene.querySelectorAll('.slide, .dots').forEach((el) => el.remove());
    current = 0;
    total = photos.length;

    photos.forEach((photo, index) => {
      const slide = document.createElement('div');
      slide.className = 'slide';
      slide.dataset.index = String(index);

      const img = document.createElement('img');
      img.className = 'slide__img';
      img.src = photo.src;
      img.alt = photo.caption || 'Foto';

      const scrim = document.createElement('div');
      scrim.className = 'slide__scrim';

      slide.appendChild(img);
      slide.appendChild(scrim);

      if (photo.caption && photo.caption.trim() !== '') {
        const caption = document.createElement('div');
        caption.className = 'caption';
        caption.innerHTML = `
          <div class="caption__mark"></div>
          <p class="caption__text">${escapeHtml(photo.caption)}</p>
        `;
        slide.appendChild(caption);
      }

      scene.appendChild(slide);
    });

    dotsEl = null;
    if (total > 1) {
      dotsEl = document.createElement('div');
      dotsEl.className = 'dots';
      photos.forEach(() => dotsEl.appendChild(document.createElement('span')));
      scene.appendChild(dotsEl);
    }

    prevBtn.hidden = total <= 1;
    nextBtn.hidden = total <= 1;

    applySlideStates();
    updateDots();
  }

  function applySlideStates() {
    const slides = scene.querySelectorAll('.slide');
    const prevIndex = (current - 1 + total) % total;
    slides.forEach((slide, index) => {
      slide.classList.remove('is-active', 'is-prev', 'is-next');
      if (index === current) {
        slide.classList.add('is-active');
      } else if (index === prevIndex) {
        slide.classList.add('is-prev');
      } else {
        slide.classList.add('is-next');
      }
    });
  }

  function updateDots() {
    if (!dotsEl) return;
    dotsEl.querySelectorAll('span').forEach((dot, index) => {
      dot.classList.toggle('is-active', index === current);
    });
  }

  function goTo(index) {
    if (total === 0) return;
    current = (index + total) % total;
    applySlideStates();
    updateDots();
  }

  prevBtn.addEventListener('click', () => goTo(current - 1));
  nextBtn.addEventListener('click', () => goTo(current + 1));

  scene.addEventListener('click', (event) => {
    if (didSwipe) {
      didSwipe = false;
      return;
    }
    if (total <= 1 || event.target.closest('button')) return;
    const rect = scene.getBoundingClientRect();
    const x = event.clientX - rect.left;
    goTo(x < rect.width / 2 ? current - 1 : current + 1);
  });

  scene.addEventListener('touchstart', (event) => {
    touchStartX = event.changedTouches[0].clientX;
  }, { passive: true });

  scene.addEventListener('touchend', (event) => {
    if (touchStartX === null || total <= 1) {
      touchStartX = null;
      return;
    }
    const dx = event.changedTouches[0].clientX - touchStartX;
    touchStartX = null;
    if (Math.abs(dx) < SWIPE_THRESHOLD_PX) return;
    didSwipe = true;
    goTo(dx < 0 ? current + 1 : current - 1);
  });

  function setupAudio(src) {
    bgAudio.src = src;
    soundToggle.hidden = false;
    if (audioReady) return;
    audioReady = true;

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

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // ---------------------------------------------------------------
  // Subir foto
  // ---------------------------------------------------------------
  uploadForm.addEventListener('submit', (event) => {
    event.preventDefault();

    const pin = uploadPinInput.value.trim();
    const file = uploadFileInput.files[0];
    const caption = uploadCaptionInput.value.trim();

    if (!file) {
      uploadStatus.textContent = 'Elegi una foto primero.';
      return;
    }

    const submitBtn = uploadForm.querySelector('.upload__submit');
    submitBtn.disabled = true;
    uploadStatus.textContent = 'Subiendo...';

    const formData = new FormData();
    formData.append('pin', pin);
    formData.append('file', file);
    formData.append('caption', caption);

    fetch('/api/photos', { method: 'POST', body: formData })
      .then(async (res) => {
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body.error || 'No se pudo subir la foto.');
        sessionStorage.setItem(PIN_STORAGE_KEY, pin);
        uploadStatus.textContent = '¡Lista! Ya se agrego a la galeria.';
        uploadForm.reset();
        uploadPinInput.value = pin;
        refreshMediaAndShowGallery();
      })
      .catch((err) => {
        uploadStatus.textContent = err.message;
      })
      .finally(() => {
        submitBtn.disabled = false;
      });
  });

  function refreshMediaAndShowGallery() {
    fetch('/api/media')
      .then((res) => res.json())
      .then((data) => {
        applyMediaData(data);
        slidesBuilt = false;
        ensureSlidesBuilt();
        goTo(mediaData.photos.length - 1);
        showScreen(scene);
      })
      .catch(() => {});
  }
})();
