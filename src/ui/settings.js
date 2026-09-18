/** 설정창: 음량 슬라이더(전체/배경음/효과음) + 음소거. O 키 또는 톱니 버튼으로 열고 닫음 */
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
      <div class="hint">배경음 파일은 public/audio/ 에 bgm_calm.mp3 · bgm_eerie.mp3 · bgm_stream.mp3 로 넣으면 자동 재생됩니다. 지금 나는 소리는 전부 코드로 만든 것입니다.</div>
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
