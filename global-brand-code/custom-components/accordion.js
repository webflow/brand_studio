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

    // Handle open attribute based on data-start-open value on page load (only if they exist)
    document.querySelectorAll("details[open]").forEach((details) => {
      const startOpen = details.getAttribute("data-start-open");

      if (startOpen === "true") {
        // Don't alter the open attribute - leave it as is so accordion stays open
        return;
      } else {
        // For data-start-open="false", missing attribute, or any other value, remove the open attribute
        details.removeAttribute("open");
      }
    });

    // Helper function to animate accordion opening
    function animateOpen(details, content) {
      const fullHeight = content.scrollHeight;

      if (prefersReducedMotion) {
        // Instant open for reduced motion
        content.style.height = "auto";
      } else {
        // Animate opening
        if (typeof gsap !== "undefined") {
          gsap.to(content, {
            height: fullHeight,
            duration: 0.45,
            ease: "power2.inOut",
            onComplete: () => {
              content.style.height = "auto";
            },
          });
        } else {
          // Fallback animation without GSAP
          content.style.transition = "height 0.45s ease-in-out";
          content.style.height = `${fullHeight}px`;
          setTimeout(() => {
            content.style.height = "auto";
            content.style.transition = "";
          }, 450);
        }
      }
    }

    // Helper function to animate accordion closing
    function animateClose(details, content) {
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
            duration: 0.45,
            ease: "power2.inOut",
            onComplete: () => {
              details.removeAttribute("open");
            },
          });
        } else {
          // Fallback animation without GSAP
          content.style.transition = "height 0.45s ease-in-out";
          content.style.height = "0px";
          setTimeout(() => {
            details.removeAttribute("open");
            content.style.transition = "";
          }, 450);
        }
      }
    }

    // Process each accordion
    detailsElements.forEach((details) => {
      const summary = details.querySelector("summary");
      const content = details.querySelector(".accordion-content");

      // Skip this accordion if required elements are missing
      if (!summary || !content) {
        return;
      }

      // Check if this accordion is within an .accordion-card_wrap parent
      const cardWrap = details.closest(".accordion-card_wrap");
      const isCardAccordion = cardWrap !== null;

      // Set initial collapsed state (check if GSAP is available)
      // Skip setting collapsed state if data-start-open="true"
      const startOpen = details.getAttribute("data-start-open");
      if (startOpen !== "true") {
        if (typeof gsap !== "undefined") {
          gsap.set(content, { height: 0, overflow: "clip" });
        } else {
          // Fallback if GSAP is not available
          content.style.height = "0px";
          content.style.overflow = "clip";
        }
      }

      if (isCardAccordion) {
        // For accordions within .accordion-card_wrap
        let isHovered = false;
        let isFocused = false;
        let isDesktop = window.innerWidth > 991;

        // Function to check if we're on desktop viewport
        function updateViewport() {
          isDesktop = window.innerWidth > 991;
        }

        // Listen for viewport changes
        window.addEventListener("resize", updateViewport);

        // Hover events on the card wrap (desktop only)
        cardWrap.addEventListener("mouseenter", () => {
          if (!isDesktop) return;
          isHovered = true;
          if (!details.hasAttribute("open")) {
            details.setAttribute("open", "");
            animateOpen(details, content);
          }
        });

        cardWrap.addEventListener("mouseleave", () => {
          if (!isDesktop) return;
          isHovered = false;
          if (!isFocused && details.hasAttribute("open")) {
            animateClose(details, content);
          }
        });

        // Focus events on the card wrap (for keyboard navigation, desktop only)
        cardWrap.addEventListener("focusin", () => {
          if (!isDesktop) return;
          isFocused = true;
          if (!details.hasAttribute("open")) {
            details.setAttribute("open", "");
            animateOpen(details, content);
          }
        });

        cardWrap.addEventListener("focusout", (event) => {
          if (!isDesktop) return;
          // Check if focus is moving to an element outside the card wrap
          if (!cardWrap.contains(event.relatedTarget)) {
            isFocused = false;
            if (!isHovered && details.hasAttribute("open")) {
              animateClose(details, content);
            }
          }
        });

        // Click behavior for card accordions
        summary.addEventListener("click", (event) => {
          if (isDesktop) {
            // On desktop, disable click behavior (use hover instead)
            event.preventDefault();
          } else {
            // On mobile/tablet, use standard click behavior
            const isClosing = details.hasAttribute("open");

            if (isClosing) {
              // Prevent native close
              event.preventDefault();
              animateClose(details, content);
            }
          }
        });

        // Toggle event for mobile/tablet click behavior
        details.addEventListener("toggle", () => {
          if (!isDesktop && details.open) {
            animateOpen(details, content);
          }
        });
      } else {
        // Regular accordion behavior (click to toggle)
        summary.addEventListener("click", (event) => {
          const isClosing = details.hasAttribute("open");

          if (isClosing) {
            // Prevent native close
            event.preventDefault();
            animateClose(details, content);
          }
        });

        details.addEventListener("toggle", () => {
          if (details.open) {
            animateOpen(details, content);
          }
        });
      }
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
