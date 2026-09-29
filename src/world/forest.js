import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { toon, mesh, sphere, outline, rand } from '../helpers.js';
import { createFox } from '../characters/fox.js';

/**
 * 숲: 1~3일차는 밝은 아침(하늘빛 배경 + 햇살 + 초록 나무), 4일차 해질녘, 5일차부터 밤(달빛 + 안개 + 가로등).
 * update() 의 daylight(0=밤, 1=아침) 로 색/조명을 섞고, horrorBlend 로 붉고 어둡게 덮는다.
 * 소품 (docs/game_timeline.md): 오두막(문으로 방과 연결), 열매 덩굴, 우물(물조리개 채우기 / 4일차 열쇠), 북쪽의 포도송이 석탑 두 개와 그 너머 헛간(노미요 인형),
 * 남쪽 끝의 금색 파닥 동상(6자리 다이얼) — 비밀번호를 맞히면 그 자리에 커다란 나무 상자('좋아요' 석상)가 드러난다.
 *
 * 레이어 설계: 고성 지도(30×22 타일)의 중심 타일 (15,11) 이 노미요의 집(오두막)에 오도록 겹친다. 1타일 = TILE_M(6m).
 * 고성 지하 3층 남쪽 다이얼 문 타일 (15,21) → 숲 좌표 (0, CABIN.z + 10·TILE_M) = 파닥 동상(다이얼)의 자리 = 숲의 남쪽 끝.
 * 숲은 빽빽한 나무(충돌 있음)로 길을 잃기 쉽고, 우물은 서쪽 멀리, 석탑·헛간은 북쪽 끝에 있다. 포도송이는 나무 몇 그루에 하나씩 매달려 있다.
 */
