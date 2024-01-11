import gsap from "gsap";

function initEnterpriseGlow() {
  const enterpriseGrid = document.querySelector("[data-enterprise-grid]");
  if (!enterpriseGrid) return; // If enterpriseGrid is not found, exit the function

  const enterpriseCards = enterpriseGrid.querySelectorAll(
    "[data-enterprise-card]",
  );

  enterpriseCards.forEach((card) => {
    // For each card, calculate bounds once outside the mousemove event listener

    card.addEventListener("mousemove", (e) => {
      const cardBounds = card.getBoundingClientRect();
      const mouseX = e.clientX - cardBounds.left;
      const mouseY = e.clientY - cardBounds.top;
      const movementX = (mouseX - cardBounds.width / 2) * 0.4;
      const movementY = (mouseY - cardBounds.height / 2) * 0.4;

      const glowElements = card.querySelectorAll("[data-ent-card-glow]");
      glowElements.forEach((element) => {
        gsap.to(element, {
          x: `${movementX}px`,
          y: `${movementY}px`,
          ease: "power2.out",
          duration: 1,
          autoAlpha: 0.8,
        });
      });
    });

    card.addEventListener("mouseleave", () => {
      const glowElements = enterpriseGrid.querySelectorAll(
        "[data-ent-card-glow]",
      );
      glowElements.forEach((element) =>
        gsap.to(element, {
          x: "0px",
          y: "0px",
          ease: "power2.out",
          duration: 1,
          autoAlpha: 0.6,
        }),
      );
    });
  });
}

export function initEnterpriseSection() {
  // tablet check
  if (!window.isTabletOrBelow) {
    initEnterpriseGlow();
  }

  // reduced motion check
  if (!window.prm) {
  }
}
