import { CATEGORIES } from "../../constants/categories";
import { getDateStr, getDateLabel } from "../../utils/dateUtils";
import useAddTaskForm from "../../hooks/useAddTaskForm";
import PlaceSuggestions from "../PlaceSuggestions/PlaceSuggestions";
import sharedStyles from "../../styles/shared.module.css";
import styles from "./AddTaskModal.module.css";

const QUICK_DATES = [
  { label: "오늘", value: getDateStr(0) },
  { label: "내일", value: getDateStr(1) },
];

export default function AddTaskModal({ onAdd, onClose, initDate, visitHistory }) {
  const form = useAddTaskForm({ initDate, visitHistory, onAdd });

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.modalTitle}>➕ 새 할 일</div>

        {/* Title */}
        <div className={styles.fieldGroup}>
          <label className={styles.label}>할 일</label>
          <div className={styles.titleWrapper}>
            <input
              value={form.title}
              onChange={(e) => form.onTitleChange(e.target.value)}
              placeholder="예: 법무사 미팅, 인감증명서..."
              className={sharedStyles.inputField}
            />
            {form.hasSuggestions && (
              <div className={form.historyMatches.length > 0 ? styles.historyHint : styles.smartHint}>
                {form.historyMatches.length > 0 ? "⭐ 가던 곳" : "🤖 추천"}
              </div>
            )}
          </div>
        </div>

        {/* Place suggestions */}
        {form.hasSuggestions && (
          <PlaceSuggestions
            historyMatches={form.historyMatches}
            smartMatch={form.smartMatch}
            onSelect={form.onSelectPlace}
            onDismiss={() => form.setDismissed(true)}
          />
        )}

        {/* Selected place */}
        {form.selectedPlace && (
          <div className={form.isFromHistory ? styles.selectedPlaceHistory : styles.selectedPlaceNew}>
            <div style={{ fontSize: 20 }}>{form.isFromHistory ? "⭐" : "✅"}</div>
            <div style={{ flex: 1 }}>
              <div className={styles.selectedPlaceName} style={{ color: form.isFromHistory ? "#7048E8" : "#2B8A3E" }}>
                {form.selectedPlace.name}
              </div>
              <div className={styles.selectedPlaceMeta}>{form.selectedPlace.dist} · 자동입력됨</div>
            </div>
            <button className={styles.changeBtn} onClick={form.clearSelectedPlace}>변경</button>
          </div>
        )}

        {/* Date */}
        <div className={styles.fieldGroup}>
          <label className={styles.labelRow}>📅 날짜</label>
          <div className={styles.dateRow}>
            {QUICK_DATES.map((qd) => (
              <button
                key={qd.value}
                className={styles.dateBtn}
                style={{
                  border: `1.5px solid ${form.date === qd.value ? "#E8590C" : "#333"}`,
                  background: form.date === qd.value ? "#E8590C22" : "transparent",
                  color: form.date === qd.value ? "#E8590C" : "#777",
                  fontWeight: form.date === qd.value ? 800 : 500,
                }}
                onClick={() => form.setDate(qd.value)}
              >
                {qd.label}
              </button>
            ))}
          </div>
        </div>

        {/* Time */}
        <div className={styles.fieldGroup}>
          <div className={styles.timeToggleRow} style={{ marginBottom: form.hasTime ? 10 : 0 }}>
            <label className={styles.label}>⏰ 시간</label>
            <button
              className={styles.timeToggleBtn}
              style={{
                border: `1.5px solid ${form.hasTime ? "#E8590C" : "#333"}`,
                background: form.hasTime ? "#E8590C22" : "transparent",
                color: form.hasTime ? "#E8590C" : "#777",
              }}
              onClick={() => form.setHasTime(!form.hasTime)}
            >
              {form.hasTime ? "✓ 시간 지정" : "시간 없이"}
            </button>
          </div>
          {form.hasTime ? (
            <div className={styles.timeInputRow}>
              <div className={styles.timeInputItem}>
                <input
                  type="time"
                  value={form.time}
                  onChange={(e) => form.setTime(e.target.value)}
                  className={sharedStyles.dateInput}
                />
              </div>
              <div className={styles.timeInputItem}>
                <input
                  type="number"
                  value={form.travelTime}
                  onChange={(e) => form.setTravelTime(Number(e.target.value))}
                  placeholder="이동(분)"
                  className={sharedStyles.inputField}
                />
              </div>
            </div>
          ) : (
            <div className={styles.aiSortInfo}>
              <div className={styles.aiSortText}>🧠 AI가 순서를 정해드려요</div>
            </div>
          )}
        </div>

        {/* Travel time (when no time set) */}
        {!form.hasTime && (
          <div className={styles.fieldGroup}>
            <label className={styles.label}>🚗 이동 (분)</label>
            <input
              type="number"
              value={form.travelTime}
              onChange={(e) => form.setTravelTime(Number(e.target.value))}
              className={sharedStyles.inputField}
            />
          </div>
        )}

        {/* Location */}
        <div className={styles.fieldGroup}>
          <label className={styles.label}>📍 장소</label>
          <input
            value={form.location}
            onChange={(e) => form.setLocation(e.target.value)}
            placeholder="예: 강남역 위워크"
            className={sharedStyles.inputField}
          />
        </div>

        {/* Deadline */}
        <div className={styles.fieldGroup}>
          <label className={styles.label}>⏳ 기한 (선택)</label>
          <input
            type="date"
            value={form.deadline}
            onChange={(e) => form.setDeadline(e.target.value)}
            min={getDateStr(0)}
            className={sharedStyles.dateInput}
          />
          <div className={styles.deadlineHint}>기한이 있으면 마감일이 다가올수록 더 강하게 알려드려요</div>
        </div>

        {/* Category */}
        <div className={styles.fieldGroup}>
          <label className={styles.labelRow}>카테고리</label>
          <div className={styles.categoryRow}>
            {Object.entries(CATEGORIES).map(([key, cat]) => (
              <button
                key={key}
                className={styles.categoryBtn}
                style={{
                  border: `1.5px solid ${form.category === key ? cat.color : "#333"}`,
                  background: form.category === key ? cat.color + "22" : "transparent",
                  color: form.category === key ? cat.color : "#777",
                  fontWeight: form.category === key ? 700 : 400,
                }}
                onClick={() => form.setCategory(key)}
              >
                {cat.icon} {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Prep items */}
        <div className={styles.fieldGroup}>
          <label className={styles.label}>📋 준비할 것</label>
          <textarea
            value={form.prepText}
            onChange={(e) => form.setPrepText(e.target.value)}
            placeholder={"서류 준비\n신분증"}
            rows={3}
            className={sharedStyles.textareaField}
          />
        </div>

        {/* Priority preview */}
        {form.previewLabel && form.title.trim() && (
          <div
            className={styles.previewBox}
            style={{
              "--preview-border": form.previewLabel.color + "33",
              "--preview-bg": form.previewLabel.bg,
              "--preview-color": form.previewLabel.color,
            }}
          >
            <span style={{ fontSize: 20 }}>{form.previewLabel.icon}</span>
            <div className={styles.previewLabel}>
              <div className={styles.previewTitle}>AI 우선순위: {form.previewLabel.text}</div>
              <div className={styles.previewReasons}>
                {form.previewPriority.reasons.slice(0, 2).join(" · ")}
              </div>
            </div>
            <div className={styles.previewScore}>{form.previewPriority.score}</div>
          </div>
        )}

        {/* Footer buttons */}
        <div className={styles.footer}>
          <button className={styles.cancelBtn} onClick={onClose}>취소</button>
          <button
            className={styles.submitBtn}
            style={{
              background: form.title.trim() ? CATEGORIES[form.category].color : "#333",
              color: form.title.trim() ? "#fff" : "#666",
              cursor: form.title.trim() ? "pointer" : "default",
            }}
            onClick={form.handleSubmit}
          >
            {getDateLabel(form.date)}에 추가
          </button>
        </div>
      </div>
    </div>
  );
}
