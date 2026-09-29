/**
 * 미스터리 고성 탈출 — 노미요가 방송에서 플레이하는 2D 탑다운(쯔꾸르풍) 미니게임.
 * 캔버스 하나에 타일맵 + 캐릭터 + 어둠/횃불 조명 + 대화창을 직접 그린다 (외부 에셋 없음).
 * 일차별 진행은 docs/game_timeline.md 를 따른다.
 *
 * 조작: 방향키/WASD 이동(Shift 달리기), E 조사/문 열기/대화 넘기기/선택 확정/옷장 숨기·나오기
 *
 * 층 구성 (FLOORS): 층마다 지도가 다르다
 * - 1층 (1일차·6일차 시작): 갈라진 벽 은열쇠 → 서랍 물컵 → 세면대 물 → 문을 막은 화로 끄고 밀기 → 은열쇠 문 → 청동열쇠 → 청동열쇠 문 → 계단
 * - 지하 1층 (3일차 시작): 쪽지 "내보내줘…" + 열쇠 두 개를 모아 가장 북쪽 포도송이 석탑 문을 열면 쪽지(힌트)와 지하 2층 계단
 * - 지하 2층 (4일차 시작): 세면대에서 물을 뜨려 하면 파닥이 유령 조우(물 안 나옴) → 유령이 말한 뒤엔 세면대에서 물이 나온다 → 벽의 그림이 알려 주는 순서대로 화로 넷 끄기 → 마지막 화로의 열쇠로 문 → 계단
 * - 지하 3층 (5일차 시작): 남쪽 잠긴 문 + 표지판(6자리 다이얼). 서랍을 전부 열면 파닥이 유령의 질문 → 앰플 → 정답 150105 → 인게임 크레딧
 *   6일차엔 1층부터 문이 다 열린 채로 내려와 여기서 유령을 따라가면 맵 밖 검은 공간의 솥(V3)에서 인형이 곡괭이로 변한다
 *
 * 진행 저장: 같은 날 방송을 껐다 켜면 이어서 한다 (save.day). 날이 바뀌면 그날의 시작 층에서 새로 시작한다.
 * 파닥이 NPC(C)는 presence(0~1)에 따라 실루엣처럼 얼핏얼핏 보이기만 한다 (말은 걸 수 없다).
 * 괴물/옷장 코드는 배드엔딩의 인게임 장면(monster 옵션)에서만 쓴다.
 */

const TILE = 32;
const VIEW_W = 20;
const VIEW_H = 13;
export const CANVAS_W = VIEW_W * TILE; // 640
export const CANVAS_H = VIEW_H * TILE; // 416

// 범례: # 벽, . 바닥, ~ 맵 밖 검은 공간(6일차), T 횃불, 1 청동열쇠 문(a), 2 은열쇠 문(b), a 청동열쇠, b 은열쇠, X 갈라진 벽(은열쇠),
//       C 파닥이 실루엣, W 옷장, D 서랍, S 세면대, F 불붙은 화로 → f 꺼진 화로 → G 옆으로 밀어 둔 화로(1층), E 계단, P 시작 위치,
//       N 쪽지(조사), M 바닥의 쪽지(밟으면 자동으로 읽음), Q 포도송이 석탑, A 벽에 걸린 그림, ! 표지판, K 6자리 다이얼 문,
//       U 마녀의 솥(V3), v 바닥에 떨어진 앰플
const MAP_F1 = [
  '##############################',
  '#T...T#T.D..T..D..T#T...T...T#',
  '#W....#............#.........#',
  '#..E..#............#....a....#',
  '#..C..1............#.........#',
  '#.....#............#.........#',
  '###X###............#####2#####',
  '#T...T#.....C......#T...F...T#',
  '#W....#............#........W#',
  '#..................#.........#',
  '#D....#.....P......#.........#',
  '#.....#............#.........#',
  '#.....#.....................D#',
  '#######............#.........#',
  '#T...T#............#.........#',
  '#...D.#............#.........#',
  '#.....#............#....C....#',
  '#..................#....######',
  '#.....#............#....#...S#',
  '#..C..#............#.........#',
  '#T...T#............#T...#...T#',
  '##############################',
];
const MAP_B1 = [
  '##############################',
  '#T.....T#T..#E#......T#T....T#',
  '#.......#...#M#.......#..D...#',
  '#..D....#...#.#.......#......#',
  '#.......#...Q1Q.......#......#',
  '#.......#.............#......#',
  '#T..a..T#.............#T....T#',
  '####2####.............###.####',
  '#T.....T#.............#T....T#',
  '#.......#......P......#......#',
  '#.....................#..N...#',
  '#..D....#.............#......#',
  '#.......#....................#',
  '#T.....T#.............#......#',
  '####.####.............#..D...#',
  '#T.....T#.............#......#',
  '#.......#.............#T....T#',
  '#..X....#.............###.####',
  '#.....................#T....T#',
  '#.......#.............#..C...#',
  '#T.....T#......C......#......#',
  '##############################',
];
const MAP_B2 = [
  '###############A##############',
  '#T.....T#T...........T#T....T#',
  '#.......#.............#..D...#',
  '#..D....#......F.............#',
  '#.......#.............#......#',
  '#T.....T#.............#......#',
  '####.####.............#T....T#',
  '#T.....T#.............########',
  '#.......#.............#T....T#',
  '#.......#.............#......#',
  '#..D.......F...P...F..#......#',
  '#.......#.............1......#',
  '#W......#.............#......#',
  '#T.....T#.............#......#',
  '####.####.............#..D...#',
  '#T.....T#.............#......#',
  '#.......#.............#......#',
  '#......S#......F......#....E.#',
  '#.......#.............#......#',
  '#..C....#.............#......#',
  '#T.....T#.............#T....T#',
  '##############################',
];
const MAP_B3 = [
  '##############################~~~~~~~~~~~~~~',
  '#T.....T#T...........T#T....T#~~~~~~~~~~~~~~',
  '#..D....#.............#..D...#~~~~~~~~~~~~~~',
  '#.......#.............#......#~~~~~~~~~~~~~~',
  '#.......#.............#......#~~~~~~~~~~~~~~',
  '#T.....T#.............#T....T#~~~~~~~~~~~~~~',
  '####.####.............####.###~~~~~~~~~~~~~~',
  '#T.....T#.............#T....T#~~~~~~~~~~~~~~',
  '#.......#.............#......#~~~~~~~~~~~~~~',
  '#..D....#.............#......#~~~~~~~~~~~~~~',
  '#.......#......P......#..D...#~~~~~~~~~~~~~~',
  '#............................#~~~~~~~~~~U~~~',
  '#W......#.............#......#~~~~~~~~~~~~~~',
  '#T.....T#.............#......#~~~~~~~~~~~~~~',
  '####.####.............####.###~~~~~~~~~~~~~~',
  '#T.....T#.............#T....T#~~~~~~~~~~~~~~',
  '#.......#.............#......#~~~~~~~~~~~~~~',
  '#..D....#.............#..C...#~~~~~~~~~~~~~~',
  '#.......#.............#......#~~~~~~~~~~~~~~',
  '#.......#......C......#......#~~~~~~~~~~~~~~',
  '#T.....T#.......!.....#T....T#~~~~~~~~~~~~~~',
  '###############K##############~~~~~~~~~~~~~~',
];
// 서랍 속 아이템 ("x,y" → 대사 배열 또는 { item, lines })
const FLOORS = {
  1: {
    name: '1층',
    map: MAP_F1,
    items: {
      '9,1': { item: 'cup', lines: ['서랍 안에 낡은 물컵이 있다.', '물컵을 손에 넣었다!'] },
      '15,1': ['먼지 쌓인 서랍. 아무것도 없다.'],
      '1,10': ['서랍 속에 초 조각이 굴러다닌다. 쓸모는 없어 보인다.'],
      '28,12': ["구겨진 영수증: '구독 1개월 — 결제 완료'"],
      '4,15': ['녹슨 열쇠고리. 열쇠는 달려 있지 않다.'],
    },
  },
  2: {
    name: '지하 1층',
    map: MAP_B1,
    items: {
      '3,3': ['빈 서랍. 누가 먼저 뒤진 것 같다.'],
      '25,2': ['찢어진 사진 반쪽. 하얀 무언가가 웃고 있다.'],
      '3,11': ["서랍 바닥에 긁힌 글씨: '위층은 잊어'"],
      '25,14': ['초록색 잎 하나가 들어 있다. 대파 잎 같다.'],
    },
  },
  3: {
    name: '지하 2층',
    map: MAP_B2,
    items: {
      '3,3': { item: 'cup', lines: ['서랍 안에 이가 빠진 물컵이 있다.', '물컵을 손에 넣었다!'] },
      '25,2': ['깃털 몇 개. 하얗고 작다.'],
      '3,10': ["빛바랜 쪽지: '불은 그림이 시키는 대로'"],
      '25,14': ['서랍이 텅 비었다.'],
    },
  },
  4: {
    name: '지하 3층',
    map: MAP_B3,
    items: {
      '3,2': ["빛바랜 쪽지: '내려갈수록 가까워진다'"],
      '25,2': ["작은 나무 조각. '좋아요' 모양이다."],
      '3,9': ['먼지 속에 발자국 스티커. 노미요 방에 있던 것과 똑같다.'],
      '25,10': ['찢어진 달력. 1월 5일에 동그라미가 쳐져 있다.'],
      '3,17': ['빈 서랍.'],
    },
  },
};
const FLOOR_COUNT = 4;
const START_FLOOR_FOR_DAY = { 1: 1, 3: 2, 4: 3, 5: 4, 6: 1 };
const PASSWORD = '150105';
const ITEM_NAMES = { cup: '물컵', cupWater: '물이 가득 담긴 물컵', doll: '노미요 인형', ampoule: '휴대용 v3 앰플', pickaxe: '곡괭이', a: '청동 열쇠', b: '은 열쇠' };
const CANCEL = '취소';
const PICKER_COLS = 8; // 아이템 선택창 한 줄의 칸 수
const PICKER_CELL = 56;
const PICKER_GAP = 8;
// 한 칸씩 정확히 움직이도록: 키를 짧게 누르면(HOLD_MS 안에 떼면) 한 칸만, 계속 누르고 있으면 이어서 걷는다
const HOLD_MS = 280;
// 지하 2층 화로 순서: 그림의 X자 네 구역에 적힌 숫자 순서 (남 1 · 북 2 · 서 3 · 동 4)
const BRAZIER_ORDER = ['S', 'N', 'W', 'E'];
const PAINTING_LINES = ['벽에 걸린 낡은 그림. X자로 네 구역이 나뉘어 있고 구역마다 숫자가 적혀 있다.', '북쪽 구역에 2, 동쪽 구역에 4, 남쪽 구역에 1, 서쪽 구역에 3.'];
const CREDITS_SECONDS = 11;
const CREDIT_LINES = ['미스터리 고성탈출', '', '— 탈출 성공 —', '', '암호의 성 · 완공 2015. 01. 05', '', '플레이  노미요', '시청  파닥이들', '', 'THE END'];
// 노미요의 방송 마무리 멘트 (일차별, 문서 그대로)
const DAY_CLOSING = {
  1: ['여러분들 이렇게 고성탈출 1층을 클리어했구요. 오늘 방송은 여기까지하고 내일은 휴방이예요. 내일 푹 쉬고 내일모래 봐요.'],
  3: ['이게 뭘까요? 무슨 힌트지?', '일단 지하 1층도 클리어 했으니까. 오늘 방송은 여기까지 할게요!'],
  4: ['여러분 오늘 지하 2층을 클리어 했어요. 내일은 진짜 마지막 층이예요. 오늘 방송은 여기까지 할게요.'],
  5: ['고성 탈출, 클리어! 미요미요~', '오늘 방송은 여기까지 할게요!'],
};
// 엔딩 자동 진행(데모)에서 노미요가 1층 홀을 돌아다니는 경로: 방향 토큰 또는 멈춤(초). 끝나면 처음부터 반복
const DEMO_ROUTE = ['up', 'up', 'left', 'left', 'left', 0.9, 'down', 'down', 'down', 1.2, 'right', 'right', 'right', 'right', 'up', 'up', 1.0, 'left', 'left', 'down', 'down', 'down', 1.4, 'right', 'right', 'right', 0.8, 'up', 'up', 'up', 'left', 'left', 1.1];

