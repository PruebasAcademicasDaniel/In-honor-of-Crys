/**
 * Pagina "Our Story"
 * -------------------
 * Pantallas dentro de la misma carga:
 *  - #cover: portada con imagen, titulo y los dos botones de entrada.
 *  - #photosScreen: "Ver nuestras fotos" -> lista de albumes (incluye un
 *    boton de Vista libro que recorre todo en orden).
 *  - #scene: visor tipo libro (swipe/tap), reutilizado tanto para un
 *    album individual como para la Vista libro completa.
 *  - #uploadScreen: "Configuracion" -> Subir fotos (crear album + subir
 *    dentro de un album) y Eliminar fotos (navegar albumes y borrar).
 *
 * /api/media trae la portada, la cancion y los albumes (cada uno con su
 * lista de fotos). El album sin nombre agrupa las fotos "de base" del
 * repo (media-config.json) y las fotos sueltas subidas antes de que
 * existieran los albumes; esas no se pueden borrar ni se ofrecen como
 * destino de subida, pero si se pueden ver (como album "Fotos").
 */
(function () {
  const PIN_STORAGE_KEY = 'lovePagePin';
  const SWIPE_THRESHOLD_PX = 40;
  const DEFAULT_ALBUM_NAME = 'Fotos';
  const EMPTY_ALBUMS_MSG = 'Todavia no hay fotos. Ve a Configuración para crear un álbum y subir la primera.';
  const EMPTY_ALBUM_PHOTOS_MSG = 'Este álbum todavia no tiene fotos.';

  const HEART_CARD_SVG = `
    <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.6">
      <rect x="4" y="3" width="16" height="18" rx="2"></rect>
      <path d="M12 16.3c-2.7-1.9-4.3-3.4-4.3-5.1a2.3 2.3 0 0 1 4.3-1.4 2.3 2.3 0 0 1 4.3 1.4c0 1.7-1.6 3.2-4.3 5.1z" fill="currentColor" stroke="none"></path>
    </svg>`;

  const TRASH_SVG = `
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M4 7h16"></path>
      <path d="M9 7V4h6v3"></path>
      <path d="M6 7l1 13h10l1-13"></path>
    </svg>`;

  const loader = document.getElementById('loader');

  const coverScreen = document.getElementById('cover');
  const coverImg = document.getElementById('coverImg');
  const coverTitle = document.getElementById('coverTitle');
  const viewPhotosBtn = document.getElementById('viewPhotosBtn');
  const settingsBtn = document.getElementById('settingsBtn');

  const photosScreen = document.getElementById('photosScreen');
  const photosAlbumGrid = document.getElementById('photosAlbumGrid');
  const viewBookBtn = document.getElementById('viewBookBtn');

  const scene = document.getElementById('scene');
  const soundToggle = document.getElementById('soundToggle');
  const bgAudio = document.getElementById('bgAudio');
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');

  const uploadScreen = document.getElementById('uploadScreen');

  const settingsMenuView = document.getElementById('settingsMenuView');
  const goUploadBtn = document.getElementById('goUploadBtn');
  const goDeleteBtn = document.getElementById('goDeleteBtn');

  const albumListView = document.getElementById('albumListView');
  const createAlbumBtn = document.getElementById('createAlbumBtn');
  const albumGrid = document.getElementById('albumGrid');

  const createAlbumView = document.getElementById('createAlbumForm');
  const albumNameInput = document.getElementById('albumName');
  const albumPinInput = document.getElementById('albumPin');
  const createAlbumStatus = document.getElementById('createAlbumStatus');

  const uploadPhotoView = document.getElementById('uploadForm');
  const uploadStatus = document.getElementById('uploadStatus');
  const uploadPinInput = document.getElementById('uploadPin');
  const uploadFileInput = document.getElementById('uploadFile');
  const uploadCaptionInput = document.getElementById('uploadCaption');
  const uploadAlbumLabel = document.getElementById('uploadAlbumLabel');

  const deleteAlbumListView = document.getElementById('deleteAlbumListView');
  const deleteAlbumGrid = document.getElementById('deleteAlbumGrid');

  const deletePhotosView = document.getElementById('deletePhotosView');
  const deletePhotosTitle = document.getElementById('deletePhotosTitle');
  const deletePinInput = document.getElementById('deletePin');
  const deletePhotoGrid = document.getElementById('deletePhotoGrid');
  const deleteStatus = document.getElementById('deleteStatus');

  const SCREENS = [coverScreen, photosScreen, scene, uploadScreen];

  const CONFIG_VIEWS = [
    settingsMenuView, albumListView, createAlbumView, uploadPhotoView,
    deleteAlbumListView, deletePhotosView,
  ];

  let mediaData = { cover: null, albums: [], song: null };
  let currentAlbumName = null;
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
      albums: Array.isArray(data.albums) ? data.albums : [],
      song: data.song || mediaData.song,
    };
  }

  function namedAlbums() {
    return mediaData.albums.filter((album) => album.name);
  }

  function visibleAlbums() {
    return mediaData.albums.filter((album) => album.photos.length > 0);
  }

  function albumDisplayName(album) {
    return album.name || DEFAULT_ALBUM_NAME;
  }

  function renderCover() {
    loader.remove();
    if (mediaData.cover && mediaData.cover.src) {
      coverImg.src = mediaData.cover.src;
    }
    coverTitle.textContent = (mediaData.cover && mediaData.cover.title) || 'Our Story';
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
    SCREENS.forEach((el) => {
      el.hidden = el !== target;
    });
    target.classList.remove('screen-enter');
    // eslint-disable-next-line no-unused-expressions
    void target.offsetWidth;
    target.classList.add('screen-enter');
  }

  function showConfigView(target) {
    CONFIG_VIEWS.forEach((el) => {
      el.hidden = el !== target;
    });
    target.classList.remove('screen-enter');
    void target.offsetWidth;
    target.classList.add('screen-enter');
  }

  settingsBtn.addEventListener('click', () => {
    showConfigView(settingsMenuView);
    showScreen(uploadScreen);
  });

  document.querySelectorAll('[data-back]').forEach((btn) => {
    const targetId = btn.dataset.back || 'cover';
    btn.addEventListener('click', () => showScreen(document.getElementById(targetId)));
  });

  document.querySelectorAll('[data-back-to]').forEach((btn) => {
    btn.addEventListener('click', () => {
      showConfigView(document.getElementById(btn.dataset.backTo));
    });
  });

  // ---------------------------------------------------------------
  // Ver nuestras fotos: lista de albumes + vista libro
  // ---------------------------------------------------------------
  viewPhotosBtn.addEventListener('click', () => {
    renderPhotosAlbumGrid();
    showScreen(photosScreen);
  });

  viewBookBtn.addEventListener('click', () => {
    openScene(buildBookSlides(), EMPTY_ALBUMS_MSG);
  });

  function renderPhotosAlbumGrid() {
    photosAlbumGrid.innerHTML = '';
    const albums = visibleAlbums();
    if (albums.length === 0) {
      photosAlbumGrid.appendChild(emptyHint(EMPTY_ALBUMS_MSG));
      return;
    }
    albums.forEach((album) => {
      const card = buildAlbumCard({ name: albumDisplayName(album), photos: album.photos }, () => {
        openScene(buildAlbumSlides(album), EMPTY_ALBUM_PHOTOS_MSG);
      });
      photosAlbumGrid.appendChild(card);
    });
  }

  // ---------------------------------------------------------------
  // Menu de configuracion
  // ---------------------------------------------------------------
  goUploadBtn.addEventListener('click', () => {
    renderAlbumGrid();
    showConfigView(albumListView);
  });

  goDeleteBtn.addEventListener('click', () => {
    renderDeleteAlbumGrid();
    showConfigView(deleteAlbumListView);
  });

  function buildAlbumCard(album, onClick) {
    const card = document.createElement('button');
    card.className = 'album-card';
    card.type = 'button';
    const count = album.photos.length;
    card.innerHTML = `
      <span class="album-card__icon">${HEART_CARD_SVG}</span>
      <span class="album-card__name">${escapeHtml(album.name)}</span>
      <span class="album-card__count">${count} foto${count === 1 ? '' : 's'}</span>
    `;
    card.addEventListener('click', onClick);
    return card;
  }

  function emptyHint(text) {
    const p = document.createElement('p');
    p.className = 'upload__status';
    p.textContent = text;
    return p;
  }

  function prefillPin(input) {
    const storedPin = sessionStorage.getItem(PIN_STORAGE_KEY);
    if (storedPin) input.value = storedPin;
  }

  // ---------------------------------------------------------------
  // Subir fotos: lista de albumes + crear album + subir foto
  // ---------------------------------------------------------------
  function renderAlbumGrid() {
    albumGrid.innerHTML = '';
    const albums = namedAlbums();
    if (albums.length === 0) {
      albumGrid.appendChild(emptyHint('Todavia no hay albumes. ¡Crea el primero!'));
      return;
    }
    albums.forEach((album) => {
      albumGrid.appendChild(buildAlbumCard(album, () => {
        currentAlbumName = album.name;
        uploadStatus.textContent = '';
        uploadAlbumLabel.textContent = `Álbum: ${album.name}`;
        prefillPin(uploadPinInput);
        showConfigView(uploadPhotoView);
      }));
    });
  }

  createAlbumBtn.addEventListener('click', () => {
    createAlbumStatus.textContent = '';
    createAlbumView.reset();
    prefillPin(albumPinInput);
    showConfigView(createAlbumView);
  });

  createAlbumView.addEventListener('submit', (event) => {
    event.preventDefault();

    const name = albumNameInput.value.trim();
    const pin = albumPinInput.value.trim();

    if (!name) {
      createAlbumStatus.textContent = 'Ponle un nombre al album.';
      return;
    }

    const submitBtn = createAlbumView.querySelector('.upload__submit');
    submitBtn.disabled = true;
    createAlbumStatus.textContent = 'Creando...';

    const formData = new FormData();
    formData.append('name', name);
    formData.append('pin', pin);

    fetch('/api/albums', { method: 'POST', body: formData })
      .then(async (res) => {
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body.error || 'No se pudo crear el album.');
        sessionStorage.setItem(PIN_STORAGE_KEY, pin);
        return fetch('/api/media').then((r) => r.json());
      })
      .then((data) => {
        applyMediaData(data);
        renderAlbumGrid();
        showConfigView(albumListView);
      })
      .catch((err) => {
        createAlbumStatus.textContent = err.message;
      })
      .finally(() => {
        submitBtn.disabled = false;
      });
  });

  uploadPhotoView.addEventListener('submit', (event) => {
    event.preventDefault();

    const pin = uploadPinInput.value.trim();
    const file = uploadFileInput.files[0];
    const caption = uploadCaptionInput.value.trim();

    if (!file) {
      uploadStatus.textContent = 'Elegi una foto primero.';
      return;
    }
    if (!currentAlbumName) {
      uploadStatus.textContent = 'Elegi un album primero.';
      return;
    }

    const submitBtn = uploadPhotoView.querySelector('.upload__submit');
    submitBtn.disabled = true;
    uploadStatus.textContent = 'Subiendo...';

    const formData = new FormData();
    formData.append('pin', pin);
    formData.append('file', file);
    formData.append('caption', caption);
    formData.append('album', currentAlbumName);

    fetch('/api/photos', { method: 'POST', body: formData })
      .then(async (res) => {
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body.error || 'No se pudo subir la foto.');
        sessionStorage.setItem(PIN_STORAGE_KEY, pin);
        uploadStatus.textContent = '¡Lista! Ya se agrego al album.';
        uploadPhotoView.reset();
        uploadPinInput.value = pin;
        return fetch('/api/media').then((r) => r.json());
      })
      .then((data) => {
        if (data) applyMediaData(data);
      })
      .catch((err) => {
        uploadStatus.textContent = err.message;
      })
      .finally(() => {
        submitBtn.disabled = false;
      });
  });

  // ---------------------------------------------------------------
  // Eliminar fotos: lista de albumes + fotos del album
  // ---------------------------------------------------------------
  function renderDeleteAlbumGrid() {
    deleteAlbumGrid.innerHTML = '';
    const albums = namedAlbums();
    if (albums.length === 0) {
      deleteAlbumGrid.appendChild(emptyHint('Todavia no hay albumes con fotos.'));
      return;
    }
    albums.forEach((album) => {
      deleteAlbumGrid.appendChild(buildAlbumCard(album, () => {
        deletePhotosTitle.textContent = album.name;
        deleteStatus.textContent = '';
        prefillPin(deletePinInput);
        renderDeletePhotoGrid(album);
        showConfigView(deletePhotosView);
      }));
    });
  }

  function renderDeletePhotoGrid(album) {
    deletePhotoGrid.innerHTML = '';
    if (album.photos.length === 0) {
      deletePhotoGrid.appendChild(emptyHint(EMPTY_ALBUM_PHOTOS_MSG));
      return;
    }
    album.photos.forEach((photo) => {
      const card = document.createElement('button');
      card.className = 'photo-card';
      card.type = 'button';
      card.innerHTML = `
        <img src="${photo.src}" alt="${escapeHtml(photo.caption || '')}">
        <span class="photo-card__delete">${TRASH_SVG}</span>
      `;
      card.addEventListener('click', () => confirmDeletePhoto(photo, card, album));
      deletePhotoGrid.appendChild(card);
    });
  }

  function confirmDeletePhoto(photo, cardEl, album) {
    const pin = deletePinInput.value.trim();
    if (!pin) {
      deleteStatus.textContent = 'Ingresa el PIN primero.';
      return;
    }
    if (!window.confirm('¿Borrar esta foto? No se puede deshacer.')) return;

    deleteStatus.textContent = 'Borrando...';
    const params = new URLSearchParams({ publicId: photo.publicId, pin });

    fetch(`/api/photos?${params.toString()}`, { method: 'DELETE' })
      .then(async (res) => {
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body.error || 'No se pudo borrar la foto.');
        sessionStorage.setItem(PIN_STORAGE_KEY, pin);
        cardEl.remove();
        album.photos = album.photos.filter((p) => p.publicId !== photo.publicId);
        deleteStatus.textContent = 'Foto borrada.';
        return fetch('/api/media').then((r) => r.json());
      })
      .then((data) => {
        if (data) applyMediaData(data);
      })
      .catch((err) => {
        deleteStatus.textContent = err.message;
      });
  }

  // ---------------------------------------------------------------
  // Visor de fotos (album individual o vista libro completa)
  // ---------------------------------------------------------------
  function buildBookSlides() {
    const slides = [];
    visibleAlbums().forEach((album) => {
      if (album.name) {
        slides.push({ type: 'divider', name: album.name });
      }
      album.photos.forEach((photo) => {
        slides.push({ type: 'photo', src: photo.src, caption: photo.caption });
      });
    });
    return slides;
  }

  function buildAlbumSlides(album) {
    return album.photos.map((photo) => ({ type: 'photo', src: photo.src, caption: photo.caption }));
  }

  function openScene(slideData, emptyMessage) {
    scene.querySelectorAll('.scene__empty, .slide, .dots').forEach((el) => el.remove());

    if (slideData.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'scene__empty';
      empty.textContent = emptyMessage;
      scene.appendChild(empty);
      total = 0;
      prevBtn.hidden = true;
      nextBtn.hidden = true;
    } else {
      buildSlides(slideData);
      if (mediaData.song && mediaData.song.src) setupAudio(mediaData.song.src);
    }
    showScreen(scene);
  }

  function buildSlides(slides) {
    current = 0;
    total = slides.length;

    slides.forEach((data, index) => {
      const slide = document.createElement('div');
      slide.dataset.index = String(index);

      if (data.type === 'divider') {
        slide.className = 'slide slide--divider';
        slide.innerHTML = `
          <div class="divider">
            <span class="divider__icon">${HEART_CARD_SVG}</span>
            <h3 class="divider__title">${escapeHtml(data.name)}</h3>
          </div>
        `;
      } else {
        slide.className = 'slide';

        const img = document.createElement('img');
        img.className = 'slide__img';
        img.src = data.src;
        img.alt = data.caption || 'Foto';

        const scrim = document.createElement('div');
        scrim.className = 'slide__scrim';

        slide.appendChild(img);
        slide.appendChild(scrim);

        if (data.caption && data.caption.trim() !== '') {
          const caption = document.createElement('div');
          caption.className = 'caption';
          caption.innerHTML = `
            <div class="caption__mark"></div>
            <p class="caption__text">${escapeHtml(data.caption)}</p>
          `;
          slide.appendChild(caption);
        }
      }

      scene.appendChild(slide);
    });

    dotsEl = null;
    if (total > 1) {
      dotsEl = document.createElement('div');
      dotsEl.className = 'dots';
      slides.forEach(() => dotsEl.appendChild(document.createElement('span')));
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
})();