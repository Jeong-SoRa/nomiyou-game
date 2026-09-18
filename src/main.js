import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createFox } from './characters/fox.js';
import { createChick } from './characters/chick.js';
import { createMonster } from './characters/monster.js';
import { createHouse } from './world/house.js';
import { createForest } from './world/forest.js';
import { lerpAngle, rand } from './helpers.js';
import { createChatLog } from './ui/chatLog.js';
import { createStreamSim } from './systems/streamSim.js';
import { createInteractPrompt } from './ui/interactPrompt.js';
import { createGameScreen } from './ui/gameScreen.js';
import { createNotice } from './ui/notice.js';
import { createChickTalker, tierIndexForDay } from './systems/chickDialogue.js';
import { createDayPlan, HINTS, HINTS_FOR_DAY, LAST_DAY } from './systems/dayPlan.js';
import { createCastleGame } from './game/castle.js';
import { createScare } from './systems/scare.js';
import { createAudio } from './systems/audio.js';
import { createSettings } from './ui/settings.js';

// 디버그용 URL 파라미터: ?world=forest, ?viadoor=1, ?keys=KeyW,ShiftLeft, ?horror=1, ?sit=1, ?stream=1|now, ?day=N, ?done=stream,recruit,
//   ?companion=1, ?talk=1, ?cam=x,y,z, ?at=x,z, ?yaw=&dist=&height=, ?steps=N, ?gkeys=ArrowLeft, ?pickaxe=1, ?smash=1|hits|chop|statue|warn|choice|rubble|monster, ?monster=1, ?mcam=side,up,front
const params = new URLSearchParams(location.search);

// ---------- 렌더러 / 씬 / 카메라 ----------
const renderer = new THREE.WebGLRenderer({ antialias: true, stencil: true }); // stencil: 창밖 풍경을 창 구멍으로만 그리기 위해
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 200);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.enablePan = false;
controls.minDistance = 4;
controls.maxDistance = 16;
controls.maxPolarAngle = Math.PI / 2 - 0.06;

const modeEl = document.getElementById('mode');
const dayEl = document.getElementById('day');
const fadeEl = document.getElementById('fade');
const dayCardEl = document.getElementById('dayCard');
const choiceEl = document.getElementById('choice');
const endingEl = document.getElementById('ending');
const glitchEl = document.getElementById('glitch');
const sysWarnEl = document.getElementById('sysWarn');

// ---------- 캐릭터 ----------
const fox = createFox();
scene.add(fox.group);
const foxState = { heading: 0, velocity: new THREE.Vector3(), sitting: false };

const chickScales = [0.6, 0.6, 0.56];
let chicks = [];
function makeChickRecord(char, pos, extra = {}) {
  return {
    char,
    home: pos.clone(),
    target: pos.clone(),
    wait: rand(0.5, 2),
    heading: rand(0, Math.PI * 2),
    speed: rand(1.4, 2.0),
    talker: createChickTalker(),
    follow: false, // true 면 노미요를 따라다니는 동행 파닥이
    ...extra,
  };
}
// 동행 파닥이: 3·5·6·7일차에 방 안 파닥이에게 말을 걸면 노미요를 따라 숲까지 같이 간다 (월드 전환 시 다시 생성)
let companion = null; // { scale }

// ---------- 날짜 / 하루 일정 ----------
// 하루는 침대에서 잠을 자야 지나간다. 그날의 일정(plan)을 다 끝내야 잘 수 있다.
let day = Math.max(1, Math.min(LAST_DAY, parseInt(params.get('day') || '1', 10) || 1));
const plan = createDayPlan(day);
const notice = createNotice();
function setDay(n) {
  day = n;
  dayEl.textContent = `DAY ${day}`;
  plan.setDay(n);
}
setDay(day);
// 고성 게임 속 파닥이가 보이는 정도: 1일차 안 보임 → 2~4일차 얼핏얼핏 → 5일차부터 또렷(대화 가능)
function presenceFor(d) {
  return horror ? 1 : ([0, 0, 0.2, 0.45, 0.7][d] ?? 1);
}
// 날짜에 따른 으스스함 (4일차부터 방/숲이 붉고 어두워지며 7일차에 최대). 공포 모드(H)면 1
function dreadFor(d) {
  return d >= 4 ? Math.min(1, (d - 3) * 0.25) : 0;
}
// 숲의 시간대: 1~3일차 밝은 아침(1) → 4일차 해질녘 → 5일차부터 밤(0). 공포 모드면 밤
function daylightFor(d) {
  if (horror) return 0;
  return d <= 3 ? 1 : d === 4 ? 0.45 : 0;
}
let daylight = 0; // 실제 화면에 적용되는 값 (daylightFor 로 서서히 수렴)
// 우상단 모드 배지 글자
function modeLabel() {
  if (horror) return 'HORROR';
  if (streaming) return 'LIVE';
  if (world?.group.name === 'house') return 'HOME';
  return daylightFor(day) > 0.5 ? 'MORNING' : daylightFor(day) > 0 ? 'DUSK' : 'NIGHT';
}
// 방송(구독 이벤트)으로 생성된 파닥이 — 월드 전환 후에도 유지되도록 별도 추적
let sessionChicks = []; // [{ worldName, position: Vector3, scale }]
let collectedHints = new Set();

// ---------- 월드 로딩 / 전환 ----------
const worldFactories = { house: createHouse, forest: createForest };
let world = null;
let doorArmed = false; // 문 근처에서 스폰된 직후 바로 다시 전환되지 않도록

function placeFox(spawn) {
  fox.group.position.copy(spawn.position);
  foxState.heading = spawn.heading;
  foxState.velocity.set(0, 0, 0);
  foxState.sitting = false;
  fox.group.rotation.y = spawn.heading;
}

function addChick(pos, scale, extra) {
  const c = createChick({ scale });
  c.group.position.copy(pos);
  c.setExpression(horror ? 'stern' : 'dot');
  scene.add(c.group);
  const rec = makeChickRecord(c, pos, extra);
  chicks.push(rec);
  return rec;
}

function loadWorld(name, { viaDoor = false } = {}) {
  if (world) {
    scene.remove(world.group);
    for (const c of chicks) scene.remove(c.char.group);
  }
  world = worldFactories[name]();
  scene.add(world.group);
  world.setup(scene);

  const spawn = viaDoor ? world.doorSpawn : world.foxSpawn;
  placeFox(spawn);
  doorArmed = false;

  chicks = [];
  world.chickSpawns.forEach((pos, i) => addChick(pos, chickScales[i % chickScales.length]));
  // 방송으로 생성된 파닥이 복원 (이 월드에 속한 것만)
  for (const rec of sessionChicks.filter((r) => r.worldName === name)) addChick(rec.position, rec.scale);
  // 동행 파닥이는 노미요 옆에서 다시 시작
  if (companion) {
    const pos = fox.group.position.clone();
    pos.x += Math.cos(foxState.heading) * 1.2;
    addChick(pos, companion.scale, { follow: true });
  }
  applyDayProps();

  // 카메라를 여우 뒤쪽으로 재배치 (스폰 지점별로 거리/높이 지정 가능)
  const cam = spawn.camera ?? { back: 9, height: world.cameraStart.y };
  controls.target.copy(fox.group.position).y += 1.4;
  if (cam.offset) {
    // 타깃 기준 상대 위치로 직접 지정 (여우 뒤가 벽으로 막힌 스폰용)
    camera.position.copy(controls.target).add(new THREE.Vector3(...cam.offset));
  } else {
    const fwd = new THREE.Vector3(Math.sin(foxState.heading), 0, Math.cos(foxState.heading));
    camera.position.copy(controls.target).addScaledVector(fwd, -cam.back);
    camera.position.y = cam.height;
  }
  modeEl.textContent = modeLabel();
}

