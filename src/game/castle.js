/**
 * 미스터리 고성 탈출 — 노미요가 방송에서 플레이하는 2D 탑다운(쯔꾸르풍) 미니게임.
 * 캔버스 하나에 타일맵 + 캐릭터 + 어둠/횃불 조명 + 대화창을 직접 그린다 (외부 에셋 없음).
 *
 * 조작: 방향키/WASD 이동(Shift 달리기), E 조사/대화/문 열기/대화 넘기기/옷장 숨기·나오기
 * 목표(층마다 반복): 갈라진 벽에서 은열쇠 → 서랍에서 물컵 → 화장실 세면대에서 물 받기 → 오른쪽 문을 막은 화로를 끄고 옆으로 밀기
 *   → 은열쇠로 오른쪽 문 → 청동열쇠 → 청동열쇠로 왼쪽 문 → 계단으로 아래층. 마지막 층의 계단이 탈출구.
 * 층마다 구조는 같고 서랍 속 아이템이 바뀐다 (FLOOR_ITEMS). 물컵은 층이 바뀌어도 가지고 내려간다.
 *
 * 스토리 연결
 * - 처음 접속할 때만 오프닝 안내문이 뜬다.
 * - 진행 상황(위치, 연 문, 열쇠, 시간)은 세션 메모리에 저장되어 다음 날 접속하면 이어서 한다. 탈출하면 초기화.
 * - 1일차: 왼쪽 문(1)을 열고 들어가면 노미요가 방송을 마무리하고 "E · 방송 끄기" 가 뜬다.
 * - 2일차부터: 한 발짝 움직이는 순간 고성의 괴물이 나타나 쫓아온다. 옷장(W)에 숨으면 괴물이 멀어지고, 잡히면 게임 오버.
 * - 안쪽 방의 낡은 일기(J): 글이 잠깐 보였다가 치지직 깨지고, 노미요가 "이게 뭐야" 하며 버린다.
 * - 파닥이 NPC 는 presence(0~1)에 따라 처음엔 안 보이다가 얼핏얼핏 보이고, 5일차부터 또렷해져 말을 걸 수 있다.
 *   tier 2 에서는 대화가 끝나면 파닥이가 글리치와 함께 사라진다(밴 이벤트).
 */

const TILE = 32;
const VIEW_W = 20;
const VIEW_H = 13;
export const CANVAS_W = VIEW_W * TILE; // 640
export const CANVAS_H = VIEW_H * TILE; // 416

const INTRO_LINES = [
  '당신은 누구 소유인지 모를 오래된 건물에서 눈을 떴습니다.',
  '「나가는 길」을 잘 찾아보세요.',
  '조심하세요. 너무 늦어지면 돌이킬 수 없어집니다.',
];
const CLOSING_LINES = ['그럼 오늘 방송은 여기까지 할까.', '여러분들 내일 또 봐요. 미요미요~'];
const DIARY_TEXT = '오늘도 %#$을 봤다. 재미있었다. #@독 버튼을 눌렀다.';

// 범례: # 벽, . 바닥, T 횃불(막힘, 빛), 1 청동열쇠 문(a), 2 은열쇠 문(b), a 청동열쇠, b 은열쇠, X 갈라진 벽(조사하면 은열쇠 b),
//       C 파닥이 NPC, N 쪽지, J 낡은 일기, W 옷장(숨기), D 서랍(층별 아이템), S 세면대(물컵에 물 받기),
//       F 문을 막은 화로(불 붙음) → f 꺼진 화로 → G 옆으로 밀어 둔 화로, E 아래층 계단(마지막 층은 탈출구), P 시작 위치
const MAP = [
  '##############################',
  '#T...T#T.D..T..D..T#T...T...T#',
  '#W...J#............#.........#',
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
  '#..N..#............#....C....#',
  '#..................#....######',
  '#.....#............#....#...S#',
  '#..C..#............#...N.....#',
  '#T...T#............#T...#...T#',
  '##############################',
];
const FLOOR_COUNT = 3; // 지하 3층의 계단이 탈출구
// 서랍 속 아이템 (층 → "x,y" → 대사 배열 또는 { item, lines }). 층 수가 FLOOR_ITEMS 보다 많으면 마지막 표를 재사용
const FLOOR_ITEMS = {
  1: {
    '9,1': { item: 'cup', lines: ['서랍 안에 낡은 물컵이 있다.', '물컵을 손에 넣었다!'] },
    '15,1': ['먼지 쌓인 서랍. 아무것도 없다.'],
    '1,10': ['서랍 속에 초 조각이 굴러다닌다. 쓸모는 없어 보인다.'],
    '28,12': ["구겨진 영수증: '구독 1개월 — 결제 완료'"],
    '4,15': ['녹슨 열쇠고리. 열쇠는 달려 있지 않다.'],
  },
  2: {
    '9,1': ['빈 서랍. 누가 먼저 뒤진 것 같다.'],
    '15,1': ['찢어진 사진 반쪽. 하얀 무언가가 웃고 있다.'],
    '1,10': ["서랍 바닥에 긁힌 글씨: '위층은 잊어'"],
    '28,12': ['초록색 잎 하나가 들어 있다. 대파 잎 같다.'],
    '4,15': ['깃털 몇 개. 하얗고 작다.'],
  },
  3: {
    '9,1': ["빛바랜 쪽지: '내려갈수록 가까워진다'"],
    '15,1': ['서랍이 텅 비었다.'],
    '1,10': ["작은 나무 조각. '좋아요' 모양이다."],
    '28,12': ['먼지 속에 발자국 스티커. 노미요 방에 있던 것과 똑같다.'],
    '4,15': ['빈 서랍.'],
  },
};
const ROOM_A = { minX: 1, maxX: 5, minY: 1, maxY: 5 }; // 왼쪽 문 너머의 방 (1일차 방송이 끝나는 곳)

