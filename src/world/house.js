import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { toon, mesh, sphere, outline, rand } from '../helpers.js';
import {
  woodTexture,
  foxIconTexture,
  noteTexture,
  pawTexture,
  clockFaceTexture,
  chatSignTexture,
  screenTexture,
} from './textures.js';

/**
 * 노미요의 방: 베이지 벽 + 나무 바닥.
 * 책상(모니터·키보드·머그컵·노트) + 앉을 수 있는 의자, 벽에 붙은 작은 CHAT 칠판,
 * 한쪽 구석의 포근한 침대, 벽시계·메모·여우 사진·발자국 스티커, 화분, 선반,
 * 그리고 왼쪽 벽의 문(나가면 숲).
 */
const ORANGE = 0xf58a2f;
const LINE = 0x2a211d;
const WALL = 0xf4e4cf;
const CREAM = 0xfffaf0;

// 방 치수
const W = 22; // x: -11 ~ 11
const D = 16; // z: -8 ~ 8
const H = 8;

export function createHouse() {
  const group = new THREE.Group();
  group.name = 'house';

  const mWood = new THREE.MeshStandardMaterial({ map: woodTexture({ repeat: [3, 2] }), roughness: 0.9 });
  const mDeskWood = new THREE.MeshStandardMaterial({
    map: woodTexture({ base: '#d9a96e', dark: '#b8864d', light: '#e6bc84', planks: 3, repeat: [2, 1] }),
    roughness: 0.85,
  });
  const mWall = toon(WALL);
  const mCream = toon(CREAM);
  const mOrange = toon(ORANGE);
  const mDark = toon(LINE);
  const mWhite = toon(0xfbfbf8);
  const mGray = toon(0xd8d3c8);
  const mGreen = toon(0x5fa35a);
  const mGreenDark = toon(0x3f8a45);

  const rbox = (w, h, d, mat, r = 0.08) => mesh(new RoundedBoxGeometry(w, h, d, 3, r), mat);

  // ---------- 방 껍데기 (안쪽 면만 그려서 카메라가 밖에 있어도 내부가 보임) ----------
  const shell = new THREE.Mesh(
    new THREE.BoxGeometry(W, H, D),
    [mWall, mWall, toon(0xfff8ee), mWood, mWall, mWall].map((m) => {
      const c = m.clone();
      c.side = THREE.BackSide;
      return c;
    })
  );
  shell.position.y = H / 2;
  shell.receiveShadow = true;
  group.add(shell);

  const mBase = toon(0xe7d3b8);
  const baseboard = (len, x, z, ry) => {
    const b = mesh(new THREE.BoxGeometry(len, 0.35, 0.12), mBase);
    b.position.set(x, 0.175, z);
    b.rotation.y = ry;
    group.add(b);
  };
  baseboard(W, 0, -D / 2 + 0.06, 0);
  baseboard(D, -W / 2 + 0.06, 0, Math.PI / 2);
  baseboard(D, W / 2 - 0.06, 0, Math.PI / 2);

  // ---------- 책상 ----------
  const DESK = { x: -3.5, z: -6.4, w: 6.4, d: 2.4, h: 1.75 };
  const TOP = DESK.h + 0.08;
  const deskTop = mesh(new THREE.BoxGeometry(DESK.w, 0.16, DESK.d), mDeskWood);
  deskTop.position.set(DESK.x, DESK.h, DESK.z);
  group.add(deskTop);
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const leg = mesh(new THREE.BoxGeometry(0.16, DESK.h, 0.16), toon(0xb9854f));
      leg.position.set(DESK.x + sx * (DESK.w / 2 - 0.2), DESK.h / 2, DESK.z + sz * (DESK.d / 2 - 0.2));
      group.add(leg);
    }
  }
  const drawer = mesh(new THREE.BoxGeometry(1.6, 1.3, DESK.d - 0.3), toon(0xc9955c));
  drawer.position.set(DESK.x + DESK.w / 2 - 1.0, DESK.h - 0.75, DESK.z);
  group.add(drawer);
  for (let i = 0; i < 2; i++) {
    const knob = sphere(0.06, mDark);
    knob.position.set(DESK.x + DESK.w / 2 - 1.0, DESK.h - 0.45 - i * 0.55, DESK.z + DESK.d / 2 - 0.13);
    group.add(knob);
  }

  // 데스크 매트 + 키보드 + 마우스
  const mat = mesh(new THREE.BoxGeometry(3.4, 0.04, 1.1), toon(0x3a3a40));
  mat.position.set(DESK.x, TOP + 0.02, DESK.z + 0.55);
  const keyboard = rbox(2.0, 0.09, 0.62, mGray, 0.03);
  keyboard.position.set(DESK.x - 0.3, TOP + 0.085, DESK.z + 0.55);
  const mouse = rbox(0.3, 0.14, 0.48, mWhite, 0.06);
  mouse.position.set(DESK.x + 1.1, TOP + 0.1, DESK.z + 0.6);
  group.add(mat, keyboard, mouse);

  // ---------- 모니터 (작게, 책상 위) ----------
  const monitor = new THREE.Group();
  monitor.position.set(DESK.x, TOP, DESK.z - 0.55);
  group.add(monitor);
  const bezel = rbox(4.7, 3.05, 0.22, mCream, 0.14);
  bezel.position.y = 2.15;
  outline(bezel, 0.035, LINE);
  monitor.add(bezel);
  const screenMatOff = new THREE.MeshBasicMaterial({ map: screenTexture('off') });
  const screenMatOn = new THREE.MeshBasicMaterial({ map: screenTexture('noise') });
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(4.35, 2.7), screenMatOff);
  screen.position.set(0, 2.15, 0.115);
  monitor.add(screen);
  const stand = mesh(new THREE.BoxGeometry(0.4, 0.7, 0.25), mGray);
  stand.position.set(0, 0.35, -0.05);
  const foot = rbox(1.8, 0.09, 0.8, mGray, 0.04);
  foot.position.set(0, 0.045, 0.08);
  monitor.add(stand, foot);
  const screenLight = new THREE.PointLight(0xff5040, 0, 9, 2);
  screenLight.position.set(0, 2.2, 1.2);
  monitor.add(screenLight);

  // 머그컵 + 김 (모니터 오른쪽)
  const mug = new THREE.Group();
  mug.position.set(DESK.x + 2.7, TOP, DESK.z - 0.3);
  const coaster = mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.04, 24), toon(0xe6c7a0));
  coaster.position.y = 0.02;
  const cup = mesh(new THREE.CylinderGeometry(0.3, 0.27, 0.68, 28), mWhite);
  cup.position.y = 0.38;
  outline(cup, 0.03, LINE);
  const coffee = mesh(new THREE.CylinderGeometry(0.27, 0.27, 0.04, 28), toon(0x5a3a22));
  coffee.position.y = 0.71;
  const handle = mesh(new THREE.TorusGeometry(0.16, 0.05, 10, 20), mWhite);
  handle.position.set(0.33, 0.4, 0);
  const mugIcon = new THREE.Mesh(
    new THREE.PlaneGeometry(0.36, 0.36),
    new THREE.MeshBasicMaterial({ map: foxIconTexture(), transparent: true })
  );
  mugIcon.position.set(0, 0.4, 0.305);
  mug.add(coaster, cup, coffee, handle, mugIcon);
  const steam = [];
  const mSteam = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35 });
  for (let i = 0; i < 3; i++) {
    const s = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 8), mSteam);
    mug.add(s);
    steam.push({ mesh: s, offset: i / 3 });
  }
  group.add(mug);

  // 노트 (모니터 왼쪽)
  const notebook = new THREE.Group();
  notebook.position.set(DESK.x - 2.5, TOP, DESK.z - 0.1);
  notebook.rotation.y = 0.35;
  const nbBody = rbox(1.5, 0.12, 1.1, mWhite, 0.04);
  nbBody.position.y = 0.06;
  outline(nbBody, 0.02, LINE);
  const nbIcon = new THREE.Mesh(
    new THREE.PlaneGeometry(0.55, 0.55),
    new THREE.MeshBasicMaterial({ map: foxIconTexture(), transparent: true })
  );
  nbIcon.rotation.x = -Math.PI / 2;
  nbIcon.position.set(0, 0.125, 0.05);
  notebook.add(nbBody, nbIcon);
  for (let i = 0; i < 7; i++) {
    const ring = mesh(new THREE.TorusGeometry(0.05, 0.015, 8, 16), toon(0x7d7d80));
    ring.position.set(-0.6 + i * 0.2, 0.09, -0.53);
    notebook.add(ring);
  }
  group.add(notebook);

  // ---------- 의자 (책상 앞, 모니터를 향함) ----------
  const CHAIR = { x: DESK.x, z: -4.0, seatY: 1.05 };
  const chair = new THREE.Group();
  chair.position.set(CHAIR.x, 0, CHAIR.z);
  group.add(chair);
  const seat = rbox(1.7, 0.28, 1.6, mOrange, 0.12);
  seat.position.y = CHAIR.seatY - 0.14;
  outline(seat, 0.03, LINE);
  const back = rbox(1.7, 1.7, 0.28, mOrange, 0.12);
  back.position.set(0, CHAIR.seatY + 0.75, 0.8);
  back.rotation.x = -0.12;
  outline(back, 0.03, LINE);
  const post = mesh(new THREE.CylinderGeometry(0.09, 0.09, CHAIR.seatY - 0.3, 12), mGray);
  post.position.y = (CHAIR.seatY - 0.3) / 2;
  chair.add(seat, back, post);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const spoke = mesh(new THREE.BoxGeometry(0.9, 0.08, 0.12), mGray);
    spoke.position.set(Math.cos(a) * 0.45, 0.08, Math.sin(a) * 0.45);
    spoke.rotation.y = -a;
    const wheel = sphere(0.09, mDark);
    wheel.position.set(Math.cos(a) * 0.85, 0.09, Math.sin(a) * 0.85);
    chair.add(spoke, wheel);
  }

  // ---------- CHAT 칠판 (벽에 부착, 작게) ----------
  const backZ = -D / 2 + 0.02;
  const board = new THREE.Group();
  board.position.set(3.2, 4.9, backZ);
  group.add(board);
  const boardFrame = rbox(3.4, 2.5, 0.14, mOrange, 0.08);
  boardFrame.position.z = 0.07;
  outline(boardFrame, 0.03, LINE);
  const boardFace = rbox(3.15, 2.25, 0.06, mCream, 0.05);
  boardFace.position.z = 0.15;
  const tray = mesh(new THREE.BoxGeometry(2.0, 0.08, 0.28), mOrange);
  tray.position.set(0, -1.28, 0.2);
  const chalk = mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.4, 8), mWhite);
  chalk.rotation.z = Math.PI / 2;
  chalk.position.set(-0.4, -1.2, 0.22);
  board.add(boardFrame, boardFace, tray, chalk);
  const chatSign = new THREE.Mesh(
    new THREE.PlaneGeometry(1.5, 0.47),
    new THREE.MeshBasicMaterial({ map: chatSignTexture(), transparent: true })
  );
  chatSign.position.set(0, 1.45, 0.16);
  board.add(chatSign);

  // ---------- 침대 (오른쪽 뒤 구석) ----------
  const BED = { x: 8.3, z: -5.3, w: 3.6, l: 5.4 };
  const bed = new THREE.Group();
  bed.position.set(BED.x, 0, BED.z);
  group.add(bed);
  const frame = mesh(new THREE.BoxGeometry(BED.w, 0.55, BED.l), mDeskWood);
  frame.position.y = 0.275;
  const headboard = rbox(BED.w, 1.9, 0.2, toon(0xc9955c), 0.08);
  headboard.position.set(0, 0.95, -BED.l / 2 + 0.1);
  outline(headboard, 0.03, LINE);
  const mattress = rbox(BED.w - 0.3, 0.5, BED.l - 0.3, mCream, 0.15);
  mattress.position.y = 0.8;
  outline(mattress, 0.03, LINE);
  const blanket = rbox(BED.w - 0.2, 0.36, BED.l * 0.62, toon(0x93b8f0), 0.16);
  blanket.position.set(0, 1.12, BED.l * 0.16);
  outline(blanket, 0.03, LINE);
  const fold = rbox(BED.w - 0.2, 0.2, 0.7, toon(0xf6e6cf), 0.08);
  fold.position.set(0, 1.28, -BED.l * 0.15 + 0.1);
  outline(fold, 0.02, LINE);
  bed.add(frame, headboard, mattress, blanket, fold);
  for (const s of [-1, 1]) {
    const pillow = rbox(1.4, 0.36, 0.95, mWhite, 0.16);
    pillow.position.set(s * 0.8, 1.2, -BED.l / 2 + 0.75);
    pillow.rotation.y = s * 0.08;
    outline(pillow, 0.025, LINE);
    bed.add(pillow);
  }
  // 게임패드는 침대 위에
  const pad = new THREE.Group();
  pad.position.set(-0.6, 1.3, 1.4);
  pad.rotation.y = 0.5;
  const padBody = rbox(1.5, 0.2, 0.68, mDark, 0.1);
  padBody.position.y = 0.1;
  const padTop = rbox(0.9, 0.07, 0.45, mOrange, 0.04);
  padTop.position.set(0, 0.22, -0.02);
  pad.add(padBody, padTop);
  for (const s of [-1, 1]) {
    const grip = mesh(new THREE.CylinderGeometry(0.15, 0.18, 0.5, 14), mDark);
    grip.rotation.x = Math.PI / 2 - 0.4;
    grip.position.set(s * 0.55, 0.1, 0.32);
    pad.add(grip);
  }
  bed.add(pad);
  // 침대 옆 둥근 러그
  const rug = mesh(new THREE.CylinderGeometry(1.6, 1.6, 0.04, 40), toon(0xf2d3b5));
  rug.position.set(5.6, 0.02, -1.4);
  outline(rug, 0.02, 0xe0b98f);
  group.add(rug);

  // ---------- 문 (왼쪽 벽) ----------
  const DOOR = { z: 3.5, w: 2.4, h: 5.0 };
  const door = new THREE.Group();
  door.position.set(-W / 2 + 0.02, 0, DOOR.z);
  group.add(door);
  const frameMat = toon(0xf0e2cc);
  const jambL = mesh(new THREE.BoxGeometry(0.22, DOOR.h + 0.2, 0.22), frameMat);
  jambL.position.set(0.05, (DOOR.h + 0.2) / 2, -DOOR.w / 2 - 0.1);
  const jambR = jambL.clone();
  jambR.position.z = DOOR.w / 2 + 0.1;
  const lintel = mesh(new THREE.BoxGeometry(0.22, 0.22, DOOR.w + 0.44), frameMat);
  lintel.position.set(0.05, DOOR.h + 0.1, 0);
  const panel = rbox(0.12, DOOR.h - 0.05, DOOR.w, toon(0xc9782e), 0.03);
  panel.position.set(0.1, (DOOR.h - 0.05) / 2, 0);
  outline(panel, 0.03, LINE);
  const inset = rbox(0.06, DOOR.h * 0.55, DOOR.w * 0.6, toon(0xd88a3f), 0.02);
  inset.position.set(0.17, DOOR.h * 0.58, 0);
  const knob = sphere(0.1, toon(0xf2c94c));
  knob.position.set(0.22, DOOR.h * 0.45, DOOR.w / 2 - 0.35);
  door.add(jambL, jambR, lintel, panel, inset, knob);
  const doorMat = mesh(new THREE.BoxGeometry(1.6, 0.03, 2.6), toon(0xd9b48a));
  doorMat.position.set(-W / 2 + 1.0, 0.015, DOOR.z);
  group.add(doorMat);

  // ---------- 벽 장식 ----------
  const wallPlane = (w, h, tex, x, y, rz = 0) => {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, transparent: true }));
    p.position.set(x, y, backZ);
    p.rotation.z = rz;
    group.add(p);
    return p;
  };
  wallPlane(1.5, 1.5, noteTexture(['노미요', '라이브', ':)']), -8.4, 6.2, 0.06);
  const tape = new THREE.Mesh(new THREE.PlaneGeometry(0.85, 0.2), new THREE.MeshBasicMaterial({ color: ORANGE }));
  tape.position.set(-7.85, 6.85, backZ + 0.01);
  tape.rotation.z = 0.6;
  group.add(tape);
  wallPlane(1.2, 1.2, foxIconTexture('#fffdf7'), -8.5, 4.3, -0.04);
  const pin = sphere(0.07, mOrange);
  pin.position.set(-8.5, 4.95, backZ + 0.05);
  group.add(pin);
  const paw = pawTexture();
  for (const [x, y, r] of [
    [-9.6, 2.8, 0.3],
    [5.6, 6.8, -0.4],
    [0.6, 6.4, 0.5],
    [-1.2, 5.0, 0.2],
  ]) {
    wallPlane(0.5, 0.5, paw, x, y, r);
  }

  // 벽시계
  const clock = new THREE.Group();
  clock.position.set(8.3, 6.6, backZ + 0.08);
  group.add(clock);
  const clockBody = mesh(new THREE.CylinderGeometry(0.8, 0.8, 0.12, 40), mDark);
  clockBody.rotation.x = Math.PI / 2;
  const clockFace = new THREE.Mesh(new THREE.CircleGeometry(0.72, 40), new THREE.MeshBasicMaterial({ map: clockFaceTexture() }));
  clockFace.position.z = 0.07;
  const hourPivot = new THREE.Group();
  const hourHand = mesh(new THREE.BoxGeometry(0.07, 0.42, 0.03), mDark);
  hourHand.position.set(0, 0.18, 0.1);
  hourPivot.add(hourHand);
  const minPivot = new THREE.Group();
  const minHand = mesh(new THREE.BoxGeometry(0.05, 0.6, 0.03), mDark);
  minHand.position.set(0, 0.27, 0.12);
  minPivot.add(minHand);
  clock.add(clockBody, clockFace, hourPivot, minPivot);

  // 선반 + 화분
  const shelf = mesh(new THREE.BoxGeometry(2.4, 0.14, 1.0), mDeskWood);
  shelf.position.set(W / 2 - 1.2, 4.1, 1.5);
  group.add(shelf);
  const plant = (x, y, z, scale) => {
    const g = new THREE.Group();
    g.position.set(x, y, z);
    g.scale.setScalar(scale);
    const pot = mesh(new THREE.CylinderGeometry(0.42, 0.34, 0.75, 24), mWhite);
    pot.position.y = 0.375;
    outline(pot, 0.03, LINE);
    const soil = mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.08, 24), toon(0x5b4432));
    soil.position.y = 0.74;
    g.add(pot, soil);
    for (let i = 0; i < 7; i++) {
      const stem = new THREE.Group();
      stem.rotation.y = (i / 7) * Math.PI * 2 + rand(-0.3, 0.3);
      stem.rotation.z = rand(0.25, 0.6);
      stem.position.y = 0.75;
      const stalk = mesh(new THREE.CylinderGeometry(0.03, 0.04, 1.1, 8), mGreenDark);
      stalk.position.y = 0.55;
      const leaf = sphere(0.36, i % 2 ? mGreen : mGreenDark, 0.6, 1, 0.25);
      leaf.position.y = 1.25;
      leaf.rotation.x = 0.3;
      outline(leaf, 0.02, LINE);
      stem.add(stalk, leaf);
      g.add(stem);
    }
    group.add(g);
  };
  plant(-W / 2 + 1.4, 0, -3.2, 1.6);
  plant(W / 2 - 1.2, 4.17, 1.5, 0.9);

  // 파란 쿠션 (화분 옆 바닥)
  const cushion = rbox(2.4, 0.6, 2.0, toon(0x7ea6e6), 0.28);
  cushion.position.set(-W / 2 + 1.6, 0.3, -0.4);
  outline(cushion, 0.035, LINE);
  group.add(cushion);

  // ---------- 조명 ----------
  const hemi = new THREE.HemisphereLight(0xfff3e2, 0xc8a27a, 0.9);
  const sun = new THREE.DirectionalLight(0xffe2bf, 1.7);
  sun.position.set(-7, 9, 5);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -14, right: 14, top: 14, bottom: -14, near: 1, far: 40 });
  sun.shadow.bias = -0.0006;
  const lamp = new THREE.PointLight(0xffd9a8, 6, 18, 1.6);
  lamp.position.set(3, H - 0.6, 1);
  group.add(hemi, sun, lamp);

  // ---------- 인터페이스 ----------
  const margin = 0.9;
  const bounds = { minX: -W / 2 + margin, maxX: W / 2 - margin, minZ: -D / 2 + margin, maxZ: D / 2 - margin };
  const obstacles = [
    { minX: DESK.x - DESK.w / 2 - 0.2, maxX: DESK.x + DESK.w / 2 + 0.2, minZ: -D / 2, maxZ: DESK.z + DESK.d / 2 + 0.1 },
    { minX: BED.x - BED.w / 2 - 0.1, maxX: W / 2, minZ: -D / 2, maxZ: BED.z + BED.l / 2 + 0.1 },
    { minX: -W / 2, maxX: -W / 2 + 2.7, minZ: -4.5, maxZ: -1.9 }, // 큰 화분
    { minX: CHAIR.x - 0.9, maxX: CHAIR.x + 0.9, minZ: CHAIR.z - 0.8, maxZ: CHAIR.z + 0.9 },
  ];

  function setup(scene) {
    scene.background = new THREE.Color(0x2b2118);
    scene.fog = null;
  }

  let noiseTimer = 0;
  function update(dt, t, horrorBlend) {
    hemi.intensity = THREE.MathUtils.lerp(0.9, 0.08, horrorBlend);
    sun.intensity = THREE.MathUtils.lerp(1.7, 0.1, horrorBlend);
    lamp.intensity = THREE.MathUtils.lerp(6, 0.6, horrorBlend);
    const on = horrorBlend > 0.4;
    screen.material = on ? screenMatOn : screenMatOff;
    if (on) {
      noiseTimer -= dt;
      if (noiseTimer <= 0) {
        noiseTimer = 0.08;
        screenMatOn.map.dispose();
        screenMatOn.map = screenTexture('noise');
      }
      const flick = Math.sin(t * 23) * Math.sin(t * 7.3) > 0.6 ? 0.3 : 1;
      screenLight.intensity = 12 * horrorBlend * flick;
    } else {
      screenLight.intensity = 0;
    }
    const now = new Date();
    const m = now.getMinutes() + now.getSeconds() / 60;
    const h = (now.getHours() % 12) + m / 60;
    minPivot.rotation.z = -(m / 60) * Math.PI * 2;
    hourPivot.rotation.z = -(h / 12) * Math.PI * 2;
    for (const { mesh: s, offset } of steam) {
      const k = (t * 0.35 + offset) % 1;
      s.position.set(Math.sin((k + offset) * 9) * 0.1, 0.82 + k * 0.8, 0);
      s.scale.setScalar(0.6 + k * 1.2);
      s.material.opacity = 0.35 * (1 - k);
    }
  }

  return {
    group,
    bounds,
    obstacles,
    setup,
    update,
    foxSpawn: { position: new THREE.Vector3(0, 0, 1.5), heading: 0 },
    chickSpawns: [new THREE.Vector3(3, 0, 2), new THREE.Vector3(-4, 0, 4.5), new THREE.Vector3(1.5, 0, 6)],
    cameraStart: new THREE.Vector3(0, 4.5, 10.5),
    // 문: 이 지점 근처에 가면 다른 월드로 이동. doorSpawn 은 이 월드로 들어올 때 서는 위치
    door: { position: new THREE.Vector3(-W / 2 + 1.5, 0, DOOR.z), radius: 1.5, target: 'forest' },
    doorSpawn: { position: new THREE.Vector3(-W / 2 + 3.6, 0, DOOR.z), heading: Math.PI / 2, camera: { back: 3.6, height: 6.2 } },
    // 의자: 근처에서 Space 를 누르면 앉음
    seat: {
      position: new THREE.Vector3(CHAIR.x, CHAIR.seatY, CHAIR.z + 0.05),
      heading: Math.PI, // 모니터(-z)를 향함
      approach: new THREE.Vector3(CHAIR.x, 0, CHAIR.z + 1.9),
      radius: 2.6,
    },
  };
}
