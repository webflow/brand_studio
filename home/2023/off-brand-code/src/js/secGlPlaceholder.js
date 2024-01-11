import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

function initGlPlaceholder() {
  // Ensure gsap and ScrollTrigger are available
  if (typeof gsap === "undefined" || typeof ScrollTrigger === "undefined") {
    console.error("GSAP or ScrollTrigger is not loaded");
    return;
  }

  // Query selectors
  const plTrigger = document.querySelector("[data-gl-placeholder-trigger]");
  const plImg = document.querySelector("[data-gl-placeholder-img]");
  const plGlow = document.querySelector("[data-gl-placeholder-glow-wrap]");
  const plDim = document.querySelector("[data-gl-placeholder-dim]");
  const plPanels = document.querySelectorAll("[data-gl-placeholder-float-img]");

  // Initial states
  let duration = "1.5";
  gsap.set(plPanels, { autoAlpha: 0, y: "10rem" });
  gsap.set(plImg, { autoAlpha: 0, y: "101%", scale: 0.9 });

  // ScrollTrigger instance
  ScrollTrigger.create({
    trigger: plTrigger,
    start: "top 85%",
    onEnter: () => {
      gsap.to(plDim, {
        autoAlpha: 0,
        duration: duration,
        ease: "power2.inOut",
      });
      gsap.to(plGlow, {
        autoAlpha: 0,
        duration: duration,
        ease: "power2.inOut",
      });
      gsap.to(plPanels, {
        delay: 0.4,
        autoAlpha: 1,
        y: "0rem",
        stagger: 0.2,
        duration: duration,
        ease: "power2.inOut",
      });
      gsap.to(plImg, {
        autoAlpha: 1,
        y: "0%",
        scale: 1,
        duration: duration,
        ease: "power2.inOut",
      });
    },
  });
}

export function initGlPlaceholderSection() {
  if (window.isTabletOrBelow) {
    if (!window.prm) {
      initGlPlaceholder();
    }
  }
}
