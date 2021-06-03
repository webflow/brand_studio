window.addEventListener("load", () => {
  const totalGuidelines = $(
    ".guidelines-wrapper_category .guidelines-reference_category"
  ).length;

  let checkedIds = [];

  // Load total number of checks
  $(".checks-progress_total").text(totalGuidelines);

  const updateTotalChecked = () => {
    const percDone = (checkedIds.length / totalGuidelines) * 100;
    $(".checks-progress_bar-fill").css("width", percDone + "%");
    $(".checks-progress_counter").text(checkedIds.length);

    if (checkedIds.length === totalGuidelines) {
      $(".checks-progress_title").hide();
      $(".checks-progress_bar").hide();
      $(".checks-progress_celebrate-text").show();
      $(".checks-progress_celebrate-icon").show();
    } else {
      $(".checks-progress_title").show();
      $(".checks-progress_bar").show();
      $(".checks-progress_celebrate-text").hide();
      $(".checks-progress_celebrate-icon").hide();
    }
  };

  // Update all the checks with the id checked on the page
  const updateCheckmarks = (checklistItemId, checked) => {
    $("input[data-url-id='" + checklistItemId + "']").each((i, ele) => {
      ele.checked = checked;
      const sectionEle = $(ele).closest(".checks-group");

      // Update section totals
      if (sectionEle) {
        const checksInSection = sectionEle.find(
          "input[data-url-id]:checked"
        ).length;
        const checkInSectionEle = sectionEle.find(".checks-counter_checked");

        if (checkInSectionEle) {
          checkInSectionEle.text(checksInSection);

          // Strike and gray guideline when checked
          if (checked) {
            $(ele)
              .closest(".checks-checkbox")
              .siblings(".accordion-item")
              .find(".accordion-title")
              .addClass("cc-checked");
          } else {
            $(ele)
              .closest(".checks-checkbox")
              .siblings(".accordion-item")
              .find(".accordion-title")
              .removeClass("cc-checked");
          }
        }
      }
    });
  };

  const loadCheckedItemsFromLocalStorage = () => {
    const storageCheckedIds = JSON.parse(
      window.localStorage.getItem("wf_accessiblity_checklist_ids")
    );

    if (storageCheckedIds && storageCheckedIds.length > 0) {
      for (i = 1; i < totalGuidelines + 1; i++) {
        updateCheckmarks(i, storageCheckedIds.includes(i.toString(10)));
      }

      checkedIds = storageCheckedIds;
      updateTotalChecked();
    }
  };
  loadCheckedItemsFromLocalStorage();

  // Update URL Params when checklist changes
  const updateChecklistItem = (event, updateCheck) => {
    const checklistItemEle = event.target;
    const checklistItemId = checklistItemEle.getAttribute("data-url-id");

    let newCheck = checklistItemEle.checked;
    if (updateCheck) {
      newCheck = !checklistItemEle.checked;
    }

    updateCheckmarks(checklistItemId, newCheck);

    if (!checkedIds.includes(checklistItemId)) {
      checkedIds.push(checklistItemId);
    } else {
      checkedIds = checkedIds.filter((item) => item !== checklistItemId);
    }

    updateTotalChecked();
    window.localStorage.setItem(
      "wf_accessiblity_checklist_ids",
      JSON.stringify(checkedIds)
    );
  };

  // Watch localstorage to update checks from other tabs
  window.addEventListener("storage", (event) => {
    if (document.hasFocus()) {
      return;
    }

    if (event.key !== "wf_accessiblity_checklist_ids") {
      return;
    }

    // localstorage came from another tab
    const storageCheckedIds = JSON.parse(
      window.localStorage.getItem("wf_accessiblity_checklist_ids")
    );

    if (storageCheckedIds) {
      for (i = 1; i < totalGuidelines + 1; i++) {
        updateCheckmarks(i, storageCheckedIds.includes(i.toString(10)));
      }

      checkedIds = storageCheckedIds;
      updateTotalChecked();
    }
  });

  $("input[data-url-id]").on("click touchend", (event) => {
    updateChecklistItem(event, false);
  });

  $("input[data-url-id]").keyup((event) => {
    // enter or space
    if (event.which === 13 || event.which === 32) {
      event.preventDefault();
      updateChecklistItem(event, true);
    }
  });
});
