/**
 * 하루 일정: 날짜별로 수행해야 하는 이벤트 목록과 완료 상태 (기준 문서: docs/game_timeline.md).
 * 침대에서 잠을 자려면 그날의 일정을 모두 끝내야 하고, 남은 일이 있으면 그 안내문(label)을 보여준다.
 * 할 일 목록은 플레이어에게 보여주지 않는다.
 *
 * - stream: 게임방송하기 (1·3·4·5·6일차)
 * - berries: 숲에서 열매 먹기 3개 (1~5일차)
 * - water: 2일차(휴방일), 화분에 물 주기. 물조리개가 비어 있어 숲의 우물에서 먼저 물을 떠 와야 한다
 * - doll: 4일차, 우물의 열쇠로 헛간을 열고 노미요 인형을 가져오기 (5·6일차 진행에 필요하므로 그날 안에 끝내야 한다)
 * - crate: 5일차, 숲 남쪽 파닥 동상에 비밀번호를 넣어 나무상자를 드러내기 (6일차 엔딩에 필요)
 */
const STREAM = { id: 'stream', label: '오늘의 방송을 시작하세요' };
const BERRIES = { id: 'berries', label: '배가 고파요. 숲에서 열매를 찾아 먹으세요', count: 3 };

export const DAY_PLANS = {
  1: [STREAM, BERRIES], // 열매는 방송 전에도 먹을 수 있다 (방송 뒤 노미요가 배고프다고 말해 유도한다)
  2: [{ id: 'water', label: '창가의 화분에 물을 주세요' }, BERRIES],
  3: [STREAM, BERRIES],
  4: [STREAM, BERRIES, { id: 'doll', label: '숲에 아직 확인하지 못한 곳이 있어요', needs: ['stream'] }],
  5: [STREAM, BERRIES, { id: 'crate', label: '숲 남쪽의 동상이 마음에 걸려요', needs: ['stream'] }],
  6: [STREAM],
};
export const LAST_DAY = 6;

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
  /** 개수형 일(berries) 진행. 다 채우면 완료 */
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
