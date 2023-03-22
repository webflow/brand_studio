/*
 * reCAPTCHA v3 client-side support
 * @author Sanford Whiteman
 * @version v1.1.2 2021-08-25
 * @copyright © 2021 Sanford Whiteman
 * @license Hippocratic 2.1: This license must appear with all reproductions of this software.
 */
(function () {
  var userConfig = {
    apiKeys: {
      recaptcha: recaptchaSiteKey,
    },
    fields: {
      recaptchaFinger: "reCAPTCHALastUserFingerprint",
    },
    actions: {
      formSubmit: "form",
    },
    debug: {
      testBadFinger: false,
    },
  };

  /* --- NO NEED TO TOUCH BELOW THIS LINE --- */

  MktoForms2.whenReady(function (mktoForm) {
    var formEl = mktoForm.getFormElem()[0],
      submitButtonEl = formEl.querySelector("button[type='submit']");

    /* pending reCAPTCHA widget ready */
    submitButtonEl.disabled = true;

    /* pending reCAPTCHA verify */
    mktoForm.submittable(false);
    mktoForm.locked = false;

    mktoForm.onValidate(function (native) {
      if (!native) return;

      grecaptcha.ready(function () {
        grecaptcha
          .execute(userConfig.apiKeys.recaptcha, {
            action: userConfig.actions.formSubmit,
          })
          .then(function (recaptchaFinger) {
            var mktoFields = {};
            if (mktoForm.locked == false) {
              console.log("primary recaptcha response resolved");
              mktoForm.locked = true;
              if (!userConfig.debug.testBadFinger) {
                mktoFields[userConfig.fields.recaptchaFinger] = recaptchaFinger;
              } else {
                mktoFields[userConfig.fields.recaptchaFinger] = "known bad fingerprint " + Math.random();
              }
              mktoForm.addHiddenFields(mktoFields);
              mktoForm.submittable(true);
              mktoForm.submit();
            } else {
              console.log("secondary recaptcha response resolved");
            }
          });
      });
    });
  });

  var recaptchaListeners = {
    ready: function () {
      MktoForms2.whenReady(function (mktoForm) {
        var formEl = mktoForm.getFormElem()[0],
          submitButtonEl = formEl.querySelector("button[type='submit']");

        submitButtonEl.disabled = false;
      });
    },
  };
  Object.keys(recaptchaListeners).forEach(function globalize(fnName) {
    window["grecaptchaListeners_" + fnName] = recaptchaListeners[fnName];
  });

  /* inject the reCAPTCHA library */
  recaptchaLib = document.createElement("script");
  recaptchaLib.src = "https://www.google.com/recaptcha/api.js?render=" + userConfig.apiKeys.recaptcha + "&onload=grecaptchaListeners_ready";
  document.head.appendChild(recaptchaLib);
})();
