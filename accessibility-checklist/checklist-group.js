window.addEventListener("load", () => {
  const totalGuidelines = $(
    ".guidelines-wrapper_category .guidelines-reference_category"
  ).length;

  let checkedIds = [];

  // Load total number of checks
  $(".checks-progress_total").text(totalGuidelines);
  $(".checks-counter_total").text($("input[data-url-id]").length);

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

      // Update section total
      const checksInSection = $("input[data-url-id]:checked").length;
      const checkInSectionEle = $(".checks-counter_checked");
      const totalChecksinSectionText = $(".checks-counter_total").text();

      if (checkInSectionEle) {
        checkInSectionEle.text(checksInSection);

        if (checkInSectionEle.text() === totalChecksinSectionText) {
          $(".checks-counter_celebrate-icon").show();
          $(".checks-counter_icon").hide();
        } else {
          $(".checks-counter_celebrate-icon").hide();
          $(".checks-counter_icon").show();
        }

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

//Toggle task accordions
$(".checks-accordion_trigger-overlay").click(function () {
  $(this).toggleAttrVal("aria-expanded", "false", "true"); //toggle trigger attribute
  $(this)
    .closest(".checks-accordion_trigger")
    .siblings(".accordion-content")
    .toggleAttrVal("aria-hidden", "true", "false"); //toggle content attribute
  $(this)
    .closest(".checks-accordion_trigger")
    .siblings(".accordion-content")
    .toggleClass("cc-show");
  $(this)
    .closest(".checks-accordion_trigger")
    .find(".accordion-icon_left")
    .toggleClass("cc-close");
  $(this)
    .closest(".checks-accordion_trigger")
    .find(".accordion-icon_right")
    .toggleClass("cc-close");
});

$.fn.toggleAttrVal = function (attr, val1, val2) {
  var test = $(this).attr(attr);
  if (test === val1) {
    $(this).attr(attr, val2);
    return this;
  }
  if (test === val2) {
    $(this).attr(attr, val1);
    return this;
  }
  $(this).attr(attr, val1);
  return this;
};
