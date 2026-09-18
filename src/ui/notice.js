/** 화면 위쪽 짧은 알림 (잠들기 전 안내 등). 몇 초 뒤 사라짐. #hud 와 같은 DOM/CSS 관례 */
export function createNotice() {
  const el = document.createElement('div');
  el.id = 'notice';
  document.body.appendChild(el);
  let timer = 0;
  return {
    el,
    show(text, seconds = 3.5) {
      el.textContent = text;
      el.classList.add('on');
      clearTimeout(timer);
      timer = setTimeout(() => el.classList.remove('on'), seconds * 1000);
    },
  };
}
