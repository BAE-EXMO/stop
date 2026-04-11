import { getDateStr } from "../../utils/dateUtils";
import useAddTaskForm from "../../hooks/useAddTaskForm";
import styles from "./AddTaskModal.module.css";

const QUICK_DATES = [
  { label: "오늘", value: getDateStr(0) },
  { label: "내일", value: getDateStr(1) },
];

export default function AddTaskModal({ onAdd, onClose, initDate }) {
  const form = useAddTaskForm({ initDate, onAdd });

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        {/* Header + Date */}
        <div className={styles.header}>
          <div className={styles.headerTitle}>새 할 일</div>
          <div className={styles.datePills}>
            {QUICK_DATES.map((qd) => (
              <button
                key={qd.value}
                className={`${styles.datePill} ${form.date === qd.value ? styles.datePillActive : ""}`}
                onClick={() => form.setDate(qd.value)}
              >
                {qd.label}
              </button>
            ))}
          </div>
          <button className={styles.headerClose} onClick={onClose}>닫기</button>
          <button
            className={styles.headerSaveBtn}
            style={{ opacity: form.title ? 1 : 0.4, cursor: form.title ? "pointer" : "default" }}
            onClick={form.handleSubmit}
          >
            저장
          </button>
        </div>

        {/* Note area */}
        <textarea
          value={form.noteText}
          onChange={(e) => form.onNoteChange(e.target.value)}
          placeholder={"할 일을 자유롭게 적어주세요\n\n예) 오후 3시에 스타벅스에서 김대리님 미팅\n계약서 사본 2부 챙기기\n인감증명서 가져가기"}
          className={styles.noteArea}
          rows={6}
          autoFocus
        />
        <div className={styles.noteHint}>
          <span className={styles.noteHintDot} />
          자유롭게 적으면 제목·시간·장소 등이 자동 추출됩니다
        </div>

        {/* 추출된 제목 미리보기 */}
        {form.title && form.noteText.trim() && (
          <div className={styles.titlePreview}>
            <span className={styles.titlePreviewLabel}>제목</span>
            <span className={styles.titlePreviewText}>{form.title}</span>
          </div>
        )}

        {/* 시간 · 장소 */}
        {form.hasTime && (
          <div className={styles.fieldRow}>
            <span className={styles.fieldIcon}>⏰</span>
            <div className={styles.timeGroup}>
              <div className={styles.timeModeTabs}>
                <button
                  className={`${styles.timeModeTab} ${form.timeMode === "ampm" ? styles.timeModeTabActive : ""}`}
                  onClick={() => form.setTimeMode("ampm")}
                >오전/오후</button>
                <button
                  className={`${styles.timeModeTab} ${form.timeMode === "exact" ? styles.timeModeTabActive : ""}`}
                  onClick={() => form.setTimeMode("exact")}
                >정확한 시간</button>
              </div>

              {form.timeMode === "ampm" ? (
                <div className={styles.ampmGroup}>
                  <button
                    className={`${styles.ampmBtn} ${form.ampm === "am" ? styles.ampmBtnActive : ""}`}
                    onClick={() => form.setAmpm("am")}
                  >🌅 오전</button>
                  <button
                    className={`${styles.ampmBtn} ${form.ampm === "pm" ? styles.ampmBtnActive : ""}`}
                    onClick={() => form.setAmpm("pm")}
                  >🌇 오후</button>
                </div>
              ) : (
                <input
                  type="time"
                  value={form.time}
                  onChange={(e) => form.setTime(e.target.value)}
                  className={styles.timeInput}
                />
              )}

              <button className={styles.timeClearBtn} onClick={() => form.setHasTime(false)}>해제</button>
            </div>
          </div>
        )}

        {form.location && (
          <div className={styles.fieldRow}>
            <span className={styles.fieldIcon}>📍</span>
            <input value={form.location} onChange={(e) => form.setLocation(e.target.value)} placeholder="장소" className={styles.fieldInput} />
          </div>
        )}

        {/* 소요시간 · 마감시한 */}
        {form.duration && (
          <div className={styles.fieldRow}>
            <span className={styles.fieldIcon}>⏱️</span>
            <input value={form.duration} onChange={(e) => form.setDuration(e.target.value)} placeholder="소요시간 (예: 1시간, 30분)" className={styles.fieldInput} />
          </div>
        )}

        {form.deadline && (
          <div className={styles.fieldRow}>
            <span className={styles.fieldIcon}>📅</span>
            <input type="date" value={form.deadline} onChange={(e) => form.setDeadline(e.target.value)} min={getDateStr(0)} className={styles.deadlineInput} />
          </div>
        )}

        {/* 연락처 · 참석자 · 담당자 */}
        {form.contact && (
          <div className={styles.fieldRow}>
            <span className={styles.fieldIcon}>📞</span>
            <input value={form.contact} onChange={(e) => form.setContact(e.target.value)} placeholder="연락처" className={styles.fieldInput} />
          </div>
        )}

        {form.attendees && (
          <div className={styles.fieldRow}>
            <span className={styles.fieldIcon}>👥</span>
            <input value={form.attendees} onChange={(e) => form.setAttendees(e.target.value)} placeholder="참석자" className={styles.fieldInput} />
          </div>
        )}

        {form.manager && (
          <div className={styles.fieldRow}>
            <span className={styles.fieldIcon}>👤</span>
            <input value={form.manager} onChange={(e) => form.setManager(e.target.value)} placeholder="담당자" className={styles.fieldInput} />
          </div>
        )}

      </div>
    </div>
  );
}
