import { useState } from "react";
import sharedStyles from "../../styles/shared.module.css";
import styles from "./SettingsScreen.module.css";

const AUDIO_STORAGE_KEY = "memchwo-audio";

const MEDIA_TYPES = [
  { key: "photo", label: "📸 사진", placeholder: "이미지 URL" },
  { key: "video", label: "🎬 동영상", placeholder: "동영상 URL (mp4 등)" },
  { key: "reel", label: "📱 릴스", placeholder: "짧은 영상 URL" },
];

function getTypeLabel(type) {
  return MEDIA_TYPES.find((t) => t.key === type)?.label || type;
}

export default function SettingsScreen({ media, setMedia, onClose }) {
  const [newUrl, setNewUrl] = useState("");
  const [newType, setNewType] = useState("photo");
  const [audioUrl, setAudioUrl] = useState(() => localStorage.getItem(AUDIO_STORAGE_KEY) || "");

  const saveAudioUrl = (url) => {
    setAudioUrl(url);
    if (url.trim()) {
      localStorage.setItem(AUDIO_STORAGE_KEY, url.trim());
    } else {
      localStorage.removeItem(AUDIO_STORAGE_KEY);
    }
  };

  const addMedia = () => {
    if (newUrl.trim()) {
      setMedia((prev) => [...prev, { url: newUrl.trim(), type: newType }]);
      setNewUrl("");
    }
  };

  const removeMedia = (index) => {
    setMedia((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)));
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.container}>
        {/* Header */}
        <div className={styles.headerRow}>
          <div>
            <div className={styles.headerTitle}>설정</div>
            <div className={styles.headerSub}>감각 전환 알림 설정</div>
          </div>
          <button className={styles.closeBtn} onClick={onClose}>닫기</button>
        </div>

        {/* Explanation */}
        <div className={styles.explainBox}>
          <div className={styles.explainTitle}>🧠 감각 전환 알림이란?</div>
          <div className={styles.explainText}>
            알림이 올 때 좋아하는 사진, 동영상, 릴스와 음악을 먼저 보여줘서
            하던 일에 대한 몰입을 자연스럽게 풀어줍니다.
          </div>
        </div>

        {/* Media list */}
        <div className={styles.sectionTitle}>🎞️ 미디어</div>
        <div className={styles.sectionHint}>
          알림 시 랜덤으로 하나가 표시됩니다. 사진, 동영상, 릴스를 자유롭게 추가하세요.
        </div>

        <div className={styles.photoGrid}>
          {media.map((item, i) => (
            <div key={i} className={styles.photoItem}>
              {item.type === "photo" ? (
                <img src={item.url} alt="" className={styles.photoImg} onError={(e) => { e.target.style.display = "none"; }} />
              ) : (
                <video src={item.url} className={styles.photoImg} muted playsInline />
              )}
              <button
                className={styles.photoRemoveBtn}
                onClick={() => removeMedia(i)}
                disabled={media.length <= 1}
                style={media.length <= 1 ? { opacity: 0.3, cursor: "default" } : undefined}
              >✕</button>
              <div className={styles.photoLabel}>{getTypeLabel(item.type)}</div>
            </div>
          ))}
        </div>

        {/* Add media */}
        <div className={styles.typeRow}>
          {MEDIA_TYPES.map((mt) => (
            <button
              key={mt.key}
              className={styles.typeBtn}
              style={{
                border: `1.5px solid ${newType === mt.key ? "#E8590C" : "#ddd"}`,
                background: newType === mt.key ? "#E8590C12" : "transparent",
                color: newType === mt.key ? "#E8590C" : "#999",
                fontWeight: newType === mt.key ? 700 : 400,
              }}
              onClick={() => setNewType(mt.key)}
            >
              {mt.label}
            </button>
          ))}
        </div>

        <div className={styles.addPhotoRow}>
          <input
            value={newUrl}
            onChange={(e) => setNewUrl(e.target.value)}
            placeholder={MEDIA_TYPES.find((t) => t.key === newType)?.placeholder}
            className={sharedStyles.inputField}
            style={{ flex: 1 }}
          />
          <button
            className={styles.addPhotoBtn}
            style={{
              background: newUrl.trim() ? "#E8590C" : "#ddd",
              color: newUrl.trim() ? "#fff" : "#999",
              cursor: newUrl.trim() ? "pointer" : "default",
            }}
            onClick={addMedia}
          >
            추가
          </button>
        </div>

        {/* Music / Audio */}
        <div className={styles.sectionTitle}>🎵 음악</div>
        <div className={styles.sectionHint}>
          알림 시 재생할 음악 URL을 입력하세요. 동영상/릴스는 자체 오디오가 재생됩니다.
          비워두면 사진 표시 시 앰비언트 사운드가 자동 생성됩니다.
        </div>
        <div className={styles.addPhotoRow}>
          <input
            value={audioUrl}
            onChange={(e) => saveAudioUrl(e.target.value)}
            placeholder="음악 파일 URL (mp3, wav 등)"
            className={sharedStyles.inputField}
            style={{ flex: 1 }}
          />
        </div>
        <div className={styles.musicNote}>
          <div className={styles.musicText}>
            {audioUrl.trim()
              ? "✅ 사용자 지정 음악이 설정되었습니다."
              : "🎶 음악 미설정 시 앰비언트 사운드가 자동 재생됩니다."}
          </div>
        </div>
      </div>
    </div>
  );
}
