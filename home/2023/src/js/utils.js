import { refreshSliderTriggers } from "./sliders";
import { refreshGrowthApp } from "./secGrowthApp";
import { refreshGrowthCollabScroll } from "./secGrowthCollaboration";
import { refreshGrowthLocalScroll } from "./secGrowthLocal";
import { refreshGrowthSEOScroll } from "./secGrowthSEO";
import { refreshMadeScrollInstances } from "./secMadeInWebflow";
import { refreshFooterScrollInstances } from "./secFooterCTA";

// combine all refresh triggers
export function combinedRefresh() {
  // refreshSliderTriggers();
  refreshGrowthApp();
  refreshGrowthCollabScroll();
  refreshGrowthLocalScroll();
  refreshGrowthSEOScroll();
  refreshMadeScrollInstances();
  refreshFooterScrollInstances();
}

function setHeroContentHeight() {
  var element = document.querySelector("[data-hero-content-wrap]");

  if (element) {
    // get height
    var height = element.offsetHeight + "px";

    // set --hero-content-height
    document.documentElement.style.setProperty("--hero-content-height", height);
  }
}

// define when safari and add class to document
function addClassIfSafari() {
  if (
    navigator.userAgent.indexOf("Safari") !== -1 &&
    navigator.userAgent.indexOf("Chrome") === -1
  ) {
    document.documentElement.classList.add("is-safari");
  }
}

function toggleNotes() {
  const toggleElement = document.querySelector("[data-toggle-notes]");

  if (!toggleElement) return;
  toggleElement.addEventListener("click", function () {
    const body = document.body;
    body.setAttribute(
      "data-notes-check",
      body.getAttribute("data-notes-check") === "true" ? "" : "true",
    );
  });
}

export function initUtils() {
  toggleNotes();
  addClassIfSafari();

  if (!window.isTabletOrBelow) {
    setHeroContentHeight();
    // update webgl positioning on resize
    window.addEventListener("resize", setHeroContentHeight);
  }
}
