/**
 * Video Library - Custom video functionality for lazy loading, play/pause controls, and accessibility
 * Features: lazy loading, play/pause buttons, scroll triggers, reduced motion support
 *
 * Performance Optimizations for CDN Usage:
 * - Early exit if no videos present (no DOM manipulation or event listeners)
 * - Minimal object creation on pages without videos
 * - Conditional resize listener only for desktop-only videos
 * - Zero CSS class dependencies - uses only data attributes
 *
 * Safe for loading on every page via CDN - will not impact performance on pages without videos.
 */

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

          // Hide associated play/pause buttons using data attributes only
          const videoId = video.getAttribute("data-video");
          const playButton = document.querySelector(
            `[data-video-playback="play"][data-video="${videoId}"]`
          );
          const pauseButton = document.querySelector(
            `[data-video-playback="pause"][data-video="${videoId}"]`
          );

          if (playButton) playButton.style.display = "none";
          if (pauseButton) pauseButton.style.display = "none";
        });
    } else {
      // Show videos and controls on larger screens
      document
        .querySelectorAll('video[data-video-desktop-only="true"]')
        .forEach((video) => {
          video.style.display = "";

          // Show associated play/pause buttons using data attributes only
          const videoId = video.getAttribute("data-video");
          const playButton = document.querySelector(
            `[data-video-playback="play"][data-video="${videoId}"]`
          );
          const pauseButton = document.querySelector(
            `[data-video-playback="pause"][data-video="${videoId}"]`
          );

          if (playButton) playButton.style.display = "";
          if (pauseButton) pauseButton.style.display = "";
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
   * Setup play/pause button controls for videos
   */
  setupVideoControls() {
    const videos = document.querySelectorAll("video[data-video]");

    videos.forEach((video) => {
      this.handlePlaybackButtons(video);
    });
  }

  /**
   * Setup autoplay for videos that should play immediately when loaded
   * @param {HTMLVideoElement} video - The video element
   */
  setupAutoplay(video) {
    video.addEventListener("canplaythrough", () => {
      if (!this.prefersReducedMotion) {
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
                video.currentTime = 0;
                video.play();
              }
            } catch (error) {
              console.error(error);
            }
          } else {
            // Pause on scroll out for scroll-in-play videos
            video.pause();
          }
        });
      },
      { threshold: this.options.scrollTriggerThreshold }
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

    // Find play and pause buttons using data attributes only
    const playButton = document.querySelector(
      `[data-video-playback="play"][data-video="${videoId}"]`
    );
    const pauseButton = document.querySelector(
      `[data-video-playback="pause"][data-video="${videoId}"]`
    );

    if (!playButton || !pauseButton) return;

    // Helper function to toggle button visibility
    const toggleButtonVisibility = (isPlaying) => {
      playButton.style.display = isPlaying ? "none" : "flex";
      pauseButton.style.display = isPlaying ? "flex" : "none";
    };

    // Set initial button state
    toggleButtonVisibility(!video.paused);

    // Event listener for play button
    playButton.addEventListener("click", async (event) => {
      event.stopPropagation();
      try {
        await this.lazyLoadVideo(video);
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
