// 크리스마스 할 일 숲 - 데스크톱 앱 (Electron)
// - 창을 닫아도 트레이에 남아 있어요
// - Ctrl+Alt+T: 지금 복사해 둔 링크/글을 바로 할 일 바구니에 담아요
const { app, BrowserWindow, Tray, Menu, globalShortcut, clipboard, Notification, nativeImage, ipcMain, shell, session } = require('electron');
const path = require('path');
const fs = require('fs');
const zlib = require('zlib');

const APP_NAME = '크리스마스 할 일 숲';
const HOTKEY = 'CommandOrControl+Alt+T';
let win = null, tray = null, quitting = false, pageReady = false;
const pending = [];

/* ---------- 아이콘 (작은 트리를 직접 그려서 PNG로) ---------- */
function crc32(buf) {
  let crc = 0xffffffff;
  for (let n = 0; n < buf.length; n++) {
    let c = (crc ^ buf[n]) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = (crc >>> 8) ^ c;
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function png(w, h, pix) {
  const row = w * 4 + 1, raw = Buffer.alloc(row * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) pix(x, y).forEach((v, i) => { raw[y * row + 1 + x * 4 + i] = v; });
  const chunk = (type, data) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type), data]), crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
    return Buffer.concat([len, td, crc]);
  };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}
function treeIcon(size) {
  const tiers = [[.16, .44, .2], [.3, .64, .3], [.46, .84, .4]];
  return nativeImage.createFromBuffer(png(size, size, (x, y) => {
    const u = (x + .5) / size, v = (y + .5) / size;
    if (Math.abs(u - .5) + Math.abs(v - .11) < .09) return [255, 214, 94, 255];            // 별
    if (v > .82 && v < .96 && Math.abs(u - .5) < .08) return [120, 78, 46, 255];          // 줄기
    for (const [top, bot, hw] of tiers) {
      if (v >= top && v <= bot && Math.abs(u - .5) <= hw * (v - top) / (bot - top) + .03) {
        const d = Math.hypot(u - .38, v - .58), d2 = Math.hypot(u - .62, v - .74);
        if (d < .05) return [232, 67, 63, 255];                                             // 빨간 방울
        if (d2 < .05) return [244, 185, 58, 255];                                           // 금색 방울
        return [47, 140, 90, 255];
      }
    }
    return [0, 0, 0, 0];
  }));
}

/* ---------- 창 / 트레이 ---------- */
function showWin() {
  if (!win) return;
  if (win.isMinimized()) win.restore();
  win.show(); win.focus();
}
function notify(title, body) {
  if (!Notification.isSupported()) return;
  const n = new Notification({ title, body, icon: treeIcon(64), silent: false });
  n.on('click', showWin); n.show();
}
function createWindow() {
  win = new BrowserWindow({
    width: 1280, height: 820, minWidth: 820, minHeight: 560,
    title: APP_NAME, icon: treeIcon(64), backgroundColor: '#0b1230', autoHideMenuBar: true, show: false,
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false },
  });
  win.loadFile(path.join(__dirname, 'index.html'));
  win.once('ready-to-show', () => win.show());
  win.webContents.on('did-finish-load', () => { pageReady = true; while (pending.length) win.webContents.send('quick-add', pending.shift()); });
  // 카드의 Slack/Jira 링크는 평소 쓰는 브라우저(이미 로그인된 곳)에서 열어요
  win.webContents.setWindowOpenHandler(({ url }) => { if (/^https?:/.test(url)) shell.openExternal(url); return { action: 'deny' }; });
  win.webContents.on('will-navigate', (e, url) => { if (/^https?:/.test(url)) { e.preventDefault(); shell.openExternal(url); } });
  let toldTray = false;
  win.on('close', (e) => {
    if (quitting) return;
    e.preventDefault(); win.hide();
    if (!toldTray) { toldTray = true; notify('트레이에서 계속 실행 중이에요 🎄', `복사한 링크는 ${hotkeyLabel()} 로 바로 담을 수 있어요. 완전히 끄려면 트레이 아이콘 → 종료`); }
  });
}
const hotkeyLabel = () => HOTKEY.replace('CommandOrControl', 'Ctrl');
function loginItemOpts(open) {
  // 개발 중(npm start)에는 이 폴더를 인자로 넘겨야 앱이 제대로 켜져요
  return app.isPackaged ? { openAtLogin: open } : { openAtLogin: open, path: process.execPath, args: [path.resolve(__dirname)] };
}
function buildTrayMenu() {
  const auto = app.getLoginItemSettings(loginItemOpts(true)).openAtLogin;
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: '🎄 열기', click: showWin },
    { label: `📋 복사한 내용 바구니에 담기  (${hotkeyLabel()})`, click: quickAdd },
    { type: 'separator' },
    { label: 'Windows 시작할 때 실행', type: 'checkbox', checked: auto, click: (item) => { app.setLoginItemSettings(loginItemOpts(item.checked)); } },
    { type: 'separator' },
    { label: '종료', click: () => { quitting = true; app.quit(); } },
  ]));
}
function createTray() {
  tray = new Tray(treeIcon(32).resize({ width: 16, height: 16 }));
  tray.setToolTip(`${APP_NAME}\n${hotkeyLabel()}: 복사한 링크 바로 담기`);
  tray.on('click', showWin);
  buildTrayMenu();
}

