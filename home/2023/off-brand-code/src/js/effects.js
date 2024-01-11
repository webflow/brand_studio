import gsap from "gsap";

function highlightGlint() {
  // Throttle function to limit the number of function calls.
  function throttle(func, limit) {
    let inThrottle;
    return function () {
      const args = arguments;
      const context = this;
      if (!inThrottle) {
        func.apply(context, args);
        inThrottle = true;
        setTimeout(() => (inThrottle = false), limit);
      }
    };
  }

  function onMouseMove(e) {
    let target = e.target;
    while (target && !target.matches("[glint-target]")) {
      target = target.parentElement;
    }
    if (!target) return;

    const glintGlow = target.querySelector("[highlight-glow]");
    const rect = target.getBoundingClientRect();
    const glowX = e.clientX - rect.left - rect.width / 2; // centering
    const glowY = e.clientY - rect.top - rect.height / 2; // centering

    // Use transform for animation
    gsap.to(glintGlow, {
      x: glowX,
      y: glowY,
      duration: 0.3,
      ease: "power2.out",
    });
  }

  function onMouseLeave(e) {
    // similar to onMouseMove
  }

  // Throttle the mousemove event handler to improve performance
  document.addEventListener("mousemove", throttle(onMouseMove, 16)); // approx. 60fps
  document.addEventListener("mouseleave", onMouseLeave);
}

function highlightInteriorGlint() {
  const glintElements = document.querySelectorAll("[glint-interior]");

  glintElements.forEach((glintHighlight) => {
    const glintGlow = glintHighlight.querySelector("[glint-interior-glow]");
    let rect;
    rect = glintHighlight.getBoundingClientRect(); // @resize

    glintHighlight.addEventListener("mousemove", function (e) {
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const dx = e.clientX - centerX;
      const dy = e.clientY - centerY;

      const angle = dx !== 0 ? dy / dx : dy > 0 ? Infinity : -Infinity;

      const isTopOrBottomEdge = Math.abs(angle) > rect.height / rect.width;
      const glowX = isTopOrBottomEdge
        ? (dy > 0 ? rect.height / 2 : -rect.height / 2) / angle
        : dx > 0
        ? rect.width / 2
        : -rect.width / 2;
      const glowY = angle * glowX;

      gsap.to(glintGlow, {
        x: glowX,
        y: glowY,
        duration: 0.3,
        ease: "power2.out",
      });
    });

    glintHighlight.addEventListener("mouseleave", () => {
      gsap.to(glintGlow, { x: 0, y: 0, duration: 0.3, ease: "power2.out" });
    });
  });
}

function highlightBacklight() {
  const maxDistance = 10 * 16;
  const highlightTargets = document.querySelectorAll(
    '[highlight-target="backlight"]',
  );

  highlightTargets.forEach((target) => {
    const glow = target.querySelector("[backlight-element]");
    if (!glow) return;

    let rect;
    rect = target.getBoundingClientRect(); // @resize

    target.addEventListener("mousemove", function (e) {
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const dirX = e.clientX - centerX;
      const dirY = e.clientY - centerY;

      const magnitude = Math.sqrt(dirX * dirX + dirY * dirY);
      const moveX = (dirX / magnitude) * maxDistance;
      const moveY = (dirY / magnitude) * maxDistance;

      gsap.to(glow, {
        opacity: 0.1,
        x: moveX,
        y: moveY,
        duration: 0.3,
        ease: "power2.out",
      });
    });

    target.addEventListener("mouseleave", () => {
      gsap.to(glow, {
        x: 0,
        y: 0,
        opacity: 0,
        duration: 0.3,
        ease: "power2.out",
      });
    });
  });
}

export function initEffects() {
  if (!window.isTabletOrBelow) {
    highlightGlint();
    // highlightInteriorGlint();
    highlightBacklight();
  }
}
