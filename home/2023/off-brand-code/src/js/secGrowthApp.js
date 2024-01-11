import gsap from "gsap";
import { Flip } from "gsap/Flip";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { MotionPathPlugin } from "gsap/MotionPathPlugin";

gsap.registerPlugin(ScrollTrigger, Flip, MotionPathPlugin);

// ------------------------------- INTERACTION ANIMATIONS
let flippedTriggers = [];
let resetTimeout = null;

function initGrowthAppAnims() {
  let glowTween;
  const triggers = document.querySelectorAll("[data-trigger-app]");
  const allTargets = document.querySelectorAll("[data-target-app]");
  const designerGlow = document.querySelector("[data-app-designer-glow]");

  gsap.set(designerGlow, {
    autoAlpha: 0,
  });

  function moveToFront(element) {
    allTargets.forEach((target) => {
      const currentOrder = parseInt(getComputedStyle(target).order, 10) || 0;
      target.style.order = (currentOrder + 1).toString();
    });

    element.style.order = "-1";
  }

  function checkAllFlipped() {
    if (flippedTriggers.length === triggers.length) {
      if (resetTimeout) {
        clearTimeout(resetTimeout);
      }
      resetTimeout = setTimeout(resetGrowthApp, 5000);
    }
  }

  triggers.forEach((trigger) => {
    const dataValue = trigger.getAttribute("data-trigger-app");
    const correspondingTarget = document.querySelector(
      `[data-target-app="${dataValue}"]`,
    );
    const designerRowText = correspondingTarget.querySelector(
      "[data-app-row-text]",
    );
    const designerRowIcon = correspondingTarget.querySelector(
      "[data-app-row-icon]",
    );

    if (!correspondingTarget) return;

    let wasClicked = false;

    trigger.addEventListener("mouseenter", function () {
      correspondingTarget.setAttribute("data-app-status", "pending");
      moveToFront(correspondingTarget);
    });

    trigger.addEventListener("mouseleave", function () {
      const currentStatus = correspondingTarget.getAttribute("data-app-status");
      if (!wasClicked && currentStatus !== "active") {
        correspondingTarget.setAttribute("data-app-status", "inactive");
      }
    });

    let glowTimeline = gsap
      .timeline({ paused: true })
      .to(designerGlow, {
        delay: 1.5,
        autoAlpha: 0.7,
        duration: 0.5,
      })
      .to(designerGlow, {
        autoAlpha: 0,
        duration: 0.5,
      });

    trigger.addEventListener("click", function () {
      wasClicked = true;
      const state = Flip.getState(trigger);
      const appBin = document.querySelector("[data-app-bin]");
      appBin.appendChild(trigger);

      // Animations...
      glowTimeline.restart();

      gsap.to(designerRowText, {
        delay: 1.5,
        textShadow: "0 0 10px hsla(0, 0.00%, 100.00%, 0.50)",
        duration: 0.5,
        onComplete: function () {
          gsap.to(designerRowText, {
            textShadow: "0 0 0px hsla(0, 0.00%, 100.00%, 0.50)",
            duration: 0.5,
          });
        },
      });
      gsap.to(designerRowIcon, {
        delay: 1.5,
        boxShadow: "0 0 10px 0 hsla(0, 0.00%, 100.00%, 0.30)",
        duration: 0.5,
        onComplete: function () {
          gsap.to(designerRowIcon, {
            boxShadow: "0 0 10px 0 hsla(0, 0.00%, 100.00%, 0)",
            duration: 0.5,
          });
        },
      });

      if (!flippedTriggers.includes(trigger)) {
        flippedTriggers.push(trigger);
      }
      checkAllFlipped();

      // Flip function...
      Flip.from(state, {
        duration: 1.5,
        ease: "power2.inOut",
        onComplete: function () {
          correspondingTarget.setAttribute("data-app-status", "active");
          wasClicked = false;
        },
      });
    });
  });
}

function resetGrowthApp() {
  if (resetTimeout) {
    clearTimeout(resetTimeout);
  }
  const allStatusElements = document.querySelectorAll("[data-app-status]");
  allStatusElements.forEach((el) => {
    el.setAttribute("data-app-status", "inactive");
  });
  const allTriggerElements = document.querySelectorAll("[data-trigger-app]");
  allTriggerElements.forEach((trigger) => {
    const dataValue = trigger.getAttribute("data-trigger-app");
    const correspondingResetElement = document.querySelector(
      `[data-app-reset="${dataValue}"]`,
    );
    if (!correspondingResetElement) {
      console.error(
        `Could not find a reset element corresponding to trigger ${dataValue}`,
      );
      return;
    }
    const initialState = Flip.getState(trigger);
    correspondingResetElement.appendChild(trigger);
    Flip.from(initialState, {
      duration: 1,
      ease: "power2.inOut",
    });
  });

  flippedTriggers.length = 0;
}

