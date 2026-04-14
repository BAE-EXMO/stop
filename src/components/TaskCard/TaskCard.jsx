import { CATEGORIES } from "../../constants/categories";
import { formatTime, subtractMinutes } from "../../utils/dateUtils";
import { calcPriority, getPriorityLabel, getDeadlineInfo } from "../../utils/priorityUtils";
import QuickActions from "../QuickActions/QuickActions";
import styles from "./TaskCard.module.css";

export default function TaskCard({ task, rank, onDelete, onComplete, onPostpone, onAlarm, onTap }) {
  const cat = CATEGORIES[task.category] || { label: "기타", color: "#888", icon: "📌" };
  const pri = calcPriority(task);
  const pl = getPriorityLabel(pri.score);
  const dl = getDeadlineInfo(task);
  const dep = task.time ? subtractMinutes(task.time, (task.travelTime || 0) + (task.prepTime || 0)) : null;

  return (
    <div
      className={styles.card}
      data-completed={task.completed}
      onClick={() => onTap && onTap(task)}
    >
      {/* 카테고리 좌측 바 */}
      <div className={styles.leftBar} style={{ background: task.completed ? "#2B8A3E" : cat.color }} />

      {/* 상단: 우선순위 뱃지 + 삭제 */}
      <div className={styles.topRow}>
        {!task.completed && (
          <span className={styles.priBadge} style={{ color: pl.color, background: pl.bg }}>
            {pl.icon} {pl.text}
          </span>
        )}
        {task.completed && (
          <span className={styles.doneBadge}>완료</span>
        )}
        <button className={styles.deleteBtn} onClick={(e) => { e.stopPropagation(); onDelete(task.id); }}>✕</button>
      </div>

      {/* 제목 행 */}
      <div className={styles.titleRow}>
        <div
          className={styles.rankCircle}
          style={{
            background: task.completed ? "#2B8A3E18" : pl.bg,
            color: task.completed ? "#2B8A3E" : pl.color,
            borderColor: task.completed ? "#2B8A3E33" : pl.color + "33",
          }}
        >
          {task.completed ? "✓" : rank}
        </div>
        <div className={styles.titleBlock}>
          <div className={styles.title} data-completed={task.completed}>
            {task.title}
          </div>
          <div className={styles.subtitle}>
            <span className={styles.catLabel} style={{ color: cat.color }}>{cat.label}</span>
            {task.location && task.location !== "미정" && <span> · {task.location}</span>}
          </div>
        </div>
      </div>

      {/* 마감 압박 메시지 */}
      {dl && !task.completed && (
        <div
          className={styles.deadlineMsg}
          style={{
            background: dl.urgency >= 2 ? "#E0313112" : dl.urgency >= 1 ? "#E8590C12" : "#1a1a1a08",
            borderColor: dl.color + "33",
          }}
        >
          <span style={{ color: dl.color }}>{dl.msg}</span>
        </div>
      )}

      {/* 미루기 뱃지 (마감이 없을 때만) */}
      {task.postponeCount > 0 && !task.completed && !dl && (
        <div className={styles.postponeBadge}>
          <span style={{
            color: task.postponeCount >= 3 ? "#E03131" : task.postponeCount >= 2 ? "#E8590C" : "#E67700",
            background: task.postponeCount >= 3 ? "#E0313112" : task.postponeCount >= 2 ? "#E8590C12" : "#E6770012",
          }}>
            {task.postponeCount >= 3 ? `${task.postponeCount}번 미룸 · 이번엔 해봐요!` : task.postponeCount >= 2 ? `${task.postponeCount}번 미룸 · 지금 하면 개운해요` : `${task.postponeCount}번 미룸`}
          </span>
        </div>
      )}

      {/* 정보 배지 */}
      <div className={styles.infoBadges}>
        {task.time ? (
          <span className={styles.infoBadge} style={{ color: cat.color, fontWeight: 700 }}>{task.time}</span>
        ) : (
          <span className={styles.infoBadge} style={{ color: "#1C7ED6", fontWeight: 600 }}>시간미정</span>
        )}
        <span className={styles.infoBadge}>이동 {formatTime(task.travelTime || 0)}</span>
        {dep && <span className={styles.infoBadge}>출발 {dep}</span>}
        <span className={styles.infoBadge}>준비물 {(task.prepItems || []).length}개</span>
      </div>

      {/* 빠른 액션 */}
      {!task.completed && (
        <div style={{ paddingLeft: 44, marginBottom: 10 }}>
          <QuickActions task={task} size="small" />
        </div>
      )}

      {/* 완료 버튼 */}
      {!task.completed ? (
        <div className={styles.actionBtns}>
          <button
            className={styles.actionBtn}
            style={{ borderColor: "#2B8A3E44", background: "#2B8A3E11", color: "#2B8A3E" }}
            onClick={(e) => { e.stopPropagation(); onComplete(task.id); }}
          >
            완료
          </button>
        </div>
      ) : (
        <div className={styles.doneLabel}>완료됨</div>
      )}
    </div>
  );
}
