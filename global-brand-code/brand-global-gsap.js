// GSAP Fallback
document.addEventListener("DOMContentLoaded", () => {
  if (typeof window.gsap === "undefined")
    document.documentElement.classList.add("gsap-not-found");
});

// Split Text Animation
document.fonts.ready.then(() => {
  if (typeof gsap === "undefined" || typeof ScrollTrigger === "undefined") {
    return;
  }
  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  // Text Reveal by Mask
  document
    .querySelectorAll("[data-animation-gsap='line-mask']")
    .forEach((container) => {
      if (prefersReducedMotion) {
        gsap.set(container, { visibility: "visible" });
        return;
      }

      const elementsToSplit = container.querySelectorAll(
        "p, h1, h2, h3, h4, h5, h6"
      );
      if (elementsToSplit.length === 0) {
        return;
      }

      elementsToSplit.forEach((el) => {
        gsap.set(el, { visibility: "visible" });

        SplitText.create(el, {
          type: "lines",
          autoSplit: true,
          mask: "lines",
          linesClass: "line",
          onSplit(self) {
            let tl = gsap.timeline({
              scrollTrigger: {
                trigger: container,
                start: "top 60%",
                end: "bottom 60%",
                scrub: 0.8,
              },
            });

            self.lines.forEach((line, i) => {
              gsap.set(line, { "--line-width": "0%" });
              tl.to(
                line,
                {
                  "--line-width": "100%",
                  duration: 1,
                },
                i * 0.5
              );
            });
          },
        });
      });
    });
});

// Scrolltrigger Refresh
document.addEventListener("DOMContentLoaded", function () {
  if (typeof ScrollTrigger === "undefined") {
    return;
  }

  function refreshScrollTrigger() {
    ScrollTrigger.refresh();
  }

  // Debounce function
  function debounce(func, delay) {
    let timer;
    return function () {
      clearTimeout(timer);
      timer = setTimeout(func, delay);
    };
  }

  let initialRefreshDone = false;

  const debouncedRefresh = debounce(() => {
    if (!initialRefreshDone) {
      initialRefreshDone = true;
    }
    refreshScrollTrigger();
  }, 150);

  setTimeout(() => {
    if (!initialRefreshDone) {
      refreshScrollTrigger();
      initialRefreshDone = true;
    }
  }, 200);

  const resizeObserver = new ResizeObserver(() => {
    debouncedRefresh();
  });

  resizeObserver.observe(document.documentElement);
});
