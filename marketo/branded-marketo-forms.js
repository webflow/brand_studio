MktoForms2.whenReady(function (form) {
  $("input[type='hidden']").parent(".mktoFormRow").css("display", "none");
  $("textarea").closest(".mktoFormRow").addClass("full-width");
  $("input[type='checkbox']").closest(".mktoFormRow").addClass("full-width");
  $("input[type='checkbox']").closest(".mktoFieldWrap").addClass("u-d-flex");
  $("input[type='checkbox']")
    .closest(".mktoFieldWrap")
    .find(".mktoLabel")
    .addClass("sr-only");
  $(".mktoHtmlText").closest(".mktoFormRow").addClass("full-width");
  $(".terms-statement").closest(".mktoFormRow").addClass("terms");
  $(".mktoForm").each(function () {
    $(this).find(".mktoFormRow.terms").appendTo($(this));
  });

  // Update Webflow User hidden input if logged into Webflow
  if (typeof wf_utils !== "undefined" && wf_utils.getUser) {
    wf_utils.getUser((user) => {
      // Check if user object exists
      if (!user) {
        return;
      }
      // Extract the user ID from the user object
      const userId = user.id;
      // Find all input elements with name "Webflow_USER_ID__c" and set their value
      $('input[name="Webflow_USER_ID__c"]').each(function () {
        $(this).val(userId);
      });
    });
  }
});
