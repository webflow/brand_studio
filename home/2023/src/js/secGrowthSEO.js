import Typed from "typed.js";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { CSSPlugin } from "gsap/CSSPlugin";

gsap.registerPlugin(CSSPlugin);

let blurValue = 6; // Initialize the blur value outside of the function
let animationTimeout;
let userInteracted = false;
const growthSEOScrollInstances = [];

function initSeoRippleLines() {
  const rippleLines = document.querySelectorAll("[growth-seo-ripple-line]");
  const originalBorderColor = "rgba(51, 51, 50, 0.95)";
  const highlightedColor = "#01D722";

  function resetRippleLines() {
    rippleLines.forEach((line) => {
      line.style.borderColor = originalBorderColor;
      line.style.boxShadow = `0px 1px 6px 0px rgba(51, 51, 50, 0)`;
    });
  }

  function animateRippleLines() {
    blurValue = 6; // Reset the blur value at the start of each iteration

    rippleLines.forEach((rippleLine, index) => {
      gsap.to(rippleLine, {
        delay: index * 0.6,
        onStart: function () {
          // Reset styles for all ripple lines
          rippleLines.forEach((line) => {
            line.style.borderColor = originalBorderColor;
            line.style.boxShadow = `0px 1px 6px 0px rgba(51, 51, 50, 0)`;
          });

          // Highlight the current line
          rippleLine.style.borderColor = highlightedColor;
          rippleLine.style.boxShadow = `0px 1px ${blurValue}px 0px rgba(1, 215, 34, 0.40)`;
          blurValue += 2; // increase the blur value by 2px every time
        },
      });
    });

    // Calculate the total duration for one iteration (rippleLines.length times delay for each line)
    const totalDuration = rippleLines.length * 0.6;

    // Use setTimeout to call the function again after the total duration
    animationTimeout = setTimeout(animateRippleLines, totalDuration * 1000); // Convert to milliseconds
  }

  const seoButton = document.querySelector("[growth-seo-button]");
  const seoButtonWrap = document.querySelector("[data-og-hover]");
  if (seoButton) {
    seoButton.addEventListener("mouseenter", () => {
      seoButtonWrap.setAttribute("data-og-hover", "hovered");
      clearTimeout(animationTimeout);
      gsap.killTweensOf(rippleLines); // Kill ongoing animations
      resetRippleLines();
    });

    seoButton.addEventListener("mouseleave", () => {
      seoButtonWrap.setAttribute("data-og-hover", "");
      animateRippleLines(); // Restart the animation
    });
  }
  animateRippleLines();
}

function initGrowthSEOInteractions() {
  // Assuming GSAP and Typed.js libraries are already included in your project.

  const buttons = document.querySelectorAll("[growth-seo-trigger]");

  if (buttons.length === 0) return; // Exit if no buttons are found.

  buttons.forEach((button) => {
    button.addEventListener("click", function () {
      // Step 1
      userInteracted = true; // Make sure you've declared userInteracted somewhere before this, or it'll result in a reference error.
      const codeWrap = document.querySelectorAll("[growth-seo-trigger]");
      const reduceTrigger = document.querySelector("[data-reduce-trigger]");
      codeWrap.forEach((codeWrap) => {
        if (codeWrap) {
          codeWrap.setAttribute("pointer-none", "");
        }
      });

      const codeText = document.querySelector("[growth-seo-code-text]");
      if (codeText) {
        codeText.textContent = "Please wait...";
      }

      gsap.to("[growth-seo-button]", {});
      gsap.to("[data-og-hover]", {
        autoAlpha: 0,
        duration: 1.5,
        ease: "power3.out",
      });

      const textElements = document.querySelectorAll("[data-growth-seo-text]");
      let completedElementsCount = 0;

      textElements.forEach((el) => {
        const value = el.getAttribute("data-growth-seo-text");
        const typeSpeed = (0.1 * 500) / value.length;

        new Typed(el, {
          strings: [value],
          typeSpeed: typeSpeed,
          startDelay: 0,
          showCursor: false,
          onComplete: () => {
            completedElementsCount++;

            // Step 3
            if (completedElementsCount === textElements.length) {
              if (reduceTrigger) {
                setTimeout(() => {
                  reduceTrigger.setAttribute("data-reduce-trigger", "reduce");
                }, 1000);
              }
              gsap.to('[data-reduce-target="height"]', {
                delay: 1,
                autoAlpha: 0,
                height: "0px",
                duration: 0.6,
                ease: "power3.out",
              });

              gsap.to('[data-reduce-target="style"]', {
                delay: 1,
                border: "1.003px solid rgba(255, 255, 255, 0.14)",
                background: "transparent",
                duration: 0.6,
                ease: "power3.out",
              });

              // add
              gsap.to("[data-growth-seo-final-wrap]", {
                delay: 1,
                color: "var(--main-dark)",
                padding: "1rem",
                background: "var(--main-light)",
                gridRowGap: "0.5rem",
                duration: 0.6,
                ease: "power3.out",
              });
              gsap.to("[growth-seo-og-inputs]", {
                delay: 1,
                // background: "var(--main-light)",
                gridRowGap: "0rem",
                duration: 0.6,
                ease: "power3.out",
              });

              gsap.to("[data-growth-seo-og-field-flex]", {
                delay: 1,
                gridRowGap: "0rem",
                duration: 0.6,
                ease: "power3.out",
              });

              gsap.to(".growth_seo-og-input.is--field", {
                delay: 1,
                minHeight: "0rem",
                duration: 0.6,
                ease: "power3.out",
              });

              gsap.to(".growth_seo-og-input.is--textarea", {
                delay: 1,
                minHeight: "0rem",
                duration: 0.6,
                ease: "power3.out",
              });

              gsap.to("[growth-seo-dots-wrap]", {
                delay: 1.5,
                autoAlpha: 0,
                duration: 1,
                ease: "power3.out",
              });
              gsap.to("[data-seo-code-button]", {
                delay: 1.5,
                autoAlpha: 0,
                duration: 1,
                ease: "power3.out",
              });
            }

            // Step 4
            if (completedElementsCount === textElements.length) {
              gsap.to("[growth-seo-code-img]", {
                delay: 1.5,
                clipPath: "inset(0% 0% 0% 0%)",
                duration: 1,
                ease: "power3.in",
              });
              gsap.to("[growth-seo-code-wrap]", {
                delay: 1.5,
                height: "25rem",
                duration: 1,
                ease: "power3.out",
              });
              gsap.delayedCall(7, resetGrowthSEOInteractions);
            }
          },
        });
      });
    });
  });
}