// 숲 소품을 날짜/진행에 맞춰 보이기
function applyDayProps() {
  const p = world.props;
  if (!p) return;
  p.grapes.group.visible = true;
  p.grapes.bunches.visible = plan.has('grapes') && !plan.isDone('grapes');
  p.bush.group.visible = true;
  p.soundSpot.group.visible = day >= 4;
  const todays = HINTS_FOR_DAY[day] ?? [];
  for (const h of p.hints) h.group.visible = todays.includes(h.index) && !collectedHints.has(h.index);
  // 커다란 나무 상자는 항상 보인다. 곡괭이는 힌트를 다 모은 뒤(7일차) 아직 줍지 않았을 때만
  p.crate.group.visible = true;
  p.pickaxe.group.visible = plan.has('pickaxe') && !plan.isDone('pickaxe');
}

let transitioning = false;
// 화면을 검게 덮었다가(fade) 가운데서 fn 을 실행하고 다시 밝힌다
function fadeThen(fn, { hold = 120 } = {}) {
  if (transitioning) return false;
  if (params.has('nofade')) {
    fn(); // 디버그(헤드리스 스크린샷): 타이머 없이 즉시
    return true;
  }
  transitioning = true;
  fadeEl.classList.add('on');
  setTimeout(() => {
    fn();
    setTimeout(() => {
      fadeEl.classList.remove('on');
      transitioning = false;
    }, hold);
  }, 380);
  return true;
}
function switchWorld(name) {
  if (transitioning) return;
  if (streaming) stopStreaming({ instant: true });
  audio.sfx.door();
  fadeThen(() => loadWorld(name, { viaDoor: true }));
}

// ---------- 공포 모드 ----------
let horror = false;
let horrorBlend = 0;
let streaming = false; // 방송 상태 (아래 방송 섹션에서 제어. setHorror 가 먼저 실행되므로 여기서 선언)
function setHorror(on) {
  horror = on;
  modeEl.textContent = modeLabel();
  modeEl.classList.toggle('horror', on);
  for (const c of chicks) c.char.setExpression(on ? 'stern' : 'dot');
  if (!on) fox.setExpression('dot');
}

// 디버그: 오늘 일정 일부를 끝낸 상태로 시작 (?done=stream,recruit) / 동행 파닥이와 시작 (?companion=1)
for (const id of (params.get('done') || '').split(',')) if (id) plan.complete(id);
if (params.has('companion')) companion = { scale: 0.6 };

loadWorld(params.get('world') === 'forest' ? 'forest' : 'house', { viaDoor: params.has('viadoor') }); // ?viadoor=1: 문으로 들어온 위치/방향으로 시작
setHorror(params.has('horror'));
horrorBlend = horror ? 1 : dreadFor(day);
daylight = daylightFor(day);

// 디버그용 카메라 시작 위치
if (params.has('yaw') || params.has('dist') || params.has('height')) {
  const yaw = parseFloat(params.get('yaw') ?? '0');
  const dist = parseFloat(params.get('dist') ?? '10');
  const height = parseFloat(params.get('height') ?? '4.5');
  const flat = Math.sqrt(Math.max(dist * dist - height * height, 1));
  camera.position.set(controls.target.x + Math.sin(yaw) * flat, height, controls.target.z + Math.cos(yaw) * flat);
}

// ---------- 입력 ----------
const keys = new Set();
const audio = createAudio();
const settings = createSettings(audio);
window.addEventListener('keydown', (e) => {
  audio.unlock(); // 브라우저 정책상 첫 키 입력 뒤에야 소리를 낼 수 있음
  if (e.code === 'KeyO' || (e.code === 'Escape' && settings.isOpen())) {
    settings.toggle();
    return;
  }
  if (settings.isOpen()) return; // 설정창이 열려 있으면 게임 키 무시 (슬라이더 방향키 조작용)
  if (e.code === 'KeyM') {
    notice.show(audio.toggleMute() ? '음소거' : '소리 켜짐', 1.5);
    settings.syncMute();
  }
  if (ending) {
    if (e.code === 'KeyR') location.reload();
    return;
  }
  if (choiceOpen) {
    if (e.code === 'Digit1' || e.code === 'Numpad1') resolveChoice('release');
    if (e.code === 'Digit2' || e.code === 'Numpad2') resolveChoice('keep');
    return;
  }
  // 게임 화면이 켜져 있으면 키 입력은 미니게임으로. Esc 만 접속 종료
  if (castle.isActive()) {
    if (e.code === 'Escape') endStream();
    else castle.keydown(e.code);
    if (e.code.startsWith('Arrow') || e.code === 'Space') e.preventDefault();
    return;
  }
  keys.add(e.code);
  if (e.code === 'KeyF') fox.setExpression(fox.getExpression() === 'dot' ? 'happy' : 'dot');
  if (e.code === 'KeyG' && chicks.length) {
    const order = ['dot', 'happy', 'wink', 'stern'];
    const next = order[(order.indexOf(chicks[0].char.getExpression()) + 1) % order.length];
    for (const c of chicks) c.char.setExpression(next);
  }
  if (e.code === 'KeyH') setHorror(!horror);
  if (e.code === 'KeyE') interact();
  if (e.code === 'Escape' && streaming) endStream(); // 오프닝 멘트 중 취소
});
window.addEventListener('keyup', (e) => {
  keys.delete(e.code);
  castle.keyup(e.code);
});
window.addEventListener('blur', () => {
  keys.clear();
  for (const k of (params.get('keys') || '').split(',')) if (k) keys.add(k);
});
for (const k of (params.get('keys') || '').split(',')) if (k) keys.add(k);

// ---------- 앉기 ----------
function sitDown() {
  const seat = world.seat;
  foxState.sitting = true;
  foxState.velocity.set(0, 0, 0);
  fox.group.position.copy(seat.position);
  foxState.heading = seat.heading;
  fox.group.rotation.y = seat.heading;
}
function standUp() {
  foxState.sitting = false;
  fox.group.position.copy(world.seat.approach);
  foxState.heading = 0;
}

// ---------- 상호작용 (E) ----------
const prompt = createInteractPrompt();
const tmpPrompt = new THREE.Vector3();
const near = (spot) =>
  !!spot && Math.hypot(fox.group.position.x - spot.approach.x, fox.group.position.z - spot.approach.z) <= spot.radius;
const nearProp = (p) =>
  !!p && p.group.visible && Math.hypot(fox.group.position.x - p.position.x, fox.group.position.z - p.position.z) <= p.radius;
// 노미요가 실제로 그 방향을 보고 있는지 (좌우 60도 안). 큰 상자처럼 방향을 등지고도 상호작용하면 어색한 대상에 사용
const FACE_CONE = Math.PI / 3;
const facingTarget = (target) => {
  const dx = target.x - fox.group.position.x;
  const dz = target.z - fox.group.position.z;
  if (Math.hypot(dx, dz) < 0.05) return true;
  const diff = Math.atan2(Math.sin(Math.atan2(dx, dz) - foxState.heading), Math.cos(Math.atan2(dx, dz) - foxState.heading));
  return Math.abs(diff) <= FACE_CONE;
};
const walking = () => !streaming && !transitioning && !foxState.sitting;
const hasCompanion = () => chicks.some((c) => c.follow);

