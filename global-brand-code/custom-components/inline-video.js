class VideoLibrary {
  constructor(options = {}) {
    this.options = {
      rootMargin: options.rootMargin || "300px",
      threshold: options.threshold || 0,
      scrollTriggerThreshold: options.scrollTriggerThreshold || 0.5,
      debug: options.debug || false,
      ...options,
    };

    this.prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    this.videoObserver = null;
    this.scrollObservers = new Map();

    this.init();
  }

  init() {
    // Early exit if no videos are present - optimizes performance for pages without videos
    const videos = document.querySelectorAll("video[data-video]");
    if (videos.length === 0) {
      if (this.options.debug) {
        console.log(
          "VideoLibrary: No videos found on page, skipping initialization."
        );
      }
      return;
    }

    if (this.prefersReducedMotion) {
      console.log("User prefers reduced motion. Videos will not auto-play.");
    }

    // Remove desktop-only videos on small screens
    this.removeDesktopOnlyVideos();

    // Initialize video functionality
    this.setupLazyLoading();
    this.setupVideoControls();
    this.setupHoverPlay();
    // Only add resize listener if desktop-only videos are present
    const desktopOnlyVideos = document.querySelectorAll(
      'video[data-video-desktop-only="true"]'
    );
    if (desktopOnlyVideos.length > 0) {
      window.addEventListener("resize", () => this.removeDesktopOnlyVideos());
    }
  }

  /**
   * Remove desktop-only videos on small screens and hide their controls
   */
  removeDesktopOnlyVideos() {
    if (window.innerWidth <= 991) {
      document
        .querySelectorAll('video[data-video-desktop-only="true"]')
        .forEach((video) => {
          // Hide the video but keep the poster visible
          video.style.display = "none";

          // Hide associated playback controls wrapper using DOM relationship
          const videoId = video.getAttribute("data-video");
          const videoContainer = video.parentElement;
          const playbackWrapper = videoContainer
            ? videoContainer.querySelector('[data-video-playback="wrapper"]')
            : null;

          if (playbackWrapper) {
            playbackWrapper.style.display = "none";
            playbackWrapper.style.visibility = "hidden";
            playbackWrapper.setAttribute("aria-hidden", "true");
          } else {
            // Fallback: hide individual buttons if wrapper not found
            const playButton = document.querySelector(
              `[data-video-playback="play"][data-video="${videoId}"]`
            );
            const pauseButton = document.querySelector(
              `[data-video-playback="pause"][data-video="${videoId}"]`
            );

            if (playButton) {
              playButton.style.display = "none";
              playButton.style.visibility = "hidden";
              playButton.setAttribute("aria-hidden", "true");
              playButton.setAttribute("tabindex", "-1");
            }
            if (pauseButton) {
              pauseButton.style.display = "none";
              pauseButton.style.visibility = "hidden";
              pauseButton.setAttribute("aria-hidden", "true");
              pauseButton.setAttribute("tabindex", "-1");
            }
          }
        });
    } else {
      // Show videos and controls on larger screens
      document
        .querySelectorAll('video[data-video-desktop-only="true"]')
        .forEach((video) => {
          video.style.display = "";

          // Show associated playback controls wrapper using DOM relationship
          const videoId = video.getAttribute("data-video");
          const videoContainer = video.parentElement;
          const playbackWrapper = videoContainer
            ? videoContainer.querySelector('[data-video-playback="wrapper"]')
            : null;

          if (playbackWrapper) {
            playbackWrapper.style.display = "";
            playbackWrapper.style.visibility = "";
            playbackWrapper.setAttribute("aria-hidden", "false");
          } else {
            // Fallback: show individual buttons if wrapper not found
            const playButton = document.querySelector(
              `[data-video-playback="play"][data-video="${videoId}"]`
            );
            const pauseButton = document.querySelector(
              `[data-video-playback="pause"][data-video="${videoId}"]`
            );

            if (playButton) {
              playButton.style.display = "";
              playButton.style.visibility = "";
              playButton.setAttribute("aria-hidden", "false");
              playButton.removeAttribute("tabindex");
            }
            if (pauseButton) {
              pauseButton.style.display = "";
              pauseButton.style.visibility = "";
              pauseButton.setAttribute("aria-hidden", "false");
              pauseButton.removeAttribute("tabindex");
            }
          }
        });
    }
  }

  /**
   * Setup lazy loading for all videos with data-video attribute
   */
  setupLazyLoading() {
    const videos = document.querySelectorAll("video[data-video]");

    if (videos.length === 0) return;

    const observerOptions = {
      root: null,
      rootMargin: this.options.rootMargin,
      threshold: this.options.threshold,
    };

    // Lazy load videos when they intersect
    const videoObserverCallback = (entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const video = entry.target;
          this.lazyLoadVideo(video)
            .then(() => observer.unobserve(video))
            .catch(console.error);
        }
      });
    };

    this.videoObserver = new IntersectionObserver(
      videoObserverCallback,
      observerOptions
    );

    // Start observing videos for lazy loading and handle autoplay behavior
    videos.forEach((video) => {
      const scrollInPlay =
        video.getAttribute("data-video-scroll-in-play") === "true";
      const hoverPlay = video.getAttribute("data-video-hover") === "true";

      // If it's a hover-play video, do nothing here. Its logic is handled in setupHoverPlay.
      if (hoverPlay) {
        return;
      }

      if (this.prefersReducedMotion) {
        video.pause();
      } else if (scrollInPlay) {
        // For scroll-in-play videos, observe both for lazy loading and scroll trigger
        this.videoObserver.observe(video);
        this.setupScrollInPlay(video);
      } else {
        // For regular videos, just observe for lazy loading and autoplay when loaded
        this.videoObserver.observe(video);
        this.setupAutoplay(video);
      }
    });
  }

  /**
   * Lazy load a video by setting the src from data-src
   * @param {HTMLVideoElement} video - The video element to load
   * @returns {Promise} - Resolves when video can play through
   */
  lazyLoadVideo(video) {
    return new Promise((resolve, reject) => {
      const source = video.querySelector("source[data-src]");
      if (source && !source.src) {
        source.src = source.getAttribute("data-src");
        video.load();

        video.addEventListener("canplaythrough", function onCanPlayThrough() {
          video.removeEventListener("canplaythrough", onCanPlayThrough);
          resolve();
        });

        video.addEventListener("error", function onError() {
          video.removeEventListener("error", onError);
          reject(new Error(`Error loading video: ${source.src}`));
        });
      } else {
        resolve(); // Already loaded or source missing
      }
    });
  }

  /**
   * Show the corresponding picture element for a video (with opacity transition)
   * @param {HTMLVideoElement} video - The video element
   */
  showPictureElement(video) {
    const videoId = video.getAttribute("data-video");
    if (!videoId) return;

    const pictureElement = this.findPictureElement(video, videoId);

    if (pictureElement) {
      pictureElement.style.opacity = "1";
      if (this.options.debug) {
        console.log(`Faded in picture element for video: ${videoId}`);
      }
    }
  }

  /**
   * Hide the corresponding picture element for a video (with opacity transition)
   * @param {HTMLVideoElement} video - The video element
   */
  hidePictureElement(video) {
    const videoId = video.getAttribute("data-video");
    if (!videoId) return;

    const pictureElement = this.findPictureElement(video, videoId);

    if (pictureElement) {
      pictureElement.style.opacity = "0";
      if (this.options.debug) {
        console.log(`Faded out picture element for video: ${videoId}`);
      }
    }
  }

  /**
   * Find the picture element associated with a video
   * @param {HTMLVideoElement} video - The video element
   * @param {string} videoId - The video ID to match
   * @returns {HTMLElement|null} - The picture element or null if not found
   */
  findPictureElement(video, videoId) {
    // First, check previous siblings (most common case based on the HTML structure)
    let sibling = video.previousElementSibling;
    while (sibling) {
      if (
        sibling.tagName === "PICTURE" &&
        sibling.getAttribute("data-video-picture") === videoId
      ) {
        return sibling;
      }
      sibling = sibling.previousElementSibling;
    }

    // Fallback: search within the same parent container
    const parent = video.parentElement;
    if (parent) {
      const pictureElement = parent.querySelector(
        `picture[data-video-picture="${videoId}"]`
      );
      if (pictureElement) {
        return pictureElement;
      }
    }

    // Final fallback: document-wide search (least performant but most reliable)
    return document.querySelector(`picture[data-video-picture="${videoId}"]`);
  }

  /**
   * Setup play/pause button controls for videos
   */
  setupVideoControls() {
    const videos = document.querySelectorAll("video[data-video]");

    videos.forEach((video) => {
      this.handlePlaybackButtons(video);
    });
  }

  /**
   * Setup hover-to-play functionality for videos with data-video-hover="true"
   */
  setupHoverPlay() {
    const hoverVideos = document.querySelectorAll(
      'video[data-video-hover="true"]'
    );

    hoverVideos.forEach((video) => {
      const videoId = video.getAttribute("data-video");
      if (!videoId) return;

      const trigger = video.closest(`[data-video-trigger="${videoId}"]`);

      if (trigger) {
        // ✅ ADJUSTED: Target the individual play and pause buttons directly
        // This leaves the wrapper element untouched.
        const videoContainer = video.parentElement;
        if (videoContainer) {
          const playButton = videoContainer.querySelector(
            `[data-video-playback="play"][data-video="${videoId}"]`
          );
          const pauseButton = videoContainer.querySelector(
            `[data-video-playback="pause"][data-video="${videoId}"]`
          );

          // Make the buttons inaccessible since hover is the primary interaction.
          if (playButton) {
            playButton.setAttribute("aria-hidden", "true");
            playButton.setAttribute("tabindex", "-1");
          }
          if (pauseButton) {
            pauseButton.setAttribute("aria-hidden", "true");
            pauseButton.setAttribute("tabindex", "-1");
          }
        }

        // On mouse enter, explicitly hide poster, then lazy load and play
        trigger.addEventListener("mouseenter", async () => {
          if (this.prefersReducedMotion) return;
          try {
            this.hidePictureElement(video); // This ensures the poster is hidden on EVERY hover
            await this.lazyLoadVideo(video);
            video.currentTime = 0;
            video.play();
          } catch (error) {
            console.error(`Error playing hover video ${videoId}:`, error);
          }
        });

        // On mouse leave, pause the video AND show the poster
        trigger.addEventListener("mouseleave", () => {
          video.pause();
          this.showPictureElement(video);
        });
      }
    });
  }
  /**
   * Setup autoplay for videos that should play immediately when loaded
   * @param {HTMLVideoElement} video - The video element
   */
  setupAutoplay(video) {
    video.addEventListener("canplaythrough", () => {
      if (!this.prefersReducedMotion) {
        // ✅ FIX: Hide the poster before playing for standard autoplay videos
        this.hidePictureElement(video);
        video.play().catch(console.error);
      }
    });
  }

  /**
   * Setup scroll-in-play functionality for a video
   * @param {HTMLVideoElement} video - The video element
   */
  setupScrollInPlay(video) {
    const observer = new IntersectionObserver(
      async (entries) => {
        entries.forEach(async (entry) => {
          if (entry.isIntersecting) {
            try {
              // Always lazy load the video
              await this.lazyLoadVideo(video);

              // If reduced motion is preferred, don't play the video
              if (!this.prefersReducedMotion) {
                // ✅ FIX: Hide the poster before playing for scroll-in-play videos
                this.hidePictureElement(video);
                video.currentTime = 0;
                video.play();
              }
            } catch (error) {
              console.error(error);
            }
          }
          // On scroll out, pause the video and show the poster
          else {
            video.pause();
            this.showPictureElement(video);
          }
        });
      },
      {
        threshold: this.options.scrollTriggerThreshold,
      }
    );

    observer.observe(video);
    this.scrollObservers.set(video, observer);
  }

  /**
   * Handle play/pause buttons for a video
   * @param {HTMLVideoElement} video - The video element
   */
  handlePlaybackButtons(video) {
    const videoId = video.getAttribute("data-video");
    const videoContainer = video.parentElement;

    // Find play and pause buttons within the same container first, then fallback to document search
    let playButton = videoContainer
      ? videoContainer.querySelector(
          `[data-video-playback="play"][data-video="${videoId}"]`
        )
      : null;
    let pauseButton = videoContainer
      ? videoContainer.querySelector(
          `[data-video-playback="pause"][data-video="${videoId}"]`
        )
      : null;

    // Fallback to document-wide search if not found in container
    if (!playButton) {
      playButton = document.querySelector(
        `[data-video-playback="play"][data-video="${videoId}"]`
      );
    }
    if (!pauseButton) {
      pauseButton = document.querySelector(
        `[data-video-playback="pause"][data-video="${videoId}"]`
      );
    }

    if (!playButton || !pauseButton) return;

    // Helper function to toggle button visibility with proper accessibility
    const toggleButtonVisibility = (isPlaying) => {
      if (isPlaying) {
        // Hide play button, show pause button
        playButton.style.display = "none";
        playButton.style.visibility = "hidden";
        playButton.setAttribute("aria-hidden", "true");
        playButton.setAttribute("tabindex", "-1");

        pauseButton.style.display = "flex";
        pauseButton.style.visibility = "visible";
        pauseButton.setAttribute("aria-hidden", "false");
        pauseButton.removeAttribute("tabindex");
      } else {
        // Show play button, hide pause button
        playButton.style.display = "flex";
        playButton.style.visibility = "visible";
        playButton.setAttribute("aria-hidden", "false");
        playButton.removeAttribute("tabindex");

        pauseButton.style.display = "none";
        pauseButton.style.visibility = "hidden";
        pauseButton.setAttribute("aria-hidden", "true");
        pauseButton.setAttribute("tabindex", "-1");
      }
    };

    // Set initial button state
    toggleButtonVisibility(!video.paused);

    // Event listener for play button
    playButton.addEventListener("click", async (event) => {
      event.stopPropagation();
      try {
        await this.lazyLoadVideo(video);
        this.hidePictureElement(video); // Hide poster on manual play
        video.play();
        toggleButtonVisibility(true);
      } catch (error) {
        console.error(error);
      }
    });

    // Event listener for pause button
    pauseButton.addEventListener("click", (event) => {
      event.stopPropagation();
      video.pause();
      toggleButtonVisibility(false);
    });

    // Sync button state with video play/pause events
    video.addEventListener("play", () => toggleButtonVisibility(true));
    video.addEventListener("pause", () => toggleButtonVisibility(false));
  }

  /**
   * Play a specific video by its data-video attribute
   * @param {string} videoId - The data-video attribute value
   */
  async playVideo(videoId) {
    const video = document.querySelector(`video[data-video="${videoId}"]`);
    if (!video) {
      console.warn(`Video with id "${videoId}" not found`);
      return;
    }

    try {
      await this.lazyLoadVideo(video);
      if (!this.prefersReducedMotion) {
        this.hidePictureElement(video);
        video.currentTime = 0;
        video.play();
      }
    } catch (error) {
      console.error(`Error playing video ${videoId}:`, error);
    }
  }

  /**
   * Pause a specific video by its data-video attribute
   * @param {string} videoId - The data-video attribute value
   */
  pauseVideo(videoId) {
    const video = document.querySelector(`video[data-video="${videoId}"]`);
    if (!video) {
      console.warn(`Video with id "${videoId}" not found`);
      return;
    }

    video.pause();
  }

  /**
   * Pause all videos
   */
  pauseAllVideos() {
    document.querySelectorAll("video[data-video]").forEach((video) => {
      video.pause();
    });
  }

  /**
   * Destroy the video library and clean up observers
   */
  destroy() {
    if (this.videoObserver) {
      this.videoObserver.disconnect();
    }

    this.scrollObservers.forEach((observer) => {
      observer.disconnect();
    });
    this.scrollObservers.clear();
  }

  /**
   * Reinitialize the video library (useful after DOM changes)
   */
  reinitialize() {
    this.destroy();
    this.init();
  }
}

// Auto-initialize if DOM is already loaded and videos are present
function initializeVideoLibrary() {
  // Quick check before instantiating to avoid unnecessary object creation
  if (document.querySelectorAll("video[data-video]").length > 0) {
    window.videoLibrary = new VideoLibrary();
  } else if (window.VideoLibraryConfig?.debug) {
    console.log(
      "VideoLibrary: No videos detected, skipping auto-initialization."
    );
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeVideoLibrary);
} else {
  initializeVideoLibrary();
}

// Export for module usage
if (typeof module !== "undefined" && module.exports) {
  module.exports = VideoLibrary;
}
