import * as THREE from 'three';
import { toon, mesh } from '../helpers.js';

/**
 * 숲의 괴물 — 오염이 극한까지 치달은 파닥이의 최종 형태.
 *
 * 디자인 방향: 어둠 속에서 "창백한 뼈 가면 얼굴"만 둥둥 떠 보이는 구조.
 * 몸·목·팔·옷자락은 전부 새까맣게 어둠에 녹아들고, 얼굴만 핏기 없는 뼈색으로 희미하게 빛난다.
 * 파닥이였다는 흔적:
 *  - 하얗던 몸 색이 다 빠져 바싹 마른 뼈색 가면이 된 얼굴
 *  - 머리 위 대파 새싹이 기괴하게 웃자라 여러 가닥으로 꺾이고 말리며 시들어, 몇 가닥은 얼굴 앞으로 흘러내림
 * 얼굴 특징:
 *  - 텅 빈 검은 눈구멍 (깊숙한 곳에서만 아주 작은 붉은 점이 빛남)
 *  - 좁고 길게 아래로 늘어진 두개골 (눈썹 없음)
 *  - 턱이 있을 수 없는 길이까지 아래로 축 늘어져 벌어진 입 — 위턱에서 긴 송곳니가 늘어지고,
 *    한참 아래 턱 끝에 작은 이빨 무더기가 모여 있다. 그 사이는 새까만 구멍
 * 기본 scale 1 일 때 키 ≈ 4.7 (노미요 ≈ 2.5 배 이상). 노미요를 내려다보는 자세.
 */
const BLACK = 0x040404;
const BLACK_DEEP = 0x000000;
const BONE = 0xd6cdb8; // 창백한 뼈 가면 (파닥이의 흰색에서 생기가 다 빠진 색)
const BONE_DARK = 0xa9a08c; // 가면의 그늘진 부위(턱 안쪽, 뿔 마디)
const TOOTH = 0xe8e2d4;
const EYE_RED = 0xff0a0a;
const VOID = 0x000000;
const LEEK_ROT = 0x7d7f62; // 시든 대파 밑동(회녹색)
const LEEK_DEAD = 0x3a3d2c; // 죽은 대파 잎 끝(검게 죽은 색)

