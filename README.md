# 구급초과달력 (구급대 희망근무 소통달력)

https://hwpccalendar.web.app 에 올라가 있는 사이트 그대로입니다.

- `public/` — 배포되는 파일 (React 빌드 결과물). 고칠 때는 `public/index.html` 을 직접 수정합니다.
  - 상단 AI사다리(네임카드) 링크 바
  - 컴퓨터에서도 모바일처럼 가운데 480px 로 보이게 하는 CSS
- React 원본 소스는 이 저장소에 없습니다. 원본을 찾으면 그쪽에도 위 두 가지를 넣어야 합니다.
- 예전 바닐라 JS 버전은 2026-10-02 에 삭제했습니다 (사이트에서 쓰지 않음). 필요하면 git 기록(커밋 cd5ebf8 이전)에 남아 있습니다.

## 배포

```
$env:NODE_OPTIONS='--use-system-ca'
npx firebase deploy --only hosting
```
