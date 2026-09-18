import { CANVAS_W, CANVAS_H } from '../game/castle.js';

/**
 * 게임 화면 오버레이: 노미요가 자리에 앉아 게임에 접속하면 3D 방 대신 이 화면이 보인다.
 * 가운데 캔버스에 2D 미니게임(src/game/castle.js)이 그려지고, 채팅창(#chatLog)은 오른쪽에 겹쳐 보인다.
 */
export function createGameScreen() {
  const el = document.createElement('div');
  el.id = 'gameScreen';
  el.innerHTML = `
    <div class="gsTop"><span class="gsLive">● LIVE</span><span class="gsTitle">미스터리 고성 탈출</span><span class="gsSub">노미요의 방송</span></div>
    <div class="gsStage"><canvas class="gsCanvas" width="${CANVAS_W}" height="${CANVAS_H}"></canvas></div>
    <div class="gsBottom"><span class="gsHint"><kbd>방향키</kbd>이동 <kbd>E</kbd>조사·대화 <kbd>Esc</kbd>접속 종료</span><span class="gsStatus">접속 중...</span></div>
  `;
  document.body.appendChild(el);
  const canvas = el.querySelector('.gsCanvas');
  const stage = el.querySelector('.gsStage');

  // 캔버스를 화면 전체(무대 영역)에 최대한 크게 맞춤
  function fit() {
    const r = stage.getBoundingClientRect();
    const scale = Math.max(1, Math.min(r.width / CANVAS_W, r.height / CANVAS_H));
    canvas.style.width = `${CANVAS_W * scale}px`;
    canvas.style.height = `${CANVAS_H * scale}px`;
  }
  window.addEventListener('resize', fit);

  return {
    el,
    canvas,
    setVisible(on) {
      el.classList.toggle('on', on);
      document.body.classList.toggle('ingame', on); // 게임 중엔 HUD 숨기고 채팅을 위로
      if (on) fit();
    },
    setStatus(text) {
      el.querySelector('.gsStatus').textContent = text;
    },
  };
}
