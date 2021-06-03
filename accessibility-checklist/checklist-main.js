window.addEventListener("load", () => {
  const totalGuidelines = $(
    ".guidelines-wrapper_category .guidelines-reference_category"
  ).length;

  for (var i = 0; i < totalGuidelines; i++) {
    var nameWhere = $(
      ".guidelines-wrapper_where .guidelines-reference_where"
    ).eq(i);
    for (var d = 0; d < $("[merge='where-title']").length; d++) {
      var title = $("[merge='where-title']").eq(d);
      if (title.text() == nameWhere.text()) {
        var parent = nameWhere.closest("[merge='where-row']");
        var titleContain = title
          .closest("[merge='where-group']")
          .find("[merge='where-list']");
        parent.clone(true, true).appendTo(titleContain);
      }
    }

    var nameWhen = $(".guidelines-wrapper_when .guidelines-reference_when").eq(
      i
    );
    for (var d = 0; d < $("[merge='when-title']").length; d++) {
      var title = $("[merge='when-title']").eq(d);
      if (title.text() == nameWhen.text()) {
        var parent = nameWhen.closest("[merge='when-row']");
        var titleContain = title
          .closest("[merge='when-group']")
          .find("[merge='when-list']");
        parent.clone(true, true).appendTo(titleContain);
      }
    }

    var nameCategory = $(
      ".guidelines-wrapper_category .guidelines-reference_category"
    ).eq(i);
    for (var d = 0; d < $("[merge='category-title']").length; d++) {
      var title = $("[merge='category-title']").eq(d);
      if (title.text() == nameCategory.text()) {
        var parent = nameCategory.closest("[merge='category-row']");
        var titleContain = title
          .closest("[merge='category-group']")
          .find("[merge='category-list']");
        parent.clone(true, true).appendTo(titleContain);
      }
    }
  }

  $("[merge='category-group']").each(function (i, obj) {
    const totalChecks = $(obj).find("[merge='category-row']").length;
    $(obj).find(".checks-counter_total").text(totalChecks);
  });

  $("[merge='where-group']").each(function (i, obj) {
    const totalChecks = $(obj).find("[merge='where-row']").length;
    $(obj).find(".checks-counter_total").text(totalChecks);
  });

  $("[merge='when-group']").each(function (i, obj) {
    const totalChecks = $(obj).find("[merge='when-row']").length;
    $(obj).find(".checks-counter_total").text(totalChecks);
  });

  let checkedIds = [];
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

  const updateCheckmarks = (checklistItemId, checked) => {
    $("input[data-url-id='" + checklistItemId + "']").each((i, ele) => {
      ele.checked = checked;
      const sectionEle = $(ele).closest(".checks-group");

      if (sectionEle) {
        const checksInSection = sectionEle.find(
          "input[data-url-id]:checked"
        ).length;
        const checkInSectionEle = sectionEle.find(".checks-counter_checked");
        const totalChecksinSectionText = sectionEle
          .find(".checks-counter_total")
          .text();

        if (checkInSectionEle) {
          checkInSectionEle.text(checksInSection);

          if (checkInSectionEle.text() === totalChecksinSectionText) {
            sectionEle.find(".checks-counter_celebrate-icon").show();
            sectionEle.find(".checks-counter_icon").hide();
          } else {
            sectionEle.find(".checks-counter_celebrate-icon").hide();
            sectionEle.find(".checks-counter_icon").show();
          }

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

  const overrideCheckedFromStorageWithURL = (checkedParamIds) => {
    let checkedIdsArr = [];
    if (checkedParamIds) {
      if (!checkedParamIds.includes(",")) {
        checkedIdsArr.push(checkedParamIds);
      } else {
        checkedIdsArr = checkedParamIds.split(",");
      }
    }

    checkedIdsArr.forEach((checklistItemId) => {
      updateCheckmarks(checklistItemId, true);
    });

    checkedIds = checkedIdsArr;
    updateTotalChecked();
    window.localStorage.setItem(
      "wf_accessiblity_checklist_ids",
      JSON.stringify(checkedIdsArr)
    );
  };

  const loadCheckedItemsFromURLorStorage = () => {
    loadCheckedItemsFromLocalStorage();

    const url = new URL(window.location);
    const checkedParamIds = url.searchParams.get("checked");

    if (checkedParamIds && checkedIds.length > 0) {
      const okayPressed = confirm(
        "Load tasks from URL? Current checked tasks will be lost."
      );

      if (okayPressed) {
        overrideCheckedFromStorageWithURL(checkedParamIds);
      }

      // Only has URL params
    } else if (checkedParamIds) {
      overrideCheckedFromStorageWithURL(checkedParamIds);
    }

    if (checkedParamIds) {
      url.searchParams.delete("checked");
      window.history.replaceState(null, "", url.toString());
    }
  };
  loadCheckedItemsFromURLorStorage();

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

  window.addEventListener("storage", (event) => {
    if (document.hasFocus()) {
      return;
    }

    if (event.key !== "wf_accessiblity_checklist_ids") {
      return;
    }

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
    if (event.which === 13 || event.which === 32) {
      event.preventDefault();
      updateChecklistItem(event, true);
    }
  });

  $("#clear-checklist-button").on("click keyup touchend", (event) => {
    if (event.type === "keyup" && (event.which !== 13 || event.which !== 32)) {
      return;
    }

    const okayPressed = confirm(
      "Reset all tasks? Warning: This cannot be undone."
    );
    if (okayPressed) {
      for (i = 1; i < totalGuidelines + 1; i++) {
        updateCheckmarks(i, false);
      }

      checkedIds = [];
      updateTotalChecked();

      window.localStorage.setItem(
        "wf_accessiblity_checklist_ids",
        JSON.stringify(checkedIds)
      );
    }
  });

  const clipboard = new ClipboardJS("#copy-sharable-url", {
    text: function () {
      const url = new URL(window.location);
      url.searchParams.set("checked", checkedIds);
      return url.toString();
    },
  });

  clipboard.on("success", function (e) {
    $("#copy-btn").click();
  });
  clipboard.on("error", function (e) {
    console.log(e);
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
