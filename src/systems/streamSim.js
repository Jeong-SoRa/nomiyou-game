import { rand } from '../helpers.js';

/**
 * 방송 채팅/구독 시뮬레이션.
 * dt 기반 타이머(기존 코드 관례)로 일반 채팅과 구독 이벤트를 발생시킨다.
 * 한 번 구독한 이름은 이후 일반 채팅에도 subscriber: true 로 표시된다.
 */
const VIEWER_NAMES = ['소보로', '땅콩버터', '구름이', '박하사탕', '레몬에이드', '꾸덕치즈', '초코송이', '단밤'];
const SUB_NAMES = ['미야옹집사', '버터젤리', '하늘다람쥐', '두부한모', '별사탕공장'];
const CHAT_LINES = [
  'ㅋㅋㅋㅋㅋ',
  '노미요 오늘도 최고!',
  '화이팅!!',
  'ㅎㅇㅎㅇ',
  '귀엽다 진짜...',
  '오늘 방송 재밌다',
  'ㄷㄷㄷ',
  '집중하는 표정 봐',
  '파닥이들 잘 있나요?',
  '대파 흔들리는 거 귀여워',
];

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function createStreamSim({ onMessage, onSubscribe }) {
  let msgTimer = 0;
  let subTimer = 0;
  let subscribedNames = [];

  function reset() {
    msgTimer = rand(0.6, 1.6);
    subTimer = rand(14, 24); // 첫 구독은 비교적 금방 (느낌 테스트용)
    subscribedNames = [];
  }
  reset();

  function update(dt) {
    msgTimer -= dt;
    if (msgTimer <= 0) {
      msgTimer = rand(1.2, 3.2);
      const useSub = subscribedNames.length > 0 && Math.random() < 0.3;
      const name = useSub ? pick(subscribedNames) : pick(VIEWER_NAMES);
      onMessage({ name, text: pick(CHAT_LINES), subscriber: useSub });
    }
    subTimer -= dt;
    if (subTimer <= 0) {
      subTimer = rand(20, 35);
      const fresh = SUB_NAMES.filter((n) => !subscribedNames.includes(n));
      const name = fresh.length ? pick(fresh) : pick(SUB_NAMES);
      if (!subscribedNames.includes(name)) subscribedNames.push(name);
      onSubscribe({ name, text: `${name}님이 1개월 구독을 시작했습니다`, subscriber: true, isEvent: true });
    }
  }

  return { update, reset, randomViewer: () => (subscribedNames.length && Math.random() < 0.4 ? pick(subscribedNames) : pick(VIEWER_NAMES)) };
}
