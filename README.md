# 노미요 게임 (nomiyou-game)

Three.js로 만드는 노미요(여우)와 파닥이들(병아리) 공포 게임 프로토타입.

## 실행

```bash
npm install
npm run dev
```

브라우저에서 `http://localhost:5173` 을 엽니다.

## 조작

| 키 | 동작 |
| --- | --- |
| W A S D / 방향키 | 노미요 이동 (카메라 기준) |
| Shift | 달리기 |
| Space | 의자에 앉기 / 일어나기 (의자 근처에서) |
| F | 노미요 표정 전환 |
| E | 파닥이 표정 전환 (기본 → 기쁨 → 윙크 → 무표정) |
| H | 공포 모드 전환 |
| 마우스 드래그 / 휠 | 카메라 회전 / 줌 |

방 왼쪽 벽의 문으로 걸어가면 밤 숲으로 나가고, 숲의 오두막 문으로 들어오면 방으로 돌아옵니다.

## 구조

- `src/characters/fox.js` — 노미요 모델과 애니메이션 (걷기, 대기, 앉기, 표정)
- `src/characters/chick.js` — 파닥이 모델과 애니메이션
- `src/world/house.js` — 노미요의 방 (책상, 의자, 침대, CHAT 칠판, 문 등)
- `src/world/forest.js` — 밤 숲과 오두막
- `src/world/textures.js` — 캔버스로 그리는 텍스처 (나무결, 여우 아이콘, 메모, 시계 등)
- `src/helpers.js` — 셀 셰이딩 재질, 외곽선, 지그재그 텍스처, 눈 깜빡임 등 공용 헬퍼
- `src/main.js` — 씬, 입력, 월드 전환, 카메라, 게임 루프

## 디버그 URL 파라미터

`?world=forest`, `?horror=1`, `?sit=1`, `?at=x,z`, `?keys=KeyW,ShiftLeft`, `?yaw=&dist=&height=`, `?steps=N`, `?trace=1`
