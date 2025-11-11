// Video cache per tabId: Map<number, Map<string, VideoInfo>>
const videoCache = new Map();

/** @typedef {{
 *  url: string,
 *  filename: string,
 *  contentType?: string,
 *  sizeBytes?: number,
 *  source: 'webRequest'|'dom',
 *  firstSeen: number
 * }} VideoInfo */

const VIDEO_EXT_RE = /\.(mp4|webm|mkv|m3u8|mov|m4v)(\?|#|$)/i;

function isVideoLike(url, contentType) {
  if (VIDEO_EXT_RE.test(url)) return true;
  if (!contentType) return false;
  const ct = contentType.toLowerCase();
  return (
    ct.startsWith('video/') ||
    ct.includes('application/vnd.apple.mpegurl') ||
    ct.includes('application/x-mpegurl') ||
    ct.includes('mpegurl')
  );
}

function filenameFromUrl(url) {
  try {
    const u = new URL(url);
    const name = u.pathname.split('/').filter(Boolean).pop() || 'video';
    return decodeURIComponent(name);
  } catch {
    return 'video';
  }
}

function ensureTab(tabId) {
  if (!videoCache.has(tabId)) videoCache.set(tabId, new Map());
  return videoCache.get(tabId);
}

function addVideo(tabId, info) {
  if (tabId < 0) return;
  const tabMap = ensureTab(tabId);
  if (!tabMap.has(info.url)) {
    tabMap.set(info.url, { ...info, firstSeen: Date.now() });
  } else {
    const prev = tabMap.get(info.url);
    tabMap.set(info.url, { ...prev, ...info });
  }
  updateBadge(tabId);
}

function getVideos(tabId) {
  const tabMap = videoCache.get(tabId);
  if (!tabMap) return [];
  return Array.from(tabMap.values()).sort((a, b) => a.firstSeen - b.firstSeen);
}

function clearTab(tabId) {
  videoCache.delete(tabId);
  updateBadge(tabId);
}

function updateBadge(tabId) {
  const count = getVideos(tabId).length;
  chrome.action.setBadgeText({ tabId, text: count ? String(count) : '' });
  if (count) {
    chrome.action.setBadgeBackgroundColor({ tabId, color: '#2a7efb' });
  }
}

// Observe response headers to detect content-type/length
chrome.webRequest.onHeadersReceived.addListener(
  (details) => {
    try {
      const { tabId, url, responseHeaders = [], type } = details;
      if (tabId < 0) return;
      const ct = (responseHeaders.find(h => h.name.toLowerCase() === 'content-type') || {}).value;
      const cl = (responseHeaders.find(h => h.name.toLowerCase() === 'content-length') || {}).value;
      const sizeBytes = cl ? Number(cl) : undefined;
      if (!isVideoLike(url, ct)) return;
      addVideo(tabId, {
        url,
        filename: filenameFromUrl(url),
        contentType: ct,
        sizeBytes,
        source: 'webRequest'
      });
    } catch (e) {
      // no-op
    }
  },
  { urls: ["<all_urls>"] },
  ["responseHeaders"]
);

// Clean per-tab cache on navigation
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === 'loading') {
    clearTab(tabId);
  }
});

chrome.tabs.onRemoved.addListener((tabId) => {
  videoCache.delete(tabId);
});

// Messaging
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg?.type === 'videoElements' && sender.tab && sender.tab.id != null) {
    const tabId = sender.tab.id;
    (msg.items || []).forEach((it) => {
      if (!it?.url) return;
      addVideo(tabId, {
        url: it.url,
        filename: filenameFromUrl(it.url),
        contentType: it.contentType,
        source: 'dom'
      });
    });
    sendResponse({ ok: true });
    return true;
  }
  if (msg?.type === 'getVideos') {
    const tabId = Number(msg.tabId);
    sendResponse({ items: getVideos(tabId) });
    return true;
  }
  if (msg?.type === 'recordDownload') {
    const record = msg.record;
    chrome.storage.local.get({ history: [] }, (data) => {
      const history = data.history || [];
      history.unshift({ ...record, at: Date.now() });
      chrome.storage.local.set({ history });
    });
    sendResponse({ ok: true });
    return true;
  }
});

// Context menus
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: 'vg-download-all',
      title: '下载本页视频',
      contexts: ['page']
    });
    chrome.contextMenus.create({
      id: 'vg-copy-first',
      title: '复制视频链接',
      contexts: ['page']
    });
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (!tab || tab.id == null) return;
  const tabId = tab.id;
  const items = getVideos(tabId);
  if (!items.length) return;
  if (info.menuItemId === 'vg-download-all') {
    const first = items[0];
    chrome.downloads.download({ url: first.url, filename: first.filename });
  } else if (info.menuItemId === 'vg-copy-first') {
    // Open popup for multiple; else copy first
    if (items.length > 1) {
      try { await chrome.action.openPopup(); } catch (_) {}
    } else {
      try {
        await navigator.clipboard.writeText(items[0].url);
      } catch (_) {}
    }
  }
});

