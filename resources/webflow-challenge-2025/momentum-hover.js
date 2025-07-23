gsap.registerPlugin(InertiaPlugin);

function initMomentumBasedHover() {
  // If this device can’t hover with a fine pointer, stop here
  if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
    return;
  }

  // Configuration (tweak these for feel)
  const xyMultiplier = 10; // multiplies pointer velocity for x/y movement
  const rotationMultiplier = 20; // multiplies normalized torque for rotation speed
  const inertiaResistance = 200; // higher = stops sooner

  // Pre-build clamp functions for performance
  const clampXY = gsap.utils.clamp(-1080, 1080);
  const clampRot = gsap.utils.clamp(-60, 60);

  // Initialize each root container
  document.querySelectorAll("[data-momentum-hover-init]").forEach((root) => {
    let prevX = 0,
      prevY = 0;
    let velX = 0,
      velY = 0;
    let rafId = null;

    // Track pointer velocity (throttled to RAF)
    root.addEventListener("mousemove", (e) => {
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        velX = e.clientX - prevX;
        velY = e.clientY - prevY;
        prevX = e.clientX;
        prevY = e.clientY;
        rafId = null;
      });
    });

    // Attach hover inertia to each child element
    root.querySelectorAll("[data-momentum-hover-element]").forEach((el) => {
      el.addEventListener("mouseenter", (e) => {
        const target = el.querySelector("[data-momentum-hover-target]");
        if (!target) return;

        // Compute offset from center to pointer
        const { left, top, width, height } = target.getBoundingClientRect();
        const centerX = left + width / 2;
        const centerY = top + height / 2;
        const offsetX = e.clientX - centerX;
        const offsetY = e.clientY - centerY;

        // Compute raw torque (px²/frame)
        const rawTorque = offsetX * velY - offsetY * velX;

        // Normalize torque so rotation ∝ pointer speed (deg/sec)
        const leverDist = Math.hypot(offsetX, offsetY) || 1;
        const angularForce = rawTorque / leverDist;

        // Calculate and clamp velocities
        const velocityX = clampXY(velX * xyMultiplier);
        const velocityY = clampXY(velY * xyMultiplier);
        const rotationVelocity = clampRot(angularForce * rotationMultiplier);

        // Apply GSAP inertia tween
        gsap.to(target, {
          inertia: {
            x: { velocity: velocityX, end: 0 },
            y: { velocity: velocityY, end: 0 },
            rotation: { velocity: rotationVelocity, end: 0 },
            resistance: inertiaResistance,
          },
        });
      });
    });
  });
}

// Initialize Momentum Based Hover (Inertia)
document.addEventListener("DOMContentLoaded", () => {
  initMomentumBasedHover();
});