// ------------------------------- SCROLL IN ANIMATIONS

function initGrowthAppScroll() {
  gsap.set("[data-designer-app]", {
    x: "10rem",
  });
  gsap.set("[data-app-pannel]", {
    x: "-101%",
  });

  const stGrowthScrollIn = ScrollTrigger.create({
    trigger: "[data-growth-apps]",
    start: "top center",
    once: true,
    onEnter: () => {
      gsap.to("[data-designer-app]", {
        x: "0rem",
        duration: 1.5,
        ease: "power2.inOut",
      });
      gsap.to(
        {},
        {
          delay: 0.75,
          onComplete: () => {
            const icon = document.querySelector("[data-growth-app-icon]");
            if (icon) {
              icon.setAttribute("data-left-icon", "active");
            }
          },
        },
      );
      gsap.to("[data-app-pannel]", {
        delay: 0.75,
        x: "0%",
        duration: 1,
        ease: "power2.inOut",
      });
    },
  });

  return stGrowthScrollIn;
}

function initGrowthAppRotate() {
  const isMobile = window.innerWidth <= 767;

  const animations = isMobile
    ? [
        {
          element: "jasper",
          path: "[growth-app-circle-path2]",
          start: 0.8,
          end: 0.7,
          direction: -1,
        },
        {
          element: "make",
          path: "[growth-app-circle-path2]",
          start: 0.5,
          end: 0.4,
          direction: -1,
        },
        {
          element: "finsweet",
          path: "[growth-app-circle-path3]",
          start: 0.5,
          end: 0.6,
          direction: 1,
        },
        {
          element: "unsplash",
          path: "[growth-app-circle-path4]",
          start: 0.6,
          end: 0.7,
          direction: 1,
        },
        {
          element: "typeform",
          path: "[growth-app-circle-path4]",
          start: 0.4,
          end: 0.5,
          direction: 1,
        },
      ]
    : [
        {
          element: "jasper",
          path: "[growth-app-circle-path2]",
          start: 0.6,
          end: 0.5,
          direction: -1,
        },
        {
          element: "make",
          path: "[growth-app-circle-path3]",
          start: 0.3,
          end: 0.5,
          direction: -1,
        },
        {
          element: "finsweet",
          path: "[growth-app-circle-path3]",
          start: 0.6,
          end: 0.7,
          direction: 1,
        },
        {
          element: "unsplash",
          path: "[growth-app-circle-path4]",
          start: 0.8,
          end: 0.7,
          direction: 1,
        },
        {
          element: "typeform",
          path: "[growth-app-circle-path4]",
          start: 0.6,
          end: 0.5,
          direction: 1,
        },
      ];

  const stGrowthRotate = animations
    .map(({ element, path, start, end, direction }) => {
      const el = document.querySelector(`[data-app-reset="${element}"]`);
      const motionPathElement = document.querySelector(path);
      if (el && motionPathElement) {
        const animation = gsap
          .to(el, {
            scrollTrigger: {
              trigger: "[data-growth-apps]",
              start: "top bottom",
              end: "bottom top",
              scrub: true,
            },
            motionPath: {
              path: motionPathElement,
              align: motionPathElement,
              start: start,
              end: end,
              alignOrigin: [0.5, 0.5],
            },
          })
          .timeScale(direction);

        return ScrollTrigger.getById(animation.scrollTrigger.id);
      }
      return null;
    })
    .filter(Boolean);

  return stGrowthRotate;
}

let growthAppScrollInstance;
let growthAppRotateInstances;

export function refreshGrowthApp() {
  if (growthAppScrollInstance) growthAppScrollInstance.refresh();
  if (growthAppRotateInstances)
    growthAppRotateInstances.forEach((instance) => instance.refresh());
}

export function initGrowthApp() {
  initGrowthAppAnims();
  // reduced motion check
  if (!window.prm) {
    initGrowthAppScroll();
    initGrowthAppRotate();
  }
}
