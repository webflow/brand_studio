//---- Accordions ----
(function () {
  "use strict";

  // Early exit if no accordion elements exist on the page
  function initializeAccordions() {
    const detailsElements = document.querySelectorAll("details");

    // Performance optimization: exit early if no accordions present
    if (detailsElements.length === 0) {
      return;
    }

    // Only proceed with setup if accordions are found
    let prefersReducedMotion = false;
    let reducedMotionQuery = null;

    // Only create media query listener if accordions exist
    try {
      reducedMotionQuery = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      );
      prefersReducedMotion = reducedMotionQuery.matches;

      // Listen for changes to reduced motion preference
      reducedMotionQuery.addEventListener("change", (e) => {
        prefersReducedMotion = e.matches;
      });
    } catch (e) {
      // Fallback if matchMedia is not supported
      prefersReducedMotion = false;
    }

    // Handle open attribute based on its value on page load (only if they exist)
    document.querySelectorAll("details[open]").forEach((details) => {
      const openValue = details.getAttribute("open");

      if (openValue === "live-open") {
        // Keep the open attribute but clear its value so accordion remains open
        details.setAttribute("open", "");
      } else {
        // For "designer-open", no value, or any other value, remove the attribute entirely
        details.removeAttribute("open");
      }
    });

    // Process each accordion
    detailsElements.forEach((details) => {
      const summary = details.querySelector("summary");
      const content = details.querySelector(".accordion-content");

      // Skip this accordion if required elements are missing
      if (!summary || !content) {
        return;
      }

      // Set initial collapsed state (check if GSAP is available)
      if (typeof gsap !== "undefined") {
        gsap.set(content, { height: 0, overflow: "hidden" });
      } else {
        // Fallback if GSAP is not available
        content.style.height = "0px";
        content.style.overflow = "hidden";
      }

      summary.addEventListener("click", (event) => {
        const isClosing = details.hasAttribute("open");

        if (isClosing) {
          // Prevent native close
          event.preventDefault();

          if (prefersReducedMotion) {
            // Instant close for reduced motion
            details.removeAttribute("open");
          } else {
            // Animate closing
            content.style.height = `${content.scrollHeight}px`;
            content.offsetHeight; // force reflow

            if (typeof gsap !== "undefined") {
              gsap.to(content, {
                height: 0,
                duration: 0.4,
                ease: "power3.inOut",
                onComplete: () => {
                  details.removeAttribute("open");
                },
              });
            } else {
              // Fallback animation without GSAP
              content.style.transition = "height 0.4s ease-in-out";
              content.style.height = "0px";
              setTimeout(() => {
                details.removeAttribute("open");
                content.style.transition = "";
              }, 400);
            }
          }
        }
      });

      details.addEventListener("toggle", () => {
        if (details.open) {
          const fullHeight = content.scrollHeight;

          if (prefersReducedMotion) {
            // Instant open for reduced motion
            content.style.height = "auto";
          } else {
            // Animate opening
            if (typeof gsap !== "undefined") {
              gsap.to(content, {
                height: fullHeight,
                duration: 0.4,
                ease: "power3.out",
                onComplete: () => {
                  content.style.height = "auto";
                },
              });
            } else {
              // Fallback animation without GSAP
              content.style.transition = "height 0.4s ease-out";
              content.style.height = `${fullHeight}px`;
              setTimeout(() => {
                content.style.height = "auto";
                content.style.transition = "";
              }, 400);
            }
          }
        }
      });
    });
  }

  // Initialize when DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeAccordions);
  } else {
    // DOM is already ready
    initializeAccordions();
  }
})();
