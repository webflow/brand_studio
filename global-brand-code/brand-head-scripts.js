const observer = new MutationObserver(function (m, mo) {
    const body = document.body;
    if (body) {
        body.setAttribute("data-wf-ix-vacation", "1");
        mo.disconnect();
    }
});

observer.observe(document, {
    childList: true,
    subtree: true,
});
