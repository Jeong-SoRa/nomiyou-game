import * as THREE from 'three';
import { createSpeechBubble } from './speech.js';
import { toon, mesh, sphere, capsule, eyeArc, outline, Blinker } from '../helpers.js';

/**
 * 파닥이 (Padak) - 머리에 대파가 난 작고 동글동글한 흰 병아리.
 * 디자인 시트: 몸 흰색 / 부리 연노랑 / 볼 연핑크 / 대파 초록 / 외곽선 짙은 회색,
 * 머리와 몸이 나뉘지 않는 원통에 가까운 한 덩어리 체형 (머리 : 몸 = 1 : 1).
 */
const WHITE = 0xfdfdfa;
const BEAK = 0xf3d78c;
const CHEEK = 0xf6c9cb;
const LEEK = 0x6a9c5a;
const LEEK_LIGHT = 0x8cb872;
const LEEK_BASE = 0xf0f5e4;
const FEET = 0xe8c98c;
const DARK = 0x3b3b3b;
const LINE = 0x3d3d3d;

export function createChick({ scale = 1 } = {}) {
  const root = new THREE.Group();
  root.name = 'padak';
  root.scale.setScalar(scale);

  const mWhite = toon(WHITE);
  const mDark = toon(DARK);
  const mShine = new THREE.MeshBasicMaterial({ color: 0xffffff });

  // 몸통: 캡슐 하나 (위아래 구분 없음). 반지름 R, 가운데 원통 길이 LEN
  const R = 0.74;
  const LEN = 0.22;
  const BODY_Y = R + LEN / 2; // 바닥에 닿도록
  const body = new THREE.Group();
  body.position.y = BODY_Y;
  root.add(body);

  const shell = capsule(R, LEN, mWhite);
  shell.scale.set(1.28, 1, 1.0); // 옆으로 퉁퉁하게
  outline(shell, 0.035, LINE);
  body.add(shell);

  // 부리: 작은 연노랑 삼각
  const beak = mesh(new THREE.ConeGeometry(0.1, 0.22, 3), toon(BEAK));
  beak.rotation.x = Math.PI / 2;
  beak.position.set(0, 0.02, R - 0.02);
  beak.scale.set(1.3, 0.75, 1);
  outline(beak, 0.02, LINE);
  body.add(beak);

  // 볼
  const mCheek = toon(CHEEK);
  for (const s of [-1, 1]) {
    const cheek = sphere(0.14, mCheek, 1, 0.75, 0.3);
    cheek.position.set(s * 0.52, -0.1, 0.6);
    cheek.rotation.y = s * 0.6;
    body.add(cheek);
  }

  // 눈: 점(dot) / 웃음(happy) / 윙크(wink) / 무표정(stern)
  const dotEyes = [];
  const happyEyes = [];
  const sternEyes = [];
  for (const s of [-1, 1]) {
    const x = s * 0.27;
    const z = 0.69;
    const eye = new THREE.Group();
    eye.position.set(x, 0.18, z);
    eye.rotation.y = s * 0.4;
    const pupil = sphere(0.07, mDark, 1, 1.25, 0.6);
    const shine = new THREE.Mesh(new THREE.SphereGeometry(0.022, 12, 8), mShine);
    shine.position.set(-s * 0.02, 0.035, 0.03);
    eye.add(pupil, shine);
    body.add(eye);
    dotEyes.push(eye);

    const arc = eyeArc(0.11, mDark, 0.03);
    arc.position.set(x, 0.14, z);
    arc.rotation.y = s * 0.4;
    body.add(arc);
    happyEyes.push(arc);

    const stern = new THREE.Group();
    stern.position.set(x, 0.18, z);
    stern.rotation.y = s * 0.4;
    const line = mesh(new THREE.BoxGeometry(0.2, 0.04, 0.04), mDark);
    const brow = mesh(new THREE.BoxGeometry(0.24, 0.04, 0.04), mDark);
    brow.position.set(0, 0.1, 0);
    brow.rotation.z = -s * 0.32;
    stern.add(line, brow);
    body.add(stern);
    sternEyes.push(stern);
  }

  // 대파: 통통한 흰 밑동 + 넓적한 잎 세 장 (가운데 곧게, 양옆은 벌어짐)
  const sprout = new THREE.Group();
  sprout.position.set(0, R + LEN / 2 - 0.05, -0.02);
  body.add(sprout);
  const base = mesh(new THREE.CylinderGeometry(0.15, 0.2, 0.34, 20), toon(LEEK_BASE));
  base.position.y = 0.12;
  outline(base, 0.03, LINE);
  sprout.add(base);
  const leafSpecs = [
    [0.0, 0.72, 0.11, LEEK],
    [-0.5, 0.56, 0.1, LEEK_LIGHT],
    [0.52, 0.54, 0.1, LEEK],
  ];
  const leaves = [];
  for (const [tilt, len, r, color] of leafSpecs) {
    const leaf = capsule(r, len, toon(color));
    leaf.scale.set(1.2, 1, 0.65);
    outline(leaf, 0.03, LINE);
    const pivot = new THREE.Group();
    pivot.position.y = 0.26;
    pivot.rotation.z = tilt;
    leaf.position.y = len / 2 + r * 0.6;
    pivot.add(leaf);
    sprout.add(pivot);
    leaves.push({ pivot, tilt });
  }

  // 날개: 몸 옆 아래쪽의 작은 둥근 돌기
  const wings = [];
  for (const s of [-1, 1]) {
    const wing = new THREE.Group();
    wing.position.set(s * 0.82, -0.2, 0.08);
    const w = sphere(0.24, mWhite, 0.5, 1, 0.75);
    w.position.y = -0.16;
    outline(w, 0.03, LINE);
    wing.add(w);
    wing.rotation.z = s * 0.4;
    body.add(wing);
    wings.push(wing);
  }

  // 발: 작은 연갈색 타원
  const mFeet = toon(FEET);
  const feet = [];
  for (const s of [-1, 1]) {
    const foot = sphere(0.12, mFeet, 1.1, 0.45, 1.4);
    foot.position.set(s * 0.3, 0.05, 0.16);
    outline(foot, 0.02, LINE);
    root.add(foot);
    feet.push(foot);
  }

  // ---------- 애니메이션 ----------
  const blinker = new Blinker(dotEyes);
  let phase = 0;
  let moveBlend = 0;
  let time = Math.random() * 10;
  let expression = 'dot';

  function setExpression(name) {
    expression = name;
    // 왼눈(index 0)과 오른눈(index 1)을 따로 제어해 윙크 표현
    const show = {
      dot: [true, true, false, false, false, false],
      happy: [false, false, true, true, false, false],
      wink: [true, false, false, true, false, false],
      stern: [false, false, false, false, true, true],
    }[name] ?? [true, true, false, false, false, false];
    dotEyes[0].visible = show[0];
    dotEyes[1].visible = show[1];
    happyEyes[0].visible = show[2];
    happyEyes[1].visible = show[3];
    sternEyes[0].visible = show[4];
    sternEyes[1].visible = show[5];
  }
  setExpression(expression);

  // 머리(대파) 위 말풍선. root 가 작게 scale 되므로 픽셀 배율을 그만큼 키움
  const speech = createSpeechBubble(root, BODY_Y + R + 1.25, { unitsPerPixel: 1 / (200 * scale) });

  function update(dt, { moving = false, speed = 1 } = {}) {
    speech.update(dt);
    time += dt;
    moveBlend = THREE.MathUtils.damp(moveBlend, moving ? 1 : 0, 8, dt);
    if (moving) phase += dt * 11 * speed;

    const stern = expression === 'stern';
    const swing = Math.sin(phase) * moveBlend;
    const bounce = Math.abs(Math.sin(phase)) * 0.12 * moveBlend;
    const breathe = stern ? 0 : Math.sin(time * 2.6) * 0.02;

    // 뒤뚱뒤뚱 걷기: 위아래 바운스 + 좌우 기울기 + 앞으로 살짝 숙임
    body.position.y = BODY_Y + bounce;
    body.scale.set(1 - breathe * 0.5, 1 + breathe, 1 - breathe * 0.5);
    body.rotation.z = swing * 0.12;
    body.rotation.x = 0.1 * moveBlend;

    feet[0].position.z = 0.16 + swing * 0.22;
    feet[1].position.z = 0.16 - swing * 0.22;
    feet[0].position.y = 0.05 + Math.max(0, Math.sin(phase)) * 0.1 * moveBlend;
    feet[1].position.y = 0.05 + Math.max(0, -Math.sin(phase)) * 0.1 * moveBlend;

    // 날개: 걸을 때 파닥, 가만히 있으면 살짝 흔들 (무표정일 땐 정지)
    const flap = stern ? 0 : Math.sin(phase * 2) * 0.5 * moveBlend + Math.sin(time * 3) * 0.06;
    wings[0].rotation.z = -0.4 - flap;
    wings[1].rotation.z = 0.4 + flap;

    // 대파 살랑
    for (const { pivot, tilt } of leaves) {
      pivot.rotation.z = tilt + Math.sin(time * 2.4 + tilt * 3) * (stern ? 0.02 : 0.08) + swing * 0.15;
    }

    if (expression === 'dot' || expression === 'wink') blinker.update(dt);
  }

  return { group: root, update, setExpression, getExpression: () => expression, say: speech.say, isTalking: speech.isTalking };
}
