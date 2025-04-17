//--------------------------------------
//---- Intro Animation -----------------
//--------------------------------------
//

// Add Safari detection at the top of the file
const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

// Check if screen is smaller than 991px to determine mobile view
const isMobileView = window.innerWidth < 991;

// Track user's visit state using localStorage and sessionStorage
// hasVisitedBefore: Persists across sessions using localStorage
// isIntroTriggered: Temporary state for current session using sessionStorage
// isFirstVisit: True only on very first visit to the site
const hasVisitedBefore = localStorage.getItem("hasVisitedWFC25") === "true";
const isIntroTriggered =
  sessionStorage.getItem("wfc25IntroTriggered") === "true";
const isFirstVisit =
  !hasVisitedBefore && !sessionStorage.getItem("shouldReload");

// Handle first visit reload - ensures proper initialization
if (isFirstVisit) {
  sessionStorage.setItem("shouldReload", "true");
  location.reload(true);
  throw new Error("Reloading for first visit");
}

// Clean up reload flag after use
if (sessionStorage.getItem("shouldReload")) {
  sessionStorage.removeItem("shouldReload");
}

// Set visited flag in localStorage (except when triggered by button)
if (!isIntroTriggered && !hasVisitedBefore) {
  localStorage.setItem("hasVisitedWFC25", "true");
} else if (isIntroTriggered) {
  sessionStorage.removeItem("wfc25IntroTriggered");
}

// Determine if intro animation should be shown
// Only shows on desktop and either first visit or triggered by button
const shouldShowIntro =
  !isMobileView && (!hasVisitedBefore || isIntroTriggered);

// Get the animated wrapper element that contains the intro animation
const wrapper = document.querySelector("#animated-wrapper");

// Handle wrapper visibility based on intro animation state
if (wrapper) {
  wrapper.style.display = shouldShowIntro ? "block" : "none";
  if (shouldShowIntro) {
    wrapper.style.visibility = "visible";
  }
}

// Function to force scroll to top of page
function forceScrollToTop() {
  if (window.scrollY !== 0) {
    window.scrollTo(0, 0);
  }
}

// Variables to track animation state
let scrollAnimationFrame; // Stores the animation frame ID
let startTime; // Tracks when animation started

// Function to continuously check and maintain scroll position
// Runs for 2 seconds to ensure page stays at top during intro
function checkScroll(timestamp) {
  if (!startTime) startTime = timestamp;
  const elapsedTime = timestamp - startTime;

  if (elapsedTime < 2000) {
    forceScrollToTop();
    scrollAnimationFrame = requestAnimationFrame(checkScroll);
  } else {
    cancelAnimationFrame(scrollAnimationFrame);
  }
}

// Initialize scroll checking if intro animation should be shown
if (shouldShowIntro) {
  scrollAnimationFrame = requestAnimationFrame(checkScroll);

  // Add scroll event listener to prevent scrolling during intro
  const scrollHandler = () => {
    forceScrollToTop();
  };

  window.addEventListener("scroll", scrollHandler);

  // Remove scroll handler after 2 seconds
  setTimeout(() => {
    window.removeEventListener("scroll", scrollHandler);
  }, 2000);
}

// Ensure page is at top before unloading
window.onbeforeunload = function () {
  forceScrollToTop();
};

// Register GSAP plugins needed for animations
gsap.registerPlugin(Observer, ScrollTrigger);

// Initialize Lenis for smooth scrolling with optimized settings
let lenis = new Lenis({
  lerp: 0.15, // Subtle smoothing for natural feel
  wheelMultiplier: 1, // Native 1:1 wheel speed
  gestureOrientation: "vertical",
  normalizeWheel: true, // Ensures consistent behavior across browsers
  smoothTouch: false, // Disable touch smoothing for mobile
  touchMultiplier: 1, // Native touch response
  infinite: false, // Standard scroll boundaries
});

// Track animation state
let isInAnimatedSection = false;
let initialAnimationComplete = false;

// Animation frame loop for smooth scrolling
function raf(time) {
  if (shouldShowIntro) {
    lenis.raf(time);
  }
  requestAnimationFrame(raf);
}
requestAnimationFrame(raf);

