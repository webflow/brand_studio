import Typed from "typed.js";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

let userInteracted = false;
const growthLocalScrollInstances = [];

function initGrowthLocalType() {
  let isTranslated = false;

  document
    .querySelector("[data-loc-trigger]")
    .addEventListener("click", function () {
      userInteracted = true;

      // Get all elements with the data-loc-translate attribute
      const elementsToTranslate = document.querySelectorAll(
        "[data-loc-translate]",
      );

      elementsToTranslate.forEach((el) => {
        const originalText =
          el.getAttribute("data-loc-original") || el.textContent;
        const translation = el.getAttribute("data-loc-translate");

        // Save the original text if not already done
        if (!el.getAttribute("data-loc-original")) {
          el.setAttribute("data-loc-original", originalText);
        }

        let typeSpeed = 20;
        let backSpeed = 20;

        // Adjust speed if the data-speed-adjust attribute is present
        const speedAdjust = el.getAttribute("data-speed-adjust");
        if (speedAdjust) {
          typeSpeed = typeSpeed / parseFloat(speedAdjust);
          backSpeed = backSpeed / parseFloat(speedAdjust);
        }

        // Determine which text to type based on the toggle state
        const textToType = isTranslated ? originalText : translation;

        new Typed(el, {
          strings: [el.textContent, textToType],
          typeSpeed: typeSpeed,
          backSpeed: backSpeed,
          backDelay: 0,
          startDelay: 0,
          showCursor: false,
          loop: false,
        });
      });

      // Handle the [data-loc-trigger-text] element
      const triggerTextElement = document.querySelector(
        "[data-loc-trigger-text]",
      );
      if (triggerTextElement) {
        const originalTriggerText = triggerTextElement.getAttribute(
          "data-loc-trigger-text",
        );
        if (isTranslated) {
          triggerTextElement.style.marginLeft = "0.5rem";
        } else {
          triggerTextElement.style.marginLeft = "0rem";
        }

        let typeSpeed = 20;
        let backSpeed = 20;

        // Adjust speed if the data-speed-adjust attribute is present on triggerTextElement
        const speedAdjust =
          triggerTextElement.getAttribute("data-speed-adjust");
        if (speedAdjust) {
          typeSpeed = typeSpeed / parseFloat(speedAdjust);
          backSpeed = backSpeed / parseFloat(speedAdjust);
        }

        const textToTypeForTrigger = isTranslated ? originalTriggerText : "";
        new Typed(triggerTextElement, {
          strings: [triggerTextElement.textContent, textToTypeForTrigger],
          typeSpeed: typeSpeed,
          backSpeed: backSpeed,
          backDelay: 0,
          startDelay: 0,
          showCursor: false,
          loop: false,
        });
      }

      // Toggle the state
      isTranslated = !isTranslated;
    });
}

function initGrowthLocalScroll() {
  const localSection = document.querySelector("[data-growth-local]");
  const localScreen = document.querySelector("[data-growth-local-screen]");
  const localTrigger = document.querySelector("[growth-loc-trigger-inner]");

  gsap.set(localScreen, {
    y: "10rem",
  });

  // ScrollTriggered animation
  growthLocalScrollInstances.push(
    ScrollTrigger.create({
      trigger: localSection,
      start: "top center",
      once: true,
      onEnter: () => {
        gsap.to(localScreen, {
          y: "0rem",
          duration: 1.5,
          ease: "power2.inOut",
        });
      },
    }),
  );

  growthLocalScrollInstances.push(
    ScrollTrigger.create({
      trigger: localSection,
      start: "top 5%",
      once: true,
      // markers: true,
      onEnter: () => {
        if (userInteracted) return;

        setTimeout(() => {
          localTrigger.click();
        }, 500);

        gsap.to(localTrigger, {
          duration: 0.5,
          boxShadow: "0 0 30px 0 hsla(0, 0.00%, 100.00%, 0.20)",
          scale: 0.95,
          ease: "power2.inOut",
          yoyo: true,
          repeat: 1,
        });
      },
    }),
  );
}

export function refreshGrowthLocalScroll() {
  growthLocalScrollInstances.forEach((instance) => instance.refresh());
}

export function initGrowthLocal() {
  initGrowthLocalScroll();
  initGrowthLocalType();

  // reduced motion check
  if (!window.prm) {
  }
}
