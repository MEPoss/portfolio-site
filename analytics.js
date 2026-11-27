/* Anonymous analytics for ugopossenti.com, the Pantry page and the Takeout Fixer page.
   PostHog, EU cloud, shared project key (public by design).

   Privacy by design, so no consent banner is needed:
   - no cookies and no identifier on the visitor's device;
   - no third-party script: events are plain HTTPS requests to eu.i.posthog.com;
   - the visit id lives only in memory and is never reused for another page view;
   - events carry no person profile ($process_person_profile:false) and no GeoIP lookup;
   - only the path, the referrer's origin and a few interface choices are sent,
     never the full URL, never anything typed by the visitor;
   - nothing is sent if the browser says Do Not Track / Global Privacy Control,
     nor when running on localhost.
   Also keep "Discard client IP data" switched on in the PostHog project settings.

   Usage:  pxTrack("event_name", { any: "small properties" })
   A page view is sent automatically, except in an iframe (the host page reports it)
   or when the page sets window.PX_MANUAL = true before loading this file (single-page apps). */
(function () {
  "use strict";
  var KEY = "phc_p3yrf295Zhosk52SaF68mji9ECzAwmAadcvYHArnAjmz";
  var URL_CAPTURE = "https://eu.i.posthog.com/i/v0/e/";

  var inFrame = false;
  try { inFrame = window.self !== window.top; } catch (e) { inFrame = true; }

  var host = location.hostname;
  var local = host === "localhost" || host === "127.0.0.1" || host === "[::1]" || location.protocol === "file:";
  var site = /^\/pantry(\/|$)/.test(location.pathname) ? "pantry"
           : /^\/takeout-fixer(\/|$)/.test(location.pathname) ? "takeout-fixer"
           : "portfolio";

  var visit = (window.crypto && crypto.randomUUID) ? crypto.randomUUID()
            : String(Math.random()).slice(2) + String(Date.now());

  function enabled() {
    if (!KEY || local) return false;
    var n = navigator;
    if (n.doNotTrack === "1" || window.doNotTrack === "1" || n.msDoNotTrack === "1") return false;
    if (n.globalPrivacyControl === true) return false;
    return true;
  }

  function theme() {
    var t = document.documentElement.getAttribute("data-theme");
    if (t === "light" || t === "dark") return t;
    return window.matchMedia && matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }

  function pxTrack(name, props) {
    if (!enabled()) return false;
    var ref = "";
    try { if (document.referrer) ref = new URL(document.referrer).origin; } catch (e) {}
    var p = {
      $process_person_profile: false,
      $geoip_disable: true,
      $lib: "ugopossenti-web",
      site: site,
      page: location.pathname,
      referrer: ref,
      lang: document.documentElement.lang || "",
      theme: theme(),
      embedded: inFrame
    };
    for (var k in props) { if (Object.prototype.hasOwnProperty.call(props, k)) p[k] = props[k]; }
    var body = JSON.stringify({
      api_key: KEY, event: name, distinct_id: visit, properties: p, timestamp: new Date().toISOString()
    });
    try {
      if (navigator.sendBeacon && navigator.sendBeacon(URL_CAPTURE, new Blob([body], { type: "text/plain" }))) return true;
      fetch(URL_CAPTURE, { method: "POST", body: body, headers: { "Content-Type": "text/plain" }, keepalive: true, credentials: "omit" })
        .catch(function () {});
      return true;
    } catch (e) { return false; }
  }

  window.pxTrack = pxTrack;
  window.pxEnabled = enabled;

  if (!window.PX_MANUAL && !inFrame) pxTrack("pageview");
})();
