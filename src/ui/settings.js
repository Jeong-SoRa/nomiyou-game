/** 설정창: 음량 슬라이더(전체/배경음/효과음) + 음소거 + 아래쪽 단축키 안내. O 키 또는 톱니 버튼으로 열고 닫음 */
const LABELS = { master: '전체 음량', bgm: '배경음', sfx: '효과음' };

export function createSettings(audio) {
  const btn = document.createElement('button');
  btn.id = 'settingsBtn';
  btn.type = 'button';
  btn.title = '설정 (O)';
  btn.textContent = '⚙';
  document.body.appendChild(btn);

  const el = document.createElement('div');
  el.id = 'settings';
  const rows = ['master', 'bgm', 'sfx']
    .map((k) => {
      const v = Math.round(audio.getVolume(k) * 100);
      return `<label class="row"><span>${LABELS[k]}</span><input type="range" min="0" max="100" data-kind="${k}" value="${v}"><b class="val">${v}</b></label>`;
    })
    .join('');
  el.innerHTML = `
    <div class="box">
      <div class="title">설정 <span class="close">✕</span></div>
      ${rows}
      <label class="row"><span>음소거</span><input type="checkbox" class="mute" ${audio.isMuted() ? 'checked' : ''}><b class="val"></b></label>
      <div class="keys">
        <div class="keysTitle">단축키</div>
        <div class="keyRow"><span><kbd>방향키</kbd> / <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd></span><span>이동</span></div>
        <div class="keyRow"><span><kbd>Shift</kbd></span><span>달리기</span></div>
        <div class="keyRow"><span><kbd>E</kbd></span><span>상호작용 · 대화 넘기기 · 선택 확정</span></div>
        <div class="keyRow"><span><kbd>Esc</kbd></span><span>방송 종료 · 취소</span></div>
        <div class="keyRow"><span><kbd>↑</kbd><kbd>↓</kbd> / <kbd>1</kbd>~<kbd>3</kbd></span><span>선택지 고르기</span></div>
        <div class="keyRow"><span><kbd>←</kbd><kbd>→</kbd> <kbd>↑</kbd><kbd>↓</kbd></span><span>다이얼 자리 이동 · 숫자 돌리기</span></div>
        <div class="keyRow"><span><kbd>O</kbd></span><span>설정 열기/닫기</span></div>
        <div class="keyRow"><span><kbd>M</kbd></span><span>음소거</span></div>
        <div class="keyRow"><span><kbd>R</kbd></span><span>엔딩 뒤 처음부터 · 게임 오버 뒤 다시 시작</span></div>
      </div>
    </div>`;
  document.body.appendChild(el);

  let open = false;
  function setOpen(on) {
    open = on;
    el.classList.toggle('on', on);
    if (!on && document.activeElement && document.activeElement.blur) document.activeElement.blur();
  }
  btn.addEventListener('click', () => setOpen(!open));
  el.querySelector('.close').addEventListener('click', () => setOpen(false));
  el.addEventListener('click', (e) => {
    if (e.target === el) setOpen(false);
  });
  for (const input of el.querySelectorAll('input[type=range]')) {
    input.addEventListener('input', () => {
      audio.unlock();
      audio.setVolume(input.dataset.kind, input.value / 100);
      input.nextElementSibling.textContent = input.value;
      if (input.dataset.kind === 'sfx') audio.sfx.ui();
    });
  }
  const muteBox = el.querySelector('.mute');
  muteBox.addEventListener('change', () => {
    if (audio.isMuted() !== muteBox.checked) audio.toggleMute();
  });

  return {
    el,
    isOpen: () => open,
    toggle: () => setOpen(!open),
    close: () => setOpen(false),
    syncMute: () => (muteBox.checked = audio.isMuted()),
  };
}
