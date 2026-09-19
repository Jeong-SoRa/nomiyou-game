/** 방송 채팅 로그 오버레이 (평범한 DOM/CSS, #hud/#mode 와 같은 관례) */

// 구독자 배지: 파닥이 모양 (둥근 흰 몸 + 대파 싹 + 점 눈 + 볼터치)
const CHICK_BADGE =
  '<svg class="chatBadge" viewBox="0 0 20 20" width="15" height="15" aria-label="구독자">' +
  '<path d="M10 7.5 L8 2.2 M10 7.5 L12.2 1.8 M10 7.5 L10 1.5" stroke="#5fa35a" stroke-width="2.2" stroke-linecap="round" fill="none"/>' +
  '<ellipse cx="10" cy="12.6" rx="7.2" ry="6.6" fill="#fffdf7" stroke="#2a211d" stroke-width="1.3"/>' +
  '<circle cx="7.4" cy="11.6" r="0.9" fill="#2a211d"/><circle cx="12.6" cy="11.6" r="0.9" fill="#2a211d"/>' +
  '<circle cx="5.6" cy="13.8" r="1.1" fill="#f7b3b3"/><circle cx="14.4" cy="13.8" r="1.1" fill="#f7b3b3"/>' +
  '<path d="M9.2 13.6 L10 14.5 L10.8 13.6 Z" fill="#f2a33a"/>' +
  '</svg>';
export function createChatLog({ maxMessages = 40 } = {}) {
  const el = document.createElement('div');
  el.id = 'chatLog';
  document.body.appendChild(el);

  function addMessage({ name, text, subscriber = false, isEvent = false, red = false }) {
    const row = document.createElement('div');
    row.className = 'chatMsg' + (isEvent ? ' chatEvent' : '') + (red ? ' chatRed' : ''); // red: 배드엔딩 "보내줘" 도배용 붉은 글씨
    // 이벤트 라인(구독 알림 등)은 본문에 이미 이름이 포함되므로 이름을 따로 표시하지 않음
    row.innerHTML = `${subscriber ? CHICK_BADGE : ''}${isEvent ? '' : `<b>${escapeHtml(name)}</b> `}${escapeHtml(text)}`;
    el.appendChild(row);
    while (el.children.length > maxMessages) el.removeChild(el.firstChild);
    el.scrollTop = el.scrollHeight;
  }

  function setVisible(on) {
    el.classList.toggle('on', on);
  }

  function clear() {
    el.innerHTML = '';
  }

  return { el, addMessage, setVisible, clear };
}

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
