import * as THREE from 'three';
import { toon, mesh, sphere, capsule, eyeArc, outline, zigzagTexture, Blinker } from '../helpers.js';
import { speechBubbleTexture } from '../world/textures.js';

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

export function createFox() {
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
  const speechSprite = new THREE.Sprite(
    new THREE.SpriteMaterial({ transparent: true, opacity: 0, depthTest: false })
  );
  speechSprite.scale.set(1.6, 0.8, 1);
  speechSprite.position.set(0, HEAD_Y + 1.6, 0);
  speechSprite.visible = false;
  root.add(speechSprite);
  let speechTimer = 0;
  let speechDuration = 1;

  function say(text, duration = 1.8) {
    if (speechSprite.material.map) speechSprite.material.map.dispose();
    speechSprite.material.map = speechBubbleTexture(text);
    speechSprite.visible = true;
    speechTimer = duration;
    speechDuration = duration;
  }

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

  function update(dt, { moving = false, speed = 1, sitting = false } = {}) {
    time += dt;
    moveBlend = THREE.MathUtils.damp(moveBlend, moving && !sitting ? 1 : 0, 8, dt);
    sitBlend = THREE.MathUtils.damp(sitBlend, sitting ? 1 : 0, 10, dt);
    if (moving && !sitting) phase += dt * 9 * speed;

    const swing = Math.sin(phase) * moveBlend;
    const bounce = Math.abs(Math.sin(phase)) * 0.09 * moveBlend;
    const breathe = Math.sin(time * 2.2) * 0.012;

    body.position.y = BODY_Y + bounce;
    body.scale.y = 1 + breathe;
    body.rotation.z = Math.sin(phase) * 0.05 * moveBlend;
    body.rotation.x = 0.08 * moveBlend - 0.05 * sitBlend;

    // 앉으면 다리를 앞으로 쭉 뻗음
    legs[0].rotation.x = THREE.MathUtils.lerp(swing * 0.7, -1.45, sitBlend);
    legs[1].rotation.x = THREE.MathUtils.lerp(-swing * 0.7, -1.45, sitBlend);

    // 왼팔은 걷기 스윙, 오른팔은 폰 들기 자세와 스윙을 섞음
    arms[0].rotation.x = -swing * 0.6;
    const holdPose = -1.35 + Math.sin(time * 1.6) * 0.05;
    arms[1].rotation.x = THREE.MathUtils.lerp(holdPose, swing * 0.6 - 0.6, moveBlend);
    arms[1].rotation.z = THREE.MathUtils.lerp(-0.35, 0.25, moveBlend);

    head.position.y = HEAD_Y + bounce * 0.8 + Math.sin(time * 2.2) * 0.02;
    head.rotation.z = Math.sin(phase * 0.5) * 0.06 * moveBlend;
    head.rotation.x = THREE.MathUtils.lerp(0.12, 0.05, moveBlend); // 폰을 내려다보는 느낌

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

    if (speechTimer > 0) {
      speechTimer -= dt;
      const fadeOut = Math.min(speechDuration, 0.3);
      speechSprite.material.opacity =
        speechTimer > fadeOut ? Math.min(1, (speechDuration - speechTimer) / 0.2) : speechTimer / fadeOut;
      if (speechTimer <= 0) speechSprite.visible = false;
    }
  }

  return { group: root, update, setExpression, getExpression: () => expression, say };
}
