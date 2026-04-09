import { CATEGORIES } from "../../constants/categories";
import { calcPriority, getPriorityLabel, getDeadlineInfo } from "../../utils/priorityUtils";
import { formatTime, subtractMinutes } from "../../utils/dateUtils";
import styles from "./TaskCard.module.css";

export default function TaskCard({ task, onAlarm, onDelete, onComplete, onPostpone, rank }) {
  const categoryInfo = CATEGORIES[task.category];
  const priority = calcPriority(task);
  const priorityLabel = getPriorityLabel(priority.score);
  const departureTime = task.time ? subtractMinutes(task.time, task.travelTime + task.prepTime) : null;
  const deadlineInfo = getDeadlineInfo(task);

  const postponeColor =
    task.postponeCount >= 3 ? "#E03131" :
    task.postponeCount >= 2 ? "#E8590C" : "#E67700";
  const postponeBg =
    task.postponeCount >= 3 ? "#E0313112" :
    task.postponeCount >= 2 ? "#E8590C12" : "#E6770012";
  const postponeMsg =
    task.postponeCount >= 3 ? `😤 ${task.postponeCount}번 미룸 — 그만 미루세요!` :
    task.postponeCount >= 2 ? `😟 ${task.postponeCount}번 미룸` :
    `⏰ ${task.postponeCount}번 미룸`;

  return (
    <div className={styles.card} data-completed={task.completed}>
      <div className={styles.categoryStripe} style={{ "--category-color": task.completed ? "#2B8A3E" : categoryInfo.color }} />

      <div className={styles.topRight}>
        {!task.completed && (
          <span className={styles.priorityBadge} style={{ "--badge-color": priorityLabel.color, "--badge-bg": priorityLabel.bg }}>
            {priorityLabel.icon} {priorityLabel.text}
          </span>
        )}
        {task.completed && <span className={styles.completedBadge}>✅ 완료</span>}
        <button className={styles.deleteBtn} onClick={() => onDelete(task.id)}>✕</button>
      </div>

      <div className={styles.header}>
        <div
          className={styles.rankBadge}
          style={{
            "--badge-bg": task.completed ? "#2B8A3E18" : priorityLabel.bg,
            "--badge-color": task.completed ? "#2B8A3E" : priorityLabel.color,
            "--badge-border": task.completed ? "#2B8A3E33" : priorityLabel.color + "33",
          }}
        >
          {task.completed ? "✓" : rank}
        </div>
        <div className={styles.titleArea}>
          <div className={styles.title} data-completed={task.completed}>
            {categoryInfo.icon} {task.title}
          </div>
          <div className={styles.location}>📍 {task.location}</div>
        </div>
      </div>

      {deadlineInfo && !task.completed && (
        <div
          className={styles.deadlineMsg}
          style={{
            "--dl-bg": deadlineInfo.urgency >= 2 ? "#E0313112" : deadlineInfo.urgency >= 1 ? "#E8590C12" : "#1a1a1a",
            "--dl-border": deadlineInfo.color + "33",
            "--dl-color": deadlineInfo.color,
          }}
        >
          <div className={styles.deadlineText}>{deadlineInfo.msg}</div>
        </div>
      )}

      {task.postponeCount > 0 && !task.completed && !deadlineInfo && (
        <div className={styles.postponeBadge}>
          <span className={styles.postponeText} style={{ "--postpone-color": postponeColor, "--postpone-bg": postponeBg }}>
            {postponeMsg}
          </span>
        </div>
      )}

      <div className={styles.metaRow}>
        {task.time ? (
          <span className={styles.metaTime} style={{ color: categoryInfo.color }}>⏰ {task.time}</span>
        ) : (
          <span className={styles.metaAi}>🧠 AI</span>
        )}
        <span>🚗 {formatTime(task.travelTime)}</span>
        {departureTime && <span>🚀 {departureTime}</span>}
        <span>📋 {task.prepItems.length}개</span>
      </div>

      {!task.completed ? (
        <div className={styles.actions}>
          <button
            className={styles.actionBtn}
            style={{ "--btn-border": categoryInfo.color + "44", "--btn-bg": categoryInfo.color + "11", "--btn-color": categoryInfo.color }}
            onClick={() => onAlarm(task)}
          >
            🔔 알림
          </button>
          <button
            className={styles.actionBtn}
            style={{ "--btn-border": "#E6770044", "--btn-bg": "#E6770011", "--btn-color": "#E67700" }}
            onClick={() => onPostpone(task.id)}
          >
            📅 내일로
          </button>
          <button
            className={styles.actionBtn}
            style={{ "--btn-border": "#2B8A3E44", "--btn-bg": "#2B8A3E11", "--btn-color": "#2B8A3E" }}
            onClick={() => onComplete(task.id)}
          >
            ✅ 완료
          </button>
        </div>
      ) : (
        <div className={styles.completedLabel}>완료됨</div>
      )}
    </div>
  );
}
