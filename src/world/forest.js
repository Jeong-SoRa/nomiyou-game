import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { toon, mesh, sphere, outline, rand } from '../helpers.js';

/** 밤 숲: 달빛 + 안개 + 어두운 나무들 + 따뜻한 가로등, 그리고 노미요의 오두막(문으로 방과 연결) */
export function createForest() {
  const group = new THREE.Group();
  group.name = 'forest';

  const NIGHT_BG = new THREE.Color(0x0b0e18);
  const HORROR_BG = new THREE.Color(0x05040a);
  const LINE = 0x2a211d;

  const ground = mesh(
    new THREE.CircleGeometry(60, 64),
    new THREE.MeshStandardMaterial({ color: 0x1b221d, roughness: 1 })
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
  const mGlow = new THREE.MeshBasicMaterial({ color: 0xffd58a });
  for (const s of [-1, 1]) {
    const win = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1.2), mGlow);
    win.position.set(s * 2.8, 3.0, frontZ + 0.01);
    const sill = mesh(new THREE.BoxGeometry(1.7, 0.12, 0.3), toon(0xf6ecd8));
    sill.position.set(s * 2.8, 2.35, frontZ + 0.12);
    const winLight = new THREE.PointLight(0xffc27a, 5, 7, 2);
    winLight.position.set(s * 2.8, 3.0, frontZ + 0.8);
    cabin.add(win, sill, winLight);
  }
  const porchLight = new THREE.PointLight(0xffb070, 10, 10, 2);
  porchLight.position.set(0, 4.5, frontZ + 1.0);
  const porchLamp = new THREE.Mesh(new THREE.SphereGeometry(0.18, 14, 10), mGlow);
  porchLamp.position.set(0, 4.7, frontZ + 0.3);
  cabin.add(porchLight, porchLamp);
  const step = mesh(new THREE.BoxGeometry(3.2, 0.25, 1.2), toon(0x8f6b4a));
  step.position.set(0, 0.125, frontZ + 0.6);
  cabin.add(step);

  // ---------- 나무 ----------
  const mTrunk = toon(0x2a1f18);
  const mLeaf = toon(0x13261a);
  let placed = 0;
  while (placed < 34) {
    const a = rand(0, Math.PI * 2);
    const r = rand(11, 28);
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    if (Math.abs(x - CABIN.x) < 8 && Math.abs(z - CABIN.z) < 7) continue; // 오두막 자리 비움
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

  const hemi = new THREE.HemisphereLight(0x3d4f78, 0x17130f, 0.55);
  const moon = new THREE.DirectionalLight(0x9fb6ea, 1.1);
  moon.position.set(-12, 18, -8);
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

  function update(dt, t, horrorBlend) {
    scene.background.copy(NIGHT_BG).lerp(HORROR_BG, horrorBlend);
    scene.fog.color.copy(scene.background);
    scene.fog.density = THREE.MathUtils.lerp(0.04, 0.075, horrorBlend);
    moon.intensity = THREE.MathUtils.lerp(1.1, 0.35, horrorBlend);
    hemi.intensity = THREE.MathUtils.lerp(0.55, 0.2, horrorBlend);
    for (const l of lanterns) {
      const noise = Math.sin(t * 17 + l.seed) * Math.sin(t * 5.3 + l.seed * 2) * 0.5 + 0.5;
      const flicker = horrorBlend > 0.05 ? (noise > 0.75 ? 0.15 : 1) : 1 - noise * 0.06;
      l.light.intensity = l.base * flicker * THREE.MathUtils.lerp(1, 0.7, horrorBlend);
      l.lampMat.color.setHex(flicker < 0.5 ? 0x5a4630 : 0xffc582);
    }
  }

  const R = 26;
  const doorZ = CABIN.z + CABIN.d / 2;
  return {
    group,
    bounds: { minX: -R, maxX: R, minZ: -R, maxZ: R },
    obstacles: [
      { minX: CABIN.x - CABIN.w / 2 - 0.5, maxX: CABIN.x + CABIN.w / 2 + 0.5, minZ: CABIN.z - CABIN.d / 2 - 0.5, maxZ: doorZ + 0.3 },
    ],
    setup,
    update,
    // 오두막 문 앞에서 오두막을 바라보며 시작 (카메라가 뒤에서 오두막을 비춤)
    foxSpawn: { position: new THREE.Vector3(0, 0, doorZ + 3.4), heading: Math.PI },
    chickSpawns: [new THREE.Vector3(4, 0, 0), new THREE.Vector3(-4, 0, 1), new THREE.Vector3(1, 0, 4)],
    cameraStart: new THREE.Vector3(0, 5, 9),
    door: { position: new THREE.Vector3(CABIN.x, 0, doorZ + 0.9), radius: 1.5, target: 'house' },
    doorSpawn: { position: new THREE.Vector3(0, 0, doorZ + 3.4), heading: Math.PI },
    seat: null,
  };
}
