const images = [];
const root = document.querySelector(".section.cc-wc-hero");

// Collect all image sources
root.querySelectorAll(".medias img").forEach((image) => {
  images.push(image.getAttribute("src"));
});

let incr = 0,
  oldIncr = 0,
  firstMove = true,
  resetDist = window.innerWidth / 15,
  indexImg = 0;

// Mouse move event listener
window.addEventListener("DOMContentLoaded", () => {
  root.addEventListener("mousemove", (e) => {
    const val = e.clientX;

    // Prevent first jump reveal image behavior
    if (firstMove) {
      firstMove = false;
      oldIncr = val;
      return;
    }

    // Track movement distance
    incr += Math.abs(val - oldIncr);
    oldIncr = val;

    if (incr > resetDist) {
      incr = 0;
      createMedia(e.clientX, e.clientY - root.getBoundingClientRect().top);
    }
  });
});

function createMedia(x, y) {
  const image = document.createElement("img");
  image.setAttribute("src", images[indexImg]);
  image.classList.add("wc_hero_img");

  // Append directly to body to ensure viewport positioning
  document.body.appendChild(image);

  const tl = gsap.timeline();

  tl.fromTo(
    image,
    {
      x,
      y,
      yPercent: -50 + (Math.random() - 0.5) * 10,
      xPercent: -50 + (Math.random() - 0.5) * 80,
      rotation: (Math.random() - 0.5) * 20,
      scaleX: 1.3,
      scaleY: 1.3,
    },
    {
      scaleX: 1,
      scaleY: 1,
      ease: "elastic.out(2, 0.6)",
      duration: 0.6,
    }
  );

  tl.to(image, {
    duration: 0.3,
    scale: 0.5,
    delay: 0.1,
    ease: "back.in(1.5)",
    onComplete: () => {
      image.remove();
      tl.kill();
    },
  });

  indexImg = (indexImg + 1) % images.length;
}