export function createMonster({ scale = 1 } = {}) {
  const root = new THREE.Group();
  root.name = 'monster';
  root.scale.setScalar(scale);

  const mBlack = toon(BLACK); // 발광 없음: 빛이 거의 닿지 않으면 어둠과 거의 구분되지 않는다
  const mDeep = toon(BLACK_DEEP);
  const mBone = toon(BONE, { emissive: 0x2a2620 }); // 빛이 없어도 희미하게 떠 보이도록 약한 자체 발광
  const mBoneDark = toon(BONE_DARK, { emissive: 0x1a1714 });
  const mTooth = toon(TOOTH, { emissive: 0x2c2a26 });
  const mEye = new THREE.MeshBasicMaterial({ color: EYE_RED });
  const mVoid = new THREE.MeshBasicMaterial({ color: VOID });

  // ---------- 몸통: 뼈가 도드라질 만큼 가늘고 긴 몸. 좌우가 완전히 대칭이지 않도록 살짝 비틀어 둔다 ----------
  const R = 0.58;
  const LEN = 2.6; // 몸통 자체는 짧게 — 그 위로 긴 목과 머리가 올라간다
  const BODY_Y = R + LEN / 2 - 0.05;
  const body = new THREE.Group();
  body.position.y = BODY_Y;
  body.rotation.z = -0.06; // 척추가 한쪽으로 살짝 굽은 듯
  root.add(body);
  const shell = mesh(new THREE.CapsuleGeometry(R, LEN, 4, 8), mBlack); // 세그먼트를 줄여 매끈함을 덜어냄(각진 인상)
  shell.scale.set(0.7, 1, 0.6); // 얼굴이 도드라지도록 몸은 더 가늘게
  body.add(shell);

  // 등을 따라 삐져나온 뼈 가시 (매끈한 실루엣을 깨는 요소)
  for (let i = 0; i < 6; i++) {
    const t = i / 5;
    const spike = mesh(new THREE.ConeGeometry(0.045, 0.32 - t * 0.14, 5), mBoneDark);
    spike.position.set((Math.random() - 0.5) * 0.08, LEN * 0.42 - t * LEN * 0.85, -R * 0.55);
    spike.rotation.x = Math.PI * 0.42 + (Math.random() - 0.5) * 0.3;
    spike.rotation.z = (Math.random() - 0.5) * 0.5;
    body.add(spike);
  }

  // ---------- 검고 너덜너덜한 옷자락: 발 대신 이걸 끌며 땅 위에 떠 있다 ----------
  // 넓게 퍼진 치마가 아니라 몸을 따라 좁게 흘러내리는 천. 밑단은 딱 잘리지 않고
  // 길이가 제각각인 넝마 가닥으로 풀어져 바닥 쪽으로 사라진다 (몇 가닥은 땅에 끌린다)
  const robeGroup = new THREE.Group();
  robeGroup.position.set(0, BODY_Y * 0.7, -0.03);
  root.add(robeGroup);
  const ROBE_H = BODY_Y * 0.78;
  const ROBE_R = 0.95;
  const robe = mesh(new THREE.ConeGeometry(ROBE_R, ROBE_H, 10, 1, true), mBlack);
  robe.position.y = ROBE_H * 0.1;
  robeGroup.add(robe);
  const tatters = [];
  const TATTER_N = 18;
  for (let i = 0; i < TATTER_N; i++) {
    const a = (i / TATTER_N) * Math.PI * 2 + (Math.random() - 0.5) * 0.25;
    const hang = 0.5 + Math.random() * 0.6; // 길이 제각각
    const w = 0.08 + Math.random() * 0.09;
    // 납작하고 길게 늘어진 천 조각 (뾰족한 끝이 아래)
    const tatter = mesh(new THREE.ConeGeometry(w, hang, 4), mDeep);
    tatter.scale.z = 0.3;
    const rr = ROBE_R * (0.82 + Math.random() * 0.12); // 밑단 안쪽에서 시작해 옷자락과 겹친다
    const rx = Math.cos(a) * rr;
    const rz = Math.sin(a) * rr;
    const top = -ROBE_H * 0.3 - Math.random() * 0.15;
    tatter.position.set(rx, top - hang * 0.5, rz);
    tatter.rotation.y = -a + Math.PI / 2; // 넓은 면이 바깥을 향하게
    tatter.rotation.x = Math.PI;
    tatter.rotation.z = (Math.random() - 0.5) * 0.25;
    robeGroup.add(tatter);
    tatters.push({ mesh: tatter, seed: Math.random() * 10, baseZ: tatter.rotation.z });
  }

  // ---------- 머리: 몸통 꼭대기 위, 앞으로 쭉 내민 목 끝에 달려 있다. 얼굴과 늘어진 턱 전체가 검은 몸 앞에 떠 보인다 ----------
  const headGroup = new THREE.Group();
  headGroup.position.set(0.05, 2.7, 0.75);
  headGroup.rotation.set(0.3, 0.04, 0.05); // 고개를 숙여 아래(노미요)를 내려다봄
  body.add(headGroup);
  const HEAD_TILT = headGroup.rotation.x;

  // 목: 두개골 뒤에서 몸통 꼭대기 안쪽으로 비스듬히 이어지는 가늘고 긴 목
  const neck = mesh(new THREE.CylinderGeometry(0.17, 0.36, 1.5, 6), mBlack);
  neck.position.set(-0.02, -0.98, -0.47);
  neck.rotation.x = 0.46;
  headGroup.add(neck);

  // ----- 뼈 가면 얼굴 -----
  // 두개골 윗부분: 둥근 머리통
  const cranium = mesh(new THREE.SphereGeometry(0.5, 12, 9), mBone);
  cranium.scale.set(0.8, 1.08, 0.9); // 좁고 높은 두개골
  cranium.position.set(0, 0.24, 0.14);
  headGroup.add(cranium);
  // 얼굴 아랫부분: 아래로 갈수록 좁아지는 긴 주둥이(위턱). 앞뒤로 납작하게 눌러 가면 느낌
  const muzzle = mesh(new THREE.CylinderGeometry(0.4, 0.24, 1.1, 9), mBone);
  muzzle.scale.set(1, 1, 0.8);
  muzzle.position.set(0, -0.34, 0.18);
  headGroup.add(muzzle);
  // 눈: 텅 빈 검은 구멍. 좌우 크기·높이가 다르다. 구멍 깊숙한 곳에 아주 작은 붉은 점만 빛난다
  const eyeSpecs = [
    { s: -1, x: 0.21, y: 0.14, z: 0.6, r: 0.145 },
    { s: 1, x: 0.2, y: 0.09, z: 0.6, r: 0.12 },
  ];
  const eyes = [];
  for (const { s, x, y, z, r } of eyeSpecs) {
    const socket = mesh(new THREE.SphereGeometry(r, 10, 8), mVoid);
    socket.scale.set(1, 1.15, 0.32); // 납작하게 — 튀어나온 공이 아니라 파인 구멍처럼 보이게
    socket.position.set(s * x, y, z - 0.03);
    socket.castShadow = false;
    headGroup.add(socket);
    const eye = new THREE.Group();
    eye.position.set(s * x, y - 0.01, z - 0.03 + r * 0.32 + 0.006);
    const dot = mesh(new THREE.SphereGeometry(0.022, 6, 5), mEye);
    dot.castShadow = false;
    eye.add(dot);
    headGroup.add(eye);
    eyes.push(eye);
  }
  const eyeLight = new THREE.PointLight(EYE_RED, 1.4, 5, 2);
  eyeLight.position.set(0, 0.12, 0.95);
  headGroup.add(eyeLight);

  // 위턱 이빨: 주둥이 아랫단을 따라 늘어진 송곳니. 가운데가 가장 길고 가장자리로 갈수록 짧고 삐뚤다
  const MUZZLE_BOTTOM = -0.34 - 0.55;
  const UPPER_N = 9;
  for (let i = 0; i < UPPER_N; i++) {
    const t = i / (UPPER_N - 1);
    const arch = Math.sin(t * Math.PI);
    const x = THREE.MathUtils.lerp(-0.2, 0.22, t);
    const z = 0.18 + 0.04 + arch * 0.15;
    const len = THREE.MathUtils.clamp(0.22 + arch * 0.42 + (Math.random() - 0.5) * 0.12, 0.18, 0.66);
    const tooth = mesh(new THREE.ConeGeometry(0.038, len, 5), mTooth);
    tooth.position.set(x, MUZZLE_BOTTOM - len / 2 + 0.03, z);
    tooth.rotation.x = Math.PI + (Math.random() - 0.5) * 0.2;
    tooth.rotation.z = (Math.random() - 0.5) * 0.35;
    headGroup.add(tooth);
  }

  // ----- 아래턱: 있을 수 없는 길이로 축 늘어져 벌어진 턱 -----
  const JAW_LEN = 1.55;
  const jawGroup = new THREE.Group();
  jawGroup.position.set(0, -0.5, -0.1); // 두개골 뒤쪽 턱관절에서 매달린다
  headGroup.add(jawGroup);
  const JAW_BASE = -0.14; // 음수일수록 턱 끝이 앞으로 나온다(더 벌어진 입). 거의 수직으로 축 늘어진 상태
  jawGroup.rotation.x = JAW_BASE;
  // 양쪽 턱뼈 가닥: 좁고 긴 U 자의 두 변
  for (const s of [-1, 1]) {
    const rail = mesh(new THREE.CapsuleGeometry(0.065, JAW_LEN - 0.1, 4, 7), mBone);
    rail.position.set(s * 0.26, -JAW_LEN / 2, 0.26);
    rail.rotation.z = s * -0.04; // 아래로 갈수록 살짝 모인다
    jawGroup.add(rail);
  }
  // 턱 끝: 둥근 턱뼈 덩어리 + 그 위에 모여 있는 작은 이빨 무더기
  const chin = mesh(new THREE.SphereGeometry(0.3, 8, 6), mBone);
  chin.scale.set(1.05, 0.5, 0.75);
  chin.position.set(0, -JAW_LEN + 0.05, 0.27);
  jawGroup.add(chin);
  const LOWER_N = 7;
  for (let i = 0; i < LOWER_N; i++) {
    const t = i / (LOWER_N - 1);
    const x = THREE.MathUtils.lerp(-0.2, 0.2, t);
    const len = 0.16 + Math.sin(t * Math.PI) * 0.16 + Math.random() * 0.05;
    const tooth = mesh(new THREE.ConeGeometry(0.03, len, 5), mTooth);
    tooth.position.set(x, -JAW_LEN + 0.12 + len / 2, 0.27 + (Math.random() - 0.5) * 0.06);
    tooth.rotation.z = (Math.random() - 0.5) * 0.4;
    tooth.rotation.x = (Math.random() - 0.5) * 0.25;
    jawGroup.add(tooth);
  }
  // 입 안: 위턱과 턱 끝 사이를 새까맣게 채우는 구멍 (몸통의 가시 등이 비치지 않게)
  const mouthVoid = mesh(new THREE.BoxGeometry(0.5, JAW_LEN - 0.05, 0.05), mVoid);
  mouthVoid.position.set(0, -JAW_LEN / 2 + 0.02, 0.06); // 턱뼈 가닥보다 뒤쪽 — 얼굴 앞면을 가리지 않게
  mouthVoid.castShadow = false;
  jawGroup.add(mouthVoid);
  // 턱 안쪽으로 이어지는 검은 목구멍(뒤쪽을 막아 얼굴 뒤가 보이지 않게)
  const throat = mesh(new THREE.BoxGeometry(0.5, 0.5, 0.4), mVoid);
  throat.position.set(0, -0.95, -0.06);
  throat.castShadow = false;
  headGroup.add(throat);

  // ----- 머리 위 대파: 파닥이의 싱싱한 새싹이 기괴하게 웃자라 뒤틀리고 시든 모습 -----
  // 부어오른 병든 밑동에서 굵기·길이가 제각각인 줄기가 여러 가닥 삐져나와 꺾이고 말리며,
  // 잎 끝은 검게 죽어 축 늘어진다. 긴 가닥 몇 개는 얼굴 앞으로 흘러내려 눈구멍 옆을 스친다.
  const leekRoot = new THREE.Group();
  leekRoot.position.set(0.02, 0.66, 0.0);
  leekRoot.rotation.z = -0.08;
  headGroup.add(leekRoot);
  const cLeekBase = new THREE.Color(LEEK_ROT);
  const cLeekTip = new THREE.Color(LEEK_DEAD);
  // 밑동: 매끈한 흰 밑동이 아니라 울퉁불퉁 부어오른 덩어리
  const bulb = mesh(new THREE.SphereGeometry(0.24, 7, 6), toon(0x8f9478, { emissive: 0x11120c }));
  bulb.scale.set(1.25, 0.85, 1.05);
  leekRoot.add(bulb);
  for (let i = 0; i < 3; i++) {
    const lump = mesh(new THREE.SphereGeometry(0.07 + Math.random() * 0.05, 6, 5), toon(0x7f8468, { emissive: 0x0d0e09 }));
    const a = Math.random() * Math.PI * 2;
    lump.position.set(Math.cos(a) * 0.18, 0.02 + Math.random() * 0.08, Math.sin(a) * 0.15);
    leekRoot.add(lump);
  }
  const leekStalks = []; // 흔들림 애니메이션용
  /** 꺾이고 뒤틀린 줄기 한 가닥. dir: 밑동에서 뻗는 초기 방향(오일러), droop: 아래로 늘어지는 정도 */
  function addStalk({ len, segs, r, dir, droop, kink, split }) {
    const base = new THREE.Group();
    base.rotation.set(dir[0], dir[1], dir[2]);
    leekRoot.add(base);
    let parent = base;
    const h = len / segs;
    let acc = 0;
    for (let i = 0; i < segs; i++) {
      const t0 = i / segs;
      const t1 = (i + 1) / segs;
      const g = new THREE.Group();
      // 매 마디마다 불규칙하게 꺾이고, 끝으로 갈수록 무게에 눌려 아래로 처진다
      acc += droop * (0.4 + t0);
      g.rotation.x = (Math.random() - 0.5) * kink + acc * 0.35;
      g.rotation.z = (Math.random() - 0.5) * kink;
      g.rotation.y = (Math.random() - 0.5) * 0.4;
      parent.add(g);
      const col = cLeekBase.clone().lerp(cLeekTip, Math.pow(t1, 0.7));
      const r0 = r * (1 - t0 * 0.75);
      const r1 = r * (1 - t1 * 0.75);
      const seg = mesh(new THREE.CylinderGeometry(r1, r0, h * 1.08, 6), toon(col, { emissive: 0x0b0c07 }));
      seg.scale.set(1.6, 1, 0.45); // 파 잎처럼 넓적하고 납작하게
      seg.position.y = h / 2;
      g.add(seg);
      // 마디: 접히거나 꺾인 자리에 생긴 옹이
      if (i > 0 && Math.random() < 0.5) {
        const knot = mesh(new THREE.SphereGeometry(r0 * 1.15, 5, 4), toon(col.clone().multiplyScalar(0.85)));
        knot.scale.set(1, 0.7, 0.7);
        g.add(knot);
      }
      const next = new THREE.Group();
      next.position.y = h;
      g.add(next);
      parent = next;
    }
    // 끝이 두 갈래로 찢어진 잎
    if (split) {
      for (const sgn of [-1, 1]) {
        const tipLen = 0.16 + Math.random() * 0.12;
        const tip = mesh(new THREE.ConeGeometry(r * 0.22, tipLen, 4), toon(LEEK_DEAD));
        tip.position.set(sgn * 0.03, tipLen / 2, 0);
        tip.rotation.z = sgn * (0.5 + Math.random() * 0.4);
        parent.add(tip);
      }
    } else {
      const tipLen = 0.14;
      const tip = mesh(new THREE.ConeGeometry(r * 0.25, tipLen, 4), toon(LEEK_DEAD));
      tip.position.y = tipLen / 2;
      parent.add(tip);
    }
    leekStalks.push({ base, seed: Math.random() * 10, amp: 0.02 + droop * 0.03, rx: base.rotation.x, rz: base.rotation.z });
    return base;
  }
  // 굵고 긴 주 줄기: 위로 솟았다가 뒤로 꺾여 늘어진다
  addStalk({ len: 1.6, segs: 8, r: 0.12, dir: [-0.25, 0, -0.15], droop: 0.16, kink: 0.5, split: true });
  // 두 번째 굵은 줄기: 반대쪽으로 비스듬히, 더 심하게 꺾임
  addStalk({ len: 1.2, segs: 7, r: 0.1, dir: [0.1, 0, 0.55], droop: 0.14, kink: 0.7, split: false });
  // 얼굴 앞으로 흘러내리는 긴 가닥들: 눈구멍 옆을 스치며 축 늘어진다
  addStalk({ len: 1.4, segs: 8, r: 0.08, dir: [0.9, 0, -0.5], droop: 0.32, kink: 0.35, split: true });
  addStalk({ len: 1.1, segs: 7, r: 0.07, dir: [1.05, 0, 0.42], droop: 0.3, kink: 0.4, split: false });
  // 짧고 비틀린 잔가닥들
  addStalk({ len: 0.6, segs: 4, r: 0.07, dir: [-0.6, 0, 0.9], droop: 0.1, kink: 0.9, split: false });
  addStalk({ len: 0.5, segs: 4, r: 0.06, dir: [-0.9, 0, -0.85], droop: 0.12, kink: 0.9, split: true });
  addStalk({ len: 0.75, segs: 5, r: 0.06, dir: [0.35, 0, -1.1], droop: 0.25, kink: 0.6, split: false });

  // ---------- 팔: 좌우 길이가 다른, 뼈만 남은 듯 가늘고 긴 팔. 손끝은 길게 뻗은 발톱 여러 개 ----------
  const arms = [];
  const ARM_SPECS = [
    { s: -1, len: 1.45 },
    { s: 1, len: 1.1 },
  ];
  for (const { s, len } of ARM_SPECS) {
    const arm = new THREE.Group();
    arm.position.set(s * 0.38, R * 0.15, 0.02);
    const limb = mesh(new THREE.CapsuleGeometry(0.07, len, 4, 8), mBlack);
    limb.position.y = -len / 2 - 0.075;
    arm.add(limb);
    // 손끝 발톱: 뼈색으로 어둠 속에서도 날카로움이 보인다
    const handY = -len - 0.15;
    for (let i = -2; i <= 2; i++) {
      const claw = mesh(new THREE.ConeGeometry(0.026, 0.6, 4), mTooth);
      claw.rotation.x = Math.PI / 2 + i * 0.17;
      claw.position.set(i * 0.075, handY, 0.16 + Math.abs(i) * 0.035);
      arm.add(claw);
    }
    arm.rotation.z = s * (0.08 + Math.random() * 0.06);
    body.add(arm);
    arms.push(arm);
  }

  // ---------- 애니메이션: 둥둥 떠서 느리게 오르내리고, 옷자락이 흔들리며, 이따금 경련한다 ----------
  // 경련 순간: 고개가 옆으로 홱 꺾이고, 턱이 덜컥 더 벌어졌다가 천천히 돌아온다
  let time = Math.random() * 10;
  let twitch = 0;
  let headTilt = 0; // 옆으로 꺾인 고개(천천히 돌아옴)
  let jawSnap = 0; // 덜컥 벌어진 턱(천천히 돌아옴)
  function update(dt) {
    time += dt;
    twitch -= dt;
    if (twitch <= 0 && Math.random() < dt * 0.6) {
      twitch = 0.14;
      headTilt = (Math.random() < 0.5 ? -1 : 1) * (0.25 + Math.random() * 0.2);
      jawSnap = 0.3 + Math.random() * 0.25;
    }
    headTilt *= Math.exp(-0.9 * dt);
    jawSnap *= Math.exp(-1.6 * dt);
    const jitter = twitch > 0 ? (Math.random() - 0.5) * 0.11 : 0;
    const breathe = Math.sin(time * 1.15) * 0.028;
    const hover = Math.sin(time * 0.7) * 0.16; // 걷지 않고 천천히 위아래로 떠다님

    body.position.y = BODY_Y + hover;
    body.scale.set(1 - breathe * 0.4, 1 + breathe, 1 - breathe * 0.4);
    body.rotation.z = -0.06 + Math.sin(time * 0.5) * 0.04 + jitter;
    body.rotation.x = 0.14 + jitter * 0.4;

    headGroup.rotation.x = HEAD_TILT + Math.sin(time * 0.65) * 0.03 + (twitch > 0 ? 0.16 : 0);
    headGroup.rotation.z = 0.05 + headTilt + jitter * 0.7;

    // 턱: 축 늘어진 채 느리게 흔들리고, 잘게 딱딱거리며 떨린다
    jawGroup.rotation.x = JAW_BASE - jawSnap + Math.sin(time * 0.9) * 0.05 + Math.sin(time * 23) * 0.012 + jitter * 0.5;

    for (const [i, arm] of arms.entries()) arm.rotation.x = Math.sin(time * 1.1 + i * 2) * 0.05 + jitter * 0.6;

    // 옷자락: 몸 흔들림을 따라가되 아래로 갈수록 느리게, 크게 흔들려 끌리는 느낌
    robeGroup.rotation.z = Math.sin(time * 0.45) * 0.05;
    robeGroup.rotation.x = Math.sin(time * 0.38 + 1.4) * 0.035;
    for (const tt of tatters) {
      tt.mesh.rotation.x = Math.PI + Math.sin(time * 1.6 + tt.seed) * 0.1;
      tt.mesh.rotation.z = tt.baseZ + Math.sin(time * 1.1 + tt.seed) * 0.12;
    }

    // 시든 대파 가닥: 머리 움직임에 늦게 따라오며 흐느적거리고, 경련 때 함께 파르르 떨린다
    for (const st of leekStalks) {
      st.base.rotation.x = st.rx + Math.sin(time * 1.3 + st.seed) * st.amp + jitter * 0.8;
      st.base.rotation.z = st.rz + Math.sin(time * 0.9 + st.seed * 1.7) * st.amp * 0.7 + jitter * 0.5;
    }

    eyeLight.intensity = 1.0 + Math.sin(time * 6) * 0.3 + (twitch > 0 ? 2.5 : 0);
  }

  return { group: root, update, eyes, height: (BODY_Y + 3.5) * scale };
}
