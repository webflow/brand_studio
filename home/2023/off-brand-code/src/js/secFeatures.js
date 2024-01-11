import gsap from "gsap";

export function initFeaturesStates() {
  const duration = 0;

  const featureTabs = document.querySelectorAll("[data-features-tab]");

  featureTabs.forEach((tab) => {
    const isActive = tab.getAttribute("data-features-tab") === "active";
    const tabReveal = tab.querySelector("[data-features-tab-reveal]");
    const progressTrack = tab.querySelector(
      "[data-feature-tab-progress-track]",
    );
    const progressBarTip = tab.querySelector(
      "[data-feature-tab-progress-fill-tip]",
    );

    if (!tabReveal || !progressTrack) return;

    gsap.to(progressBarTip, {
      autoAlpha: 0,
    });

    if (isActive) {
      gsap.to(tabReveal, {
        height: "auto",
        autoAlpha: 1,
        clipPath: "inset(0% 0% 0% 0%)",
        duration: duration,
        ease: "power2.inOut",
      });

      gsap.to(progressTrack, {
        scaleX: 1,
        autoAlpha: 1,
        duration: duration,
        ease: "power2.inOut",
      });
    } else {
      gsap.to(tabReveal, {
        height: 0,
        autoAlpha: 0,
        clipPath: "inset(0% 0% 100% 0%)",
        duration: duration,
        ease: "power2.inOut",
      });

      gsap.to(progressTrack, {
        scaleX: 0,
        autoAlpha: 0,
        duration: duration,
        ease: "power2.inOut",
      });
    }
  });
}

export function initFeaturesVideoLoad() {
  return new Promise((resolve) => {
    const videos = document.querySelectorAll("[data-features-video-src]");
    let loadedVideos = 0;

    videos.forEach((video) => {
      const source = video.querySelector("source");
      const videoUrl = video.getAttribute("data-video-url");

      source.src = videoUrl;
      video.load(); // Load the new video source

      video.onloadeddata = () => {
        loadedVideos++;
        if (loadedVideos === videos.length) {
          resolve(); // Resolve the Promise when all videos have loaded.
        }
      };
    });
  });
}

// global symbol, symbols are usefull to attach stuffs to stuff without fearing conflicts
const VIDEO_EVENT = Symbol();