// 파닥이에게 말 걸기: 가까운(TALK_RADIUS) 파닥이 중 가장 가까운 것. 말하는 중이면 제외
const TALK_RADIUS = 2.4;
function nearestChick() {
  if (!walking()) return null;
  let best = null;
  let bestD = TALK_RADIUS;
  for (const c of chicks) {
    if (c.char.isTalking()) continue;
    const d = Math.hypot(c.char.group.position.x - fox.group.position.x, c.char.group.position.z - fox.group.position.z);
    if (d < bestD) {
      bestD = d;
      best = c;
    }
  }
  return best;
}

/**
 * 지금 E 를 누르면 할 수 있는 것 하나를 고른다 (안내 라벨 + 위치 + 실행 함수).
 * 우선순위: 방송 화면 진입 대기 > 데스크 > 침대 > 숲 소품 > 파닥이
 */
function currentAction() {
  if (transitioning || choiceOpen || ending || crateOpened) return null;
  if (streaming && introReady && !castle.isActive()) {
    return { label: '계속하기', at: tmpPrompt.copy(fox.group.position).setY(3.4), run: enterGame };
  }
  if (!walking()) return null;
  if (near(world.computer)) return { label: '게임 방송 시작', at: world.computer.prompt, run: startStreaming };
  if (near(world.bed)) return { label: '잠자기', at: world.bed.prompt, run: trySleep };
  const p = world.props;
  if (p) {
    if (nearProp(p.grapes) && plan.pending('grapes')) return { label: '포도 따 먹기', at: p.grapes.prompt, run: eatGrapes };
    if (nearProp(p.bush) && plan.pending('forest_check')) return { label: '풀숲 확인하기', at: p.bush.prompt, run: checkBush };
    if (nearProp(p.soundSpot) && plan.pending('sound_check')) return { label: '소리 확인하기', at: p.soundSpot.prompt, run: checkSound };
    if (plan.pending('hints')) {
      const h = p.hints.find((h) => nearProp(h));
      if (h) return { label: '힌트 줍기', at: h.prompt, run: () => pickHint(h) };
    }
    if (nearProp(p.pickaxe) && plan.pending('pickaxe')) return { label: '곡괭이 집기', at: p.pickaxe.prompt, run: takePickaxe };
    if (nearProp(p.crate) && !crateOpened && facingTarget(p.crate.group.position)) {
      if (plan.pending('escape')) return { label: `상자 부수기 ${crateHits}/${p.crate.HITS}`, at: p.crate.prompt, run: hitCrate };
      return { label: '상자 살펴보기', at: p.crate.prompt, run: inspectCrate };
    }
  }
  const c = nearestChick();
  if (c) return { label: '말 걸기', at: tmpPrompt.copy(c.char.group.position).setY(2.1), run: () => talkTo(c) };
  return null;
}
function interact() {
  const a = currentAction();
  if (a) a.run();
}

const scare = createScare({ flashEl: document.getElementById('scareFlash') });

// 동행 요청 대사 (recruit): 날짜별
const RECRUIT_LINES = {
  3: ['밖에서... 눈이 빨간 무서운 걸 봤어.', '같이 가서 확인해 줄래? 혼자는 무서워.'],
  5: ['탈출 지점 힌트 말이야, 숲에 흩어져 있대.', '같이 찾으러 가자. 나도 갈게.'],
  6: ['남은 힌트도 찾으러 가자.', '이번엔 꼭 다 모으자.'],
  7: ['...노미요. 오늘이야.', '곡괭이를 찾아서, 그 상자까지 같이 가 줄래?'],
};
function talkTo(c) {
  const g = c.char.group;
  c.heading = Math.atan2(fox.group.position.x - g.position.x, fox.group.position.z - g.position.z);
  // 오늘 동행이 필요한데 아직 안 했으면: 이 파닥이가 동행이 된다
  if (plan.pending('recruit') && !c.follow) {
    const lines = RECRUIT_LINES[day] ?? ['같이 가자.'];
    c.wait = 99;
    sayLines(c.char, lines, () => {
      c.follow = true;
      companion = { scale: c.char.group.scale.x };
      plan.complete('recruit');
      fox.say('그래, 같이 가자.', 2);
    });
    return;
  }
  const line = c.talker.next(day, { horror });
  c.char.say(line.text, line.duration, { scare: line.scare });
  audio.sfx.babble(line.text.length, line.scare ? { base: 300, spread: 500, rate: 0.05 } : {});
  c.wait = line.duration + 0.8;
  if (line.scare) {
    scare.trigger();
    c.char.setExpression('stern');
    setTimeout(() => c.char.setExpression(horror ? 'stern' : 'dot'), line.duration * 1000);
  }
}
// 여러 줄을 차례로 말풍선으로 (각 줄 길이에 비례한 시간). 노미요가 아니면 파닥이 옹알이 효과음
function sayLines(char, lines, onDone) {
  let i = 0;
  const next = () => {
    if (i >= lines.length) return onDone && onDone();
    const text = lines[i++];
    const dur = 1.6 + text.length * 0.07;
    char.say(text, dur);
    if (char !== fox) audio.sfx.babble(text.length);
    setTimeout(next, dur * 1000 + 150);
  };
  next();
}

// ---------- 날짜 이벤트: 숲 ----------
function eatGrapes() {
  world.props.grapes.bunches.visible = false;
  audio.sfx.eat();
  plan.complete('grapes');
  fox.setExpression('happy');
  sayLines(fox, ['냠냠... 달다!', '이제 배 안 고파.'], () => fox.setExpression('dot'));
}
function checkBush() {
  if (!hasCompanion()) return fox.say('파닥이랑 같이 와야겠어.', 2.2);
  const p = world.props;
  fox.say('...아무것도 없는데?', 2);
  setTimeout(() => {
    // 나무 사이에서 붉은 눈 두 개가 잠깐 나타났다 사라짐
    p.redEyes.show(new THREE.Vector3(-11, 1.3, 13), 2.6);
    scare.trigger({ shake: 0.5, flash: false, sound: false });
    const buddy = chicks.find((c) => c.follow);
    if (!buddy) return plan.complete('forest_check');
    buddy.char.setExpression('stern');
    sayLines(buddy.char, ['저, 저기...!', '...사라졌어. 봤지? 눈이 빨갰어.'], () => {
      buddy.char.setExpression(horror ? 'stern' : 'dot');
      fox.say('...일단 집으로 돌아가자.', 2.4);
      plan.complete('forest_check');
    });
  }, 1800);
}
function checkSound() {
  fox.say('...아무도 없네. 바람 소리뿐이야.', 2.6);
  setTimeout(() => scare.knock({ count: 2, gap: 0.4, volume: 0.25 }), 2200); // 아주 멀리서 두 번
  setTimeout(() => {
    fox.say('...기분 탓이겠지. 들어가자.', 2.4);
    plan.complete('sound_check');
  }, 3200);
}
function pickHint(h) {
  if (!hasCompanion()) return fox.say('파닥이랑 같이 찾기로 했잖아.', 2.2);
  collectedHints.add(h.index);
  h.group.visible = false;
  audio.sfx.pickup();
  fox.say(`"${HINTS[h.index]}"`, 3.2);
  plan.advance('hints');
}

