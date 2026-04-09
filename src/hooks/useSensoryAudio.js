import { useEffect, useRef, useState } from "react";

const AUDIO_STORAGE_KEY = "memchwo-audio";

/**
 * 감각 전환 알림용 오디오 훅.
 *
 * A. 사용자 지정 오디오 URL이 있으면 HTML5 Audio로 재생
 * B. 없으면 Web Audio API로 앰비언트 사운드 생성 (220Hz 사인파 + 호흡 변조)
 *
 * @param {boolean} shouldPlay - 재생 시작 여부
 * @returns {{ isPlaying, stop, analyserNode }}
 */
export default function useSensoryAudio(shouldPlay) {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef(null); // HTML5 Audio
  const ctxRef = useRef(null);   // AudioContext
  const analyserRef = useRef(null);
  const cleanupRef = useRef(null);

  useEffect(() => {
    if (!shouldPlay) return;

    const userAudioUrl = localStorage.getItem(AUDIO_STORAGE_KEY);

    if (userAudioUrl) {
      // ─── Approach A: User-selected audio ───
      const audio = new Audio(userAudioUrl);
      audio.loop = true;
      audio.volume = 0.6;
      audioRef.current = audio;

      audio.play().then(() => {
        setIsPlaying(true);
      }).catch(() => {
        // 자동재생 차단 — 무시
      });

      cleanupRef.current = () => {
        audio.pause();
        audio.currentTime = 0;
        audioRef.current = null;
      };
    } else {
      // ─── Approach B: Generated ambient sound (Web Audio API) ───
      try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        ctxRef.current = ctx;

        // 기본 사인파 오실레이터 (220Hz)
        const oscillator = ctx.createOscillator();
        oscillator.type = "sine";
        oscillator.frequency.value = 220;

        // "호흡" 효과를 위한 LFO (Low Frequency Oscillator)
        const lfo = ctx.createOscillator();
        lfo.type = "sine";
        lfo.frequency.value = 0.15; // 매우 느린 변조 (약 6.7초 주기)

        const lfoGain = ctx.createGain();
        lfoGain.gain.value = 0.15; // 변조 깊이

        // 메인 볼륨
        const mainGain = ctx.createGain();
        mainGain.gain.value = 0.08; // 낮은 볼륨 (배경 앰비언트)

        // 분석 노드 (시각화 바 연동용)
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 64;
        analyserRef.current = analyser;

        // 연결: LFO → lfoGain → mainGain.gain (볼륨 변조)
        lfo.connect(lfoGain);
        lfoGain.connect(mainGain.gain);

        // 연결: oscillator → mainGain → analyser → output
        oscillator.connect(mainGain);
        mainGain.connect(analyser);
        analyser.connect(ctx.destination);

        // 두 번째 약간 다른 주파수 (풍부한 사운드)
        const osc2 = ctx.createOscillator();
        osc2.type = "sine";
        osc2.frequency.value = 330; // 5도 위
        const gain2 = ctx.createGain();
        gain2.gain.value = 0.04;
        osc2.connect(gain2);
        gain2.connect(analyser);

        oscillator.start();
        lfo.start();
        osc2.start();
        setIsPlaying(true);

        cleanupRef.current = () => {
          oscillator.stop();
          lfo.stop();
          osc2.stop();
          ctx.close();
          ctxRef.current = null;
          analyserRef.current = null;
        };
      } catch {
        // Web Audio API 사용 불가 — 무시
      }
    }

    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }
      setIsPlaying(false);
    };
  }, [shouldPlay]);

  const stop = () => {
    if (cleanupRef.current) {
      cleanupRef.current();
      cleanupRef.current = null;
    }
    setIsPlaying(false);
  };

  return { isPlaying, stop, analyserNode: analyserRef.current };
}
