/**
 * 나침반: 숲에 있을 때 화면 왼쪽 위에 표시된다. 카메라가 보는 방향이 위쪽이고, 동서남북 글자판(rose)이 그에 맞춰 돈다.
 * 북쪽 = 월드 -z (오두막 뒤, 석탑과 헛간 방향). 남쪽 = +z (파닥 동상).
 * #notice 등과 같은 DOM/CSS 관례.
 */
export function createCompass() {
  const el = document.createElement('div');
  el.id = 'compass';
  el.innerHTML = `<div class="needle"></div><div class="rose"><span class="n">N</span><span class="e">E</span><span class="s">S</span><span class="w">W</span></div>`;
  document.body.appendChild(el);
  const rose = el.querySelector('.rose');
  let lastDeg = null;

  /** forward: 카메라가 보는 방향 (xz 평면 단위 벡터) */
  function update(forward) {
    const a = Math.atan2(forward.x, forward.z); // +z 를 0 으로 한 방위각
    const deg = ((a - Math.PI) * 180) / Math.PI; // 북쪽(-z)을 볼 때 0
    if (lastDeg !== null && Math.abs(deg - lastDeg) < 0.2) return;
    lastDeg = deg;
    rose.style.transform = `rotate(${deg.toFixed(1)}deg)`;
  }
  function setVisible(on) {
    el.classList.toggle('on', on);
  }
  return { el, update, setVisible };
}
