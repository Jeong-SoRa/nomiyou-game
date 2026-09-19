import * as THREE from 'three';

/**
 * 점프스케어 연출: 화면 흔들림 + 붉은 플래시 + 효과음(WebAudio 로 생성, 오디오 파일 불필요).
 * - trigger(): 연출 시작 (키 입력 핸들러 안에서 호출해야 오디오가 재생됨)
 * - undoShake(camera) 를 프레임 시작에, applyShake(camera, dt) 를 렌더 직전에 호출
 */
export function createScare({ flashEl, silent = false } = {}) {
  // silent: 효과음 생략 (헤드리스 스크린샷 테스트용 — 사용자 입력 없이 AudioContext 를 만들면 헤드리스 크롬이 멈춘다)
  let timer = 0;
  let duration = 0.7;
  const offset = new THREE.Vector3();
  let audio = null;

  function trigger({ shake = 0.7, flash = true, sound = true } = {}) {
    timer = shake;
    duration = shake;
    if (flashEl && flash) {
      flashEl.classList.remove('on');
      void flashEl.offsetWidth; // 애니메이션 재시작
      flashEl.classList.add('on');
    }
    if (sound) playStab();
  }

  function ctx() {
    audio ??= new (window.AudioContext || window.webkitAudioContext)();
    if (audio.state === 'suspended') audio.resume();
    return audio;
  }

  /** 문 두드리는 소리: 둔탁한 저음 쿵쿵 × count */
  function knock({ count = 4, gap = 0.22, volume = 0.8 } = {}) {
    if (silent) return;
    try {
      const a = ctx();
      for (let i = 0; i < count; i++) {
        const t0 = a.currentTime + i * gap + (i > 1 ? 0.04 : 0);
        const osc = a.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(90, t0);
        osc.frequency.exponentialRampToValueAtTime(45, t0 + 0.12);
        const g = a.createGain();
        g.gain.setValueAtTime(volume, t0);
        g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.18);
        osc.connect(g).connect(a.destination);
        osc.start(t0);
        osc.stop(t0 + 0.2);
        // 나무 문 두께감: 짧은 노이즈 클릭
        const len = Math.floor(a.sampleRate * 0.05);
        const buf = a.createBuffer(1, len, a.sampleRate);
        const d = buf.getChannelData(0);
        for (let j = 0; j < len; j++) d[j] = (Math.random() * 2 - 1) * (1 - j / len) ** 3;
        const n = a.createBufferSource();
        n.buffer = buf;
        const ng = a.createGain();
        ng.gain.value = volume * 0.5;
        n.connect(ng).connect(a.destination);
        n.start(t0);
      }
    } catch (e) {
      console.warn('[scare] knock 실패', e);
    }
  }

  /** 비명: 높은 톤이 흔들리며 내려오는 소리 + 노이즈 */
  function scream({ seconds = 1.8 } = {}) {
    if (silent) return;
    try {
      const a = ctx();
      const t0 = a.currentTime;
      const master = a.createGain();
      master.gain.setValueAtTime(0.0001, t0);
      master.gain.exponentialRampToValueAtTime(0.9, t0 + 0.05);
      master.gain.exponentialRampToValueAtTime(0.0001, t0 + seconds);
      master.connect(a.destination);
      for (const [f0, f1, type] of [
        [1400, 600, 'sawtooth'],
        [2100, 900, 'square'],
        [700, 300, 'sawtooth'],
      ]) {
        const osc = a.createOscillator();
        osc.type = type;
        osc.frequency.setValueAtTime(f0, t0);
        osc.frequency.exponentialRampToValueAtTime(f1, t0 + seconds);
        const vib = a.createOscillator();
        vib.frequency.value = 13;
        const vg = a.createGain();
        vg.gain.value = 60;
        vib.connect(vg).connect(osc.frequency);
        const g = a.createGain();
        g.gain.value = 0.25;
        osc.connect(g).connect(master);
        osc.start(t0);
        vib.start(t0);
        osc.stop(t0 + seconds);
        vib.stop(t0 + seconds);
      }
    } catch (e) {
      console.warn('[scare] scream 실패', e);
    }
  }

  function playStab() {
    if (silent) return;
    try {
      audio ??= new (window.AudioContext || window.webkitAudioContext)();
      if (audio.state === 'suspended') audio.resume();
      const t0 = audio.currentTime;
      const master = audio.createGain();
      master.gain.setValueAtTime(0.0001, t0);
      master.gain.exponentialRampToValueAtTime(0.9, t0 + 0.02);
      master.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.1);
      master.connect(audio.destination);

      // 노이즈 버스트 (찢어지는 소리)
      const len = Math.floor(audio.sampleRate * 1.1);
      const buf = audio.createBuffer(1, len, audio.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 2;
      const noise = audio.createBufferSource();
      noise.buffer = buf;
      const bp = audio.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.setValueAtTime(1800, t0);
      bp.frequency.exponentialRampToValueAtTime(300, t0 + 0.9);
      bp.Q.value = 0.8;
      noise.connect(bp).connect(master);
      noise.start(t0);

      // 저음 스탭 (쿵)
      const osc = audio.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(110, t0);
      osc.frequency.exponentialRampToValueAtTime(38, t0 + 0.6);
      const og = audio.createGain();
      og.gain.setValueAtTime(0.7, t0);
      og.gain.exponentialRampToValueAtTime(0.001, t0 + 0.8);
      osc.connect(og).connect(master);
      osc.start(t0);
      osc.stop(t0 + 0.9);

      // 높은 비명 같은 스윕
      const sq = audio.createOscillator();
      sq.type = 'square';
      sq.frequency.setValueAtTime(900, t0);
      sq.frequency.exponentialRampToValueAtTime(2400, t0 + 0.12);
      sq.frequency.exponentialRampToValueAtTime(500, t0 + 0.5);
      const sg = audio.createGain();
      sg.gain.setValueAtTime(0.18, t0);
      sg.gain.exponentialRampToValueAtTime(0.001, t0 + 0.5);
      sq.connect(sg).connect(master);
      sq.start(t0);
      sq.stop(t0 + 0.55);
    } catch (e) {
      console.warn('[scare] 오디오 재생 실패', e);
    }
  }

  // 카메라 컨트롤이 흔들림 오프셋을 궤도에 흡수하지 않도록, 프레임 시작에 되돌리고 렌더 직전에 다시 더한다
  function undoShake(camera) {
    camera.position.sub(offset);
    offset.set(0, 0, 0);
  }
  function applyShake(camera, dt) {
    if (timer <= 0) return;
    timer -= dt;
    const k = Math.max(0, timer / duration);
    const amp = 0.35 * k * k;
    offset.set((Math.random() * 2 - 1) * amp, (Math.random() * 2 - 1) * amp, (Math.random() * 2 - 1) * amp * 0.4);
    camera.position.add(offset);
  }

  return { trigger, knock, scream, undoShake, applyShake, isActive: () => timer > 0 };
}
