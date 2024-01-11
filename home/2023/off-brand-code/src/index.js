import { initEffects } from "./js/effects";
import { initUtils, combinedRefresh } from "./js/utils";
import { secMadeInWebflow } from "./js/secMadeInWebflow";
import { initSliders } from "./js/sliders";
import { initGrowthLocal } from "./js/secGrowthLocal";
import { initGrowthApp } from "./js/secGrowthApp";
import { initGrowthCollab } from "./js/secGrowthCollaboration";
import { initGrowthSEO } from "./js/secGrowthSEO";
import { initFeaturesSection, initFeaturesStates } from "./js/secFeatures";
import { initEnterpriseSection } from "./js/secEnterprise";
import { initFooterCTASection } from "./js/secFooterCTA";
import { initGlPlaceholderSection } from "./js/secGlPlaceholder";

// handle preferes reduced motion
window.prm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// handle tablet cut off
const tabletMediaQuery = window.matchMedia("(max-width: 991px)");
window.isTabletOrBelow = tabletMediaQuery.matches;
tabletMediaQuery.addEventListener("change", (event) => {
  window.isTabletOrBelow = event.matches;
});

export function app() {
  initEffects();
  if (!window.isTabletOrBelow) {
    initFeaturesStates();
    window.addEventListener("load", initFeaturesSection);
    initFooterCTASection();
    // initSliderFade();
  }
  initGlPlaceholderSection();
  initEnterpriseSection();
  initUtils();
  secMadeInWebflow();
  initSliders();
  initGrowthLocal();
  initGrowthApp();
  initGrowthCollab();
  initGrowthSEO();

  // combined scroll trigger refresh
  if (!window.prm && !window.isTabletOrBelow) {
    window.addEventListener("load", () => {
      combinedRefresh();
    });
  }
}