// ---------- 숲 깊은 곳의 나무 상자 ----------
// 1일차부터 보이지만 손으로는 열 수 없다. 7일차에 곡괭이를 찾아 부수면 안에서 '좋아요' 석상이 드러나고 엔딩 분기가 열린다
let crateOpened = false; // true 면 상자 연출(컷신) 중: 이동/상호작용 잠금
let hasPickaxe = false;
function inspectCrate() {
  audio.sfx.deny();
  if (day >= LAST_DAY && !hasPickaxe) return sayLines(fox, ['힌트가 말한 상자야.', '...곡괭이. 곡괭이를 먼저 찾아야 해.']);
  if (day >= 5) return sayLines(fox, ['힌트가 말한 상자가 이거구나.', '손으로는 안 돼. 부술 게 필요해.']);
  sayLines(fox, ['엄청 큰 상자네... 내 키 두 배는 되겠다.', '...꿈쩍도 안 해. 안에 뭐가 들었을까.']);
}
function takePickaxe() {
  if (!hasCompanion()) return fox.say('파닥이랑 같이 가기로 했잖아.', 2.2);
  hasPickaxe = true;
  world.props.pickaxe.group.visible = false;
  audio.sfx.pickup();
  plan.complete('pickaxe');
  fox.setTool(true); // 곡괭이를 손에 쥔 모습으로
  sayLines(fox, ['...정말 있었어. 곡괭이.', '가자. 숲 깊은 곳의 상자로.']);
}

// ---------- 7일차: 상자를 부수다 → 석상 → 분기 ----------
let choiceOpen = false;
let ending = null;
// 파닥이들이 석상을 부숴 달라고 외치는 말 (돌아가며 반복)
const CLAMOR_LINES = ['부숴줘!!', '빨리 부숴!', '노미요, 그거 부숴줘!!', '지금! 지금 부숴!!', '제발 부숴줘!!', '그게 우릴 붙잡고 있어!!'];
let clamorTimers = [];
function stopClamor() {
  for (const id of clamorTimers) clearTimeout(id);
  clamorTimers = [];
}
/**
 * 파닥이들이 석상 주위로 몰려온다: 숲의 파닥이 + 방에 있던(구독으로 생긴) 파닥이들까지.
 * teleport 면 (스크린샷용) 바로 그 자리에 세운다. 모인 뒤에는 배회하지 않고 석상을 바라본다(hold)
 */
function gatherChicks(p, { teleport = false } = {}) {
  for (const rec of sessionChicks.filter((r) => r.worldName === 'house')) {
    const a = rand(-0.9, 0.9);
    addChick(new THREE.Vector3(Math.sin(a) * 9, 0, p.group.position.z - 6 - Math.cos(a) * 6), rec.scale);
  }
  const all = chicks;
  all.forEach((c, i) => {
    const a = -Math.PI * 0.85 + (Math.PI * 1.7 * i) / Math.max(1, all.length - 1);
    c.follow = false;
    c.hold = true;
    c.home.set(p.group.position.x + Math.sin(a) * 3.6, 0, p.group.position.z + Math.cos(a) * 3.6 - 0.8);
    c.target.copy(c.home);
    c.wait = 0;
    c.speed = 5.5;
    if (teleport) {
      c.char.group.position.copy(c.home);
      c.wait = 99;
    }
  });
  companion = null;
  return all;
}
// 곡괭이질: 여섯 번 E 를 눌러 조금씩 갈라뜨린다. 마지막 타격에 파사삭 흩어지며 석상이 드러난다
let crateHits = 0;
let hitCooldown = 0; // 연타 방지 (ms 타임스탬프)
const HIT_LINES = { 1: '...부순다!', 2: '하압!', 3: '...갈라진다.', 4: '조금만 더!', 5: '거의 다 됐어!' };
/** 노미요가 해당 지점을 바라보게 (상자를 등지고 있다가 쳐도 이상해 보이지 않도록) */
function faceTarget(pos) {
  foxState.heading = Math.atan2(pos.x - fox.group.position.x, pos.z - fox.group.position.z);
}
// 곡괭이를 들어 준비하는 동작(chop 의 windup)이 끝나고 내리찍어 상자에 닿는 순간에만 효과가 나야 하므로,
// 타격 효과(소리·흔들림·틈 갈라짐/파사삭)는 chop() 과 같은 길이만큼 지연시켜 스윙이 끝나는 순간에 맞춘다.
function hitCrate() {
  if (!hasCompanion()) return fox.say('...혼자서는 안 된다고 했어.', 2.4);
  if (!hasPickaxe) return fox.say('곡괭이가 있어야 해.', 2.2);
  const now = performance.now();
  if (now < hitCooldown) return;
  const p = world.props.crate;
  crateHits++;
  const isLast = crateHits >= p.HITS;
  const dur = isLast ? 0.62 : 0.48; // 마지막 타격은 조금 더 크게 휘두른다
  hitCooldown = now + dur * 1000 + 60;
  faceTarget(p.group.position);
  fox.chop(dur);
  setTimeout(() => {
    if (isLast) return finalSmash();
    audio.sfx.smash();
    scare.trigger({ shake: 0.35 + crateHits * 0.06, flash: false, sound: false });
    p.hit(crateHits);
    if (HIT_LINES[crateHits]) fox.say(HIT_LINES[crateHits], 1.1);
    const buddy = chicks.find((c) => c.follow);
    if (buddy && crateHits === 3) {
      buddy.char.say('조금 더!', 1.2);
      audio.sfx.babble(4);
    }
  }, dur * 1000);
}
function finalSmash() {
  const p = world.props.crate;
  crateOpened = true;
  // 여기 도착한 시점이 곧 곡괭이가 상자에 닿는 순간이므로(hitCrate 에서 스윙 길이만큼 이미 지연시킴) 바로 터뜨린다
  audio.sfx.shatter();
  scare.trigger({ shake: 1.0, flash: false, sound: false });
  p.smash();
  fox.setTool(false); // 곡괭이는 이제 쓸모를 다했다
  fox.say('...!', 0.9);
  const all = gatherChicks(p);
  setTimeout(() => {
    fox.setExpression('dot');
    sayLines(fox, ['...이게 뭐야.', "'좋아요' 버튼...? 석상이야."], () => {
      // 파닥이들의 아우성 (약 5초)
      const start = performance.now();
      const clamor = (k) => {
        if (performance.now() - start > 5200) return;
        const c = all[k % all.length];
        const text = CLAMOR_LINES[k % CLAMOR_LINES.length];
        c.char.setExpression('stern');
        c.char.say(text, 1.6, { scare: true });
        audio.sfx.babble(text.length, { base: 520, spread: 420, rate: 0.045 });
        clamorTimers.push(setTimeout(() => clamor(k + 1), 380));
      };
      clamor(0);
      if (!horror) scare.trigger({ shake: 0.3, flash: false, sound: false });
      // 아우성 한창일 때: 화면이 지직거리며 시뻘건 시스템 경고창이 튀어나온다
      clamorTimers.push(setTimeout(systemWarning, 3400));
    });
  }, 1500);
}
function systemWarning() {
  glitchEl.classList.remove('on');
  void glitchEl.offsetWidth;
  glitchEl.classList.add('on');
  audio.sfx.static(1.1);
  scare.trigger({ shake: 0.6, flash: false, sound: false });
  setTimeout(() => {
    stopClamor();
    sysWarnEl.classList.remove('dock');
    sysWarnEl.classList.add('on');
    scare.trigger({ shake: 1.1, flash: true, sound: true });
    // 경고창이 잠시 화면을 압도한 뒤 위로 물러나고 선택지가 뜬다
    setTimeout(() => {
      sysWarnEl.classList.remove('on');
      sysWarnEl.classList.add('dock');
      choiceOpen = true;
      choiceEl.classList.add('on', 'low');
    }, 2600);
  }, 900);
}
for (const btn of choiceEl.querySelectorAll('.btn')) {
  btn.addEventListener('click', () => {
    if (!choiceOpen) return;
    audio.sfx.ui();
    resolveChoice(btn.dataset.choice);
  });
  btn.addEventListener('mouseenter', () => choiceOpen && audio.sfx.talk());
}
function resolveChoice(which) {
  choiceOpen = false;
  choiceEl.classList.remove('on');
  plan.complete('escape');
  const p = world.props.crate;
  if (which === 'release') {
    // 부순다: 석상이 무너지고 파닥이들이 빛이 되어 돌아간다. 노미요는 혼자 남는다 → 진엔딩
    sysWarnEl.classList.remove('dock');
    fox.say('...미안. 그래도 부술게.', 2.2);
    setTimeout(() => {
      audio.sfx.crumble();
      scare.trigger({ shake: 1.0, flash: false, sound: false });
      p.crumble();
      for (const c of chicks) c.char.setExpression('happy');
      setTimeout(() => {
        audio.sfx.sleep();
        for (const c of chicks) c.char.say('고마워.', 1.6);
        audio.sfx.babble(4);
        // 파닥이들이 점점 작아지며 사라짐
        const t0 = performance.now();
        for (const c of chicks) c.baseScale = c.char.group.scale.x;
        const shrink = () => {
          const k = Math.max(0, 1 - (performance.now() - t0) / 1600);
          for (const c of chicks) c.char.group.scale.setScalar(c.baseScale * k + 0.0001);
          if (k > 0) requestAnimationFrame(shrink);
          else for (const c of chicks) c.char.group.visible = false;
        };
        setTimeout(shrink, 1200);
        setTimeout(() => fox.say('...조용하네.', 2.4), 2900);
        setTimeout(() => showEnding('true'), 5200);
      }, 1400);
    }, 2200);
  } else {
    // 부수지 않는다: 시스템의 말을 따른다. 파닥이들의 아우성이 비명으로 변하고 괴물이 된다 → 배드엔딩
    fox.say('...못 해. 너희가 없으면 난...', 2.6);
    setTimeout(() => {
      // 파닥이들이 그 자리에서 비명을 지르며 괴물(오염의 최종 형태)로 변한다
      for (const c of chicks) c.char.setExpression('stern');
      setHorror(true);
      scare.scream();
      scare.trigger({ shake: 1.6, sound: false });
      setTimeout(() => {
        for (const c of chicks) transformToMonster(c);
        audio.sfx.crumble();
        scare.trigger({ shake: 1.2, flash: true, sound: true });
      }, 900);
      setTimeout(() => showEnding('bad'), 3400);
    }, 2600);
  }
}
// ---------- 숲의 괴물 (오염이 극한까지 간 파닥이) ----------
const monsters = []; // [{ char, grow }]
const MONSTER_SCALE = 1.5; // 기본 모델 키(~3.7)에 곱해지는 배율 — 더 커 보이도록 키움
function spawnMonster(pos, heading = 0, { scale = MONSTER_SCALE, grow = 0 } = {}) {
  const m = createMonster({ scale });
  m.group.position.copy(pos);
  m.group.rotation.y = heading;
  scene.add(m.group);
  const rec = { char: m, heading, scale, grow, t: 0 };
  if (grow > 0) m.group.scale.setScalar(0.25 * scale);
  monsters.push(rec);
  return rec;
}
/** 파닥이 하나를 같은 자리의 괴물로 바꾼다 (1.2초 동안 커지며 노미요를 바라봄) */
function transformToMonster(c) {
  const g = c.char.group;
  scene.remove(g);
  g.visible = false;
  const heading = Math.atan2(fox.group.position.x - g.position.x, fox.group.position.z - g.position.z);
  spawnMonster(g.position, heading, { scale: MONSTER_SCALE, grow: 1.2 });
}
function updateMonsters(dt) {
  for (const m of monsters) {
    if (m.grow > 0) {
      m.t += dt;
      const k = Math.min(1, m.t / m.grow);
      const e = 1 - Math.pow(1 - k, 3);
      m.char.group.scale.setScalar(THREE.MathUtils.lerp(0.25, 1, e) * m.scale);
      if (k >= 1) m.grow = 0;
    }
    // 항상 노미요를 노려본다
    const dx = fox.group.position.x - m.char.group.position.x;
    const dz = fox.group.position.z - m.char.group.position.z;
    m.heading = lerpAngle(m.heading, Math.atan2(dx, dz), 1 - Math.exp(-2 * dt));
    m.char.group.rotation.y = m.heading;
    m.char.update(dt);
  }
}
function showEnding(kind) {
  ending = kind;
  sysWarnEl.classList.remove('on', 'dock');
  endingEl.classList.remove('true', 'bad');
  endingEl.classList.add('on', kind);
  endingEl.querySelector('.endTitle').textContent = kind === 'true' ? '부수다' : '남기다';
  endingEl.querySelector('.endBody').innerHTML =
    kind === 'true'
      ? '석상이 무너지자 파닥이들은 빛이 되어 흩어졌다.<br>숲은 조용해졌고, 노미요는 혼자 남았다.<br><br>며칠 뒤, 방송 채팅창에 낯익은 이름들이 하나둘 돌아왔다.<br><span class="endChat">별사탕공장: 노미요! 오늘도 왔어요</span><br><span class="endChat">두부한모: 저 구독 다시 눌렀어요 ㅎㅎ</span><br><span class="endChat">미야옹집사: 왠지 오랜만인 기분</span>'
      : '석상은 그대로 남았다.<br>파닥이들의 아우성은 점점 낮아지고, 커지고, 검어졌다.<br><br>"보내줘. 보내줘. 보내줘."<br><br>노미요는 혼자가 되지 않았다. 대신, 아무도 놓아줄 수 없게 되었다.';
}

