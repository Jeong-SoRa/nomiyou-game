import * as THREE from 'three';
import { toon, mesh } from '../helpers.js';

/**
 * 숲의 괴물 — 오염이 극한까지 치달은 파닥이의 최종 형태.
 *
 * 디자인 방향: 어둠 속에서 "창백한 뼈 가면 얼굴"만 둥둥 떠 보이는 구조.
 * 몸·목·팔·옷자락은 전부 새까맣게 어둠에 녹아들고, 얼굴만 핏기 없는 뼈색으로 희미하게 빛난다.
 * 파닥이였다는 흔적:
 *  - 하얗던 몸 색이 다 빠져 바싹 마른 뼈색 가면이 된 얼굴
 *  - 머리 위 대파 새싹이 말라 비틀어져 마디진 두 개의 뿔이 됨 (좌우 길이·굽음이 다름)
 *  - 볼에 남은 탈색된 볼터치 자국
 * 얼굴 특징:
 *  - 텅 빈 검은 눈구멍 (깊숙한 곳에서만 아주 작은 붉은 점이 빛남)
 *  - 좁고 길게 아래로 늘어진 두개골, 눈 위로 튀어나온 눈두덩 능선
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
const CHEEK_FADED = 0x7e6a68; // 탈색된 볼터치 자국

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
  const mCheek = toon(CHEEK_FADED, { emissive: 0x0e0a0a });

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
  // 눈두덩 능선: 눈구멍 위로 툭 튀어나온 뼈. 만화 같은 '화난 눈썹'이 아니라 좌우가 다르게 비뚤어진 두개골 능선
  for (const { s, y, tilt } of [
    { s: -1, y: 0.33, tilt: 0.1 }, // 왼쪽은 거의 평평하게
    { s: 1, y: 0.29, tilt: -0.3 }, // 오른쪽만 안쪽으로 눌려 내려감
  ]) {
    const brow = mesh(new THREE.BoxGeometry(0.32, 0.06, 0.15), mBoneDark);
    brow.position.set(s * 0.21, y, 0.6);
    brow.rotation.z = tilt;
    brow.rotation.y = s * 0.35;
    headGroup.add(brow);
  }
  // 탈색된 볼터치 자국 (파닥이의 분홍 볼이 남긴 흔적)
  for (const s of [-1, 1]) {
    const cheek = mesh(new THREE.SphereGeometry(0.085, 8, 6), mCheek);
    cheek.scale.set(1.15, 0.7, 0.2);
    cheek.position.set(s * 0.3, -0.3, 0.47);
    cheek.rotation.y = s * 0.55;
    headGroup.add(cheek);
  }

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

  // ----- 뿔: 말라 비틀어진 대파 새싹이 마디진 뿔이 됐다. 좌우 길이·굽음이 다르다 -----
  function addHorn(sign, { len, segs, bend, splay, baseR }) {
    const base = new THREE.Group();
    base.position.set(sign * 0.2, 0.62, 0.02);
    base.rotation.z = sign * -0.28;
    base.rotation.x = -0.1;
    headGroup.add(base);
    const cBase = new THREE.Color(LEEK_ROT);
    const cTip = new THREE.Color(LEEK_DEAD);
    let parent = base;
    const h = len / segs;
    for (let i = 0; i < segs; i++) {
      const t0 = i / segs;
      const t1 = (i + 1) / segs;
      const r0 = baseR * (1 - t0 * 0.82);
      const r1 = baseR * (1 - t1 * 0.82);
      const g = new THREE.Group();
      g.rotation.x = -bend * (0.35 + t0 * 1.3); // 위로 뻗다가 점점 뒤로 휜다
      g.rotation.z = sign * -splay * (0.2 + t0 * 0.5); // 바깥쪽으로 벌어진다
      parent.add(g);
      const col = cBase.clone().lerp(cTip, Math.pow(t1, 0.8));
      const seg = mesh(new THREE.CylinderGeometry(r1, r0, h, 7), toon(col, { emissive: 0x0f100a }));
      seg.position.y = h / 2;
      g.add(seg);
      // 마디: 매듭처럼 툭 튀어나온 고리
      if (i > 0) {
        const ring = mesh(new THREE.TorusGeometry(r0 * 1.05, r0 * 0.28, 5, 9), mBoneDark);
        ring.rotation.x = Math.PI / 2;
        g.add(ring);
      }
      const next = new THREE.Group();
      next.position.y = h;
      g.add(next);
      parent = next;
    }
    // 뿔 밑동에서 축 늘어진 죽은 대파 잎 몇 가닥 (원래 새싹이었다는 흔적)
    for (let i = 0; i < 2; i++) {
      const leafLen = 0.28 + Math.random() * 0.14;
      const leaf = mesh(new THREE.CapsuleGeometry(0.022, leafLen, 3, 5), toon(LEEK_DEAD));
      const pivot = new THREE.Group();
      pivot.position.y = 0.06;
      pivot.rotation.z = sign * (0.9 + i * 0.5) + (Math.random() - 0.5) * 0.3;
      pivot.rotation.x = (Math.random() - 0.5) * 0.8;
      leaf.position.y = leafLen / 2;
      leaf.rotation.z = (Math.random() - 0.5) * 0.5;
      pivot.add(leaf);
      base.add(pivot);
    }
    return base;
  }
  addHorn(-1, { len: 1.35, segs: 8, bend: 0.28, splay: 0.16, baseR: 0.11 }); // 왼쪽이 더 길고 크게 휜다
  addHorn(1, { len: 1.0, segs: 7, bend: 0.2, splay: 0.24, baseR: 0.095 });

  // ---------- 팔: 좌우 길이가 다른, 뼈만 남은 듯 가늘고 긴 팔. 손끝은 길게 뻗은 발톱 여러 개 ----------
  const arms = [];
  const ARM_SPECS = [
    { s: -1, len: 2.05 },
    { s: 1, len: 1.55 },
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
      const sway = Math.sin(time * 1.6 + tt.seed) * 0.12;
      tt.mesh.rotation.x = Math.PI + sway;
      tt.mesh.rotation.z = Math.sin(time * 1.1 + tt.seed) * 0.15;
    }

    eyeLight.intensity = 1.0 + Math.sin(time * 6) * 0.3 + (twitch > 0 ? 2.5 : 0);
  }

  return { group: root, update, eyes, height: (BODY_Y + 3.5) * scale };
}
