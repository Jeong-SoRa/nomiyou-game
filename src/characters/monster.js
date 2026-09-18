import * as THREE from 'three';
import { toon, mesh, sphere, capsule, outline } from '../helpers.js';

/**
 * 숲의 괴물 — 오염이 극한까지 치달은 파닥이의 최종 형태.
 * 파닥이와 같은 한 덩어리 캡슐 체형이지만: 노미요의 1.5배 크기, 머리의 대파는 없고,
 * 온몸이 꺼멓고, 주둥이가 뾰족하게 길어졌으며, 길쭉길쭉한 이빨이 삐죽 나 있고, 눈이 새빨갛다.
 * 기본 scale 1 일 때 키 ≈ 3.7 (노미요 ≈ 2.5 의 1.5배).
 */
const BLACK = 0x141116;
const BLACK_DEEP = 0x09070b;
const TOOTH = 0xe9e2d3;
const EYE_RED = 0xff1a1a;
const LINE = 0x000000;

export function createMonster({ scale = 1 } = {}) {
  const root = new THREE.Group();
  root.name = 'monster';
  root.scale.setScalar(scale);

  const mBlack = toon(BLACK, { emissive: 0x1a1014 }); // 어둠 속에서도 윤곽이 읽히게 아주 약하게 발광
  const mDeep = toon(BLACK_DEEP, { emissive: 0x0e080a });
  const mTooth = toon(TOOTH);
  const mEye = new THREE.MeshBasicMaterial({ color: EYE_RED });

  // 몸통: 파닥이와 같은 캡슐 한 덩어리 (R 0.74 → 1.85 로 2.5배). 살짝 앞으로 숙인 자세
  const R = 1.85;
  const LEN = 0.55;
  const BODY_Y = R + LEN / 2 - 0.15;
  const body = new THREE.Group();
  body.position.y = BODY_Y;
  root.add(body);
  const shell = capsule(R, LEN, mBlack);
  shell.scale.set(1.22, 1, 1.0);
  outline(shell, 0.05, LINE);
  body.add(shell);

  // 주둥이: 길고 뾰족한 원뿔 (파닥이 부리의 흔적). 앞으로 길게 뻗음
  const snout = new THREE.Group();
  snout.position.set(0, -0.15, R - 0.25);
  body.add(snout);
  const muzzleTop = mesh(new THREE.ConeGeometry(0.62, 2.0, 5), mBlack);
  muzzleTop.rotation.x = Math.PI / 2;
  muzzleTop.position.set(0, 0.12, 1.0);
  muzzleTop.scale.set(1.15, 0.75, 1);
  outline(muzzleTop, 0.04, LINE);
  const muzzleBottom = mesh(new THREE.ConeGeometry(0.5, 1.6, 5), mDeep);
  muzzleBottom.rotation.x = Math.PI / 2;
  muzzleBottom.position.set(0, -0.32, 0.8);
  muzzleBottom.scale.set(1.1, 0.6, 1);
  outline(muzzleBottom, 0.04, LINE);
  snout.add(muzzleTop, muzzleBottom);

  // 이빨: 위턱에서 아래로, 아래턱에서 위로 삐죽삐죽 (길이가 제각각인 가늘고 긴 원뿔)
  const teeth = [];
  const toothSpecs = [
    // [x, z, length, fromTop]
    [-0.42, 0.25, 0.55, true],
    [-0.25, 0.7, 0.85, true],
    [-0.08, 1.2, 0.7, true],
    [0.12, 1.55, 1.0, true],
    [0.3, 0.95, 0.6, true],
    [0.45, 0.45, 0.8, true],
    [-0.35, 0.5, 0.6, false],
    [-0.15, 1.0, 0.9, false],
    [0.05, 1.45, 0.65, false],
    [0.25, 0.7, 0.75, false],
    [0.4, 0.2, 0.5, false],
  ];
  for (const [x, z, len, fromTop] of toothSpecs) {
    const tooth = mesh(new THREE.ConeGeometry(0.075, len, 6), mTooth);
    const yBase = fromTop ? -0.05 : -0.42;
    tooth.position.set(x, yBase + (fromTop ? -len / 2 + 0.05 : len / 2 - 0.05), z);
    tooth.rotation.x = fromTop ? Math.PI : 0;
    tooth.rotation.z = (Math.random() - 0.5) * 0.3;
    snout.add(tooth);
    teeth.push(tooth);
  }

  // 눈: 새빨간 구 두 개 + 붉은 빛. 파닥이 눈 자리보다 위쪽, 사납게 치켜뜸
  const eyes = [];
  for (const s of [-1, 1]) {
    const eye = new THREE.Group();
    eye.position.set(s * 0.7, 0.55, R * 0.86);
    eye.rotation.y = s * 0.35;
    const ball = sphere(0.24, mEye, 1, 0.8, 0.5);
    const pupil = sphere(0.1, mDeep, 1, 1.4, 0.6);
    pupil.position.z = 0.12;
    const brow = mesh(new THREE.BoxGeometry(0.62, 0.11, 0.1), mDeep);
    brow.position.set(0, 0.26, 0.05);
    brow.rotation.z = s * 0.45;
    eye.add(ball, pupil, brow);
    body.add(eye);
    eyes.push(eye);
  }
  const eyeLight = new THREE.PointLight(EYE_RED, 6, 8, 2);
  eyeLight.position.set(0, 0.6, R + 0.6);
  body.add(eyeLight);

  // 날개(팔) 흔적: 길고 처진 검은 돌기
  const arms = [];
  for (const s of [-1, 1]) {
    const arm = new THREE.Group();
    arm.position.set(s * 2.05, -0.3, 0.1);
    const a = sphere(0.5, mBlack, 0.55, 1.5, 0.7);
    a.position.y = -0.55;
    outline(a, 0.04, LINE);
    arm.add(a);
    arm.rotation.z = s * 0.25;
    body.add(arm);
    arms.push(arm);
  }

  // 발: 크고 어두운 갈고리발
  const feet = [];
  for (const s of [-1, 1]) {
    const foot = sphere(0.32, mDeep, 1.1, 0.45, 1.5);
    foot.position.set(s * 0.75, 0.13, 0.4);
    outline(foot, 0.03, LINE);
    root.add(foot);
    feet.push(foot);
    for (let i = -1; i <= 1; i++) {
      const claw = mesh(new THREE.ConeGeometry(0.07, 0.3, 5), mTooth);
      claw.rotation.x = Math.PI / 2;
      claw.position.set(s * 0.75 + i * 0.16, 0.1, 0.85);
      root.add(claw);
    }
  }

  // ---------- 애니메이션: 무겁게 숨 쉬고, 이따금 경련하듯 떨림 ----------
  let time = Math.random() * 10;
  let phase = 0;
  let moveBlend = 0;
  let twitch = 0;
  function update(dt, { moving = false, speed = 1 } = {}) {
    time += dt;
    moveBlend = THREE.MathUtils.damp(moveBlend, moving ? 1 : 0, 6, dt);
    if (moving) phase += dt * 7 * speed;
    twitch -= dt;
    if (twitch <= 0 && Math.random() < dt * 0.6) twitch = 0.18;
    const jitter = twitch > 0 ? (Math.random() - 0.5) * 0.08 : 0;
    const breathe = Math.sin(time * 1.3) * 0.035;
    const swing = Math.sin(phase) * moveBlend;
    body.position.y = BODY_Y + Math.abs(Math.sin(phase)) * 0.18 * moveBlend;
    body.scale.set(1 - breathe * 0.4, 1 + breathe, 1 - breathe * 0.4);
    body.rotation.z = swing * 0.1 + jitter;
    body.rotation.x = 0.18 + 0.08 * moveBlend + jitter * 0.5;
    snout.rotation.x = Math.sin(time * 0.9) * 0.04 + (twitch > 0 ? 0.12 : 0); // 턱을 벌렸다 다물었다
    feet[0].position.z = 0.4 + swing * 0.4;
    feet[1].position.z = 0.4 - swing * 0.4;
    for (const [i, arm] of arms.entries()) arm.rotation.z = (i ? 1 : -1) * (0.25 + Math.sin(time * 1.7 + i) * 0.06) + jitter;
    eyeLight.intensity = 5 + Math.sin(time * 6) * 1 + (twitch > 0 ? 4 : 0);
  }

  return { group: root, update, eyes, height: (BODY_Y + R) * scale };
}