function resetGrowthSEOInteractions() {
  // Reset animations
  gsap.to('[data-reduce-target="height"]', {
    display: "flex",
    delay: 0.05,
    autoAlpha: 1,
    height: "auto",
    duration: 0.6,
    ease: "power3.out",
  });
  gsap.to('[data-reduce-target="style"]', {
    border: "1.003px solid rgba(255, 255, 255, 0.14)",
    background: "#1e1e1e",
    duration: 0.6,
    ease: "power3.out",
  });

  gsap.to("[data-growth-seo-final-wrap]", {
    color: "var(--main-light)",
    padding: "0rem",
    background: "#171717",
    gridRowGap: "1rem",
    duration: 0.6,
    ease: "power3.out",
  });

  gsap.to("[growth-seo-og-inputs]", {
    gridRowGap: "1rem",
    duration: 0.6,
    ease: "power3.out",
  });

  gsap.to("[data-growth-seo-og-field-flex]", {
    gridRowGap: "0.5rem",
    duration: 0.6,
    ease: "power3.out",
  });

  gsap.to(".growth_seo-og-input.is--field", {
    minHeight: "1.5rem",
    duration: 0.6,
    ease: "power3.out",
  });

  gsap.to(".growth_seo-og-input.is--textarea", {
    minHeight: "5rem",
    duration: 0.6,
    ease: "power3.out",
  });

  gsap.to("[growth-seo-code-img]", {
    clipPath: "inset(0% 0% 100% 0%)",
    duration: 1,
    ease: "power3.in",
  });

  gsap.to("[growth-seo-code-wrap]", {
    delay: 1,
    height: "18rem",
    duration: 1,
    ease: "power3.out",
  });

  gsap.to("[growth-seo-dots-wrap]", {
    delay: 1.5,
    autoAlpha: 1,
    duration: 0.5,
    ease: "power3.out",
  });

  gsap.to("[data-seo-code-button]", {
    delay: 1.5,
    autoAlpha: 1,
    duration: 0.5,
    ease: "power3.out",
  });

  gsap.to("[data-og-hover]", {
    delay: 1.5,
    autoAlpha: 1,
    duration: 0.5,
    ease: "power3.out",
  });

  // Set textElements back to blank using Typed.js
  const textElements = document.querySelectorAll("[data-growth-seo-text]");
  textElements.forEach((el) => {
    new Typed(el, {
      strings: [" "],
      startDelay: 0,
      showCursor: false,
    });
  });

  // Remove "pointer-none" attribute
  const codeWrap = document.querySelectorAll("[growth-seo-trigger]");
  codeWrap.forEach((codeWrap) => {
    if (codeWrap && codeWrap.hasAttribute("pointer-none")) {
      codeWrap.removeAttribute("pointer-none");
    }
  });

  // Reset text content
  const codeText = document.querySelector("[growth-seo-code-text]");
  if (codeText) {
    codeText.textContent = "Code";
  }

  const reduceTrigger = document.querySelector("[data-reduce-trigger]");
  if (reduceTrigger) {
    reduceTrigger.setAttribute("data-reduce-trigger", "");
  }
}

function initGrowthSEOScroll() {
  const seoSection = document.querySelector("[data-growth-seo-section]");
  const seoScreens = document.querySelectorAll("[growth-seo-code-trans]");
  const seoTrigger = document.querySelector("[data-seo-code-button]");

  gsap.set(seoScreens, {
    y: "10rem",
  });

  // ScrollTriggered animation
  growthSEOScrollInstances.push(
    ScrollTrigger.create({
      trigger: seoSection,
      start: "top center",
      once: true,
      onEnter: () => {
        gsap.to(seoScreens, {
          y: "0rem",
          duration: 1.5,
          ease: "power2.inOut",
          stagger: 0.2,
        });
      },
    }),
  );

  growthSEOScrollInstances.push(
    ScrollTrigger.create({
      trigger: seoSection,
      start: "top 5%",
      once: true,
      onEnter: () => {
        setTimeout(() => {
          seoTrigger.click();
        }, 500);
      },
    }),
  );
}

export function refreshGrowthSEOScroll() {
  growthSEOScrollInstances.forEach((instance) => instance.refresh());
}

export function initGrowthSEO() {
  initSeoRippleLines();
  initGrowthSEOInteractions();
  initGrowthSEOScroll();

  // reduced motion check
  if (!window.prm) {
  }
}
