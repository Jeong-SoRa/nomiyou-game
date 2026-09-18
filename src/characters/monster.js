import * as THREE from 'three';
import { toon, mesh } from '../helpers.js';

/**
 * 숲의 괴물 — 오염이 극한까지 치달은 파닥이의 최종 형태.
 * 이 게임의 다른 캐릭터들과 달리 일부러 "귀여움의 규칙"을 깬다: 깔끔한 만화 외곽선이 없고,
 * 좌우 대칭이 무너져 있으며, 매끈한 구체가 아니라 각진 저폴리 두개골이다.
 * 파닥이 특유의 귀여운 '대파 새싹'이 뒤틀리고 시든 채로 머리에 남아 있다(원래 파닥이였다는 흔적).
 * 발 대신 새까맣고 너덜너덜한 옷자락을 끌며 땅 위에 둥둥 떠 있다.
 * 입은 좌우 입꼬리가 뒤틀려 올라간 채 얼굴 절반을 가르는 기괴한 미소 — 그 안에 이빨이 빽빽하다.
 * 기본 scale 1 일 때 키 ≈ 4.6 (노미요 ≈ 2.5 배 이상). 노미요를 내려다보는 자세.
 */
const BLACK = 0x040404;
const BLACK_DEEP = 0x000000;
const TOOTH = 0xd8d0bf; // 날카로움이 도드라지게 더 밝은 뼈색
const EYE_RED = 0xff0000;
const VOID = 0x000000;
const LEEK_ROT = 0x767a5c; // 시든 대파 밑동(파닥이의 싱싱한 흰색이 아니라 병든 회녹색)
const LEEK_DEAD = 0x3c4530; // 시든 대파 잎(파닥이의 생기있는 초록이 아니라 검게 죽어가는 색)

