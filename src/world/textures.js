import * as THREE from 'three';

/** 캔버스 기반 텍스처 생성 헬퍼 (방 소품용) */

function makeCanvas(w, h) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  return [canvas, canvas.getContext('2d')];
}

function finish(canvas, { repeat } = {}) {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  if (repeat) {
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(repeat[0], repeat[1]);
  }
  return tex;
}

/** 나무 판자 (가로 결) */
export function woodTexture({ base = '#c98f5a', dark = '#a9713f', light = '#d9a36c', planks = 6, repeat } = {}) {
  const [c, ctx] = makeCanvas(512, 512);
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, 512, 512);
  const ph = 512 / planks;
  for (let i = 0; i < planks; i++) {
    const y = i * ph;
    // 판자별 미세한 색 차이
    ctx.fillStyle = i % 2 ? base : light;
    ctx.globalAlpha = 0.35;
    ctx.fillRect(0, y, 512, ph);
    ctx.globalAlpha = 1;
    // 결
    ctx.strokeStyle = dark;
    ctx.globalAlpha = 0.25;
    ctx.lineWidth = 2;
    for (let k = 0; k < 5; k++) {
      const yy = y + 8 + Math.random() * (ph - 16);
      ctx.beginPath();
      ctx.moveTo(0, yy);
      ctx.bezierCurveTo(150, yy + (Math.random() - 0.5) * 8, 350, yy + (Math.random() - 0.5) * 8, 512, yy);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    // 판자 사이 이음선
    ctx.fillStyle = dark;
    ctx.fillRect(0, y + ph - 3, 512, 3);
    const seam = Math.random() * 512;
    ctx.fillRect(seam, y, 3, ph);
  }
  return finish(c, { repeat });
}

/** 여우(노미요) 얼굴 아이콘 */
export function drawFoxFace(ctx, cx, cy, r) {
  const orange = '#f58a2f';
  const dark = '#2a211d';
  const cream = '#fff6e8';
  ctx.lineWidth = r * 0.08;
  ctx.strokeStyle = dark;
  // 귀
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(cx + s * r * 0.35, cy - r * 0.55);
    ctx.lineTo(cx + s * r * 0.95, cy - r * 1.15);
    ctx.lineTo(cx + s * r * 1.0, cy - r * 0.2);
    ctx.closePath();
    ctx.fillStyle = orange;
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx + s * r * 0.62, cy - r * 0.83);
    ctx.lineTo(cx + s * r * 0.95, cy - r * 1.15);
    ctx.lineTo(cx + s * r * 1.0, cy - r * 0.62);
    ctx.closePath();
    ctx.fillStyle = dark;
    ctx.fill();
  }
  // 얼굴
  ctx.beginPath();
  ctx.ellipse(cx, cy, r * 1.05, r * 0.9, 0, 0, Math.PI * 2);
  ctx.fillStyle = orange;
  ctx.fill();
  ctx.stroke();
  // 주둥이
  ctx.beginPath();
  ctx.ellipse(cx, cy + r * 0.35, r * 0.75, r * 0.42, 0, 0, Math.PI * 2);
  ctx.fillStyle = cream;
  ctx.fill();
  // 눈, 코
  ctx.fillStyle = dark;
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(cx + s * r * 0.35, cy - r * 0.05, r * 0.08, r * 0.11, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.beginPath();
  ctx.ellipse(cx, cy + r * 0.22, r * 0.12, r * 0.09, 0, 0, Math.PI * 2);
  ctx.fill();
  // 볼
  ctx.fillStyle = 'rgba(249,168,160,0.8)';
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(cx + s * r * 0.62, cy + r * 0.22, r * 0.14, r * 0.09, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function foxIconTexture(bg = null) {
  const [c, ctx] = makeCanvas(256, 256);
  if (bg) {
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, 256, 256);
  }
  drawFoxFace(ctx, 128, 140, 70);
  return finish(c);
}

/** 메모지: 여러 줄 텍스트 */
export function noteTexture(lines, { bg = '#fffdf7', color = '#2a211d', font = 'bold 54px "Malgun Gothic", sans-serif' } = {}) {
  const [c, ctx] = makeCanvas(256, 256);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 256, 256);
  ctx.fillStyle = color;
  ctx.font = font;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const lh = 62;
  const y0 = 128 - ((lines.length - 1) * lh) / 2;
  lines.forEach((t, i) => ctx.fillText(t, 128, y0 + i * lh));
  return finish(c);
}

/** 발자국 (주황) */
export function pawTexture() {
  const [c, ctx] = makeCanvas(128, 128);
  ctx.fillStyle = '#f58a2f';
  ctx.beginPath();
  ctx.ellipse(64, 80, 26, 22, 0, 0, Math.PI * 2);
  ctx.fill();
  const toes = [
    [34, 44, 11],
    [56, 30, 12],
    [80, 32, 12],
    [98, 50, 10],
  ];
  for (const [x, y, r] of toes) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  return finish(c);
}

/** 벽시계 문자판 (바늘은 3D로 따로) */
export function clockFaceTexture() {
  const [c, ctx] = makeCanvas(256, 256);
  ctx.fillStyle = '#fffdf7';
  ctx.beginPath();
  ctx.arc(128, 128, 120, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#2a211d';
  ctx.lineWidth = 6;
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const long = i % 3 === 0;
    ctx.beginPath();
    ctx.moveTo(128 + Math.cos(a) * (long ? 88 : 100), 128 + Math.sin(a) * (long ? 88 : 100));
    ctx.lineTo(128 + Math.cos(a) * 110, 128 + Math.sin(a) * 110);
    ctx.stroke();
  }
  return finish(c);
}

/** CHAT 말풍선 간판 */
export function chatSignTexture() {
  const [c, ctx] = makeCanvas(512, 160);
  ctx.fillStyle = '#fffdf7';
  ctx.strokeStyle = '#2a211d';
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.roundRect(8, 8, 496, 144, 72);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#2a211d';
  ctx.font = 'bold 76px "Malgun Gothic", Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('CHAT', 210, 84);
  // 말풍선 아이콘
  ctx.beginPath();
  ctx.roundRect(340, 42, 110, 74, 30);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(360, 112);
  ctx.lineTo(352, 136);
  ctx.lineTo(384, 114);
  ctx.closePath();
  ctx.fillStyle = '#fffdf7';
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#2a211d';
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.arc(372 + i * 23, 79, 6, 0, Math.PI * 2);
    ctx.fill();
  }
  return finish(c);
}

/** 꺼진 모니터 화면 (미세한 반사) / 공포 모드 노이즈 화면 */
export function screenTexture(mode = 'off') {
  const [c, ctx] = makeCanvas(512, 320);
  if (mode === 'off') {
    const g = ctx.createLinearGradient(0, 0, 512, 320);
    g.addColorStop(0, '#15161c');
    g.addColorStop(1, '#050507');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 512, 320);
  } else {
    const img = ctx.createImageData(512, 320);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = Math.random() * 90;
      img.data[i] = v + 40;
      img.data[i + 1] = v * 0.4;
      img.data[i + 2] = v * 0.4;
      img.data[i + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
  }
  return finish(c);
}