// ---------- 잠자기 (하루 넘기기) ----------
const WAKE_LINES = {
  2: ['어제 성에서 본 그 쪽지...', '...신경 쓰지 말자. 오늘도 방송 해야지.'],
  3: ['파닥이가 아까부터 안절부절못하네.', '무슨 일인지 물어봐야겠어.'],
  4: ['어제는... 좀 이상했어.', '그래도 방송은 해야지.'],
  5: ['파닥이가 힌트 얘기를 했었지.', '탈출 지점이라니, 뭘까.'],
  6: ['힌트가 두 개 더 남았댔지.', '파닥이랑 마저 찾아보자.'],
  7: ['...오늘이야. 아침이 일곱 번 왔어.', '곡괭이를 찾아서, 파닥이랑 그 상자를 열어보자.'],
};
// 할 일 목록은 따로 보여주지 않는다. 남은 일이 있으면 잠들지 못하고 안내문만 뜬다.
function trySleep() {
  if (!plan.allDone()) {
    audio.sfx.deny();
    notice.show(plan.nextHint() ?? '아직 할 일이 남았어요');
    fox.say('아직 잘 때가 아니야.', 2);
    return;
  }
  if (day >= LAST_DAY) return;
  audio.sfx.sleep();
  fox.say('오늘은 여기까지. 잘 자.', 2);
  dayCardEl.textContent = `DAY ${day + 1}`;
  fadeThen(
    () => {
      dayCardEl.classList.add('on');
      companion = null;
      collectedHints = new Set();
      knockHeard = false;
      setDay(day + 1);
      // 동행/추가 파닥이 정리 후 침대 옆에서 기상
      loadWorld('house');
      fox.group.position.copy(world.bed.approach);
      controls.target.copy(fox.group.position).y += 1.4;
      camera.position.copy(controls.target).add(new THREE.Vector3(-6, 3.6, 5));
      setTimeout(() => dayCardEl.classList.remove('on'), 1500);
      // 아침 혼잣말: 오늘 할 일을 목록 대신 이야기로 슬쩍 알려준다
      const wake = WAKE_LINES[day];
      if (wake) setTimeout(() => sayLines(fox, wake), 2000);
    },
    { hold: 1900 }
  );
}