function hash(x, y) {
  let h = (x * 374761393 + y * 668265263) | 0;
  h = ((h ^ (h >>> 13)) * 1274126177) | 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

const GLITCH_CHARS = '▒▓░#%&';
function glitch(text, amount) {
  if (amount <= 0) return text;
  let out = '';
  for (const ch of text) out += ch !== ' ' && Math.random() < amount ? GLITCH_CHARS[Math.floor(Math.random() * GLITCH_CHARS.length)] : ch;
  return out;
}

export function createCastleGame({ canvas, onEvent = () => {}, dial = null }) {
  const ctx = canvas.getContext('2d');
  canvas.width = CANVAS_W;
  canvas.height = CANVAS_H;
  ctx.imageSmoothingEnabled = false;
  const dark = document.createElement('canvas');
  dark.width = CANVAS_W;
  dark.height = CANVAS_H;
  const dctx = dark.getContext('2d');

  let W = 30;
  let H = 22;
  let tiles = [];
  let npcs = [];
  let player = null;
  let keys = new Set(); // 눌린 키
  let inventory = new Set();
  let tier = 0;
  let day = 1;
  let flags = {}; // main.js 의 게임 상태 플래그 (hasDoll, hasAmpoule, ghostMet, noteFound)
  let time = 0;
  let state = 'idle'; // idle | play | dialog | choice | credits | closing | won | over
  let dialog = null; // { speaker, lines, index, shown, glitchAmount, onDone, auto, autoT, red }
  let choice = null; // { speaker, question, options, cursor, onPick, cancelable, rects }
  let picker = null; // 아이템 선택창 { items, cursor, onPick, rects } (state 'items')
  let credits = null; // { t }
  let toast = null; // { text, timer }
  let active = false;
  let flicker = [];
  let revealedX = false;
  let elapsed = 0;
  let presence = 0; // 파닥이 실루엣이 보이는 정도 (0 안 보임 ~ 1)
  let save = null; // 같은 날 이어하기용 저장 { day, ...snapshot }
  let monsterEnabled = false;
  let monsters = []; // 배드엔딩 인게임 장면용 [{ x, y, px, py, ... }]
  let monsterCount = 1;
  let scripted = false; // 세이브를 남기지 않는 특수 세션 (엔딩 등)
  let hidden = null; // 옷장에 숨은 상태 { wx, wy }
  let staticFx = 0; // 치지직 화면 효과 남은 시간
  let scareFx = 0; // 괴물 등장 연출 남은 시간
  let stepsTaken = 0;
  let floor = 1;
  let openedDrawers = new Set(); // 이 층에서 연 서랍 "x,y"
  let fl = {}; // 층별 이벤트 진행 { order: [], keyAt, ghostSeen, introDone, drawersEvent, followAsked, voidOpen }
  let ghost = null; // 파닥이 유령 { x, y, px, py, vis, bob, path: [{x,y}], speed, fade }
  let demo = null; // 엔딩 자동 진행: { i, wait }
  let frozen = false;

  const floorDef = () => FLOORS[floor];

  /** 현재 층의 타일·NPC·플레이어를 지도에서 새로 만든다 */
  function buildFloor() {
    const def = floorDef();
    tiles = def.map.map((row) => row.split(''));
    W = tiles[0].length;
    H = tiles.length;
    npcs = [];
    revealedX = false;
    openedDrawers = new Set();
    monsters = [];
    hidden = null;
    ghost = null;
    fl = { order: [], keyAt: null, ghostSeen: false, introDone: false, drawersEvent: false, followAsked: false, voidOpen: false };
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const c = tiles[y][x];
        if (c === 'P') {
          player = { x, y, px: x, py: y, dir: 'down', moving: false, prog: 0, fromX: x, fromY: y, step: 0 };
          tiles[y][x] = '.';
        } else if (c === 'C') {
          npcs.push({ x, y, key: `${x},${y}`, alive: true, fade: 1, talked: false, bob: Math.random() * 6, vis: 0, showing: false, glimpseT: 2 + Math.random() * 5, showT: 0 });
          tiles[y][x] = '.';
        }
      }
    }
    // 6일차: 문이 모두 열려 있고 화로도 꺼져 있다
    if (day === 6) {
      revealedX = true;
      for (let y = 0; y < H; y++)
        for (let x = 0; x < W; x++) {
          const c = tiles[y][x];
          if (c === '1' || c === '2' || c === 'K' || c === 'a' || c === 'b' || c === 'M') tiles[y][x] = '.'; // 3일차 쪽지(M)도 이미 읽었다
          else if (c === 'F') tiles[y][x] = floor === 1 ? 'G' : 'f';
        }
    }
    flicker = Array.from({ length: 64 }, () => Math.random() * 10);
  }
  /** 계단으로 아래층: 열쇠는 두고, 물컵은 가지고 내려간다 */
  function nextFloor() {
    floor++;
    inventory.delete('a');
    inventory.delete('b');
    buildFloor();
    stepsTaken = 0;
    state = 'play';
    toast = { text: `계단을 내려왔다. ${floorDef().name}.`, timer: 3 };
    onEvent('floor', { floor, name: floorDef().name });
  }

  function reset(t, startFloor = 1) {
    tier = t;
    floor = startFloor;
    inventory = new Set();
    elapsed = 0;
    toast = null;
    dialog = null;
    choice = null;
    credits = null;
    staticFx = 0;
    scareFx = 0;
    stepsTaken = 0;
    buildFloor();
    state = 'play';
  }

  // ---------- 저장 / 복원 (같은 날 이어하기) ----------
  function snapshot() {
    return {
      day,
      tiles: tiles.map((r) => r.join('')),
      x: player.x,
      y: player.y,
      dir: player.dir,
      inventory: [...inventory],
      revealedX,
      elapsed,
      floor,
      drawers: [...openedDrawers],
      fl: { ...fl, order: [...fl.order] },
    };
  }
  function restore(sv) {
    floor = sv.floor ?? 1;
    buildFloor();
    tiles = sv.tiles.map((r) => r.split(''));
    player = { x: sv.x, y: sv.y, px: sv.x, py: sv.y, dir: sv.dir, moving: false, prog: 0, fromX: sv.x, fromY: sv.y, step: 0 };
    inventory = new Set(sv.inventory);
    revealedX = sv.revealedX;
    elapsed = sv.elapsed;
    openedDrawers = new Set(sv.drawers ?? []);
    fl = { ...fl, ...(sv.fl ?? {}) };
  }

  /** opts: { day, tier, presence, flags, monster, monsterCount, fresh, skipIntro, line, at, inv, floor } */
  function start(opts = {}) {
    const o = typeof opts === 'number' ? { tier: opts } : opts;
    day = o.day ?? 1;
    flags = o.flags ?? {};
    reset(o.tier ?? 0, o.floor ?? START_FLOOR_FOR_DAY[day] ?? 1); // floor: 디버그(?gfloor=N)
    presence = o.presence ?? 0;
    monsterEnabled = !!o.monster;
    monsterCount = o.monsterCount ?? 1;
    scripted = !!o.fresh; // 엔딩 등 특수 세션: 이전 저장을 무시하고, 진행도 저장하지 않는다
    const resumed = !o.fresh && save && save.day === day;
    if (resumed) restore(save);
    if (flags.hasDoll && !inventory.has('pickaxe')) inventory.add('doll');
    if (flags.hasAmpoule) inventory.add('ampoule');
    active = true;
    keys.clear();
    if (o.at) { // 디버그(?gat=x,y[,dir]): 시작 좌표(와 바라보는 방향) 지정
      player.x = player.px = player.fromX = o.at[0];
      player.y = player.py = player.fromY = o.at[1];
      if (o.at[2] && DIRS[o.at[2]]) player.dir = o.at[2];
    }
    if (o.inv) for (const it of o.inv) inventory.add(it); // 디버그(?ginv=cup,cupWater,a,b)
    if (o.line) {
      // 엔딩 등에서 정해진 대사로 시작
      say('노미요', [o.line], { next: 'play' });
    } else if (day === 5 && !fl.introDone && !o.skipIntro) {
      fl.introDone = true;
      day5Intro();
    } else toast = { text: resumed ? '이어서 시작' : `${floorDef().name} · 방향키로 이동 · E 조사`, timer: 3.5 };
    // 6일차 지하 3층: (이어하기나 디버그로) 바로 여기서 시작해도 유령이 따라오라고 한다
    if (day === 6 && floor === FLOOR_COUNT && !fl.followAsked && !o.line) setTimeout(() => active && state === 'play' && !fl.followAsked && followEvent(), 700);
  }
  function stop() {
    // 게임 오버/엔딩 데모(또는 엔딩 실플레이)는 저장하지 않는다
    if (active && !demo && !scripted && state !== 'won' && state !== 'over') save = snapshot();
    active = false;
    state = 'idle';
    demo = null;
    frozen = false;
    scripted = false;
    keys.clear();
    if (dial?.isOpen()) dial.close();
  }

  // ---------- 엔딩 자동 진행 (진엔딩) ----------
  /** 저장을 무시하고 1층을 새로 만들어 시작. 노미요는 DEMO_ROUTE 를 따라 혼자 돌아다닌다 */
  function startDemo({ monster: withMonster = false, monsterCount: mc = 1, tier: t = 0, presence: p = 0.45 } = {}) {
    day = 1;
    flags = {};
    reset(t, 1);
    presence = p;
    monsterEnabled = withMonster;
    monsterCount = mc;
    scripted = true;
    active = true;
    frozen = false;
    keys.clear();
    demo = { i: 0, wait: 0.6 };
  }
  function demoDir(dt) {
    if (demo.wait > 0) {
      demo.wait -= dt;
      return null;
    }
    const token = DEMO_ROUTE[demo.i % DEMO_ROUTE.length];
    demo.i++;
    if (typeof token === 'number') {
      demo.wait = token;
      return null;
    }
    return token;
  }
  function monsterDistance() {
    if (!monsters.length || !player) return Infinity;
    return Math.min(...monsters.map((m) => Math.abs(m.x - player.x) + Math.abs(m.y - player.y)));
  }
  function freeze() {
    frozen = true;
  }
  /** 노미요의 마무리 대사를 자동으로 넘기며 띄우고, 끝나면 'demoend' */
  function closeDemo(lines) {
    frozen = false;
    say('노미요', lines, { next: 'closing', auto: 2.4, onDone: () => onEvent('demoend') });
  }

  // ---------- 타일 질의 ----------
  const at = (x, y) => (x < 0 || y < 0 || x >= W || y >= H ? '#' : tiles[y][x]);
  const ghostAt = (x, y) => npcs.find((n) => n.alive && n.x === x && n.y === y);
  const BLOCK = new Set(['#', 'T', 'X', 'N', 'W', '1', '2', 'D', 'S', 'F', 'f', 'G', 'Q', 'A', '!', 'K', 'U']);
  const walkable = (x, y) => !BLOCK.has(at(x, y));
  const monsterWalkable = (x, y) => !BLOCK.has(at(x, y)) && at(x, y) !== '~';

  // ---------- 입력 ----------
  const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
  const DIR_KEYS = { up: ['ArrowUp', 'KeyW'], down: ['ArrowDown', 'KeyS'], left: ['ArrowLeft', 'KeyA'], right: ['ArrowRight', 'KeyD'] };
  const keyDownAt = new Map(); // 방향키를 누른 시각 (한 칸 걷기 판정용)
  let holdSteps = 0; // 이번에 누르고 있는 동안 걸은 칸 수
  function keydown(code) {
    if (!active || demo || frozen) return;
    if (!keys.has(code) && Object.values(DIR_KEYS).some((ks) => ks.includes(code))) {
      keyDownAt.set(code, performance.now());
      holdSteps = 0;
    }
    keys.add(code);
    if (state === 'items') {
      const n = picker.items.length; // 마지막 칸(n)은 취소
      const cols = PICKER_COLS;
      if (code === 'Escape') return resolvePicker(null);
      else if (code === 'ArrowLeft' || code === 'KeyA') picker.cursor = (picker.cursor + n) % (n + 1);
      else if (code === 'ArrowRight' || code === 'KeyD') picker.cursor = (picker.cursor + 1) % (n + 1);
      else if (code === 'ArrowUp' || code === 'KeyW') picker.cursor = picker.cursor - cols >= 0 ? picker.cursor - cols : picker.cursor;
      else if (code === 'ArrowDown' || code === 'KeyS') picker.cursor = Math.min(n, picker.cursor + cols);
      else if (/^(Digit|Numpad)\d$/.test(code)) {
        const k = Number(code.slice(-1)) - 1;
        if (k >= 0 && k < n) resolvePicker(k);
      } else if (code === 'KeyE' || code === 'Enter' || code === 'Space') resolvePicker(picker.cursor >= n ? null : picker.cursor);
      return;
    }
    if (state === 'choice') {
      if (code === 'Escape' && choice.cancelable) return pickChoice(choice.options.length - 1);
      if (code === 'ArrowUp' || code === 'KeyW') choice.cursor = (choice.cursor + choice.options.length - 1) % choice.options.length;
      else if (code === 'ArrowDown' || code === 'KeyS') choice.cursor = (choice.cursor + 1) % choice.options.length;
      else if (/^(Digit|Numpad)\d$/.test(code)) {
        const n = Number(code.slice(-1)) - 1;
        if (n >= 0 && n < choice.options.length) pickChoice(n);
      } else if (code === 'KeyE' || code === 'Enter' || code === 'Space') pickChoice(choice.cursor);
      return;
    }
    if (code === 'KeyE' || code === 'Enter' || code === 'Space') {
      if (state === 'dialog') advanceDialog();
      else if (state === 'play') interact();
      else if (state === 'closing') onEvent('exit');
    }
  }
  function keyup(code) {
    keys.delete(code);
  }
  /** 마우스 클릭: 대화 넘기기 / 선택 확정 / 방송 끄기 버튼 (E 와 동일) */
  /** 마우스 클릭 (x, y 는 캔버스 좌표): 대화 넘기기 / 선택지·아이템 칸 고르기 / 방송 끄기 버튼 */
  function click(x = -1, y = -1) {
    if (!active || demo || frozen) return;
    if (state === 'dialog') advanceDialog();
    else if (state === 'choice') {
      const i = hitIndex(choice.rects, x, y);
      if (i >= 0) pickChoice(i);
    } else if (state === 'items') {
      const i = hitIndex(picker.rects, x, y);
      if (i >= 0) resolvePicker(i >= picker.items.length ? null : i);
    } else if (state === 'closing') onEvent('exit');
  }
  /** 마우스 이동: 선택지·아이템 칸 위에 오면 커서가 따라온다 */
  function hover(x, y) {
    if (!active) return;
    if (state === 'choice') {
      const i = hitIndex(choice.rects, x, y);
      if (i >= 0) choice.cursor = i;
    } else if (state === 'items') {
      const i = hitIndex(picker.rects, x, y);
      if (i >= 0) picker.cursor = i;
    }
  }
  const hitIndex = (rects, x, y) => (rects ? rects.findIndex((r) => x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h) : -1);
  function heldDir() {
    if (keys.has('ArrowUp') || keys.has('KeyW')) return 'up';
    if (keys.has('ArrowDown') || keys.has('KeyS')) return 'down';
    if (keys.has('ArrowLeft') || keys.has('KeyA')) return 'left';
    if (keys.has('ArrowRight') || keys.has('KeyD')) return 'right';
    return null;
  }

  // ---------- 대화 / 선택 ----------
  let afterDialog = 'play'; // 대화가 끝나면 돌아갈 상태
  /** red: 붉은 글씨로 겹쳐 쓰인 문장 (쪽지·표지판) */
  function say(speaker, lines, { glitchAmount = 0, onDone = null, auto = 0, next = 'play', red = null, ghost: isGhost = false } = {}) {
    afterDialog = next;
    state = 'dialog';
    dialog = { speaker, lines, index: 0, shown: 0, glitchAmount, onDone, auto, autoT: auto, cache: null, red, ghost: isGhost };
  }
  function advanceDialog() {
    if (!dialog) return;
    const full = dialog.lines[dialog.index];
    if (dialog.shown < full.length) {
      dialog.shown = full.length; // 타자 효과 건너뛰기
      return;
    }
    dialog.index++;
    dialog.shown = 0;
    dialog.cache = null;
    dialog.autoT = dialog.auto;
    if (dialog.index >= dialog.lines.length) {
      const done = dialog.onDone;
      dialog = null;
      state = afterDialog;
      if (done) done();
    }
  }
  /** 선택지: 질문 + 항목 (↑↓ 또는 숫자, E 확정). cancelable 이면 마지막 항목이 취소이고 Esc 로도 닫힌다 */
  function ask(speaker, question, options, onPick, { cancelable = false } = {}) {
    state = 'choice';
    choice = { speaker, question, options, cursor: 0, onPick, cancelable, rects: null };
  }
  /** Esc: 취소 가능한 선택창이 열려 있으면 닫고 true (main.js 가 방송 종료 대신 이걸 먼저 시도한다) */
  function cancelChoice() {
    if (state === 'items') {
      resolvePicker(null);
      return true;
    }
    if (state !== 'choice' || !choice.cancelable) return false;
    pickChoice(choice.options.length - 1);
    return true;
  }
  /**
   * 소지품 선택창: 문·세면대·화로 등에 쓸 아이템을 고른다. onPick(key | null). 소지품이 없으면 false 를 돌려주고 창을 띄우지 않는다
   */
  function pickItem(_question, onPick) {
    const items = [...inventory].filter((k) => ITEM_NAMES[k]);
    if (!items.length) return false;
    state = 'items';
    picker = { items, cursor: 0, onPick, rects: null };
    return true;
  }
  function resolvePicker(i) {
    const p = picker;
    picker = null;
    state = 'play';
    onEvent('talk');
    p.onPick(i === null ? null : p.items[i]);
  }
  function pickChoice(i) {
    const c = choice;
    choice = null;
    state = 'play';
    onEvent('talk');
    c.onPick(i);
  }

  // ---------- 파닥이 유령 ----------
  function showGhost(x, y, vis = 0.75) {
    ghost = { x, y, px: x, py: y, vis, bob: 0, path: [], speed: 5, fade: 1 };
    staticFx = Math.max(staticFx, 0.5);
    onEvent('static');
  }
  function hideGhost() {
    if (!ghost) return;
    ghost = null;
    staticFx = Math.max(staticFx, 0.6);
    onEvent('static');
  }
  function updateGhost(dt) {
    if (!ghost) return;
    ghost.bob += dt;
    if (ghost.path.length) {
      const t = ghost.path[0];
      const dx = t.x - ghost.px;
      const dy = t.y - ghost.py;
      const d = Math.hypot(dx, dy);
      const step = ghost.speed * dt;
      if (d <= step) {
        ghost.px = t.x;
        ghost.py = t.y;
        ghost.path.shift();
        if (!ghost.path.length) ghost = null; // 어둠 속으로 사라짐
      } else {
        ghost.px += (dx / d) * step;
        ghost.py += (dy / d) * step;
      }
    }
  }
  /** 노미요 옆의 빈 칸 (유령이 나타날 자리) */
  function spotNear() {
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, -1], [0, 1], [1, -1], [-1, -1]]) {
      if (walkable(player.x + dx, player.y + dy) && at(player.x + dx, player.y + dy) !== '~') return { x: player.x + dx, y: player.y + dy };
    }
    return { x: player.x, y: player.y - 1 };
  }

  // ---------- 일차별 이벤트 ----------
  /** 5일차 시작: 어제 숲에서 본 인형 이야기 → 유령이 흐리게 "트로이네" → 노미요 "???" */
  function day5Intro() {
    say('노미요', ['여러분들 제가 어제 숲에 갔다가 저랑 똑닮은 인형을 봤거든요. 보여줄까요?'], {
      onDone: () => {
        const s = spotNear();
        showGhost(s.x, s.y, 0.45);
        say('파닥이', ['트로이네. 트로이를 가져왔네.'], {
          ghost: true,
          glitchAmount: 0.04, // 흐리게
          auto: 1.6,
          onDone: () => {
            hideGhost();
            say('노미요', ['??? 일단 오늘 게임 해볼게요. 이제 마지막 층이거든요.'], { onDone: () => (toast = { text: `${floorDef().name} · 방향키로 이동 · E 조사`, timer: 3.5 }) });
          },
        });
      },
    });
  }
  /** 3일차: 석탑 문 너머 바닥의 쪽지를 밟으면 자동으로 읽는다 → 노미요 마무리 → 방송 종료 */
  function readFloorNote(x, y) {
    tiles[y][x] = '.';
    onEvent('note');
    const broken = glitch('니가 원하는 것이 있을지도', 0.85);
    say('', [`쪽지: '이곳으로 가면 ${broken} 몰라'`], {
      red: '여우야 여우야 뭐하니',
      onDone: () => say('노미요', DAY_CLOSING[3], { next: 'closing', onDone: () => onEvent('dayend') }),
    });
  }
  /** 4일차: 세면대에서 물을 뜨려 하면 파닥이 유령이 나타나고 물은 나오지 않는다 */
  function bathroomGhost() {
    fl.ghostSeen = true;
    const s = spotNear();
    showGhost(s.x, s.y, 0.7);
    say('파닥이', ['물이필요해?물이필요해?물이필요해?', '... $$$▒▓░로 가'], {
      ghost: true,
      onDone: () => {
        hideGhost();
        onEvent('ghost');
        toast = { text: '...수도꼭지에서 다시 물이 흐르기 시작했다.', timer: 3.5 };
      },
    });
  }
  /** 5일차: 지하 3층 서랍을 전부 열면 유령이 나타나 묻는다 */
  function drawersEvent() {
    fl.drawersEvent = true;
    const s = spotNear();
    showGhost(s.x, s.y, 0.85);
    say('파닥이', ['이제 시간이 없어. 이제 어쩔수 없어. 노미요가 우리를 도와 줘야해.'], {
      ghost: true,
      onDone: () =>
        say('노미요', ['???'], {
          onDone: () =>
            ask('파닥이', '우리가 누군지 알아?', ['게임 속 NPC', "'이 곳에 갇힌' 구독자", '닭을 튀기고 파를 올린 최애 음식'], (i) => {
              if (i !== 1) return ending3();
              ask('파닥이', '우리를 도와줄거야?', ['응', '싫어'], (j) => {
                if (j !== 0) return ending3();
                // 약병을 바닥에 떨어뜨리고 사라진다
                tiles[s.y][s.x] = 'v';
                hideGhost();
                toast = { text: '파닥이가 무언가를 떨어뜨리고 사라졌다.', timer: 3 };
              });
            }),
        }),
    });
  }
  /** 6일차: 지하 3층에 내려오면 유령이 따라오라고 한다 */
  function followEvent() {
    fl.followAsked = true;
    const s = spotNear();
    showGhost(s.x, s.y, 0.85);
    say('파닥이', ['도와준다고했잖아.도와준다고했잖아. 도와준다고했잖아. 도와준다고했잖아. 따라와.'], {
      ghost: true,
      onDone: () =>
        ask('', '따라가시겠습니까?', ['YES', 'NO'], (i) => {
          if (i !== 0) return ending3();
          // 고성 밖 맵 바깥 검은 공간으로: 동쪽 벽이 열리고 유령이 어둠 속으로 걸어 들어간다
          fl.voidOpen = true;
          tiles[11][29] = '~';
          staticFx = 0.8;
          onEvent('static');
          ghost.path = [{ x: ghost.px, y: 11 }, { x: 29, y: 11 }, { x: W + 1, y: 11 }];
          ghost.speed = 6;
          toast = { text: '...벽이 사라졌다. 파닥이가 어둠 속으로 들어간다.', timer: 4 };
        }),
    });
  }
  function ending3() {
    staticFx = 1.5;
    hideGhost();
    state = 'won';
    onEvent('ending3');
  }
  /** 6일차: 솥과 상호작용 → 아이템 선택 → 인형이 곡괭이로 */
  function useCauldron() {
    staticFx = 0.7;
    onEvent('static');
    say('', [`${glitch('!@##', 0.5)}을 사용할 아이템을 선택하세요`], {
      glitchAmount: 0.06,
      onDone: () => {
        const items = [...inventory].filter((k) => ITEM_NAMES[k] && k !== 'a' && k !== 'b');
        if (!items.length) {
          toast = { text: '사용할 아이템이 없다.', timer: 2.5 };
          return;
        }
        ask('', '아이템을 선택하세요', items.map((k) => ITEM_NAMES[k]), (i) => {
          const k = items[i];
          if (k !== 'doll') return say('', ['...아무 일도 일어나지 않았다.']);
          inventory.delete('doll');
          inventory.add('pickaxe');
          staticFx = 1.0;
          onEvent('static');
          say('', ['솥이 부글거리더니 인형이... 곡괭이로 변했다!'], {
            onDone: () => say('노미요', ['어? 곡괭이가 생겼네요?'], { onDone: askQuit }),
          });
        });
      },
    });
  }
  function askQuit() {
    ask('', '게임을 종료할까요?', ['YES', 'NO'], (i) => {
      if (i === 0) {
        onEvent('pickaxe');
        onEvent('exit');
      }
    });
  }
  /** 5일차: 정답을 넣으면 인게임 엔딩 크레딧이 올라간다 */
  function startCredits() {
    state = 'credits';
    credits = { t: 0 };
    onEvent('cleared');
  }
  function dayClosing(d) {
    say('노미요', DAY_CLOSING[d] ?? ['오늘 방송은 여기까지 할게요!'], { next: 'closing', onDone: () => onEvent('dayend') });
  }

  // ---------- 상호작용 ----------
  function interact() {
    if (hidden) return leaveWardrobe();
    const [dx, dy] = DIRS[player.dir];
    const tx = player.x + dx;
    const ty = player.y + dy;
    const g = ghostAt(tx, ty);
    if (g && presence > 0 && at(tx, ty) === '.') {
      // 희미한 파닥이 실루엣: 잠깐 모습을 드러내고 사라짐
      g.showing = true;
      g.showT = 0.6;
      toast = { text: presence >= 0.6 ? '...누군가 서 있다. 말이 닿지 않는다.' : '...거기 누가 있는 것 같다.', timer: 2.5 };
      return;
    }
    const c = at(tx, ty);
    if (c === '1' || c === '2') {
      const need = c === '1' ? 'a' : 'b';
      const locked = () => say('', [`잠겨 있다. ${ITEM_NAMES[need]}가 필요해 보인다.`]);
      if (!pickItem('문에 사용할 아이템을 고르세요', (k) => {
        if (!k) return;
        if (k !== need) return say('', [`${ITEM_NAMES[k]}(은)는 맞지 않는다.`], { onDone: locked });
        inventory.delete(need);
        tiles[ty][tx] = '.';
        toast = { text: `${ITEM_NAMES[need]}로 문을 열었다.`, timer: 2.5 };
        onEvent('door');
      })) locked();
      return;
    }
    if (c === 'X') {
      if (!revealedX) {
        revealedX = true;
        inventory.add('b');
        say('', ['벽이 갈라져 있다... 틈새에 뭔가 끼워져 있다.', '은 열쇠를 손에 넣었다!'], { glitchAmount: tier === 2 ? 0.08 : 0 });
        onEvent('key');
      } else say('', ['갈라진 벽. 이제 아무것도 없다.']);
      return;
    }
    if (c === 'N') {
      say('', ["쪽지: '내보내줘. 내보내줘. 나가는 길을 모르겠어.'"], { glitchAmount: tier === 2 ? 0.06 : 0, onDone: () => say('노미요', ['고성에서 탈출하지 못한 사람이 남긴 쪽지인가 봐요.']) });
      return;
    }
    if (c === 'Q') return say('', ['돌로 쌓은 탑. 포도송이가 음각되어 있다.']);
    if (c === 'A') return say('', PAINTING_LINES);
    if (c === '!') return readSign();
    if (c === 'K') return useDialDoor();
    if (c === 'U') return useCauldron();
    if (c === 'W') return enterWardrobe(tx, ty);
    if (c === 'T') return say('', ['횃불이 타오르고 있다. 따뜻하다.']);
    if (c === 'D') return openDrawer(tx, ty);
    if (c === 'S') return useSink();
    if (c === 'F') return touchBrazier(tx, ty);
    if (c === 'f') return coldBrazier(tx, ty);
    if (c === 'G') return say('', ['식은 화로. 이제 문을 막지 않는다.']);
  }

  // ---------- 서랍 / 물 / 화로 ----------
  const hasCup = () => inventory.has('cup') || inventory.has('cupWater');
  function openDrawer(tx, ty) {
    const key = `${tx},${ty}`;
    if (openedDrawers.has(key)) return say('', ['빈 서랍이다.']);
    openedDrawers.add(key);
    onEvent('drawer');
    const it = floorDef().items[key];
    // 5일차 지하 3층: 서랍을 전부 열면 유령 이벤트
    const after = () => {
      if (floor === 4 && day === 5 && !fl.drawersEvent && allDrawersOpened()) drawersEvent();
    };
    if (!it) return say('', ['빈 서랍이다.'], { onDone: after });
    if (Array.isArray(it)) return say('', it, { glitchAmount: tier === 2 ? 0.1 : 0, onDone: after });
    if (it.item === 'cup') {
      if (hasCup()) return say('', ['물컵이 하나 더 있다. 하나면 충분하다.'], { onDone: after });
      inventory.add('cup');
      onEvent('key');
    }
    say('', it.lines, { onDone: after });
  }
  function allDrawersOpened() {
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (tiles[y][x] === 'D' && !openedDrawers.has(`${x},${y}`)) return false;
    return true;
  }
  function useSink() {
    // 지하 2층 화장실: 처음엔 물이 나오지 않고 파닥이 유령을 만난다. 유령이 말을 한 뒤에는 다시 물이 나온다
    if (floor === 3 && !fl.ghostSeen) return bathroomGhost();
    const nothing = () => say('', ['세면대. 수도꼭지에서 물이 졸졸 흐른다.', '담을 게 없다.']);
    if (!pickItem('세면대에 사용할 아이템을 고르세요', (k) => {
      if (!k) return;
      if (k === 'cupWater') return say('', ['물컵은 이미 가득 차 있다.']);
      if (k !== 'cup') return say('', [`${ITEM_NAMES[k]}(으)로는 물을 담을 수 없다.`]);
      inventory.delete('cup');
      inventory.add('cupWater');
      onEvent('fill');
      say('', ['수도꼭지를 틀어 물컵에 물을 받았다.', '물이 가득 담긴 물컵을 획득했다.']);
    })) nothing();
  }
  // 지하 2층 화로: 지도 가운데(15,10)를 기준으로 동서남북
  function brazierSide(x, y) {
    if (y < 10) return 'N';
    if (y > 10) return 'S';
    return x < 15 ? 'W' : 'E';
  }
  function touchBrazier(tx, ty) {
    if (!inventory.has('cupWater')) return say('', ['화로가 너무 뜨거워서 손댈 수 없다. 방법을 찾아보자.']);
    pickItem('화로에 사용할 아이템을 고르세요', (k) => {
      if (!k) return;
      if (k !== 'cupWater') return say('', [`${ITEM_NAMES[k]}(으)로는 불을 끌 수 없다.`]);
      extinguish(tx, ty);
    });
  }
  function extinguish(tx, ty) {
    inventory.delete('cupWater');
    inventory.add('cup');
    tiles[ty][tx] = 'f';
    onEvent('extinguish');
    if (floor !== 3) return say('', ['물을 끼얹었다. 치이익—', '불이 꺼졌다. 이제 만질 수 있을 것 같다.']);
    // 순서 퍼즐
    const side = brazierSide(tx, ty);
    if (BRAZIER_ORDER[fl.order.length] !== side) {
      fl.order = [];
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (tiles[y][x] === 'f') tiles[y][x] = 'F';
      return say('', ['물을 끼얹었다. 치이익—', '...순서가 틀렸다! 꺼졌던 화로들이 다시 확 타오른다.']);
    }
    fl.order.push(side);
    if (fl.order.length >= BRAZIER_ORDER.length) {
      fl.keyAt = `${tx},${ty}`;
      return say('', ['물을 끼얹었다. 치이익—', '마지막 불이 꺼졌다. ...꺼진 화로 바닥에서 뭔가 반짝인다.']);
    }
    say('', ['물을 끼얹었다. 치이익—', `불이 꺼졌다. (${fl.order.length}/${BRAZIER_ORDER.length})`]);
  }
  function coldBrazier(tx, ty) {
    if (floor === 1) return pushBrazier(tx, ty);
    if (fl.keyAt === `${tx},${ty}`) {
      fl.keyAt = null;
      inventory.add('a');
      onEvent('key');
      return say('', ['꺼진 화로 안에서 청동 열쇠를 찾았다!']);
    }
    say('', ['식은 화로.']);
  }
  function pushBrazier(tx, ty) {
    const side = at(tx + 1, ty) === '.' ? tx + 1 : at(tx - 1, ty) === '.' ? tx - 1 : null;
    if (side === null) return say('', ['밀 자리가 없다.']);
    tiles[ty][tx] = '.';
    tiles[ty][side] = 'G';
    onEvent('door');
    say('', ['식은 화로를 옆으로 밀었다.', '문이 드러났다.']);
  }
  // ---------- 지하 3층: 표지판 / 다이얼 문 ----------
  function readSign() {
    const red = inventory.has('ampoule') ? '노미요 채널이 만들어진 날짜는?' : null;
    say('', ['표지판: 암호의 성이 완공된 날짜는?'], { red });
  }
  function useDialDoor() {
    if (!dial) return say('', ['6자리 숫자 다이얼이 달린 문. 굳게 잠겨 있다.']);
    toast = null;
    dial.show({
      title: '6자리 숫자 다이얼',
      onSubmit: (code) => {
        if (code !== PASSWORD) {
          toast = { text: '...다이얼이 헛돈다. 맞지 않는 번호다.', timer: 3 };
          return;
        }
        for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (tiles[y][x] === 'K') tiles[y][x] = '.';
        onEvent('door');
        toast = { text: '철컥. 문이 열렸다.', timer: 2.5 };
        setTimeout(() => active && startCredits(), 900);
      },
    });
  }

  // ---------- 옷장 (배드엔딩 인게임 장면용) ----------
  function enterWardrobe(wx, wy) {
    hidden = { wx, wy };
    for (const m of monsters) {
      m.mode = 'search';
      m.target = { x: player.x, y: player.y };
    }
    toast = { text: monsters.length ? '옷장 안에 숨었다. 괴물이 멀어지면 E 로 나온다.' : '옷장 안에 숨었다. E 로 나온다.', timer: 3 };
    onEvent('hide');
  }
  function leaveWardrobe() {
    const far = monsters.every((m) => Math.abs(m.x - player.x) + Math.abs(m.y - player.y) >= 7);
    if (!far) {
      toast = { text: '...아직 근처에 있다. 숨을 죽이자.', timer: 2 };
      return;
    }
    hidden = null;
    for (const m of monsters) {
      m.mode = 'wander';
      m.alert = 6;
    }
    toast = { text: '옷장에서 나왔다.', timer: 2 };
  }

  // ---------- 괴물 (배드엔딩 인게임 장면용) ----------
  function bfsNext(from, to) {
    if (from.x === to.x && from.y === to.y) return null;
    const key = (x, y) => y * W + x;
    const prev = new Map();
    const q = [[from.x, from.y]];
    prev.set(key(from.x, from.y), null);
    let found = false;
    while (q.length) {
      const [x, y] = q.shift();
      if (x === to.x && y === to.y) {
        found = true;
        break;
      }
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx;
        const ny = y + dy;
        if (!monsterWalkable(nx, ny) || prev.has(key(nx, ny))) continue;
        prev.set(key(nx, ny), key(x, y));
        q.push([nx, ny]);
      }
    }
    if (!found) return null;
    let cur = key(to.x, to.y);
    let parent = prev.get(cur);
    while (parent !== null && parent !== key(from.x, from.y)) {
      cur = parent;
      parent = prev.get(cur);
    }
    return { x: cur % W, y: Math.floor(cur / W) };
  }
  const MONSTER_SPOTS = [
    [12, 10],
    [12, 16],
    [24, 12],
    [9, 4],
    [3, 10],
  ];
  function makeMonster(x, y) {
    return { x, y, px: x, py: y, fromX: x, fromY: y, prog: 0, moving: false, mode: 'chase', alert: 0, target: null, stepTime: 0.34 };
  }
  /** count=1: 플레이어에게서 6칸 이상 떨어진 곳 중 가장 가까운 한 자리. count>1: 층 곳곳에 미리 퍼져서 나타난다 (배드엔딩) */
  function spawnMonsters(count = 1) {
    if (count <= 1) {
      let best = null;
      for (const [x, y] of MONSTER_SPOTS) {
        const d = Math.abs(x - player.x) + Math.abs(y - player.y);
        if (monsterWalkable(x, y) && d >= 6 && (!best || d < best.d)) best = { x, y, d };
      }
      if (!best) best = { x: 12, y: 10 };
      monsters.push(makeMonster(best.x, best.y));
    } else {
      const spots = MONSTER_SPOTS.filter(([x, y]) => monsterWalkable(x, y) && Math.abs(x - player.x) + Math.abs(y - player.y) >= 4).slice(0, count);
      if (!spots.length) spots.push([12, 10]);
      for (const [x, y] of spots) monsters.push(makeMonster(x, y));
    }
    scareFx = 1.0;
    onEvent('monster');
  }
  function updateMonsterOne(m, dt) {
    if (m.alert > 0) {
      m.alert -= dt;
      if (m.alert <= 0 && !hidden) m.mode = 'chase';
    }
    if (m.moving) {
      m.prog += dt / m.stepTime;
      if (m.prog >= 1) {
        m.moving = false;
        m.px = m.x;
        m.py = m.y;
        if (!hidden && m.x === player.x && m.y === player.y) return caught();
      } else {
        m.px = m.fromX + (m.x - m.fromX) * m.prog;
        m.py = m.fromY + (m.y - m.fromY) * m.prog;
      }
      return;
    }
    let goal = null;
    if (m.mode === 'chase') goal = { x: player.x, y: player.y };
    else if (m.mode === 'search') {
      goal = m.target;
      if (goal && m.x === goal.x && m.y === goal.y) {
        m.mode = 'wander';
        goal = null;
      }
    }
    if (m.mode === 'wander') {
      if (!m.target || (m.x === m.target.x && m.y === m.target.y) || Math.random() < 0.02) {
        for (let i = 0; i < 12; i++) {
          const x = m.x + Math.floor(Math.random() * 13) - 6;
          const y = m.y + Math.floor(Math.random() * 13) - 6;
          if (monsterWalkable(x, y)) {
            m.target = { x, y };
            break;
          }
        }
      }
      goal = m.target;
      if (!hidden && m.alert <= 0 && Math.abs(m.x - player.x) + Math.abs(m.y - player.y) <= 4) m.mode = 'chase';
    }
    if (!goal) return;
    const next = bfsNext(m, goal);
    if (!next) return;
    m.fromX = m.x;
    m.fromY = m.y;
    m.x = next.x;
    m.y = next.y;
    m.moving = true;
    m.prog = 0;
  }
  function caught() {
    if (state === 'over') return;
    state = 'over';
    staticFx = 1.2;
    onEvent('caught');
    say('', ['...잡혔다.'], {
      next: 'over',
      auto: 1.6,
      onDone: () => onEvent('gameover'),
    });
  }

  // ---------- 진행 ----------
  function update(dt) {
    if (!active) return;
    time += dt;
    if (state === 'play') elapsed += dt;
    if (toast) {
      toast.timer -= dt;
      if (toast.timer <= 0) toast = null;
    }
    if (staticFx > 0) staticFx -= dt;
    if (scareFx > 0) scareFx -= dt;
    if (frozen) return;
    if (credits) {
      credits.t += dt;
      if (credits.t >= CREDITS_SECONDS) {
        credits = null;
        dayClosing(5);
      }
      return;
    }
    if (dialog) {
      const full = dialog.lines[dialog.index];
      if (dialog.shown < full.length) dialog.shown = Math.min(full.length, dialog.shown + dt * 28);
      else if (dialog.auto > 0) {
        dialog.autoT -= dt;
        if (dialog.autoT <= 0) advanceDialog();
      }
    }
    updateGhost(dt);
    for (const n of npcs) {
      n.bob += dt;
      // 얼핏얼핏 보이기: presence 가 1 미만이면 가끔 짧게 나타났다 사라진다
      if (presence >= 1) n.vis = 1;
      else if (presence <= 0) n.vis = 0;
      else {
        if (n.showing) {
          n.showT -= dt;
          if (n.showT <= 0) {
            n.showing = false;
            n.glimpseT = (3 + Math.random() * 7) * (1.3 - presence);
          }
        } else {
          n.glimpseT -= dt;
          if (n.glimpseT <= 0) {
            n.showing = true;
            n.showT = 0.12 + Math.random() * 0.4 + presence * 0.8;
          }
        }
        const flick = Math.random() < 0.25 ? 0.4 : 1;
        n.vis = n.showing ? presence * flick : 0;
      }
    }
    if (state === 'play' || state === 'dialog') for (const m of monsters) updateMonsterOne(m, dt);

    if (state !== 'play') return;
    if (dial?.isOpen()) return;
    const running = keys.has('ShiftLeft') || keys.has('ShiftRight');
    const stepTime = running ? 0.11 : 0.17;
    if (player.moving) {
      player.prog += dt / stepTime;
      if (player.prog >= 1) {
        player.moving = false;
        player.px = player.x;
        player.py = player.y;
        onArrive();
      } else {
        player.px = player.fromX + (player.x - player.fromX) * player.prog;
        player.py = player.fromY + (player.y - player.fromY) * player.prog;
      }
    }
    if (!player.moving && state === 'play' && !hidden) {
      const d = demo ? demoDir(dt) : heldDir();
      // 첫 칸은 바로, 그다음 칸부터는 HOLD_MS 이상 계속 누르고 있을 때만 (짧게 누르면 정확히 한 칸)
      const pressedAt = d && !demo ? Math.max(...DIR_KEYS[d].filter((k) => keys.has(k)).map((k) => keyDownAt.get(k) ?? 0)) : 0;
      const canStep = !d || demo || holdSteps === 0 || performance.now() - pressedAt >= HOLD_MS;
      if (d && canStep) {
        player.dir = d;
        const [dx, dy] = DIRS[d];
        if (walkable(player.x + dx, player.y + dy)) {
          holdSteps++;
          player.fromX = player.x;
          player.fromY = player.y;
          player.x += dx;
          player.y += dy;
          player.moving = true;
          player.prog = 0;
          player.step++;
        }
      }
    }
  }

  function onArrive() {
    stepsTaken++;
    if (monsterEnabled && !monsters.length && stepsTaken >= (demo ? 6 : 1)) spawnMonsters(monsterCount);
    if (monsters.some((m) => m.x === player.x && m.y === player.y)) return caught();
    const c = at(player.x, player.y);
    if (c === 'a' || c === 'b') {
      inventory.add(c);
      tiles[player.y][player.x] = '.';
      toast = { text: `${c === 'a' ? '청동 열쇠' : '은 열쇠'}를 주웠다!`, timer: 2.5 };
      onEvent('key');
    } else if (c === 'v') {
      inventory.add('ampoule');
      tiles[player.y][player.x] = '.';
      toast = { text: "'휴대용 v3 앰플'을 손에 넣었다.", timer: 3 };
      onEvent('key');
      onEvent('ampoule');
    } else if (c === 'M') {
      return readFloorNote(player.x, player.y);
    } else if (c === 'E') {
      if (demo) return;
      if (day === 1) {
        // 1일차: 지하 1층으로 내려가면서 방송을 마무리한다
        nextFloor();
        return dayClosing(1);
      }
      if (day === 4) return dayClosing(4); // 4일차: 지하 2층 클리어
      if (floor < FLOOR_COUNT) {
        nextFloor();
        if (day === 6 && floor === FLOOR_COUNT && !fl.followAsked) setTimeout(() => active && state === 'play' && followEvent(), 700);
      }
      return;
    }
  }

  // ---------- 그리기 ----------
  function drawFloor(sx, sy, x, y) {
    const v = hash(x, y);
    const g = 38 + Math.floor(v * 10);
    ctx.fillStyle = `rgb(${g},${g - 2},${g + 6})`;
    ctx.fillRect(sx, sy, TILE, TILE);
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(sx, sy, TILE, 1);
    ctx.fillRect(sx, sy, 1, TILE);
    if (v > 0.8) {
      ctx.fillStyle = 'rgba(0,0,0,0.18)';
      ctx.fillRect(sx + 8 + v * 10, sy + 10 + v * 8, 6, 3);
    }
  }
  function drawWall(sx, sy, x, y) {
    ctx.fillStyle = '#1b1a26';
    ctx.fillRect(sx, sy, TILE, TILE);
    const v = hash(x, y);
    for (let r = 0; r < 4; r++) {
      const off = r % 2 ? 8 : 0;
      for (let c = -1; c < 3; c++) {
        const bx = sx + c * 16 + off;
        const by = sy + r * 8;
        const s = 46 + Math.floor(hash(x * 7 + c, y * 5 + r) * 10);
        ctx.fillStyle = `rgb(${s},${s - 4},${s + 8})`;
        ctx.fillRect(Math.max(bx + 1, sx), by + 1, Math.min(14, bx + 15 - Math.max(bx + 1, sx)), 6);
      }
    }
    if (at(x, y + 1) !== '#') {
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fillRect(sx, sy + TILE - 3, TILE, 3);
    }
    if (v > 0.9) {
      ctx.fillStyle = 'rgba(90,120,80,0.35)'; // 이끼
      ctx.fillRect(sx + 4, sy + 20, 8, 4);
    }
  }
  function drawDoor(sx, sy, n) {
    drawFloor(sx, sy, 0, 0);
    ctx.fillStyle = '#5a3a22';
    ctx.fillRect(sx + 4, sy + 2, TILE - 8, TILE - 4);
    ctx.fillStyle = '#7a4f2e';
    ctx.fillRect(sx + 7, sy + 5, TILE - 14, TILE - 10);
    ctx.fillStyle = '#2a1a10';
    ctx.fillRect(sx + 15, sy + 5, 2, TILE - 10);
    if (n === 'K') {
      // 6자리 다이얼 판
      ctx.fillStyle = '#3a3a44';
      ctx.fillRect(sx + 6, sy + 12, 20, 8);
      ctx.fillStyle = '#c9d6ff';
      for (let i = 0; i < 6; i++) ctx.fillRect(sx + 7 + i * 3, sy + 14, 2, 4);
    } else {
      ctx.fillStyle = n === '1' ? '#c98a3a' : '#cfd4dc';
      ctx.fillRect(sx + 12, sy + 13, 8, 7);
      ctx.fillStyle = '#1a1a1a';
      ctx.fillRect(sx + 15, sy + 15, 2, 3);
    }
  }
  function drawWardrobe(sx, sy, open) {
    drawFloor(sx, sy, 0, 0);
    ctx.fillStyle = '#3b2617';
    ctx.fillRect(sx + 3, sy - 6, TILE - 6, TILE + 4);
    ctx.fillStyle = open ? '#1a1008' : '#5a3a22';
    ctx.fillRect(sx + 6, sy - 3, 9, TILE - 4);
    ctx.fillRect(sx + 17, sy - 3, 9, TILE - 4);
    ctx.fillStyle = '#c9a35a';
    ctx.fillRect(sx + 13, sy + 12, 2, 3);
    ctx.fillRect(sx + 17, sy + 12, 2, 3);
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(sx + 3, sy + TILE - 3, TILE - 6, 3);
  }
  function drawKey(sx, sy, kind, bobT) {
    const y = sy + Math.sin(bobT * 3) * 2;
    ctx.fillStyle = kind === 'a' ? '#d9964a' : '#dfe4ec';
    ctx.beginPath();
    ctx.arc(sx + 12, y + 14, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#26202a';
    ctx.beginPath();
    ctx.arc(sx + 12, y + 14, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = kind === 'a' ? '#d9964a' : '#dfe4ec';
    ctx.fillRect(sx + 16, y + 13, 10, 3);
    ctx.fillRect(sx + 22, y + 16, 2, 3);
    ctx.fillRect(sx + 25, y + 16, 2, 4);
  }
  function drawAmpoule(sx, sy, bobT) {
    const y = sy + Math.sin(bobT * 3) * 2;
    ctx.fillStyle = '#d6f2ff';
    ctx.fillRect(sx + 13, y + 10, 6, 14);
    ctx.fillStyle = '#5ad0ff';
    ctx.fillRect(sx + 14, y + 15, 4, 8);
    ctx.fillStyle = '#7a2a2a';
    ctx.fillRect(sx + 12, y + 7, 8, 4);
    ctx.fillStyle = '#ff5c5c';
    ctx.font = 'bold 7px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('v3', sx + 16, y + 30);
  }
  function drawTorch(sx, sy, i) {
    drawFloor(sx, sy, 0, 0);
    ctx.fillStyle = '#3a3238';
    ctx.fillRect(sx + 10, sy + 18, 12, 10);
    ctx.fillRect(sx + 8, sy + 16, 16, 4);
    const f = Math.sin(time * 14 + flicker[i % 64]) * 2 + Math.sin(time * 5 + i) * 1.5;
    ctx.fillStyle = '#ff9a3c';
    ctx.beginPath();
    ctx.moveTo(sx + 16, sy + 4 + f);
    ctx.lineTo(sx + 22, sy + 17);
    ctx.lineTo(sx + 10, sy + 17);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ffe08a';
    ctx.beginPath();
    ctx.moveTo(sx + 16, sy + 9 + f);
    ctx.lineTo(sx + 19, sy + 17);
    ctx.lineTo(sx + 13, sy + 17);
    ctx.closePath();
    ctx.fill();
  }
  function drawCrack(sx, sy, x, y) {
    drawWall(sx, sy, x, y);
    ctx.strokeStyle = '#0b0a10';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(sx + 14, sy + 2);
    ctx.lineTo(sx + 18, sy + 10);
    ctx.lineTo(sx + 13, sy + 17);
    ctx.lineTo(sx + 19, sy + 24);
    ctx.lineTo(sx + 16, sy + 31);
    ctx.stroke();
    if (!revealedX) {
      ctx.fillStyle = '#dfe4ec';
      ctx.fillRect(sx + 15, sy + 12, 3, 3);
    }
  }
  function drawNote(sx, sy, onFloor = false) {
    drawFloor(sx, sy, 0, 0);
    ctx.fillStyle = '#e9e2cf';
    if (onFloor) {
      ctx.save();
      ctx.translate(sx + 16, sy + 16);
      ctx.rotate(-0.3);
      ctx.fillRect(-7, -8, 14, 17);
      ctx.fillStyle = '#7a7060';
      for (let i = 0; i < 4; i++) ctx.fillRect(-5, -5 + i * 3, 10 - (i % 2) * 3, 1);
      ctx.fillStyle = 'rgba(200,16,46,0.7)';
      ctx.fillRect(-5, 4, 8, 1);
      ctx.restore();
      return;
    }
    ctx.fillRect(sx + 9, sy + 8, 14, 17);
    ctx.fillStyle = '#7a7060';
    for (let i = 0; i < 4; i++) ctx.fillRect(sx + 11, sy + 11 + i * 3, 10 - (i % 2) * 3, 1);
  }
  function drawExit(sx, sy) {
    drawFloor(sx, sy, 0, 0);
    const pulse = 0.5 + Math.sin(time * 3) * 0.3;
    ctx.fillStyle = '#0a0a14';
    ctx.fillRect(sx + 4, sy + 2, TILE - 8, TILE - 2);
    for (let i = 0; i < 4; i++) {
      const g = 70 - i * 16;
      ctx.fillStyle = `rgb(${g},${g - 4},${g + 8})`;
      ctx.fillRect(sx + 6, sy + 4 + i * 7, TILE - 12, 6);
    }
    ctx.fillStyle = `rgba(255,224,138,${0.35 + pulse * 0.4})`;
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('▼', sx + 16, sy + 14);
  }
  function drawDrawer(sx, sy, open) {
    drawFloor(sx, sy, 0, 0);
    ctx.fillStyle = '#4a3220';
    ctx.fillRect(sx + 3, sy + 6, TILE - 6, TILE - 8);
    ctx.fillStyle = '#6b4a2e';
    ctx.fillRect(sx + 5, sy + 8, TILE - 10, 9);
    ctx.fillRect(sx + 5, sy + 19, TILE - 10, 9);
    if (open) {
      ctx.fillStyle = '#1a1008';
      ctx.fillRect(sx + 5, sy + 8, TILE - 10, 9);
      ctx.fillStyle = '#7d5a3a';
      ctx.fillRect(sx + 3, sy + 1, TILE - 6, 7);
      ctx.fillStyle = '#c9a35a';
      ctx.fillRect(sx + 14, sy + 4, 4, 2);
    } else {
      ctx.fillStyle = '#c9a35a';
      ctx.fillRect(sx + 14, sy + 12, 4, 2);
    }
    ctx.fillStyle = '#c9a35a';
    ctx.fillRect(sx + 14, sy + 23, 4, 2);
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(sx + 3, sy + TILE - 3, TILE - 6, 3);
  }
  function drawSink(sx, sy, dry) {
    drawFloor(sx, sy, 0, 0);
    ctx.fillStyle = '#d8dde6';
    ctx.fillRect(sx + 5, sy + 12, TILE - 10, 14);
    ctx.fillStyle = '#9fb3c8';
    ctx.fillRect(sx + 8, sy + 15, TILE - 16, 8);
    if (!dry) {
      ctx.fillStyle = '#7fc4ff';
      ctx.fillRect(sx + 10, sy + 18, TILE - 20, 4);
    }
    ctx.fillStyle = '#c0c6cf';
    ctx.fillRect(sx + 15, sy + 4, 3, 9);
    ctx.fillRect(sx + 15, sy + 4, 8, 3);
    if (!dry) {
      const drip = (time * 1.5) % 1;
      ctx.fillStyle = '#bfe6ff';
      ctx.fillRect(sx + 21, sy + 7 + drip * 9, 2, 3);
    }
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(sx + 5, sy + 26, TILE - 10, 2);
  }
  function drawBrazier(sx, sy, lit, i) {
    drawFloor(sx, sy, 0, 0);
    ctx.fillStyle = '#3a3238';
    ctx.beginPath();
    ctx.arc(sx + 16, sy + 20, 11, 0, Math.PI);
    ctx.fill();
    ctx.fillRect(sx + 5, sy + 18, 22, 4);
    ctx.fillRect(sx + 13, sy + 27, 6, 4);
    if (lit) {
      const f = Math.sin(time * 14 + flicker[i % 64]) * 2 + Math.sin(time * 5 + i) * 1.5;
      ctx.fillStyle = '#ff9a3c';
      ctx.beginPath();
      ctx.moveTo(sx + 16, sy + 2 + f);
      ctx.lineTo(sx + 25, sy + 19);
      ctx.lineTo(sx + 7, sy + 19);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#ffe08a';
      ctx.beginPath();
      ctx.moveTo(sx + 16, sy + 8 + f);
      ctx.lineTo(sx + 21, sy + 19);
      ctx.lineTo(sx + 11, sy + 19);
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.fillStyle = '#1e1a22';
      ctx.fillRect(sx + 9, sy + 14, 14, 5);
      const k = (time * 0.6) % 1;
      ctx.fillStyle = `rgba(160,160,170,${0.35 * (1 - k)})`;
      ctx.fillRect(sx + 14 + Math.sin(time * 2) * 3, sy + 12 - k * 12, 4, 4);
    }
  }
  function drawTower(sx, sy, x, y) {
    drawWall(sx, sy, x, y);
    ctx.fillStyle = '#6d6e76';
    ctx.fillRect(sx + 6, sy - 4, 20, TILE + 4);
    ctx.fillStyle = '#8e919c';
    ctx.fillRect(sx + 8, sy - 2, 16, 4);
    ctx.fillRect(sx + 8, sy + 8, 16, 2);
    ctx.fillRect(sx + 8, sy + 18, 16, 2);
    // 음각된 포도송이
    ctx.fillStyle = '#4a2a5a';
    for (let i = 0; i < 6; i++) ctx.fillRect(sx + 12 + (i % 3) * 3 - (i >= 3 ? 1 : 0) * 0, sy + 12 + Math.floor(i / 3) * 3, 3, 3);
    ctx.fillRect(sx + 15, sy + 18, 3, 3);
    ctx.fillStyle = '#3f7a3a';
    ctx.fillRect(sx + 18, sy + 9, 4, 2);
  }
  function drawPainting(sx, sy, x, y) {
    drawWall(sx, sy, x, y);
    ctx.fillStyle = '#c9a35a';
    ctx.fillRect(sx + 5, sy + 6, 22, 20);
    ctx.fillStyle = '#2b2e3a';
    ctx.fillRect(sx + 7, sy + 8, 18, 16);
    ctx.strokeStyle = '#c9d6ff';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(sx + 7, sy + 8);
    ctx.lineTo(sx + 25, sy + 24);
    ctx.moveTo(sx + 25, sy + 8);
    ctx.lineTo(sx + 7, sy + 24);
    ctx.stroke();
  }
  function drawSign(sx, sy) {
    drawFloor(sx, sy, 0, 0);
    ctx.fillStyle = '#6b4a2e';
    ctx.fillRect(sx + 14, sy + 14, 4, 16);
    ctx.fillStyle = '#c9a35a';
    ctx.fillRect(sx + 4, sy + 4, 24, 12);
    ctx.fillStyle = '#3a2a10';
    ctx.fillRect(sx + 7, sy + 7, 12, 1);
    ctx.fillRect(sx + 7, sy + 10, 16, 1);
    ctx.fillRect(sx + 7, sy + 13, 9, 1);
  }
  function drawCauldron(sx, sy) {
    const jx = (Math.random() - 0.5) * 1.5;
    ctx.fillStyle = '#0a0a12';
    ctx.beginPath();
    ctx.ellipse(sx + 16 + jx, sy + 20, 15, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1e1a22';
    ctx.fillRect(sx + 3, sy + 10, 26, 6);
    // 부글거리는 초록 액체
    const b = Math.sin(time * 6) * 1.5;
    ctx.fillStyle = '#5aff8a';
    ctx.beginPath();
    ctx.ellipse(sx + 16, sy + 12 + b, 11, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#c8ffd8';
    ctx.fillRect(sx + 10 + ((time * 7) % 12), sy + 8 + Math.sin(time * 9) * 2, 2, 2);
    ctx.fillStyle = '#3d3f48';
    ctx.fillRect(sx + 6, sy + 28, 4, 4);
    ctx.fillRect(sx + 22, sy + 28, 4, 4);
    ctx.fillStyle = '#e8e6df';
    ctx.fillRect(sx + 10, sy + 19, 12, 7);
    ctx.fillStyle = '#c8102e';
    ctx.font = 'bold 8px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('V3', sx + 16, sy + 25);
  }
  function drawCup(x, y, filled) {
    ctx.fillStyle = '#e9e2cf';
    ctx.fillRect(x + 4, y, 10, 13);
    ctx.fillRect(x + 14, y + 3, 3, 2);
    ctx.fillRect(x + 16, y + 3, 2, 6);
    ctx.fillRect(x + 14, y + 8, 3, 2);
    if (filled) {
      ctx.fillStyle = '#7fc4ff';
      ctx.fillRect(x + 6, y + 3, 6, 8);
    } else {
      ctx.fillStyle = '#b9b2a2';
      ctx.fillRect(x + 6, y + 2, 6, 9);
    }
  }
  function drawChick(sx, sy, n, ghostly = false) {
    const bob = Math.sin(n.bob * 4) * 1.5;
    ctx.save();
    ctx.globalAlpha = n.fade * n.vis;
    if ((ghostly || n.vis < 1) && Math.random() < 0.5) ctx.translate((Math.random() - 0.5) * 6, 0);
    ctx.strokeStyle = ghostly ? '#9fd6c8' : '#5fa35a';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(sx + 16, sy + 12 + bob);
    ctx.lineTo(sx + 13, sy + 3 + bob);
    ctx.moveTo(sx + 16, sy + 12 + bob);
    ctx.lineTo(sx + 20, sy + 4 + bob);
    ctx.stroke();
    ctx.fillStyle = ghostly ? '#dfe8ff' : '#fffdf7';
    ctx.strokeStyle = ghostly ? '#6f7fa0' : '#2a211d';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(sx + 16, sy + 21 + bob, 11, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = ghostly || tier === 2 ? '#a02020' : '#2a211d';
    ctx.fillRect(sx + 11, sy + 19 + bob, 2, 2);
    ctx.fillRect(sx + 19, sy + 19 + bob, 2, 2);
    if (!ghostly) {
      ctx.fillStyle = '#f7b3b3';
      ctx.fillRect(sx + 8, sy + 23 + bob, 3, 2);
      ctx.fillRect(sx + 21, sy + 23 + bob, 3, 2);
    }
    ctx.restore();
  }
  function drawFox(sx, sy) {
    const walk = player.moving ? Math.sin(player.prog * Math.PI * 2 + player.step) * 1.5 : 0;
    const y = sy + walk;
    ctx.save();
    ctx.translate(sx + 16, y + 16);
    if (player.dir === 'left') ctx.scale(-1, 1);
    ctx.fillStyle = '#f08a2e';
    ctx.beginPath();
    ctx.ellipse(-11, 6, 6, 4, -0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff6e8';
    ctx.beginPath();
    ctx.arc(-15, 3, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f08a2e';
    ctx.strokeStyle = '#2a211d';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(0, 6, 8, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-9, -6);
    ctx.lineTo(-6, -15);
    ctx.lineTo(-1, -8);
    ctx.moveTo(9, -6);
    ctx.lineTo(6, -15);
    ctx.lineTo(1, -8);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#2a211d';
    ctx.beginPath();
    ctx.moveTo(-7, -8);
    ctx.lineTo(-6, -12);
    ctx.lineTo(-3, -8);
    ctx.moveTo(7, -8);
    ctx.lineTo(6, -12);
    ctx.lineTo(3, -8);
    ctx.fill();
    ctx.fillStyle = '#f08a2e';
    ctx.beginPath();
    ctx.arc(0, -4, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    if (player.dir !== 'up') {
      ctx.fillStyle = '#fff6e8';
      ctx.beginPath();
      ctx.ellipse(0, -1, 6, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#2a211d';
      const ex = player.dir === 'down' ? 0 : 2;
      ctx.fillRect(-4 + ex, -6, 2, 3);
      ctx.fillRect(2 + ex, -6, 2, 3);
      ctx.fillRect(-1 + ex, -1, 2, 2);
      ctx.fillStyle = '#f7b3b3';
      ctx.fillRect(-7 + ex, -2, 2, 2);
      ctx.fillRect(5 + ex, -2, 2, 2);
    }
    ctx.restore();
  }
  function drawMonster(sx, sy) {
    const jx = (Math.random() - 0.5) * 3;
    const jy = (Math.random() - 0.5) * 3;
    ctx.save();
    ctx.translate(sx + 16 + jx, sy + 20 + jy);
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.beginPath();
    ctx.ellipse(0, 12, 16, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#05040a';
    ctx.beginPath();
    ctx.moveTo(-18, 12);
    for (let i = 0; i <= 8; i++) {
      const x = -18 + i * 4.5;
      const spike = i % 2 ? -34 - Math.random() * 6 : -26;
      ctx.lineTo(x, spike);
    }
    ctx.lineTo(18, 12);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ff2020';
    const blink = Math.sin(time * 9) > 0.93 ? 0.3 : 1;
    ctx.fillRect(-8, -14, 4, 3 * blink);
    ctx.fillRect(4, -14, 4, 3 * blink);
    ctx.restore();
  }

  function render() {
    if (!active) return;
    let camX = player.px + 0.5 - VIEW_W / 2;
    let camY = player.py + 0.5 - VIEW_H / 2;
    camX = Math.max(0, Math.min(W - VIEW_W, camX));
    camY = Math.max(0, Math.min(H - VIEW_H, camY));
    const ox = Math.round(-camX * TILE);
    const oy = Math.round(-camY * TILE);

    ctx.fillStyle = '#07070c';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    const x0 = Math.floor(camX);
    const y0 = Math.floor(camY);
    const lights = [];
    for (let y = y0; y <= y0 + VIEW_H; y++) {
      for (let x = x0; x <= x0 + VIEW_W; x++) {
        const c = at(x, y);
        const sx = ox + x * TILE;
        const sy = oy + y * TILE;
        if (c === '~') continue; // 맵 밖: 아무것도 없다
        if (c === '#') drawWall(sx, sy, x, y);
        else if (c === 'X') drawCrack(sx, sy, x, y);
        else if (c === '1' || c === '2' || c === 'K') drawDoor(sx, sy, c);
        else if (c === 'W') drawWardrobe(sx, sy, hidden && hidden.wx === x && hidden.wy === y);
        else if (c === 'D') drawDrawer(sx, sy, openedDrawers.has(`${x},${y}`));
        else if (c === 'S') drawSink(sx, sy, floor === 3 && !fl.ghostSeen);
        else if (c === 'Q') drawTower(sx, sy, x, y);
        else if (c === 'A') drawPainting(sx, sy, x, y);
        else if (c === '!') drawSign(sx, sy);
        else if (c === 'U') {
          drawCauldron(sx, sy);
          lights.push([sx + 16, sy + 12, 80 + Math.sin(time * 6) * 8, 0.8]);
        } else if (c === 'F') {
          drawBrazier(sx, sy, true, x * 31 + y);
          lights.push([sx + 16, sy + 14, 100 + Math.sin(time * 9 + x + y) * 6, 1]);
        } else if (c === 'f' || c === 'G') drawBrazier(sx, sy, false, 0);
        else if (c === 'T') {
          drawTorch(sx, sy, x * 31 + y);
          lights.push([sx + 16, sy + 10, 90 + Math.sin(time * 9 + x + y) * 6, 0.95]);
        } else if (c === 'N') drawNote(sx, sy);
        else if (c === 'M') drawNote(sx, sy, true);
        else if (c === 'E') {
          drawExit(sx, sy);
          lights.push([sx + 16, sy + 16, 70, 0.7]);
        } else {
          drawFloor(sx, sy, x, y);
          if (c === 'a' || c === 'b') drawKey(sx, sy, c, time + x);
          else if (c === 'v') {
            drawAmpoule(sx, sy, time + x);
            lights.push([sx + 16, sy + 16, 40, 0.6]);
          }
        }
      }
    }
    for (const n of npcs) if (n.alive && n.vis > 0.01) drawChick(ox + n.x * TILE, oy + n.y * TILE, n);
    const pxs = ox + player.px * TILE;
    const pys = oy + player.py * TILE;
    if (!hidden) drawFox(pxs, pys);
    if (ghost) {
      const gx = ox + ghost.px * TILE;
      const gy = oy + ghost.py * TILE;
      drawChick(gx, gy, { bob: ghost.bob, fade: ghost.fade, vis: ghost.vis * (0.75 + Math.random() * 0.25), talked: false }, true);
      lights.push([gx + 16, gy + 18, 70, 0.7]);
    }
    for (const m of monsters) drawMonster(ox + m.px * TILE, oy + m.py * TILE);
    lights.push([hidden ? ox + hidden.wx * TILE + 16 : pxs + 16, hidden ? oy + hidden.wy * TILE + 16 : pys + 16, hidden ? 60 : 120, 1]);

    // 어둠 + 조명 (tier 가 높을수록 더 어둡다)
    const darkness = 0.7 + tier * 0.09;
    dctx.globalCompositeOperation = 'source-over';
    dctx.fillStyle = `rgba(4,3,10,${darkness})`;
    dctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    dctx.globalCompositeOperation = 'destination-out';
    for (const [lx, ly, r, a] of lights) {
      const g = dctx.createRadialGradient(lx, ly, 4, lx, ly, r);
      g.addColorStop(0, `rgba(0,0,0,${a})`);
      g.addColorStop(0.55, `rgba(0,0,0,${a * 0.5})`);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      dctx.fillStyle = g;
      dctx.fillRect(lx - r, ly - r, r * 2, r * 2);
    }
    ctx.drawImage(dark, 0, 0);
    ctx.globalCompositeOperation = 'lighter';
    for (const [lx, ly, r, a] of lights) {
      if (a >= 1) continue;
      const g = ctx.createRadialGradient(lx, ly, 2, lx, ly, r * 0.7);
      g.addColorStop(0, 'rgba(255,140,50,0.22)');
      g.addColorStop(1, 'rgba(255,140,50,0)');
      ctx.fillStyle = g;
      ctx.fillRect(lx - r, ly - r, r * 2, r * 2);
    }
    ctx.globalCompositeOperation = 'source-over';

    // 괴물이 가까우면 화면 가장자리가 붉게 맥동
    if (monsters.length && !hidden) {
      const d = Math.min(...monsters.map((m) => Math.abs(m.px - player.px) + Math.abs(m.py - player.py)));
      if (d < 7) {
        const k = (1 - d / 7) * (0.35 + Math.sin(time * 8) * 0.1);
        const g = ctx.createRadialGradient(CANVAS_W / 2, CANVAS_H / 2, CANVAS_H * 0.35, CANVAS_W / 2, CANVAS_H / 2, CANVAS_H * 0.8);
        g.addColorStop(0, 'rgba(120,0,10,0)');
        g.addColorStop(1, `rgba(120,0,10,${k})`);
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
      }
    }

    // tier 2: 화면 글리치 라인
    if (tier === 2 && Math.random() < 0.08) {
      const gy = Math.random() * CANVAS_H;
      const gh = 2 + Math.random() * 6;
      ctx.drawImage(canvas, 0, gy, CANVAS_W, gh, (Math.random() - 0.5) * 20, gy, CANVAS_W, gh);
    }

    drawWardrobePrompt(ox, oy);
    drawHud();
    if (dialog) drawDialog();
    if (choice) drawChoice();
    if (picker) drawPicker();
    if (credits) drawCredits();
    if (toast) {
      ctx.font = 'bold 13px "Malgun Gothic", system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(0,0,0,0.65)';
      const tw = ctx.measureText(toast.text).width + 24;
      ctx.fillRect(CANVAS_W / 2 - tw / 2, 40, tw, 24);
      ctx.fillStyle = '#ffe9c9';
      ctx.fillText(toast.text, CANVAS_W / 2, 57);
    }
    if (state === 'closing') drawButton('E · 방송 끄기 (클릭)');
    if (state === 'over' && !dialog) drawGameOver();
    if (scareFx > 0) drawScare();
    if (staticFx > 0) drawStatic();
  }

  /** 옷장 앞에 서 있으면(또는 숨어 있으면) 옷장 위에 E 안내를 띄운다 */
  function drawWardrobePrompt(ox, oy) {
    if (state !== 'play') return;
    let wx, wy, text;
    if (hidden) {
      wx = hidden.wx;
      wy = hidden.wy;
      text = 'E  옷장에서 나오기';
    } else {
      const [dx, dy] = DIRS[player.dir];
      const tx = player.x + dx;
      const ty = player.y + dy;
      if (at(tx, ty) !== 'W') return;
      wx = tx;
      wy = ty;
      text = 'E  옷장에 숨기';
    }
    const cx = ox + wx * TILE + TILE / 2;
    const top = oy + wy * TILE - 22 + Math.sin(time * 4) * 1.5;
    ctx.font = 'bold 12px "Malgun Gothic", system-ui, sans-serif';
    ctx.textAlign = 'center';
    const tw = ctx.measureText(text).width + 16;
    ctx.fillStyle = 'rgba(8,8,18,0.85)';
    ctx.fillRect(cx - tw / 2, top - 15, tw, 20);
    ctx.strokeStyle = '#ffb070';
    ctx.lineWidth = 1;
    ctx.strokeRect(cx - tw / 2 + 0.5, top - 14.5, tw - 1, 19);
    ctx.fillStyle = '#ffe9c9';
    ctx.fillText(text, cx, top);
  }

  // 괴물 등장 연출: 화면 가득한 검은 실루엣 + 붉은 눈
  function drawScare() {
    const k = Math.min(1, scareFx / 1.0);
    ctx.save();
    ctx.globalAlpha = k;
    ctx.fillStyle = 'rgba(60,0,8,0.55)';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    const cx = CANVAS_W / 2 + (Math.random() - 0.5) * 10;
    const cy = CANVAS_H * 0.62;
    const scale = 1 + (1 - k) * 0.6;
    ctx.translate(cx, cy);
    ctx.scale(scale, scale);
    ctx.fillStyle = '#020104';
    ctx.shadowColor = 'rgba(255,30,30,0.9)';
    ctx.shadowBlur = 40;
    ctx.beginPath();
    ctx.moveTo(-150, 160);
    for (let i = 0; i <= 12; i++) {
      const x = -150 + i * 25;
      const spike = i % 2 ? -190 - Math.random() * 30 : -140;
      ctx.lineTo(x, spike);
    }
    ctx.lineTo(150, 160);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(255,40,40,0.85)';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = '#ff2020';
    ctx.fillRect(-52, -70, 28, 16);
    ctx.fillRect(24, -70, 28, 16);
    ctx.restore();
  }
  // 치지직: 노이즈 줄 + 화면 찢김
  function drawStatic() {
    for (let i = 0; i < 90; i++) {
      const y = Math.random() * CANVAS_H;
      const h = 1 + Math.random() * 3;
      const g = Math.floor(Math.random() * 255);
      ctx.fillStyle = `rgba(${g},${g},${g},${0.25 + Math.random() * 0.5})`;
      ctx.fillRect(0, y, CANVAS_W, h);
    }
    for (let i = 0; i < 6; i++) {
      const gy = Math.random() * CANVAS_H;
      const gh = 4 + Math.random() * 14;
      ctx.drawImage(canvas, 0, gy, CANVAS_W, gh, (Math.random() - 0.5) * 60, gy, CANVAS_W, gh);
    }
  }
  function drawButton(text) {
    ctx.font = 'bold 18px "Malgun Gothic", system-ui, sans-serif';
    ctx.textAlign = 'center';
    const tw = ctx.measureText(text).width + 44;
    const bx = CANVAS_W / 2 - tw / 2;
    const by = CANVAS_H / 2 - 22;
    ctx.fillStyle = 'rgba(8,8,18,0.92)';
    ctx.fillRect(bx, by, tw, 44);
    ctx.strokeStyle = Math.sin(time * 5) > 0 ? '#ffb070' : '#ffd9a8';
    ctx.lineWidth = 2;
    ctx.strokeRect(bx + 1, by + 1, tw - 2, 42);
    ctx.fillStyle = '#ffe9c9';
    ctx.fillText(text, CANVAS_W / 2, by + 29);
  }
  function drawGameOver() {
    ctx.fillStyle = 'rgba(40,0,6,0.75)';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    ctx.fillStyle = '#ff5c5c';
    ctx.font = 'bold 40px "Malgun Gothic", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('GAME OVER', CANVAS_W / 2 + (Math.random() - 0.5) * 3, CANVAS_H / 2 + 12);
  }
  /** 5일차: 고성 탈출 인게임 엔딩 크레딧 (아래에서 위로) */
  function drawCredits() {
    const k = Math.min(1, credits.t / 1.2);
    ctx.fillStyle = `rgba(3,3,8,${0.92 * k})`;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    const lineH = 30;
    const total = CREDIT_LINES.length * lineH;
    const y0 = CANVAS_H + 20 - ((credits.t - 0.6) / (CREDITS_SECONDS - 1.6)) * (CANVAS_H + total - 60);
    ctx.textAlign = 'center';
    CREDIT_LINES.forEach((line, i) => {
      const y = y0 + i * lineH;
      if (y < -10 || y > CANVAS_H + 10) return;
      const big = i === 0 || line === 'THE END';
      ctx.font = `${big ? 'bold 24px' : '15px'} "Malgun Gothic", system-ui, sans-serif`;
      ctx.fillStyle = big ? '#ffb070' : '#e8e6df';
      ctx.fillText(line, CANVAS_W / 2, y);
    });
  }

  function drawHud() {
    const hy = 40;
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(8, hy, 132, 26);
    ctx.fillStyle = '#e8e6df';
    ctx.font = '12px "Malgun Gothic", system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('소지품', 14, hy + 17);
    let kx = 58;
    for (const k of ['a', 'b']) {
      ctx.globalAlpha = inventory.has(k) ? 1 : 0.18;
      drawKey(kx, hy - 2, k, 0);
      ctx.globalAlpha = 1;
      kx += 28;
    }
    ctx.globalAlpha = hasCup() ? 1 : 0.18;
    drawCup(kx, hy + 6, inventory.has('cupWater'));
    ctx.globalAlpha = 1;
    // 그 밖의 소지품은 이름으로
    const extras = ['doll', 'ampoule', 'pickaxe'].filter((k) => inventory.has(k)).map((k) => ITEM_NAMES[k]);
    if (extras.length) {
      const text = extras.join(' · ');
      const tw = ctx.measureText(text).width + 16;
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(8, hy + 30, tw, 22);
      ctx.fillStyle = '#ffe9c9';
      ctx.fillText(text, 16, hy + 45);
    }
    const m = Math.floor(elapsed / 60);
    const s = Math.floor(elapsed % 60);
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(CANVAS_W - 128, hy, 120, 26);
    ctx.fillStyle = '#ffb070';
    ctx.textAlign = 'left';
    ctx.fillText(floorDef().name, CANVAS_W - 122, hy + 17);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#e8e6df';
    ctx.fillText(`${m}:${s.toString().padStart(2, '0')}`, CANVAS_W - 14, hy + 17);
  }

  const FONT = '"Malgun Gothic", system-ui, sans-serif';
  function wrapText(text, x, y, maxW, lineH) {
    let line = '';
    for (const ch of text) {
      if (ctx.measureText(line + ch).width > maxW) {
        ctx.fillText(line, x, y);
        y += lineH;
        line = ch;
      } else line += ch;
    }
    ctx.fillText(line, x, y);
    return y + lineH;
  }
  function drawDialog() {
    const full = dialog.lines[dialog.index];
    const shown = full.slice(0, Math.floor(dialog.shown));
    if (!dialog.cache || dialog.cache.len !== shown.length || dialog.glitchAmount > 0.1) {
      dialog.cache = { len: shown.length, text: glitch(shown, dialog.glitchAmount) };
    }
    const bx = 16;
    const bh = dialog.red ? 112 : 92;
    const by = CANVAS_H - bh - 36;
    const bw = CANVAS_W - 32;
    ctx.fillStyle = 'rgba(8,8,18,0.92)';
    ctx.fillRect(bx, by, bw, bh);
    ctx.strokeStyle = dialog.glitchAmount > 0.1 || dialog.ghost ? '#c8102e' : '#ffb070';
    ctx.lineWidth = 2;
    ctx.strokeRect(bx + 1, by + 1, bw - 2, bh - 2);
    ctx.textAlign = 'left';
    let ty = by + 24;
    if (dialog.speaker) {
      ctx.fillStyle = '#ffb070';
      ctx.font = `bold 13px ${FONT}`;
      ctx.fillText(dialog.speaker, bx + 14, ty);
      ty += 20;
    }
    ctx.fillStyle = '#f2efe6';
    ctx.font = `14px ${FONT}`;
    ty = wrapText(dialog.cache.text, bx + 14, ty, bw - 28, 20);
    // 붉은 글씨로 겹쳐 쓰인 문장: 본문이 다 나온 뒤 살짝 비뚤게, 떨리며 겹쳐 보인다
    if (dialog.red && dialog.shown >= full.length) {
      ctx.save();
      ctx.translate(bx + 30 + (Math.random() - 0.5) * 2, ty - 6 + (Math.random() - 0.5) * 2);
      ctx.rotate(-0.04);
      ctx.fillStyle = 'rgba(200,16,46,0.85)';
      ctx.font = `bold 17px ${FONT}`;
      ctx.fillText(dialog.red, 0, 0);
      ctx.restore();
    }
    if (dialog.shown >= full.length && dialog.auto <= 0 && Math.sin(time * 6) > 0) {
      ctx.fillStyle = '#ffb070';
      ctx.font = '12px monospace';
      ctx.textAlign = 'right';
      ctx.fillText('▼ E / 클릭', bx + bw - 12, by + bh - 10);
    }
  }
  function drawChoice() {
    const n = choice.options.length;
    const bx = 16;
    const bh = 58 + n * 24 + (choice.speaker ? 20 : 0);
    const by = CANVAS_H - bh - 36;
    const bw = CANVAS_W - 32;
    ctx.fillStyle = 'rgba(8,8,18,0.94)';
    ctx.fillRect(bx, by, bw, bh);
    ctx.strokeStyle = choice.speaker ? '#c8102e' : '#ffb070';
    ctx.lineWidth = 2;
    ctx.strokeRect(bx + 1, by + 1, bw - 2, bh - 2);
    ctx.textAlign = 'left';
    let ty = by + 24;
    if (choice.speaker) {
      ctx.fillStyle = '#ffb070';
      ctx.font = `bold 13px ${FONT}`;
      ctx.fillText(choice.speaker, bx + 14, ty);
      ty += 20;
    } else {
      ctx.fillStyle = '#9fb3c8';
      ctx.font = `bold 11px monospace`;
      ctx.fillText('SYSTEM', bx + 14, ty);
      ty += 20;
    }
    ctx.fillStyle = '#f2efe6';
    ctx.font = `14px ${FONT}`;
    ctx.fillText(choice.question, bx + 14, ty);
    ty += 26;
    choice.rects = [];
    choice.options.forEach((opt, i) => {
      const cur = i === choice.cursor;
      choice.rects.push({ x: bx + 10, y: ty - 15, w: bw - 20, h: 22 });
      if (cur) {
        ctx.fillStyle = 'rgba(255,176,112,0.18)';
        ctx.fillRect(bx + 10, ty - 15, bw - 20, 22);
      }
      ctx.fillStyle = cur ? '#ffe9c9' : '#c9c4b8';
      ctx.font = `${cur ? 'bold ' : ''}14px ${FONT}`;
      ctx.fillText(`${cur ? '▶' : ' '} ${i + 1}. ${opt}`, bx + 18, ty);
      ty += 24;
    });
  }
  /** 아이템 선택창: 소지품 아이콘을 바둑판으로 늘어놓고, 커서가 놓인 아이템의 이름을 아래에 보여준다. 마지막 칸은 취소 */
  function drawPicker() {
    const n = picker.items.length;
    const rows = Math.ceil((n + 1) / PICKER_COLS);
    const bx = 16;
    const bh = 56 + rows * (PICKER_CELL + PICKER_GAP) + 26;
    const by = CANVAS_H - bh - 36;
    const bw = CANVAS_W - 32;
    ctx.fillStyle = 'rgba(8,8,18,0.94)';
    ctx.fillRect(bx, by, bw, bh);
    ctx.strokeStyle = '#ffb070';
    ctx.lineWidth = 2;
    ctx.strokeRect(bx + 1, by + 1, bw - 2, bh - 2);
    ctx.textAlign = 'left';
    ctx.fillStyle = '#9fb3c8';
    ctx.font = 'bold 11px monospace';
    ctx.fillText('ITEM', bx + 14, by + 22);
    ctx.fillStyle = '#f2efe6';
    ctx.font = `bold 14px ${FONT}`;
    ctx.fillText('아이템', bx + 56, by + 23);
    picker.rects = [];
    const gx = bx + 14;
    const gy = by + 34;
    for (let i = 0; i <= n; i++) {
      const cx = gx + (i % PICKER_COLS) * (PICKER_CELL + PICKER_GAP);
      const cy = gy + Math.floor(i / PICKER_COLS) * (PICKER_CELL + PICKER_GAP);
      picker.rects.push({ x: cx, y: cy, w: PICKER_CELL, h: PICKER_CELL });
      const cur = i === picker.cursor;
      ctx.fillStyle = cur ? 'rgba(255,176,112,0.22)' : 'rgba(255,255,255,0.05)';
      ctx.fillRect(cx, cy, PICKER_CELL, PICKER_CELL);
      ctx.strokeStyle = cur ? '#ffb070' : 'rgba(255,255,255,0.18)';
      ctx.lineWidth = cur ? 2 : 1;
      ctx.strokeRect(cx + 0.5, cy + 0.5, PICKER_CELL - 1, PICKER_CELL - 1);
      if (i === n) {
        // 취소 칸
        ctx.strokeStyle = cur ? '#ffe9c9' : 'rgba(232,230,223,0.5)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(cx + 18, cy + 18);
        ctx.lineTo(cx + PICKER_CELL - 18, cy + PICKER_CELL - 18);
        ctx.moveTo(cx + PICKER_CELL - 18, cy + 18);
        ctx.lineTo(cx + 18, cy + PICKER_CELL - 18);
        ctx.stroke();
      } else drawItemIcon(picker.items[i], cx + PICKER_CELL / 2, cy + PICKER_CELL / 2);
    }
    // 커서가 놓인 아이템 이름
    const label = picker.cursor >= n ? CANCEL : ITEM_NAMES[picker.items[picker.cursor]];
    ctx.fillStyle = '#ffe9c9';
    ctx.font = `bold 14px ${FONT}`;
    ctx.textAlign = 'left';
    ctx.fillText(`▶ ${label}`, bx + 14, by + bh - 12);
    ctx.fillStyle = 'rgba(232,230,223,0.55)';
    ctx.font = '11px monospace';
    ctx.textAlign = 'right';
    ctx.fillText('E 선택 · Esc 취소', bx + bw - 12, by + bh - 12);
  }
  /** 아이템 아이콘 (cx, cy 가 가운데) */
  function drawItemIcon(key, cx, cy) {
    ctx.save();
    if (key === 'a' || key === 'b') {
      ctx.translate(cx - 16, cy - 16);
      ctx.scale(1.3, 1.3);
      drawKey(-4, -4, key, 0);
    } else if (key === 'cup' || key === 'cupWater') {
      ctx.translate(cx - 11, cy - 10);
      ctx.scale(1.5, 1.5);
      drawCup(0, 0, key === 'cupWater');
    } else if (key === 'ampoule') {
      ctx.translate(cx - 16, cy - 20);
      ctx.scale(1.2, 1.2);
      drawAmpoule(0, 0, 0);
    } else if (key === 'doll') {
      // 노미요 인형: 주황 머리 + 귀 + 작은 몸
      ctx.translate(cx, cy);
      ctx.fillStyle = '#f08a2e';
      ctx.strokeStyle = '#2a211d';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(0, 9, 9, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-10, -6);
      ctx.lineTo(-7, -17);
      ctx.lineTo(-1, -9);
      ctx.moveTo(10, -6);
      ctx.lineTo(7, -17);
      ctx.lineTo(1, -9);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, -4, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#fff6e8';
      ctx.beginPath();
      ctx.ellipse(0, -1, 6, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#2a211d';
      ctx.fillRect(-4, -7, 2, 3);
      ctx.fillRect(2, -7, 2, 3);
      ctx.fillRect(-1, -2, 2, 2);
    } else if (key === 'pickaxe') {
      ctx.translate(cx, cy);
      ctx.rotate(-0.6);
      ctx.fillStyle = '#8a6a3c';
      ctx.fillRect(-2, -6, 4, 26);
      ctx.fillStyle = '#4c4f58';
      ctx.beginPath();
      ctx.moveTo(-16, -8);
      ctx.quadraticCurveTo(0, -18, 16, -8);
      ctx.lineTo(16, -4);
      ctx.quadraticCurveTo(0, -12, -16, -4);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  return {
    start,
    stop,
    update,
    render,
    keydown,
    click,
    keyup,
    isActive: () => active,
    getState: () => state,
    hasSave: () => !!save,
    startDemo,
    monsterDistance,
    freeze,
    closeDemo,
    isDemo: () => !!demo,
    cancelChoice,
    hover,
  };
}
