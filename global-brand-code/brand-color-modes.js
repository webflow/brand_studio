// ---- Color Mode Management ----

(function () {
  // Function to swap icon URLs between Light and Dark modes
  function swapIconUrls(isDark) {
    const iconElements = document.querySelectorAll("[data-component='icon']");
    const modeToUse = isDark ? "Dark" : "Light";
    const modeToReplace = isDark ? "Light" : "Dark";

    iconElements.forEach((img) => {
      if (img.tagName.toLowerCase() === "img" && img.src) {
        // Check if the src starts with the CloudFront URL (remove @ if present)
        const cleanSrc = img.src.replace(/^@/, "");
        if (
          cleanSrc.startsWith("https://dhygzobemt712.cloudfront.net/Icons/")
        ) {
          // Use regex to replace the mode directory
          const newSrc = cleanSrc.replace(
            /\/Icons\/(Light|Dark)\//,
            `/Icons/${modeToUse}/`
          );
          if (newSrc !== cleanSrc) {
            img.src = newSrc;
          }
        }
      }
    });
  }

  // Function to set the color mode
  function setColorMode(isDark, savePreference = true, isAutoMode = false) {
    // Apply mode by toggling class on HTML element (most performant)
    document.documentElement.classList.toggle("u-mode-dark", isDark);

    // Swap icon URLs to match the new mode
    swapIconUrls(isDark);

    // Update ALL button states if they exist on the page
    const lightButtons = document.querySelectorAll(
      '[data-mode-button="light"]'
    );
    const darkButtons = document.querySelectorAll('[data-mode-button="dark"]');
    const autoButtons = document.querySelectorAll('[data-mode-button="auto"]');

    // Clear active class from all buttons
    lightButtons.forEach((button) => {
      button.classList.remove("cc-active-mode");
    });
    darkButtons.forEach((button) => {
      button.classList.remove("cc-active-mode");
    });
    autoButtons.forEach((button) => {
      button.classList.remove("cc-active-mode");
    });

    // Set active class on the appropriate buttons
    if (isAutoMode) {
      autoButtons.forEach((button) => {
        button.classList.add("cc-active-mode");
      });
    } else if (isDark) {
      darkButtons.forEach((button) => {
        button.classList.add("cc-active-mode");
      });
    } else {
      lightButtons.forEach((button) => {
        button.classList.add("cc-active-mode");
      });
    }

    // Store user preference if this is a manual change
    if (savePreference) {
      if (isAutoMode) {
        // Remove saved preference to return to OS preference
        localStorage.removeItem("darkMode");
      } else {
        localStorage.setItem("darkMode", isDark ? "true" : "false");
      }
    }
  }

  // Check if user preference exists in localStorage
  const savedMode = localStorage.getItem("darkMode");
  let prefersDark;
  let usingOSPreference = false;

  // If user has explicitly set a preference (via the buttons), use that
  if (savedMode !== null) {
    prefersDark = savedMode === "true";
  }
  // Otherwise, check the OS preference
  else {
    // Check if the browser supports prefers-color-scheme media query
    const prefersColorScheme = window.matchMedia(
      "(prefers-color-scheme: dark)"
    );
    prefersDark = prefersColorScheme.matches;
    usingOSPreference = true;
  }

  // Apply mode immediately (before page render to prevent flash)
  setColorMode(prefersDark, !usingOSPreference, usingOSPreference);

  // Set up event listeners for buttons once DOM is loaded
  window.addEventListener("DOMContentLoaded", function () {
    const lightButtons = document.querySelectorAll(
      '[data-mode-button="light"]'
    );
    const darkButtons = document.querySelectorAll('[data-mode-button="dark"]');
    const autoButtons = document.querySelectorAll('[data-mode-button="auto"]');

    // Clear active class from all buttons initially
    lightButtons.forEach((button) => {
      button.classList.remove("cc-active-mode");
    });
    darkButtons.forEach((button) => {
      button.classList.remove("cc-active-mode");
    });
    autoButtons.forEach((button) => {
      button.classList.remove("cc-active-mode");
    });

    // Set initial state based on current mode
    const isDarkMode =
      document.documentElement.classList.contains("u-mode-dark");

    // Ensure icons are set correctly on initial load
    swapIconUrls(isDarkMode);

    // Check if we're currently using OS preference (no saved mode)
    const savedMode = localStorage.getItem("darkMode");
    const isAutoMode = savedMode === null;

    if (isAutoMode) {
      autoButtons.forEach((button) => {
        button.classList.add("cc-active-mode");
      });
    } else if (isDarkMode) {
      darkButtons.forEach((button) => {
        button.classList.add("cc-active-mode");
      });
    } else {
      lightButtons.forEach((button) => {
        button.classList.add("cc-active-mode");
      });
    }

    // Add click event listeners to ALL light buttons
    lightButtons.forEach((button) => {
      button.addEventListener("click", function () {
        // When user manually changes the theme, stop syncing with OS
        usingOSPreference = false;
        setColorMode(false);
      });
    });

    // Add click event listeners to ALL dark buttons
    darkButtons.forEach((button) => {
      button.addEventListener("click", function () {
        // When user manually changes the theme, stop syncing with OS
        usingOSPreference = false;
        setColorMode(true);
      });
    });

    // Add click event listeners to ALL auto buttons
    autoButtons.forEach((button) => {
      button.addEventListener("click", function () {
        // When user chooses auto mode, start syncing with OS
        usingOSPreference = true;
        // Get current OS preference
        const prefersColorScheme = window.matchMedia(
          "(prefers-color-scheme: dark)"
        );
        setColorMode(prefersColorScheme.matches, true, true);
      });
    });

    // Listen for changes in system color scheme preference
    const prefersColorScheme = window.matchMedia(
      "(prefers-color-scheme: dark)"
    );
    prefersColorScheme.addEventListener("change", (e) => {
      // Only apply the OS preference if user hasn't explicitly set a preference
      if (usingOSPreference) {
        setColorMode(e.matches, false);
      }
    });
  });
})();
