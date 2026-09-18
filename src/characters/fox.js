import * as THREE from 'three';
import { toon, mesh, sphere, capsule, eyeArc, outline, zigzagTexture, Blinker } from '../helpers.js';
import { createSpeechBubble } from './speech.js';

/**
 * 노미요 (Nomiyo) - 만화 속 치비 여우.
 * 큰 머리 + 작은 몸, 넓고 풍성한 귀(끝은 검정, 지그재그 경계), 크림색 얼굴/배와 볼 털,
 * 끝부분이 검은 탐스러운 꼬리(지그재그 경계), 손에 든 스마트폰.
 */
const ORANGE = 0xf58a2f;
const ORANGE_DEEP = 0xe8731f;
const CREAM = 0xfff6e8;
const DARK = 0x2a211d;
const INNER_EAR = 0x4b3530;
const CHEEK = 0xf9a8a0;
const LINE = 0x3a2418;

/** @param {{ phone?: boolean }} [opts] phone: false 면 스마트폰을 숨기고 오른팔을 자연스럽게 내린다 (캐릭터 설정은 유지) */
export function createFox({ phone: hasPhone = true } = {}) {
  const root = new THREE.Group();
  root.name = 'nomiyo';

  const mOrange = toon(ORANGE);
  const mOrangeDeep = toon(ORANGE_DEEP);
  const mCream = toon(CREAM);
  const mDark = toon(DARK);
  const mInner = toon(INNER_EAR);
  const mCheek = toon(CHEEK);
  const mWhite = new THREE.MeshBasicMaterial({ color: 0xffffff });

  // ---------- 몸통 (서양배 모양) ----------
  const BODY_Y = 0.96;
  const body = new THREE.Group();
  body.position.y = BODY_Y;
  root.add(body);

  const torso = sphere(0.6, mOrange, 1, 1.08, 0.92);
  outline(torso, 0.035, LINE);
  body.add(torso);

  // 가슴~배 크림색 패치 (몸 앞면을 감싸는 납작한 타원)
  const belly = sphere(0.5, mCream, 0.9, 0.95, 0.55);
  belly.position.set(0, 0.02, 0.36);
  body.add(belly);

  // 다리 (주황) + 발 (짙은 주황)
  const legs = [];
  for (const s of [-1, 1]) {
    const leg = new THREE.Group();
    leg.position.set(s * 0.27, -0.42, 0.02);
    const thigh = capsule(0.14, 0.26, mOrange);
    thigh.position.y = -0.18;
    outline(thigh, 0.03, LINE);
    const foot = sphere(0.17, mOrangeDeep, 1, 0.55, 1.35);
    foot.position.set(0, -0.42, 0.1);
    outline(foot, 0.03, LINE);
    leg.add(thigh, foot);
    body.add(leg);
    legs.push(leg);
  }

  // 팔 (주황) - 오른팔은 폰을 듦
  const arms = [];
  for (const s of [-1, 1]) {
    const arm = new THREE.Group();
    arm.position.set(s * 0.54, 0.2, 0.2);
    const upper = capsule(0.12, 0.44, mOrange);
    upper.position.y = -0.3;
    outline(upper, 0.03, LINE);
    const hand = sphere(0.15, mOrange, 1, 0.9, 1);
    hand.position.y = -0.6;
    outline(hand, 0.03, LINE);
    arm.add(upper, hand);
    arm.rotation.z = s * 0.25;
    body.add(arm);
    arms.push(arm);
  }

  // 곡괭이 (숲의 상자를 부술 때만 왼손에 쥠, 평소엔 숨김)
  const pickaxe = new THREE.Group();
  const paHandle = mesh(new THREE.CylinderGeometry(0.045, 0.05, 0.85, 8), toon(0x8a6a3c));
  paHandle.position.y = -0.42;
  outline(paHandle, 0.015, LINE);
  const paHead = mesh(new THREE.BoxGeometry(0.5, 0.075, 0.075), toon(0x4c4f58));
  paHead.position.y = -0.84;
  const paTip = mesh(new THREE.ConeGeometry(0.045, 0.16, 8), toon(0x4c4f58));
  paTip.rotation.z = -Math.PI / 2;
  paTip.position.set(0.33, -0.84, 0);
  const paTip2 = mesh(new THREE.ConeGeometry(0.045, 0.16, 8), toon(0x4c4f58));
  paTip2.rotation.z = Math.PI / 2;
  paTip2.position.set(-0.33, -0.84, 0);
  pickaxe.add(paHandle, paHead, paTip, paTip2);
  pickaxe.position.set(0, -0.56, 0.06);
  pickaxe.rotation.z = 0.12;
  pickaxe.visible = false;
  arms[0].add(pickaxe);

  // 물뿌리개 (화분에 물 줄 때만 오른손에 쥠, 평소엔 숨김). canPivot 이 팔 회전을 상쇄해 몸체가 늘 똑바로 서 있고, 부을 때만 앞으로 기운다
  const canPivot = new THREE.Group();
  canPivot.position.set(0, -0.62, 0.1);
  const can = new THREE.Group();
  const mCan = toon(0x6fa8dc);
  const mCanDark = toon(0x5a8fc0);
  const canBody = mesh(new THREE.CylinderGeometry(0.16, 0.19, 0.32, 12), mCan);
  outline(canBody, 0.02, LINE);
  const spout = mesh(new THREE.CylinderGeometry(0.03, 0.045, 0.42, 8), mCan);
  spout.rotation.x = 0.95; // 앞(+z)으로 뻗은 주둥이
  spout.position.set(0, 0.1, 0.27);
  const rose = mesh(new THREE.SphereGeometry(0.065, 10, 8), mCanDark);
  rose.position.set(0, 0.24, 0.44);
  const handle = mesh(new THREE.TorusGeometry(0.13, 0.025, 8, 16, Math.PI), mCanDark);
  handle.rotation.y = Math.PI / 2;
  handle.position.set(0, 0.16, -0.04);
  can.add(canBody, spout, rose, handle);
  can.position.y = -0.08;
  canPivot.add(can);
  canPivot.visible = false;
  arms[1].add(canPivot);

  // 스마트폰 (오른손)
  const phone = new THREE.Group();
  const phoneBody = mesh(new THREE.BoxGeometry(0.24, 0.46, 0.04), toon(0x1c1e24));
  const screen = new THREE.Mesh(
    new THREE.PlaneGeometry(0.2, 0.4),
    new THREE.MeshBasicMaterial({ color: 0xbfe6ff })
  );
  screen.position.z = 0.021;
  const screenLight = new THREE.PointLight(0x9fd4ff, 2.5, 5, 2);
  screenLight.position.z = 0.15;
  phone.add(phoneBody, screen, screenLight);
  phone.position.set(0, -0.64, 0.3);
  phone.rotation.x = -0.8; // 화면이 얼굴 쪽을 향하도록
  phone.visible = hasPhone; // 이 게임에선 폰이 필요 없어 플래그로 숨김 (캐릭터 설정상 폰은 그대로 둔다)
  screenLight.visible = hasPhone;
  arms[1].add(phone);

  // 꼬리: 통짜 회전체(lathe). 끝부분만 검정이고 경계는 지그재그 텍스처
  const tailPivot = new THREE.Group();
  tailPivot.position.set(0, -0.12, -0.5);
  body.add(tailPivot);
  const tail = new THREE.Group();
  tail.rotation.x = -0.75;
  tailPivot.add(tail);
  {
    const L = 1.85;
    const N = 32;
    const profile = [];
    for (let i = 0; i < N; i++) {
      const t = i / (N - 1);
      const r = i === N - 1 ? 0.001 : 0.52 * Math.sin(Math.PI * (0.15 + 0.85 * t)) ** 0.9;
      profile.push(new THREE.Vector2(r, t * L));
    }
    const tailGeo = new THREE.LatheGeometry(profile, 48);
    const tailMat = toon(0xffffff, {
      map: zigzagTexture({ base: ORANGE, tip: DARK, tipStart: 0.5, teeth: 5, amp: 0.05 }),
    });
    const tailMesh = mesh(tailGeo, tailMat);
    outline(tailMesh, 0.035, LINE);
    tail.add(tailMesh);
  }

  // ---------- 머리 ----------
  const HEAD_Y = 2.0;
  const head = new THREE.Group();
  head.position.y = HEAD_Y;
  root.add(head);

  const skull = sphere(1, mOrange, 1.14, 0.98, 1);
  outline(skull, 0.04, LINE);
  head.add(skull);

  // 크림색 얼굴 아래쪽 (입 주변 + 양볼까지 넓게)
  const muzzle = sphere(0.74, mCream, 1.25, 0.66, 0.9);
  muzzle.position.set(0, -0.36, 0.36);
  head.add(muzzle);

  // 볼 털 뭉치 (양 옆으로 부드럽게 부푼 두 갈래 크림색 털)
  for (const s of [-1, 1]) {
    const tuft = new THREE.Group();
    tuft.position.set(s * 0.96, -0.32, 0.3);
    tuft.rotation.y = -s * 0.35;
    const upper = sphere(0.18, mCream, 1.25, 0.62, 0.55);
    upper.position.set(s * 0.06, 0.07, 0);
    upper.rotation.z = s * 0.35;
    const lower = sphere(0.17, mCream, 1.3, 0.6, 0.55);
    lower.position.set(s * 0.07, -0.08, 0);
    lower.rotation.z = -s * 0.25;
    tuft.add(upper, lower);
    head.add(tuft);
  }

  // 코 (검은 타원) + 작은 'ω' 입
  const nose = sphere(0.11, mDark, 1.2, 0.82, 0.9);
  nose.position.set(0, -0.22, 1.06);
  head.add(nose);
  for (const s of [-1, 1]) {
    const m = mesh(new THREE.TorusGeometry(0.06, 0.014, 6, 12, Math.PI), mDark);
    m.position.set(s * 0.06, -0.36, 1.04);
    m.rotation.z = Math.PI; // ∪ 모양
    m.rotation.y = s * 0.3;
    head.add(m);
  }

  // 볼 홍조
  for (const s of [-1, 1]) {
    const cheek = sphere(0.13, mCheek, 1, 0.7, 0.35);
    cheek.position.set(s * 0.64, -0.26, 0.82);
    cheek.rotation.y = s * 0.6;
    head.add(cheek);
  }

  // 눈: 점 눈(하이라이트 포함) / 웃는 눈
  const dotEyes = [];
  const happyEyes = [];
  for (const s of [-1, 1]) {
    const eye = new THREE.Group();
    eye.position.set(s * 0.37, 0.07, 0.96);
    eye.rotation.y = s * 0.35;
    const pupil = sphere(0.08, mDark, 1, 1.3, 0.6);
    const shine = new THREE.Mesh(new THREE.SphereGeometry(0.026, 12, 8), mWhite);
    shine.position.set(-s * 0.025, 0.045, 0.035);
    eye.add(pupil, shine);
    head.add(eye);
    dotEyes.push(eye);

    const arc = eyeArc(0.14, mDark, 0.032);
    arc.position.set(s * 0.37, 0.03, 0.96);
    arc.rotation.y = s * 0.35;
    arc.visible = false;
    head.add(arc);
    happyEyes.push(arc);
  }

  // 귀: 가로로 넓고 풍성한 원뿔. 위쪽은 검정(지그재그 경계), 안쪽은 짙은 갈색,
  // 바깥쪽 밑동에 털 뭉치를 덧붙여 복슬복슬한 느낌
  const ears = [];
  const earMat = toon(0xffffff, {
    map: zigzagTexture({ base: ORANGE, tip: DARK, tipStart: 0.5, teeth: 4, amp: 0.05 }),
  });
  for (const s of [-1, 1]) {
    const ear = new THREE.Group();
    ear.position.set(s * 0.74, 0.6, -0.1);
    ear.rotation.z = -s * 0.62;
    // 볼록한 잎 모양 회전체: 밑동이 넓고 옆면이 부풀어 풍성해 보임
    const EAR_H = 1.05;
    const EAR_R = 0.6;
    const N = 24;
    const profile = [];
    for (let i = 0; i < N; i++) {
      const t = i / (N - 1);
      const r = i === N - 1 ? 0.001 : EAR_R * Math.pow(1 - t, 0.62);
      profile.push(new THREE.Vector2(r, t * EAR_H));
    }
    const cone = mesh(new THREE.LatheGeometry(profile, 40), earMat);
    cone.position.y = -0.1;
    cone.scale.z = 0.45;
    outline(cone, 0.035, LINE);
    const inner = mesh(new THREE.ConeGeometry(0.32, 0.6, 36), mInner);
    inner.position.set(0, 0.2, 0.14);
    inner.scale.z = 0.3;
    ear.add(cone, inner);
    head.add(ear);
    ears.push(ear);
  }

  // 머리 위 말풍선 (구독 리액션 등에 사용)
  const speech = createSpeechBubble(root, HEAD_Y + 1.15);
  const say = speech.say;

  // ---------- 애니메이션 ----------
  const blinker = new Blinker(dotEyes);
  let phase = 0;
  let moveBlend = 0;
  let time = Math.random() * 10;
  let expression = 'dot';

  function setExpression(name) {
    expression = name;
    const happy = name === 'happy';
    for (const e of dotEyes) e.visible = !happy;
    for (const e of happyEyes) e.visible = happy;
  }

  let sitBlend = 0;
  // 곡괭이질: chop() 을 부르면 0.38 배 지점까지 팔을 크게 들어올렸다가(windup) 나머지 구간에서 빠르게 내리찍는다(strike)
  let chopT = 0;
  let chopDur = 0.48;
  function chop(duration = 0.48) {
    chopDur = duration;
    chopT = duration;
  }
  function setTool(show) {
    pickaxe.visible = show;
    if (!show) chopT = 0;
  }
  // 물주기: water() 를 부르면 오른팔을 앞으로 들어 물뿌리개를 기울였다가 다시 내린다
  let waterT = 0;
  let waterDur = 1.6;
  let waterBlend = 0;
  function water(duration = 1.6) {
    waterDur = duration;
    waterT = duration;
  }
  // 디버그 전용: 곡괭이질 포즈를 진행도(k, 0~1)에 고정해 스크린샷으로 확인할 수 있게 한다 (헤드리스 테스트에서 실시간 스윙은 타이밍상 포착하기 어려움)
  let frozenChopK = null;
  function previewChop(k) {
    frozenChopK = k;
    pickaxe.visible = true;
  }

  function update(dt, { moving = false, speed = 1, sitting = false } = {}) {
    time += dt;
    moveBlend = THREE.MathUtils.damp(moveBlend, moving && !sitting ? 1 : 0, 8, dt);
    sitBlend = THREE.MathUtils.damp(sitBlend, sitting ? 1 : 0, 10, dt);
    if (moving && !sitting) phase += dt * 9 * speed;

    const swing = Math.sin(phase) * moveBlend;
    const bounce = Math.abs(Math.sin(phase)) * 0.09 * moveBlend;
    const breathe = Math.sin(time * 2.2) * 0.012;

    // 곡괭이질 진행도: 0~0.38 은 팔을 들어올리는 준비 동작, 0.38~1 은 내리찍는 타격
    let chopWind = 0;
    let chopStrike = 0;
    if (frozenChopK !== null) {
      const k = frozenChopK;
      chopWind = 1 - (1 - Math.min(1, k / 0.38)) ** 3;
      chopStrike = k <= 0.38 ? 0 : Math.min(1, (k - 0.38) / 0.62);
      chopStrike *= chopStrike;
    } else if (chopT > 0) {
      chopT = Math.max(0, chopT - dt);
      const k = 1 - chopT / chopDur;
      chopWind = 1 - (1 - Math.min(1, k / 0.38)) ** 3;
      chopStrike = k <= 0.38 ? 0 : Math.min(1, (k - 0.38) / 0.62);
      chopStrike *= chopStrike;
    }

    body.position.y = BODY_Y + bounce;
    body.scale.y = 1 + breathe;
    body.rotation.z = Math.sin(phase) * 0.05 * moveBlend;
    body.rotation.x = 0.08 * moveBlend - 0.05 * sitBlend + chopStrike * 0.18;

    // 앉으면 다리를 앞으로 쭉 뻗음
    legs[0].rotation.x = THREE.MathUtils.lerp(swing * 0.7, -1.45, sitBlend);
    legs[1].rotation.x = THREE.MathUtils.lerp(-swing * 0.7, -1.45, sitBlend);

    // 왼팔은 평소 걷기 스윙, 곡괭이질 중에는 들어올렸다가 내리찍는 동작으로 대체 (기본 벌어짐 각도 -0.25 유지)
    if (frozenChopK !== null || chopT > 0 || chopWind > 0 || chopStrike > 0) {
      // 준비 동작: 팔이 앞으로 들려 올라가며 머리 위까지 곡괭이를 든다 (0 → -π, 뒤가 아니라 앞쪽 호를 그대로 지나 위로).
      // 타격: 같은 앞쪽 호를 되짚어 내려오며 앞으로 살짝 기울어진 채 내리찍는다 (-π → -0.3).
      arms[0].rotation.x = -Math.PI * chopWind + (Math.PI - 0.3) * chopStrike;
      arms[0].rotation.z = -0.25 + chopWind * 0.15 - chopStrike * 0.1;
    } else {
      arms[0].rotation.x = -swing * 0.6;
      arms[0].rotation.z = -0.25;
    }
    if (hasPhone) {
      // 폰을 든 오른팔: 서 있을 땐 폰을 얼굴 앞에 들고, 걸을 땐 스윙
      const holdPose = -1.35 + Math.sin(time * 1.6) * 0.05;
      arms[1].rotation.x = THREE.MathUtils.lerp(holdPose, swing * 0.6 - 0.6, moveBlend);
      arms[1].rotation.z = THREE.MathUtils.lerp(-0.35, 0.25, moveBlend);
    } else {
      // 폰이 없으면 왼팔과 대칭으로 자연스럽게 내리고 걷기 스윙
      arms[1].rotation.x = swing * 0.6;
      arms[1].rotation.z = 0.25;
    }
    // 물주기: 오른팔을 앞으로 들어 올리고(waterBlend), 동작 중간에 물뿌리개를 앞으로 기울인다(pour)
    if (waterT > 0) waterT = Math.max(0, waterT - dt);
    waterBlend = THREE.MathUtils.damp(waterBlend, waterT > 0 ? 1 : 0, 9, dt);
    const waterK = waterT > 0 ? 1 - waterT / waterDur : 1;
    const pour = waterBlend * Math.sin(Math.min(1, waterK) * Math.PI);
    arms[1].rotation.x = THREE.MathUtils.lerp(arms[1].rotation.x, -1.2, waterBlend);
    arms[1].rotation.z = THREE.MathUtils.lerp(arms[1].rotation.z, -0.05, waterBlend);
    canPivot.visible = waterBlend > 0.03;
    canPivot.rotation.x = -arms[1].rotation.x + pour * 0.85;

    head.position.y = HEAD_Y + bounce * 0.8 + Math.sin(time * 2.2) * 0.02;
    head.rotation.z = Math.sin(phase * 0.5) * 0.06 * moveBlend;
    head.rotation.x = (hasPhone ? THREE.MathUtils.lerp(0.12, 0.05, moveBlend) : 0.05) + waterBlend * 0.22; // 폰이 있거나 물을 줄 땐 내려다보는 느낌

    // 꼬리: 좌우 흔들기 + 끝으로 갈수록 크게 출렁이는 웨이브
    const wag = Math.sin(time * 3 + phase * 0.8);
    tailPivot.rotation.y = wag * (0.25 + 0.3 * moveBlend);
    // 앉으면 꼬리를 옆으로 빼서 의자 등받이와 겹치지 않게
    tail.rotation.x = -0.75 + Math.sin(time * 2) * 0.08 + 0.2 * moveBlend - 0.5 * sitBlend;
    tail.rotation.z = wag * 0.12 + 0.9 * sitBlend;

    // 귀 움찔
    const twitch = Math.max(0, Math.sin(time * 1.3)) ** 12 * 0.25;
    ears[0].rotation.z = 0.62 + twitch;
    ears[1].rotation.z = -0.62 - twitch * 0.5;

    if (expression === 'dot') blinker.update(dt);

    speech.update(dt);
  }

  return { group: root, update, setExpression, getExpression: () => expression, say, chop, setTool, previewChop, water };
}