// Clean up if intro animation shouldn't be shown
if (!shouldShowIntro && wrapper) {
  wrapper.style.display = "none";
  lenis.destroy();
}

// Define clip path shapes for animations
const clipPaths = {
  first: {
    initial: "polygon(46% 45%, 54% 45%, 55% 55%, 45% 55%)",
    final: "polygon(48% 50%, 52% 50%, 54% 50%, 46% 50%)",
  },
  second: {
    initial: "polygon(46% 50%, 54% 50%, 52% 50%, 48% 50%)",
    final: "polygon(46% 45%, 54% 45%, 55% 55%, 45% 55%)",
  },
  third: {
    initial: "polygon(46% 45%, 54% 45%, 55% 55%, 45% 55%)",
    final: "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)",
  },
};

// Cache DOM elements for better performance
let sections = wrapper.querySelectorAll("[data-scroll-section]"),
  images = wrapper.querySelectorAll(".bg"),
  headings = gsap.utils.toArray(
    wrapper.querySelectorAll("[data-scroll-title]")
  ),
  headingsSecondary = gsap.utils.toArray(
    wrapper.querySelectorAll("[data-scroll-title-1]")
  ),
  text = wrapper.querySelectorAll("[data-scroll-text]"),
  textSecondary = wrapper.querySelectorAll("[data-scroll-text-1]"),
  outerWrappers = gsap.utils.toArray(wrapper.querySelectorAll(".outer")),
  innerWrappers = gsap.utils.toArray(wrapper.querySelectorAll(".inner")),
  splitHeadings = [],
  splitHeadingsSecondary = [],
  currentIndex = -1,
  animating;

// Add click event listener for intro trigger button
document.addEventListener("DOMContentLoaded", () => {
  const triggerButton = document.querySelector("[data-wfc-intro-trigger]");
  if (triggerButton) {
    triggerButton.addEventListener("click", () => {
      // Set flag to show animation on next page load
      sessionStorage.setItem("wfc25IntroTriggered", "true");

      // Force scroll to top and prevent scrolling
      forceScrollToTop();

      // Maintain animated state through reload
      sessionStorage.setItem("maintainAnimatedState", "true");

      // Start continuous scroll checking before reload
      requestAnimationFrame(function checkBeforeReload(timestamp) {
        forceScrollToTop();
        setTimeout(() => {
          location.reload();
        }, 50);
      });
    });
  }
});

// Handle maintaining animated state after reload
if (sessionStorage.getItem("maintainAnimatedState") === "true") {
  sessionStorage.removeItem("maintainAnimatedState");
  isInAnimatedSection = true;
  currentIndex = 0;
  initialAnimationComplete = false; // Reset for new animation

  // Ensure wrapper is properly set up
  if (wrapper) {
    gsap.set(wrapper, {
      display: "block",
      height: "100vh",
      overflow: "hidden",
      visibility: "visible",
    });
  }

  // Stop Lenis scrolling
  if (lenis) {
    lenis.stop();
  }

  // Force scroll position
  window.scrollTo(0, 0);
}

// Initialize GSAP plugins needed for outro animation
gsap.registerPlugin(ScrollTrigger);

//--------------------------------------
//---- Outro Animation -----------------
//--------------------------------------

// Cache outro section elements
const outroSection = document.querySelector("#outro");
const outroImg = outroSection?.querySelector("[data-outro-img]");
const outroLeft = outroSection?.querySelector("[data-outro-left]");
const outroRight = outroSection?.querySelector("[data-outro-right]");

