// 처음 설치한 동료 화면 미리보기: node_modules\\electron\\dist\\electron.exe scripts\\preview-coach.js
const { app, BrowserWindow } = require('electron');
const path = require('path'), fs = require('fs'), os = require('os');
app.setPath('userData', fs.mkdtempSync(path.join(os.tmpdir(), 'todo-snow-coach-')));
const OUT = path.join(__dirname, 'preview'); fs.mkdirSync(OUT, { recursive: true });
const wait = ms => new Promise(r => setTimeout(r, ms));
app.whenReady().then(async () => {
  const win = new BrowserWindow({ width: 1280, height: 800, show: false, useContentSize: true, backgroundColor: '#0b1230', webPreferences: { preload: path.join(__dirname, '..', 'preload.js'), contextIsolation: true, backgroundThrottling: false, offscreen: true } });
  const js = c => win.webContents.executeJavaScript(c), shot = async n => { fs.writeFileSync(path.join(OUT, n + '.png'), (await win.webContents.capturePage()).toPNG()); console.log('saved', n); };
  win.setContentSize(1280, 800); win.webContents.setFrameRate(30);
  await win.loadFile(path.join(__dirname, '..', 'index.html')); await js("localStorage.clear()"); await win.loadFile(path.join(__dirname, '..', 'index.html')); await wait(9000);
  await js("document.getElementById('tourNext').click()"); await wait(700);
  await js("document.getElementById('tourNext').click()"); await wait(2500);
  await shot('coach');
  app.quit();
});
