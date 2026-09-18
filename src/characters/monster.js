import * as THREE from 'three';
import { toon, mesh } from '../helpers.js';

/**
 * 숲의 괴물 — 오염이 극한까지 치달은 파닥이의 최종 형태.
 * 이 게임의 다른 캐릭터들과 달리 일부러 "귀여움의 규칙"을 깬다:
 * 깔끔한 만화 외곽선이 없고(outline() 미사용), 좌우 대칭이 무너져 있으며(팔 길이·눈 크기가 다름),
 * 매끈한 구体가 아니라 각진 저폴리 두개골, 등에는 뼈가 삐져나온 듯한 가시가 돋아 있다.
 * 기본 scale 1 일 때 키 ≈ 3.7 (노미요 ≈ 2.5 의 1.5배).
 */
const BLACK = 0x040404;
const BLACK_DEEP = 0x000000;
const TOOTH = 0xd8d0bf; // 날카로움이 도드라지게 더 밝은 뼈색
const EYE_RED = 0xff0000;
const VOID = 0x000000;

export function createMonster({ scale = 1 } = {}) {
  const root = new THREE.Group();
  root.name = 'monster';
  root.scale.setScalar(scale);

  const mBlack = toon(BLACK); // 발광 없음: 빛이 거의 닿지 않으면 어둠과 거의 구분되지 않는다
  const mDeep = toon(BLACK_DEEP);
  const mTooth = toon(TOOTH);
  const mEye = new THREE.MeshBasicMaterial({ color: EYE_RED });
  const mVoid = new THREE.MeshBasicMaterial({ color: VOID });

  // ---------- 몸통: 뼈가 도드라질 만큼 가늘고 긴 몸. 좌우가 완전히 대칭이지 않도록 살짝 비틀어 둔다 ----------
  const R = 0.58;
  const LEN = 2.1;
  const BODY_Y = R + LEN / 2 - 0.05;
  const body = new THREE.Group();
  body.position.y = BODY_Y;
  body.rotation.z = -0.06; // 척추가 한쪽으로 살짝 굽은 듯
  root.add(body);
  const shell = mesh(new THREE.CapsuleGeometry(R, LEN, 4, 8), mBlack); // 세그먼트를 줄여 매끈함을 덜어냄(각진 인상)
  shell.scale.set(0.78, 1, 0.68);
  body.add(shell);

  // 등을 따라 삐져나온 뼈 가시 (매끈한 실루엣을 깨는 요소)
  for (let i = 0; i < 6; i++) {
    const t = i / 5;
    const spike = mesh(new THREE.ConeGeometry(0.045, 0.32 - t * 0.14, 5), mTooth);
    spike.position.set((Math.random() - 0.5) * 0.08, LEN * 0.42 - t * LEN * 0.85, -R * 0.62);
    spike.rotation.x = Math.PI * 0.42 + (Math.random() - 0.5) * 0.3;
    spike.rotation.z = (Math.random() - 0.5) * 0.5;
    body.add(spike);
  }

  // ---------- 머리: 몸통보다 훨씬 위, 긴 목 끝에 달려 있어 노미요를 내려다보는 구도가 된다. 부리 없음 ----------
  const headGroup = new THREE.Group();
  headGroup.position.set(0.05, 1.78, 0.03); // 몸통 꼭대기보다도 높게 — 위에서 내려다보는 자세
  headGroup.rotation.set(0.72, 0.04, 0.05); // 고개를 크게 숙여 아래(노미요)를 노려봄
  body.add(headGroup);
  const HEAD_TILT = headGroup.rotation.x;

  // 머리 크기를 키움 (더 위협적으로 도드라지도록)
  const skull = mesh(new THREE.OctahedronGeometry(0.5, 0), mBlack); // 매끈한 구 대신 각진 다면체
  skull.scale.set(0.95, 0.85, 1.95);
  skull.position.z = 0.36;
  headGroup.add(skull);
  // 목: 몸통 꼭대기까지 이어지는 긴 목 (머리를 높이 든 자세를 만드는 핵심 요소)
  const neck = mesh(new THREE.CylinderGeometry(0.34, 0.52, 1.7, 6), mBlack);
  neck.position.set(-0.02, -0.85, -0.28);
  neck.rotation.x = 0.5;
  headGroup.add(neck);

  // 입: 돌출된 부리 없이, 활짝 벌어진 새까만 틈(세로로 긴 구멍 — 웃는 곡선이 아니라 비명 지르듯 벌어진 모양)
  // 그 가장자리를 이빨이 빽빽하고 들쭉날쭉하게 두르고 있다
  const maw = mesh(new THREE.SphereGeometry(0.34, 12, 10), mVoid);
  maw.scale.set(1.05, 1.35, 0.66);
  maw.position.set(0.02, -0.22, 1.02);
  headGroup.add(maw);

  const teeth = [];
  const toothSpecs = [
    // [x, z, length, fromTop] — 길이가 제각각이고 빽빽하게 겹쳐 있어 뜯겨나간 듯한 인상. 활짝 벌린 입을 빙 둘러싼다
    [-0.42, 0.62, 0.62, true],
    [-0.3, 0.86, 0.95, true],
    [-0.16, 1.02, 0.72, true],
    [0.0, 1.12, 1.05, true],
    [0.16, 1.02, 0.78, true],
    [0.3, 0.84, 0.98, true],
    [0.43, 0.6, 0.58, true],
    [-0.46, 0.42, 0.42, true],
    [0.47, 0.4, 0.46, true],
    [-0.34, 0.5, 0.66, false],
    [-0.2, 0.78, 0.9, false],
    [-0.05, 0.94, 0.56, false],
    [0.08, 1.0, 0.98, false],
    [0.22, 0.86, 0.52, false],
    [0.36, 0.6, 0.8, false],
    [0.44, 0.36, 0.36, false],
    [-0.42, 0.34, 0.34, false],
  ];
  for (const [x, z, len, fromTop] of toothSpecs) {
    const tooth = mesh(new THREE.ConeGeometry(0.06, len, 5), mTooth);
    const yBase = fromTop ? 0.0 : -0.4;
    tooth.position.set(x, yBase + (fromTop ? -len / 2 + 0.05 : len / 2 - 0.05), z);
    tooth.rotation.x = fromTop ? Math.PI : 0;
    tooth.rotation.z = (Math.random() - 0.5) * 0.5;
    tooth.rotation.x += (Math.random() - 0.5) * 0.3;
    headGroup.add(tooth);
    teeth.push(tooth);
  }

  // 눈: 좌우 크기·높이가 다르다 — 잘못 봉합된 듯한 비대칭. 눈썹도 하이라이트도 없이 붉게만 빛난다
  const eyeSpecs = [
    { s: -1, x: 0.34, y: 0.26, z: 0.68, r: 0.12 },
    { s: 1, x: 0.27, y: 0.13, z: 0.7, r: 0.08 },
  ];
  const eyes = [];
  for (const { s, x, y, z, r } of eyeSpecs) {
    const eye = new THREE.Group();
    eye.position.set(s * x, y, z);
    const ball = mesh(new THREE.SphereGeometry(r, 8, 6), mEye);
    ball.scale.set(1, 0.65, 0.4);
    eye.add(ball);
    headGroup.add(eye);
    eyes.push(eye);
  }
  const eyeLight = new THREE.PointLight(EYE_RED, 4.5, 7.5, 2);
  eyeLight.position.set(0.14, 0.18, 1.2);
  headGroup.add(eyeLight);

  // ---------- 팔: 좌우 길이가 다른, 뼈만 남은 듯 가늘고 긴 팔. 손끝은 길게 뻗은 발톱 여러 개 ----------
  const arms = [];
  const ARM_SPECS = [
    { s: -1, len: 2.05 },
    { s: 1, len: 1.55 },
  ];
  for (const { s, len } of ARM_SPECS) {
    const arm = new THREE.Group();
    arm.position.set(s * 0.4, R * 0.15, 0.02);
    const limb = mesh(new THREE.CapsuleGeometry(0.075, len, 4, 8), mBlack);
    limb.position.y = -len / 2 - 0.075;
    arm.add(limb);
    // 손끝 발톱: 더 가늘고 길게 뻗어 부채꼴로 펼쳐 날카로움을 강조
    const handY = -len - 0.15;
    for (let i = -2; i <= 2; i++) {
      const claw = mesh(new THREE.ConeGeometry(0.028, 0.58, 4), mTooth);
      claw.rotation.x = Math.PI / 2 + i * 0.17;
      claw.position.set(i * 0.075, handY, 0.16 + Math.abs(i) * 0.035);
      arm.add(claw);
    }
    arm.rotation.z = s * (0.08 + Math.random() * 0.06);
    body.add(arm);
    arms.push(arm);
  }

  // ---------- 발: 앙상한 발과 발톱 ----------
  const feet = [];
  for (const s of [-1, 1]) {
    const foot = mesh(new THREE.SphereGeometry(0.15, 8, 6), mDeep);
    foot.scale.set(1.3, 0.4, 1.7);
    foot.position.set(s * 0.27, 0.07, 0.26);
    root.add(foot);
    feet.push(foot);
    for (let i = -1.5; i <= 1.5; i++) {
      const claw = mesh(new THREE.ConeGeometry(0.032, 0.42, 4), mTooth);
      claw.rotation.x = Math.PI / 2;
      claw.position.set(s * 0.27 + i * 0.08, 0.06, 0.6);
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
    if (twitch <= 0 && Math.random() < dt * 0.6) twitch = 0.14;
    const jitter = twitch > 0 ? (Math.random() - 0.5) * 0.11 : 0;
    const breathe = Math.sin(time * 1.15) * 0.028;
    const swing = Math.sin(phase) * moveBlend;
    body.position.y = BODY_Y + Math.abs(Math.sin(phase)) * 0.13 * moveBlend;
    body.scale.set(1 - breathe * 0.4, 1 + breathe, 1 - breathe * 0.4);
    body.rotation.z = -0.06 + swing * 0.07 + jitter;
    body.rotation.x = 0.14 + 0.06 * moveBlend + jitter * 0.4;
    headGroup.rotation.x = HEAD_TILT + Math.sin(time * 0.65) * 0.03 + (twitch > 0 ? 0.16 : 0);
    headGroup.rotation.z = 0.05 + jitter * 0.7;
    for (const [i, arm] of arms.entries()) arm.rotation.x = Math.sin(time * 1.4 + i * 2) * 0.05 + jitter * 0.6;
    eyeLight.intensity = 3.2 + Math.sin(time * 6) * 0.7 + (twitch > 0 ? 3 : 0);
  }

  return { group: root, update, eyes, height: (BODY_Y + 2.1) * scale };
}
