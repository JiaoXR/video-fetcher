function humanSize(bytes) {
  if (!bytes && bytes !== 0) return undefined;
  const units = ['B','KB','MB','GB','TB'];
  let n = bytes; let i = 0;
  while (n >= 1024 && i < units.length - 1) { n /= 1024; i++; }
  return `${n.toFixed(n < 10 && i > 0 ? 1 : 0)} ${units[i]}`;
}

async function getActiveTabId() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab?.id;
}

async function fetchVideos(tabId) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: 'getVideos', tabId }, (resp) => {
      resolve(resp?.items || []);
    });
  });
}

function renderList(items) {
  const list = document.getElementById('list');
  const status = document.getElementById('status');
  list.innerHTML = '';
  if (!items.length) {
    status.textContent = '未检测到视频资源';
    status.classList.remove('hidden');
    return;
  }
  status.textContent = `检测到 ${items.length} 个视频资源`;
  const frag = document.createDocumentFragment();
  for (const item of items) {
    const li = document.createElement('li');
    li.className = 'item';
    const meta = document.createElement('div');
    meta.className = 'meta';
    const name = document.createElement('div');
    name.className = 'name';
    name.textContent = item.filename || 'video';
    const url = document.createElement('div');
    url.className = 'url';
    url.textContent = item.url;
    const badges = document.createElement('div');
    badges.className = 'badges';
    if (item.contentType) {
      const b = document.createElement('span');
      b.className = 'badge'; b.textContent = item.contentType;
      badges.appendChild(b);
    }
    if (item.sizeBytes) {
      const b = document.createElement('span');
      b.className = 'badge'; b.textContent = humanSize(item.sizeBytes);
      badges.appendChild(b);
    }
    meta.appendChild(name); meta.appendChild(url); meta.appendChild(badges);

    const controls = document.createElement('div');
    controls.className = 'controls';
    const btnDl = document.createElement('button');
    btnDl.textContent = '下载';
    btnDl.addEventListener('click', async () => {
      try {
        await chrome.downloads.download({ url: item.url, filename: item.filename });
        chrome.runtime.sendMessage({ type: 'recordDownload', record: { url: item.url, filename: item.filename } });
      } catch (_) {}
    });
    const btnCopy = document.createElement('button');
    btnCopy.textContent = '复制链接';
    btnCopy.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(item.url);
        btnCopy.textContent = '已复制';
        setTimeout(() => btnCopy.textContent = '复制链接', 800);
      } catch (_) {}
    });
    controls.appendChild(btnDl); controls.appendChild(btnCopy);

    li.appendChild(meta); li.appendChild(controls);
    frag.appendChild(li);
  }
  list.appendChild(frag);
}

async function init() {
  const tabId = await getActiveTabId();
  const items = await fetchVideos(tabId);
  renderList(items);
  document.getElementById('refresh').addEventListener('click', async () => {
    const items = await fetchVideos(tabId);
    renderList(items);
  });
  document.getElementById('open-history').addEventListener('click', async () => {
    const { history = [] } = await chrome.storage.local.get({ history: [] });
    if (!history.length) return;
    const lines = history.slice(0, 20).map(h => `• ${h.filename || 'video'}\n${h.url}`).join('\n\n');
    alert(`最近下载:\n\n${lines}`);
  });
}

init();