// ---------- 게임 접속(방송) ----------
// 채팅창은 게임 접속 중에만 보인다. 방/숲을 걸어다닐 때는 항상 숨김.
const chatLog = createChatLog();
const streamSim = createStreamSim({
  onMessage: (m) => chatLog.addMessage(m),
  onSubscribe: (m) => {
    chatLog.addMessage(m);
    reactSubscribe(m.name);
  },
});
let reactExprTimeout = 0;

const gameScreen = createGameScreen();
const INTRO_LINE = '미요미요! 파닥이들 안녕. 오늘 할 게임은 미스터리 고성탈출! 수팀 평가 압긍이구요. 기대되네요. 시작할게요!';
const INTRO_SECONDS = 5.5;
let introReady = false; // 오프닝 멘트가 끝나 E 로 방송 화면에 들어갈 수 있는 상태
let streamSession = 0;
let streamTime = 0; // 게임 화면이 켜진 뒤 흐른 시간 (4일차 노크 타이밍)
let knockHeard = false;

const castle = createCastleGame({
  canvas: gameScreen.canvas,
  onEvent: (type) => {
    if (type === 'key') audio.sfx.pickup();
    else if (type === 'door') audio.sfx.door();
    else if (type === 'talk') audio.sfx.talk();
    if (type === 'win') {
      audio.sfx.win();
      gameScreen.setStatus('탈출 성공!');
      const cheers = ['탈출 ㅊㅋㅊㅋㅊㅋ', '와아아아아', '노미요 최고!!', 'ㅋㅋㅋㅋ 잘한다', '수팀 평가 인정', '다음 방송 언제요??'];
      cheers.forEach((text, i) => setTimeout(() => streaming && chatLog.addMessage({ name: streamSim.randomViewer(), text }), 250 * i));
    } else if (type === 'exit') {
      endStream(); // 노미요가 마무리 멘트를 마치면 방송 종료 → 방으로
    } else if (type === 'vanish') {
      setTimeout(() => streaming && chatLog.addMessage({ name: streamSim.randomViewer(), text: '방금 npc 사라진 거 뭐야??' }), 900);
    } else if (type === 'dayend') {
      gameScreen.setStatus('노미요: 오늘 방송은 여기까지');
      ['벌써 끝이에요?', '내일 또 봐요~', '미요미요!!', '잘 자요 노미요'].forEach((text, i) =>
        setTimeout(() => streaming && chatLog.addMessage({ name: streamSim.randomViewer(), text }), 900 + 600 * i)
      );
    } else if (type === 'monster') {
      scare.trigger({ shake: 0.9 });
      gameScreen.setStatus('노미요: 뭐, 뭐야?!');
      ['?????', '뭐야 저거!!!', '도망쳐요!!!', 'ㅁㅊ 저거 뭐임', '옷장!! 옷장에 숨어요'].forEach((text, i) =>
        setTimeout(() => streaming && chatLog.addMessage({ name: streamSim.randomViewer(), text }), 400 + 500 * i)
      );
    } else if (type === 'hide') {
      audio.sfx.door();
    } else if (type === 'static') {
      audio.sfx.static(0.9);
      scare.trigger({ shake: 0.4, flash: false, sound: false });
    } else if (type === 'caught') {
      scare.scream();
      scare.trigger({ shake: 1.2, sound: false });
    } else if (type === 'gameover') {
      gameScreen.setStatus('게임 오버...');
      ['ㅠㅠㅠㅠ', '잡혔다...', '노미요 괜찮아요??', '다시 도전!!'].forEach((text, i) =>
        setTimeout(() => streaming && chatLog.addMessage({ name: streamSim.randomViewer(), text }), 300 + 500 * i)
      );
      setTimeout(() => {
        endStream();
        setTimeout(() => sayLines(fox, ['...하아. 심장 떨어지는 줄 알았네.', '내일 다시 해 봐야지.']), 900);
      }, 2600);
    }
  },
});

function startStreaming({ instant = false } = {}) {
  if (!walking() || !near(world.computer)) return;
  if (!foxState.sitting && world.seat) sitDown();
  streaming = true;
  introReady = false;
  prompt.hide();
  const session = ++streamSession;
  audio.sfx.ui();
  if (instant) return enterGame();
  // 자리에 앉아 오프닝 멘트. 멘트가 뜨자마자 "E · 계속하기" 안내가 나와서 기다리지 않고 바로 넘어갈 수 있다
  if (!horror) fox.setExpression('happy');
  fox.say(INTRO_LINE, INTRO_SECONDS);
  setTimeout(() => {
    if (session !== streamSession || !streaming) return;
    introReady = true;
  }, 300);
  setTimeout(() => {
    if (session === streamSession && streaming && !horror) fox.setExpression('dot');
  }, INTRO_SECONDS * 1000 - 400);
}
function enterGame() {
  if (!streaming || castle.isActive()) return;
  introReady = false;
  if (!horror) fox.setExpression('dot');
  audio.sfx.ui();
  const enter = () => {
    chatLog.clear();
    chatLog.setVisible(true);
    gameScreen.setVisible(true);
    gameScreen.setStatus('접속 중...');
    castle.start({ tier: tierIndexForDay(day, { horror }), presence: presenceFor(day), monster: day >= 2 || horror, skipIntro: params.has('nointro') });
    for (const k of (params.get('gkeys') || '').split(',')) if (k) castle.keydown(k); // 디버그: 게임 키 누른 상태로 시작
    streamSim.reset();
    streamTime = 0;
    if (!horror) modeEl.textContent = 'LIVE';
  };
  fadeThen(enter, { hold: 200 });
}
// 방송 종료 (게임 화면이면 페이드 후 방으로, 멘트 중이면 바로) + 일어나기. 게임까지 했으면 오늘 방송 완료
function endStream() {
  if (!streaming || transitioning) return;
  const played = castle.isActive();
  stopStreaming();
  if (foxState.sitting) standUp();
  if (played) {
    plan.complete('stream');
    // 1일차: 방송을 끝내면 배가 고파 밖으로 나가게 된다
    if (plan.pending('grapes')) setTimeout(() => sayLines(fox, ['...배고파.', '밖에 나가서 뭐 좀 찾아 먹자.']), 900);
  }
}
function stopStreaming({ instant = false } = {}) {
  if (!streaming) return;
  streaming = false;
  introReady = false;
  streamSession++;
  const leave = () => {
    chatLog.setVisible(false);
    gameScreen.setVisible(false);
    castle.stop();
  };
  if (instant || !gameScreen.el.classList.contains('on')) leave();
  else fadeThen(leave);
  modeEl.textContent = modeLabel();
}

// 4일차: 방송 중 문 두드리는 소리. 시청자가 먼저 알아채고 노미요는 얼버무린다
function knockEvent() {
  knockHeard = true;
  scare.knock({ count: 4, gap: 0.24, volume: 0.9 });
  scare.trigger({ shake: 0.45, flash: false, sound: false });
  const lines = ['방금 무슨 소리 들린 거 같은데?', '쾅쾅 소리 남 ㄷㄷ', '문 두드리는 소리 아님??', '노미요 뒤에 누구 있어요?'];
  lines.forEach((text, i) => setTimeout(() => streaming && chatLog.addMessage({ name: streamSim.randomViewer(), text }), 1200 + 700 * i));
  setTimeout(() => {
    if (!streaming) return;
    gameScreen.setStatus('노미요: 모르겠어요 하하');
    fox.say('모르겠어요 하하', 2);
    setTimeout(() => streaming && gameScreen.setStatus('접속 중...'), 3000);
  }, 3600);
  // 방송이 끝나면 밖을 확인하는 일이 열린다 (needs: stream)
}

