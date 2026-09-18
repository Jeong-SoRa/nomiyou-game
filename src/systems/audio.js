/**
 * 배경음 + 효과음.
 *
 * 배경음(BGM): public/audio/ 에 아래 이름의 파일이 있으면 그것을 재생하고(저작권 없는 곡을 직접 넣으면 됨),
 * 없으면 WebAudio 로 만든 대체 앰비언트(잔잔한 패드 / 으스스한 드론 / 방송 중 아르페지오)를 튼다.
 *   bgm_calm.mp3   — 평화로운 방/숲 (1~3일차)
 *   bgm_eerie.mp3  — 으스스한 곡 (4일차부터 dread 만큼 섞임, 7일차 100%)
 *   bgm_stream.mp3 — 방송(게임 화면) 중
 * 두 곡은 dread(0~1)에 따라 크로스페이드된다. 파일과 대체음 둘 다 같은 규칙을 따른다.
 *
 * 효과음(SFX)은 전부 코드로 합성 (발소리, 문, 상호작용, 줍기, 대화, 잠, 성공 등). 저작권 있는 소리는 없다.
 * M 키로 음소거 토글, 설정창(O)에서 전체/배경음/효과음 음량 조절 (모두 localStorage 에 저장).
 */
const TRACKS = { calm: '/audio/bgm_calm.mp3', eerie: '/audio/bgm_eerie.mp3', stream: '/audio/bgm_stream.mp3' };
const BGM_VOLUME = { calm: 0.45, eerie: 0.55, stream: 0.4 };

