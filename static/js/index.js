(() => {
  const main = document.querySelector('main');
  if (main) {
    [
      '#overview',
      '#method',
      '#video-comparison',
      '#results',
      '#ablation',
      '#more',
      '#more-comparison',
      '.discussion-section',
      '#bibtex',
    ].forEach((selector) => {
      const section = main.querySelector(selector);
      if (section) main.appendChild(section);
    });
  }

  const navToggle = document.querySelector('.nav-toggle');
  const navLinks = document.querySelector('.nav-links');

  if (navToggle && navLinks) {
    navToggle.addEventListener('click', () => {
      const isOpen = navLinks.classList.toggle('is-open');
      navToggle.setAttribute('aria-expanded', String(isOpen));
    });

    navLinks.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => {
        navLinks.classList.remove('is-open');
        navToggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  const additionalComparisonPages = [
    [['01', '10'], ['03', '04'], ['13', '02'], ['15', '08']],
    [['01', '09'], ['03', '05'], ['13', '03'], ['15', '14']],
    [['01', '17'], ['03', '13'], ['13', '06'], ['15', '11']],
    [['01', '18'], ['03', '15'], ['13', '01'], ['15', '13']],
  ];

  const comparisonVideo = (source, poster) => `
    <video muted loop playsinline controls preload="none" data-autoplay data-poster="${poster}">
      <source data-src="${source}" type="video/mp4">
    </video>`;

  const comparisonRow = (contentId, styleId) => {
    const prefix = `content${contentId}-style${styleId}`;
    const styleExtension = ['05', '10'].includes(styleId) ? 'webp' : 'png';
    const methodVideo = (method) => comparisonVideo(
      `./static/videos/more-comparison-${prefix}-${method}.mp4`,
      `./static/media/poster-more-comparison-${prefix}-${method}.jpg`,
    );
    return `
      <div class="comparison-row" aria-label="Content ${contentId} and style ${styleId} comparison">
        ${comparisonVideo(`./static/videos/more-source-content${contentId}.mp4`, `./static/media/poster-more-source-content${contentId}.jpg`)}
        <div class="comparison-style"><img src="./static/media/more-style${styleId}.${styleExtension}" alt="Style ${styleId} reference image"></div>
        ${methodVideo('anyv2v')}
        ${methodVideo('stylemaster')}
        ${methodVideo('bernini')}
        ${methodVideo('dreamstyle')}
        ${comparisonVideo(`./static/videos/more-ours-${prefix}.mp4`, `./static/media/poster-more-ours-${prefix}.jpg`)}
      </div>`;
  };

  document.querySelectorAll('[data-comparison-page]').forEach((slide) => {
    const pageIndex = Number(slide.dataset.comparisonPage) - 1;
    const pairs = additionalComparisonPages[pageIndex];
    if (!pairs) return;
    slide.innerHTML = `
      <div class="comparison-scroller" tabindex="0" aria-label="Scrollable additional video comparison table, page ${pageIndex + 2}">
        <div class="comparison-table">
          <div class="comparison-header" aria-hidden="true">
            <span>Source</span><span>Style</span><span>AnyV2V</span><span>StyleMaster</span>
            <span>Bernini</span><span>DreamStyle</span><span>Ours</span>
          </div>
          ${pairs.map(([contentId, styleId]) => comparisonRow(contentId, styleId)).join('')}
        </div>
      </div>`;
  });

  const videos = [...document.querySelectorAll('video[data-autoplay]')];
  const motionToggle = document.querySelector('#motion-toggle');
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let motionPaused = prefersReducedMotion.matches;

  const hydrateVideo = (video) => {
    if (video.dataset.loaded === 'true') return;

    if (video.dataset.poster) {
      video.poster = video.dataset.poster;
      delete video.dataset.poster;
    }

    video.querySelectorAll('source[data-src]').forEach((source) => {
      source.src = source.dataset.src;
      delete source.dataset.src;
    });

    video.dataset.loaded = 'true';
    video.preload = 'metadata';
    video.load();
  };

  const setMotionButton = () => {
    if (!motionToggle) return;
    motionToggle.setAttribute('aria-pressed', String(motionPaused));
    motionToggle.textContent = motionPaused ? 'Play motion' : 'Pause motion';
  };

  const playVideo = (video) => {
    if (motionPaused) return;
    hydrateVideo(video);
    const playPromise = video.play();
    if (playPromise) playPromise.catch(() => {});
  };

  const isVideoVisible = (video) => {
    if (video.closest('.result-slide[aria-hidden="true"]')) return false;
    const rect = video.getBoundingClientRect();
    return rect.bottom > 0
      && rect.top < window.innerHeight
      && rect.right > 0
      && rect.left < window.innerWidth;
  };

  const loadObserver = 'IntersectionObserver' in window
    ? new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting
              && !entry.target.closest('.result-slide[aria-hidden="true"]')) {
            hydrateVideo(entry.target);
            loadObserver.unobserve(entry.target);
          }
        });
      }, { rootMargin: '500px 0px', threshold: 0 })
    : null;

  const observer = 'IntersectionObserver' in window
    ? new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting
              && entry.intersectionRatio >= 0.2
              && !entry.target.closest('.result-slide[aria-hidden="true"]')) {
            playVideo(entry.target);
          } else {
            entry.target.pause();
          }
        });
      }, { threshold: [0, 0.2, 0.6] })
    : null;

  videos.forEach((video) => {
    video.muted = true;
    video.playsInline = true;
    if (loadObserver) loadObserver.observe(video);
    if (observer) observer.observe(video);
    else {
      hydrateVideo(video);
      playVideo(video);
    }
    ['pointerdown', 'focus', 'mouseenter'].forEach((eventName) => {
      video.addEventListener(eventName, () => hydrateVideo(video), { once: true });
    });
  });

  if (motionPaused) videos.forEach((video) => video.pause());
  setMotionButton();

  if (motionToggle) {
    motionToggle.addEventListener('click', () => {
      motionPaused = !motionPaused;
      if (motionPaused) {
        videos.forEach((video) => video.pause());
      } else {
        videos.forEach((video) => {
          if (isVideoVisible(video)) playVideo(video);
        });
      }
      setMotionButton();
    });
  }

  document.querySelectorAll('[data-carousel]').forEach((carousel) => {
    const track = carousel.querySelector('.carousel-track');
    const viewport = carousel.querySelector('.carousel-viewport');
    const slides = [...carousel.querySelectorAll('.result-slide')];
    const dots = [...carousel.querySelectorAll('[data-slide]')];
    const previousButton = carousel.querySelector('.carousel-prev');
    const nextButton = carousel.querySelector('.carousel-next');
    let currentSlide = 0;
    let touchStartX = null;

    const showSlide = (requestedIndex) => {
      currentSlide = (requestedIndex + slides.length) % slides.length;
      track.style.transform = `translateX(-${currentSlide * 100}%)`;

      slides.forEach((slide, index) => {
        const isActive = index === currentSlide;
        slide.classList.toggle('is-active', isActive);
        slide.setAttribute('aria-hidden', String(!isActive));
        slide.inert = !isActive;
        slide.querySelectorAll('video').forEach((video) => {
          if (!isActive) video.pause();
          else if (isVideoVisible(video)) playVideo(video);
        });
      });

      dots.forEach((dot, index) => {
        const isActive = index === currentSlide;
        dot.classList.toggle('is-active', isActive);
        if (isActive) dot.setAttribute('aria-current', 'true');
        else dot.removeAttribute('aria-current');
      });
    };

    previousButton?.addEventListener('click', () => showSlide(currentSlide - 1));
    nextButton?.addEventListener('click', () => showSlide(currentSlide + 1));
    dots.forEach((dot) => {
      dot.addEventListener('click', () => showSlide(Number(dot.dataset.slide)));
    });

    viewport?.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        showSlide(currentSlide - 1);
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        showSlide(currentSlide + 1);
      }
    });

    viewport?.addEventListener('touchstart', (event) => {
      touchStartX = event.changedTouches[0]?.clientX ?? null;
    }, { passive: true });
    viewport?.addEventListener('touchend', (event) => {
      if (touchStartX === null) return;
      const touchEndX = event.changedTouches[0]?.clientX ?? touchStartX;
      const delta = touchEndX - touchStartX;
      touchStartX = null;
      if (Math.abs(delta) < 48) return;
      showSlide(currentSlide + (delta < 0 ? 1 : -1));
    }, { passive: true });

    showSlide(0);
  });

  const copyButton = document.querySelector('#copy-bibtex');
  const bibtex = document.querySelector('#bibtex-code');

  const copyText = async (text) => {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return;
    }

    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    textarea.remove();
  };

  if (copyButton && bibtex) {
    copyButton.addEventListener('click', async () => {
      const originalLabel = copyButton.textContent;
      try {
        await copyText(bibtex.textContent.trim());
        copyButton.textContent = 'Copied';
      } catch {
        copyButton.textContent = 'Copy failed';
      }
      window.setTimeout(() => {
        copyButton.textContent = originalLabel;
      }, 1600);
    });
  }
})();
