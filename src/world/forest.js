import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { toon, mesh, sphere, outline, rand } from '../helpers.js';

/**
 * 숲: 1~3일차는 밝은 아침(하늘빛 배경 + 햇살 + 초록 나무), 4일차 해질녘, 5일차부터 밤(달빛 + 안개 + 가로등).
 * update() 의 daylight(0=밤, 1=아침) 로 색/조명을 섞고, horrorBlend 로 붉고 어둡게 덮는다.
 * 노미요의 오두막(문으로 방과 연결), 숲 깊은 곳의 커다란 나무 상자(안에 '좋아요' 석상), 오두막 뒤 장작더미(곡괭이).
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
    new THREE.CircleGeometry(60, 64),
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
  const doorPanel = mesh(new RoundedBoxGeometry(2.4, 4.6, 0.16, 3, 0.03), toon(0xc9782e));
  doorPanel.position.set(0, 2.3, frontZ);
  outline(doorPanel, 0.03, LINE);
  const doorInset = mesh(new RoundedBoxGeometry(1.5, 2.6, 0.06, 3, 0.02), toon(0xd88a3f));
  doorInset.position.set(0, 2.7, frontZ + 0.09);
  const knob = sphere(0.1, toon(0xf2c94c));
  knob.position.set(0.85, 2.1, frontZ + 0.2);
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

  // 숲 깊은 곳의 나무 상자 (오두막 반대편 끝)
  const CRATE = { x: 0, z: 19, size: 4.8, h: 5.0 }; // 노미요(약 2.5) 의 두 배 높이

  // ---------- 나무 ----------
  const mTrunk = shade(toon(0x2a1f18), 0x2a1f18, 0x6b4a30);
  const mLeaf = shade(toon(0x13261a), 0x13261a, 0x3f9a4c);
  let placed = 0;
  while (placed < 34) {
    const a = rand(0, Math.PI * 2);
    const r = rand(11, 28);
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    if (Math.abs(x - CABIN.x) < 8 && Math.abs(z - CABIN.z) < 7) continue; // 오두막 자리 비움
    if (Math.hypot(x - CRATE.x, z - CRATE.z) < 6) continue; // 상자 자리 비움
    const h = rand(3, 6);
    const tree = new THREE.Group();
    const trunk = mesh(new THREE.CylinderGeometry(0.25, 0.35, 1.6, 10), mTrunk);
    trunk.position.y = 0.8;
    const top = mesh(new THREE.ConeGeometry(rand(1.2, 2), h, 10), mLeaf);
    top.position.y = 1.4 + h / 2;
    tree.add(trunk, top);
    tree.position.set(x, 0, z);
    tree.rotation.y = rand(0, Math.PI * 2);
    group.add(tree);
    placed++;
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
  addLantern(7, -3);
  addLantern(-7, 5);
  addLantern(2, 9);


  // ---------- 날짜 이벤트용 소품 (main.js 가 날짜에 따라 보이기/숨기기, 상호작용 처리) ----------
  const props = {};
  const propGroup = new THREE.Group();
  group.add(propGroup);

  // 포도 덩굴 (2일차): 기둥 두 개 + 가로대 + 잎 + 포도송이
  {
    const g = new THREE.Group();
    g.position.set(8, 0, 2);
    const mPost = toon(0x6b4a2e);
    for (const sx of [-1, 1]) {
      const post = mesh(new THREE.CylinderGeometry(0.09, 0.11, 2.6, 8), mPost);
      post.position.set(sx * 1.2, 1.3, 0);
      g.add(post);
    }
    const bar = mesh(new THREE.BoxGeometry(2.8, 0.12, 0.12), mPost);
    bar.position.y = 2.5;
    g.add(bar);
    const mLeaf = toon(0x3f7a3a);
    for (let i = 0; i < 7; i++) {
      const leaf = sphere(rand(0.35, 0.55), mLeaf, 1, 0.6, 1);
      leaf.position.set(rand(-1.3, 1.3), rand(1.6, 2.6), rand(-0.2, 0.2));
      g.add(leaf);
    }
    const bunches = new THREE.Group();
    const mGrape = toon(0x5b2d7a);
    for (let b = 0; b < 3; b++) {
      const bunch = new THREE.Group();
      bunch.position.set(-0.9 + b * 0.9, 1.75, 0.15);
      for (let i = 0; i < 9; i++) {
        const gr = sphere(0.11, mGrape);
        gr.position.set((i % 3) * 0.16 - 0.16, -Math.floor(i / 3) * 0.16, (i % 2) * 0.08);
        outline(gr, 0.02, LINE);
        bunch.add(gr);
      }
      bunches.add(bunch);
    }
    g.add(bunches);
    propGroup.add(g);
    props.grapes = { group: g, bunches, position: new THREE.Vector3(8, 0, 3.2), radius: 2.0, prompt: new THREE.Vector3(8, 3.2, 2) };
  }

  // 풀숲 (3일차): 어두운 관목 덤불
  {
    const g = new THREE.Group();
    g.position.set(-7, 0, 9.5);
    const mBush = shade(toon(0x1c3a22), 0x1c3a22, 0x3d8a3f);
    for (let i = 0; i < 6; i++) {
      const b = sphere(rand(0.5, 0.9), mBush, 1, 0.8, 1);
      b.position.set(rand(-1.2, 1.2), rand(0.3, 0.7), rand(-0.6, 0.6));
      g.add(b);
    }
    propGroup.add(g);
    props.bush = { group: g, position: new THREE.Vector3(-7, 0, 8.0), radius: 2.0, prompt: new THREE.Vector3(-7, 2.2, 9.5) };
  }

  // 발자국 자리 (4일차): 현관 옆 짓밟힌 땅
  {
    const g = new THREE.Group();
    g.position.set(3.6, 0.02, -4.6);
    const mMud = new THREE.MeshStandardMaterial({ color: 0x11150f, roughness: 1 });
    for (let i = 0; i < 4; i++) {
      const p = mesh(new THREE.CircleGeometry(0.28, 10), mMud);
      p.rotation.x = -Math.PI / 2;
      p.position.set((i % 2) * 0.5 - 0.25, 0, i * 0.7 - 1.0);
      p.scale.set(1, 1.6, 1);
      g.add(p);
    }
    propGroup.add(g);
    props.soundSpot = { group: g, position: new THREE.Vector3(3.6, 0, -3.4), radius: 2.0, prompt: new THREE.Vector3(3.6, 1.8, -4.6) };
  }

  // 힌트 쪽지 (5~6일차): 은은히 빛나며 떠 있는 종이
  {
    const positions = [
      [10, 8],
      [-9, -2],
      [4, 12],
      [-3, 13],
      [11, -6],
    ];
    const mPaper = new THREE.MeshBasicMaterial({ color: 0xf4ecd2 });
    props.hints = positions.map(([x, z], i) => {
      const g = new THREE.Group();
      g.position.set(x, 0, z);
      const paper = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.65), mPaper);
      paper.material.side = THREE.DoubleSide;
      paper.position.y = 1.1;
      paper.rotation.y = rand(0, Math.PI);
      const light = new THREE.PointLight(0xbfe6ff, 4, 5, 2);
      light.position.y = 1.2;
      g.add(paper, light);
      propGroup.add(g);
      return { index: i, group: g, paper, position: new THREE.Vector3(x, 0, z), radius: 1.8, prompt: new THREE.Vector3(x, 2.2, z) };
    });
  }

  // 커다란 나무 상자 (항상 보임): 노미요 두 배 크기. 7일차에 곡괭이로 부수면 안에서 '좋아요' 석상이 드러난다
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

  // 오두막 뒤 장작더미 + 곡괭이 (7일차, 힌트를 다 모은 뒤에만 보임)
  {
    const g = new THREE.Group();
    const PX = 3.5;
    const PZ = CABIN.z - CABIN.d / 2 - 1.6;
    g.position.set(PX, 0, PZ);
    const mLog = toon(0x7a5433);
    const mLogEnd = toon(0xc9a878);
    // 장작 3단 피라미드
    const rows = [4, 3, 2];
    rows.forEach((n, r) => {
      for (let i = 0; i < n; i++) {
        const log = mesh(new THREE.CylinderGeometry(0.22, 0.22, 1.4, 10), mLog);
        log.rotation.z = Math.PI / 2;
        log.position.set(0, 0.22 + r * 0.38, (i - (n - 1) / 2) * 0.46);
        const cap = new THREE.Mesh(new THREE.CircleGeometry(0.2, 10), mLogEnd);
        cap.position.x = 0.71;
        cap.rotation.y = Math.PI / 2;
        log.add(cap);
        g.add(log);
      }
    });
    // 곡괭이: 장작더미에 비스듬히 기대어 있음
    const pickaxe = new THREE.Group();
    const handle = mesh(new THREE.CylinderGeometry(0.06, 0.07, 1.9, 8), toon(0x8a6a3c));
    handle.position.y = 0.95;
    const head = mesh(new THREE.BoxGeometry(1.1, 0.16, 0.16), toon(0x4c4f58));
    head.position.y = 1.85;
    const tip = mesh(new THREE.ConeGeometry(0.09, 0.3, 8), toon(0x4c4f58));
    tip.rotation.z = -Math.PI / 2;
    tip.position.set(0.7, 1.85, 0);
    pickaxe.add(handle, head, tip);
    pickaxe.position.set(-0.9, 0, 0.9);
    pickaxe.rotation.set(0, 0.4, -0.35);
    g.add(pickaxe);
    const light = new THREE.PointLight(0xffe3a8, 3, 5, 2);
    light.position.set(-0.9, 1.6, 0.9);
    g.add(light);
    propGroup.add(g);
    props.pickaxe = { group: g, pickaxe, light, position: new THREE.Vector3(PX - 0.6, 0, PZ + 0.4), radius: 2.2, prompt: new THREE.Vector3(PX - 0.9, 2.6, PZ + 0.9) };
  }

  // 붉은 눈 (3일차 연출): 나무 사이에서 잠깐 나타났다 사라지는 두 점
  {
    const g = new THREE.Group();
    const mEye = new THREE.MeshBasicMaterial({ color: 0xff2020 });
    for (const sx of [-1, 1]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 8), mEye);
      eye.position.set(sx * 0.22, 0, 0);
      g.add(eye);
    }
    const light = new THREE.PointLight(0xff2020, 3, 6, 2);
    g.add(light);
    g.visible = false;
    propGroup.add(g);
    let timer = 0;
    props.redEyes = {
      group: g,
      show(pos, seconds = 2.5) {
        g.position.copy(pos);
        g.visible = true;
        timer = seconds;
      },
      update(dt, t) {
        if (!g.visible) return;
        timer -= dt;
        const blink = Math.sin(t * 9) > 0.92;
        g.scale.setScalar(blink ? 0.2 : 1);
        if (timer <= 0) g.visible = false;
      },
    };
  }

  for (const key of ['grapes', 'bush', 'soundSpot', 'pickaxe']) props[key].group.visible = false;
  for (const h of props.hints) h.group.visible = false;

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
  Object.assign(moon.shadow.camera, { left: -30, right: 30, top: 30, bottom: -30, near: 1, far: 60 });
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
    scene.fog.density = THREE.MathUtils.lerp(THREE.MathUtils.lerp(0.04, 0.075, horrorBlend), 0.012, day);
    moon.intensity = THREE.MathUtils.lerp(THREE.MathUtils.lerp(SUN_NIGHT.intensity, 0.35, horrorBlend), SUN_DAY.intensity, day);
    moon.color.copy(SUN_NIGHT.color).lerp(RED_MOON, horrorBlend * 0.8).lerp(SUN_DAY.color, day);
    moon.position.copy(SUN_NIGHT.pos).lerp(SUN_DAY.pos, day);
    hemi.intensity = THREE.MathUtils.lerp(THREE.MathUtils.lerp(SKY_NIGHT.intensity, 0.2, horrorBlend), SKY_DAY.intensity, day);
    hemi.color.copy(SKY_NIGHT.sky).lerp(SKY_DAY.sky, day);
    hemi.groundColor.copy(SKY_NIGHT.ground).lerp(SKY_DAY.ground, day);
    for (const m of dayNight) m.mat.color.copy(m.night).lerp(m.day, day);
    for (const c of cabinLights) c.light.intensity = c.base * night;

    for (const h of props.hints) if (h.group.visible) h.paper.position.y = 1.1 + Math.sin(t * 2 + h.index) * 0.12;
    props.crate.update(dt);
    if (props.crate.statue.visible) {
      props.crate.glow.intensity = 16 + Math.sin(t * 1.7) * 4;
      tmpCol.setHex(0xd9ecff).lerp(RED_GLOW, horrorBlend);
      props.crate.glow.color.copy(tmpCol);
    }
    if (props.pickaxe.group.visible) props.pickaxe.light.intensity = 2.5 + Math.sin(t * 3) * 1.2;
    props.redEyes.update(dt, t);
    for (const l of lanterns) {
      const noise = Math.sin(t * 17 + l.seed) * Math.sin(t * 5.3 + l.seed * 2) * 0.5 + 0.5;
      const flicker = horrorBlend > 0.05 ? (noise > 0.75 ? 0.15 : 1) : 1 - noise * 0.06;
      l.light.intensity = l.base * flicker * THREE.MathUtils.lerp(1, 0.7, horrorBlend) * night;
      l.lampMat.color.setHex(flicker < 0.5 || day > 0.5 ? 0x5a4630 : 0xffc582);
    }
  }

  const R = 26;
  const doorZ = CABIN.z + CABIN.d / 2;
  return {
    group,
    bounds: { minX: -R, maxX: R, minZ: -R, maxZ: R },
    obstacles: [
      { minX: CABIN.x - CABIN.w / 2 - 0.5, maxX: CABIN.x + CABIN.w / 2 + 0.5, minZ: CABIN.z - CABIN.d / 2 - 0.5, maxZ: doorZ + 0.3 },
      props.crate.obstacle,
    ],
    setup,
    update,
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
