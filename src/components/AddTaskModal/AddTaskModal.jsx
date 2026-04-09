import { getDateStr, getDateLabel } from "../../utils/dateUtils";
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
        </div>

        {/* Note area */}
        <textarea
          value={form.noteText}
          onChange={(e) => form.onNoteChange(e.target.value)}
          placeholder={"할 일을 자유롭게 적어주세요\n\n예) 법무사 미팅\n인감증명서 가져가기\n계약서 사본 2부"}
          className={styles.noteArea}
          rows={6}
          autoFocus
        />
        <div className={styles.noteHint}>
          <span className={styles.noteHintDot} />
          첫 줄이 제목, 아래 줄은 상세 내용이 됩니다
        </div>

        {/* 시간 · 장소 */}
        <div className={styles.fieldRow}>
          <span className={styles.fieldIcon}>⏰</span>
          {form.hasTime ? (
            <div className={styles.timeGroup}>
              <input
                type="time"
                value={form.time}
                onChange={(e) => form.setTime(e.target.value)}
                className={styles.timeInput}
              />
              <button className={styles.timeClearBtn} onClick={() => form.setHasTime(false)}>해제</button>
            </div>
          ) : (
            <button className={styles.fieldBtn} onClick={() => form.setHasTime(true)}>시간 설정</button>
          )}
        </div>

        <div className={styles.fieldRow}>
          <span className={styles.fieldIcon}>📍</span>
          <input value={form.location} onChange={(e) => form.setLocation(e.target.value)} placeholder="장소" className={styles.fieldInput} />
        </div>

        {/* 소요시간 · 마감시한 */}
        <div className={styles.fieldRow}>
          <span className={styles.fieldIcon}>⏱️</span>
          <input value={form.duration} onChange={(e) => form.setDuration(e.target.value)} placeholder="소요시간 (예: 1시간, 30분)" className={styles.fieldInput} />
        </div>

        <div className={styles.fieldRow}>
          <span className={styles.fieldIcon}>📅</span>
          <input type="date" value={form.deadline} onChange={(e) => form.setDeadline(e.target.value)} min={getDateStr(0)} className={styles.deadlineInput} />
          {!form.deadline && <span className={styles.deadlinePlaceholder}>마감시한</span>}
        </div>

        {/* 연락처 · 참석자 · 담당자 */}
        <div className={styles.fieldRow}>
          <span className={styles.fieldIcon}>📞</span>
          <input value={form.contact} onChange={(e) => form.setContact(e.target.value)} placeholder="연락처" className={styles.fieldInput} />
        </div>

        <div className={styles.fieldRow}>
          <span className={styles.fieldIcon}>👥</span>
          <input value={form.attendees} onChange={(e) => form.setAttendees(e.target.value)} placeholder="참석자" className={styles.fieldInput} />
        </div>

        <div className={styles.fieldRow}>
          <span className={styles.fieldIcon}>👤</span>
          <input value={form.manager} onChange={(e) => form.setManager(e.target.value)} placeholder="담당자" className={styles.fieldInput} />
        </div>

        {/* Submit */}
        <div className={styles.footer}>
          <button
            className={styles.submitBtn}
            style={{ opacity: form.title ? 1 : 0.4, cursor: form.title ? "pointer" : "default" }}
            onClick={form.handleSubmit}
          >
            {getDateLabel(form.date)}에 추가
          </button>
        </div>
      </div>
    </div>
  );
}