// NPC 대사 (위치 키 "x,y"), tier 별. 마지막 배열 원소까지 다 읽으면 대화 종료
const NPC_LINES = {
  '12,7': [
    ['안녕, 노미요! 이 성은 문이 전부 잠겨 있어.', '은열쇠는 왼쪽 방 갈라진 벽 안에 있대. 근데 오른쪽 문은 화로가 막고 있어.', '화로를 끄려면 물이 필요해. 서랍을 뒤져 봐. 물은 오른쪽 아래 화장실에서 받을 수 있어.'],
    ['...노미요? 여기 왜 이렇게 어두워.', '열쇠는 갈라진 벽 안에 있어. 근데 이 성, 어쩐지 숲 냄새가 나.'],
    ['노미요... 나 여기 있어. 왜 나를 몰라?', '갈라진 벽... 벽 뒤에... 우리가 있어.'],
  ],
  '3,4': [
    ['여기까지 왔구나! 저 계단으로 내려가면 다음 층이야.', '아래층도 구조는 비슷해. 서랍에 뭐가 들었는지 꼭 확인해.'],
    ['이 방... 밖에서 누가 문을 두드리는 소리 들었어?'],
    ['문 열지 마. 열지 마. 열지 마.'],
  ],
  '3,19': [
    ['방송 재밌게 보고 있어! 화이팅!'],
    ['나 오늘 구독 몇 개월째더라... 기억이 안 나.'],
    ['보내줘... 아니, 아무것도 아니야. ㅎㅎ'],
  ],
  '24,16': [
    ['화장실 세면대에서 물이 나와. 컵이 있으면 담을 수 있을 거야.', '청동열쇠는 화로 뒤의 문 안에 있어. 그걸로 왼쪽 문을 열어.'],
    ['탈출구 너머에 뭐가 있는지 아무도 몰라. 돌아온 애가 없거든.'],
    ['탈출구는 없어. 여긴 숲이야. 노미요, 여긴 숲이야.'],
  ],
};
const NOTE_LINES = {
  '3,16': [
    ["구겨진 쪽지: '나갈 수 없어. 놓아주지 않을거야. 아무도 못나가'"],
    ["구겨진 쪽지: '나갈 수 없어. 놓아주지 않을거야. 아무도 못나가'"],
    ["구겨진 쪽지: '나갈 수 없어. 놓아주지 않을거야. 아무도 못나가. 아무도. 아무도.'"],
  ],
  '23,19': [
    ["벽에 긁힌 글씨: '탈출구는 지하 깊은 곳'"],
    ["벽에 긁힌 글씨: '탈출구는 지하 깊은 곳... 아니, 어디에도'"],
    ["벽에 긁힌 글씨: 'ㅂㅗㄴㅐㅈㅝ ㅂㅗㄴㅐㅈㅝ'"],
  ],
};

