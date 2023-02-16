MktoForms2.whenReady(function (form) {
  $("input[type='hidden']").parent(".mktoFormRow").css("display", "none");
  $("textarea").closest(".mktoFormRow").addClass("full-width");
  $("input[type='checkbox']").closest(".mktoFormRow").addClass("full-width");
  $("input[type='checkbox']").closest(".mktoFieldWrap").addClass("u-d-flex");
  $("input[type='checkbox']").closest(".mktoFieldWrap").find(".mktoLabel").addClass("sr-only");
  $("#terms-statement").closest(".mktoFormRow").addClass("full-width").addClass("terms");
  $(".mktoFormRow.terms").insertAfter(".mktoButtonRow");
});
