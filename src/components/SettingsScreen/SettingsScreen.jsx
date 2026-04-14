import { useState, useRef } from "react";
import sharedStyles from "../../styles/shared.module.css";
import styles from "./SettingsScreen.module.css";
import { PET_TYPES, getPetMood, getPetStage } from "../../utils/petSystem";

const AUDIO_STORAGE_KEY = "memchwo-audio";

const MEDIA_TYPES = [
  { key: "photo", label: "📸 사진", placeholder: "이미지 URL" },
  { key: "video", label: "🎬 동영상", placeholder: "동영상 URL (mp4 등)" },
  { key: "reel", label: "📱 릴스", placeholder: "짧은 영상 URL" },
];

function getTypeLabel(type) {
  return MEDIA_TYPES.find((t) => t.key === type)?.label || type;
}

export default function SettingsScreen({ media, setMedia, pet, setPet, petType, setPetType, onClose }) {
  const [newUrl, setNewUrl] = useState("");
  const [newType, setNewType] = useState("photo");
  const [audioUrl, setAudioUrl] = useState(() => localStorage.getItem(AUDIO_STORAGE_KEY) || "");
  const [editingPetName, setEditingPetName] = useState(false);
  const [petNameInput, setPetNameInput] = useState(pet?.name || "");
  const [hasChanges, setHasChanges] = useState(false);
  const markChanged = () => setHasChanges(true);

  const savePetName = () => {
    if (setPet) setPet((p) => ({ ...p, name: petNameInput.trim() || p.name }));
    setEditingPetName(false);
    markChanged();
  };

  const saveAudioUrl = (url) => {
    setAudioUrl(url);
    if (url.trim()) {
      localStorage.setItem(AUDIO_STORAGE_KEY, url.trim());
    } else {
      localStorage.removeItem(AUDIO_STORAGE_KEY);
    }
    markChanged();
  };

  const addMedia = () => {
    if (newUrl.trim()) {
      setMedia((prev) => [...prev, { url: newUrl.trim(), type: newType }]);
      setNewUrl("");
      markChanged();
    }
  };

  const removeMedia = (index) => {
    setMedia((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)));
    markChanged();
  };

  const handlePetTypeChange = (type) => {
    setPetType(type);
    markChanged();
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
          <button className={styles.closeBtn} onClick={onClose} style={hasChanges ? { background: "linear-gradient(135deg, #0891b2, #0e7490)", color: "#fff", border: "none" } : undefined}>
            {hasChanges ? "설정완료" : "닫기"}
          </button>
        </div>

        {/* Explanation */}
        <div className={styles.explainBox}>
          <div className={styles.explainTitle}>🧠 감각 전환 알림이란?</div>
          <div className={styles.explainText}>
            알림이 올 때 좋아하는 사진, 동영상, 릴스와 음악을 먼저 보여줘서
            하던 일에 대한 몰입을 자연스럽게 풀어줍니다.
          </div>
        </div>

        {/* Pet Section */}
        {pet && (
          <>
            <div className={styles.sectionTitle}>🐾 내 반려동물</div>
            <div className={styles.petCard}>
              <div className={styles.petCardTop}>
                <div className={styles.petAvatar}>
                  {PET_TYPES[petType]?.stages[getPetStage(pet.xp)]}
                </div>
                <div className={styles.petInfo}>
                  {editingPetName ? (
                    <div style={{ display: "flex", gap: 6 }}>
                      <input
                        value={petNameInput}
                        onChange={(e) => setPetNameInput(e.target.value)}
                        className={sharedStyles.inputField}
                        style={{ flex: 1, fontSize: 14 }}
                      />
                      <button onClick={savePetName} className={styles.petNameSaveBtn}>저장</button>
                    </div>
                  ) : (
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span className={styles.petName}>{pet.name}</span>
                      <button onClick={() => setEditingPetName(true)} className={styles.petNameEditBtn}>이름 변경</button>
                    </div>
                  )}
                  <div className={styles.petStats}>
                    완수 {pet.completions}회 · 경험치 {pet.xp} · {getPetMood(pet.hp).label}
                  </div>
                </div>
              </div>
              <div className={styles.petHpRow}>
                <span className={styles.petHpLabel}>체력</span>
                <div className={styles.petHpBar}>
                  <div className={styles.petHpFill} style={{ width: `${pet.hp}%`, background: getPetMood(pet.hp).color }} />
                </div>
                <span className={styles.petHpValue} style={{ color: getPetMood(pet.hp).color }}>{pet.hp}</span>
              </div>
            </div>

            <div className={styles.sectionHint} style={{ marginTop: 12 }}>반려동물 종류 변경</div>
            <div className={styles.petTypeGrid}>
              {Object.entries(PET_TYPES).map(([k, v]) => (
                <button
                  key={k}
                  className={styles.petTypeBtn}
                  style={{
                    borderColor: petType === k ? "#0891b2" : "var(--border)",
                    background: petType === k ? "#0891b215" : "transparent",
                  }}
                  onClick={() => handlePetTypeChange(k)}
                >
                  <div style={{ fontSize: 28, marginBottom: 4 }}>{v.emoji}</div>
                  <div style={{
                    fontSize: 12, fontWeight: petType === k ? 800 : 500,
                    color: petType === k ? "#0891b2" : "var(--text-secondary)",
                  }}>{v.name}</div>
                </button>
              ))}
            </div>

            <div className={styles.explainBox} style={{ marginTop: 16 }}>
              <div className={styles.explainTitle}>🐾 반려동물 시스템</div>
              <div className={styles.explainText}>
                할 일을 완수하면 반려동물에게 먹이를 줄 수 있어요. 미루면 반려동물이 힘들어집니다.<br/>
                • 완수 → 체력 +10~+20 (미루지 않으면 보너스!)<br/>
                • 미루기 → 체력 -8<br/>
                • 3번 미뤘지만 결국 완수 → 체력 +25 (역전승!)<br/>
                • 5일 연속 완수 → 체력 +30 + 진화!
              </div>
            </div>
          </>
        )}

        {/* Media list */}
        <div className={styles.sectionTitle} style={{ marginTop: 24 }}>🎞️ 미디어</div>
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
