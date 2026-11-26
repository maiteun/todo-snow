# 🎄 크리스마스 할 일 숲 · 다음 세션 인수인계 (2026-11-23)

새 세션은 이 파일과 `README.md` 를 먼저 읽고 시작하세요.
프로젝트 폴더: `C:\Users\user\Desktop\christmas-todo` · GitHub: https://github.com/maiteun/todo-snow (private)

---

## 1. 지금 상태 한눈에
- 데스크톱 앱(Electron 45.4.1)은 이 PC에서 잘 돌아가요. 할 일 담기, 끝내기, 눈덩이 던지기, 상점, 💾 백업은 모두 동작해요.
- 커밋은 `ce92830` 까지 GitHub에 올라가 있어요.
- **아직 커밋하지 않은 변경** (다음 세션에서 확인하고 커밋하세요)
  - `index.html`, `wallpaper.html`: 데스크톱 앱에서 Jira 버튼 이름을 "🎫 Jira 로그인"으로 바꾸고, 붙여넣기 창에 "🎫 로그인해서 바로 가져오기" 버튼을 추가했어요.
  - `supabase/schema.sql`: 친구 숲 DB 구조. 새 파일이고, 아직 Supabase에서 실행하지 않았어요.
  - `HANDOFF.md`: 이 문서.

## 2. 남은 일 ①: Jira 로그인 (아직 해결 안 됨)
**사용자는 아직 앱에서 Jira 로그인을 못 했어요.** 처음 할 일:

1. 앱을 다시 켜요.
   ```powershell
   Get-Process electron -ErrorAction SilentlyContinue | Where-Object { $_.Path -like '*christmas-todo*' } | Stop-Process -Force
   Start-Process -FilePath "C:\Users\user\Desktop\christmas-todo\node_modules\electron\dist\electron.exe" -ArgumentList '.' -WorkingDirectory "C:\Users\user\Desktop\christmas-todo"
   ```
2. 사용자와 함께 확인해요: 바구니 → **🎫 Jira 로그인** → `https://jira-flitto.atlassian.net` 입력 → **로그인** → 회사 계정으로 로그인.
3. 버튼이 안 보이거나, 로그인 창이 안 뜨거나, 로그인해도 연결되지 않으면 `main.js` 의 `jira:login` 부분을 디버깅해요.

**헷갈리기 쉬운 점**
- Jira 로그인은 **데스크톱 앱에서만** 돼요. Claude 앱 오른쪽 브라우저 창이나 브라우저로 `index.html` 을 열면 `window.desktop` 이 없어서 붙여넣기 창만 떠요. 지난번에 사용자가 본 화면이 이 경우였을 가능성이 커요.
- 연결 여부 확인 방법
  - `%APPDATA%\크리스마스 할 일 숲\jira.json` 파일이 생겼는지 봐요.
  - 앱의 🎫 창에 "✅ ○○ 님으로 연결됨" 이라고 뜨는지 봐요.

**구조**
- 로그인은 `persist:jira` 파티션 안에서 하는 웹 로그인이에요. 2.5초마다 `/rest/api/3/myself` 를 확인해서 로그인됐는지 알아내요.
- 이슈는 `jira:mine` 에서 `session.fetch` 로 가져와요. JQL은 `assignee = currentUser() AND statusCategory != Done` 이에요.
- **API 토큰은 쓰지 않아요.** 사용자가 위험하다고 거절했어요.
- 사용자가 원할 수도 있는 기능: RTT 프로젝트만 가져오는 필터. 지금은 모든 프로젝트를 가져와요.
- 참고로 지금 사용자에게 배정된 RTT 진행 중 이슈는 RTT-2990, RTT-2946, RTT-2716(마감 11/30), RTT-2922 예요.

