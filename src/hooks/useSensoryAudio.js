import { useEffect, useRef, useState, useCallback } from "react";

const AUDIO_STORAGE_KEY = "memchwo-audio";

// 피아노 화음 주파수 (C4-E4-G4, 따뜻한 톤)
const PIANO_FREQUENCIES = [261.63, 329.63, 392.0];

/**
 * 감각 전환 알림용 오디오 훅.
 *
 * A. 사용자 지정 오디오 URL이 있으면 HTML5 Audio로 재생 (볼륨 페이드인/아웃)
 * B. 없으면 Web Audio API로 피아노 화음 (C-E-G) 생성
 *
 * @param {boolean} shouldPlay - 재생 시작 여부
 * @returns {{ isPlaying, stop, fadeOut, analyserNode }}
 */
export default function useSensoryAudio(shouldPlay) {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef(null);
  const ctxRef = useRef(null);
  const gainRef = useRef(null);
  const analyserRef = useRef(null);
  const cleanupRef = useRef(null);
  const fadeTimeoutRef = useRef(null);

  useEffect(() => {
    if (!shouldPlay) return;

    const userAudioUrl = localStorage.getItem(AUDIO_STORAGE_KEY);

    if (userAudioUrl) {
      // ─── Approach A: User-selected audio with fade-in ───
      const audio = new Audio(userAudioUrl);
      audio.loop = true;
      audio.volume = 0;
      audioRef.current = audio;

      audio.play().then(() => {
        setIsPlaying(true);
        // 볼륨 페이드인: 0 → 0.7 → 1.0 (1초)
        const startTime = performance.now();
        const fadeIn = () => {
          const elapsed = performance.now() - startTime;
          const progress = Math.min(elapsed / 1000, 1);
          // 70% → 100% 구간
          audio.volume = 0.7 + progress * 0.3;
          if (progress < 1) {
            fadeTimeoutRef.current = requestAnimationFrame(fadeIn);
          }
        };
        // 즉시 70%로 점프 후 서서히 100%
        audio.volume = 0.7;
        fadeTimeoutRef.current = requestAnimationFrame(fadeIn);
      }).catch(() => {
        // 자동재생 차단 — 무시
      });

      cleanupRef.current = () => {
        if (fadeTimeoutRef.current) cancelAnimationFrame(fadeTimeoutRef.current);
        audio.pause();
        audio.currentTime = 0;
        audioRef.current = null;
      };
    } else {
      // ─── Approach B: Piano chord (C4-E4-G4) with Web Audio API ───
      try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        ctxRef.current = ctx;

        const mainGain = ctx.createGain();
        mainGain.gain.setValueAtTime(0, ctx.currentTime);
        // 볼륨 페이드인: 0 → 0.08 (1초)
        mainGain.gain.linearRampToValueAtTime(0.08, ctx.currentTime + 1);
        gainRef.current = mainGain;

        const analyser = ctx.createAnalyser();
        analyser.fftSize = 64;
        analyserRef.current = analyser;

        mainGain.connect(analyser);
        analyser.connect(ctx.destination);

        const oscillators = [];

        // 피아노 화음 생성 (C4, E4, G4)
        for (const freq of PIANO_FREQUENCIES) {
          const osc = ctx.createOscillator();
          osc.type = "sine";
          osc.frequency.value = freq;

          const oscGain = ctx.createGain();
          oscGain.gain.value = 0.4; // 각 오실레이터 볼륨 균등 분배

          osc.connect(oscGain);
          oscGain.connect(mainGain);
          osc.start();
          oscillators.push(osc);
        }

        // "호흡" 효과를 위한 LFO
        const lfo = ctx.createOscillator();
        lfo.type = "sine";
        lfo.frequency.value = 0.15;
        const lfoGain = ctx.createGain();
        lfoGain.gain.value = 0.02;
        lfo.connect(lfoGain);
        lfoGain.connect(mainGain.gain);
        lfo.start();

        setIsPlaying(true);

        cleanupRef.current = () => {
          for (const osc of oscillators) {
            try { osc.stop(); } catch { /* already stopped */ }
          }
          try { lfo.stop(); } catch { /* already stopped */ }
          ctx.close();
          ctxRef.current = null;
          gainRef.current = null;
          analyserRef.current = null;
        };
      } catch {
        // Web Audio API 사용 불가
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

  /**
   * 볼륨을 duration(ms) 동안 0으로 페이드아웃한 뒤 정지.
   */
  const fadeOut = useCallback((duration = 1000) => {
    if (audioRef.current) {
      const audio = audioRef.current;
      const startVol = audio.volume;
      const startTime = performance.now();
      const fade = () => {
        const elapsed = performance.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        audio.volume = startVol * (1 - progress);
        if (progress < 1) {
          fadeTimeoutRef.current = requestAnimationFrame(fade);
        } else {
          audio.pause();
          audio.currentTime = 0;
          audioRef.current = null;
          setIsPlaying(false);
        }
      };
      fadeTimeoutRef.current = requestAnimationFrame(fade);
    } else if (ctxRef.current && gainRef.current) {
      const ctx = ctxRef.current;
      const gain = gainRef.current;
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + duration / 1000);
      setTimeout(() => {
        if (cleanupRef.current) {
          cleanupRef.current();
          cleanupRef.current = null;
        }
        setIsPlaying(false);
      }, duration);
    } else {
      setIsPlaying(false);
    }
  }, []);

  const stop = useCallback(() => {
    if (fadeTimeoutRef.current) cancelAnimationFrame(fadeTimeoutRef.current);
    if (cleanupRef.current) {
      cleanupRef.current();
      cleanupRef.current = null;
    }
    setIsPlaying(false);
  }, []);

  return { isPlaying, stop, fadeOut, analyserNode: analyserRef.current };
}