if (outroImg) {
  // Set initial states for outro elements
  gsap.set(outroImg, {
    clipPath: "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)",
  });

  if (outroLeft) {
    gsap.set(outroLeft, { x: "10vw" });
  }

  if (outroRight) {
    gsap.set(outroRight, { x: "-10vw" });
  }

  // Calculate trigger offset based on intro animation state
  const triggerOffset = shouldShowIntro ? "130%" : "30%"; // Add 100vh when intro is hidden
  
  const endOffset = shouldShowIntro ? "10% 130%" : "10% 30%"; // Add 100vh when intro is hidden

  // Create the outro animation timeline
  const outroTl = gsap.timeline({
    defaults: {
      ease: "none",
    },
  });

  // Add all animations to the timeline
  outroTl
    .fromTo(
      outroImg,
      { clipPath: "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)" },
      { clipPath: "polygon(45.5% 45%, 54.5% 45%, 55% 55%, 45% 55%)" }
    )
    .to(
      [outroLeft, outroRight],
      {
        x: "0",
      },
      0
    );

  // Create the ScrollTrigger for outro animation
  const outroTrigger = ScrollTrigger.create({
    trigger: outroSection,
    start: `top ${triggerOffset}`,
    end: endOffset,
    animation: outroTl,
    scrub: 1, // Smooth scrubbing effect
  });

  // Add refresh listener to ensure proper trigger behavior
  ScrollTrigger.addEventListener("refresh", () => {
    if (outroTrigger) {
      outroTrigger.refresh();
    }
  });

  // Reset state if section is not in view
  if (!outroTrigger.isActive) {
    gsap.set(outroImg, {
      clipPath: "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)",
    });
    if (outroLeft) gsap.set(outroLeft, { x: "10vw" });
    if (outroRight) gsap.set(outroRight, { x: "-10vw" });
  }
}