// refactored
function initFeatureTabs() {
  const featureTabs = Array.from(
    document.querySelectorAll("[data-features-tab]"),
  );
  const featureTargets = document.querySelectorAll("[data-features-target]");
  let duration = "0.6";
  let previousTimeUpdateListener = null;
  let previousVideoElement = null;

  // track video progress with blue line / toggle tab change
  function updateProgressBar(tab, videoElement) {
    const progressBarFill = tab.querySelector(
      "[data-feature-tab-progress-fill]",
    );
    const progressBarTip = tab.querySelector(
      "[data-feature-tab-progress-fill-tip]",
    );
    let progress = videoElement.currentTime / videoElement.duration;
    gsap.to(progressBarFill, {
      scaleX: progress,
      scaleY: 1,
      ease: "none",
      onComplete: () => {
        // make sure this runs once and remove the event directly
        if (progress === 1 && videoElement[VIDEO_EVENT]) {
          videoElement.removeEventListener(
            "timeupdate",
            videoElement[VIDEO_EVENT],
          );
          delete videoElement[VIDEO_EVENT];

          switchToNextTab(tab);
        }
      },
    });
    gsap.to(progressBarTip, {
      autoAlpha: 1,
      duration: 5,
    });

    // if (progress === 1) switchToNextTab(tab);
  }

  // function to toggle tab change
  function switchToNextTab(currentTab) {
    let currentIndex = featureTabs.findIndex((tab) => tab === currentTab);
    let nextIndex = (currentIndex + 1) % featureTabs.length;
    let nextTab = featureTabs[nextIndex];
    nextTab.click();
  }

  // active / inactive tab states
  featureTabs.forEach((innerTab) => {
    const triggerValue = innerTab.getAttribute("data-features-trigger");
    const target = Array.from(featureTargets).find(
      (target) => target.getAttribute("data-features-target") === triggerValue,
    );
    const videoElement = target.querySelector("[data-features-video-src]");

    if (innerTab.getAttribute("data-features-tab") === "active") {
      gsap.set(innerTab.querySelector("[data-feature-tab-progress-track]"), {
        scaleX: 1,
        autoAlpha: 1,
        duration: duration,
        ease: "power2.inOut",
      });

      if (videoElement) {
        const timeUpdateListener = () =>
          updateProgressBar(innerTab, videoElement);
        videoElement.addEventListener("timeupdate", timeUpdateListener);
        previousTimeUpdateListener = timeUpdateListener;
        previousVideoElement = videoElement;
      }
    } else {
      gsap.set(innerTab.querySelector("[data-features-tab-reveal]"), {
        height: 0,
        autoAlpha: 0,
        clipPath: "inset(0% 0% 100% 0%)",
      });
      gsap.set(innerTab.querySelector("[data-feature-tab-progress-track]"), {
        scaleX: 0,
        autoAlpha: 0,
      });
    }
  });

  // on change of a tab
  featureTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const triggerValue = tab.getAttribute("data-features-trigger");

      featureTargets.forEach((target) => {
        const videoElement = target.querySelector("[data-features-video-src]");

        // for every click, remove all videos events
        if (videoElement[VIDEO_EVENT]) {
          videoElement.removeEventListener(
            "timeupdate",
            videoElement[VIDEO_EVENT],
          );
          delete videoElement[VIDEO_EVENT];
        }

        if (target.getAttribute("data-features-target") === triggerValue) {
          gsap.to(target, {
            display: "block",
            autoAlpha: 1,
            // duration: 0.2,
            // ease: "power2.inOut",
            onComplete: function () {
              if (videoElement) {
                videoElement.currentTime = 0;
                videoElement.play();

                // add event to active video
                const timeUpdateListener = () =>
                  updateProgressBar(tab, videoElement);
                videoElement[VIDEO_EVENT] = timeUpdateListener;
                videoElement.addEventListener("timeupdate", timeUpdateListener);
              }
            },
          });
        } else {
          gsap.to(target, {
            autoAlpha: 0,
            duration: 0.2,
            // ease: "power2.inOut",
            onComplete: function () {
              gsap.to(target, { display: "none" });
              if (videoElement) {
                videoElement.pause();
                videoElement.currentTime = 0;
              }
            },
          });
        }
      });

      featureTabs.forEach((innerTab) => {
        const progressBarFill = innerTab.querySelector(
          "[data-feature-tab-progress-fill]",
        );
        const progressBarTip = innerTab.querySelector(
          "[data-feature-tab-progress-fill-tip]",
        );

        if (innerTab === tab) {
          innerTab.setAttribute("data-features-tab", "active");
          gsap.to(innerTab.querySelector("[data-features-tab-reveal]"), {
            height: "auto",
            autoAlpha: 1,
            clipPath: "inset(0% 0% 0% 0%)",
            duration: duration,
            ease: "power2.inOut",
          });
          gsap.to(innerTab.querySelector("[data-feature-tab-progress-track]"), {
            scaleX: 1,
            autoAlpha: 1,
            duration: duration,
            ease: "power2.inOut",
          });
        } else {
          innerTab.setAttribute("data-features-tab", "inactive");
          gsap.to(innerTab.querySelector("[data-features-tab-reveal]"), {
            height: 0,
            autoAlpha: 0,
            clipPath: "inset(0% 0% 100% 0%)",
            duration: duration,
            ease: "power2.inOut",
          });
          gsap.to(innerTab.querySelector("[data-feature-tab-progress-track]"), {
            scaleX: 0,
            autoAlpha: 0,
            duration: duration,
            ease: "power2.inOut",
          });
          if (progressBarFill) {
            gsap.to(progressBarFill, {
              scaleX: 0,
              duration: duration,
              ease: "power2.inOut",
            });
          }
          if (progressBarTip) {
            gsap.to(progressBarTip, {
              autoAlpha: 0,
              duration: duration,
              ease: "power2.inOut",
            });
          }
        }
      });
    });
  });

  //   // start the sequence
  //   if (featureTabs.length > 0) featureTabs[0].click();
  // Store the currently playing video and its currentTime
  let currentVideo = null;
  let currentTime = 0;

  // Grab the element with the [data-features-tabs] attribute
  const featuresTabs = document.querySelector("[data-features-tabs]");

  // Function to start the sequence when the element comes into view
  function startSequence() {
    if (currentVideo) {
      currentVideo.currentTime = currentTime;
      currentVideo.play();
    } else if (featureTabs.length > 0) {
      featureTabs[0].click();
    }
  }

  // Function to pause the currently playing video when the element goes out of view
  function pauseCurrentVideo() {
    featureTargets.forEach((target) => {
      const videoElement = target.querySelector("[data-features-video-src]");
      if (videoElement && !videoElement.paused) {
        currentVideo = videoElement;
        currentTime = videoElement.currentTime;
        videoElement.pause();
      }
    });
  }

  // Setup Intersection Observer
  if (featuresTabs) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) startSequence();
        else pauseCurrentVideo();
      });
    });

    observer.observe(featuresTabs);
  }
}

export function initFeaturesSection() {
  // reduced motion check
  if (!window.prm) {
    initFeaturesVideoLoad().then(() => {
      // console.log("load check");
      initFeatureTabs(); // Initialize the tabs only after all videos have loaded.
    });
  }
}
