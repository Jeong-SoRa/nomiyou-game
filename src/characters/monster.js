import * as THREE from 'three';
import { toon, mesh, sphere, capsule, outline } from '../helpers.js';

/**
 * 숲의 괴물 — 오염이 극한까지 치달은 파닥이의 최종 형태.
 * 둥글고 귀여운 다른 캐릭터들과 완전히 다른 실루엣이어야 한다: 부리/주둥이 형태 없이 이빨만 들쭉날쭉 나 있고,
 * 눈썹 없는 붉고 초점 없는(무표정한) 눈, 둥근 몸통이 아니라 가늘고 길쭉하게 야윈 몸.
 * 기본 scale 1 일 때 키 ≈ 3.7 (노미요 ≈ 2.5 의 1.5배). 항상 앞으로 구부정하게 고개를 내민 자세.
 */
const BLACK = 0x0c0a0d;
const BLACK_DEEP = 0x040304;
const TOOTH = 0xcfc6b6;
const EYE_RED = 0xff1010;
const VOID = 0x000000;
const LINE = 0x000000;

export function createMonster({ scale = 1 } = {}) {
  const root = new THREE.Group();
  root.name = 'monster';
  root.scale.setScalar(scale);

  const mBlack = toon(BLACK, { emissive: 0x120a0c }); // 어둠 속에서도 실루엣이 아주 희미하게 읽히도록
  const mDeep = toon(BLACK_DEEP);
  const mTooth = toon(TOOTH);
  const mEye = new THREE.MeshBasicMaterial({ color: EYE_RED }); // 하이라이트 없는 납작한 빛 — 초점 없는 눈
  const mVoid = new THREE.MeshBasicMaterial({ color: VOID }); // 빛을 전혀 받지 않는 새까만 입속

  // ---------- 몸통: 가늘고 길쭉한 캡슐 (둥글지 않게 폭을 크게 줄이고 길이를 늘림) ----------
  const R = 0.72;
  const LEN = 2.15;
  const BODY_Y = R + LEN / 2 - 0.1;
  const body = new THREE.Group();
  body.position.y = BODY_Y;
  root.add(body);
  const shell = capsule(R, LEN, mBlack);
  shell.scale.set(0.82, 1, 0.72); // 정면에서 봐도 갸름하게
  outline(shell, 0.045, LINE);
  body.add(shell);
  // 갈비뼈가 드러난 듯 앙상한 느낌을 주는 가로 홈 몇 줄
  for (let i = 0; i < 4; i++) {
    const rib = mesh(new THREE.TorusGeometry(R * 0.78, 0.02, 6, 20, Math.PI * 1.3), mDeep);
    rib.position.set(0, LEN * 0.28 - i * (LEN * 0.22), 0);
    rib.rotation.set(Math.PI / 2, 0, Math.PI * 0.35);
    rib.scale.set(0.82, 0.72, 1);
    body.add(rib);
  }

  // ---------- 머리: 몸통 위에서 앞으로 길게 뻗어 나온 갸름한 두개골. 부리/주둥이 형태 없음 ----------
  const headGroup = new THREE.Group();
  headGroup.position.set(0, R * 0.65, 0.1);
  headGroup.rotation.x = 0.58; // 고개를 앞으로 내밀고 아래를 노려보는 자세
  body.add(headGroup);
  const HEAD_TILT = headGroup.rotation.x;

  const skull = sphere(0.5, mBlack, 1.05, 0.82, 1.7);
  skull.position.z = 0.35;
  outline(skull, 0.035, LINE);
  headGroup.add(skull);
  // 정수리에서 뒤로 이어지는 목: 몸통과 머리를 자연스럽게 연결
  const neck = mesh(new THREE.CylinderGeometry(0.38, 0.5, 0.7, 12), mBlack);
  neck.position.set(0, -0.05, -0.35);
  neck.rotation.x = 0.5;
  outline(neck, 0.03, LINE);
  headGroup.add(neck);

  // 입: 돌출된 부리 없이, 두개골 앞쪽 아래에 뚫린 새까만 틈(공백)만 있고 그 가장자리에서 이빨이 삐죽삐죽 자란다
  const maw = mesh(new THREE.SphereGeometry(0.34, 16, 12), mVoid);
  maw.scale.set(1.15, 0.75, 0.55);
  maw.position.set(0, -0.16, 0.85);
  headGroup.add(maw);

  const teeth = [];
  const toothSpecs = [
    // [x, z, length, fromTop]  — 길이가 제각각이고 살짝씩 어긋나 있어 가지런하지 않은, 뜯겨나간 듯한 인상
    [-0.26, 0.62, 0.46, true],
    [-0.13, 0.84, 0.72, true],
    [0.0, 0.98, 0.56, true],
    [0.14, 0.88, 0.82, true],
    [0.27, 0.66, 0.5, true],
    [-0.34, 0.42, 0.34, true],
    [0.35, 0.4, 0.38, true],
    [-0.22, 0.5, 0.5, false],
    [-0.07, 0.78, 0.68, false],
    [0.1, 0.9, 0.44, false],
    [0.24, 0.6, 0.6, false],
    [0.34, 0.36, 0.3, false],
  ];
  for (const [x, z, len, fromTop] of toothSpecs) {
    const tooth = mesh(new THREE.ConeGeometry(0.06, len, 6), mTooth);
    const yBase = fromTop ? -0.02 : -0.32;
    tooth.position.set(x, yBase + (fromTop ? -len / 2 + 0.04 : len / 2 - 0.04), z);
    tooth.rotation.x = fromTop ? Math.PI : 0;
    tooth.rotation.z = (Math.random() - 0.5) * 0.4; // 방향이 들쭉날쭉
    tooth.rotation.x += (Math.random() - 0.5) * 0.2;
    headGroup.add(tooth);
    teeth.push(tooth);
  }

  // 눈: 눈썹도 하이라이트도 없이, 붉게 빛나되 아무것도 응시하지 않는 납작한 눈
  const eyes = [];
  for (const s of [-1, 1]) {
    const eye = new THREE.Group();
    eye.position.set(s * 0.24, 0.14, 0.55);
    eye.rotation.y = s * 0.3;
    const ball = sphere(0.1, mEye, 1, 0.7, 0.4);
    eye.add(ball);
    headGroup.add(eye);
    eyes.push(eye);
  }
  const eyeLight = new THREE.PointLight(EYE_RED, 4.5, 7, 2);
  eyeLight.position.set(0, 0.14, 1.0);
  headGroup.add(eyeLight);

  // ---------- 팔: 뼈만 남은 듯 가늘고 긴 팔이 무릎 아래까지 축 늘어져 있다 ----------
  const arms = [];
  const ARM_LEN = 1.7;
  for (const s of [-1, 1]) {
    const arm = new THREE.Group();
    arm.position.set(s * 0.42, R * 0.2, 0.05);
    const limb = mesh(new THREE.CapsuleGeometry(0.09, ARM_LEN, 6, 12), mBlack);
    limb.position.y = -ARM_LEN / 2 - 0.09;
    outline(limb, 0.025, LINE);
    arm.add(limb);
    for (let i = -1; i <= 1; i++) {
      const claw = mesh(new THREE.ConeGeometry(0.045, 0.26, 5), mTooth);
      claw.rotation.x = Math.PI / 2;
      claw.position.set(i * 0.075, -ARM_LEN - 0.2, 0.1);
      arm.add(claw);
    }
    arm.rotation.z = s * 0.1;
    body.add(arm);
    arms.push(arm);
  }

  // ---------- 발: 앙상한 발과 발톱 ----------
  const feet = [];
  for (const s of [-1, 1]) {
    const foot = sphere(0.17, mDeep, 1.2, 0.4, 1.6);
    foot.position.set(s * 0.3, 0.08, 0.28);
    outline(foot, 0.025, LINE);
    root.add(foot);
    feet.push(foot);
    for (let i = -1; i <= 1; i++) {
      const claw = mesh(new THREE.ConeGeometry(0.05, 0.22, 5), mTooth);
      claw.rotation.x = Math.PI / 2;
      claw.position.set(s * 0.3 + i * 0.1, 0.06, 0.58);
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
    if (moving) phase += dt * 6.5 * speed;
    twitch -= dt;
    if (twitch <= 0 && Math.random() < dt * 0.55) twitch = 0.16;
    const jitter = twitch > 0 ? (Math.random() - 0.5) * 0.09 : 0;
    const breathe = Math.sin(time * 1.2) * 0.03;
    const swing = Math.sin(phase) * moveBlend;
    body.position.y = BODY_Y + Math.abs(Math.sin(phase)) * 0.14 * moveBlend;
    body.scale.set(1 - breathe * 0.4, 1 + breathe, 1 - breathe * 0.4);
    body.rotation.z = swing * 0.08 + jitter;
    body.rotation.x = 0.14 + 0.06 * moveBlend + jitter * 0.4;
    // 고개를 더 앞으로 내밀며 떠는 순간
    headGroup.rotation.x = HEAD_TILT + Math.sin(time * 0.7) * 0.025 + (twitch > 0 ? 0.14 : 0);
    headGroup.rotation.z = jitter * 0.6;
    for (const [i, arm] of arms.entries()) arm.rotation.z = (i ? 1 : -1) * (0.1 + Math.sin(time * 1.5 + i) * 0.04) + jitter;
    eyeLight.intensity = 3.6 + Math.sin(time * 5) * 0.6 + (twitch > 0 ? 3 : 0);
  }

  return { group: root, update, eyes, height: (BODY_Y + R) * scale };
}