// Wait for fonts to load before initializing animations
document.fonts.ready.then(() => {
  // Skip animation initialization if not needed
  if (!shouldShowIntro) return;

  // Initialize split text animations if available
  if (typeof SplitText !== "undefined") {
    splitHeadings = headings.map((heading) => {
      if (!heading) return null;
      try {
        return new SplitText(heading, {
          type: "lines",
          linesClass: "clip-text",
        });
      } catch (error) {
        return null;
      }
    });

    splitHeadingsSecondary = headingsSecondary.map((heading) => {
      if (!heading) return null;
      try {
        return new SplitText(heading, {
          type: "lines",
          linesClass: "clip-text",
        });
      } catch (error) {
        return null;
      }
    });
  }

  // Set initial states for sections
  gsap.set(sections, {
    autoAlpha: 0,
    display: "block",
    visibility: "visible",
  });

  // Set initial state for secondary elements
  const secondaryTitles = wrapper.querySelectorAll("[data-scroll-title-1]");
  const secondaryTexts = wrapper.querySelectorAll("[data-scroll-text-1]");

  gsap.set([secondaryTitles, secondaryTexts], {
    autoAlpha: 0,
    y: 20,
  });

  // Initialize first section
  if (sections.length > 0) {
    gsap.set(sections[0], {
      autoAlpha: 1,
      zIndex: 1,
      display: "block",
      visibility: "visible",
    });

    if (outerWrappers[0]) gsap.set(outerWrappers[0], { yPercent: 0 });
    if (innerWrappers[0]) gsap.set(innerWrappers[0], { yPercent: 0 });

    // Find elements to animate in first section
    const flipImages = sections[0].querySelectorAll("[data-flip-img]");
    const initialTl = gsap.timeline({
      onStart: () => {
        animating = true;
        isInAnimatedSection = true;
        initialAnimationComplete = false;
        if (lenis) lenis.stop();

        // Ensure wrapper setup during initial animation
        gsap.set(wrapper, {
          display: "block",
          height: "100vh",
          overflow: "hidden",
          visibility: "visible",
        });
      },
      onComplete: () => {
        animating = false;
        currentIndex = 0;
        initialAnimationComplete = true;
      },
    });

    // Cache UI elements
    const infoWrapper = wrapper.querySelector(".scroll-wfc25-info-wrapper");
    const navMenu = document.querySelector(".wfc25-nav-menu");
    const scrollDown = document.querySelector(".intro_scroll-down_wrap");

    // Set initial states for UI elements
    if (infoWrapper) {
      gsap.set(infoWrapper, { autoAlpha: 0 });
    }

    if (navMenu) {
      gsap.set(navMenu, { autoAlpha: 0 });
    }

    if (scrollDown) {
      gsap.set(scrollDown, { autoAlpha: 0 });
    }

    // Animate clip paths for flip images
    flipImages.forEach((img) => {
      gsap.set(img, { clipPath: clipPaths.first.initial });

      initialTl
        .fromTo(
          img,
          {
            clipPath: clipPaths.first.initial,
          },
          {
            clipPath: clipPaths.first.final,
            duration: 1,
            ease: "power4.in",
          }
        )
        .fromTo(
          img,
          {
            clipPath: clipPaths.second.initial,
          },
          {
            clipPath: clipPaths.second.final,
            duration: 1,
            ease: "power4.out",
          }
        );
    });

    // Fade in UI elements
    const elementsToFade = [infoWrapper, navMenu, scrollDown].filter(Boolean);
    if (elementsToFade.length > 0) {
      initialTl.to(
        elementsToFade,
        {
          autoAlpha: 1,
          duration: 0.8,
          ease: "power2.out",
        },
        "+=0.05"
      );
    }

    // Ensure wrapper setup during initial animation
    gsap.set(wrapper, {
      display: "block",
      height: "100vh",
      overflow: "hidden",
      visibility: "visible",
    });
  }

  // Handle entering/leaving animated section
  function goToTop() {
    // Only apply if animation should be shown
    if (!shouldShowIntro) return;

    // Force scroll to absolute top
    window.scrollTo(0, 0);

    lenis.stop();
    isInAnimatedSection = true;
  }

  // Only create ScrollTriggers if intro animation should be shown
  if (shouldShowIntro) {
    // Create ScrollTrigger for the animated wrapper section
    ScrollTrigger.create({
      trigger: wrapper,
      start: "top top",
      end: "bottom top",
      onLeave: () => {
        // Ensure clean state before proceeding
        const cleanup = () => {
          isInAnimatedSection = false;
          
          // Remove theme class when leaving the animated wrapper
          const infoWrapper = document.querySelector(".scroll-wfc25-info-wrapper");
          const navMenu = document.querySelector(".wfc25-nav");
          if (infoWrapper) infoWrapper.classList.remove("wfc25-theme-base");
          if (navMenu) navMenu.classList.remove("wfc25-theme-base");
          
          if (lenis) {
            lenis.stop();
            lenis.destroy();
          }
          
          // Force cleanup of all GSAP animations
          gsap.killTweensOf(wrapper);
          gsap.killTweensOf(wrapper.querySelectorAll("*"));
          
          // Kill all ScrollTriggers for this wrapper
          ScrollTrigger.getAll().forEach(trigger => {
            if (trigger.vars.trigger === wrapper || 
                (trigger.vars.trigger && trigger.vars.trigger.closest("#animated-wrapper"))) {
              trigger.kill();
            }
          });
          
          // Kill all Observers
          Observer.getAll().forEach(observer => {
            if (observer.vars.target === wrapper) {
              observer.kill();
            }
          });
          
          // Safari-specific handling
          if (isSafari) {
            // First, ensure we're at the top
            window.scrollTo({
              top: 0,
              behavior: 'instant'
            });
            
            // Force scroll to top immediately
            document.documentElement.scrollTop = 0;
            document.body.scrollTop = 0;
            
            // Then ensure scrolling is enabled
            document.body.style.overflow = 'visible';
            document.documentElement.style.overflow = 'visible';
            document.body.style.position = 'relative';
            document.documentElement.style.position = 'relative';
            
            // Force immediate style updates with !important
            wrapper.style.cssText = `
              display: none !important;
              visibility: hidden !important;
              opacity: 0 !important;
              position: absolute !important;
              top: 0 !important;
              left: 0 !important;
              width: 100% !important;
              height: 100% !important;
              pointer-events: none !important;
              z-index: -1 !important;
            `;
            
            // Force a repaint
            wrapper.offsetHeight;
            
            // Use setTimeout to ensure cleanup completes
            setTimeout(() => {
              // Clear all GSAP properties and set new ones
              gsap.set(wrapper, {
                clearProps: "all",
                display: "none",
                visibility: "hidden",
                opacity: 0,
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                pointerEvents: "none",
                zIndex: -1
              });
              
              // Additional direct style manipulation
              wrapper.style.cssText = `
                display: none !important;
                visibility: hidden !important;
                opacity: 0 !important;
                position: absolute !important;
                top: 0 !important;
                left: 0 !important;
                width: 100% !important;
                height: 100% !important;
                pointer-events: none !important;
                z-index: -1 !important;
              `;
              
              // Ensure date wrapper color is reset
              const dateWrapper = document.querySelector('.wfc-date-wrapper');
              if (dateWrapper) {
                dateWrapper.classList.remove('wfc25-theme-base');
              }
              
              // Remove any remaining scroll locks
              document.body.style.overflow = 'visible';
              document.documentElement.style.overflow = 'visible';
              document.body.style.position = 'relative';
              document.documentElement.style.position = 'relative';
              
              // Re-enable touch events
              document.body.style.touchAction = 'pan-y';
              document.documentElement.style.touchAction = 'pan-y';
              
              // Force scroll to top again after cleanup
              window.scrollTo({
                top: 0,
                behavior: 'instant'
              });
              document.documentElement.scrollTop = 0;
              document.body.scrollTop = 0;
              
              // Force a final repaint
              document.body.offsetHeight;
              
              // Additional check to ensure wrapper is hidden
              if (wrapper.style.display !== 'none' || wrapper.style.visibility !== 'hidden') {
                wrapper.style.display = 'none';
                wrapper.style.visibility = 'hidden';
                wrapper.style.opacity = '0';
                wrapper.style.position = 'absolute';
                wrapper.style.zIndex = '-1';
              }
              
              // Create a new Lenis instance for smooth scrolling
              if (isSafari) {
                lenis = new Lenis({
                  lerp: 0.15,
                  wheelMultiplier: 1,
                  gestureOrientation: "vertical",
                  normalizeWheel: true,
                  smoothTouch: false,
                  touchMultiplier: 1,
                  infinite: false,
                });
                
                // Start the Lenis animation loop
                function raf(time) {
                  lenis.raf(time);
                  requestAnimationFrame(raf);
                }
                requestAnimationFrame(raf);
              }
            }, 100);
          } else {
            gsap.set(wrapper, {
              display: "none",
              visibility: "hidden"
            });
          }
          
          // Remove event listeners
          window.removeEventListener("scroll", forceScrollToTop);
          if (scrollAnimationFrame) {
            cancelAnimationFrame(scrollAnimationFrame);
          }
          
          // Update storage
          localStorage.setItem("hasVisitedWFC25", "true");
        };
        
        // Safari: Use RAF to ensure synchronous style updates
        if (isSafari) {
          // First ensure we're at the top
          window.scrollTo({
            top: 0,
            behavior: 'instant'
          });
          document.documentElement.scrollTop = 0;
          document.body.scrollTop = 0;
          
          // Then ensure scrolling is enabled
          document.body.style.overflow = 'visible';
          document.documentElement.style.overflow = 'visible';
          
          requestAnimationFrame(() => {
            cleanup();
          });
        } else {
          cleanup();
        }
      },
      onEnterBack: () => {
        // Only add the class back if we were past the animation point
        if (currentIndex > 0) {
          const infoWrapper = document.querySelector(".scroll-wfc25-info-wrapper");
          const navMenu = document.querySelector(".wfc25-nav");
          if (infoWrapper) infoWrapper.classList.add("wfc25-theme-base");
          if (navMenu) navMenu.classList.add("wfc25-theme-base");
        }
        goToTop();
      }
    });

    // Create additional ScrollTrigger for handling re-entry
    ScrollTrigger.create({
      trigger: wrapper,
      start: "top 10%",
      end: "top -10%",
      onEnter: () => {
        goToTop();
      },
      onLeaveBack: () => {
        // Remove theme class when going back to the start
        const infoWrapper = document.querySelector(
          ".scroll-wfc25-info-wrapper"
        );
        const navMenu = document.querySelector(".wfc25-nav");
        if (infoWrapper) infoWrapper.classList.remove("wfc25-theme-base");
        if (navMenu) navMenu.classList.remove("wfc25-theme-base");

        isInAnimatedSection = false;
        lenis.start();
      },
    });
  }

  // Initialize Observer with mobile-friendly behavior
  if (shouldShowIntro) {
    Observer.create({
      target: wrapper,
      type: "wheel,touch,pointer",
      wheelSpeed: -1,
      dragMinimum: 3,
      tolerance: 10,
      onDown: () => {
        if (!initialAnimationComplete) return;

        if (isInAnimatedSection && !animating) {
          if (currentIndex > 0) {
            gotoSection(currentIndex - 1, -1);
          }
        }
      },
      onUp: () => {
        if (!initialAnimationComplete) return;

        if (isInAnimatedSection && !animating) {
          if (currentIndex === sections.length - 1) {
            isInAnimatedSection = false;
            lenis.start();

            setTimeout(() => {
              window.scrollBy({
                top: 5,
                behavior: "smooth",
              });
            }, 100);
          } else {
            gotoSection(currentIndex + 1, 1);
          }
        }
      },
      preventDefault: (e) => {
        if (!initialAnimationComplete) return true;
        return isInAnimatedSection;
      },
      lockAxis: true,
    });

    // Create ScrollTrigger for handling re-entry
    ScrollTrigger.create({
      trigger: wrapper,
      start: "top top",
      end: "4px top",
      onLeave: () => {
        isInAnimatedSection = false;
        sessionStorage.removeItem("maintainAnimatedState");
      },
      onEnterBack: () => {
        window.scrollTo(0, 0);
        isInAnimatedSection = true;
        lenis.stop();

        gsap.set(wrapper, {
          display: "block",
          height: "100vh",
          overflow: "hidden",
          visibility: "visible",
        });

        if (sections[currentIndex]) {
          gsap.set(sections[currentIndex], {
            display: "block",
            visibility: "visible",
            autoAlpha: 1,
            zIndex: 1,
          });
        }
      },
    });
  }

  // Add wheel event listener with passive: false for better scroll control
  window.addEventListener(
    "wheel",
    (e) => {
      if (isInAnimatedSection) {
        // Wheel event handling without logging
      }
    },
    { passive: false }
  );

  // Start at first section only if animation should be shown
  if (shouldShowIntro) {
    gotoSection(0, 1);
  }
});

