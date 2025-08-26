// Get UTM parameters from current URL
function getUTMParams() {
  const urlParams = new URLSearchParams(window.location.search);
  const utmParams = {};
  [
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_term",
    "utm_content",
  ].forEach((param) => {
    if (urlParams.has(param)) {
      utmParams[param] = urlParams.get(param);
    }
  });
  return utmParams;
}

// Check if domain is Webflow
function isWebflowDomain(hostname) {
  return hostname.endsWith("webflow.com") || hostname.endsWith("webflow.io");
}

// Check if URL already has UTM parameters
function hasUTMParams(url) {
  return Array.from(url.searchParams.keys()).some((param) =>
    param.startsWith("utm_")
  );
}

// Apply UTM parameters to all links
function applyStickyUTM() {
  const utmParams = getUTMParams();

  if (Object.keys(utmParams).length === 0) return;

  document.querySelectorAll("a").forEach((link) => {
    if (link.href.startsWith("#") || link.href.startsWith("javascript:"))
      return;

    try {
      const url = new URL(link.href);

      if (!isWebflowDomain(url.hostname) || hasUTMParams(url)) return;

      Object.entries(utmParams).forEach(([key, value]) => {
        url.searchParams.set(key, value);
      });

      link.href = url.toString();
    } catch (e) {
      console.warn("Invalid URL:", link.href);
    }
  });
}

// Run when DOM is loaded
document.addEventListener("DOMContentLoaded", applyStickyUTM);

// Run when content changes
if (window.MutationObserver) {
  new MutationObserver(() => applyStickyUTM()).observe(document.body, {
    subtree: true,
    childList: true,
  });
}
