import * as THREE from 'three';

/**
 * 월드 그룹의 이름/userData 규칙으로부터 게임 로직용 정보를 뽑아냄.
 * 에디터에서 물건을 옮겨도 충돌 영역·문·의자가 따라오도록 코드가 아닌 씬에서 읽는다.
 *
 * - 이름이 "col:" 로 시작하는 오브젝트: 바닥 충돌 영역 (바운딩 박스의 XZ)
 * - 이름 "door" + userData { target, trigger:[x,y,z], spawn:[x,y,z], heading, camera? }
 *     trigger/spawn 은 문 로컬 좌표 오프셋
 * - 이름 "chair" + userData { seatY, approach:[x,y,z], facing }
 */
const box = new THREE.Box3();
const v = new THREE.Vector3();

export function deriveMeta(group) {
  group.updateMatrixWorld(true);

  const obstacles = [];
  let door = null;
  let doorSpawn = null;
  let seat = null;

  group.traverse((o) => {
    if (o.name.startsWith('col:')) {
      box.setFromObject(o);
      obstacles.push({ minX: box.min.x, maxX: box.max.x, minZ: box.min.z, maxZ: box.max.z });
    }
    if (o.name === 'door' && o.userData.target) {
      const u = o.userData;
      const trigger = o.localToWorld(v.set(...u.trigger)).clone();
      const spawn = o.localToWorld(v.set(...u.spawn)).clone();
      trigger.y = 0;
      spawn.y = 0;
      door = { position: trigger, radius: u.radius ?? 1.5, target: u.target };
      doorSpawn = { position: spawn, heading: u.heading ?? 0, camera: u.camera };
    }
    if (o.name === 'chair' && o.userData.seatY !== undefined) {
      const u = o.userData;
      const pos = o.getWorldPosition(new THREE.Vector3());
      const approach = o.localToWorld(v.set(...u.approach)).clone();
      approach.y = 0;
      const q = o.getWorldQuaternion(new THREE.Quaternion());
      const facing = new THREE.Euler().setFromQuaternion(q).y + (u.facing ?? 0);
      seat = {
        position: new THREE.Vector3(pos.x, pos.y + u.seatY, pos.z),
        heading: facing,
        approach,
        radius: u.radius ?? 2.6,
      };
    }
  });

  return { obstacles, door, doorSpawn, seat };
}
