//---- Accordions ----
document.addEventListener("DOMContentLoaded", () => {
  // Create media query listener for dynamic updates
  const reducedMotionQuery = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  );
  let prefersReducedMotion = reducedMotionQuery.matches;

  // Listen for changes to reduced motion preference
  reducedMotionQuery.addEventListener("change", (e) => {
    prefersReducedMotion = e.matches;
  });

  // Force-close all <details> on page load
  document.querySelectorAll("details[open]").forEach((details) => {
    details.removeAttribute("open");
  });

  const detailsElements = document.querySelectorAll("details");
  detailsElements.forEach((details) => {
    const summary = details.querySelector("summary");
    const content = details.querySelector(".accordion-content");

    // Set initial collapsed state
    gsap.set(content, { height: 0, overflow: "hidden" });

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
          gsap.to(content, {
            height: 0,
            duration: 0.4,
            ease: "power3.inOut",
            onComplete: () => {
              details.removeAttribute("open");
            },
          });
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
          gsap.to(content, {
            height: fullHeight,
            duration: 0.4,
            ease: "power3.out",
            onComplete: () => {
              content.style.height = "auto";
            },
          });
        }
      }
    });
  });
});