// Helper function to wrap index within valid range
function wrapIndex(index) {
  if (index < 0) return 0;
  if (index >= sections.length) return sections.length - 1;
  return index;
}

// Main function to handle section transitions
function gotoSection(index, direction) {
  index = wrapIndex(index);
  if (index === currentIndex) return;

  animating = true;
  let fromTop = direction === -1,
    dFactor = fromTop ? -1 : 1,
    tl = gsap.timeline({
      defaults: { duration: 0.625, ease: "power1.inOut" },
      onComplete: () => {
        animating = false;
      },
    });

  if (currentIndex === 0 && index === 1) {
    handleFirstToSecond(tl, index);
  } else if (currentIndex === 1 && index === 0) {
    handleSecondToFirst(tl, index);
  } else {
    handleOtherTransitions(tl, index, dFactor);
  }

  currentIndex = index;
}

// Handle transition from first to second section
function handleFirstToSecond(tl, index) {
  const flipImages = sections[0].querySelectorAll("[data-flip-img]");
  const infoWrapper = document.querySelector(".scroll-wfc25-info-wrapper");
  const scrollDown = document.querySelector(".intro_scroll-down_wrap");
  const navMenu = document.querySelector(".wfc25-nav");
  const secondaryTitles = wrapper.querySelectorAll("[data-scroll-title-1]");
  const secondaryTexts = wrapper.querySelectorAll("[data-scroll-text-1]");

  // Reset secondary elements to initial state
  gsap.set([secondaryTitles, secondaryTexts], {
    autoAlpha: 0,
    y: 20,
  });

  gsap.set(sections[index], {
    autoAlpha: 1,
    zIndex: 0,
    display: "block",
  });

  if (outerWrappers[index] && innerWrappers[index]) {
    gsap.set([outerWrappers[index], innerWrappers[index]], {
      yPercent: (i) => (i ? -100 : 100),
    });
  }

  // Animate clip paths
  flipImages.forEach((img) => {
    tl.fromTo(
      img,
      {
        clipPath: clipPaths.second.final,
      },
      {
        clipPath: clipPaths.third.final,
        duration: 0.75,
        ease: "power4.inOut",
        onComplete: () => {
          if (infoWrapper) infoWrapper.classList.add("wfc25-theme-base");
          if (navMenu) navMenu.classList.add("wfc25-theme-base");
        },
      }
    );
  });

  // Animate secondary titles with stagger effect
  if (secondaryTitles.length > 0) {
    tl.fromTo(
      secondaryTitles,
      {
        autoAlpha: 0,
        y: 20,
      },
      {
        autoAlpha: 1,
        y: 0,
        duration: 0.5,
        stagger: 0.1,
        ease: "power2.out",
      },
      "-=0.3"
    );
  }

  // Animate secondary texts with stagger effect
  if (secondaryTexts.length > 0) {
    tl.fromTo(
      secondaryTexts,
      {
        autoAlpha: 0,
        y: 20,
      },
      {
        autoAlpha: 1,
        y: 0,
        duration: 0.5,
        stagger: 0.1,
        ease: "power2.out",
      },
      "-=0.3"
    );
  }

  // Animate section content
  animateSectionContent(tl, index, 1);

  // Animate wrappers
  if (outerWrappers[index] && innerWrappers[index]) {
    tl.to(
      [outerWrappers[index], innerWrappers[index]],
      {
        yPercent: 0,
        duration: 0.625,
        ease: "power1.inOut",
      },
      "-=0.3"
    );
  }

  // Finalize transition
  tl.set(sections[currentIndex], {
    autoAlpha: 0,
    zIndex: 0,
  })
    .set(sections[index], {
      zIndex: 1,
    })
    .set(flipImages, {
      clipPath: clipPaths.first.initial,
    });
}

