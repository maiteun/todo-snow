# 🎄 크리스마스 할 일 숲

할 일을 끝내면 눈송이가 모이고, 눈송이로 만든 눈덩이를 트리에 던져 칠하고, 별가루로 장식을 사서 트리를 꾸미는 3D 할 일 앱이에요.
처음엔 칙칙한 맨 트리에서 시작해서, 할 일을 많이 할수록 화려해져요.

## 이렇게 놀아요
1. **할 일 담기** — Slack 스레드·Jira 이슈·문서 링크를 `Ctrl+V` 하거나 화면에 끌어다 놓으면 바로 바구니에 담겨요.
2. **끝내기** — 할 일 1개 = 눈송이 ❄️ 1개, 눈송이 3개 = 눈덩이 ⚪ 1개 (눈덩이마다 어떤 할 일로 만들었는지 기억해요)
3. **던지기** — 화면을 아래로 당겼다 놓으면 눈덩이가 날아가요. 맞은 자리가 칠해지고 별가루 ✨ +1
4. **상점** — 레벨이 오르면 눈 색, 오너먼트, 꼬마전구·별 같은 장식이 열려요

## 실행하기

### 브라우저로 (설치 없이)
`index.html` 을 더블클릭하면 돼요. 처음 열 때 인터넷이 필요해요 (three.js, 글꼴).

### 다른 PC(집)에서 이어서 작업하기
1. [Node.js](https://nodejs.org) 와 Git 설치 (Windows: `winget install OpenJS.NodeJS.LTS` / `winget install Git.Git`)
2. 코드 받기
   ```powershell
   git clone https://github.com/maiteun/todo-snow.git
   cd todo-snow
   ```
3. 한 번만 설치 (Electron 설치가 막히는 PC도 알아서 처리해요)
   ```powershell
   powershell -ExecutionPolicy Bypass -File .\setup.ps1
   ```
4. 실행: `npm start`

> `node_modules` 는 저장소에 없어요. 용량이 크고(Electron만 150MB+) GitHub 파일 크기 제한(100MB)에 걸려서, 3번에서 다시 만들어요.
> 할 일·트리·레벨 같은 **내 데이터는 PC마다 따로** 저장돼요 (코드와 함께 옮겨지지 않아요).
> 옮기려면 원래 PC에서 오른쪽 위 **💾 → 내보내기**로 백업 파일을 만들고, 새 PC에서 **💾 → 가져오기**로 열면 돼요.

### 데스크톱 앱으로 (Electron)
```bash
npm install   # 또는 setup.ps1
npm start
```
- 창을 닫아도 트레이에 남아 있어요
- 다른 창에서 링크를 복사하고 `Ctrl+Alt+T` 를 누르면 바로 담겨요
- 바구니 → 🎫 Jira 에서 앱 안 웹 로그인으로 내 담당 이슈를 가져와요 (토큰 저장 없음, 읽기만 함)

> Windows에 Visual C++ 런타임이 없으면 `npm install` 중 Electron 다운로드가 실패할 수 있어요.
> 그럴 땐 [Electron 릴리스](https://github.com/electron/electron/releases)에서 같은 버전의 `win32-x64.zip` 을 받아 `node_modules/electron/dist` 에 풀고,
> `node_modules/electron/path.txt` 에 `electron.exe` 라고 적어 주세요.

### 배경화면으로
`wallpaper.html` 을 [Lively Wallpaper](https://www.rocksdanister.com/lively/)에 추가하면 바탕화면에 트리가 깔려요.
`wallpaper.html` 은 `index.html` 에 `window.WALLPAPER_MODE = true` 한 줄을 더한 파일이에요.

## 파일
| 파일 | 설명 |
|---|---|
| `index.html` | 앱 전체 (3D 화면, 할 일, 상점, Jira 붙여넣기) |
| `wallpaper.html` | 배경화면 모드 버전 |
| `main.js` | 데스크톱 앱: 창, 트레이, 단축키, Jira 웹 로그인 |
| `preload.js` | 화면과 데스크톱 기능 연결 |
| `setup.ps1` | 새 PC에서 한 번 실행하는 설치 스크립트 |
| `index-v1-backup.html` | 예전 버전(오너먼트=할 일, 트리 성장, 눈사람 눈싸움) 백업 |

데이터는 각자 브라우저/앱 안에만 저장돼요 (서버 없음).