## 3. 남은 일 ②: 친구 숲 (Supabase) · 여기서부터 시작 예정
### 사용자가 할 일
1. supabase.com 에서 **New project** 를 만들어요. 이름 예: `todo-snow`, 지역: Seoul.
2. **Authentication → Sign In / Providers** 에서 **Allow anonymous sign-ins** 를 켜요.
3. **SQL Editor** 에 `supabase/schema.sql` 전체를 붙여넣고 **Run** 을 눌러요. 여러 번 실행해도 괜찮아요.
4. **Project Settings → API** 에서 **Project URL** 과 **anon(또는 publishable) 키** 를 Claude에게 알려줘요.
   - ⚠️ **service_role 키나 secret 키는 절대 받지도, 쓰지도 마세요.**

### schema.sql 요약
- 테이블
  - `forests(id, code, name, created_by)`: 초대 코드는 `SNOW-XXXXX` 형식이에요.
  - `members(forest_id, user_id, nickname, color, level, done_count, coverage, balls, tree jsonb, todos jsonb [{t,d}])`
  - `events(kind: wave/heart/cheer/levelup/done/paint/join)`
- 보안(RLS): 같은 숲 멤버끼리만 서로 볼 수 있고, 내 행은 나만 고칠 수 있어요. 숲을 만들거나 들어가는 건 RPC `create_forest` / `join_forest` / `forest_info` 로만 할 수 있어요.
- `members` 와 `events` 는 실시간 알림(realtime)에 등록돼 있어요.
- 공유하는 것: 이름표, 레벨, 끝낸 개수, 눈 덮임, 트리 모습, **할 일 제목**. 사용자가 제목 공개를 원했어요.
- 공유하지 않는 것: 링크, 메모, Jira 설명, 하위 할 일.

### 앱에 만들 것
1. `index.html` 에 supabase-js를 넣어요 (jsdelivr ESM, 버전 고정). URL과 anon 키는 코드 안의 상수로 넣어요 (공개해도 되는 값이에요).
2. 익명 로그인 → 숲 만들기(초대 코드 보여주기) / 코드로 들어가기. 이름표와 색은 내가 골라요.
3. 내 상태를 `members` 에 올려요 (변경이 있을 때 디바운스). 할 일마다 🔒 숨기기, 그리고 "개수만 공개" 전체 옵션을 둬요.
4. 광장에 친구를 눈사람으로 보여줘요 (Realtime presence와 members 구독). 친구를 누르면 공개한 할 일, 레벨, 트리 정보를 보여줘요.
5. 👋 인사 / ❤️ 하트 이벤트, 그리고 숲 소식 토스트.
6. 나중에: 친구 트리 구경하러 가기, 숲 소식 피드.
7. 앱을 두 개 띄워 서로 보이는지 테스트해요 (두 번째 창은 다른 저장소 파티션을 써야 해요).

## 4. 작업 규칙 / 주의
- `index.html` 을 고치면 **꼭** `wallpaper.html` 을 다시 만들어요 (Bash 도구에서 실행).
  ```bash
  cd /c/Users/user/Desktop/christmas-todo && sed 's#<script type="importmap">#<script>window.WALLPAPER_MODE = true;</script>\n<script type="importmap">#' index.html > wallpaper.html
  ```
- 고친 뒤에는 앱을 다시 켜서 확인해요 (2번 항목의 명령).
- 커밋 작성자는 이 저장소에만 설정돼 있어요: `maiteun` / `172099927+maiteun@users.noreply.github.com`. `git push` 는 그냥 실행하면 돼요.
- 이 PC에는 Visual C++ 런타임이 없어서 Electron을 npm으로 설치할 수 없어요. 대신 `setup.ps1` 이 Electron zip을 받아 직접 풀어 넣어요.
- 데이터 저장 위치
  - localStorage, 키 접두사 `xmas-forest-todos-v1`. 게임 상태 키는 `:game2`.
  - 앱 데이터 폴더: `%APPDATA%\크리스마스 할 일 숲`
- 사용자 취향
  - 한국어로 쉽게 설명해 주세요.
  - 글자는 작은 편을 좋아해요.
  - 카드는 화면 가운데 팝업으로 띄워요.
  - 토큰처럼 위험해 보이는 방식은 싫어해요.
- 나중에 할 일: `.exe` 설치 파일 만들기 (electron-builder).
