MktoForms2.whenReady(function (form) {
    $("input[type='hidden']").parent(".mktoFormRow").css("display", "none");
    $("textarea").parent(".mktoFieldWrap").parent(".mktoFieldDescriptor").parent(".mktoFormRow").addClass("full-width");
});
