// 웹 화면(index.html)과 데스크톱 기능을 잇는 다리
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('desktop', {
  isDesktop: true,
  hotkey: process.platform === 'darwin' ? '⌘+Option+T' : 'Ctrl+Alt+T',
  // 단축키로 클립보드 내용이 들어오면 화면 쪽에서 할 일로 담고, 결과를 돌려줘요
  onQuickAdd: (handler) => {
    ipcRenderer.on('quick-add', (_e, text) => {
      let result;
      try { result = handler(text); } catch (err) { result = { added: [], reason: String(err && err.message || err) }; }
      ipcRenderer.send('quick-add-result', result);
    });
  },
  // Jira: 앱 안 웹 로그인 (토큰 저장 없음)
  jira: {
    status: () => ipcRenderer.invoke('jira:status'),
    login: (site) => ipcRenderer.invoke('jira:login', site),
    logout: () => ipcRenderer.invoke('jira:logout'),
    mine: () => ipcRenderer.invoke('jira:mine'),
  },
});
