/**
 * 하루 일정: 날짜별로 수행해야 하는 이벤트 목록과 완료 상태.
 * 침대에서 잠을 자려면 그날의 일정을 모두 끝내야 하고, 남은 일이 있으면 그 안내문(label)을 보여준다.
 *
 * - stream: 방송 (매일)
 * - grapes: 1일차, 방송을 끝내고 배가 고파 숲에서 포도를 따 먹기
 * - recruit: 방 안 파닥이에게 말을 걸어 동행시키기 (3·5·6·7일차)
 * - forest_check: 3일차, 파닥이와 숲의 풀숲 확인 (붉은 눈)
 * - sound_check: 4일차, 방송 중 들린 노크 소리를 밖에서 확인
 * - hints: 5·6일차, 파닥이와 힌트 수집 (count 개). 힌트를 다 모으면 곡괭이를 찾을 수 있는 조건이 열린다
 * - pickaxe: 7일차, 힌트가 가리키는 곳(오두막 뒤 장작더미)에서 곡괭이 찾기
 * - escape: 7일차, 숲 깊은 곳의 커다란 나무 상자를 곡괭이로 부숨 → '좋아요' 석상 → 분기 선택
 */
const STREAM = { id: 'stream', label: '오늘의 방송을 시작하세요' };
const RECRUIT = (label) => ({ id: 'recruit', label });

export const DAY_PLANS = {
  1: [STREAM, { id: 'grapes', label: '배가 고파요. 밖에 나가서 음식을 찾아 먹으세요', needs: ['stream'] }],
  2: [STREAM],
  3: [
    STREAM,
    RECRUIT('파닥이가 할 말이 있는 것 같아요. 이야기를 들어보세요'),
    { id: 'forest_check', label: '파닥이와 함께 숲을 확인해보세요', needs: ['recruit'] },
  ],
  4: [STREAM, { id: 'sound_check', label: '밖에서 들린 소리를 확인해보세요', needs: ['stream'] }],
  5: [
    STREAM,
    RECRUIT('파닥이에게 힌트 찾기를 같이 가자고 하세요'),
    { id: 'hints', label: '파닥이와 함께 탈출 지점 힌트를 모으세요', count: 3, needs: ['recruit'] },
  ],
  6: [
    STREAM,
    RECRUIT('파닥이에게 남은 힌트를 찾으러 가자고 하세요'),
    { id: 'hints', label: '남은 힌트를 모두 모으세요', count: 2, needs: ['recruit'] },
  ],
  7: [
    RECRUIT('파닥이와 함께 나가세요'),
    { id: 'pickaxe', label: '힌트가 가리키는 곳에서 곡괭이를 찾으세요', needs: ['recruit'] },
    { id: 'escape', label: '숲 깊은 곳의 나무 상자를 부수세요', needs: ['pickaxe'] },
  ],
};
export const LAST_DAY = 7;

// 숲에 흩어진 힌트 (5일차 0~2번, 6일차 3~4번). 다 모으면 7일차에 곡괭이가 나타난다
export const HINTS = [
  '숲 깊은 곳의 나무 상자. 아무도 그 안을 본 적이 없다.',
  '상자는 손으로는 열리지 않는다. 부술 것이 필요하다.',
  '혼자서는 안 된다. 함께 온 이가 있어야 한다.',
  '오두막 뒤 장작더미. 아침이 일곱 번 오면 그곳에 곡괭이가 있다.',
  '상자 안의 것을 부수면 모두 돌아간다. 부수지 않으면 아무도 떠나지 못한다.',
];
export const HINTS_FOR_DAY = { 5: [0, 1, 2], 6: [3, 4] };

export function createDayPlan(startDay = 1) {
  let day = startDay;
  let done = new Set();
  let progress = {};
  let listeners = [];

  function tasks() {
    return DAY_PLANS[day] ?? [];
  }
  function task(id) {
    return tasks().find((t) => t.id === id) ?? null;
  }
  function isDone(id) {
    return done.has(id);
  }
  function available(t) {
    return (t.needs ?? []).every((n) => done.has(n));
  }
  function has(id) {
    return !!task(id);
  }
  /** 오늘 해당 일이 있고, 선행 조건이 끝났고, 아직 안 끝난 상태 */
  function pending(id) {
    const t = task(id);
    return !!t && !done.has(id) && available(t);
  }
  function complete(id) {
    if (!task(id) || done.has(id)) return false;
    done.add(id);
    emit();
    return true;
  }
  /** 개수형 일(hints) 진행. 다 채우면 완료 */
  function advance(id) {
    const t = task(id);
    if (!t || done.has(id)) return 0;
    progress[id] = (progress[id] ?? 0) + 1;
    if (progress[id] >= (t.count ?? 1)) complete(id);
    else emit();
    return progress[id];
  }
  function count(id) {
    return progress[id] ?? 0;
  }
  function allDone() {
    return tasks().every((t) => done.has(t.id));
  }
  /** 잠들기 전 안내: 아직 남은 일 중 지금 할 수 있는 첫 번째 */
  function nextHint() {
    const t = tasks().find((t) => !done.has(t.id) && available(t)) ?? tasks().find((t) => !done.has(t.id));
    return t ? t.label : null;
  }
  function setDay(n) {
    day = n;
    done = new Set();
    progress = {};
    emit();
  }
  function onChange(fn) {
    listeners.push(fn);
  }
  function emit() {
    for (const fn of listeners) fn();
  }
  /** 화면 표시용 목록 */
  function view() {
    return tasks().map((t) => ({
      id: t.id,
      label: t.count ? `${t.label} (${Math.min(count(t.id), t.count)}/${t.count})` : t.label,
      done: done.has(t.id),
      locked: !available(t),
    }));
  }

  return { get day() { return day; }, tasks, has, pending, isDone, complete, advance, count, allDone, nextHint, setDay, onChange, view };
}
