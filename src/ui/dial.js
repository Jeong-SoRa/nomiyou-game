/**
 * 6자리 비밀번호 다이얼 (숲의 파닥 동상 배 아래 / 고성 지하 3층 남쪽 문 — 같은 UI를 공유한다).
 * 방향키 ←→ 자리 이동, ↑↓ 숫자 돌리기, E/Enter 확인, Esc 취소. 클릭으로도 자리 선택/돌리기.
 * #notice 등과 같은 DOM/CSS 관례. 열려 있는 동안 main.js 는 다른 키 입력을 무시한다 (isOpen).
 */
const DIGITS = 6;

export function createDial() {
  const el = document.createElement('div');
  el.id = 'dial';
  el.innerHTML = `<div class="box"><div class="title"></div><div class="digits"></div><div class="hint">←→ 자리 · ↑↓ 숫자 · <kbd>E</kbd> 확인 · <kbd>Esc</kbd> 취소</div></div>`;
  document.body.appendChild(el);
  const titleEl = el.querySelector('.title');
  const digitsEl = el.querySelector('.digits');
  const cells = [];
  for (let i = 0; i < DIGITS; i++) {
    const c = document.createElement('div');
    c.className = 'cell';
    c.innerHTML = `<div class="arrow">▲</div><div class="num">0</div><div class="arrow">▼</div>`;
    c.addEventListener('click', (e) => {
      if (!open) return;
      cursor = i;
      const r = c.getBoundingClientRect();
      spin(e.clientY < r.top + r.height / 2 ? 1 : -1);
    });
    digitsEl.appendChild(c);
    cells.push(c);
  }

  let open = false;
  let values = new Array(DIGITS).fill(0);
  let cursor = 0;
  let handlers = null; // { onSubmit(code), onCancel() }
  let onTick = null; // 숫자를 돌릴 때 효과음 등

  function draw() {
    cells.forEach((c, i) => {
      c.querySelector('.num').textContent = String(values[i]);
      c.classList.toggle('cur', i === cursor);
    });
  }
  function spin(dir) {
    values[cursor] = (values[cursor] + dir + 10) % 10;
    if (onTick) onTick();
    draw();
  }
  function show({ title = '비밀번호를 입력하세요', onSubmit, onCancel, tick } = {}) {
    open = true;
    values = new Array(DIGITS).fill(0);
    cursor = 0;
    handlers = { onSubmit, onCancel };
    onTick = tick ?? null;
    titleEl.textContent = title;
    el.classList.add('on');
    draw();
  }
  function close() {
    open = false;
    el.classList.remove('on');
    handlers = null;
  }
  function code() {
    return values.join('');
  }
  /** main.js 의 keydown 에서 호출. 처리했으면 true */
  function keydown(codeName) {
    if (!open) return false;
    if (codeName === 'ArrowLeft') cursor = (cursor + DIGITS - 1) % DIGITS;
    else if (codeName === 'ArrowRight') cursor = (cursor + 1) % DIGITS;
    else if (codeName === 'ArrowUp') spin(1);
    else if (codeName === 'ArrowDown') spin(-1);
    else if (/^(Digit|Numpad)\d$/.test(codeName)) {
      values[cursor] = Number(codeName.slice(-1));
      cursor = Math.min(DIGITS - 1, cursor + 1);
      if (onTick) onTick();
    } else if (codeName === 'KeyE' || codeName === 'Enter') {
      const h = handlers;
      const c = code();
      close();
      if (h?.onSubmit) h.onSubmit(c);
      return true;
    } else if (codeName === 'Escape') {
      const h = handlers;
      close();
      if (h?.onCancel) h.onCancel();
      return true;
    }
    draw();
    return true;
  }

  return { el, show, close, keydown, isOpen: () => open };
}