function hash(x, y) {
  let h = (x * 374761393 + y * 668265263) | 0;
  h = ((h ^ (h >>> 13)) * 1274126177) | 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function glitch(text, amount) {
  if (amount <= 0) return text;
  const G = '▒▓░#%&';
  let out = '';
  for (const ch of text) out += ch !== ' ' && Math.random() < amount ? G[Math.floor(Math.random() * G.length)] : ch;
  return out;
}

export function createCastleGame({ canvas, onEvent = () => {} }) {
  const ctx = canvas.getContext('2d');
  canvas.width = CANVAS_W;
  canvas.height = CANVAS_H;
  ctx.imageSmoothingEnabled = false;
  const dark = document.createElement('canvas');
  dark.width = CANVAS_W;
  dark.height = CANVAS_H;
  const dctx = dark.getContext('2d');

  const W = MAP[0].length;
  const H = MAP.length;
  let tiles = [];
  let npcs = [];
  let player = null;
  let keys = new Set(); // 눌린 키
  let inventory = new Set();
  let tier = 0;
  let time = 0;
  let state = 'idle'; // idle | play | dialog | closing | won | over
  let dialog = null; // { speaker, lines, index, shown, glitchAmount, onDone, auto, autoT }
  let toast = null; // { text, timer }
  let active = false;
  let flicker = [];
  let revealedX = false;
  let elapsed = 0;
  let presence = 1; // 파닥이 NPC 가 보이는 정도 (0 안 보임 ~ 1 또렷+대화 가능)
  let save = null; // 진행 저장 (이 세션 동안 유지)
  let introSeen = false;
  let roomAEntered = false; // 1일차 마무리(왼쪽 방 진입)를 이미 했는지
  let monsterEnabled = false;
  let monster = null; // { x, y, px, py, fromX, fromY, prog, moving, mode: 'chase'|'search'|'wander', alert, target }
  let hidden = null; // 옷장에 숨은 상태 { wx, wy }
  let staticFx = 0; // 치지직 화면 효과 남은 시간
  let scareFx = 0; // 괴물 등장 연출 남은 시간
  let stepsTaken = 0;
  let floor = 1; // 지하 몇 층인지 (1부터)
  let openedDrawers = new Set(); // 이 층에서 연 서랍 "x,y"

  /** 현재 층의 타일·NPC·플레이어를 MAP 에서 새로 만든다 (층 이동 시 재사용) */
  function buildFloor() {
    tiles = MAP.map((row) => row.split(''));
    npcs = [];
    revealedX = false;
    openedDrawers = new Set();
    monster = null;
    hidden = null;
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
    toast = { text: `계단을 내려왔다. 지하 ${floor}층.`, timer: 3 };
    onEvent('floor', { floor });
  }

  function reset(t) {
    tier = t;
    floor = 1;
    inventory = new Set();
    elapsed = 0;
    toast = null;
    dialog = null;
    staticFx = 0;
    scareFx = 0;
    stepsTaken = 0;
    roomAEntered = false;
    buildFloor();
    state = 'play';
  }

  // ---------- 저장 / 복원 ----------
  function snapshot() {
    return {
      tiles: tiles.map((r) => r.join('')),
      x: player.x,
      y: player.y,
      dir: player.dir,
      inventory: [...inventory],
      revealedX,
      elapsed,
      roomAEntered,
      floor,
      drawers: [...openedDrawers],
      dead: npcs.filter((n) => !n.alive).map((n) => n.key),
    };
  }
  function restore(sv) {
    tiles = sv.tiles.map((r) => r.split(''));
    player = { x: sv.x, y: sv.y, px: sv.x, py: sv.y, dir: sv.dir, moving: false, prog: 0, fromX: sv.x, fromY: sv.y, step: 0 };
    inventory = new Set(sv.inventory);
    revealedX = sv.revealedX;
    elapsed = sv.elapsed;
    roomAEntered = !!sv.roomAEntered;
    floor = sv.floor ?? 1;
    openedDrawers = new Set(sv.drawers ?? []);
    for (const n of npcs) if (sv.dead.includes(n.key)) n.alive = false;
  }

  /** opts: { tier, presence, monster } */
  function start(opts = {}) {
    const o = typeof opts === 'number' ? { tier: opts } : opts;
    reset(o.tier ?? 0);
    presence = o.presence ?? 1;
    monsterEnabled = !!o.monster;
    if (save) restore(save);
    active = true;
    keys.clear();
    if (o.skipIntro) introSeen = true; // 디버그
    if (o.at) { // 디버그(?gat=x,y[,dir]): 시작 좌표(와 바라보는 방향) 지정
      player.x = player.px = player.fromX = o.at[0];
      player.y = player.py = player.fromY = o.at[1];
      if (o.at[2] && DIRS[o.at[2]]) player.dir = o.at[2];
    }
    if (o.inv) for (const it of o.inv) inventory.add(it); // 디버그(?ginv=cup,cupWater,a,b)
    if (!introSeen) {
      introSeen = true;
      say('', INTRO_LINES, { onDone: () => (toast = { text: '방향키로 이동 · E 조사', timer: 4 }) });
    } else toast = { text: save ? '이어서 시작' : '방향키로 이동 · E 조사', timer: 3 };
  }
  function stop() {
    // 게임 오버/탈출은 저장하지 않는다 (게임 오버는 이전 저장 지점에서 다시)
    if (active && state !== 'won' && state !== 'over') save = snapshot();
    active = false;
    state = 'idle';
    keys.clear();
  }

  // ---------- 타일 질의 ----------
  const at = (x, y) => (x < 0 || y < 0 || x >= W || y >= H ? '#' : tiles[y][x]);
  const ghostAt = (x, y) => npcs.find((n) => n.alive && n.x === x && n.y === y);
  const npcAt = (x, y) => (presence >= 1 ? ghostAt(x, y) : null); // 또렷해진 뒤에만 부딪히고 대화할 수 있음
  const BLOCK = new Set(['#', 'T', 'X', 'N', 'J', 'W', '1', '2', 'D', 'S', 'F', 'f', 'G']);
  function walkable(x, y) {
    if (BLOCK.has(at(x, y))) return false;
    if (npcAt(x, y)) return false;
    return true;
  }
  const monsterWalkable = (x, y) => !BLOCK.has(at(x, y));
  const inRoomA = (x, y) => x >= ROOM_A.minX && x <= ROOM_A.maxX && y >= ROOM_A.minY && y <= ROOM_A.maxY;

  // ---------- 입력 ----------
  const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
  function keydown(code) {
    if (!active) return;
    keys.add(code);
    if (code === 'KeyE' || code === 'Enter' || code === 'Space') {
      if (state === 'dialog') advanceDialog();
      else if (state === 'play') interact();
      else if (state === 'closing') onEvent('exit');
    }
  }
  function keyup(code) {
    keys.delete(code);
  }
  /** 마우스 클릭: 대화 넘기기 / 방송 끄기 버튼 (E 와 동일) */
  function click() {
    if (!active) return;
    if (state === 'dialog') advanceDialog();
    else if (state === 'closing') onEvent('exit');
  }
  function heldDir() {
    if (keys.has('ArrowUp') || keys.has('KeyW')) return 'up';
    if (keys.has('ArrowDown') || keys.has('KeyS')) return 'down';
    if (keys.has('ArrowLeft') || keys.has('KeyA')) return 'left';
    if (keys.has('ArrowRight') || keys.has('KeyD')) return 'right';
    return null;
  }

  // ---------- 대화 ----------
  let afterDialog = 'play'; // 대화가 끝나면 돌아갈 상태
  function say(speaker, lines, { glitchAmount = 0, onDone = null, auto = 0, next = 'play' } = {}) {
    afterDialog = next;
    state = 'dialog';
    dialog = { speaker, lines, index: 0, shown: 0, glitchAmount, onDone, auto, autoT: auto, cache: null };
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

  // ---------- 상호작용 ----------
  function interact() {
    if (hidden) return leaveWardrobe();
    const [dx, dy] = DIRS[player.dir];
    const tx = player.x + dx;
    const ty = player.y + dy;
    const npc = npcAt(tx, ty);
    if (npc) return talkTo(npc);
    const ghost = ghostAt(tx, ty);
    if (ghost && presence > 0) {
      // 아직 희미한 파닥이: 잠깐 모습을 드러내고 사라짐
      ghost.showing = true;
      ghost.showT = 0.6;
      toast = { text: presence >= 0.6 ? '...누군가 서 있다. 말이 닿지 않는다.' : '...거기 누가 있는 것 같다.', timer: 2.5 };
      return;
    }
    const c = at(tx, ty);
    if (c === '1' || c === '2') {
      const need = c === '1' ? 'a' : 'b';
      if (inventory.has(need)) {
        inventory.delete(need);
        tiles[ty][tx] = '.';
        toast = { text: `${need === 'a' ? '청동 열쇠' : '은 열쇠'}로 문을 열었다.`, timer: 2.5 };
        onEvent('door');
      } else {
        say('', ['잠겨 있다. ' + (need === 'a' ? '청동 열쇠' : '은 열쇠') + '가 필요해 보인다.']);
      }
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
      const lines = NOTE_LINES[`${tx},${ty}`]?.[tier] ?? ['아무것도 적혀 있지 않다.'];
      say('', lines, { glitchAmount: tier === 2 ? 0.12 : 0 });
      return;
    }
    if (c === 'J') return readDiary(tx, ty);
    if (c === 'W') return enterWardrobe(tx, ty);
    if (c === 'T') return say('', ['횃불이 타오르고 있다. 따뜻하다.']);
    if (c === 'D') return openDrawer(tx, ty);
    if (c === 'S') return useSink();
    if (c === 'F') return touchBrazier(tx, ty);
    if (c === 'f') return pushBrazier(tx, ty);
    if (c === 'G') return say('', ['식은 화로. 이제 문을 막지 않는다.']);
  }

  // ---------- 서랍 / 세면대 / 화로 ----------
  const hasCup = () => inventory.has('cup') || inventory.has('cupWater');
  function openDrawer(tx, ty) {
    const key = `${tx},${ty}`;
    if (openedDrawers.has(key)) return say('', ['빈 서랍이다.']);
    openedDrawers.add(key);
    onEvent('drawer');
    const table = FLOOR_ITEMS[Math.min(floor, Math.max(...Object.keys(FLOOR_ITEMS).map(Number)))] ?? {};
    const it = table[key];
    if (!it) return say('', ['빈 서랍이다.']);
    if (Array.isArray(it)) return say('', it, { glitchAmount: tier === 2 ? 0.1 : 0 });
    if (it.item === 'cup') {
      if (hasCup()) return say('', ['물컵이 하나 더 있다. 하나면 충분하다.']);
      inventory.add('cup');
      onEvent('key');
    }
    say('', it.lines);
  }
  function useSink() {
    if (inventory.has('cupWater')) return say('', ['물컵은 이미 가득 차 있다.']);
    if (!inventory.has('cup')) return say('', ['세면대. 수도꼭지에서 물이 졸졸 흐른다.', '담을 게 없다.']);
    inventory.delete('cup');
    inventory.add('cupWater');
    onEvent('fill');
    say('', ['수도꼭지를 틀었다. 물컵에 물을 가득 담았다.']);
  }
  function touchBrazier(tx, ty) {
    if (!inventory.has('cupWater')) return say('', ['화로가 문을 막고 있다. 뜨거워서 만질 수 없어.']);
    inventory.delete('cupWater');
    inventory.add('cup');
    tiles[ty][tx] = 'f';
    onEvent('extinguish');
    say('', ['물을 끼얹었다. 치이익—', '불이 꺼졌다. 이제 만질 수 있을 것 같다.']);
  }
  function pushBrazier(tx, ty) {
    const side = at(tx + 1, ty) === '.' ? tx + 1 : at(tx - 1, ty) === '.' ? tx - 1 : null;
    if (side === null) return say('', ['밀 자리가 없다.']);
    tiles[ty][tx] = '.';
    tiles[ty][side] = 'G';
    onEvent('door');
    say('', ['식은 화로를 옆으로 밀었다.', '문이 드러났다.']);
  }

  function talkTo(npc) {
    const lines = NPC_LINES[npc.key]?.[tier] ?? ['...'];
    npc.talked = true;
    say('파닥이', lines, {
      glitchAmount: tier === 2 ? 0.18 : tier === 1 ? 0.02 : 0,
      onDone: () => {
        if (tier === 2 && npc.alive) {
          npc.dying = 1.2; // 밴 이벤트: 글리치와 함께 사라짐
          onEvent('vanish');
        }
      },
    });
    onEvent('talk');
  }

  // 낡은 일기: 글이 잠깐 보였다가 치지직 → 전부 깨짐 → 노미요 "이게 뭐야" → 버림
  function readDiary(tx, ty) {
    say('', [DIARY_TEXT], {
      auto: 1.4,
      onDone: () => {
        staticFx = 0.9;
        onEvent('static');
        say('', [glitch(DIARY_TEXT, 1)], {
          glitchAmount: 1,
          auto: 1.3,
          onDone: () => {
            say('노미요', ['...이게 뭐야.'], {
              onDone: () => {
                tiles[ty][tx] = '.';
                toast = { text: '낡은 일기를 버렸다.', timer: 3 };
              },
            });
          },
        });
      },
    });
  }

  // ---------- 옷장 ----------
  function enterWardrobe(wx, wy) {
    hidden = { wx, wy };
    if (monster) {
      monster.mode = 'search';
      monster.target = { x: player.x, y: player.y };
    }
    toast = { text: '옷장 안에 숨었다. 괴물이 멀어지면 E 로 나온다.', timer: 3 };
    onEvent('hide');
  }
  function leaveWardrobe() {
    const far = !monster || Math.abs(monster.x - player.x) + Math.abs(monster.y - player.y) >= 7;
    if (!far) {
      toast = { text: '...아직 근처에 있다. 숨을 죽이자.', timer: 2 };
      return;
    }
    hidden = null;
    if (monster) {
      monster.mode = 'wander';
      monster.alert = 6; // 잠시 뒤 다시 쫓아온다
    }
    toast = { text: '옷장에서 나왔다.', timer: 2 };
  }

  // ---------- 괴물 ----------
  function bfsNext(from, to) {
    // from 에서 to 로 가는 최단 경로의 첫 걸음 (없으면 null)
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
  function spawnMonster() {
    const cands = [
      [12, 10],
      [12, 16],
      [24, 12],
      [9, 4],
      [3, 10],
    ];
    let best = null;
    for (const [x, y] of cands) {
      const d = Math.abs(x - player.x) + Math.abs(y - player.y);
      if (monsterWalkable(x, y) && d >= 6 && (!best || d < best.d)) best = { x, y, d };
    }
    if (!best) best = { x: 12, y: 10 };
    monster = { x: best.x, y: best.y, px: best.x, py: best.y, fromX: best.x, fromY: best.y, prog: 0, moving: false, mode: 'chase', alert: 0, target: null, stepTime: 0.34 };
    scareFx = 1.0;
    onEvent('monster');
  }
  function updateMonster(dt) {
    const m = monster;
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
      // 숨지 않은 노미요가 가까이 오면 다시 알아챔
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
    if (dialog) {
      const full = dialog.lines[dialog.index];
      if (dialog.shown < full.length) dialog.shown = Math.min(full.length, dialog.shown + dt * 28);
      else if (dialog.auto > 0) {
        dialog.autoT -= dt;
        if (dialog.autoT <= 0) advanceDialog();
      }
    }
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
      if (n.dying !== undefined) {
        n.dying -= dt;
        n.fade = Math.max(0, n.dying / 1.2);
        if (n.dying <= 0) {
          n.alive = false;
          n.dying = undefined;
          toast = { text: '...파닥이가 사라졌다.', timer: 3 };
        }
      }
    }
    if (monster && (state === 'play' || state === 'dialog')) updateMonster(dt);

    if (state !== 'play') return;
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
      const d = heldDir();
      if (d) {
        player.dir = d;
        const [dx, dy] = DIRS[d];
        if (walkable(player.x + dx, player.y + dy)) {
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
    // 2일차부터: 첫 걸음에 괴물 등장
    if (monsterEnabled && !monster && stepsTaken >= 1) spawnMonster();
    if (monster && monster.x === player.x && monster.y === player.y) return caught();
    const c = at(player.x, player.y);
    if (c === 'a' || c === 'b') {
      inventory.add(c);
      tiles[player.y][player.x] = '.';
      toast = { text: `${c === 'a' ? '청동 열쇠' : '은 열쇠'}를 주웠다!`, timer: 2.5 };
      onEvent('key');
    } else if (c === 'E') {
      if (floor < FLOOR_COUNT) return nextFloor();
      state = 'won';
      save = null; // 탈출하면 다음 접속은 처음부터
      onEvent('win', { elapsed });
      say('노미요', ['탈출 성공! 미요미요~ 다들 고마워요!', '오늘 방송은 여기까지! 다음에 또 봐요~'], {
        next: 'won',
        onDone: () => onEvent('exit', { elapsed }),
      });
      return;
    }
    // 1일차: 왼쪽 문 너머 방에 처음 들어가면 방송 마무리
    if (!roomAEntered && inRoomA(player.x, player.y)) {
      roomAEntered = true;
      onEvent('dayend');
      say('노미요', CLOSING_LINES, { next: 'closing' });
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
    ctx.fillStyle = n === '1' ? '#c98a3a' : '#cfd4dc';
    ctx.fillRect(sx + 12, sy + 13, 8, 7);
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(sx + 15, sy + 15, 2, 3);
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
  function drawNote(sx, sy, diary = false) {
    drawFloor(sx, sy, 0, 0);
    ctx.fillStyle = diary ? '#6b4a2e' : '#e9e2cf';
    ctx.fillRect(sx + 9, sy + 8, 14, 17);
    if (diary) {
      ctx.fillStyle = '#c9a35a';
      ctx.fillRect(sx + 11, sy + 10, 10, 13);
      ctx.fillStyle = '#6b4a2e';
      ctx.fillRect(sx + 9, sy + 8, 3, 17);
    } else {
      ctx.fillStyle = '#7a7060';
      for (let i = 0; i < 4; i++) ctx.fillRect(sx + 11, sy + 11 + i * 3, 10 - (i % 2) * 3, 1);
    }
  }
  function drawExit(sx, sy) {
    drawFloor(sx, sy, 0, 0);
    const last = floor >= FLOOR_COUNT;
    ctx.fillStyle = last ? '#0c1a12' : '#0a0a14';
    ctx.fillRect(sx + 4, sy + 2, TILE - 8, TILE - 2);
    const pulse = 0.5 + Math.sin(time * 3) * 0.3;
    if (last) {
      ctx.fillStyle = `rgba(120,255,170,${pulse * 0.5})`;
      ctx.fillRect(sx + 8, sy + 6, TILE - 16, TILE - 6);
      ctx.fillStyle = '#bff5d2';
      ctx.font = 'bold 9px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('EXIT', sx + 16, sy + 20);
    } else {
      // 아래로 내려가는 계단: 점점 어두워지는 단
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
  }
  function drawDrawer(sx, sy, open) {
    drawFloor(sx, sy, 0, 0);
    ctx.fillStyle = '#4a3220';
    ctx.fillRect(sx + 3, sy + 6, TILE - 6, TILE - 8);
    ctx.fillStyle = '#6b4a2e';
    ctx.fillRect(sx + 5, sy + 8, TILE - 10, 9);
    ctx.fillRect(sx + 5, sy + 19, TILE - 10, 9);
    if (open) {
      // 위 칸이 빠져나와 있고 안은 비어 어둡다
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
  function drawSink(sx, sy) {
    drawFloor(sx, sy, 0, 0);
    ctx.fillStyle = '#d8dde6';
    ctx.fillRect(sx + 5, sy + 12, TILE - 10, 14); // 세면대
    ctx.fillStyle = '#9fb3c8';
    ctx.fillRect(sx + 8, sy + 15, TILE - 16, 8); // 대야 안
    ctx.fillStyle = '#7fc4ff';
    ctx.fillRect(sx + 10, sy + 18, TILE - 20, 4); // 고인 물
    ctx.fillStyle = '#c0c6cf';
    ctx.fillRect(sx + 15, sy + 4, 3, 9); // 수도꼭지
    ctx.fillRect(sx + 15, sy + 4, 8, 3);
    const drip = (time * 1.5) % 1;
    ctx.fillStyle = '#bfe6ff';
    ctx.fillRect(sx + 21, sy + 7 + drip * 9, 2, 3); // 똑똑 떨어지는 물방울
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(sx + 5, sy + 26, TILE - 10, 2);
  }
  function drawBrazier(sx, sy, lit, i) {
    drawFloor(sx, sy, 0, 0);
    ctx.fillStyle = '#3a3238';
    ctx.beginPath();
    ctx.arc(sx + 16, sy + 20, 11, 0, Math.PI); // 대야
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
      // 꺼진 숯과 피어오르는 연기
      ctx.fillStyle = '#1e1a22';
      ctx.fillRect(sx + 9, sy + 14, 14, 5);
      const k = (time * 0.6) % 1;
      ctx.fillStyle = `rgba(160,160,170,${0.35 * (1 - k)})`;
      ctx.fillRect(sx + 14 + Math.sin(time * 2) * 3, sy + 12 - k * 12, 4, 4);
    }
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
  function drawChick(sx, sy, n) {
    const bob = Math.sin(n.bob * 4) * 1.5;
    ctx.save();
    ctx.globalAlpha = n.fade * n.vis;
    if ((n.dying !== undefined || n.vis < 1) && Math.random() < 0.5) ctx.translate((Math.random() - 0.5) * 6, 0);
    ctx.strokeStyle = '#5fa35a';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(sx + 16, sy + 12 + bob);
    ctx.lineTo(sx + 13, sy + 3 + bob);
    ctx.moveTo(sx + 16, sy + 12 + bob);
    ctx.lineTo(sx + 20, sy + 4 + bob);
    ctx.stroke();
    ctx.fillStyle = tier === 2 && n.talked ? '#d8cfd6' : '#fffdf7';
    ctx.strokeStyle = '#2a211d';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(sx + 16, sy + 21 + bob, 11, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = tier === 2 ? '#a02020' : '#2a211d';
    ctx.fillRect(sx + 11, sy + 19 + bob, 2, 2);
    ctx.fillRect(sx + 19, sy + 19 + bob, 2, 2);
    ctx.fillStyle = '#f7b3b3';
    ctx.fillRect(sx + 8, sy + 23 + bob, 3, 2);
    ctx.fillRect(sx + 21, sy + 23 + bob, 3, 2);
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
    const m = monster;
    const jx = (Math.random() - 0.5) * 3;
    const jy = (Math.random() - 0.5) * 3;
    ctx.save();
    ctx.translate(sx + 16 + jx, sy + 20 + jy);
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.beginPath();
    ctx.ellipse(0, 12, 16, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    // 검고 큰 덩어리, 위는 삐죽삐죽
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
    void m;
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
        if (c === '#') drawWall(sx, sy, x, y);
        else if (c === 'X') drawCrack(sx, sy, x, y);
        else if (c === '1' || c === '2') drawDoor(sx, sy, c);
        else if (c === 'W') drawWardrobe(sx, sy, hidden && hidden.wx === x && hidden.wy === y);
        else if (c === 'D') drawDrawer(sx, sy, openedDrawers.has(`${x},${y}`));
        else if (c === 'S') drawSink(sx, sy);
        else if (c === 'F') {
          drawBrazier(sx, sy, true, x * 31 + y);
          lights.push([sx + 16, sy + 14, 100 + Math.sin(time * 9 + x + y) * 6, 1]);
        } else if (c === 'f' || c === 'G') drawBrazier(sx, sy, false, 0);
        else if (c === 'T') {
          drawTorch(sx, sy, x * 31 + y);
          lights.push([sx + 16, sy + 10, 90 + Math.sin(time * 9 + x + y) * 6, 0.95]);
        } else if (c === 'N') drawNote(sx, sy);
        else if (c === 'J') drawNote(sx, sy, true);
        else if (c === 'E') {
          drawExit(sx, sy);
          lights.push([sx + 16, sy + 16, 70, 0.7]);
        } else {
          drawFloor(sx, sy, x, y);
          if (c === 'a' || c === 'b') drawKey(sx, sy, c, time + x);
        }
      }
    }
    for (const n of npcs) if (n.alive && n.vis > 0.01) drawChick(ox + n.x * TILE, oy + n.y * TILE, n);
    const pxs = ox + player.px * TILE;
    const pys = oy + player.py * TILE;
    if (!hidden) drawFox(pxs, pys);
    if (monster) drawMonster(ox + monster.px * TILE, oy + monster.py * TILE);
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
    if (monster && !hidden) {
      const d = Math.abs(monster.px - player.px) + Math.abs(monster.py - player.py);
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

  // 괴물 등장 연출: 화면 가득한 검은 실루엣 + 붉은 눈 (두둥)
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
    const m = Math.floor(elapsed / 60);
    const s = Math.floor(elapsed % 60);
    ctx.textAlign = 'right';
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(CANVAS_W - 100, hy, 92, 26);
    ctx.fillStyle = '#ffb070';
    ctx.textAlign = 'left';
    ctx.fillText(`B${floor}`, CANVAS_W - 94, hy + 17);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#e8e6df';
    ctx.fillText(`${m}:${s.toString().padStart(2, '0')}`, CANVAS_W - 14, hy + 17);
  }

  function drawDialog() {
    const full = dialog.lines[dialog.index];
    const shown = full.slice(0, Math.floor(dialog.shown));
    if (!dialog.cache || dialog.cache.len !== shown.length || dialog.glitchAmount > 0.1) {
      dialog.cache = { len: shown.length, text: glitch(shown, dialog.glitchAmount) };
    }
    const bx = 16;
    const bh = 92;
    const by = CANVAS_H - bh - 36;
    const bw = CANVAS_W - 32;
    ctx.fillStyle = 'rgba(8,8,18,0.92)';
    ctx.fillRect(bx, by, bw, bh);
    ctx.strokeStyle = dialog.glitchAmount > 0.1 ? '#c8102e' : '#ffb070';
    ctx.lineWidth = 2;
    ctx.strokeRect(bx + 1, by + 1, bw - 2, bh - 2);
    ctx.textAlign = 'left';
    let ty = by + 24;
    if (dialog.speaker) {
      ctx.fillStyle = '#ffb070';
      ctx.font = 'bold 13px "Malgun Gothic", system-ui, sans-serif';
      ctx.fillText(dialog.speaker, bx + 14, ty);
      ty += 20;
    }
    ctx.fillStyle = '#f2efe6';
    ctx.font = '14px "Malgun Gothic", system-ui, sans-serif';
    const maxW = bw - 28;
    let line = '';
    for (const ch of dialog.cache.text) {
      if (ctx.measureText(line + ch).width > maxW) {
        ctx.fillText(line, bx + 14, ty);
        ty += 20;
        line = ch;
      } else line += ch;
    }
    ctx.fillText(line, bx + 14, ty);
    if (dialog.shown >= full.length && dialog.auto <= 0 && Math.sin(time * 6) > 0) {
      ctx.fillStyle = '#ffb070';
      ctx.font = '12px monospace';
      ctx.textAlign = 'right';
      ctx.fillText('▼ E / 클릭', bx + bw - 12, by + bh - 10);
    }
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
  };
}
