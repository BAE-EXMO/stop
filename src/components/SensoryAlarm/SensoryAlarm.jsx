import { useState, useEffect } from "react";
import { CATEGORIES } from "../../constants/categories";
import useSensoryAudio from "../../hooks/useSensoryAudio";
import styles from "./SensoryAlarm.module.css";

export default function SensoryAlarm({ task, media, onFinish }) {
  const [picked] = useState(() => {
    if (!media || media.length === 0) return null;
    return media[Math.floor(Math.random() * media.length)];
  });

  const [countdownSec, setCountdownSec] = useState(10);
  const [particles] = useState(() =>
    Array.from({ length: 20 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: 4 + Math.random() * 12,
      duration: 3 + Math.random() * 4,
      delay: Math.random() * 2,
      opacity: 0.3 + Math.random() * 0.5,
    }))
  );

  const categoryInfo = CATEGORIES[task.category];

  // 미디어가 동영상/릴스이면 자체 오디오 사용, 사진이면 앰비언트 재생
  const isVideo = picked && (picked.type === "video" || picked.type === "reel");
  const [playing, setPlaying] = useState(true);
  const { stop: stopAudio } = useSensoryAudio(!isVideo && playing);

  // 10초 카운트다운 후 자동 종료
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdownSec((c) => {
        if (c <= 1) {
          clearInterval(timer);
          setPlaying(false);
          stopAudio();
          onFinish();
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => {
      clearInterval(timer);
      stopAudio();
    };
  }, [onFinish, stopAudio]);

  // 미디어 배경 렌더
  const renderBackground = () => {
    if (!picked) return null;

    if (picked.type === "video" || picked.type === "reel") {
      return (
        <video
          className={styles.backgroundVideo}
          src={picked.url}
          autoPlay
          muted={false}
          loop
          playsInline
        />
      );
    }

    // photo (기본)
    return (
      <div
        className={styles.backgroundPhoto}
        style={{ backgroundImage: `url(${picked.url})` }}
      />
    );
  };

  return (
    <div className={styles.phase1}>
      {renderBackground()}

      {particles.map((p) => (
        <div
          key={p.id}
          className={styles.particle}
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            background: `radial-gradient(circle, rgba(255,255,255,${p.opacity}), transparent)`,
            animation: `floatUp ${p.duration}s ease-in-out ${p.delay}s infinite`,
            "--particle-opacity": p.opacity,
          }}
        />
      ))}

      <div className={styles.pulseRing} />
      <div className={styles.pulseRingDelayed} />

      <div className={styles.phase1Content}>
        <div className={styles.musicBars}>
          {Array.from({ length: 12 }, (_, i) => (
            <div
              key={i}
              className={styles.musicBar}
              style={{
                background: `linear-gradient(to top, ${categoryInfo.color}, rgba(255,255,255,0.8))`,
                height: `${20 + Math.random() * 80}%`,
                animation: `musicBar${i % 3} ${0.4 + Math.random() * 0.6}s ease-in-out infinite alternate`,
              }}
            />
          ))}
        </div>

        <div className={styles.pauseLabel}>🎵 잠시 멈추세요</div>
        <div className={styles.phase1Title}>
          {categoryInfo.icon} {task.title}
        </div>
        <div className={styles.countdown}>{countdownSec}초 후 상세 정보가 표시됩니다</div>

        <button className={styles.skipBtn} onClick={() => { setPlaying(false); stopAudio(); onFinish(); }}>
          바로 확인하기 →
        </button>
      </div>
    </div>
  );
}
