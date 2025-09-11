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
      setupDialogFormGuard(dialog);
    } catch (error) {
      console.warn("Modal initialization failed:", error);
    }
  }

  // Handle all modal-related clicks using event delegation
  function handleModalClicks(e) {
    const target = e.target;

    // Handle show modal buttons (buttons that immediately follow dialogs)
    if (target.matches("dialog + button")) {
      e.preventDefault();
      const dialog = target.previousElementSibling;
      if (dialog && dialog.tagName === "DIALOG") {
        dialog.showModal();
      }
      return;
    }

    // Handle close modal buttons (any element with data-modal="close")
    if (target.matches("[data-modal='close']")) {
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
   // NEW: Prevent dialog from closing on invalid form submit
   function setupDialogFormGuard(dialog) {
    // Use capture to beat the browser's default method="dialog" close
    dialog.addEventListener(
      "submit",
      function (e) {
        const form = e.target;
        if (!(form instanceof HTMLFormElement)) return;

        // Respect developer intent to skip validation
        const submitter =
          e.submitter ||
          (document.activeElement && document.activeElement.form === form
            ? document.activeElement
            : null);

        const skipValidation =
          form.noValidate ||
          (submitter &&
            (submitter.formNoValidate ||
              submitter.hasAttribute("formnovalidate")));

        if (skipValidation) return;

        // If invalid, prevent the submit (this also prevents method="dialog" auto-close)
        if (!form.checkValidity()) {
          e.preventDefault();
          e.stopPropagation();
          form.reportValidity();

          // Focus first invalid control for good UX
          const firstInvalid = form.querySelector(":invalid");
          if (firstInvalid) firstInvalid.focus({ preventScroll: false });
        }
      },
      true
    );
  }

  // Initialize when DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initModals);
  } else {
    initModals();
  }
})();
