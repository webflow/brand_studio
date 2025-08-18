//---- Modal JS ----
(function () {
  "use strict";

  // Early exit if no dialogs exist on the page
  if (!document.querySelector("dialog")) {
    return;
  }

  // Initialize modal functionality
  function initModals() {
    try {
      // Get all dialog elements
      const dialogs = document.querySelectorAll("dialog");

      // Early exit if no dialogs found
      if (dialogs.length === 0) {
        return;
      }

      // Use event delegation for better performance
      document.addEventListener("click", handleModalClicks);

      // Setup individual dialog listeners only for click-outside functionality
      dialogs.forEach(setupDialogClickOutside);
    } catch (error) {
      console.warn("Modal initialization failed:", error);
    }
  }

  // Handle all modal-related clicks using event delegation
  function handleModalClicks(e) {
    const target = e.target;

    // Handle show modal buttons (using data attribute for better targeting)
    if (target.matches("[data-modal-show]")) {
      e.preventDefault();
      const dialogId = target.getAttribute("data-modal-show");
      const dialog = document.getElementById(dialogId);
      if (dialog && dialog.tagName === "DIALOG") {
        dialog.showModal();
      }
      return;
    }

    // Handle close modal buttons (using data attribute or fallback to any button in dialog)
    if (
      target.matches("[data-modal-close]") ||
      (target.matches("dialog button") && target.closest("dialog"))
    ) {
      e.preventDefault();
      const dialog = target.closest("dialog");
      if (dialog) {
        dialog.close();
      }
      return;
    }
  }

  // Setup click-outside-to-close functionality for each dialog
  function setupDialogClickOutside(dialog) {
    dialog.addEventListener("click", function (e) {
      // Only close if clicking on the dialog backdrop (not its content)
      if (e.target === dialog) {
        dialog.close();
      }
    });
  }

  // Initialize when DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initModals);
  } else {
    initModals();
  }
})();
