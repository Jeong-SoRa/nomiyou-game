/** 방송 채팅 로그 오버레이 (평범한 DOM/CSS, #hud/#mode 와 같은 관례) */
export function createChatLog({ maxMessages = 40 } = {}) {
  const el = document.createElement('div');
  el.id = 'chatLog';
  document.body.appendChild(el);

  function addMessage({ name, text, subscriber = false, isEvent = false }) {
    const row = document.createElement('div');
    row.className = 'chatMsg' + (isEvent ? ' chatEvent' : '');
    row.innerHTML = `${subscriber ? '<span class="chatBadge">🐤</span>' : ''}<b>${escapeHtml(name)}</b> ${escapeHtml(text)}`;
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