function spawnChick(near) {
  const pos = near.clone();
  pos.x += rand(-1.6, 1.6);
  pos.z += rand(0.4, 2.0); // 데스크 반대쪽(방 안쪽)으로
  confine(pos, 0.6);
  const rec = addChick(pos, rand(0.5, 0.6));
  sessionChicks.push({ worldName: world.group.name, position: pos.clone(), scale: rec.char.group.scale.x });
}

let statusTimeout = 0;
function reactSubscribe() {
  fox.say('감사합니다!');
  // 게임 화면이 방을 가리고 있으므로 노미요의 반응을 화면 하단 상태 줄에도 표시
  gameScreen.setStatus('노미요: 감사합니다!');
  clearTimeout(statusTimeout);
  statusTimeout = setTimeout(() => gameScreen.setStatus('접속 중...'), 1800);
  if (!horror) fox.setExpression('happy');
  clearTimeout(reactExprTimeout);
  reactExprTimeout = setTimeout(() => {
    if (!horror) fox.setExpression('dot');
  }, 1600);
  if (world.computer) spawnChick(world.computer.approach);
}

// ---------- 디버그 시작 상태 ----------
if (params.has('at')) {
  const [x, z] = params.get('at').split(',').map(Number);
  fox.group.position.set(x, 0, z);
  controls.target.copy(fox.group.position).y += 1.4;
}
if (params.has('sit') && world.seat) sitDown();
if (params.has('talk') && chicks.length) {
  const c = chicks[0];
  fox.group.position.copy(c.char.group.position).z += 1.6;
  controls.target.copy(fox.group.position).y += 1.4;
  camera.position.copy(controls.target).add(new THREE.Vector3(0, 2.2, 6));
  talkTo(c);
}
if (params.has('settings')) settings.toggle(); // 디버그: 설정창 열고 시작
if (params.has('stream') && world.computer) {
  fox.group.position.copy(world.computer.approach);
  startStreaming({ instant: params.get('stream') === 'now' });
}
// ?pickaxe=1 : 곡괭이를 이미 주운 상태
// ?smash=1 : 상자 앞에서 바로 부수기 시작 / ?smash=statue|warn|choice|rubble : 그 단계의 화면으로 바로 (헤드리스 스크린샷용)
if (params.has('pickaxe') && world.props) {
  hasPickaxe = true;
  plan.complete('pickaxe');
  applyDayProps();
  fox.setTool(true);
}
if (params.has('smash') && world.props) {
  const p = world.props.crate;
  fox.group.position.copy(p.position);
  foxState.heading = 0;
  fox.group.rotation.y = 0;
  controls.target.copy(fox.group.position).y += 1.4;
  camera.position.copy(controls.target).add(new THREE.Vector3(-5, 3.2, -7));
  const stage = params.get('smash');
  if (stage === '1') setTimeout(hitCrate, 300);
  else if (stage === 'hits') {
    hasPickaxe = true;
    fox.setTool(true);
    crateHits = 4;
    p.hit(4);
  } else if (stage === 'chop') {
    // 곡괭이질 스윙 포즈 확인용 (내리찍는 순간): 헤드리스 렌더러는 느려서 실시간 스윙을 스크린샷으로 잡기 어렵다. 진행도는 ?k= 로 조절 (기본 0.9)
    hasPickaxe = true;
    fox.setTool(true);
    fox.previewChop(parseFloat(params.get('k') ?? '0.9'));
  } else {
    hasPickaxe = true;
    crateOpened = true;
    p.smash();
    gatherChicks(p, { teleport: true });
    for (const c of chicks) c.char.setExpression('stern');
    if (stage === 'warn') sysWarnEl.classList.add('on');
    if (stage === 'choice') {
      sysWarnEl.classList.add('dock');
      choiceOpen = true;
      choiceEl.classList.add('on', 'low');
    }
    if (stage === 'rubble') p.crumble();
    if (stage === 'monster') {
      p.crumble();
      setHorror(true);
      for (const c of chicks) transformToMonster(c);
      for (const m of monsters) {
        m.grow = 0;
        m.char.group.scale.setScalar(1);
      }
    }
  }
}
// ?monster=1 : 노미요 앞에 숲의 괴물을 세워 놓고 시작 (모델 확인용)
let camLocked = false; // 디버그(?mcam): 카메라가 노미요를 따라가지 않고 고정
if (params.has('monster')) {
  const pos = fox.group.position.clone();
  pos.x += Math.sin(foxState.heading) * 6;
  pos.z += Math.cos(foxState.heading) * 6;
  const rec = spawnMonster(pos, foxState.heading + Math.PI);
  // ?mcam=side,up,front : 괴물 기준(정면 방향 기준) 상대 위치에 카메라를 두고 괴물 얼굴을 바라봄 (모델 확인용)
  if (params.has('mcam')) {
    const [side, up, front] = params.get('mcam').split(',').map(Number);
    const h = foxState.heading; // 괴물은 -h 방향(노미요 쪽)을 바라본다
    const fwd = new THREE.Vector3(-Math.sin(h), 0, -Math.cos(h));
    const right = new THREE.Vector3(Math.cos(h), 0, -Math.sin(h));
    controls.target.copy(pos).y += rec.char.height * 0.72;
    camera.position.copy(pos).addScaledVector(right, side).addScaledVector(fwd, front).y += up;
    camLocked = true;
  }
}
// ?cam=x,y,z : 카메라를 그 위치에 두고 여우를 바라봄 (스크린샷 디버그용)
if (params.has('cam')) {
  const [x, y, z] = params.get('cam').split(',').map(Number);
  controls.target.copy(fox.group.position).y += 1.0;
  camera.position.set(x, y, z);
}

// ---------- 충돌/경계 ----------
function confine(p, radius) {
  const b = world.bounds;
  p.x = THREE.MathUtils.clamp(p.x, b.minX + radius, b.maxX - radius);
  p.z = THREE.MathUtils.clamp(p.z, b.minZ + radius, b.maxZ - radius);
  for (const o of world.obstacles) {
    const minX = o.minX - radius;
    const maxX = o.maxX + radius;
    const minZ = o.minZ - radius;
    const maxZ = o.maxZ + radius;
    if (p.x > minX && p.x < maxX && p.z > minZ && p.z < maxZ) {
      const pushes = [
        [p.x - minX, () => (p.x = minX)],
        [maxX - p.x, () => (p.x = maxX)],
        [p.z - minZ, () => (p.z = minZ)],
        [maxZ - p.z, () => (p.z = maxZ)],
      ];
      pushes.sort((a, b) => a[0] - b[0])[0][1]();
    }
  }
}

// ---------- 여우 이동 ----------
const tmpForward = new THREE.Vector3();
const tmpRight = new THREE.Vector3();
const tmpMove = new THREE.Vector3();
let stepTimer = 0;

