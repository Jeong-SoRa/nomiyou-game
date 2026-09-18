import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { toon } from '../helpers.js';

/**
 * three.js 공식 에디터(https://threejs.org/editor)와 주고받는 씬 파일.
 * - serializeWorld: 현재 월드 그룹을 에디터가 읽는 JSON(Object3D.toJSON 형식)으로 만듦
 * - downloadWorld: 그 JSON을 파일로 저장 (에디터에서 File > Import)
 * - parseWorld: 에디터에서 Export 한 JSON을 다시 그룹으로 복원
 * - fetchLayout: public/layouts/<name>.json 이 있으면 불러옴
 */

export function serializeWorld(group) {
  // RoundedBoxGeometry 는 BoxGeometry 의 parameters 를 물려받아 그대로 저장하면
  // 단순 상자로 복원되므로, 원시 버퍼로 저장되게 parameters 를 떼어냄
  group.traverse((o) => {
    if (o.geometry instanceof RoundedBoxGeometry) {
      o.geometry.parameters = undefined;
      o.geometry.type = 'BufferGeometry';
    }
  });
  return group.toJSON();
}

export function downloadWorld(group, name) {
  const json = serializeWorld(group);
  const text = JSON.stringify(json);
  const blob = new Blob([text], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${name}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  console.log(`[scenefile] ${name}.json 내보냄 (${(text.length / 1024 / 1024).toFixed(1)} MB)`);
}

const CORE_LIGHTS = new Set(['HemisphereLight', 'DirectionalLight', 'PointLight', 'SpotLight', 'AmbientLight']);

export async function parseWorld(json) {
  const loader = new THREE.ObjectLoader();
  const root = await loader.parseAsync(json);
  // 에디터에서 "Export Scene" 으로 저장하면 Scene 이 루트가 되므로 안쪽 그룹을 꺼냄
  const group = root.isScene ? root.children.find((c) => c.isGroup) ?? root : root;
  group.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = o.userData.noShadow ? false : o.castShadow;
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      for (const m of mats) {
        // 셀 셰이딩 램프가 빠졌으면 다시 붙임
        if (m?.isMeshToonMaterial && !m.gradientMap) m.gradientMap = toon(0xffffff).gradientMap;
      }
    }
    if (CORE_LIGHTS.has(o.type) && o.shadow) {
      o.shadow.mapSize.set(2048, 2048);
    }
  });
  return group;
}

export async function fetchLayout(name) {
  try {
    const res = await fetch(`/layouts/${name}.json`, { cache: 'no-store' });
    if (!res.ok) return null;
    const json = await res.json();
    return await parseWorld(json);
  } catch (e) {
    console.warn(`[scenefile] layouts/${name}.json 불러오기 실패`, e);
    return null;
  }
}