export function createAudio() {
  let ctx = null;
  let master = null; // 전체
  let bgmBus = null; // 합성 배경음
  let sfxBus = null; // 효과음
  let muted = false;
  const volume = { master: 0.8, bgm: 0.7, sfx: 0.8 };
  try {
    muted = localStorage.getItem('nomiyo.muted') === '1';
    const saved = JSON.parse(localStorage.getItem('nomiyo.volume') || 'null');
    if (saved) Object.assign(volume, saved);
  } catch {}
  let unlocked = false;
  const gainOf = (kind) => (muted ? 0 : volume.master * volume[kind]);

  // ---------- 파일 BGM ----------
  const files = {};
  for (const [mood, src] of Object.entries(TRACKS)) {
    const el = new Audio(src);
    el.loop = true;
    el.preload = 'auto';
    el.volume = 0;
    const rec = { el, ok: false, failed: false };
    el.addEventListener('canplaythrough', () => (rec.ok = true), { once: true });
    el.addEventListener('error', () => (rec.failed = true), { once: true });
    files[mood] = rec;
  }
  const started = new Set();
  function fileTarget(mood, level) {
    const rec = files[mood];
    if (!rec.ok) return false;
    const want = level * BGM_VOLUME[mood] * gainOf('bgm');
    if (want > 0.001 && !started.has(mood)) {
      started.add(mood);
      rec.el.play().catch(() => (rec.failed = true));
    }
    rec.el.volume += (want - rec.el.volume) * 0.08;
    return true;
  }

  // ---------- 대체 BGM (WebAudio 합성) ----------
  let synth = null;
  function buildSynth() {
    const a = ctx;
    const out = a.createGain();
    out.gain.value = 1;
    out.connect(bgmBus);

    // 잔잔한 패드: 삼각파 3성부 코드 진행
    const padGain = a.createGain();
    padGain.gain.value = 0;
    const padFilter = a.createBiquadFilter();
    padFilter.type = 'lowpass';
    padFilter.frequency.value = 900;
    padGain.connect(padFilter).connect(out);
    const padOsc = [0, 1, 2].map(() => {
      const o = a.createOscillator();
      o.type = 'triangle';
      const g = a.createGain();
      g.gain.value = 0.11;
      o.connect(g).connect(padGain);
      o.start();
      return o;
    });
    const CHORDS = [
      [261.6, 329.6, 392.0],
      [220.0, 261.6, 329.6],
      [174.6, 220.0, 261.6],
      [196.0, 246.9, 293.7],
    ];

    // 으스스한 드론: 살짝 어긋난 톱니파 둘 + 느린 떨림
    const droneGain = a.createGain();
    droneGain.gain.value = 0;
    const droneFilter = a.createBiquadFilter();
    droneFilter.type = 'lowpass';
    droneFilter.frequency.value = 180;
    droneGain.connect(droneFilter).connect(out);
    for (const f of [55, 55.8, 82.4]) {
      const o = a.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = f;
      const g = a.createGain();
      g.gain.value = 0.09;
      o.connect(g).connect(droneGain);
      o.start();
    }
    const trem = a.createOscillator();
    trem.frequency.value = 0.13;
    const tremGain = a.createGain();
    tremGain.gain.value = 0.5;
    trem.connect(tremGain).connect(droneGain.gain);
    trem.start();

    // 바람(숲): 필터 노이즈
    const windGain = a.createGain();
    windGain.gain.value = 0;
    const noise = a.createBufferSource();
    const len = a.sampleRate * 2;
    const buf = a.createBuffer(1, len, a.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    noise.buffer = buf;
    noise.loop = true;
    const windFilter = a.createBiquadFilter();
    windFilter.type = 'bandpass';
    windFilter.frequency.value = 400;
    windFilter.Q.value = 0.6;
    noise.connect(windFilter).connect(windGain).connect(out);
    noise.start();
    const windLfo = a.createOscillator();
    windLfo.frequency.value = 0.07;
    const windLfoGain = a.createGain();
    windLfoGain.gain.value = 250;
    windLfo.connect(windLfoGain).connect(windFilter.frequency);
    windLfo.start();

    // 방송 중 아르페지오 (칩튠 느낌)
    const arpGain = a.createGain();
    arpGain.gain.value = 0;
    arpGain.connect(out);

    synth = { out, padGain, padOsc, CHORDS, chordI: -1, chordT: 0, droneGain, windGain, arpGain, arpT: 0, arpI: 0, pingT: 6 };
  }
  function synthUpdate(dt, { calm, eerie, stream, wind }) {
    const s = synth;
    const a = ctx;
    bgmBus.gain.value += (gainOf('bgm') - bgmBus.gain.value) * 0.1;
    sfxBus.gain.value = gainOf('sfx');
    s.padGain.gain.value += (calm * 0.9 + stream * 0.35 - s.padGain.gain.value) * 0.05;
    s.droneGain.gain.value += (eerie * 1.3 - s.droneGain.gain.value) * 0.05;
    s.windGain.gain.value += (wind * (0.05 + eerie * 0.05) - s.windGain.gain.value) * 0.05;
    s.arpGain.gain.value += (stream * 0.16 - s.arpGain.gain.value) * 0.05;
    // 코드 진행 (4초마다)
    s.chordT -= dt;
    if (s.chordT <= 0) {
      s.chordT = 4;
      s.chordI = (s.chordI + 1) % s.CHORDS.length;
      const chord = s.CHORDS[s.chordI];
      s.padOsc.forEach((o, i) => o.frequency.setTargetAtTime(chord[i] * (eerie > 0.5 ? 0.985 : 1), a.currentTime, 0.4));
    }
    // 아르페지오: 방송 중 8분음표
    if (s.arpGain.gain.value > 0.005) {
      s.arpT -= dt;
      if (s.arpT <= 0) {
        s.arpT = 0.25;
        const chord = s.CHORDS[Math.max(0, s.chordI)];
        const f = chord[s.arpI % 3] * (s.arpI % 6 >= 3 ? 2 : 1);
        s.arpI++;
        pluck(f, 0.18, 'square', s.arpGain);
      }
    }
    // 으스스할 때 가끔 높은 '핑'
    if (eerie > 0.2) {
      s.pingT -= dt;
      if (s.pingT <= 0) {
        s.pingT = 5 + Math.random() * 10;
        pluck(1600 + Math.random() * 900, 1.6, 'sine', s.out, 0.05 * eerie);
      }
    }
  }
  function pluck(freq, dur, type, dest, vol = 0.25) {
    const a = ctx;
    const o = a.createOscillator();
    o.type = type;
    o.frequency.value = freq;
    const g = a.createGain();
    const t0 = a.currentTime;
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g).connect(dest);
    o.start(t0);
    o.stop(t0 + dur + 0.05);
  }

  // ---------- 효과음 ----------
  function tone({ f0, f1 = f0, dur = 0.12, type = 'sine', vol = 0.2, delay = 0 }) {
    if (!ctx || muted) return;
    const a = ctx;
    const t0 = a.currentTime + delay;
    const o = a.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(f0, t0);
    o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t0 + dur);
    const g = a.createGain();
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g).connect(sfxBus);
    o.start(t0);
    o.stop(t0 + dur + 0.02);
  }
  function noiseBurst({ dur = 0.08, vol = 0.15, freq = 1200, q = 1, delay = 0 }) {
    if (!ctx || muted) return;
    const a = ctx;
    const t0 = a.currentTime + delay;
    const len = Math.floor(a.sampleRate * dur);
    const buf = a.createBuffer(1, len, a.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 2;
    const n = a.createBufferSource();
    n.buffer = buf;
    const f = a.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = freq;
    f.Q.value = q;
    const g = a.createGain();
    g.gain.value = vol;
    n.connect(f).connect(g).connect(sfxBus);
    n.start(t0);
  }
  let stepSide = 0;
  const sfx = {
    /**
     * 동물의 숲식 옹알이: 글자 수만큼 짧은 '뾱' 을 빠르게 이어 붙인다.
     * base 가 높을수록 앙증맞은 목소리 (파닥이 760, 노미요 520 정도)
     */
    babble(length, { base = 760, spread = 260, rate = 0.075, max = 28 } = {}) {
      if (!ctx || muted) return;
      const a = ctx;
      const n = Math.min(max, Math.max(3, Math.round(length * 0.8)));
      const t0 = a.currentTime;
      for (let i = 0; i < n; i++) {
        // 음절마다 살짝 다른 높이, 문장 끝은 내려감
        const f = base + (Math.random() - 0.3) * spread - (i / n) * 60;
        const t = t0 + i * rate + Math.random() * 0.01;
        const o = a.createOscillator();
        o.type = 'square';
        o.frequency.setValueAtTime(f * 1.15, t);
        o.frequency.exponentialRampToValueAtTime(f, t + 0.03);
        const g = a.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.09, t + 0.008);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.055);
        const lp = a.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.value = 2400;
        o.connect(lp).connect(g).connect(sfxBus);
        o.start(t);
        o.stop(t + 0.07);
      }
    },
    step(running = false) {
      stepSide ^= 1;
      noiseBurst({ dur: 0.06, vol: running ? 0.12 : 0.08, freq: stepSide ? 900 : 700, q: 1.2 });
    },
    door() {
      tone({ f0: 180, f1: 90, dur: 0.35, type: 'triangle', vol: 0.18 });
      noiseBurst({ dur: 0.4, vol: 0.08, freq: 500, q: 0.7 });
    },
    ui() {
      tone({ f0: 660, f1: 880, dur: 0.08, vol: 0.12 });
    },
    talk() {
      tone({ f0: 520, f1: 640, dur: 0.06, type: 'square', vol: 0.05 });
      tone({ f0: 700, f1: 600, dur: 0.06, type: 'square', vol: 0.05, delay: 0.08 });
    },
    pickup() {
      [660, 880, 1320].forEach((f, i) => tone({ f0: f, dur: 0.18, vol: 0.12, delay: i * 0.07 }));
    },
    eat() {
      noiseBurst({ dur: 0.09, vol: 0.14, freq: 1800, q: 2 });
      noiseBurst({ dur: 0.09, vol: 0.12, freq: 1500, q: 2, delay: 0.16 });
    },
    sleep() {
      [523, 659, 784, 1046].forEach((f, i) => tone({ f0: f, dur: 0.5, type: 'triangle', vol: 0.1, delay: i * 0.16 }));
    },
    win() {
      [523, 659, 784, 1046, 784, 1046].forEach((f, i) => tone({ f0: f, dur: 0.22, type: 'square', vol: 0.08, delay: i * 0.12 }));
    },
    gate() {
      tone({ f0: 70, f1: 40, dur: 1.2, type: 'sawtooth', vol: 0.2 });
    },
    deny() {
      tone({ f0: 220, f1: 160, dur: 0.18, type: 'square', vol: 0.06 });
    },
    /** 곡괭이 휘두르기 + 나무 부서지는 소리 */
    smash() {
      noiseBurst({ dur: 0.12, vol: 0.3, freq: 900, q: 0.8 }); // 휙
      tone({ f0: 140, f1: 55, dur: 0.35, type: 'triangle', vol: 0.35, delay: 0.14 }); // 쿵
      noiseBurst({ dur: 0.5, vol: 0.35, freq: 1600, q: 0.5, delay: 0.14 }); // 우지직
      for (let i = 0; i < 5; i++) noiseBurst({ dur: 0.08, vol: 0.12, freq: 2400 + i * 300, q: 2, delay: 0.3 + i * 0.09 }); // 판자 떨어지는 소리
    },
    /** 파사삭: 나무 상자가 한꺼번에 흩어지는 소리 (여러 갈래 우지직 + 판자 우수수) */
    shatter() {
      tone({ f0: 160, f1: 45, dur: 0.5, type: 'triangle', vol: 0.4 });
      noiseBurst({ dur: 0.9, vol: 0.45, freq: 1400, q: 0.4 });
      noiseBurst({ dur: 0.6, vol: 0.3, freq: 2600, q: 0.8, delay: 0.05 });
      for (let i = 0; i < 14; i++) noiseBurst({ dur: 0.07, vol: 0.1, freq: 1800 + Math.random() * 1500, q: 2.5, delay: 0.25 + i * 0.07 + Math.random() * 0.04 });
    },
    /** 돌이 무너지는 소리 */
    crumble() {
      tone({ f0: 90, f1: 35, dur: 1.2, type: 'sawtooth', vol: 0.3 });
      noiseBurst({ dur: 1.4, vol: 0.3, freq: 400, q: 0.4 });
      for (let i = 0; i < 8; i++) noiseBurst({ dur: 0.1, vol: 0.1, freq: 700 + Math.random() * 600, q: 1.5, delay: 0.2 + i * 0.13 });
    },
    /** 치지직 (화면 노이즈와 함께) */
    static(dur = 0.8) {
      noiseBurst({ dur, vol: 0.22, freq: 3000, q: 0.3 });
      tone({ f0: 60, f1: 50, dur: dur * 0.6, type: 'sawtooth', vol: 0.08 });
    },
  };

  // ---------- 제어 ----------
  function unlock() {
    if (unlocked) return;
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain();
      master.gain.value = 1;
      master.connect(ctx.destination);
      bgmBus = ctx.createGain();
      bgmBus.gain.value = gainOf('bgm');
      bgmBus.connect(master);
      sfxBus = ctx.createGain();
      sfxBus.gain.value = gainOf('sfx');
      sfxBus.connect(master);
      buildSynth();
      unlocked = true;
    } catch (e) {
      console.warn('[audio] 사용 불가', e);
    }
  }
  function setVolume(kind, v) {
    volume[kind] = Math.max(0, Math.min(1, v));
    try {
      localStorage.setItem('nomiyo.volume', JSON.stringify(volume));
    } catch {}
    if (sfxBus) sfxBus.gain.value = gainOf('sfx');
  }
  function toggleMute() {
    muted = !muted;
    try {
      localStorage.setItem('nomiyo.muted', muted ? '1' : '0');
    } catch {}
    return muted;
  }

  /**
   * 매 프레임: dread(0~1), world('house'|'forest'), ingame(방송 화면), silent(엔딩 등)
   * 파일이 준비된 무드는 파일로, 아니면 합성음으로 채운다.
   */
  function update(dt, { dread = 0, world = 'house', ingame = false, silent = false } = {}) {
    if (!unlocked) return;
    if (ctx.state === 'suspended') ctx.resume();
    const stream = ingame && !silent ? 1 : 0;
    const calm = silent ? 0 : (1 - dread) * (1 - stream);
    const eerie = silent ? 0 : dread * (1 - stream * 0.5);
    const useFile = { calm: fileTarget('calm', calm), eerie: fileTarget('eerie', eerie), stream: fileTarget('stream', stream) };
    synthUpdate(dt, {
      calm: useFile.calm ? 0 : calm,
      eerie: useFile.eerie ? 0 : eerie,
      stream: useFile.stream ? 0 : stream,
      wind: world === 'forest' && !ingame && !silent ? 1 : 0,
    });
  }

  return { unlock, update, toggleMute, isMuted: () => muted, setVolume, getVolume: (k) => volume[k], sfx };
}
