/** 방송 채팅 로그 오버레이 (평범한 DOM/CSS, #hud/#mode 와 같은 관례) */
export function createChatLog({ maxMessages = 40 } = {}) {
  const el = document.createElement('div');
  el.id = 'chatLog';
  document.body.appendChild(el);

  function addMessage({ name, text, subscriber = false, isEvent = false }) {
    const row = document.createElement('div');
    row.className = 'chatMsg' + (isEvent ? ' chatEvent' : '');
    // 이벤트 라인(구독 알림 등)은 본문에 이미 이름이 포함되므로 이름을 따로 표시하지 않음
    row.innerHTML = `${subscriber ? '<span class="chatBadge">🐤</span>' : ''}${isEvent ? '' : `<b>${escapeHtml(name)}</b> `}${escapeHtml(text)}`;
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
