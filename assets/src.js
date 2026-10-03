// Remembers, in this browser only, where a visitor first came from (a ?src= or ?utm_source= tag on the
// link, or the website that linked here). No cookies and nothing is sent anywhere from this file: the
// portal records it once, against the account, when the visitor creates one.
(function () {
  try {
    var K = 'clatsrc-v1';
    if (localStorage.getItem(K)) return;
    var q = new URLSearchParams(location.search);
    var clean = function (v, n) { v = String(v || '').toLowerCase().replace(/[^a-z0-9._-]/g, '').slice(0, n); return v || null; };
    var src = clean(q.get('src') || q.get('utm_source'), 40);
    var camp = clean(q.get('utm_campaign') || q.get('campaign'), 60);
    var ref = null;
    try {
      if (document.referrer) {
        var h = new URL(document.referrer).hostname.replace(/^www\./, '');
        if (h && h !== location.hostname.replace(/^www\./, '')) ref = h.slice(0, 80);
      }
    } catch (e) {}
    if (!src && !ref) return; // nothing to remember; a later tagged visit can still register
    localStorage.setItem(K, JSON.stringify({ src: src, camp: camp, ref: ref, landing: location.pathname.slice(0, 120) }));
  } catch (e) {}
})();