// Handle transition from second to first section
function handleSecondToFirst(tl, index) {
  const flipImages = sections[0].querySelectorAll("[data-flip-img]");
  const infoWrapper = document.querySelector(".scroll-wfc25-info-wrapper");
  const navMenu = document.querySelector(".wfc25-nav");
  const secondaryTitles = wrapper.querySelectorAll("[data-scroll-title-1]");
  const secondaryTexts = wrapper.querySelectorAll("[data-scroll-text-1]");

  gsap.set(sections[index], {
    autoAlpha: 1,
    zIndex: 0,
    display: "block",
  });
  gsap.set(flipImages, {
    clipPath: clipPaths.third.final,
  });

  // Remove theme class when going back to first section
  if (infoWrapper) infoWrapper.classList.remove("wfc25-theme-base");
  if (navMenu) navMenu.classList.remove("wfc25-theme-base");

  // Fade out secondary elements
  tl.to([secondaryTitles, secondaryTexts], {
    autoAlpha: 0,
    y: 20,
    duration: 0.3,
    stagger: 0.05,
    ease: "power2.in",
  });

  // Fade out current section
  tl.to(sections[currentIndex], {
    autoAlpha: 0,
    duration: 0.6,
    ease: "power2.inOut",
  });

  // Animate clip paths
  flipImages.forEach((img) => {
    tl.to(
      img,
      {
        clipPath: clipPaths.second.final,
        duration: 0.85,
        ease: "power3.inOut",
      },
      "-=0.5"
    );
  });

  // Animate first section content
  animateSectionContent(tl, index, -1);

  tl.fromTo(
    sections[index],
    {
      autoAlpha: 0.85,
    },
    {
      autoAlpha: 1,
      duration: 0.4,
      ease: "power2.inOut",
    },
    "-=0.6"
  )
    .set(
      sections[index],
      {
        zIndex: 1,
      },
      "-=0.2"
    )
    .set(
      sections[currentIndex],
      {
        zIndex: 0,
      },
      "<"
    );
}

