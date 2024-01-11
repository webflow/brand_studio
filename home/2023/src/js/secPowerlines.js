import gsap from "gsap";
import Tween from "gsap";
import { MotionPathPlugin } from "gsap/MotionPathPlugin";

gsap.registerPlugin(MotionPathPlugin);

// --------------------- POWERLINES

export function initPowerlines() {
  // move orb
  Tween.to("[data-pl-track1-orb='1']", {
    duration: 3,
    ease: "power2.inOut",
    repeat: -1, // infin
    yoyo: true, // back and forth
    motionPath: {
      path: "[pl-path-1]",
      align: "[pl-path-1]",
      start: 1,
      end: 0,
      // autoRotate: true,
      alignOrigin: [0.5, 0.5],
    },
  });

  Tween.to("[data-pl-track2-orb='1']", {
    duration: 3,
    ease: "power2.inOut",
    repeat: -1, // Infinite repetition
    yoyo: true, // Makes the animation play back and forth
    motionPath: {
      path: "[pl-path-2]",
      align: "[pl-path-2]",
      start: 1,
      end: 0,
      // autoRotate: true, // Uncomment if needed
      alignOrigin: [0.5, 0.5],
    },
  });

  Tween.to("[data-pl-track3-orb='1']", {
    duration: 3,
    ease: "power2.inOut",
    repeat: -1, // infin
    yoyo: true, // back and forth
    motionPath: {
      path: "[pl-path-3]",
      align: "[pl-path-3]",
      // autoRotate: true,
      alignOrigin: [0.5, 0.5],
    },
  });

  Tween.to("[data-pl-track4-orb='1']", {
    duration: 3,
    ease: "power2.inOut",
    repeat: -1, // infin
    yoyo: true, // back and forth
    motionPath: {
      path: "[pl-path-4]",
      align: "[pl-path-4]",
      // autoRotate: true,
      alignOrigin: [0.5, 0.5],
    },
  });
}