/* ---------- 단축키로 담기 ---------- */
function quickAdd() {
  const text = clipboard.readText();
  if (!text || !text.trim()) { notify('클립보드가 비어 있어요', 'Slack 스레드나 Jira 링크를 복사한 뒤 다시 눌러주세요'); return; }
  if (!win || !pageReady) { pending.push(text); return; }
  win.webContents.send('quick-add', text);
}
ipcMain.on('quick-add-result', (_e, r) => {
  const added = (r && r.added) || [];
  if (added.length) notify(`🎄 바구니에 ${added.length}개 담았어요`, added.slice(0, 4).join('\n') + (added.length > 4 ? `\n외 ${added.length - 4}개` : ''));
  else notify('담지 못했어요', (r && r.reason) || '할 일로 만들 내용을 못 찾았어요');
});

/* ---------- Jira: 앱 안에서 웹 로그인 ----------
   - 토큰/비밀번호를 저장하지 않아요. 앱 전용 브라우저 공간(persist:jira)에 로그인 상태만 남아요
   - 이슈는 그 로그인 상태로 Jira REST API를 읽어서 가져와요 (읽기만 해요) */
const JIRA_PART = 'persist:jira';
const jiraSes = () => session.fromPartition(JIRA_PART);
const cfgPath = () => path.join(app.getPath('userData'), 'jira.json');
const loadCfg = () => { try { return JSON.parse(fs.readFileSync(cfgPath(), 'utf8')); } catch { return {}; } };
const saveCfg = (c) => { try { fs.writeFileSync(cfgPath(), JSON.stringify(c)); } catch {} };
function normSite(s) {
  s = (s || '').trim(); if (!s) return null;
  if (!/^https?:\/\//i.test(s)) s = 'https://' + s;
  try { const u = new URL(s); return /\.(atlassian\.net|jira\.com)$/i.test(u.hostname) ? 'https://' + u.hostname : null; } catch { return null; }
}
let uaSet = false;
function prepJiraSession() { // 구글 로그인 등이 "앱 안 브라우저"를 막지 않도록 일반 Chrome처럼 보이게
  if (uaSet) return; uaSet = true;
  const ua = session.defaultSession.getUserAgent().replace(/\s*Electron\/\S+/i, '').replace(/\s*christmas-todo-forest\/\S+/i, '');
  jiraSes().setUserAgent(ua);
}
async function jiraFetch(site, p) {
  prepJiraSession();
  const r = await jiraSes().fetch(site + p, { headers: { Accept: 'application/json' } });
  if (r.status === 401 || r.status === 403) throw new Error('LOGIN');
  if (!r.ok) throw new Error('Jira 응답 오류 ' + r.status);
  try { return await r.json(); } catch { throw new Error('LOGIN'); } // 로그인 페이지(HTML)로 돌려보낸 경우
}
function adfToText(n) { // Jira 설명(ADF 형식) → 일반 글
  if (!n) return ''; if (typeof n === 'string') return n;
  const walk = (node) => {
    if (!node) return '';
    if (node.type === 'text') return node.text || '';
    if (node.type === 'hardBreak') return '\n';
    if (node.type === 'mention' || node.type === 'emoji') return (node.attrs && (node.attrs.text || node.attrs.shortName)) || '';
    if (node.type === 'inlineCard' || node.type === 'blockCard') return (node.attrs && node.attrs.url) || '';
    const inner = (node.content || []).map(walk).join('');
    if (['paragraph', 'heading', 'codeBlock', 'blockquote'].includes(node.type)) return inner + '\n';
    if (node.type === 'listItem') return '- ' + inner.trim() + '\n';
    return inner;
  };
  return walk(n).replace(/\n{3,}/g, '\n\n').trim();
}
ipcMain.handle('jira:status', async () => {
  const { site } = loadCfg(); if (!site) return { connected: false };
  try { const me = await jiraFetch(site, '/rest/api/3/myself'); return { connected: true, site, user: me.displayName }; }
  catch (e) { return { connected: false, site, error: e.message }; }
});
ipcMain.handle('jira:login', async (_e, siteIn) => {
  const site = normSite(siteIn);
  if (!site) return { ok: false, error: '회사 Jira 주소를 확인해주세요 (예: https://회사이름.atlassian.net)' };
  try { const me = await jiraFetch(site, '/rest/api/3/myself'); saveCfg({ site }); return { ok: true, site, user: me.displayName }; } catch {}
  prepJiraSession();
  return new Promise((resolve) => {
    const lw = new BrowserWindow({ width: 560, height: 760, title: 'Jira 로그인', icon: treeIcon(64), autoHideMenuBar: true, parent: win || undefined,
      webPreferences: { partition: JIRA_PART, contextIsolation: true, nodeIntegration: false } });
    let done = false;
    const finish = (r) => { if (done) return; done = true; clearInterval(iv); resolve(r); if (!lw.isDestroyed()) lw.close(); if (win) showWin(); };
    const check = async () => { if (done) return; try { const me = await jiraFetch(site, '/rest/api/3/myself'); saveCfg({ site }); finish({ ok: true, site, user: me.displayName }); } catch {} };
    const iv = setInterval(check, 2500);
    lw.webContents.on('did-finish-load', check);
    lw.on('closed', () => { if (!done) { done = true; clearInterval(iv); resolve({ ok: false, error: '로그인 창을 닫았어요' }); } });
    lw.loadURL(site + '/jira/your-work');
  });
});
ipcMain.handle('jira:logout', async () => { await jiraSes().clearStorageData(); return { ok: true }; });
ipcMain.handle('jira:mine', async () => {
  const { site } = loadCfg(); if (!site) return { ok: false, error: 'NOSITE' };
  const jql = 'assignee = currentUser() AND statusCategory != Done ORDER BY updated DESC';
  const fields = 'summary,status,description,subtasks,issuetype,parent';
  try {
    const data = await jiraFetch(site, `/rest/api/3/search/jql?jql=${encodeURIComponent(jql)}&fields=${fields}&maxResults=50`);
    const all = data.issues || [];
    const parents = new Set(all.filter(i => !(i.fields.issuetype && i.fields.issuetype.subtask)).map(i => i.key));
    const issues = all
      .filter(i => !(i.fields.issuetype && i.fields.issuetype.subtask) || !(i.fields.parent && parents.has(i.fields.parent.key))) // 부모가 목록에 있으면 하위 할 일로만
      .map(i => ({
        key: i.key, url: `${site}/browse/${i.key}`, title: i.fields.summary || i.key, status: i.fields.status && i.fields.status.name,
        note: adfToText(i.fields.description).slice(0, 4000),
        subs: (i.fields.subtasks || []).map(s => ({ key: s.key, title: s.fields.summary, done: !!(s.fields.status && s.fields.status.statusCategory && s.fields.status.statusCategory.key === 'done') })),
      }));
    return { ok: true, site, issues };
  } catch (e) { return { ok: false, site, error: e.message }; }
});

/* ---------- 시작 ---------- */
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', showWin);
  app.setAppUserModelId('com.christmas.todoforest');
  app.whenReady().then(() => {
    createWindow();
    createTray();
    if (!globalShortcut.register(HOTKEY, quickAdd)) notify('단축키를 쓸 수 없어요', `${hotkeyLabel()} 를 다른 프로그램이 쓰고 있어요. 트레이 메뉴에서 담기를 눌러주세요`);
  });
  app.on('before-quit', () => { quitting = true; });
  app.on('will-quit', () => globalShortcut.unregisterAll());
  app.on('window-all-closed', (e) => e.preventDefault()); // 트레이에 남기
}
