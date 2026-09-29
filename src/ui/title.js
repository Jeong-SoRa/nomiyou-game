/**
 * 게임 시작 화면: 방 장면 위에 반투명 레이어를 덮고 커다란 타이틀과 메뉴(시작하기 / 이어하기)를 띄운다.
 * ↑↓ 또는 숫자키로 고르고 E/Enter 로 확정. 클릭도 된다. 이어하기는 저장이 있을 때만 고를 수 있다.
 * #notice 등과 같은 DOM/CSS 관례. 열려 있는 동안 main.js 는 다른 키 입력을 무시한다 (isOpen).
 */
export function createTitle() {
  const el = document.createElement('div');
  el.id = 'title';
  el.innerHTML = `<div class="ttl">노미요<span class="small">의</span> 숲</div><div class="menu"></div><div class="hint">↑↓ 선택 · <kbd>E</kbd> / <kbd>Enter</kbd> 확정</div>`;
  document.body.appendChild(el);
  const menuEl = el.querySelector('.menu');

  let open = false;
  let items = []; // [{ id, label, enabled }]
  let cursor = 0;
  let onPick = null;
  let onMove = null;

  let itemEls = [];
  /** 항목 DOM 을 만든다 (열 때 한 번). 커서 이동은 refresh() 로 클래스만 바꾼다 — 클릭 도중 요소가 바뀌지 않게 */
  function draw() {
    menuEl.innerHTML = '';
    itemEls = items.map((it, i) => {
      const b = document.createElement('div');
      b.className = 'item' + (it.enabled ? '' : ' off');
      b.innerHTML = `<kbd>${i + 1}</kbd><span>${it.label}</span>`;
      b.addEventListener('mouseenter', () => {
        if (!it.enabled || cursor === i) return;
        cursor = i;
        if (onMove) onMove();
        refresh();
      });
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        if (it.enabled) pick(i);
      });
      menuEl.appendChild(b);
      return b;
    });
    refresh();
  }
  function refresh() {
    itemEls.forEach((b, i) => b.classList.toggle('cur', i === cursor));
  }
  function pick(i) {
    if (!items[i]?.enabled) return;
    const fn = onPick;
    close();
    if (fn) fn(items[i].id);
  }
  /** show({ canContinue, onPick(id), onMove }) — id: 'new' | 'continue' */
  function show({ canContinue = false, onPick: cb, onMove: mv } = {}) {
    open = true;
    items = [
      { id: 'new', label: '시작하기', enabled: true },
      { id: 'continue', label: '이어하기', enabled: canContinue },
    ];
    cursor = canContinue ? 1 : 0; // 저장이 있으면 이어하기에 커서
    onPick = cb;
    onMove = mv ?? null;
    el.classList.add('on');
    draw();
  }
  function close() {
    open = false;
    el.classList.remove('on');
    onPick = null;
  }
  /** main.js 의 keydown 에서 호출. 처리했으면 true */
  function keydown(code) {
    if (!open) return false;
    const step = (d) => {
      for (let k = 0; k < items.length; k++) {
        cursor = (cursor + d + items.length) % items.length;
        if (items[cursor].enabled) break;
      }
      if (onMove) onMove();
    };
    if (code === 'ArrowUp' || code === 'KeyW') step(-1);
    else if (code === 'ArrowDown' || code === 'KeyS') step(1);
    else if (/^(Digit|Numpad)\d$/.test(code)) {
      pick(Number(code.slice(-1)) - 1);
      return true;
    } else if (code === 'KeyE' || code === 'Enter' || code === 'Space') {
      pick(cursor);
      return true;
    } else return true; // 열려 있는 동안 다른 키는 삼킨다
    refresh();
    return true;
  }

  return { el, show, close, keydown, isOpen: () => open };
}
