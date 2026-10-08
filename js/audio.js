/**
 * audio.js - Web Audio API 기반 고품질 Chiptune / Retro Game Audio Engine
 * 생태계 탐정단 (Eco Detectives)
 * 무의존성 순수 자바스크립트 엔진 (모바일 브라우저 및 태블릿 터치 환경 최적화)
 */

(function(window) {
  'use strict';

  var AudioContextClass = window.AudioContext || window.webkitAudioContext;
  var ctx = null;
  var isUnlocked = false;

  // Buses
  var masterGain = null;
  var bgmGain = null;
  var sfxGain = null;
  var compressor = null;

  var currentBgm = null;
  var currentBgmName = '';
  var bgmFadeTimer = null;
  var pendingBgmName = '';

  var muted = false;
  var bgmVolume = 0.45;
  var sfxVolume = 0.8;

  // LocalStorage 볼륨/음소거 복원
  try {
    var savedMute = localStorage.getItem('ecoDetMute');
    if (savedMute !== null) muted = (savedMute === 'true');
  } catch (e) {}

  function initContext() {
    if (ctx) return;
    if (!AudioContextClass) return;
    try {
      ctx = new AudioContextClass();
      compressor = ctx.createDynamicsCompressor();
      compressor.threshold.setValueAtTime(-12, ctx.currentTime);
      compressor.knee.setValueAtTime(30, ctx.currentTime);
      compressor.ratio.setValueAtTime(12, ctx.currentTime);
      compressor.attack.setValueAtTime(0.003, ctx.currentTime);
      compressor.release.setValueAtTime(0.25, ctx.currentTime);

      masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(muted ? 0 : 1, ctx.currentTime);

      bgmGain = ctx.createGain();
      bgmGain.gain.setValueAtTime(bgmVolume, ctx.currentTime);

      sfxGain = ctx.createGain();
      sfxGain.gain.setValueAtTime(sfxVolume, ctx.currentTime);

      bgmGain.connect(compressor);
      sfxGain.connect(compressor);
      compressor.connect(masterGain);
      masterGain.connect(ctx.destination);
    } catch (e) {
      console.warn('AudioContext init error:', e);
    }
  }

  function unlock() {
    initContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') {
      ctx.resume().then(function() {
        isUnlocked = true;
        if (pendingBgmName) {
          var name = pendingBgmName;
          pendingBgmName = '';
          playBgm(name);
        }
      });
    } else {
      isUnlocked = true;
      if (pendingBgmName) {
        var name = pendingBgmName;
        pendingBgmName = '';
        playBgm(name);
      }
    }

    // iOS/Android 오디오 언락을 위한 무음 버퍼 재생
    try {
      var buffer = ctx.createBuffer(1, 1, 22050);
      var source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.start(0);
    } catch (e) {}
  }

  // 화면 백그라운드 전환 시 자동 일시정지 / 복원
  document.addEventListener('visibilitychange', function() {
    if (!ctx) return;
    if (document.hidden) {
      if (ctx.state === 'running') ctx.suspend();
    } else {
      if (ctx.state === 'suspended' && isUnlocked) ctx.resume();
    }
  });

  // 음계 주파수 테이블 (A4 = 440Hz)
  var NOTE_MAP = {
    'C3': 130.81, 'C#3': 138.59, 'D3': 146.83, 'D#3': 155.56, 'E3': 164.81, 'F3': 174.61, 'F#3': 185.00, 'G3': 196.00, 'G#3': 207.65, 'A3': 220.00, 'A#3': 233.08, 'B3': 246.94,
    'C4': 261.63, 'C#4': 277.18, 'D4': 293.66, 'D#4': 311.13, 'E4': 329.63, 'F4': 349.23, 'F#4': 369.99, 'G4': 392.00, 'G#4': 415.30, 'A4': 440.00, 'A#4': 466.16, 'B4': 493.88,
    'C5': 523.25, 'C#5': 554.37, 'D5': 587.33, 'D#5': 622.25, 'E5': 659.25, 'F5': 698.46, 'F#5': 739.99, 'G5': 783.99, 'G#5': 830.61, 'A5': 880.00, 'A#5': 932.33, 'B5': 987.77,
    'C6': 1046.50, 'D6': 1174.66, 'E6': 1318.51, 'G6': 1567.98, 'A6': 1760.00
  };

  function getFreq(note) {
    if (!note || note === '-' || note === 'rest') return 0;
    return NOTE_MAP[note] || 440;
  }

  // --- 효과음 (SFX) 합성기 ---
  function playSfx(name) {
    if (muted) return;
    initContext();
    if (!ctx) return;
    var t = ctx.currentTime;

    try {
      switch (name) {
        case 'click':
        case 'select': {
          var osc = ctx.createOscillator();
          var g = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(600, t);
          osc.frequency.exponentialRampToValueAtTime(300, t + 0.05);
          g.gain.setValueAtTime(0.3, t);
          g.gain.linearRampToValueAtTime(0.01, t + 0.05);
          osc.connect(g);
          g.connect(sfxGain);
          osc.start(t);
          osc.stop(t + 0.05);
          break;
        }
        case 'type': {
          // 타이핑 소리 (짧고 뭉툭한 작은 노이즈+톤)
          var osc = ctx.createOscillator();
          var g = ctx.createGain();
          osc.type = 'square';
          osc.frequency.setValueAtTime(450 + Math.random() * 80, t);
          g.gain.setValueAtTime(0.08, t);
          g.gain.exponentialRampToValueAtTime(0.001, t + 0.025);
          osc.connect(g);
          g.connect(sfxGain);
          osc.start(t);
          osc.stop(t + 0.03);
          break;
        }
        case 'back': {
          var osc = ctx.createOscillator();
          var g = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(400, t);
          osc.frequency.linearRampToValueAtTime(200, t + 0.1);
          g.gain.setValueAtTime(0.25, t);
          g.gain.linearRampToValueAtTime(0.01, t + 0.1);
          osc.connect(g);
          g.connect(sfxGain);
          osc.start(t);
          osc.stop(t + 0.1);
          break;
        }
        case 'correct':
        case 'clue': {
          // 상큼한 2음 아르페지오 (C6 -> E6 -> G6)
          var notes = [523.25, 659.25, 783.99, 1046.50];
          notes.forEach(function(freq, idx) {
            var o = ctx.createOscillator();
            var g = ctx.createGain();
            o.type = 'triangle';
            o.frequency.setValueAtTime(freq, t + idx * 0.06);
            g.gain.setValueAtTime(0.3, t + idx * 0.06);
            g.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.06 + 0.25);
            o.connect(g);
            g.connect(sfxGain);
            o.start(t + idx * 0.06);
            o.stop(t + idx * 0.06 + 0.25);
          });
          break;
        }
        case 'wrong':
        case 'error': {
          // 둔탁한 2단계 하강 버저음
          var o1 = ctx.createOscillator();
          var g1 = ctx.createGain();
          o1.type = 'sawtooth';
          o1.frequency.setValueAtTime(180, t);
          o1.frequency.linearRampToValueAtTime(120, t + 0.2);
          g1.gain.setValueAtTime(0.28, t);
          g1.gain.linearRampToValueAtTime(0.01, t + 0.2);
          o1.connect(g1);
          g1.connect(sfxGain);
          o1.start(t);
          o1.stop(t + 0.25);
          break;
        }
        case 'stamp': {
          // 도장 쾅 찍는 중후한 임팩트
          var o = ctx.createOscillator();
          var g = ctx.createGain();
          o.type = 'sine';
          o.frequency.setValueAtTime(140, t);
          o.frequency.exponentialRampToValueAtTime(35, t + 0.25);
          g.gain.setValueAtTime(0.8, t);
          g.gain.exponentialRampToValueAtTime(0.01, t + 0.28);
          o.connect(g);
          g.connect(sfxGain);
          o.start(t);
          o.stop(t + 0.3);
          break;
        }
        case 'objection': {
          // "이의 있음!" 강렬한 오케스트라 히트/ 임팩트
          var chord = [130.81, 164.81, 196.00, 261.63, 392.00];
          chord.forEach(function(freq) {
            var o = ctx.createOscillator();
            var g = ctx.createGain();
            o.type = 'sawtooth';
            o.frequency.setValueAtTime(freq, t);
            g.gain.setValueAtTime(0.3, t);
            g.gain.exponentialRampToValueAtTime(0.005, t + 0.6);
            o.connect(g);
            g.connect(sfxGain);
            o.start(t);
            o.stop(t + 0.65);
          });
          // 노이즈 타격감 추가
          playNoise(0.2, 0.4);
          break;
        }
        case 'jump': {
          // 뿅 점프 사운드
          var o = ctx.createOscillator();
          var g = ctx.createGain();
          o.type = 'square';
          o.frequency.setValueAtTime(150, t);
          o.frequency.exponentialRampToValueAtTime(600, t + 0.15);
          g.gain.setValueAtTime(0.25, t);
          g.gain.linearRampToValueAtTime(0.01, t + 0.15);
          o.connect(g);
          g.connect(sfxGain);
          o.start(t);
          o.stop(t + 0.16);
          break;
        }
        case 'splash': {
          // 물 튀기는 소리 (필터드 노이즈 스윕)
          playNoise(0.3, 0.4, 400, 1800);
          break;
        }
        case 'fire': {
          // 불붙는 화르륵 사운드
          playNoise(0.4, 0.5, 300, 1000);
          break;
        }
        case 'extinguish': {
          // 쉬이익 불 끄는 소리
          playNoise(0.35, 0.45, 1200, 400);
          break;
        }
        case 'whoosh': {
          // 스와이프 휘익 소리
          playNoise(0.18, 0.25, 800, 2200);
          break;
        }
        case 'pop': {
          var o = ctx.createOscillator();
          var g = ctx.createGain();
          o.type = 'sine';
          o.frequency.setValueAtTime(300, t);
          o.frequency.exponentialRampToValueAtTime(700, t + 0.08);
          g.gain.setValueAtTime(0.35, t);
          g.gain.exponentialRampToValueAtTime(0.01, t + 0.08);
          o.connect(g);
          g.connect(sfxGain);
          o.start(t);
          o.stop(t + 0.09);
          break;
        }
        case 'coin': {
          var notes = [987.77, 1318.51];
          notes.forEach(function(f, i) {
            var o = ctx.createOscillator();
            var g = ctx.createGain();
            o.type = 'square';
            o.frequency.setValueAtTime(f, t + i * 0.07);
            g.gain.setValueAtTime(0.2, t + i * 0.07);
            g.gain.exponentialRampToValueAtTime(0.01, t + i * 0.07 + 0.15);
            o.connect(g);
            g.connect(sfxGain);
            o.start(t + i * 0.07);
            o.stop(t + i * 0.07 + 0.18);
          });
          break;
        }
        case 'tick': {
          var o = ctx.createOscillator();
          var g = ctx.createGain();
          o.type = 'sine';
          o.frequency.setValueAtTime(800, t);
          g.gain.setValueAtTime(0.15, t);
          g.gain.exponentialRampToValueAtTime(0.01, t + 0.03);
          o.connect(g);
          g.connect(sfxGain);
          o.start(t);
          o.stop(t + 0.04);
          break;
        }
        case 'alarm': {
          var o = ctx.createOscillator();
          var g = ctx.createGain();
          o.type = 'sawtooth';
          o.frequency.setValueAtTime(880, t);
          o.frequency.setValueAtTime(659, t + 0.08);
          g.gain.setValueAtTime(0.25, t);
          g.gain.linearRampToValueAtTime(0.01, t + 0.16);
          o.connect(g);
          g.connect(sfxGain);
          o.start(t);
          o.stop(t + 0.18);
          break;
        }
        case 'flash': {
          // 플래시/빛 번쩍임
          var o = ctx.createOscillator();
          var g = ctx.createGain();
          o.type = 'triangle';
          o.frequency.setValueAtTime(400, t);
          o.frequency.exponentialRampToValueAtTime(1200, t + 0.15);
          g.gain.setValueAtTime(0.3, t);
          g.gain.exponentialRampToValueAtTime(0.01, t + 0.2);
          o.connect(g);
          g.connect(sfxGain);
          o.start(t);
          o.stop(t + 0.22);
          break;
        }
        case 'bubble': {
          var o = ctx.createOscillator();
          var g = ctx.createGain();
          o.type = 'sine';
          o.frequency.setValueAtTime(250, t);
          o.frequency.exponentialRampToValueAtTime(550, t + 0.1);
          g.gain.setValueAtTime(0.3, t);
          g.gain.exponentialRampToValueAtTime(0.01, t + 0.1);
          o.connect(g);
          g.connect(sfxGain);
          o.start(t);
          o.stop(t + 0.12);
          break;
        }
        case 'buzz': {
          var o = ctx.createOscillator();
          var g = ctx.createGain();
          o.type = 'sawtooth';
          o.frequency.setValueAtTime(220, t);
          o.frequency.linearRampToValueAtTime(240, t + 0.15);
          g.gain.setValueAtTime(0.2, t);
          g.gain.linearRampToValueAtTime(0.01, t + 0.15);
          o.connect(g);
          g.connect(sfxGain);
          o.start(t);
          o.stop(t + 0.16);
          break;
        }
        case 'hit': {
          var o = ctx.createOscillator();
          var g = ctx.createGain();
          o.type = 'square';
          o.frequency.setValueAtTime(200, t);
          o.frequency.exponentialRampToValueAtTime(60, t + 0.1);
          g.gain.setValueAtTime(0.4, t);
          g.gain.exponentialRampToValueAtTime(0.01, t + 0.12);
          o.connect(g);
          g.connect(sfxGain);
          o.start(t);
          o.stop(t + 0.13);
          break;
        }
        case 'page': {
          playNoise(0.12, 0.15, 600, 1500);
          break;
        }
        case 'combo': {
          var chord = [523.25, 659.25, 783.99, 1046.50];
          chord.forEach(function(f, i) {
            var o = ctx.createOscillator();
            var g = ctx.createGain();
            o.type = 'triangle';
            o.frequency.setValueAtTime(f, t + i * 0.04);
            g.gain.setValueAtTime(0.25, t + i * 0.04);
            g.gain.exponentialRampToValueAtTime(0.01, t + i * 0.04 + 0.3);
            o.connect(g);
            g.connect(sfxGain);
            o.start(t + i * 0.04);
            o.stop(t + i * 0.04 + 0.35);
          });
          break;
        }
        default:
          break;
      }
    } catch (e) {
      console.warn('sfx play error:', e);
    }
  }

  function playNoise(dur, vol, startF, endF) {
    if (!ctx) return;
    try {
      var bufferSize = Math.floor(ctx.sampleRate * dur);
      var buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      var output = buffer.getChannelData(0);
      for (var i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }
      var whiteNoise = ctx.createBufferSource();
      whiteNoise.buffer = buffer;

      var filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      var t = ctx.currentTime;
      filter.frequency.setValueAtTime(startF || 1000, t);
      if (endF) {
        filter.frequency.linearRampToValueAtTime(endF, t + dur);
      }

      var g = ctx.createGain();
      g.gain.setValueAtTime(vol || 0.3, t);
      g.gain.exponentialRampToValueAtTime(0.01, t + dur);

      whiteNoise.connect(filter);
      filter.connect(g);
      g.connect(sfxGain);
      whiteNoise.start(t);
      whiteNoise.stop(t + dur);
    } catch (e) {}
  }

  // --- 징글 (Jingle) - 짤막한 팡파르 및 축하 멜로디 ---
  function playJingle(name) {
    if (muted) return;
    initContext();
    if (!ctx) return;

    // BGM 볼륨 잠시 더킹 (Duck)
    if (bgmGain) {
      bgmGain.gain.setValueAtTime(bgmVolume * 0.25, ctx.currentTime);
      setTimeout(function() {
        if (bgmGain) bgmGain.gain.setValueAtTime(bgmVolume, ctx.currentTime);
      }, (name === 'solve' ? 3800 : 2200));
    }

    var t = ctx.currentTime;
    try {
      if (name === 'win' || name === 'star') {
        // [C5, E5, G5, C6] 팡파르
        var notes = [['C5', 0, 0.15], ['E5', 0.12, 0.15], ['G5', 0.24, 0.15], ['C6', 0.36, 0.6]];
        playNoteSequence(notes, 'triangle', 0.4);
      } else if (name === 'solve') {
        // 대성공 팡파르 (화려한 브라스풍 칩튠)
        var notes = [
          ['G4', 0, 0.12], ['C5', 0.12, 0.12], ['E5', 0.24, 0.12], ['G5', 0.36, 0.3],
          ['E5', 0.68, 0.15], ['G5', 0.85, 0.7],
          ['A5', 1.6, 0.15], ['B5', 1.8, 0.15], ['C6', 2.0, 1.2]
        ];
        playNoteSequence(notes, 'square', 0.35);
      } else if (name === 'lose') {
        var notes = [['G4', 0, 0.2], ['F#4', 0.22, 0.2], ['F4', 0.44, 0.2], ['E4', 0.66, 0.6]];
        playNoteSequence(notes, 'sawtooth', 0.3);
      } else if (name === 'unlock') {
        var notes = [['C5', 0, 0.1], ['G5', 0.1, 0.1], ['C6', 0.2, 0.4]];
        playNoteSequence(notes, 'sine', 0.4);
      }
    } catch (e) {}
  }

  function playNoteSequence(notes, waveType, vol) {
    var t0 = ctx.currentTime;
    notes.forEach(function(item) {
      var freq = getFreq(item[0]);
      var start = t0 + item[1];
      var dur = item[2];
      if (!freq) return;

      var o = ctx.createOscillator();
      var g = ctx.createGain();
      o.type = waveType || 'square';
      o.frequency.setValueAtTime(freq, start);

      g.gain.setValueAtTime(vol || 0.3, start);
      g.gain.exponentialRampToValueAtTime(0.001, start + dur);

      o.connect(g);
      g.connect(sfxGain);
      o.start(start);
      o.stop(start + dur + 0.05);
    });
  }

  // --- BGM 곡 데이터 및 오프라인 렌더러 ---
  var BGM_TRACKS = {
    // 1. 타이틀 테마 (희망차고 모험적인 탐정 테마, 120BPM)
    title: {
      bpm: 124,
      steps: 32,
      melody: [
        'C5','-','E5','-','G5','-','A5','G5','E5','-','C5','-','D5','E5','D5','-',
        'C5','-','E5','-','G5','-','C6','B5','A5','-','G5','E5','D5','E5','C5','-'
      ],
      bass: [
        'C3','-','C3','-','E3','-','E3','-','F3','-','F3','-','G3','-','G3','-',
        'C3','-','C3','-','E3','-','E3','-','F3','-','G3','-','C3','-','C3','-'
      ],
      leadType: 'square',
      bassType: 'triangle'
    },
    // 2. 지도 테마 (사건 수첩 확인 및 차분한 탐색, 105BPM)
    map: {
      bpm: 108,
      steps: 32,
      melody: [
        'E5','-','G5','-','A5','-','G5','-','D5','-','E5','-','G5','-','-','-',
        'C5','-','D5','-','E5','-','G5','-','A5','-','G5','E5','D5','-','C5','-'
      ],
      bass: [
        'C3','-','G3','-','C3','-','G3','-','D3','-','A3','-','D3','-','G3','-',
        'A3','-','E3','-','A3','-','E3','-','F3','-','G3','-','C3','-','C3','-'
      ],
      leadType: 'triangle',
      bassType: 'sine'
    },
    // 3. 대화 테마 (부엉 반장 및 동물들과의 온화한 대화, 90BPM)
    talk: {
      bpm: 92,
      steps: 32,
      melody: [
        'G5','-','E5','-','D5','-','C5','-','E5','-','G5','-','A5','-','G5','-',
        'A5','-','C6','-','G5','-','E5','-','D5','-','E5','D5','C5','-','-','-'
      ],
      bass: [
        'C3','-','-','-','G3','-','-','-','A3','-','-','-','E3','-','-','-',
        'F3','-','-','-','C3','-','-','-','G3','-','-','-','C3','-','-','-'
      ],
      leadType: 'sine',
      bassType: 'triangle'
    },
    // 4. 추리/수사 테마 (미스터리하고 긴장감 있는 마이너 코드, 100BPM)
    investigate: {
      bpm: 100,
      steps: 32,
      melody: [
        'A4','-','C5','-','E5','-','D#5','D5','C5','-','A4','-','B4','-','E4','-',
        'A4','-','C5','-','E5','-','G5','F#5','F5','-','D5','-','B4','-','A4','-'
      ],
      bass: [
        'A3','-','E3','-','A3','-','E3','-','F3','-','C3','-','E3','-','B3','-',
        'A3','-','E3','-','A3','-','E3','-','D3','-','F3','-','E3','-','A3','-'
      ],
      leadType: 'sawtooth',
      bassType: 'square'
    },
    // 5. 액션 미니게임 테마 (산불 진화, 얼음 점프 등 긴박한 145BPM)
    action: {
      bpm: 144,
      steps: 32,
      melody: [
        'C5','C5','D#5','F5','G5','-','F5','D#5','C5','-','A#4','-','C5','-','-','-',
        'G5','G5','A#5','C6','D6','-','C6','A#5','G5','-','F5','-','G5','-','-','-'
      ],
      bass: [
        'C3','C3','C3','C3','G3','G3','G3','G3','A#3','A#3','A#3','A#3','F3','F3','F3','F3',
        'C3','C3','C3','C3','D#3','D#3','D#3','D#3','F3','F3','F3','F3','G3','G3','G3','G3'
      ],
      leadType: 'square',
      bassType: 'sawtooth'
    },
    // 6. 수중/잠수 테마 (몽환적이고 청량한 바닷속 아르페지오, 85BPM)
    underwater: {
      bpm: 86,
      steps: 32,
      melody: [
        'E5','G5','B5','E6','D6','B5','G5','E5','D5','F#5','A5','D6','C6','A5','F#5','D5',
        'C5','E5','G5','C6','B5','G5','E5','C5','D5','G5','B5','D6','B5','G5','D5','-'
      ],
      bass: [
        'E3','-','-','-','B3','-','-','-','D3','-','-','-','A3','-','-','-',
        'C3','-','-','-','G3','-','-','-','G3','-','-','-','D3','-','-','-'
      ],
      leadType: 'sine',
      bassType: 'sine'
    },
    // 7. 최종 사건 범인 지목 테마 (법정 공방풍 웅장함, 125BPM)
    final: {
      bpm: 126,
      steps: 32,
      melody: [
        'D5','-','D5','F5','A5','-','G5','F5','E5','-','C5','-','E5','-','-','-',
        'F5','-','F5','G5','A5','-','A#5','A5','G5','-','E5','-','D5','-','-','-'
      ],
      bass: [
        'D3','D3','D3','D3','F3','F3','F3','F3','C3','C3','C3','C3','A3','A3','A3','A3',
        'A#3','A#3','A#3','A#3','F3','F3','F3','F3','G3','G3','A3','A3','D3','-','-','-'
      ],
      leadType: 'sawtooth',
      bassType: 'square'
    },
    // 8. 엔딩/보고서 테마 (따뜻하고 감동적인 피날레, 100BPM)
    ending: {
      bpm: 102,
      steps: 32,
      melody: [
        'C5','-','G5','-','A5','-','G5','-','F5','-','E5','-','D5','-','-','-',
        'E5','-','G5','-','C6','-','B5','-','A5','-','G5','-','C5','-','-','-'
      ],
      bass: [
        'C3','-','-','-','F3','-','-','-','C3','-','-','-','G3','-','-','-',
        'C3','-','-','-','F3','-','-','-','G3','-','-','-','C3','-','-','-'
      ],
      leadType: 'triangle',
      bassType: 'sine'
    }
  };

  var bgmBufferCache = {};

  // OfflineAudioContext를 이용해 무손실 완벽 루프 오디오 버퍼 생성
  function renderBgmBuffer(name, callback) {
    if (bgmBufferCache[name]) {
      callback(bgmBufferCache[name]);
      return;
    }

    var track = BGM_TRACKS[name];
    if (!track) {
      callback(null);
      return;
    }

    var sampleRate = ctx ? ctx.sampleRate : 44100;
    var stepDuration = (60 / track.bpm) / 4; // 16분음표 기준
    var totalSeconds = track.steps * stepDuration;
    var offlineCtx = new (window.OfflineAudioContext || window.webkitOfflineAudioContext)(2, Math.ceil(sampleRate * totalSeconds), sampleRate);

    // 멜로디 트랙 렌더링
    var leadGain = offlineCtx.createGain();
    leadGain.gain.value = 0.22;
    leadGain.connect(offlineCtx.destination);

    for (var i = 0; i < track.steps; i++) {
      var note = track.melody[i];
      if (note && note !== '-') {
        var freq = getFreq(note);
        if (freq > 0) {
          var noteStart = i * stepDuration;
          var osc = offlineCtx.createOscillator();
          var g = offlineCtx.createGain();
          osc.type = track.leadType || 'square';
          osc.frequency.setValueAtTime(freq, noteStart);

          g.gain.setValueAtTime(0, noteStart);
          g.gain.linearRampToValueAtTime(0.8, noteStart + 0.01);
          g.gain.exponentialRampToValueAtTime(0.001, noteStart + stepDuration * 1.5);

          osc.connect(g);
          g.connect(leadGain);
          osc.start(noteStart);
          osc.stop(noteStart + stepDuration * 1.6);
        }
      }
    }

    // 베이스 트랙 렌더링
    var bassGain = offlineCtx.createGain();
    bassGain.gain.value = 0.28;
    bassGain.connect(offlineCtx.destination);

    for (var j = 0; j < track.steps; j++) {
      var bNote = track.bass[j];
      if (bNote && bNote !== '-') {
        var bFreq = getFreq(bNote);
        if (bFreq > 0) {
          var bStart = j * stepDuration;
          var bOsc = offlineCtx.createOscillator();
          var bg = offlineCtx.createGain();
          bOsc.type = track.bassType || 'triangle';
          bOsc.frequency.setValueAtTime(bFreq, bStart);

          bg.gain.setValueAtTime(0, bStart);
          bg.gain.linearRampToValueAtTime(0.9, bStart + 0.015);
          bg.gain.exponentialRampToValueAtTime(0.001, bStart + stepDuration * 1.8);

          bOsc.connect(bg);
          bg.connect(bassGain);
          bOsc.start(bStart);
          bOsc.stop(bStart + stepDuration * 1.9);
        }
      }
    }

    // 드럼/비트 리듬 렌더링 (칩튠 스네어 & 킥)
    var kickGain = offlineCtx.createGain();
    kickGain.gain.value = 0.35;
    kickGain.connect(offlineCtx.destination);

    for (var k = 0; k < track.steps; k += 4) {
      var kStart = k * stepDuration;
      var kOsc = offlineCtx.createOscillator();
      var kg = offlineCtx.createGain();
      kOsc.type = 'sine';
      kOsc.frequency.setValueAtTime(130, kStart);
      kOsc.frequency.exponentialRampToValueAtTime(40, kStart + 0.08);

      kg.gain.setValueAtTime(0.9, kStart);
      kg.gain.exponentialRampToValueAtTime(0.001, kStart + 0.09);

      kOsc.connect(kg);
      kg.connect(kickGain);
      kOsc.start(kStart);
      kOsc.stop(kStart + 0.1);
    }

    offlineCtx.startRendering().then(function(renderedBuffer) {
      bgmBufferCache[name] = renderedBuffer;
      callback(renderedBuffer);
    }).catch(function(err) {
      console.warn('BGM rendering failed:', err);
      callback(null);
    });
  }

  function playBgm(name) {
    if (!name || name === currentBgmName) return;
    initContext();

    if (!ctx || !isUnlocked) {
      pendingBgmName = name;
      return;
    }

    currentBgmName = name;
    renderBgmBuffer(name, function(buffer) {
      if (!buffer) return;

      // 이전 BGM 크로스페이드 아웃
      if (currentBgm) {
        var oldBgm = currentBgm;
        var oldGain = oldBgm.gainNode;
        try {
          var t = ctx.currentTime;
          oldGain.gain.setValueAtTime(oldGain.gain.value, t);
          oldGain.gain.linearRampToValueAtTime(0.001, t + 0.6);
          setTimeout(function() {
            try { oldBgm.source.stop(); } catch (e) {}
          }, 650);
        } catch (e) {}
      }

      // 새 BGM 인스턴스 생성 및 페이드 인
      try {
        var source = ctx.createBufferSource();
        source.buffer = buffer;
        source.loop = true;

        var gainNode = ctx.createGain();
        var now = ctx.currentTime;
        gainNode.gain.setValueAtTime(0.001, now);
        gainNode.gain.linearRampToValueAtTime(1.0, now + 0.7);

        source.connect(gainNode);
        gainNode.connect(bgmGain);

        source.start(0);
        currentBgm = { source: source, gainNode: gainNode };
      } catch (e) {
        console.warn('BGM start error:', e);
      }
    });
  }

  function stopBgm(fadeSec) {
    if (!currentBgm) return;
    fadeSec = fadeSec || 0.5;
    try {
      var oldBgm = currentBgm;
      var t = ctx.currentTime;
      oldBgm.gainNode.gain.setValueAtTime(oldBgm.gainNode.gain.value, t);
      oldBgm.gainNode.linearRampToValueAtTime(0.001, t + fadeSec);
      setTimeout(function() {
        try { oldBgm.source.stop(); } catch (e) {}
      }, fadeSec * 1000 + 50);
    } catch (e) {}
    currentBgm = null;
    currentBgmName = '';
  }

  function toggleMute() {
    muted = !muted;
    try {
      localStorage.setItem('ecoDetMute', muted ? 'true' : 'false');
    } catch (e) {}
    if (masterGain && ctx) {
      masterGain.gain.setValueAtTime(muted ? 0 : 1, ctx.currentTime);
    }
    return muted;
  }

  function setVolume(bgmVal, sfxVal) {
    if (bgmVal !== undefined) {
      bgmVolume = Math.max(0, Math.min(1, bgmVal));
      if (bgmGain && ctx) bgmGain.gain.setValueAtTime(bgmVolume, ctx.currentTime);
    }
    if (sfxVal !== undefined) {
      sfxVolume = Math.max(0, Math.min(1, sfxVal));
      if (sfxGain && ctx) sfxGain.gain.setValueAtTime(sfxVolume, ctx.currentTime);
    }
  }

  // 브라우저 최초 클릭/터치 감지 시 자동 언락 등록
  function autoUnlockHandler() {
    unlock();
    window.removeEventListener('pointerdown', autoUnlockHandler);
    window.removeEventListener('keydown', autoUnlockHandler);
  }
  window.addEventListener('pointerdown', autoUnlockHandler);
  window.addEventListener('keydown', autoUnlockHandler);

  // 글로벌 API 노출
  window.Sound = {
    unlock: unlock,
    bgm: playBgm,
    stopBgm: stopBgm,
    sfx: playSfx,
    jingle: playJingle,
    toggleMute: toggleMute,
    isMuted: function() { return muted; },
    setVolume: setVolume,
    _renderTest: function(name) {
      return new Promise(function(resolve) {
        renderBgmBuffer(name, resolve);
      });
    }
  };

})(window);
