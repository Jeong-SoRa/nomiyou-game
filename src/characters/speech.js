import * as THREE from 'three';
import { speechBubbleTexture } from '../world/textures.js';

/**
 * 머리 위 말풍선 (노미요/파닥이 공용).
 * parent 의 로컬 y 위치에 스프라이트를 붙이고, 텍스처 픽셀 크기에 맞춰 스프라이트 비율을 정한다.
 * unitsPerPixel: 픽셀 → 로컬 단위 배율 (parent 가 scale 되어 있으면 그만큼 키워서 넘김)
 */
export function createSpeechBubble(parent, y, { unitsPerPixel = 1 / 200 } = {}) {
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, opacity: 0, depthTest: false }));
  sprite.position.set(0, y, 0);
  sprite.visible = false;
  sprite.renderOrder = 10;
  parent.add(sprite);
  let timer = 0;
  let duration = 1;

  function say(text, dur = 1.8, opts = {}) {
    if (sprite.material.map) sprite.material.map.dispose();
    const tex = speechBubbleTexture(text, opts);
    const [w, h] = tex.userData.size;
    sprite.material.map = tex;
    sprite.material.needsUpdate = true;
    // 말꼬리가 머리 위 y 에 오도록 중심을 절반 높이만큼 올림
    sprite.scale.set(w * unitsPerPixel, h * unitsPerPixel, 1);
    sprite.center.set(0.5, 0);
    sprite.visible = true;
    timer = dur;
    duration = dur;
  }

  function update(dt) {
    if (timer <= 0) return;
    timer -= dt;
    const fadeOut = Math.min(duration, 0.3);
    sprite.material.opacity = timer > fadeOut ? Math.min(1, (duration - timer) / 0.2) : Math.max(0, timer / fadeOut);
    if (timer <= 0) sprite.visible = false;
  }

  return { sprite, say, update, isTalking: () => timer > 0 };
}