export function createForest() {
  const group = new THREE.Group();
  group.name = 'forest';

  const NIGHT_BG = new THREE.Color(0x0b0e18);
  const DAY_BG = new THREE.Color(0xa8d8f0); // 아침 하늘
  const HORROR_BG = new THREE.Color(0x1a0608); // 4일차부터 점점 이 색(붉고 어두운)으로
  const LINE = 0x2a211d;
  const RED_MOON = new THREE.Color(0xff6a5a);

  // 아침↔밤에 따라 색이 바뀌는 재질 목록: update() 에서 daylight 로 보간
  const dayNight = [];
  const shade = (mat, night, day) => {
    dayNight.push({ mat, night: new THREE.Color(night), day: new THREE.Color(day) });
    return mat;
  };

  const ground = mesh(
    new THREE.CircleGeometry(110, 64),
    shade(new THREE.MeshStandardMaterial({ color: 0x1b221d, roughness: 1 }), 0x1b221d, 0x5f9a4a)
  );
  ground.rotation.x = -Math.PI / 2;
  ground.castShadow = false;
  group.add(ground);

  // ---------- 오두막 (정면 문이 +z 쪽) ----------
  const CABIN = { x: 0, z: -9.5, w: 9, d: 5.5, h: 5 };
  const cabin = new THREE.Group();
  cabin.position.set(CABIN.x, 0, CABIN.z);
  group.add(cabin);
  const walls = mesh(new THREE.BoxGeometry(CABIN.w, CABIN.h, CABIN.d), toon(0xe8d6bd));
  walls.position.y = CABIN.h / 2;
  outline(walls, 0.05, LINE);
  const roof = mesh(new THREE.ConeGeometry(CABIN.d * 0.95, 2.6, 4), toon(0xb5552f));
  roof.scale.x = (CABIN.w + 1.2) / (CABIN.d * 1.4);
  roof.rotation.y = Math.PI / 4;
  roof.position.y = CABIN.h + 1.3;
  const eave = mesh(new THREE.BoxGeometry(CABIN.w + 1.2, 0.25, CABIN.d + 1.2), toon(0x8f4224));
  eave.position.y = CABIN.h + 0.05;
  cabin.add(walls, roof, eave);
  const frontZ = CABIN.d / 2 + 0.01;
  const doorPanel = mesh(new RoundedBoxGeometry(3.2, 4.6, 0.16, 3, 0.03), toon(0xc9782e)); // 문 가로폭을 넓게
  doorPanel.position.set(0, 2.3, frontZ);
  outline(doorPanel, 0.03, LINE);
  const doorInset = mesh(new RoundedBoxGeometry(2.1, 2.6, 0.06, 3, 0.02), toon(0xd88a3f));
  doorInset.position.set(0, 2.7, frontZ + 0.09);
  const knob = sphere(0.1, toon(0xf2c94c));
  knob.position.set(1.2, 2.1, frontZ + 0.2);
  cabin.add(doorPanel, doorInset, knob);
  const mGlow = shade(new THREE.MeshBasicMaterial({ color: 0xffd58a }), 0xffd58a, 0x9fb7c8); // 낮에는 불 꺼진 유리창
  const cabinLights = []; // 밤에만 켜지는 창문/현관 불빛 { light, base }
  for (const s of [-1, 1]) {
    const win = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1.2), mGlow);
    win.position.set(s * 2.8, 3.0, frontZ + 0.01);
    const sill = mesh(new THREE.BoxGeometry(1.7, 0.12, 0.3), toon(0xf6ecd8));
    sill.position.set(s * 2.8, 2.35, frontZ + 0.12);
    const winLight = new THREE.PointLight(0xffc27a, 5, 7, 2);
    winLight.position.set(s * 2.8, 3.0, frontZ + 0.8);
    cabin.add(win, sill, winLight);
    cabinLights.push({ light: winLight, base: 5 });
  }
  const porchLight = new THREE.PointLight(0xffb070, 10, 10, 2);
  porchLight.position.set(0, 4.5, frontZ + 1.0);
  const porchLamp = new THREE.Mesh(new THREE.SphereGeometry(0.18, 14, 10), mGlow);
  porchLamp.position.set(0, 4.7, frontZ + 0.3);
  cabin.add(porchLight, porchLamp);
  cabinLights.push({ light: porchLight, base: 10 });
  const step = mesh(new THREE.BoxGeometry(3.2, 0.25, 1.2), toon(0x8f6b4a));
  step.position.set(0, 0.125, frontZ + 0.6);
  cabin.add(step);

  // 고성 지도와의 겹침: 지하 3층 남쪽 다이얼 문 타일 (15,21) 이 오두막(중심 타일 (15,11)) 에서 남쪽으로 10타일
  const TILE_M = 6;
  const DIAL_Z = CABIN.z + 10 * TILE_M; // 50.5
  const R = 58; // 걸어 다닐 수 있는 범위 (±R)
  // 숲 남쪽 끝: 금색 파닥 동상(다이얼) 자리 = 비밀번호를 맞히면 드러나는 나무 상자 자리
  const CRATE = { x: 0, z: DIAL_Z, size: 4.8, h: 5.0 }; // 노미요(약 2.5) 의 두 배 높이
  const WELL = { x: -46, z: 20 }; // 서쪽 깊숙이 (동상과는 숲을 가로질러 멀리 떨어져 있다)
  const TOWERS = { x: 2.4, z: -44 }; // 북쪽 끝, 좌우 ±x
  const BARN = { x: 0, z: -50, w: 5.2, d: 4.2, h: 3.4 };
  const LANTERN_SPOTS = [[7, -3], [-7, 5], [2, 9], [-20, 18], [-36, 10], [20, 26], [4, 40], [16, -28], [-14, -32], [-3, -38], [30, -6], [-30, -14], [38, 30], [-40, 36], [24, 44]];

  // ---------- 나무 ----------
  // 빽빽하지만 (최소 간격 SPACING 으로) 사이를 지나갈 수 있는 숲. 나무마다 작은 충돌 상자가 있어 길을 찾아 헤매게 된다.
  // 생김새는 다섯 가지(소나무·2단 소나무·키 큰 전나무·둥근 활엽수·고사목)를 섞고 크기도 제각각이다.
  // 오두막·우물·동상·석탑/헛간·가로등 자리는 비운다
  const leafColors = [
    [0x13261a, 0x3f9a4c],
    [0x0f1f15, 0x2f7a3c],
    [0x18301c, 0x5aa84e],
    [0x1a2a14, 0x7aa63a],
  ];
  const trunkColors = [
    [0x2a1f18, 0x6b4a30],
    [0x221a16, 0x4f3a2a],
    [0x2e2620, 0x8a6a4c],
  ];
  const mDead = shade(toon(0x1a1612), 0x1a1612, 0x3b332c);
  const treeObstacles = [];
  const SPACING = 3.7;
  const blocked = (x, z) =>
    (Math.abs(x - CABIN.x) < 8 && Math.abs(z - CABIN.z) < 7) || // 오두막
    Math.hypot(x - CRATE.x, z - CRATE.z) < 7 || // 동상/상자
    Math.hypot(x - WELL.x, z - WELL.z) < 4.5 || // 우물
    (Math.abs(x) < 3.4 && z < -40 && z > -55) || // 석탑 사이 → 헛간
    Math.hypot(x - BARN.x, z - BARN.z) < 5.5 ||
    LANTERN_SPOTS.some(([lx, lz]) => Math.hypot(x - lx, z - lz) < 1.8) ||
    onPath(x, z);
  // 오솔길: 오두막에서 우물·동상·석탑으로 구불구불 이어지는 길과, 헷갈리게 하는 곁길. 길 위엔 나무를 심지 않고 바닥에 흙길을 그린다
  const PATHS = [
    [[0, -4], [4, 4], [-3, 12], [5, 20], [-4, 28], [3, 36], [-2, 44], [0, 47]], // 남쪽: 동상
    [[-3, -3], [-10, 0], [-16, 6], [-24, 4], [-32, 10], [-40, 14], [-45, 19]], // 서쪽: 우물
    [[-5, -4], [-9, -12], [-6, -20], [2, -28], [-3, -36], [0, -41]], // 북쪽: 석탑
    [[6, 2], [14, -2], [24, 6], [30, 18], [22, 30], [12, 26], [5, 20]], // 동쪽 곁길 (남쪽 길과 만남)
    [[-10, 0], [-16, -8], [-26, -18], [-36, -8]], // 서북쪽 곁길 (막다른 길)
    [[3, 36], [14, 40], [26, 34]], // 남동쪽 곁길 (막다른 길)
    [[-40, 14], [-34, 26], [-26, 36], [-14, 42], [-2, 44]], // 우물에서 남쪽으로 돌아오는 길
    [[2, -28], [12, -32], [20, -22], [30, -26]], // 북동쪽 곁길 (막다른 길)
  ];
  const PATH_HALF = 2.1; // 길 반폭 (나무를 심지 않는 범위)
  const distToSeg = (px, pz, ax, az, bx, bz) => {
    const dx = bx - ax;
    const dz = bz - az;
    const k = THREE.MathUtils.clamp(((px - ax) * dx + (pz - az) * dz) / Math.max(dx * dx + dz * dz, 0.001), 0, 1);
    return Math.hypot(px - (ax + dx * k), pz - (az + dz * k));
  };
  const onPath = (x, z) => PATHS.some((pts) => pts.some((p, i) => i > 0 && distToSeg(x, z, pts[i - 1][0], pts[i - 1][1], p[0], p[1]) < PATH_HALF));
  const mPath = shade(new THREE.MeshStandardMaterial({ color: 0x2a2219, roughness: 1 }), 0x2a2219, 0x8a6f4d);
  const pathGeo = new THREE.CircleGeometry(1.45, 12);
  for (const pts of PATHS) {
    for (let i = 1; i < pts.length; i++) {
      const [ax, az] = pts[i - 1];
      const [bx, bz] = pts[i];
      const len = Math.hypot(bx - ax, bz - az);
      for (let d = 0; d < len; d += 1.3) {
        const k = d / len;
        const disc = new THREE.Mesh(pathGeo, mPath);
        disc.rotation.x = -Math.PI / 2;
        disc.position.set(ax + (bx - ax) * k + rand(-0.3, 0.3), 0.02, az + (bz - az) * k + rand(-0.3, 0.3));
        disc.receiveShadow = true;
        group.add(disc);
      }
    }
  }
  // 격자에 넣어 간격 검사를 빠르게
  const cell = new Map();
  const cellKey = (x, z) => `${Math.floor(x / SPACING)},${Math.floor(z / SPACING)}`;
  const tooClose = (x, z) => {
    const cx = Math.floor(x / SPACING);
    const cz = Math.floor(z / SPACING);
    for (let i = -1; i <= 1; i++)
      for (let j = -1; j <= 1; j++) {
        const list = cell.get(`${cx + i},${cz + j}`);
        if (list && list.some(([tx, tz]) => Math.hypot(tx - x, tz - z) < SPACING)) return true;
      }
    return false;
  };
  const treeSpots = [];
  let tries = 0;
  while (treeSpots.length < 1100 && tries++ < 40000) {
    const a = rand(0, Math.PI * 2);
    const r = Math.sqrt(rand(0.02, 1)) * (R + 8);
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    if (r < 9 || blocked(x, z) || tooClose(x, z)) continue;
    treeSpots.push([x, z]);
    const k = cellKey(x, z);
    if (!cell.has(k)) cell.set(k, []);
    cell.get(k).push([x, z]);
  }
  const trees = [];
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  for (const [x, z] of treeSpots) {
    const tree = new THREE.Group();
    // 재질은 나무마다 복제: 카메라와 노미요 사이를 가리면 그 나무만 반투명해진다 (fade)
    const [tn, td] = pick(trunkColors);
    const [ln, ld] = pick(leafColors);
    const mT = shade(toon(tn), tn, td);
    const mL = shade(toon(ln), ln, ld);
    const mats = [mT, mL];
    const kind = Math.random();
    const scale = rand(0.85, 1.35);
    let canopyR = 0; // 잎이 퍼진 반경 (카메라 가림 판정, 포도송이 위치용)
    let canopyY = 0; // 잎이 가장 넓게 퍼진 높이 (포도송이가 매달리는 높이)
    const addCone = (radius, height, y) => {
      if (radius > canopyR) {
        canopyR = radius;
        canopyY = y - height / 2 + 0.55; // 원뿔 밑단 조금 위
      }
      const c = mesh(new THREE.ConeGeometry(radius, height, 9), mL);
      c.position.y = y;
      c.receiveShadow = false;
      tree.add(c);
    };
    const addTrunk = (r0, r1, len, mat = mT) => {
      const t = mesh(new THREE.CylinderGeometry(r0, r1, len, 8), mat);
      t.position.y = len / 2;
      t.castShadow = false;
      t.receiveShadow = false;
      tree.add(t);
    };
    if (kind < 0.34) {
      // 소나무: 원뿔 하나
      const h = rand(4, 7);
      addTrunk(0.25, 0.36, 1.7);
      addCone(rand(1.4, 2.2), h, 1.5 + h / 2);
    } else if (kind < 0.58) {
      // 2단 소나무: 원뿔 두 개
      const h = rand(3, 4.5);
      addTrunk(0.28, 0.4, 1.6);
      addCone(rand(1.8, 2.5), h, 1.4 + h / 2);
      addCone(rand(1.2, 1.7), h * 0.9, 1.4 + h * 1.1);
    } else if (kind < 0.76) {
      // 키 큰 전나무: 가늘고 높은 3단
      addTrunk(0.2, 0.3, 2.4);
      const h = rand(2.6, 3.4);
      addCone(rand(1.3, 1.7), h, 2.2 + h / 2);
      addCone(rand(1.0, 1.3), h, 2.2 + h * 1.05);
      addCone(rand(0.6, 0.9), h * 0.9, 2.2 + h * 1.65);
    } else if (kind < 0.92) {
      // 둥근 활엽수: 긴 줄기 + 뭉게뭉게 잎
      addTrunk(0.22, 0.34, 3.0);
      const blobs = 3 + Math.floor(Math.random() * 3);
      for (let i = 0; i < blobs; i++) {
        const br = rand(1.2, 1.9);
        const b = sphere(br, mL, 1, rand(0.75, 1), 1);
        b.position.set(rand(-0.9, 0.9), 3.4 + rand(0, 1.4), rand(-0.9, 0.9));
        if (br + 0.9 > canopyR) {
          canopyR = br + 0.9;
          canopyY = b.position.y - br * 0.3;
        }
        b.receiveShadow = false;
        tree.add(b);
      }
    } else {
      // 고사목: 잎 없이 가지만 뻗은 검은 나무
      mats[0] = mats[1] = mDead;
      addTrunk(0.16, 0.3, rand(4, 6), mDead);
      for (let i = 0; i < 3; i++) {
        const br = mesh(new THREE.CylinderGeometry(0.05, 0.1, rand(1.4, 2.4), 6), mDead);
        br.position.set(0, rand(2.2, 4.5), 0);
        br.rotation.set(rand(-0.4, 0.4), rand(0, Math.PI * 2), rand(0.6, 1.1));
        br.castShadow = false;
        tree.add(br);
      }
    }
    tree.scale.setScalar(scale);
    tree.position.set(x, 0, z);
    tree.rotation.y = rand(0, Math.PI * 2);
    tree.userData.mats = mats;
    tree.userData.fade = 1;
    tree.userData.r = Math.max(0.6, canopyR) * scale;
    tree.userData.canopyR = canopyR;
    tree.userData.canopyY = canopyY;
    group.add(tree);
    trees.push(tree);
    const hs = 0.42 * scale;
    treeObstacles.push({ minX: x - hs, maxX: x + hs, minZ: z - hs, maxZ: z + hs });
  }

  // ---------- 가로등 ----------
  const lanterns = [];
  function addLantern(x, z) {
    const post = new THREE.Group();
    const pole = mesh(new THREE.CylinderGeometry(0.07, 0.09, 3.4, 8), toon(0x3a3a40));
    pole.position.y = 1.7;
    const lampMat = new THREE.MeshBasicMaterial({ color: 0xffc582 });
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 12), lampMat);
    lamp.position.y = 3.5;
    const light = new THREE.PointLight(0xffb070, 18, 14, 2);
    light.position.y = 3.4;
    post.add(pole, lamp, light);
    post.position.set(x, 0, z);
    group.add(post);
    lanterns.push({ light, lampMat, base: 18, seed: Math.random() * 100 });
  }
  for (const [x, z] of LANTERN_SPOTS) addLantern(x, z);


  // ---------- 날짜 이벤트용 소품 (main.js 가 날짜에 따라 보이기/숨기기, 상호작용 처리) ----------
  const props = {};
  const propGroup = new THREE.Group();
  group.add(propGroup);

  // 포도송이: 걸어 다닐 수 있는 범위 안의 나무 몇 그루에 하나씩 매달려 있다. 찾아다니며 하루 3개를 먹는다 (main.js 가 먹은 것을 숨긴다)
  {
    const mBerry = toon(0x5b2d7a);
    const mVine = toon(0x3f7a3a);
    const candidates = trees.filter((t) => t.userData.mats[0] !== mDead && Math.hypot(t.position.x, t.position.z) > 11 && Math.abs(t.position.x) < R - 3 && Math.abs(t.position.z) < R - 3);
    for (let i = candidates.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
    }
    const items = [];
    candidates.slice(0, 26).forEach((tree, index) => {
      // 잎 바깥쪽 표면에 매달린다 (나무 기준 좌표: 잎 반경 바로 바깥, 잎이 넓게 퍼진 높이)
      const bunch = new THREE.Group();
      const ang = rand(0, Math.PI * 2);
      const rr = tree.userData.canopyR * 0.92 + 0.12;
      bunch.position.set(Math.cos(ang) * rr, tree.userData.canopyY, Math.sin(ang) * rr);
      bunch.rotation.y = -ang;
      for (let k = 0; k < 9; k++) {
        const gr = sphere(0.12, mBerry);
        gr.position.set((k % 3) * 0.17 - 0.17, -Math.floor(k / 3) * 0.17, (k % 2) * 0.09);
        outline(gr, 0.02, LINE);
        bunch.add(gr);
      }
      const leaf = mesh(new THREE.BoxGeometry(0.34, 0.1, 0.22), mVine);
      leaf.position.set(0, 0.2, 0);
      bunch.add(leaf);
      tree.add(bunch);
      // 상호작용 위치는 나무 기둥이 아니라 송이가 매달린 자리 (잎 바깥)
      tree.updateMatrixWorld(true);
      const wp = bunch.getWorldPosition(new THREE.Vector3());
      items.push({ index, group: bunch, position: new THREE.Vector3(wp.x, 0, wp.z), radius: 2.6, prompt: new THREE.Vector3(wp.x, wp.y + 0.9, wp.z) });
    });
    props.berries = { items };
  }

  // 우물: 돌 테두리 + 지붕 기둥 + 도르래에 매달린 두레박. 2일차에 물조리개를 채우고, 4일차엔 두레박에서 열쇠가 나온다
  {
    const g = new THREE.Group();
    g.position.set(WELL.x, 0, WELL.z);
    const mStone = shade(toon(0x6d6e76), 0x6d6e76, 0x9a9ca6);
    const ring = mesh(new THREE.CylinderGeometry(1.1, 1.2, 1.0, 14), mStone);
    ring.position.y = 0.5;
    outline(ring, 0.04, LINE);
    const hole = new THREE.Mesh(new THREE.CircleGeometry(0.85, 14), new THREE.MeshBasicMaterial({ color: 0x05070c }));
    hole.rotation.x = -Math.PI / 2;
    hole.position.y = 1.01;
    g.add(ring, hole);
    const mWood = toon(0x6b4a2e);
    for (const sx of [-1, 1]) {
      const post = mesh(new THREE.CylinderGeometry(0.08, 0.09, 2.4, 8), mWood);
      post.position.set(sx * 0.95, 2.0, 0);
      g.add(post);
    }
    const beam = mesh(new THREE.CylinderGeometry(0.07, 0.07, 2.2, 8), mWood);
    beam.rotation.z = Math.PI / 2;
    beam.position.y = 3.15;
    const roof = mesh(new THREE.ConeGeometry(1.7, 0.9, 4), toon(0xb5552f));
    roof.rotation.y = Math.PI / 4;
    roof.position.y = 3.7;
    g.add(beam, roof);
    const rope = mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.6, 6), toon(0xd9b48a));
    rope.position.y = 2.3;
    const bucket = mesh(new THREE.CylinderGeometry(0.22, 0.18, 0.34, 10), toon(0x8a6a3c));
    bucket.position.y = 1.4;
    outline(bucket, 0.02, LINE);
    g.add(rope, bucket);
    propGroup.add(g);
    props.well = { group: g, bucket, rope, position: new THREE.Vector3(WELL.x, 0, WELL.z + 1.6), radius: 2.4, prompt: new THREE.Vector3(WELL.x, 2.9, WELL.z) };
  }

  // 포도송이가 새겨진 석탑 두 개(북쪽) 와 그 너머의 헛간. 헛간은 3일차 쪽지를 본 뒤 석탑 사이를 지나면 필터가 벗겨지며 드러난다
  {
    const mStone = shade(toon(0x6d6e76), 0x6d6e76, 0x9a9ca6);
    const mGrape = toon(0x4a2a5a);
    const towers = new THREE.Group();
    for (const sx of [-1, 1]) {
      const t = new THREE.Group();
      t.position.set(sx * TOWERS.x, 0, TOWERS.z);
      const body = mesh(new THREE.BoxGeometry(1.3, 4.6, 1.3), mStone);
      body.position.y = 2.3;
      outline(body, 0.04, LINE);
      const cap = mesh(new THREE.BoxGeometry(1.7, 0.35, 1.7), mStone);
      cap.position.y = 4.75;
      t.add(body, cap);
      // 음각 포도송이: 앞뒤 면에 작은 구슬을 박아 넣은 모양
      for (const fz of [-1, 1]) {
        for (let i = 0; i < 7; i++) {
          const gr = sphere(0.11, mGrape);
          gr.position.set(-0.2 + (i % 3) * 0.2 - (i >= 3 ? 0.1 : 0), 3.2 - Math.floor(i / 3) * 0.2, fz * 0.62);
          t.add(gr);
        }
        const leaf = mesh(new THREE.BoxGeometry(0.28, 0.1, 0.05), toon(0x3f7a3a));
        leaf.position.set(0.15, 3.42, fz * 0.64);
        t.add(leaf);
      }
      towers.add(t);
    }
    propGroup.add(towers);
    props.towers = { group: towers, position: new THREE.Vector3(0, 0, TOWERS.z), halfW: TOWERS.x - 0.7, halfD: 0.8 };

    const barn = new THREE.Group();
    barn.position.set(BARN.x, 0, BARN.z);
    const mPlank = toon(0x7a5433);
    const walls = mesh(new THREE.BoxGeometry(BARN.w, BARN.h, BARN.d), mPlank);
    walls.position.y = BARN.h / 2;
    outline(walls, 0.05, LINE);
    const roof = mesh(new THREE.ConeGeometry(BARN.d * 0.85, 1.8, 4), toon(0x4a3220));
    roof.scale.x = (BARN.w + 1.0) / (BARN.d * 1.2);
    roof.rotation.y = Math.PI / 4;
    roof.position.y = BARN.h + 0.9;
    barn.add(walls, roof);
    const frontZ = BARN.d / 2 + 0.01;
    // 문(자물쇠): 열리면 안쪽으로 젖혀진다
    const door = new THREE.Group();
    door.position.set(-0.9, 0, frontZ);
    const panel = mesh(new RoundedBoxGeometry(1.8, 2.6, 0.14, 3, 0.03), toon(0x5a3a22));
    panel.position.set(0.9, 1.3, 0);
    outline(panel, 0.03, LINE);
    door.add(panel);
    const lock = mesh(new THREE.BoxGeometry(0.28, 0.34, 0.14), toon(0xc9a35a));
    lock.position.set(1.55, 1.35, 0.12);
    const shackle = mesh(new THREE.TorusGeometry(0.11, 0.035, 8, 12, Math.PI), toon(0x8a8a90));
    shackle.position.set(1.55, 1.5, 0.12);
    door.add(lock, shackle);
    barn.add(door);
    // 안쪽: 노미요를 닮은 인형 (작은 노미요 모델). 문이 열려야 보인다
    const doll = createFox({ phone: false }).group;
    doll.scale.setScalar(0.45);
    doll.position.set(0.3, 0, -0.6);
    doll.rotation.y = 0.3;
    doll.visible = false;
    barn.add(doll);
    const inner = new THREE.PointLight(0xffd58a, 0, 5, 2);
    inner.position.set(0, 2.0, 0);
    barn.add(inner);
    barn.visible = false;
    propGroup.add(barn);
    let doorOpen = 0; // 0 닫힘 → 1 열림 (회전 애니메이션)
    props.barn = {
      group: barn,
      doll,
      position: new THREE.Vector3(BARN.x, 0, BARN.z + frontZ + 1.6),
      radius: 2.4,
      prompt: new THREE.Vector3(BARN.x, 3.0, BARN.z + frontZ + 0.2),
      obstacle: { minX: BARN.x - BARN.w / 2 - 0.4, maxX: BARN.x + BARN.w / 2 + 0.4, minZ: BARN.z - BARN.d / 2 - 0.4, maxZ: BARN.z + BARN.d / 2 + 0.3 },
      open() {
        lock.visible = false;
        shackle.visible = false;
        doll.visible = true;
        inner.intensity = 6;
        doorOpen = 0.001;
      },
      takeDoll() {
        doll.visible = false;
      },
      update(dt) {
        if (doorOpen > 0 && doorOpen < 1) {
          doorOpen = Math.min(1, doorOpen + dt * 1.2);
          door.rotation.y = -doorOpen * 1.9;
        }
      },
    };
  }

  // 숲 남쪽 끝의 거대한 금색 파닥 동상: 배 아래에 6자리 비밀번호 다이얼. 비밀번호를 맞히면 사라지고 그 자리에 나무 상자가 드러난다
  {
    const g = new THREE.Group();
    g.position.set(CRATE.x, 0, CRATE.z);
    const mGold = toon(0xe0b43c, { emissive: 0x4a3a08 });
    const mGoldDark = toon(0xb08a24, { emissive: 0x3a2c06 });
    const base = mesh(new THREE.CylinderGeometry(2.2, 2.5, 0.6, 20), toon(0x6d6e76));
    base.position.y = 0.3;
    outline(base, 0.04, LINE);
    g.add(base);
    const body = mesh(new THREE.CapsuleGeometry(1.6, 0.5, 8, 24), mGold);
    body.scale.set(1.28, 1, 1);
    body.position.y = 0.6 + 1.6 + 0.25;
    outline(body, 0.05, LINE);
    g.add(body);
    for (const sx of [-1, 1]) {
      const eye = mesh(new THREE.SphereGeometry(0.16, 12, 10), toon(0x3b3b3b));
      eye.position.set(sx * 0.55, 3.0, -1.5);
      g.add(eye);
      const foot = mesh(new THREE.BoxGeometry(0.7, 0.2, 0.9), mGoldDark);
      foot.position.set(sx * 0.7, 0.7, -0.3);
      g.add(foot);
    }
    const beak = mesh(new THREE.ConeGeometry(0.22, 0.5, 8), mGoldDark);
    beak.rotation.x = -Math.PI / 2;
    beak.position.set(0, 2.6, -1.85);
    g.add(beak);
    // 대파 새싹
    const sprout = mesh(new THREE.CylinderGeometry(0.1, 0.16, 1.4, 8), mGoldDark);
    sprout.position.set(0, 4.6, 0);
    sprout.rotation.z = 0.25;
    const leaf = mesh(new THREE.CylinderGeometry(0.06, 0.13, 1.1, 8), mGoldDark);
    leaf.position.set(0.35, 4.9, 0.1);
    leaf.rotation.z = -0.7;
    g.add(sprout, leaf);
    // 배 아래의 다이얼 판 (관찰해야 알아챈다: 처음엔 그늘에 묻혀 있다)
    const plate = mesh(new THREE.BoxGeometry(1.1, 0.42, 0.12), toon(0x3a3a44));
    plate.position.set(0, 1.25, -2.05);
    g.add(plate);
    const digits = [];
    for (let i = 0; i < 6; i++) {
      const d = mesh(new THREE.BoxGeometry(0.13, 0.26, 0.06), toon(0xc9d6ff, { emissive: 0x2a3a66 }));
      d.position.set(-0.42 + i * 0.168, 1.25, -2.13);
      g.add(d);
      digits.push(d);
    }
    const glow = new THREE.PointLight(0xffd58a, 6, 12, 2);
    glow.position.set(0, 4.5, -3);
    g.add(glow);
    propGroup.add(g);
    props.statue = {
      group: g,
      glow,
      position: new THREE.Vector3(CRATE.x, 0, CRATE.z - 3.6),
      radius: 2.6,
      prompt: new THREE.Vector3(CRATE.x, 2.6, CRATE.z - 2.4),
      update(t) {
        for (let i = 0; i < digits.length; i++) digits[i].material.emissiveIntensity = 0.6 + Math.sin(t * 2 + i) * 0.4;
      },
    };
  }

  // 커다란 나무 상자 (5일차 동상의 비밀번호를 맞히면 드러남): 노미요 두 배 크기. 6일차에 곡괭이로 부수면 안에서 '좋아요' 석상이 드러난다
  {
    const g = new THREE.Group();
    g.position.set(CRATE.x, 0, CRATE.z);
    const S = CRATE.size;
    const H = CRATE.h;

    // 상자 본체: 판자 + 모서리 각목 + 쇠띠. 곡괭이 6번에 조금씩 갈라지다가(cracks) 마지막에 파사삭 흩어진다(planks 가 날아감)
    const crate = new THREE.Group();
    const mWood = toon(0x9a6636);
    const mWoodDark = toon(0x6e4524);
    const mIron = toon(0x3d3f48);
    const mCrack = new THREE.MeshBasicMaterial({ color: 0xe8c48a }); // 갈라진 틈으로 드러나는 밝은 속살(나무 섬유)
    const box = mesh(new THREE.BoxGeometry(S, H, S), mWood);
    box.position.y = H / 2;
    outline(box, 0.05, LINE);
    crate.add(box);
    // 판자 사이 홈(가로줄) — 네 면
    const FACES = [[0, S / 2, 0], [0, -S / 2, 0], [S / 2, 0, Math.PI / 2], [-S / 2, 0, Math.PI / 2]];
    for (let i = 1; i < 5; i++) {
      const y = (H / 5) * i;
      for (const [rx, rz, ry] of FACES) {
        const seam = new THREE.Mesh(new THREE.BoxGeometry(S + 0.02, 0.06, 0.06), mWoodDark);
        seam.position.set(rx, y, rz);
        seam.rotation.y = ry;
        crate.add(seam);
      }
    }
    // 모서리 각목 (세로 4개)
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      const beam = mesh(new THREE.BoxGeometry(0.32, H + 0.1, 0.32), mWoodDark);
      beam.position.set(sx * S / 2, H / 2, sz * S / 2);
      crate.add(beam);
    }
    // 쇠띠 두 줄
    for (const y of [H * 0.28, H * 0.72]) {
      const band = mesh(new THREE.BoxGeometry(S + 0.16, 0.22, S + 0.16), mIron);
      band.position.y = y;
      crate.add(band);
    }
    // 갈라진 틈: 앞면(-z, 플레이어 쪽)에 지그재그로 뻗는 검은 선 조각들. hit(n) 마다 몇 개씩 드러남
    const cracks = [];
    {
      const front = -S / 2 - 0.04;
      let x = -0.4;
      let y = H * 0.55;
      for (let i = 0; i < 18; i++) {
        const len = rand(0.35, 0.7);
        const ang = rand(-1.2, 1.2) + (i % 2 ? Math.PI / 2 : -Math.PI / 2) * 0.5;
        const seg = new THREE.Mesh(new THREE.BoxGeometry(len, 0.11, 0.05), mCrack);
        seg.position.set(x, y, front);
        seg.rotation.z = ang;
        seg.visible = false;
        crate.add(seg);
        cracks.push(seg);
        // 두 갈래로 뻗어 나감: 짝수는 위쪽, 홀수는 아래쪽으로 이어짐
        x += Math.cos(ang) * len * 0.9 * (i % 3 === 0 ? -1 : 1);
        y += Math.sin(ang) * len * 0.9 * (i % 2 ? -1 : 1);
        x = THREE.MathUtils.clamp(x, -S / 2 + 0.4, S / 2 - 0.4);
        y = THREE.MathUtils.clamp(y, 0.4, H - 0.4);
      }
    }
    g.add(crate);

    // 석상: 커다란 '좋아요'(👍) 모양의 돌. 처음엔 숨김.
    // 정면(+z, 뒤에서 rotation.y=π 로 돌려 플레이어 쪽을 향함): 왼쪽 위로 엄지, 오른쪽에 접힌 손가락 네 마디가 층층이, 왼쪽 아래 소맷단
    const statue = new THREE.Group();
    const mStone = toon(0xb9bcc6, { emissive: 0x3a3f4c }); // 어둠 속에서도 형태가 읽히게 살짝 자체 발광
    const mStoneDark = toon(0x8e919c, { emissive: 0x2a2e38 });
    const pedestal = mesh(new THREE.CylinderGeometry(1.9, 2.1, 0.5, 20), toon(0x6d6e76));
    pedestal.position.y = 0.25;
    outline(pedestal, 0.04, LINE);
    statue.add(pedestal);
    // 소맷단(손목): 왼쪽 아래에서 비스듬히 올라와 손바닥에 붙음
    const cuff = mesh(new RoundedBoxGeometry(1.35, 1.1, 1.35, 3, 0.18), mStoneDark);
    cuff.position.set(-0.95, 1.05, 0);
    cuff.rotation.z = 0.35;
    outline(cuff, 0.04, LINE);
    statue.add(cuff);
    // 손바닥 덩어리: 세로로 긴 둥근 블록
    const palm = mesh(new RoundedBoxGeometry(1.7, 2.2, 1.3, 4, 0.4), mStone);
    palm.position.set(0.05, 2.1, 0);
    outline(palm, 0.04, LINE);
    statue.add(palm);
    // 접힌 손가락 네 마디: 손바닥 오른쪽·앞으로 튀어나온 가로 롤. 위에서 아래로 층층이, 위 마디가 조금 더 길다
    for (let i = 0; i < 4; i++) {
      const len = 1.55 - i * 0.08;
      const roll = mesh(new RoundedBoxGeometry(len, 0.46, 0.95, 3, 0.2), mStone);
      roll.position.set(0.35 + (len - 1.55) / 2, 2.85 - i * 0.52, 0.55);
      outline(roll, 0.035, LINE);
      statue.add(roll);
    }
    // 손가락 뿌리를 덮는 손등 윗부분
    const knuckle = mesh(new RoundedBoxGeometry(1.5, 0.6, 1.1, 3, 0.25), mStone);
    knuckle.position.set(0.15, 3.05, 0.15);
    statue.add(knuckle);
    // 엄지: 왼쪽 위에서 곧게 위로 뻗음 (아래 관절 + 긴 마디 + 끝 둥글게)
    const thumbJoint = sphere(0.5, mStone);
    thumbJoint.position.set(-0.75, 3.1, 0.1);
    const thumb = mesh(new THREE.CapsuleGeometry(0.4, 1.5, 6, 16), mStone);
    thumb.position.set(-0.8, 4.05, 0.1);
    thumb.rotation.z = 0.12;
    outline(thumb, 0.04, LINE);
    statue.add(thumbJoint, thumb);
    statue.scale.setScalar(1.05); // 키 ≈ 5 (상자 높이)
    statue.rotation.y = Math.PI; // 손가락 쪽이 오두막 방향(-z, 플레이어가 다가오는 쪽)을 본다
    statue.visible = false;
    const glow = new THREE.PointLight(0xd9ecff, 0, 16, 1.6); // 드러나면 켜짐
    glow.position.set(0, 3.6, -3.2);
    g.add(statue, glow);

    // 부서진 판자: 마지막 타격에 상자 표면에서 사방으로 날아가 떨어진다 (update 에서 애니메이션)
    const planks = new THREE.Group();
    const flying = [];
    for (let i = 0; i < 26; i++) {
      const pl = mesh(new THREE.BoxGeometry(rand(0.9, 2.2), 0.14, rand(0.35, 0.7)), i % 3 ? mWood : mWoodDark);
      planks.add(pl);
      flying.push({ mesh: pl, vel: new THREE.Vector3(), spin: new THREE.Vector3(), rest: false });
    }
    planks.visible = false;
    g.add(planks);
    let shatterT = 0;

    // 석상 잔해 (석상을 부순 뒤)
    const rubble = new THREE.Group();
    for (let i = 0; i < 14; i++) {
      const rock = mesh(new RoundedBoxGeometry(rand(0.4, 1.1), rand(0.3, 0.8), rand(0.4, 1.0), 2, 0.1), mStone);
      const a = rand(0, Math.PI * 2);
      const r = rand(0.2, 2.4);
      rock.position.set(Math.cos(a) * r, 0.25, Math.sin(a) * r);
      rock.rotation.set(rand(0, 1), rand(0, 3), rand(0, 1));
      rubble.add(rock);
    }
    rubble.visible = false;
    g.add(rubble);

    let hitShake = 0;
    const HITS = 6;
    propGroup.add(g);
    props.crate = {
      group: g,
      crate,
      statue,
      planks,
      rubble,
      glow,
      HITS,
      position: new THREE.Vector3(CRATE.x, 0, CRATE.z - S / 2 - 1.2),
      radius: 2.6,
      prompt: new THREE.Vector3(CRATE.x, 2.4, CRATE.z - S / 2 - 0.3), // 상자 앞면 가운데 (꼭대기에 두면 화면 밖으로 나감)
      /** n 번째 타격 (1..HITS-1): 틈이 더 벌어지고 상자가 흔들린다 */
      hit(n) {
        const show = Math.round((cracks.length * n) / (HITS - 1));
        for (let i = 0; i < cracks.length; i++) cracks[i].visible = i < show;
        hitShake = 0.35;
      },
      /** 마지막 타격: 상자가 파사삭 흩어지고 석상이 드러난다 */
      smash() {
        crate.visible = false;
        planks.visible = true;
        for (const f of flying) {
          // 상자 표면 어딘가에서 시작해 바깥으로 튄다
          const face = Math.floor(Math.random() * 4);
          const u = rand(-S / 2, S / 2);
          const y = rand(0.3, H);
          const pos = face === 0 ? [u, y, -S / 2] : face === 1 ? [u, y, S / 2] : face === 2 ? [-S / 2, y, u] : [S / 2, y, u];
          f.mesh.position.set(...pos);
          f.mesh.rotation.set(rand(0, 3), rand(0, 3), rand(0, 3));
          const out = new THREE.Vector3(pos[0], 0, pos[2]).normalize();
          f.vel.set(out.x * rand(3, 7) + rand(-1.5, 1.5), rand(2, 6), out.z * rand(3, 7) + rand(-1.5, 1.5));
          f.spin.set(rand(-6, 6), rand(-6, 6), rand(-6, 6));
          f.rest = false;
        }
        shatterT = 2.5;
        statue.visible = true;
        glow.intensity = 18;
      },
      /** 석상을 부숨 */
      crumble() {
        statue.visible = false;
        rubble.visible = true;
        glow.intensity = 0;
      },
      update(dt) {
        if (hitShake > 0) {
          hitShake -= dt;
          const k = hitShake / 0.35;
          crate.position.set((Math.random() - 0.5) * 0.12 * k, 0, (Math.random() - 0.5) * 0.12 * k);
          crate.rotation.z = (Math.random() - 0.5) * 0.02 * k;
          if (hitShake <= 0) {
            crate.position.set(0, 0, 0);
            crate.rotation.z = 0;
          }
        }
        if (shatterT > 0) {
          shatterT -= dt;
          for (const f of flying) {
            if (f.rest) continue;
            f.vel.y -= 14 * dt;
            f.mesh.position.addScaledVector(f.vel, dt);
            f.mesh.rotation.x += f.spin.x * dt;
            f.mesh.rotation.y += f.spin.y * dt;
            f.mesh.rotation.z += f.spin.z * dt;
            if (f.mesh.position.y <= 0.08 && f.vel.y < 0) {
              f.mesh.position.y = 0.08;
              f.mesh.rotation.x = Math.round(f.mesh.rotation.x / Math.PI) * Math.PI;
              f.mesh.rotation.z = Math.round(f.mesh.rotation.z / Math.PI) * Math.PI;
              f.rest = true;
            }
          }
        }
      },
    };
    // 노미요가 상자 안으로 걸어 들어가지 못하게
    props.crate.obstacle = { minX: CRATE.x - S / 2, maxX: CRATE.x + S / 2, minZ: CRATE.z - S / 2, maxZ: CRATE.z + S / 2 };
  }

  props.crate.group.visible = false; // 동상의 비밀번호를 맞히기 전까지 상자는 보이지 않는다 (main.js applyDayProps)

  // 밤: 달빛(차가운 파랑) / 아침: 햇살(따뜻한 노랑). 같은 DirectionalLight 를 daylight 로 섞어 쓴다
  const SKY_NIGHT = { sky: new THREE.Color(0x3d4f78), ground: new THREE.Color(0x17130f), intensity: 0.55 };
  const SKY_DAY = { sky: new THREE.Color(0xcfe9ff), ground: new THREE.Color(0x7aa35a), intensity: 1.0 };
  const SUN_NIGHT = { color: new THREE.Color(0x9fb6ea), intensity: 1.1, pos: new THREE.Vector3(-12, 18, -8) };
  const SUN_DAY = { color: new THREE.Color(0xfff1d0), intensity: 2.4, pos: new THREE.Vector3(14, 22, 10) };
  const hemi = new THREE.HemisphereLight(SKY_NIGHT.sky, SKY_NIGHT.ground, SKY_NIGHT.intensity);
  const moon = new THREE.DirectionalLight(SUN_NIGHT.color, SUN_NIGHT.intensity);
  moon.position.copy(SUN_NIGHT.pos);
  moon.castShadow = true;
  moon.shadow.mapSize.set(2048, 2048);
  Object.assign(moon.shadow.camera, { left: -40, right: 40, top: 40, bottom: -40, near: 1, far: 120 });
  moon.shadow.bias = -0.0008;
  group.add(hemi, moon);

  let scene = null;
  function setup(s) {
    scene = s;
    scene.background = NIGHT_BG.clone();
    scene.fog = new THREE.FogExp2(NIGHT_BG.clone(), 0.04);
  }

  const tmpCol = new THREE.Color();
  const RED_GLOW = new THREE.Color(0xff3030);
  /**
   * @param horrorBlend 0~1 으스스함 (붉고 어둡게)
   * @param daylight 0~1 (0 밤, 1 아침). 으스스함이 있으면 그만큼 밤에 가까워진다
   */
  function update(dt, t, horrorBlend, _streaming = false, daylight = 0) {
    const day = THREE.MathUtils.clamp(daylight * (1 - horrorBlend), 0, 1);
    const night = 1 - day;
    scene.background.copy(NIGHT_BG).lerp(DAY_BG, day).lerp(HORROR_BG, horrorBlend);
    scene.fog.color.copy(scene.background);
    scene.fog.density = THREE.MathUtils.lerp(THREE.MathUtils.lerp(0.045, 0.08, horrorBlend), 0.03, day); // 넓은 숲: 멀리 안 보이게
    moon.intensity = THREE.MathUtils.lerp(THREE.MathUtils.lerp(SUN_NIGHT.intensity, 0.35, horrorBlend), SUN_DAY.intensity, day);
    moon.color.copy(SUN_NIGHT.color).lerp(RED_MOON, horrorBlend * 0.8).lerp(SUN_DAY.color, day);
    moon.position.copy(SUN_NIGHT.pos).lerp(SUN_DAY.pos, day);
    hemi.intensity = THREE.MathUtils.lerp(THREE.MathUtils.lerp(SKY_NIGHT.intensity, 0.2, horrorBlend), SKY_DAY.intensity, day);
    hemi.color.copy(SKY_NIGHT.sky).lerp(SKY_DAY.sky, day);
    hemi.groundColor.copy(SKY_NIGHT.ground).lerp(SKY_DAY.ground, day);
    for (const m of dayNight) m.mat.color.copy(m.night).lerp(m.day, day);
    for (const c of cabinLights) c.light.intensity = c.base * night;

    props.crate.update(dt);
    if (props.crate.statue.visible) {
      props.crate.glow.intensity = 16 + Math.sin(t * 1.7) * 4;
      tmpCol.setHex(0xd9ecff).lerp(RED_GLOW, horrorBlend);
      props.crate.glow.color.copy(tmpCol);
    }
    props.barn.update(dt);
    if (props.statue.group.visible) {
      props.statue.update(t);
      props.statue.glow.intensity = (5 + Math.sin(t * 1.3) * 1.5) * THREE.MathUtils.lerp(1, 0.4, day);
    }
    for (const l of lanterns) {
      const noise = Math.sin(t * 17 + l.seed) * Math.sin(t * 5.3 + l.seed * 2) * 0.5 + 0.5;
      const flicker = horrorBlend > 0.05 ? (noise > 0.75 ? 0.15 : 1) : 1 - noise * 0.06;
      l.light.intensity = l.base * flicker * THREE.MathUtils.lerp(1, 0.7, horrorBlend) * night;
      l.lampMat.color.setHex(flicker < 0.5 || day > 0.5 ? 0x5a4630 : 0xffc582);
    }
  }

  /** 카메라(cam)와 노미요(fox) 사이에 끼어 시야를 가리는 나무를 반투명하게. 매 프레임 main.js 가 부른다 */
  const tmpA = new THREE.Vector2();
  const tmpB = new THREE.Vector2();
  const tmpP = new THREE.Vector2();
  function occlude(cam, fox, dt) {
    tmpA.set(cam.x, cam.z);
    tmpB.set(fox.x, fox.z);
    const seg = tmpB.clone().sub(tmpA);
    const len2 = Math.max(seg.lengthSq(), 0.001);
    for (const tree of trees) {
      tmpP.set(tree.position.x, tree.position.z).sub(tmpA);
      const k = THREE.MathUtils.clamp(tmpP.dot(seg) / len2, 0, 1);
      const dist = tmpP.sub(seg.clone().multiplyScalar(k)).length();
      const between = dist < tree.userData.r + (k < 0.35 ? 2.6 : 0.8); // 카메라 가까이의 나무는 화면을 크게 가리므로 더 넓게 판정 (k 는 0~1)
      const target = between ? 0.18 : 1;
      const u = tree.userData;
      if (Math.abs(u.fade - target) < 0.01 && u.fade === target) continue;
      u.fade = THREE.MathUtils.damp(u.fade, target, 22, dt);
      if (Math.abs(u.fade - target) < 0.01) u.fade = target;
      for (const m of u.mats) {
        m.transparent = u.fade < 1;
        m.opacity = u.fade;
        m.depthWrite = u.fade >= 1;
      }
    }
  }

  const doorZ = CABIN.z + CABIN.d / 2;
  const bigObstacles = [
    { minX: CABIN.x - CABIN.w / 2 - 0.5, maxX: CABIN.x + CABIN.w / 2 + 0.5, minZ: CABIN.z - CABIN.d / 2 - 0.5, maxZ: doorZ + 0.3 },
    props.crate.obstacle,
    props.barn.obstacle,
  ];
  return {
    group,
    bounds: { minX: -R, maxX: R, minZ: -R, maxZ: R },
    obstacles: [...bigObstacles, ...treeObstacles],
    bigObstacles, // 숲의 괴물은 나무 사이를 그대로 지나온다 (건물·상자만 피함)
    setup,
    update,
    occlude,
    // 오두막 문 앞에서 오두막을 바라보며 시작 (카메라가 뒤에서 오두막을 비춤)
    foxSpawn: { position: new THREE.Vector3(0, 0, doorZ + 3.4), heading: Math.PI },
    chickSpawns: [new THREE.Vector3(4, 0, 0), new THREE.Vector3(-4, 0, 1), new THREE.Vector3(1, 0, 4)],
    cameraStart: new THREE.Vector3(0, 5, 9),
    door: { position: new THREE.Vector3(CABIN.x, 0, doorZ + 0.9), radius: 1.5, target: 'house' },
    // 집에서 나왔을 때: 오두막을 등지고 숲 쪽(+z)을 바라봄.
    // 카메라는 현관 앞(오두막 벽·문 바로 앞, 현관등 옆)에서 여우 너머의 숲을 비춤 (offset = 여우 기준 상대 위치)
    doorSpawn: { position: new THREE.Vector3(0, 0, doorZ + 7.5), heading: 0, camera: { offset: [1.8, 3.6, -6.8] } },
    seat: null,
    computer: null,
    props,
  };
}