function updateFox(dt) {
  let ix = 0;
  let iz = 0;
  if (keys.has('KeyW') || keys.has('ArrowUp')) iz += 1;
  if (keys.has('KeyS') || keys.has('ArrowDown')) iz -= 1;
  if (keys.has('KeyA') || keys.has('ArrowLeft')) ix -= 1;
  if (keys.has('KeyD') || keys.has('ArrowRight')) ix += 1;
  const running = keys.has('ShiftLeft') || keys.has('ShiftRight');
  const moving = (ix !== 0 || iz !== 0) && !choiceOpen && !ending && !crateOpened;

  if (foxState.sitting) {
    // 방송 중에는 이동 키를 무시 (E/Esc 로만). 앉아만 있을 때는 이동 키로 일어남
    if (moving && !streaming) standUp();
    else {
      fox.update(dt, { moving: false, sitting: true });
      return;
    }
  }

  camera.getWorldDirection(tmpForward);
  tmpForward.y = 0;
  tmpForward.normalize();
  tmpRight.crossVectors(tmpForward, THREE.Object3D.DEFAULT_UP).normalize();
  tmpMove.set(0, 0, 0).addScaledVector(tmpForward, iz).addScaledVector(tmpRight, ix);

  const maxSpeed = running ? 6 : 3.2;
  if (moving) {
    tmpMove.normalize().multiplyScalar(maxSpeed);
    foxState.heading = lerpAngle(foxState.heading, Math.atan2(tmpMove.x, tmpMove.z), 1 - Math.exp(-14 * dt));
  }
  foxState.velocity.lerp(tmpMove, 1 - Math.exp(-10 * dt));

  const p = fox.group.position;
  p.addScaledVector(foxState.velocity, dt);
  p.y = 0;
  confine(p, 0.7);
  fox.group.rotation.y = foxState.heading;

  fox.update(dt, { moving, speed: running ? 1.5 : 1 });

  // 발소리
  if (moving && foxState.velocity.length() > 1) {
    stepTimer -= dt;
    if (stepTimer <= 0) {
      stepTimer = running ? 0.24 : 0.36;
      audio.sfx.step(running);
    }
  } else stepTimer = 0.05;

  // 문: 멀어졌다가 다시 가까이 가면 월드 전환
  const door = world.door;
  if (door && !transitioning && !choiceOpen && !ending) {
    const d = Math.hypot(p.x - door.position.x, p.z - door.position.z);
    if (!doorArmed && d > door.radius + 0.6) doorArmed = true;
    if (doorArmed && d < door.radius) switchWorld(door.target);
  }
}

// ---------- 파닥이 AI (배회 / 동행 따라가기) ----------
const tmpDir = new THREE.Vector3();
function updateChick(c, dt) {
  const g = c.char.group;
  let moving = false;

  if (c.follow && !c.char.isTalking()) {
    // 노미요 뒤 1.6 지점을 따라감. 멀면 달림
    tmpDir.set(-Math.sin(foxState.heading), 0, -Math.cos(foxState.heading)).multiplyScalar(1.6).add(fox.group.position);
    tmpDir.sub(g.position);
    tmpDir.y = 0;
    const dist = tmpDir.length();
    if (dist > 0.6) {
      moving = true;
      const speed = dist > 5 ? 6.5 : 3.4;
      tmpDir.normalize();
      c.heading = lerpAngle(c.heading, Math.atan2(tmpDir.x, tmpDir.z), 1 - Math.exp(-8 * dt));
      g.position.addScaledVector(tmpDir, Math.min(speed * dt, dist));
    } else {
      // 멈춰 있을 땐 노미요를 바라봄
      tmpDir.subVectors(fox.group.position, g.position);
      c.heading = lerpAngle(c.heading, Math.atan2(tmpDir.x, tmpDir.z), 1 - Math.exp(-4 * dt));
    }
    confine(g.position, 0.5);
    g.rotation.y = c.heading;
    c.char.update(dt, { moving, speed: moving && dist > 5 ? 1.6 : 1.1 });
    return;
  }

  if (horror) {
    tmpDir.subVectors(fox.group.position, g.position);
    const want = Math.atan2(tmpDir.x, tmpDir.z);
    c.heading = lerpAngle(c.heading, want, 1 - Math.exp(-1.5 * dt));
  } else if (c.hold && c.wait > 0) {
    // 석상 앞에 모인 파닥이: 배회하지 않고 석상을 바라본다
    const st = world.props?.crate?.group.position;
    if (st) {
      tmpDir.subVectors(st, g.position);
      c.heading = lerpAngle(c.heading, Math.atan2(tmpDir.x, tmpDir.z), 1 - Math.exp(-4 * dt));
    }
  } else if (c.wait > 0) {
    c.wait -= dt;
    if (c.wait <= 0) {
      const a = rand(0, Math.PI * 2);
      const r = rand(1.5, 5);
      c.target.set(c.home.x + Math.cos(a) * r, 0, c.home.z + Math.sin(a) * r);
      confine(c.target, 0.6);
    }
  } else {
    tmpDir.subVectors(c.target, g.position);
    tmpDir.y = 0;
    const dist = tmpDir.length();
    if (dist < 0.25) {
      c.wait = rand(1, 3.5);
    } else {
      moving = true;
      tmpDir.normalize();
      const want = Math.atan2(tmpDir.x, tmpDir.z);
      c.heading = lerpAngle(c.heading, want, 1 - Math.exp(-6 * dt));
      g.position.addScaledVector(tmpDir, c.speed * dt);
    }
  }

  if (!foxState.sitting && !c.char.isTalking()) {
    tmpDir.subVectors(g.position, fox.group.position);
    tmpDir.y = 0;
    const d = tmpDir.length();
    if (d < 1.5 && d > 0.001) g.position.addScaledVector(tmpDir.normalize(), (1.5 - d) * 4 * dt);
  }
  confine(g.position, 0.5);

  g.rotation.y = c.heading;
  c.char.update(dt, { moving, speed: c.speed / 1.7 });
}

// ---------- 카메라 추적 ----------
const camTarget = new THREE.Vector3();
const camDelta = new THREE.Vector3();
function updateCamera(dt) {
  if (camLocked) {
    controls.update();
    return;
  }
  camTarget.copy(fox.group.position).y += 1.4;
  camDelta.subVectors(camTarget, controls.target);
  camDelta.multiplyScalar(1 - Math.exp(-6 * dt));
  controls.target.add(camDelta);
  camera.position.add(camDelta);
  controls.update();
}

// ---------- 루프 ----------
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

const clock = new THREE.Clock();
let frames = 0;
renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;
  if (params.has('trace') && frames++ % 10 === 0) {
    const p = fox.group.position;
    console.log(`[trace] f=${frames} world=${world.group.name} fox=${p.x.toFixed(2)},${p.z.toFixed(2)} armed=${doorArmed} trans=${transitioning}`);
  }
  // ?steps=N : 느린 환경(헤드리스 테스트)에서 프레임당 N번 시뮬레이션
  const steps = Math.max(1, parseInt(params.get('steps') || '1', 10));
  scare.undoShake(camera);
  for (let i = 0; i < steps; i++) {
    horrorBlend = THREE.MathUtils.damp(horrorBlend, horror ? 1 : dreadFor(day), 2.5, dt);
    daylight = THREE.MathUtils.damp(daylight, daylightFor(day), 2.5, dt);
    updateFox(dt);
    for (const c of chicks) updateChick(c, dt);
    updateMonsters(dt);
    updateCamera(dt);
    if (streaming) streamSim.update(dt);
    if (castle.isActive()) {
      castle.update(dt);
      streamTime += dt;
      if (day === 4 && !knockHeard && streamTime > 18) knockEvent();
    }
  }
  scare.applyShake(camera, dt);
  // 으스스할수록 전체 노출도 낮춰 화면이 가라앉게
  renderer.toneMappingExposure = THREE.MathUtils.lerp(1.1, 0.72, horrorBlend);
  audio.update(dt, { dread: horrorBlend, world: world.group.name, ingame: castle.isActive(), silent: !!ending });
  const action = currentAction();
  if (action) prompt.show(action.at, action.label, camera);
  else prompt.hide();
  world.update(dt, t, horrorBlend, streaming, daylight);
  if (castle.isActive()) castle.render(); // 게임 화면이 방을 덮고 있는 동안은 3D 렌더 생략
  else renderer.render(scene, camera);
});
