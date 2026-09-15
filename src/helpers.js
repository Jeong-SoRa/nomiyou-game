import * as THREE from 'three';

let gradientTex = null;

/** 부드러운 셀 셰이딩용 램프 텍스처 (선형 보간이라 계단이 아닌 매끈한 음영) */
function gradientMap() {
  if (!gradientTex) {
    const data = new Uint8Array([70, 120, 175, 225, 255]);
    gradientTex = new THREE.DataTexture(data, data.length, 1, THREE.RedFormat);
    gradientTex.minFilter = THREE.LinearFilter;
    gradientTex.magFilter = THREE.LinearFilter;
    gradientTex.needsUpdate = true;
  }
  return gradientTex;
}

export function toon(color, extra = {}) {
  return new THREE.MeshToonMaterial({ color, gradientMap: gradientMap(), ...extra });
}

export function mesh(geometry, material) {
  const m = new THREE.Mesh(geometry, material);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

export function sphere(radius, material, sx = 1, sy = 1, sz = 1) {
  const m = mesh(new THREE.SphereGeometry(radius, 48, 32), material);
  m.scale.set(sx, sy, sz);
  return m;
}

export function capsule(radius, length, material) {
  return mesh(new THREE.CapsuleGeometry(radius, length, 8, 24), material);
}

/** 웃는 눈(∩ 모양 아치) */
export function eyeArc(radius, material, tube = 0.035) {
  return mesh(new THREE.TorusGeometry(radius, tube, 8, 18, Math.PI), material);
}

/**
 * 두 색이 지그재그 경계로 나뉘는 텍스처. v=1(위/끝) 쪽이 tip 색.
 * tipStart: 끝 색이 시작되는 비율(0~1), teeth: 톱니 수, amp: 톱니 높이(비율)
 */
export function zigzagTexture({ base, tip, tipStart = 0.65, teeth = 6, amp = 0.06 }) {
  const W = 512;
  const H = 512;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#' + new THREE.Color(base).getHexString();
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#' + new THREE.Color(tip).getHexString();
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(W, 0);
  const yMid = H * (1 - tipStart);
  for (let k = teeth * 2; k >= 0; k--) {
    const u = k / (teeth * 2);
    const y = yMid + (k % 2 === 0 ? -1 : 1) * amp * H;
    ctx.lineTo(u * W, y);
  }
  ctx.closePath();
  ctx.fill();
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.anisotropy = 4;
  return tex;
}

const outlineMaterials = new Map();
function outlineMaterial(color) {
  if (!outlineMaterials.has(color)) {
    outlineMaterials.set(color, new THREE.MeshBasicMaterial({ color, side: THREE.BackSide }));
  }
  return outlineMaterials.get(color);
}

/**
 * 만화풍 외곽선: 같은 지오메트리를 뒷면만 그리며 살짝 키워 겹침.
 * thickness 는 대략적인 월드 단위 두께.
 */
export function outline(target, thickness = 0.03, color = 0x3a2418) {
  const geo = target.geometry;
  if (!geo.boundingSphere) geo.computeBoundingSphere();
  const r = geo.boundingSphere.radius || 1;
  const o = new THREE.Mesh(geo, outlineMaterial(color));
  o.scale.setScalar(1 + thickness / r);
  o.castShadow = false;
  o.receiveShadow = false;
  target.add(o);
  return o;
}

/** 각도 보간 (래핑 처리) */
export function lerpAngle(a, b, t) {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}

/** 주기적으로 눈을 깜빡이게 하는 헬퍼 (eyes: 스케일을 조절할 Object3D 배열) */
export class Blinker {
  constructor(eyes) {
    this.eyes = eyes;
    this.next = 2 + Math.random() * 3;
    this.closed = 0;
  }
  update(dt) {
    this.next -= dt;
    if (this.next <= 0) {
      this.next = 2.5 + Math.random() * 3.5;
      this.closed = 0.14;
    }
    let s = 1;
    if (this.closed > 0) {
      this.closed -= dt;
      s = 0.12;
    }
    for (const e of this.eyes) e.scale.y = s;
  }
}

export function rand(min, max) {
  return min + Math.random() * (max - min);
}
