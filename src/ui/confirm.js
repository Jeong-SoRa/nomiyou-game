/**
 * 시스템 메시지 선택창 ("관찰하시겠습니까?" 예/아니오 등). 방/숲(3D)에서 쓰는 HTML 오버레이.
 * ←→ 또는 숫자키로 고르고 E/Enter 로 확정. 클릭도 된다. 열려 있는 동안 main.js 는 다른 키 입력을 무시한다 (isOpen).
 * #notice 등과 같은 DOM/CSS 관례.
 */
export function createConfirm() {
  const el = document.createElement('div');
  el.id = 'confirm';
  el.innerHTML = `<div class="box"><div class="bar">SYSTEM</div><div class="msg"></div><div class="opts"></div></div>`;
  document.body.appendChild(el);
  const msgEl = el.querySelector('.msg');
  const optsEl = el.querySelector('.opts');

  let open = false;
  let options = [];
  let cursor = 0;
  let onPick = null;
  let onHover = null;

  let optEls = [];
  /** 항목 DOM 을 만든다 (열 때 한 번). 커서 이동은 refresh() 로 클래스만 바꾼다 — 클릭 도중 요소가 바뀌지 않게 */
  function draw() {
    optsEl.innerHTML = '';
    optEls = options.map((label, i) => {
      const b = document.createElement('div');
      b.className = 'opt';
      b.innerHTML = `<kbd>${i + 1}</kbd>${label}`;
      b.addEventListener('mouseenter', () => {
        if (cursor === i) return;
        cursor = i;
        if (onHover) onHover();
        refresh();
      });
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        pick(i);
      });
      optsEl.appendChild(b);
      return b;
    });
    refresh();
  }
  function refresh() {
    optEls.forEach((b, i) => b.classList.toggle('cur', i === cursor));
  }
  function pick(i) {
    const fn = onPick;
    close();
    if (fn) fn(i);
  }
  /** ask(message, options, onPick(index)) */
  function ask(message, opts, cb, { hover } = {}) {
    open = true;
    options = opts;
    cursor = 0;
    onPick = cb;
    onHover = hover ?? null;
    msgEl.textContent = message;
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
    if (code === 'ArrowLeft' || code === 'ArrowUp') cursor = (cursor + options.length - 1) % options.length;
    else if (code === 'ArrowRight' || code === 'ArrowDown') cursor = (cursor + 1) % options.length;
    else if (/^(Digit|Numpad)\d$/.test(code)) {
      const n = Number(code.slice(-1)) - 1;
      if (n >= 0 && n < options.length) pick(n);
      return true;
    } else if (code === 'KeyE' || code === 'Enter') {
      pick(cursor);
      return true;
    } else return true; // 열려 있는 동안 다른 키는 삼킨다
    refresh();
    return true;
  }

  return { el, ask, close, keydown, isOpen: () => open };
}
