// Set footer copyright year
Webflow.push(function () {
    $('.footer-copyright_year').text(new Date().getFullYear());
});

// Skip-to-main script
$(document).ready(function () {
    document.getElementById('skip-link').addEventListener('click keydown', function (e) {
        if (e.type === "keydown" && e.which !== 13) {
            return;
        }

        e.preventDefault();
        var target = document.getElementById('main');
        target.setAttribute('tabindex', '-1');
        target.focus();
    });
});

// Trap modal focus and enable ESC key for accessibility
$(document).ready(function () {
    var buttonThatOpenedModal;
    var findModal = function (elem) {
        var tabbable = elem.find('select, input, textarea, button, a').filter(':visible');

        var firstTabbable = tabbable.first();
        var lastTabbable = tabbable.last();
        /*set focus on first input*/
        firstTabbable.focus();

        /*redirect last tab to first input*/
        lastTabbable.on('keydown', function (e) {
            if ((e.which === 9 && !e.shiftKey)) {
                e.preventDefault();
                firstTabbable.focus();
            }
        });

        /*redirect first shift+tab to last input*/
        firstTabbable.on('keydown', function (e) {
            if ((e.which === 9 && e.shiftKey)) {
                e.preventDefault();
                lastTabbable.focus();
            }
        });

        /* allow escape key to close insiders div */
        elem.on('keydown', function (e) {
            if (e.keyCode === 27) {
                $(elem).find('.modal-close_btn').click();
            };
        });
    };

    var modalOpenButton = $('.modal-open_btn');
    modalOpenButton.on('keydown', function (e) {
        // Only activate on spacebar and enter
        if (e.which !== 13 && e.which !== 32) {
            return;
        }

        e.preventDefault();

        // Simulate a mouseclick to trigger Webflow's IX2/Interactions
        var evt = document.createEvent("MouseEvents");
        evt.initMouseEvent("click", true, true, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null);
        $(this).get(0).dispatchEvent(evt);
    });
    modalOpenButton.on('click', function () {
        $(this).next().show();
        findModal($(this).next());
        buttonThatOpenedModal = $(this);
    });

    var modalCloseButton = $('.modal-close_btn, .modal-close_area');
    modalCloseButton.on('keydown', function (e) {
        // Only activate on spacebar and enter
        if (e.which !== 13 && e.which !== 32) {
            return;
        }

        e.preventDefault();

        // Simulate a mouseclick to trigger Webflow's IX2/Interactions
        var evt = document.createEvent("MouseEvents");
        evt.initMouseEvent("click", true, true, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null);
        $(this).get(0).dispatchEvent(evt);
    });
    modalCloseButton.on('click', function () {
        $(this).closest('.modal-wrapper').hide();
        if (buttonThatOpenedModal) {
            buttonThatOpenedModal.focus();
            buttonThatOpenedModal = null;
        }
    });
});


// Toggle accordion attributes for accessibility
$(document).ready(function () {
    var accordionToggleButton = $('.accordion-trigger');
    accordionToggleButton.on('keydown', function (e) {
        // Activate on spacebar and enter
        if (e.which !== 13 && e.which !== 32) {
            return;
        }
        e.preventDefault();

        // Simulate a mouseclick to trigger Webflow's IX2/Interactions
        var evt = document.createEvent("MouseEvents");
        evt.initMouseEvent("click", true, true, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null);
        $(this).get(0).dispatchEvent(evt);
    });

    accordionToggleButton.on('click', function (e) {
        $(this).toggleAttrVal('aria-expanded', "false", "true"); //toggle trigger attribute
        $(this).parent().find('.accordion-content').toggleAttrVal('aria-hidden', "true", "false"); //toggle content attribute
    });

    // jquery toggle just the attribute value
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
        // default to val1 if neither
        $(this).attr(attr, val1);
        return this;
    };
});
