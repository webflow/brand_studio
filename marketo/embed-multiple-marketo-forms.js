function mktoFormChain(config) {

    /* util */
    var arrayify = getSelection.call.bind([].slice);

    /* const */
    var MKTOFORM_ID_ATTRNAME = "data-formId";

    /* fix inter-form label bug! */
    MktoForms2.whenRendered(function (form) {
        var formEl = form.getFormElem()[0],
            rando = "_" + new Date().getTime() + Math.random();

        arrayify(formEl.querySelectorAll("label[for]")).forEach(function (labelEl) {
            var forEl = formEl.querySelector('[id="' + labelEl.htmlFor + '"]');
            if (forEl) {
                labelEl.htmlFor = forEl.id = forEl.id + rando;
            }
        });
    });

    /* chain, ensuring only one #mktoForm_nnn exists at a time */
    arrayify(config.formIds).forEach(function (formId) {
        var loadForm = MktoForms2.loadForm.bind(MktoForms2, config.podId, config.munchkinId, formId),
            formEls = arrayify(document.querySelectorAll("[" + MKTOFORM_ID_ATTRNAME + '="' + formId + '"]'));

        (function loadFormCb(formEls) {
            var formEl = formEls.shift();
            formEl.id = "mktoForm_" + formId;

            loadForm(function (form) {
                formEl.id = "";
                if (formEls.length) {
                    loadFormCb(formEls);
                }
            });
        })(formEls);
    });
}

mktoFormChain(mktoFormConfig);
