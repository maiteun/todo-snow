// 소개 페이지용 스크린샷을 찍어요 (예시 데이터, 내 진짜 데이터는 건드리지 않아요)
//   실행:  node_modules\electron\dist\electron.exe scripts\shots.js
const { app, BrowserWindow } = require('electron');
const path = require('path'), fs = require('fs'), os = require('os');
app.setPath('userData', fs.mkdtempSync(path.join(os.tmpdir(), 'todo-snow-shots-')));
const OUT = path.join(__dirname, '..', 'download-site', 'shots');
fs.mkdirSync(OUT, { recursive: true });
const wait = ms => new Promise(r => setTimeout(r, ms));
const STORE = 'xmas-forest-todos-v1', now = Date.now();
const mk = (text, done, subs = [], note = '') => ({ id: Math.random().toString(36).slice(2), text, done, createdAt: now - 86400000, doneAt: done ? now - 3600000 : null, rw: done ? true : undefined, note, src: undefined,
  subs: subs.map(([t, d]) => ({ id: Math.random().toString(36).slice(2), text: t, done: d })) });
const todos = [
  mk('신규 기능 기획안 정리하기', false, [['레퍼런스 3개 찾기', true], ['디자인팀께 시안 요청', true], ['개발팀 일정 확인', false], ['공유 문서 만들기', false]], '킥오프 전까지 1차 초안 필요\n- 목표 사용자\n- 핵심 시나리오 3가지'),
  mk('분기 회고 자료 준비', false, [['지표 모으기', true], ['슬라이드 정리', false]]),
  mk('고객 문의 답변 보내기', false, [], 'A사 요청 건\n답변 초안은 어제 공유함'),
  mk('팀 주간 회의 안건 올리기', false),
  ...['디자인 시안 리뷰', '배포 체크리스트 확인', '번역 요청 보내기', 'QA 결과 확인', '릴리스 노트 작성', '고객사 미팅 정리', '로그 분석', '가이드 문서 수정', '이슈 트리아지', '스프린트 계획', '버그 재현 확인'].map(t => mk(t, true)),
];
const G = { flakes: 1, balls: 2, dust: 5, done: 11, paints: ['white', 'sky', 'pink', 'mint'], paint: 'sky', decor: ['lights', 'gifts', 'garland', 'star'], inv: {}, placed: [],
  splats: Array.from({ length: 150 }, (_, i) => ({ k: i % 3, u: +(Math.random()).toFixed(4), v: +(Math.random()).toFixed(4), c: ['#f4f7ff', '#a9d8ff', '#ffb8d4', '#a8edc9'][i % 4] })),
  ballSrc: [['디자인 시안 리뷰', '배포 체크리스트 확인', '번역 요청 보내기'], ['QA 결과 확인', '릴리스 노트 작성', '고객사 미팅 정리']], flakeSrc: ['로그 분석'] };
const seed = `(() => { const s = localStorage; s.setItem('${STORE}', ${JSON.stringify(JSON.stringify(todos))}); s.setItem('${STORE}:game2', ${JSON.stringify(JSON.stringify(G))});
  for (const k of [':seeded', ':cleared-1', ':reset-game-2', ':onboarded', ':jiraHinted']) s.setItem('${STORE}' + k, '1'); s.setItem('${STORE}:sound', 'off'); })()`;

app.whenReady().then(async () => {
  const win = new BrowserWindow({ width: 1280, height: 800, x: 30, y: 30, show: false, backgroundColor: '#0b1230', autoHideMenuBar: true,
    useContentSize: true, webPreferences: { preload: path.join(__dirname, '..', 'preload.js'), contextIsolation: true, backgroundThrottling: false, offscreen: true } });
  const idx = path.join(__dirname, '..', 'index.html'), js = c => win.webContents.executeJavaScript(c);
  const shot = async name => { const img = await win.webContents.capturePage(); fs.writeFileSync(path.join(OUT, name + '.png'), img.toPNG()); console.log('saved', name); };
  await win.loadFile(idx); await js(seed); win.setContentSize(1280, 800); win.webContents.setFrameRate(30); await win.loadFile(idx); await wait(9000); console.log('size', win.getContentSize(), await js('innerWidth + "x" + innerHeight + " dpr " + devicePixelRatio'));
  await shot('tree');
  await js(`document.getElementById('listBtn').click()`); await wait(900);
  await js(`document.querySelector('#listBody .item .txt')?.click()`); await wait(1400);
  await shot('card');
  await js(`window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))`); await wait(600);
  await js(`document.getElementById('throwBtn').click()`); await wait(3200);
  await shot('throw');
  await js(`window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))`); await wait(1800);
  await js(`window.dispatchEvent(new KeyboardEvent('keydown', { key: 's' }))`); await wait(1200);
  await shot('shop');
  app.quit();
});
