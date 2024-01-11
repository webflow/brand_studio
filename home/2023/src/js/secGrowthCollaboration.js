import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

let userInteracted = false;
const growthCollabScrollInstances = [];

function initGrowthCollabScroll() {
  const commentPins = document.querySelectorAll("[data-comment-pin]");
  const commentMain = document.querySelector('[data-comment-pin="main"]');
  const collabDesigner = document.querySelector("[data-designer-collab]");
  const collabSection = document.querySelector("[data-growth-collab]");
  const collabDim = document.querySelector("[designer-collab-canvas-dim]");
  const commentRipple = document.querySelector("[data-highlight-ripple]");
  const commentResult = document.querySelector("[growth-comment-result]");
  const submitButton = document.querySelector("[data-growth-comment-submit]");
  const commentWrap = document.querySelector("[data-growth-comment-wrap]");
  const clearButton = document.querySelector("[data-comment-pannel-close]");
  const inputField = document.querySelector("[data-growth-comment-input]");

  // initial settings
  gsap.set(collabDesigner, { y: "10rem" });
  gsap.set(commentPins, { y: "10rem" });
  gsap.set(collabDim, { autoAlpha: 0 });
  gsap.set(commentRipple, { autoAlpha: 0, scale: 0 });

  // On main comment pin click
  commentMain.addEventListener("click", function () {
    userInteracted = true;
    commentWrap.setAttribute("data-growth-comment-wrap", "open");
    gsap.to(collabDim, { autoAlpha: 0, duration: 0.6, overwrite: true });
    commentMain.setAttribute("data-comment-pannel", "open");
    gsap.to(commentRipple, {
      autoAlpha: 0,
      scale: 0,
      duration: 0.6,
      ease: "power2.inOut",
    });
  });

  // On clear button click
  clearButton.addEventListener("click", function () {
    commentWrap.setAttribute("data-growth-comment-wrap", "closed");
    gsap.to(collabDim, { autoAlpha: 0.8, duration: 0.6 });
    commentMain.setAttribute("data-comment-pannel", "closed");
    gsap.to(commentRipple, {
      autoAlpha: 1,
      scale: 1,
      duration: 0.6,
      ease: "power2.inOut",
    });
    gsap.set(commentResult, { display: "none", autoAlpha: 0 });
    submitButton.setAttribute("data-growth-comment-submit", "");
    inputField.setAttribute("data-growth-comment-input", "");
  });
  // scroll in animation
  growthCollabScrollInstances.push(
    ScrollTrigger.create({
      trigger: collabSection,
      start: "top center",
      once: true,
      onEnter: () => {
        gsap.to(collabDesigner, {
          y: "0rem",
          duration: 1.5,
          ease: "power2.inOut",
        });
        gsap.to(commentPins, {
          y: "0rem",
          duration: 1.5,
          ease: "power2.inOut",
          stagger: 0.2,
        });
        gsap.to(collabDim, {
          autoAlpha: 0.8,
          duration: 1.5,
          ease: "power2.inOut",
        });
        gsap.to(commentRipple, {
          delay: 0.75,
          autoAlpha: 1,
          scale: 1,
          duration: 1.5,
          ease: "power2.inOut",
        });
      },
    }),
  );

  commentMain.addEventListener("mouseenter", function () {
    if (commentMain.getAttribute("data-comment-pannel") !== "open") {
      gsap.to(commentRipple, {
        autoAlpha: 0,
        scale: 0,
        duration: 0.6,
        ease: "power2.inOut",
      });
    }
  });

  commentMain.addEventListener("mouseleave", function () {
    if (commentMain.getAttribute("data-comment-pannel") !== "open") {
      gsap.to(commentRipple, {
        autoAlpha: 1,
        scale: 1,
        duration: 0.6,
        ease: "power2.inOut",
      });
    }
  });

  growthCollabScrollInstances.push(
    ScrollTrigger.create({
      trigger: collabSection,
      start: "top 10%",
      once: true,
      // markers: true,
      onEnter: () => {
        if (userInteracted) return;
        commentMain.click();
      },
    }),
  );
}

let blurValue = 6; // starting blur value

function animateRippleLines() {
  blurValue = 6; // Reset the blur value at the start of each iteration

  const rippleLines = document.querySelectorAll("[data-highlight-ripple-line]");
  const originalBorderColors = [
    "rgba(256, 256, 256, 0.1)",
    "rgba(256, 256, 256, 0.08)",
    "rgba(256, 256, 256, 0.07)",
    "rgba(256, 256, 256, 0.05)",
    "rgba(256, 256, 256, 0.03)",
  ];

  rippleLines.forEach((rippleLine, index) => {
    gsap.to(rippleLine, {
      delay: index * 0.6,
      onStart: function () {
        // Reset styles for all ripple lines
        rippleLines.forEach((line, idx) => {
          line.style.borderColor = originalBorderColors[idx];
          line.style.boxShadow = `0px 1px 6px 0px rgba(255, 107, 0, 0)`;
        });

        // Highlight the current line
        rippleLine.style.borderColor = "#FF6C01";
        rippleLine.style.boxShadow = `0px 1px ${blurValue}px 0px rgba(255, 107, 0, 0.40)`;
        blurValue += 2; // increase the blur value by 2px every time
      },
    });
  });

  // Calculate the total duration for one iteration (rippleLines.length times delay for each line)
  const totalDuration = rippleLines.length * 0.6;

  // Use setTimeout to call the function again after the total duration
  setTimeout(animateRippleLines, totalDuration * 1000); // Convert to milliseconds
}

function initGrowthCollabForm() {
  const form = document.querySelector("[growth-comment-form-w]");
  const inputField = form.querySelector("[data-growth-comment-input]");
  const submitButton = form.querySelector("[data-growth-comment-submit]");
  const commentResult = document.querySelector("[growth-comment-result]");
  const commentResultText = commentResult.querySelector(
    "[growth-comment-result-text]",
  );

  // Set the initial state
  gsap.set(commentResult, {
    display: "none",
    autoAlpha: 0,
  });

  form.addEventListener("click", function (e) {
    // Check if the clicked element is the submit button
    if (
      e.target &&
      e.target.getAttribute("data-growth-comment-submit") !== null
    ) {
      // If there's a value in the input field, continue with the actions
      if (inputField.value.trim() !== "") {
        // Show "Please wait..." on the submit button and disable it
        submitButton.setAttribute("data-growth-comment-submit", "disabled");
        inputField.setAttribute("data-growth-comment-input", "disabled");
        submitButton.setAttribute("value", "Please wait...");

        // Update the text of [growth-comment-result-text]
        commentResultText.textContent = inputField.value;

        setTimeout(() => {
          // Animate [growth-comment-result] to visible
          gsap.to(commentResult, {
            display: "flex",
            autoAlpha: 1,
            duration: 0.3,
          });

          submitButton.setAttribute("value", "Submit");
        }, 1000);

        // Clear the input field
        inputField.value = "";
      }
    }
  });
}

export function refreshGrowthCollabScroll() {
  growthCollabScrollInstances.forEach((instance) => instance.refresh());
}

export function initGrowthCollab() {
  initGrowthCollabForm();
  animateRippleLines();
  // reduced motion check
  if (!window.prm) {
    initGrowthCollabScroll();
  }
}
