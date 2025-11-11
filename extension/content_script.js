function absoluteUrl(url) {
  try { return new URL(url, document.baseURI).toString(); } catch { return null; }
}

function collectFromVideoEl(video) {
  const found = [];
  const s1 = video.getAttribute('src');
  if (s1) {
    const u = absoluteUrl(s1);
    if (u) found.push({ url: u, contentType: video.getAttribute('type') || undefined });
  }
  video.querySelectorAll('source').forEach((src) => {
    const s = src.getAttribute('src');
    if (!s) return;
    const u = absoluteUrl(s);
    if (u) found.push({ url: u, contentType: src.getAttribute('type') || undefined });
  });
  return found;
}

function uniqueByUrl(items) {
  const seen = new Set();
  const out = [];
  for (const it of items) {
    if (it && it.url && !seen.has(it.url)) {
      seen.add(it.url);
      out.push(it);
    }
  }
  return out;
}

function scanAndSend() {
  try {
    const items = [];
    document.querySelectorAll('video').forEach((v) => {
      items.push(...collectFromVideoEl(v));
    });
    const send = uniqueByUrl(items);
    if (send.length) {
      chrome.runtime.sendMessage({ type: 'videoElements', items: send }).catch(() => {});
    }
  } catch (_) {}
}

// Initial and delayed scans
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', scanAndSend, { once: true });
} else {
  scanAndSend();
}
setTimeout(scanAndSend, 1000);

// Observe DOM changes for late-loaded videos
const mo = new MutationObserver((mutations) => {
  for (const m of mutations) {
    if (m.type === 'childList') {
      m.addedNodes.forEach((node) => {
        if (node.nodeType === 1) {
          const el = node;
          if (el.tagName === 'VIDEO' || el.querySelector?.('video')) {
            scanAndSend();
          }
        }
      });
    }
  }
});
mo.observe(document.documentElement, { childList: true, subtree: true });

