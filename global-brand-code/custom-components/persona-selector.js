/**
 * PersonaSelect - Lightweight JavaScript library for synchronized dropdown persona selectors
 * Keeps multiple dropdown instances in sync across pages with local storage persistence
 */
(function (window) {
  "use strict";

  const PersonaSelect = {
    // Configuration
    config: {
      storageKey: "persona-select-active",
      urlParam: "persona",
      dropdownSelector: '[data-persona-select="dropdown"]',
      optionSelector: "[data-persona-option]",
      buttonTextSelector: '[data-persona-select="button-text"]',
      contentSelector: "[data-persona-content]",
      toggleSelector: ".w-dropdown-toggle",
      listSelector: ".w-dropdown-list",
      activeClass: "cc-active",
      openClass: "w--open",
    },

    // State
    dropdowns: [],
    activeOption: null,
    readyCallbacks: [],
    isReady: false,

    /**
     * Initialize the PersonaSelect library
     */
    init: function () {
      this.findDropdowns();

      // Early return if no dropdowns found - nothing to initialize
      if (this.dropdowns.length === 0) {
        this.executeReadyCallbacks(); // Still fire callbacks even if no dropdowns
        return;
      }

      this.setupAccessibility();
      this.checkUrlParameter();
      this.loadStoredSelection();
      this.bindEvents();
      this.updateAllDropdowns();
      this.updateContentVisibility();

      // Execute any queued ready callbacks
      this.executeReadyCallbacks();
    },

    /**
     * Find all dropdown instances on the page
     */
    findDropdowns: function () {
      this.dropdowns = Array.from(
        document.querySelectorAll(this.config.dropdownSelector)
      );
    },

    /**
     * Set up initial accessibility structure for all dropdowns
     */
    setupAccessibility: function () {
      const self = this;

      // Early return if no dropdowns
      if (this.dropdowns.length === 0) {
        return;
      }

      this.dropdowns.forEach(function (dropdown) {
        const toggle = dropdown.querySelector(self.config.toggleSelector);
        const list = dropdown.querySelector(self.config.listSelector);
        const options = dropdown.querySelectorAll(self.config.optionSelector);

        // Set up toggle button
        if (toggle) {
          toggle.setAttribute("role", "combobox");
          toggle.setAttribute("aria-haspopup", "listbox");
          toggle.setAttribute("aria-expanded", "false");
          if (!toggle.getAttribute("tabindex")) {
            toggle.setAttribute("tabindex", "0");
          }
        }

        // Set up dropdown list
        if (list) {
          list.setAttribute("role", "listbox");
          list.setAttribute(
            "aria-labelledby",
            toggle ? toggle.id || self.generateToggleId(toggle) : ""
          );
        }

        // Set up options
        options.forEach(function (option) {
          option.setAttribute("role", "option");
          if (!option.id) {
            option.id = self.generateOptionId(option);
          }
        });

        // Ensure toggle has an ID for aria-labelledby
        if (toggle && !toggle.id) {
          toggle.id = self.generateToggleId(toggle);
        }
      });
    },

    /**
     * Check for URL parameter and validate it against available options
     */
    checkUrlParameter: function () {
      const urlParams = new URLSearchParams(window.location.search);
      const urlPersona = urlParams.get(this.config.urlParam);

      if (urlPersona) {
        // Check if the URL parameter value matches any available option
        if (this.isValidOption(urlPersona)) {
          // Valid option - set as active and update storage
          this.activeOption = urlPersona;
          this.saveToStorage();
        } else {
          // Invalid option - log the error
          console.warn(
            `PersonaSelect: Invalid persona parameter "${urlPersona}". Available options: ${this.getAvailableOptions().join(
              ", "
            )}`
          );
        }
        // Always clear the URL parameter after processing (valid or invalid)
        this.clearUrlParameter();
      }
    },

    /**
     * Check if an option value exists in any dropdown on the page
     * @param {string} optionValue - The option value to validate
     * @returns {boolean} True if option exists
     */
    isValidOption: function (optionValue) {
      const optionExists = document.querySelector(
        `[data-persona-option="${optionValue}"]`
      );
      return !!optionExists;
    },

    /**
     * Get all available persona option values on the page
     * @returns {Array<string>} Array of available option values
     */
    getAvailableOptions: function () {
      const options = document.querySelectorAll(this.config.optionSelector);
      const availableOptions = [];

      // Return empty array if no options found
      if (options.length === 0) {
        return availableOptions;
      }

      options.forEach(function (option) {
        const optionValue = option.getAttribute("data-persona-option");
        if (optionValue && !availableOptions.includes(optionValue)) {
          availableOptions.push(optionValue);
        }
      });

      return availableOptions.sort();
    },

    /**
     * Update the URL parameter
     * @param {string} optionValue - The option value to set in URL
     */
    updateUrlParameter: function (optionValue) {
      const url = new URL(window.location);
      url.searchParams.set(this.config.urlParam, optionValue);
      window.history.replaceState({}, "", url);
    },

    /**
     * Clear the URL parameter
     */
    clearUrlParameter: function () {
      const url = new URL(window.location);
      url.searchParams.delete(this.config.urlParam);
      window.history.replaceState({}, "", url);
    },

    /**
     * Load the stored selection from localStorage
     */
    loadStoredSelection: function () {
      // Only load from storage if we don't already have an activeOption from URL
      if (!this.activeOption) {
        const stored = localStorage.getItem(this.config.storageKey);
        if (stored) {
          this.activeOption = stored;
        } else {
          // If no stored selection, find the first active option or default to first option
          this.setDefaultSelection();
        }
      }
    },

    /**
     * Set default selection from current page or fallback to first option
     */
    setDefaultSelection: function () {
      // Look for any currently active option
      const currentActive = document.querySelector(
        this.config.optionSelector + "." + this.config.activeClass
      );

      if (currentActive) {
        this.activeOption = currentActive.getAttribute("data-persona-option");
      } else {
        // Fallback to first option in first dropdown
        const firstOption = document.querySelector(this.config.optionSelector);
        if (firstOption) {
          this.activeOption = firstOption.getAttribute("data-persona-option");
        }
        // If no options found at all, leave activeOption as null
      }
    },

    /**
     * Bind click events to all dropdown options and toggles
     */
    bindEvents: function () {
      const self = this;

      // Early return if no dropdowns
      if (this.dropdowns.length === 0) {
        return;
      }

      this.dropdowns.forEach(function (dropdown) {
        // Bind dropdown toggle events
        const toggle = dropdown.querySelector(self.config.toggleSelector);
        if (toggle) {
          toggle.addEventListener("click", function (e) {
            e.preventDefault();
            self.toggleDropdown(dropdown);
          });

          // Add keyboard support for toggle
          toggle.addEventListener("keydown", function (e) {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              self.toggleDropdown(dropdown);
            }
          });
        }

        // Bind option selection events
        const options = dropdown.querySelectorAll(self.config.optionSelector);
        options.forEach(function (option) {
          option.addEventListener("click", function (e) {
            e.preventDefault();
            self.selectOption(this.getAttribute("data-persona-option"));
            self.closeDropdown(dropdown);
          });

          // Add keyboard support for options
          option.addEventListener("keydown", function (e) {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              self.selectOption(this.getAttribute("data-persona-option"));
              self.closeDropdown(dropdown);
            }
          });
        });
      });

      // Close dropdowns when clicking outside
      document.addEventListener("click", function (e) {
        if (!e.target.closest(self.config.dropdownSelector)) {
          self.closeAllDropdowns();
        }
      });
    },

    /**
     * Select an option and sync across all dropdowns
     * @param {string} optionValue - The data-persona-option value of the selected option
     */
    selectOption: function (optionValue) {
      this.activeOption = optionValue;
      this.saveToStorage();
      this.updateAllDropdowns();
      this.updateContentVisibility();
    },

    /**
     * Save the current selection to localStorage
     */
    saveToStorage: function () {
      localStorage.setItem(this.config.storageKey, this.activeOption);
    },

    /**
     * Update all dropdown instances to reflect the current selection
     */
    updateAllDropdowns: function () {
      const self = this;

      // Early return if no dropdowns
      if (this.dropdowns.length === 0) {
        return;
      }

      this.dropdowns.forEach(function (dropdown) {
        self.updateDropdown(dropdown);
      });
    },

    /**
     * Update a single dropdown instance
     * @param {Element} dropdown - The dropdown element to update
     */
    updateDropdown: function (dropdown) {
      const options = dropdown.querySelectorAll(this.config.optionSelector);
      const buttonText = dropdown.querySelector(this.config.buttonTextSelector);
      const toggle = dropdown.querySelector(this.config.toggleSelector);
      const list = dropdown.querySelector(this.config.listSelector);
      let activeOptionFound = false;
      let fallbackOption = null;
      let activeIndex = -1;

      const totalCount = options.length;

      options.forEach(
        function (option, index) {
          const optionValue = option.getAttribute("data-persona-option");
          const optionText = option.textContent.trim();
          const isActive = optionValue === this.activeOption;

          // Store first option as fallback
          if (index === 0) {
            fallbackOption = option;
          }

          if (isActive) {
            activeOptionFound = true;
            activeIndex = index;
            this.setOptionActive(option, index + 1, totalCount);
            if (buttonText) {
              buttonText.textContent = optionText;
            }
          } else {
            this.setOptionInactive(option, index + 1, totalCount);
          }
        }.bind(this)
      );

      // Fallback logic: if stored option doesn't exist, use first option
      if (!activeOptionFound && fallbackOption) {
        this.activeOption = fallbackOption.getAttribute("data-persona-option");
        activeIndex = 0;
        this.setOptionActive(fallbackOption, 1, totalCount);
        if (buttonText) {
          buttonText.textContent = fallbackOption.textContent.trim();
        }
        this.saveToStorage();
      }

      // Update dropdown toggle accessibility
      if (toggle && activeIndex >= 0) {
        const selectedOptionElement = dropdown.querySelector(
          `[data-persona-option="${this.activeOption}"]`
        );
        const selectedOptionText = selectedOptionElement
          ? selectedOptionElement.textContent.trim()
          : this.activeOption;
        toggle.setAttribute(
          "aria-label",
          `${selectedOptionText}, selected item ${
            activeIndex + 1
          } of ${totalCount}`
        );
      }

      // Update list accessibility
      if (list) {
        list.setAttribute(
          "aria-activedescendant",
          this.getActiveOptionId(dropdown)
        );
      }
    },

    /**
     * Set an option as active with proper accessibility attributes
     * @param {Element} option - The option element to make active
     * @param {number} position - Position of this option (1-based)
     * @param {number} total - Total number of options
     */
    setOptionActive: function (option, position, total) {
      option.classList.add(this.config.activeClass);
      option.setAttribute("aria-selected", "true");
      option.setAttribute("tabindex", "0");

      // Create unique ID for this option if it doesn't exist
      if (!option.id) {
        option.id = this.generateOptionId(option);
      }

      // Add position and selection info to aria-label
      const optionText = option.textContent.trim();
      option.setAttribute(
        "aria-label",
        `${optionText}, selected, ${position} of ${total}`
      );
    },

    /**
     * Set an option as inactive with proper accessibility attributes
     * @param {Element} option - The option element to make inactive
     * @param {number} position - Position of this option (1-based)
     * @param {number} total - Total number of options
     */
    setOptionInactive: function (option, position, total) {
      option.classList.remove(this.config.activeClass);
      option.setAttribute("aria-selected", "false");
      option.setAttribute("tabindex", "-1");

      // Create unique ID for this option if it doesn't exist
      if (!option.id) {
        option.id = this.generateOptionId(option);
      }

      // Add position info to aria-label
      const optionText = option.textContent.trim();
      option.setAttribute(
        "aria-label",
        `${optionText}, not selected, ${position} of ${total}`
      );
    },

    /**
     * Get the currently active option text
     * @returns {string} The active option text
     */
    getActiveOption: function () {
      return this.activeOption;
    },

    /**
     * Get the current URL parameter value
     * @returns {string|null} The URL parameter value or null
     */
    getUrlParameter: function () {
      const urlParams = new URLSearchParams(window.location.search);
      return urlParams.get(this.config.urlParam);
    },

    /**
     * Programmatically set the active option
     * @param {string} optionText - The text of the option to make active
     */
    setActiveOption: function (optionText) {
      this.selectOption(optionText);
    },

    /**
     * Refresh the library (useful for dynamically added content)
     */
    refresh: function () {
      this.findDropdowns();

      // Early return if no dropdowns found after refresh
      if (this.dropdowns.length === 0) {
        return;
      }

      this.setupAccessibility();
      this.bindEvents();
      this.updateAllDropdowns();
      this.updateContentVisibility();
    },

    /**
     * Clear the stored selection
     */
    clearStorage: function () {
      localStorage.removeItem(this.config.storageKey);
      this.clearUrlParameter();
      this.setDefaultSelection();
      this.updateAllDropdowns();
      this.updateContentVisibility();
    },

    /**
     * Toggle a dropdown's open/closed state
     * @param {Element} dropdown - The dropdown element to toggle
     */
    toggleDropdown: function (dropdown) {
      const isOpen = dropdown.classList.contains(this.config.openClass);
      const toggle = dropdown.querySelector(this.config.toggleSelector);

      dropdown.classList.toggle(this.config.openClass);

      // Update aria-expanded
      if (toggle) {
        toggle.setAttribute("aria-expanded", isOpen ? "false" : "true");
      }
    },

    /**
     * Close a specific dropdown
     * @param {Element} dropdown - The dropdown element to close
     */
    closeDropdown: function (dropdown) {
      const toggle = dropdown.querySelector(this.config.toggleSelector);

      dropdown.classList.remove(this.config.openClass);

      // Update aria-expanded
      if (toggle) {
        toggle.setAttribute("aria-expanded", "false");
      }
    },

    /**
     * Close all dropdowns
     */
    closeAllDropdowns: function () {
      const self = this;

      // Early return if no dropdowns
      if (this.dropdowns.length === 0) {
        return;
      }

      this.dropdowns.forEach(function (dropdown) {
        self.closeDropdown(dropdown);
      });
    },

    /**
     * Generate a unique ID for an option element
     * @param {Element} option - The option element
     * @returns {string} Unique ID
     */
    generateOptionId: function (option) {
      const text = option.textContent.trim().toLowerCase().replace(/\s+/g, "-");
      const timestamp = Date.now();
      return `persona-option-${text}-${timestamp}`;
    },

    /**
     * Generate a unique ID for a toggle element
     * @param {Element} toggle - The toggle element
     * @returns {string} Unique ID
     */
    generateToggleId: function (toggle) {
      const timestamp = Date.now();
      return `persona-toggle-${timestamp}`;
    },

    /**
     * Get the ID of the active option in a dropdown
     * @param {Element} dropdown - The dropdown element
     * @returns {string} ID of active option or empty string
     */
    getActiveOptionId: function (dropdown) {
      const activeOption = dropdown.querySelector(
        this.config.optionSelector + "." + this.config.activeClass
      );
      return activeOption ? activeOption.id : "";
    },

    /**
     * Update visibility of content blocks based on active option
     */
    updateContentVisibility: function () {
      const allContentBlocks = document.querySelectorAll(
        this.config.contentSelector
      );

      allContentBlocks.forEach(
        function (contentBlock) {
          const contentValue = contentBlock.getAttribute(
            "data-persona-content"
          );

          if (contentValue === this.activeOption) {
            // Show matching content
            contentBlock.style.display = "";
            contentBlock.removeAttribute("hidden");
            contentBlock.setAttribute("aria-hidden", "false");
          } else {
            // Hide non-matching content
            contentBlock.style.display = "none";
            contentBlock.setAttribute("hidden", "");
            contentBlock.setAttribute("aria-hidden", "true");
          }
        }.bind(this)
      );
    },

    /**
     * Register a callback to run when PersonaSelect is ready
     * @param {Function} callback - Function to call when ready
     */
    onReady: function (callback) {
      if (typeof callback !== "function") {
        console.warn("PersonaSelect.onReady: callback must be a function");
        return;
      }

      if (this.isReady) {
        // Already initialized, execute immediately
        try {
          callback(this);
        } catch (error) {
          console.error("PersonaSelect ready callback error:", error);
        }
      } else {
        // Queue the callback for when ready
        this.readyCallbacks.push(callback);
      }
    },

    /**
     * Execute all queued ready callbacks
     */
    executeReadyCallbacks: function () {
      this.isReady = true;
      this.readyCallbacks.forEach(
        function (callback) {
          try {
            callback(this);
          } catch (error) {
            console.error("PersonaSelect ready callback error:", error);
          }
        }.bind(this)
      );
      this.readyCallbacks = []; // Clear the queue
    },
  };

  // Auto-initialize when DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      PersonaSelect.init();
    });
  } else {
    PersonaSelect.init();
  }

  // Expose PersonaSelect to global scope
  window.PersonaSelect = PersonaSelect;
})(window);
