import { useState } from "react";
import sharedStyles from "../../styles/shared.module.css";
import styles from "./SettingsScreen.module.css";

const AUDIO_STORAGE_KEY = "memchwo-audio";

export default function SettingsScreen({ photos, setPhotos, onClose }) {
  const [newUrl, setNewUrl] = useState("");
  const [audioUrl, setAudioUrl] = useState(() => localStorage.getItem(AUDIO_STORAGE_KEY) || "");

  const saveAudioUrl = (url) => {
    setAudioUrl(url);
    if (url.trim()) {
      localStorage.setItem(AUDIO_STORAGE_KEY, url.trim());
    } else {
      localStorage.removeItem(AUDIO_STORAGE_KEY);
    }
  };

  const addPhoto = () => {
    if (newUrl.trim()) {
      setPhotos((prev) => [...prev, newUrl.trim()]);
      setNewUrl("");
    }
  };

  const removePhoto = (index) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
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
            알림이 올 때 좋아하는 사진과 음악을 먼저 보여줘서, 하던 일에 대한 몰입을 자연스럽게 풀어줍니다.
            연구에 따르면 개인적으로 의미 있는 긍정적 자극이 현재 작업에서 주의를 전환하는 데 가장 효과적입니다.
          </div>
        </div>

        {/* Photos */}
        <div className={styles.sectionTitle}>📸 좋아하는 사진</div>
        <div className={styles.sectionHint}>
          알림 시 랜덤으로 하나가 표시됩니다. 가족사진, 여행사진, 반려동물 등 개인적으로 의미 있는 사진이 효과적이에요.
        </div>

        <div className={styles.photoGrid}>
          {photos.map((url, i) => (
            <div key={i} className={styles.photoItem}>
              <img
                src={url}
                alt=""
                className={styles.photoImg}
                onError={(e) => { e.target.style.display = "none"; }}
              />
              <button className={styles.photoRemoveBtn} onClick={() => removePhoto(i)}>✕</button>
              <div className={styles.photoLabel}>사진 {i + 1}</div>
            </div>
          ))}
        </div>

        <div className={styles.addPhotoRow}>
          <input
            value={newUrl}
            onChange={(e) => setNewUrl(e.target.value)}
            placeholder="사진 URL 입력"
            className={sharedStyles.inputField}
            style={{ flex: 1 }}
          />
          <button
            className={styles.addPhotoBtn}
            style={{
              background: newUrl.trim() ? "#E8590C" : "#333",
              color: newUrl.trim() ? "#fff" : "#666",
              cursor: newUrl.trim() ? "pointer" : "default",
            }}
            onClick={addPhoto}
          >
            추가
          </button>
        </div>

        {/* Music / Audio */}
        <div className={styles.sectionTitle}>🎵 좋아하는 음악</div>
        <div className={styles.sectionHint}>
          알림 시 재생할 음악 URL을 입력하세요. 비워두면 자동으로 부드러운 앰비언트 사운드가 생성됩니다.
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
              ? "✅ 사용자 지정 음악이 설정되었습니다. 알림 시 이 음악이 재생됩니다."
              : "🎶 음악이 설정되지 않으면 Web Audio API로 생성된 앰비언트 사운드(220Hz + 330Hz 하모닉)가 자동 재생됩니다."}
          </div>
        </div>
      </div>
    </div>
  );
}
