import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createFox } from './characters/fox.js';
import { createChick } from './characters/chick.js';
import { createHouse } from './world/house.js';
import { createForest } from './world/forest.js';
import { lerpAngle, rand } from './helpers.js';
import { createChatLog } from './ui/chatLog.js';
import { createStreamSim } from './systems/streamSim.js';

// 디버그용 URL 파라미터: ?world=forest, ?keys=KeyW,ShiftLeft, ?horror=1, ?sit=1, ?stream=1, ?yaw=&dist=&height=
const params = new URLSearchParams(location.search);

// ---------- 렌더러 / 씬 / 카메라 ----------
const renderer = new THREE.WebGLRenderer({ antialias: true });
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
const fadeEl = document.getElementById('fade');

// ---------- 캐릭터 ----------
const fox = createFox();
scene.add(fox.group);
const foxState = { heading: 0, velocity: new THREE.Vector3(), sitting: false };

const chickScales = [0.6, 0.6, 0.56];
let chicks = [];
// 방송(구독 이벤트)으로 생성된 파닥이 — 월드 전환 후에도 유지되도록 별도 추적
let sessionChicks = []; // [{ worldName, position: Vector3, scale }]

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

  chicks = world.chickSpawns.map((pos, i) => {
    const c = createChick({ scale: chickScales[i % chickScales.length] });
    c.group.position.copy(pos);
    scene.add(c.group);
    return {
      char: c,
      home: pos.clone(),
      target: pos.clone(),
      wait: rand(0.5, 2),
      heading: rand(0, Math.PI * 2),
      speed: rand(1.4, 2.0),
    };
  });
  // 방송으로 생성된 파닥이 복원 (이 월드에 속한 것만)
  for (const rec of sessionChicks.filter((r) => r.worldName === name)) {
    const c = createChick({ scale: rec.scale });
    c.group.position.copy(rec.position);
    scene.add(c.group);
    chicks.push({
      char: c,
      home: rec.position.clone(),
      target: rec.position.clone(),
      wait: rand(0.5, 2),
      heading: rand(0, Math.PI * 2),
      speed: rand(1.4, 2.0),
    });
  }
  for (const c of chicks) c.char.setExpression(horror ? 'stern' : 'dot');

  // 카메라를 여우 뒤쪽으로 재배치 (스폰 지점별로 거리/높이 지정 가능)
  const cam = spawn.camera ?? { back: 9, height: world.cameraStart.y };
  controls.target.copy(fox.group.position).y += 1.4;
  const fwd = new THREE.Vector3(Math.sin(foxState.heading), 0, Math.cos(foxState.heading));
  camera.position.copy(controls.target).addScaledVector(fwd, -cam.back);
  camera.position.y = cam.height;
  modeEl.textContent = horror ? 'HORROR' : name === 'house' ? 'HOME' : 'NIGHT';
}

let transitioning = false;
function switchWorld(name) {
  if (transitioning) return;
  if (streaming) stopStreaming();
  transitioning = true;
  fadeEl.classList.add('on');
  setTimeout(() => {
    loadWorld(name, { viaDoor: true });
    setTimeout(() => {
      fadeEl.classList.remove('on');
      transitioning = false;
    }, 120);
  }, 380);
}

// ---------- 공포 모드 ----------
let horror = false;
let horrorBlend = 0;
let streaming = false; // 방송 상태 (아래 방송 섹션에서 제어. setHorror 가 먼저 실행되므로 여기서 선언)
function setHorror(on) {
  horror = on;
  modeEl.textContent = on ? 'HORROR' : streaming ? 'LIVE' : world?.group.name === 'house' ? 'HOME' : 'NIGHT';
  modeEl.classList.toggle('horror', on);
  for (const c of chicks) c.char.setExpression(on ? 'stern' : 'dot');
  if (!on) fox.setExpression('dot');
}

loadWorld(params.get('world') === 'forest' ? 'forest' : 'house');
setHorror(params.has('horror'));
if (horror) horrorBlend = 1;

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
window.addEventListener('keydown', (e) => {
  keys.add(e.code);
  if (e.code === 'KeyF') fox.setExpression(fox.getExpression() === 'dot' ? 'happy' : 'dot');
  if (e.code === 'KeyE') {
    const order = ['dot', 'happy', 'wink', 'stern'];
    const next = order[(order.indexOf(chicks[0].char.getExpression()) + 1) % order.length];
    for (const c of chicks) c.char.setExpression(next);
  }
  if (e.code === 'KeyH') setHorror(!horror);
  if (e.code === 'Space') toggleSit();
  if (e.code === 'KeyC') (streaming ? stopStreaming : startStreaming)();
});
window.addEventListener('keyup', (e) => keys.delete(e.code));
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
function toggleSit() {
  const seat = world.seat;
  if (!seat) return;
  if (foxState.sitting) {
    standUp();
    return;
  }
  const dx = fox.group.position.x - seat.approach.x;
  const dz = fox.group.position.z - seat.approach.z;
  if (Math.sqrt(dx * dx + dz * dz) > seat.radius) return;
  sitDown();
}
function standUp() {
  foxState.sitting = false;
  fox.group.position.copy(world.seat.approach);
  foxState.heading = 0;
}

