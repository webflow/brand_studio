
//--------------------------------------
//---- Outro Animation Only ------------
//--------------------------------------

// Ensure GSAP and ScrollTrigger are available before proceeding
if (typeof gsap === "undefined" || typeof ScrollTrigger === "undefined") {
  console.warn("GSAP or ScrollTrigger not loaded. Outro animation aborted.");
  // Consider adding a graceful fallback or error handling here if appropriate
  // (e.g., hiding the outro section, showing a static image, etc.)
} else {
  gsap.registerPlugin(ScrollTrigger);

  // Cache outro section elements
  const outroSection = document.querySelector("#outro");

  if (outroSection) {
    const outroImg = outroSection.querySelector("[data-outro-img]");
    const outroLeft = outroSection.querySelector("[data-outro-left]");
    const outroRight = outroSection.querySelector("[data-outro-right]");

    // Only proceed if the essential image element is found
    if (outroImg) {
      // Set initial states for outro elements
      gsap.set(outroImg, {
        clipPath: "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)",
      });
      // Conditionally set initial states for left and right if they exist
      if (outroLeft) {
        gsap.set(outroLeft, { x: "10vw" });
      }
      if (outroRight) {
        gsap.set(outroRight, { x: "-10vw" });
      }

      // Create the outro animation timeline
      const outroTl = gsap.timeline({
        defaults: {
          ease: "none",
        },
      });

      // Add all animations to the timeline
      outroTl
        .fromTo(
          outroImg,
          { clipPath: "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)" },
          { clipPath: "polygon(45.5% 45%, 54.5% 45%, 55% 55%, 45% 55%)" }
        )
        .to(
          [outroLeft, outroRight], // GSAP handles nulls in arrays gracefully, but it's good practice to ensure they exist if critical
          {
            x: "0",
          },
          0 // Start at the beginning of the timeline
        );

      // Create the ScrollTrigger for outro animation
      const outroTrigger = ScrollTrigger.create({
        trigger: outroSection,
        start: `top 30%`,
        end: `10% 30%`,
        animation: outroTl,
        scrub: 1, // Smooth scrubbing effect
        // pin: true, // Consider pinning the section if you want it to stay in place while the animation runs
        // markers: true, // Useful for debugging your scroll points
      });

      // Optional: Add a refresh listener only if truly necessary for specific edge cases.
      // In most cases, ScrollTrigger manages refreshes automatically.
      // ScrollTrigger.addEventListener("refresh", () => {
      //   if (outroTrigger) {
      //     outroTrigger.refresh();
      //   }
      // });

      // No need for the !outroTrigger.isActive reset. GSAP's set and ScrollTrigger's
      // scrub will handle the initial state and animation progress based on scroll.
    } else {
      console.warn(
        "Outro image element [data-outro-img] not found within #outro. Outro animation skipped."
      );
    }
  } else {
    console.warn(
      "Outro section with ID #outro not found. Outro animation skipped."
    );
  }
}
