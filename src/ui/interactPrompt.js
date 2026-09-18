import * as THREE from 'three';

/**
 * 상호작용 안내 (예: 데스크 근처의 "E · 게임 접속").
 * 월드 좌표를 화면에 투영해 DOM 라벨을 띄운다. #hud/#mode 와 같은 DOM/CSS 관례.
 */
export function createInteractPrompt() {
  const el = document.createElement('div');
  el.id = 'prompt';
  el.innerHTML = '<kbd>E</kbd><span></span>';
  document.body.appendChild(el);
  const labelEl = el.querySelector('span');
  const tmp = new THREE.Vector3();

  function show(worldPos, label, camera) {
    if (labelEl.textContent !== label) labelEl.textContent = label;
    tmp.copy(worldPos).project(camera);
    const behind = tmp.z > 1;
    const x = (tmp.x * 0.5 + 0.5) * window.innerWidth;
    const y = (-tmp.y * 0.5 + 0.5) * window.innerHeight;
    el.style.transform = `translate(-50%, -50%) translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
    el.classList.toggle('on', !behind);
  }

  function hide() {
    el.classList.remove('on');
  }

  return { el, show, hide };
}
