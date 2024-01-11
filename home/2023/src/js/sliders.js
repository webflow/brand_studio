import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Swiper from "swiper";
import { Navigation } from "swiper/modules";

gsap.registerPlugin(ScrollTrigger);

// ----- swiper js

function initSliderInstances() {
  const trustedNext = document.querySelector("[ts-swipe-right]");
  const trustedPrev = document.querySelector("[ts-swipe-left]");
  const startedNext = document.querySelector("[gs-swipe-right]");
  const startedPrev = document.querySelector("[gs-swipe-left]");

  // ----- trusted section
  const swiperTrusted = new Swiper("[ts-swiper]", {
    modules: [Navigation],
    slidesPerView: "auto",
    spaceBetween: 32,
    loop: false,
    centeredSlides: false,
    // enabled: false,
    keyboard: {
      enabled: true,
      onlyInViewport: true,
    },
    // noSwipingSelector: "a",
    navigation: {
      nextEl: trustedNext,
      prevEl: trustedPrev,
    },
    breakpoints: {
      480: {
        slidesPerView: "auto",
      },
      768: {
        slidesPerView: "auto",
      },
      1280: {
        slidesPerView: "auto",
      },
      1920: {
        slidesPerView: "auto",
      },
      2560: {
        slidesPerView: "auto",
      },
    },
  });

  // ----- get started section
  const swiperGetStarted = new Swiper("[gs-swiper]", {
    modules: [Navigation],
    slidesPerView: "auto",
    spaceBetween: 32,
    loop: false,
    centeredSlides: false,
    keyboard: {
      enabled: true,
      onlyInViewport: true,
    },
    // noSwipingSelector: "a",
    navigation: {
      nextEl: startedNext,
      prevEl: startedPrev,
    },
    breakpoints: {
      480: {
        slidesPerView: "auto",
      },
      768: {
        slidesPerView: "auto",
      },
      1280: {
        slidesPerView: "auto",
      },
      1920: {
        slidesPerView: "auto",
      },
      2560: {
        slidesPerView: "auto",
      },
    },
  });
}

function initSliderFade() {
  gsap.set("[slide-trusted]", { x: "10rem", autoAlpha: 0 });

  const triggerTrust = ScrollTrigger.create({
    trigger: "[ts-swiper]",
    start: "top 90%",
    onEnter: () => {
      gsap.to("[slide-trusted]", {
        duration: 1.5,
        stagger: 0.2,
        x: "0rem",
        autoAlpha: 1,
        overwrite: "auto",
        ease: "power2.inOut",
        // onComplete: () => {
        //   swiperTrusted.enable()
        // }
      });
    },
  });

  gsap.set("[slide-started]", { x: "10rem", autoAlpha: 0 });

  const triggerStarted = ScrollTrigger.create({
    trigger: "[gs-swiper]",
    start: "top 90%",
    onEnter: () => {
      gsap.to("[slide-started]", {
        duration: 1.5,
        stagger: 0.2,
        x: "0rem",
        autoAlpha: 1,
        overwrite: "auto",
        ease: "power2.inOut",
        // onComplete: () => {
        //   swiperTrusted.enable()
        // }
      });
    },
  });

  return { triggerTrust, triggerStarted };
}

function initSliderTriggers() {
  triggers = initSliderFade();
}

export function refreshSliderTriggers() {
  if (triggers) {
    triggers.triggerTrust.refresh();
    triggers.triggerStarted.refresh();
  } else {
    console.error("Triggers are not initialized yet.");
  }
}

// --- init
export function initSliders() {
  initSliderInstances();
  // // tablet check & motion check
  if (!window.prm) {
    initSliderTriggers();
  }
}
