import { rand } from '../helpers.js';

/**
 * 파닥이 대사. 날짜(day)가 지날수록 따뜻한 잡담 → 으스스한 이야기로 바뀐다.
 * - 1~2일: 가볍고 따뜻한 인사
 * - 3~4일: 숲에서 들리는 소리 등 불안한 낌새
 * - 5일~: 무서운 목격담
 * - 6일~: 가끔(SCARE_CHANCE) 점프스케어 "보내줘". 그 직후 다시 말을 걸면 아무 일 없었다는 듯 평범한 대사
 */
const WARM = [
  '안녕.',
  '오늘 날씨가 좋아.',
  '오늘은 방송 몇시야?',
  '노미요, 오늘도 방송 해?',
  '낮잠 잤더니 기분 좋아.',
  '노미요 옆이 제일 편해.',
  '오늘 게임 재미있었어.',
];
const UNEASY = [
  '요즘 숲에서 자꾸 이상한 소리가 들려.',
  '어젯밤에 문 밖에 누가 서 있었던 것 같아.',
  '노미요, 밤에는 문 열지 마.',
  '숲에 나갔던 애가 아직 안 돌아왔어. ...내가 잘못 센 걸지도.',
  '오늘 게임 재미있었어. 근데 밖이 좀 조용하지 않아?',
];
const SCARY = [
  '나 어제 숲에서 이상한 걸 봤어. 무서워서 얼른 도망쳤어.',
  '그게 여기까지 쫓아오면 어떡하지?',
  '그게 자꾸 나를 봐. 눈이 빨개.',
  '숲에서 누가 내 이름을 불렀어. 내 옛날 이름을.',
  '노미요... 우리 원래 어디서 왔더라?',
];
// 점프스케어 직후, 아무렇지도 않게 하는 말
const AFTER_SCARE = ['오늘 게임 재미있었어.', '응? 왜 그렇게 봐?', '배고파. 간식 없어?', '안녕.'];
const SCARE_LINE = '보내줘보내줘\n보내줘!!!!!!';
const SCARE_DAY = 6;
const SCARE_CHANCE = 0.3;

function pick(arr, avoid) {
  const pool = arr.length > 1 ? arr.filter((l) => l !== avoid) : arr;
  return pool[Math.floor(rand(0, pool.length))];
}

/** 0 = 정상, 1 = 이상한 이야기, 2 = 오염 (고성 게임 NPC/쪽지도 같은 단계를 씀) */
export function tierIndexForDay(day, { horror = false } = {}) {
  if (horror) return 2;
  if (day <= 2) return 0;
  if (day <= 4) return 1;
  return 2;
}

export function tierForDay(day) {
  if (day <= 2) return WARM;
  if (day <= 4) return UNEASY;
  return SCARY;
}

/**
 * 파닥이 한 마리의 대화 상태. next(day, { horror }) → { text, scare, duration }
 */
export function createChickTalker() {
  let last = null;
  let justScared = false;

  function next(day, { horror = false } = {}) {
    if (justScared) {
      justScared = false;
      const text = pick(AFTER_SCARE, last);
      last = text;
      return { text, scare: false, duration: 3 };
    }
    const canScare = horror || day >= SCARE_DAY;
    if (canScare && Math.random() < (horror ? 0.6 : SCARE_CHANCE)) {
      justScared = true;
      last = SCARE_LINE;
      return { text: SCARE_LINE, scare: true, duration: 2.2 };
    }
    const text = pick(horror ? SCARY : tierForDay(day), last);
    last = text;
    return { text, scare: false, duration: 2.2 + text.length * 0.05 };
  }

  return { next };
}
