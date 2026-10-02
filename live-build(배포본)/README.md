# 구급대 희망근무 소통달력 - 배포본

2026-10-02에 https://hwpccalendar.web.app 에서 내려받은 빌드 결과물입니다.
React 원본 소스가 이 PC와 GitHub(HWPCCalendar 저장소는 옛 바닐라JS 버전)에 없어서,
상단 AI사다리(네임카드) 링크를 넣기 위해 public/index.html 만 직접 고쳤습니다.
원본 소스를 찾으면 그쪽 index.html 의 <body> 바로 아래에도 같은 링크를 넣어야 합니다.

배포: $env:NODE_OPTIONS='--use-system-ca'; npx firebase deploy --only hosting
