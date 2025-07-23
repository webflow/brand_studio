document.addEventListener("DOMContentLoaded", () => {
    // Define a media query for screens wider than tablets (e.g., > 768px or > 992px)
    // You can adjust this breakpoint based on your definition of "tablet and below"
    const isDesktop = window.matchMedia("(min-width: 769px)").matches; // Example: applies to screens 769px and wider
  
    if (typeof window.gsap === "undefined") {
      document.documentElement.classList.add("gsap-not-found");
      return;
    }
  
    // Only register plugins and apply animations if it's a desktop screen
    if (isDesktop) {
      gsap.registerPlugin(ScrollTrigger, SplitText);
  
      gsap.set(
        "[data-fade-in-after-heading='true']:not([data-prevent-flicker='true'])",
        {
          opacity: 0,
          visibility: "hidden",
        }
      );
  
      document.querySelectorAll(".section.cc-wc-hero").forEach((section) => {
        const heading = section.querySelector(".wc_h0");
        const eyebrow = section.querySelector(".wc_eyebrow");
        const content = section.querySelector(".wc_hero_content");
        const fadeAfter = section.querySelectorAll(
          "[data-fade-in-after-heading='true']"
        );
  
        if (heading) {
          const split = SplitText.create([heading], {
            type: "words, chars",
            mask: "words",
            wordsClass: "word",
            charsClass: "char",
          });
  
          const tl = gsap.timeline();
  
          tl.from(
            split.words,
            {
              yPercent: 110,
              duration: 0.8,
              stagger: {
                amount: 0.2,
              },
              ease: "power2.out",
            },
            "<50%"
          );
  
          if (eyebrow) {
            tl.from(
              eyebrow,
              {
                opacity: 0,
                y: "4rem",
                duration: 0.64,
                ease: "power2.out",
              },
              "<20%"
            );
          }
  
          if (content) {
            tl.from(
              content,
              {
                opacity: 0,
                y: "6rem",
                duration: 0.6,
                ease: "power2.out",
              },
              "<30%"
            );
          }
  
          fadeAfter.forEach((el) => {
            if (el.hasAttribute("data-prevent-flicker")) {
              return;
            }
  
            // Elements that will have opacity AND y-transformation
            const childrenToStaggerWithY =
              el.querySelectorAll("p, img, span, div");
            // Elements that will ONLY have opacity transformation (like links)
            const childrenToOnlyFade = el.querySelectorAll("a");
  
            if (
              childrenToStaggerWithY.length > 0 ||
              childrenToOnlyFade.length > 0
            ) {
              // Set initial state for elements that get Y-transform
              gsap.set(childrenToStaggerWithY, {
                opacity: 0,
                y: "1rem",
              });
              // Set initial state for elements that only fade
              gsap.set(childrenToOnlyFade, {
                opacity: 0,
              });
  
              tl.to(
                el,
                {
                  opacity: 1,
                  visibility: "visible",
                  duration: 0.1,
                  ease: "power2.out",
                },
                ">+=0.2"
              );
  
              // Animate elements with Y-transform
              if (childrenToStaggerWithY.length > 0) {
                tl.to(
                  childrenToStaggerWithY,
                  {
                    opacity: 1,
                    y: "0rem",
                    duration: 0.6,
                    stagger: {
                      amount: 0.3,
                    },
                    ease: "power2.out",
                  },
                  "<"
                );
              }
  
              // Animate elements that only fade (links)
              if (childrenToOnlyFade.length > 0) {
                tl.to(
                  childrenToOnlyFade,
                  {
                    opacity: 1,
                    duration: 0.6, // You can adjust this duration
                    ease: "power2.out",
                  },
                  "<" // Start at the same time as the previous animation
                );
              }
            } else {
              // Fallback if no specific children are found, just fade the parent
              tl.to(
                el,
                {
                  opacity: 1,
                  visibility: "visible",
                  duration: 0.6,
                  ease: "power2.out",
                },
                ">+=0.2"
              );
            }
          });
  
          gsap.set(section.querySelectorAll("[data-prevent-flicker='true']"), {
            visibility: "visible",
          });
        }
      });
  
      document.fonts.ready.then(() => {
        document.querySelectorAll("[data-line-reveal='true']").forEach((text) => {
          const section = text.closest(".section");
          const fadeAfterElements = section
            ? section.querySelectorAll("[data-fade-in-after-heading='true']")
            : [];
  
          SplitText.create(text, {
            type: "lines",
            autoSplit: true,
            mask: "lines",
            linesClass: "line",
            onSplit(self) {
              const tl = gsap.timeline({
                scrollTrigger: {
                  trigger: text,
                  start: "top 80%",
                  toggleActions: "play none none none",
                },
              });
  
              tl.from(self.lines, {
                yPercent: 110,
                duration: 0.6,
                stagger: {
                  amount: 0.1,
                },
                ease: "power2.out",
              });
  
              if (fadeAfterElements.length > 0) {
                fadeAfterElements.forEach((el) => {
                  if (el.hasAttribute("data-prevent-flicker")) {
                    return;
                  }
  
                  // Elements that will have opacity AND y-transformation
                  const childrenToStaggerWithY =
                    el.querySelectorAll("p, img, span, div");
                  // Elements that will ONLY have opacity transformation (like links)
                  const childrenToOnlyFade = el.querySelectorAll("a");
  
                  if (
                    childrenToStaggerWithY.length > 0 ||
                    childrenToOnlyFade.length > 0
                  ) {
                    gsap.set(childrenToStaggerWithY, {
                      opacity: 0,
                      y: "1rem",
                    });
                    gsap.set(childrenToOnlyFade, {
                      opacity: 0,
                    });
  
                    tl.to(
                      el,
                      {
                        opacity: 1,
                        visibility: "visible",
                        duration: 0.1,
                        ease: "power2.out",
                      },
                      "<+=0.1"
                    );
  
                    if (childrenToStaggerWithY.length > 0) {
                      tl.to(
                        childrenToStaggerWithY,
                        {
                          opacity: 1,
                          y: "0rem",
                          duration: 0.8,
                          stagger: {
                            amount: 0.2,
                          },
                          ease: "power2.out",
                        },
                        "<"
                      );
                    }
  
                    if (childrenToOnlyFade.length > 0) {
                      tl.to(
                        childrenToOnlyFade,
                        {
                          opacity: 1,
                          duration: 0.8,
                          ease: "power2.out",
                        },
                        "<"
                      );
                    }
                  } else {
                    // Fallback if no specific children are found, just fade the parent
                    tl.to(
                      el,
                      {
                        opacity: 1,
                        visibility: "visible",
                        duration: 0.8,
                        delay: 0.2,
                        ease: "power2.out",
                      },
                      "<+=0.1"
                    );
                  }
                });
              }
              return tl;
            },
          });
          gsap.set(text, {
            visibility: "visible",
          });
        });
      });
    } else {
      // If not desktop, ensure elements that would be hidden by GSAP are visible
      gsap.set(
        "[data-fade-in-after-heading='true']:not([data-prevent-flicker='true'])",
        {
          opacity: 1,
          visibility: "visible",
        }
      );
      // Ensure any text that would be line-revealed is also visible
      document.querySelectorAll("[data-line-reveal='true']").forEach((text) => {
        gsap.set(text, {
          visibility: "visible",
        });
      });
      // Ensure elements with data-prevent-flicker are visible
      document.querySelectorAll("[data-prevent-flicker='true']").forEach((el) => {
        gsap.set(el, {
          visibility: "visible",
        });
      });
    }
  });
  