// Handle transitions between other sections
function handleOtherTransitions(tl, index, dFactor) {
  if (currentIndex >= 0 && currentIndex < sections.length) {
    gsap.set(sections[currentIndex], {
      zIndex: 0,
      display: "block",
    });
    if (images[currentIndex]) {
      tl.to(images[currentIndex], {
        yPercent: -15 * dFactor,
        duration: 0.625,
        ease: "power1.inOut",
      });
    }
    tl.set(sections[currentIndex], {
      autoAlpha: 0,
      display: "block",
    });
  }

  gsap.set(sections[index], {
    autoAlpha: 1,
    zIndex: 1,
    display: "block",
    visibility: "visible",
  });

  if (outerWrappers[index] && innerWrappers[index]) {
    tl.fromTo(
      [outerWrappers[index], innerWrappers[index]],
      {
        yPercent: (i) => (i ? -100 * dFactor : 100 * dFactor),
      },
      {
        yPercent: 0,
        duration: 0.625,
        ease: "power1.inOut",
      },
      0
    );
  }

  if (images[index]) {
    tl.fromTo(
      images[index],
      {
        yPercent: 15 * dFactor,
      },
      {
        yPercent: 0,
        duration: 0.625,
        ease: "power1.inOut",
      },
      0
    );
  }

  animateSectionContent(tl, index, dFactor);
}

