import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const footerScrollInstances = [];

function initFooterCTA() {
  const footerTrigger = document.querySelector("[data-footer-cta-trigger]");
  const footerImg1 = document.querySelector("[data-footer-cta-img1]");
  const footerImg2 = document.querySelector("[data-footer-cta-img2]");
  const footerImg3 = document.querySelector("[data-footer-cta-img3]");
  const footerTransWrap = document.querySelector(
    "[data-footer-cta-trans-wrap]",
  );
  const footerTrans = document.querySelectorAll("[data-footer-cta-img-trans]");

  gsap.set([footerImg1, footerImg2, footerImg3], { y: "10rem", autoAlpha: 0 });

  // ScrollTriggered Animation
  footerScrollInstances.push(
    gsap.to([footerImg1, footerImg2, footerImg3], {
      scrollTrigger: {
        trigger: footerTrigger,
        start: "top 90%",
        once: true, // depends on whether you want to repeat the animation every time it comes into view
      },
      y: "0rem",
      duration: 1.5,
      autoAlpha: 1,
      ease: "power2.inOut",
      stagger: 0.2,
    }),
  );

  // Mouse Move Over footerTransWrap
  footerTransWrap.addEventListener("mousemove", function (e) {
    let rect = footerTransWrap.getBoundingClientRect();
    let x = e.clientX - rect.left;
    let y = e.clientY - rect.top;

    let maxX = 3; // max translateX
    let maxY = 3; // max translateY

    footerTrans.forEach((el, index) => {
      let transX = (x / rect.width) * (maxX * 2) - maxX;
      let transY = (y / rect.height) * (maxY * 2) - maxY;

      // Alternate the sign of the translation for every other element
      transX *= index % 2 === 0 ? 1 : -1;
      transY *= index % 2 === 0 ? 1 : -1;

      gsap.to(el, { x: transX, y: transY, duration: 0.3, ease: "power2.out" });
    });
  });
}

export function refreshFooterScrollInstances() {
  footerScrollInstances.forEach((instance) => instance.scrollTrigger.refresh());
}

export function initFooterCTASection() {
  if (!window.prm) {
    initFooterCTA();
  }
}
