import gsap from "gsap";
import Tween from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

madeScrollInstances = [];

// ———————————————————— MADE IN WEBFLOW
function initMadeBadgeScroll() {
  // Ensure GSAP and ScrollTrigger are loaded
  madeScrollInstances.push(
    Tween.to("[data-miw-outer-wrap]", {
      scrollTrigger: {
        trigger: "[miw-trigger]",
        start: "bottom bottom",
        end: "bottom top",
        scrub: true,
      },
      y: "60vh",
      // autoAlpha: 0,
      scale: 0.9,
      ease: "power2.out",
    }),
  );
}

function initMadeImgParallax() {
  const elements = document.querySelectorAll(".miw_img-trans");

  elements.forEach((el) => {
    madeScrollInstances.push(
      Tween.to(el, {
        y: Math.random() * 40 - 20 + "vh",
        ease: "power2.inOut",
        scrollTrigger: {
          trigger: "[miw-trigger]",
          start: "top bottom",
          end: "bottom center",
          scrub: true,
        },
      }),
    );
  });
}

function initMadeImgMouseFollow() {
  const triggerElement = document.querySelector("[miw-trigger]");
  const targetElements = [document.querySelectorAll(".miw_mouse-track")];

  if (!triggerElement) {
    console.error("[miw-trigger] not found!");
    return;
  }

  if (!targetElements.length) {
    console.error(".miw_mouse-track elements not found!");
    return;
  }

  const multipliers = targetElements.map(() => ({
    x: Math.random() * 2 + 1, // random between 1 and 3
    y: Math.random() * 2 + 1, // random between 1 and 3
  }));

  triggerElement.addEventListener("mousemove", (event) => {
    const bounds = triggerElement.getBoundingClientRect();
    const x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1; // normalize to -1 to 1
    const y = ((event.clientY - bounds.top) / bounds.height) * 2 - 1; // normalize to -1 to 1

    targetElements.forEach((el, index) => {
      Tween.to(el, {
        x: multipliers[index].x * x + "em",
        y: multipliers[index].y * y + "em",
        duration: 1.5,
        ease: "power2.out",
      });
    });
  });

  triggerElement.addEventListener("mouseleave", () => {
    targetElements.forEach((el) => {
      Tween.to(el, {
        x: 0,
        y: 0,
        duration: 1.5,
        ease: "power2.in",
      });
    });
  });
}

function initMadeFadeIn() {
  const triggerElement = document.querySelector("[miw-trigger]");
  const targetElements = document.querySelectorAll(".miw_fade-w");

  // Initial state for target elements
  Tween.set(targetElements, {
    autoAlpha: 0,
    scale: 0.7,
    y: "5em",
  });

  madeScrollInstances.push(
    Tween.to(targetElements, {
      autoAlpha: 1,
      scale: 1,
      y: 0,
      ease: "power2.inOut",
      stagger: 0.1, // this can be adjusted based on the desired effect
      duration: 2,
      // onComplete: initMadeConveyor,
      scrollTrigger: {
        trigger: triggerElement,
        start: "top 80%",
        once: true, // ensures the animation only happens once
        // onComplete: initMadeImgMouseFollow
      },
    }),
  );
}

function initMadeBadgeTracking() {
  const badge = document.querySelector("[miw-badge]");
  const gradientBg = badge.querySelector(".miw_gradient-bg");

  badge.addEventListener("mousemove", (e) => {
    const badgeBounds = badge.getBoundingClientRect();

    // Calculate position relative to the badge element
    const relativeX = e.clientX - badgeBounds.left;
    const relativeY = e.clientY - badgeBounds.top;

    Tween.to(gradientBg, {
      x: relativeX - gradientBg.offsetWidth / 2,
      y: relativeY - gradientBg.offsetHeight / 2,
      ease: "power3.out", // Add desired easing here
      duration: 0.3, // Adjust the duration for faster/slower movement
    });
  });
}

export function refreshMadeScrollInstances() {
  madeScrollInstances.forEach((instance) => instance.scrollTrigger.refresh());
}

export function secMadeInWebflow() {
  if (!window.isTabletOrBelow) {
    initMadeBadgeScroll();
    // initMadeBadgeTracking();

    // reduced motion check
    if (!window.prm) {
      initMadeImgParallax();
      initMadeFadeIn();
      initMadeImgMouseFollow();
    }
  }
}