// Animate secondary elements with stagger effect
function animateSecondaryElements(tl, delay) {
  if (splitHeadingsSecondary?.length > 0) {
    splitHeadingsSecondary.forEach((splitHeading) => {
      if (splitHeading?.lines?.length > 0) {
        tl.fromTo(
          splitHeading.lines,
          {
            autoAlpha: 0,
            yPercent: 150,
          },
          {
            autoAlpha: 1,
            yPercent: 0,
            duration: 0.5,
            ease: "power2",
            stagger: {
              each: 0.025,
              from: "random",
            },
          },
          delay
        );
      }
    });
  }

  if (textSecondary.length > 0) {
    tl.fromTo(
      textSecondary,
      {
        opacity: 0,
        y: 20,
      },
      {
        opacity: 1,
        y: 0,
        duration: 0.4,
        ease: "power2.out",
      },
      "-=0.2"
    );
  }
}

// Animate section content with stagger effect
function animateSectionContent(tl, index, dFactor) {
  const splitHeading = splitHeadings[index];

  if (splitHeading?.lines?.length > 0) {
    tl.fromTo(
      splitHeading.lines,
      {
        autoAlpha: 0,
        yPercent: 150 * dFactor,
      },
      {
        autoAlpha: 1,
        yPercent: 0,
        duration: 0.5,
        ease: "power2",
        stagger: {
          each: 0.025,
          from: "random",
        },
      },
      0.35
    );
  }

  const scrollTexts = sections[index].querySelectorAll("[data-scroll-text]");

  if (scrollTexts.length > 0) {
    tl.fromTo(
      scrollTexts,
      {
        opacity: 0,
        y: 20 * dFactor,
      },
      {
        opacity: 1,
        y: 0,
        duration: 0.4,
        ease: "power2.out",
      },
      0.5
    );
  }
}

// Reset secondary elements to initial state
function resetSecondaryElements() {
  if (splitHeadingsSecondary?.length > 0) {
    splitHeadingsSecondary.forEach((splitHeading) => {
      if (splitHeading?.lines) {
        gsap.set(splitHeading.lines, {
          autoAlpha: 0,
          yPercent: 150,
        });
      }
    });
  }
  if (textSecondary.length > 0) {
    gsap.set(textSecondary, {
      opacity: 0,
      y: 20,
    });
  }
}

// Handle viewport changes
window.addEventListener("resize", function () {
  const newIsMobileView = window.innerWidth < 991;
  const currentShouldShow = shouldShowIntro;
  const newShouldShow =
    !newIsMobileView && (!hasVisitedBefore || isIntroTriggered);

  // Reload if viewport state changes
  if (newIsMobileView !== isMobileView || newShouldShow !== currentShouldShow) {
    location.reload();
  }
});