export function createMonster({ scale = 1 } = {}) {
  const root = new THREE.Group();
  root.name = 'monster';
  root.scale.setScalar(scale);

  const mBlack = toon(BLACK); // 발광 없음: 빛이 거의 닿지 않으면 어둠과 거의 구분되지 않는다
  const mDeep = toon(BLACK_DEEP);
  const mTooth = toon(TOOTH);
  const mEye = new THREE.MeshBasicMaterial({ color: EYE_RED });
  const mVoid = new THREE.MeshBasicMaterial({ color: VOID });
  const mLeekRot = toon(LEEK_ROT);
  const mLeekDead = toon(LEEK_DEAD);

  // ---------- 몸통: 뼈가 도드라질 만큼 가늘고 긴 몸. 좌우가 완전히 대칭이지 않도록 살짝 비틀어 둔다 ----------
  const R = 0.58;
  const LEN = 3.5;
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

  // ---------- 검고 너덜너덜한 옷자락: 발 대신 이걸 끌며 땅 위에 떠 있다 ----------
  const robeGroup = new THREE.Group();
  robeGroup.position.set(0, BODY_Y * 0.42, -0.03);
  root.add(robeGroup);
  const ROBE_H = BODY_Y * 0.78;
  const robe = mesh(new THREE.ConeGeometry(1.35, ROBE_H, 7, 1, true), mBlack); // 각진 저폴리 원뿔 — 매끈한 천이 아니라 뻣뻣하고 뒤틀린 형상
  robe.position.y = ROBE_H * 0.1;
  robeGroup.add(robe);
  // 밑단이 고르지 않게 찢어진 조각들
  const tatters = [];
  const TATTER_N = 11;
  for (let i = 0; i < TATTER_N; i++) {
    const a = (i / TATTER_N) * Math.PI * 2 + Math.random() * 0.3;
    const hang = 0.35 + Math.random() * 0.75;
    const tatter = mesh(new THREE.ConeGeometry(0.16, hang, 3), mDeep);
    const rx = Math.cos(a) * 1.2;
    const rz = Math.sin(a) * 1.2;
    tatter.position.set(rx, -ROBE_H * 0.42 - hang * 0.5, rz);
    tatter.rotation.x = Math.PI; // 뾰족한 끝이 아래를 향하게
    tatter.rotation.y = a;
    tatter.rotation.z = (Math.random() - 0.5) * 0.3;
    robeGroup.add(tatter);
    tatters.push({ mesh: tatter, seed: Math.random() * 10, baseX: rx, baseZ: rz });
  }

  // ---------- 머리: 몸통보다 훨씬 위, 긴 목 끝에 달려 있어 노미요를 내려다보는 구도가 된다. 부리 없음 ----------
  const headGroup = new THREE.Group();
  headGroup.position.set(0.05, 1.78, 0.03); // 몸통 꼭대기보다도 높게 — 위에서 내려다보는 자세
  headGroup.rotation.set(0.55, 0.04, 0.05); // 고개를 숙여 아래(노미요)를 내려다봄
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

  // ---------- 시든 대파 새싹 (원래 파닥이였다는 흔적) — 뿔처럼 두 개, 좌우가 다르게 뒤틀려 있다 ----------
  function addLeek(x, twistSign, big) {
    const g = new THREE.Group();
    g.position.set(x, 0.42, 0.15);
    g.rotation.z = twistSign * (0.35 + (big ? 0.1 : 0));
    g.rotation.x = -0.15;
    headGroup.add(g);
    const bulb = mesh(new THREE.SphereGeometry(big ? 0.13 : 0.1, 8, 6), mLeekRot);
    bulb.scale.set(1, 1.3, 1);
    g.add(bulb);
    const bladeN = big ? 3 : 2;
    for (let i = 0; i < bladeN; i++) {
      const len = (big ? 0.55 : 0.4) + i * 0.1 + Math.random() * 0.1;
      const blade = mesh(new THREE.CapsuleGeometry(0.035, len, 3, 6), i === 1 ? mLeekDead : mLeekRot);
      const pivot = new THREE.Group();
      pivot.position.y = 0.12;
      // 싱싱하게 곧게 뻗은 파닥이 잎과 달리, 꺾이고 축 처지거나 기괴하게 말려 있다
      pivot.rotation.z = twistSign * (0.3 + i * 0.35) + (Math.random() - 0.5) * 0.3;
      pivot.rotation.x = (Math.random() - 0.5) * 0.6;
      blade.position.y = len / 2 + 0.02;
      blade.rotation.z = (Math.random() - 0.5) * 0.4; // 잎 자체도 곧지 않고 뒤틀림
      pivot.add(blade);
      g.add(pivot);
    }
    return g;
  }
  const leekL = addLeek(-0.22, -1, true);
  const leekR = addLeek(0.24, 1, false); // 좌우 크기가 다르다 — 여기서도 비대칭

  // 입: 부리 없이, 좌우 입꼬리가 뒤틀려 올라간 채 얼굴을 가르는 기괴한 미소.
  // 가운데는 얼굴 안쪽까지 뚫린 새까만 틈이고, 그 가장자리를 이빨이 빽빽하고 들쭉날쭉하게 두르고 있다
  const mawCenter = mesh(new THREE.SphereGeometry(0.4, 14, 10), mVoid);
  mawCenter.scale.set(1.5, 0.56, 0.62);
  mawCenter.position.set(0.02, -0.14, 1.0);
  headGroup.add(mawCenter);
  // 양쪽 입꼬리: 비대칭으로 뒤틀려 위로 말려 올라간 웃음
  const mawCornerL = mesh(new THREE.SphereGeometry(0.28, 10, 8), mVoid);
  mawCornerL.scale.set(1, 1, 0.8);
  mawCornerL.position.set(-0.52, 0.06, 0.86);
  mawCornerL.rotation.z = 0.5;
  headGroup.add(mawCornerL);
  const mawCornerR = mesh(new THREE.SphereGeometry(0.33, 10, 8), mVoid);
  mawCornerR.scale.set(1, 1, 0.8);
  mawCornerR.position.set(0.56, 0.16, 0.82); // 오른쪽이 더 위까지 찢어져 있다
  mawCornerR.rotation.z = -0.75;
  headGroup.add(mawCornerR);

  // 이빨: 활짝 벌어진 웃음을 따라 빽빽하게 — 가운데는 길게 송곳니처럼, 입꼬리로 갈수록 작고 삐뚤어짐
  const teeth = [];
  const TOOTH_COUNT = 24;
  for (let i = 0; i < TOOTH_COUNT; i++) {
    const t = i / (TOOTH_COUNT - 1); // 0(왼쪽 입꼬리) → 1(오른쪽 입꼬리)
    const x = THREE.MathUtils.lerp(-0.58, 0.62, t);
    const arch = Math.sin(t * Math.PI); // 가운데가 볼록한 아치형 입
    const centerBias = Math.max(0, 1 - Math.abs(t - 0.46) * 1.7);
    const len = THREE.MathUtils.clamp(0.3 + centerBias * 0.85 + (Math.random() - 0.5) * 0.25, 0.26, 1.15);
    const z = 0.66 + arch * 0.5;
    const y = 0.1 + arch * 0.08; // 웃음 곡선을 따라 입꼬리 쪽이 살짝 위로
    const fromTop = i % 2 === 0;
    const tooth = mesh(new THREE.ConeGeometry(0.055, len, 5), mTooth);
    tooth.position.set(x, y + (fromTop ? -len / 2 + 0.04 : len / 2 - 0.04), z);
    tooth.rotation.x = fromTop ? Math.PI : 0;
    tooth.rotation.z = (Math.random() - 0.5) * 0.5;
    tooth.rotation.x += (Math.random() - 0.5) * 0.3;
    headGroup.add(tooth);
    teeth.push(tooth);
  }

  // 눈: 좌우 크기·높이가 다르다 — 잘못 봉합된 듯한 비대칭. 눈썹도 하이라이트도 없이 붉게만 빛난다
  const eyeSpecs = [
    { s: -1, x: 0.34, y: 0.32, z: 0.68, r: 0.12 },
    { s: 1, x: 0.27, y: 0.2, z: 0.7, r: 0.08 },
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
  eyeLight.position.set(0.14, 0.24, 1.2);
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

  // ---------- 애니메이션: 걷지 않고 둥둥 떠 있다 — 느리게 오르내리고, 옷자락이 흔들리며, 이따금 경련한다 ----------
  let time = Math.random() * 10;
  let twitch = 0;
  function update(dt) {
    time += dt;
    twitch -= dt;
    if (twitch <= 0 && Math.random() < dt * 0.6) twitch = 0.14;
    const jitter = twitch > 0 ? (Math.random() - 0.5) * 0.11 : 0;
    const breathe = Math.sin(time * 1.15) * 0.028;
    const hover = Math.sin(time * 0.7) * 0.16; // 걷지 않고 천천히 위아래로 떠다님

    body.position.y = BODY_Y + hover;
    body.scale.set(1 - breathe * 0.4, 1 + breathe, 1 - breathe * 0.4);
    body.rotation.z = -0.06 + Math.sin(time * 0.5) * 0.04 + jitter;
    body.rotation.x = 0.14 + jitter * 0.4;

    headGroup.rotation.x = HEAD_TILT + Math.sin(time * 0.65) * 0.03 + (twitch > 0 ? 0.16 : 0);
    headGroup.rotation.z = 0.05 + jitter * 0.7;

    for (const [i, arm] of arms.entries()) arm.rotation.x = Math.sin(time * 1.1 + i * 2) * 0.05 + jitter * 0.6;

    // 옷자락: 몸 흔들림을 따라가되 아래로 갈수록 느리게, 크게 흔들려 끌리는 느낌
    robeGroup.rotation.z = Math.sin(time * 0.45) * 0.05;
    robeGroup.rotation.x = Math.sin(time * 0.38 + 1.4) * 0.035;
    for (const tt of tatters) {
      const sway = Math.sin(time * 1.6 + tt.seed) * 0.12;
      tt.mesh.rotation.x = Math.PI + sway;
      tt.mesh.rotation.z = Math.sin(time * 1.1 + tt.seed) * 0.15;
    }

    eyeLight.intensity = 3.2 + Math.sin(time * 6) * 0.7 + (twitch > 0 ? 3 : 0);
  }

  return { group: root, update, eyes, height: (BODY_Y + 2.1) * scale };
}