// ---------- 방송 (데스크 앞에서 C) ----------
const chatLog = createChatLog();
const streamSim = createStreamSim({
  onMessage: (m) => chatLog.addMessage(m),
  onSubscribe: (m) => {
    chatLog.addMessage(m);
    reactSubscribe(m.name);
  },
});
let reactExprTimeout = 0;

function startStreaming() {
  const c = world.computer;
  if (!c || streaming || transitioning) return;
  const d = Math.hypot(fox.group.position.x - c.approach.x, fox.group.position.z - c.approach.z);
  if (d > c.radius) return;
  if (!foxState.sitting && world.seat) sitDown();
  streaming = true;
  chatLog.clear();
  chatLog.setVisible(true);
  streamSim.reset();
  if (!horror) modeEl.textContent = 'LIVE';
}

function stopStreaming() {
  if (!streaming) return;
  streaming = false;
  chatLog.setVisible(false);
  if (!horror) modeEl.textContent = world.group.name === 'house' ? 'HOME' : 'NIGHT';
}

function spawnChick(near) {
  const pos = near.clone();
  pos.x += rand(-1.6, 1.6);
  pos.z += rand(0.4, 2.0); // 데스크 반대쪽(방 안쪽)으로
  confine(pos, 0.6);
  const c = createChick({ scale: rand(0.5, 0.6) });
  c.group.position.copy(pos);
  c.setExpression(horror ? 'stern' : 'dot');
  scene.add(c.group);
  chicks.push({
    char: c,
    home: pos.clone(),
    target: pos.clone(),
    wait: rand(0.5, 2),
    heading: rand(0, Math.PI * 2),
    speed: rand(1.4, 2.0),
  });
  sessionChicks.push({ worldName: world.group.name, position: pos.clone(), scale: c.group.scale.x });
}

function reactSubscribe() {
  fox.say('감사합니다!');
  if (!horror) fox.setExpression('happy');
  clearTimeout(reactExprTimeout);
  reactExprTimeout = setTimeout(() => {
    if (!horror) fox.setExpression('dot');
  }, 1600);
  if (world.computer) spawnChick(world.computer.approach);
}
if (params.has('at')) {
  const [x, z] = params.get('at').split(',').map(Number);
  fox.group.position.set(x, 0, z);
  controls.target.copy(fox.group.position).y += 1.4;
}
if (params.has('sit') && world.seat) {
  fox.group.position.copy(world.seat.approach);
  toggleSit();
}
if (params.has('stream') && world.computer) {
  fox.group.position.copy(world.computer.approach);
  startStreaming();
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

function updateFox(dt) {
  let ix = 0;
  let iz = 0;
  if (keys.has('KeyW') || keys.has('ArrowUp')) iz += 1;
  if (keys.has('KeyS') || keys.has('ArrowDown')) iz -= 1;
  if (keys.has('KeyA') || keys.has('ArrowLeft')) ix -= 1;
  if (keys.has('KeyD') || keys.has('ArrowRight')) ix += 1;
  const running = keys.has('ShiftLeft') || keys.has('ShiftRight');
  const moving = ix !== 0 || iz !== 0;

  if (foxState.sitting) {
    if (moving) standUp();
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

  // 문: 멀어졌다가 다시 가까이 가면 월드 전환
  const door = world.door;
  if (door && !transitioning) {
    const d = Math.hypot(p.x - door.position.x, p.z - door.position.z);
    if (!doorArmed && d > door.radius + 0.6) doorArmed = true;
    if (doorArmed && d < door.radius) switchWorld(door.target);
  }

  // 방송 중 데스크에서 멀어지면 자동 종료
  if (streaming && world.computer) {
    const c = world.computer;
    const d = Math.hypot(p.x - c.approach.x, p.z - c.approach.z);
    if (d > c.radius + 0.8) stopStreaming();
  }
}

// ---------- 파닥이 배회 AI ----------
const tmpDir = new THREE.Vector3();
function updateChick(c, dt) {
  const g = c.char.group;
  let moving = false;

  if (horror) {
    tmpDir.subVectors(fox.group.position, g.position);
    const want = Math.atan2(tmpDir.x, tmpDir.z);
    c.heading = lerpAngle(c.heading, want, 1 - Math.exp(-1.5 * dt));
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

  if (!foxState.sitting) {
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
  for (let i = 0; i < steps; i++) {
    horrorBlend = THREE.MathUtils.damp(horrorBlend, horror ? 1 : 0, 2.5, dt);
    updateFox(dt);
    for (const c of chicks) updateChick(c, dt);
    updateCamera(dt);
    if (streaming) streamSim.update(dt);
  }
  world.update(dt, t, horrorBlend, streaming);
  renderer.render(scene, camera);
});
