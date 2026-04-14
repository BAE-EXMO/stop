import { useState } from "react";
import { CATEGORIES } from "../../constants/categories";
import { formatTime, subtractMinutes } from "../../utils/dateUtils";
import { calcPriority, getPriorityLabel, getDeadlineInfo } from "../../utils/priorityUtils";
import QuickActions from "../QuickActions/QuickActions";
import styles from "./TaskCard.module.css";

export default function TaskCard({ task, rank, onDelete, onComplete, onTap }) {
  const [expanded, setExpanded] = useState(false);
  const cat = CATEGORIES[task.category] || { label: "기타", color: "#888", icon: "📌" };
  const pri = calcPriority(task);
  const pl = getPriorityLabel(pri.score);
  const dl = getDeadlineInfo(task);
  const dep = task.time ? subtractMinutes(task.time, (task.travelTime || 0) + (task.prepTime || 0)) : null;

  // ─── 완료된 카드: 한 줄 축소 ───
  if (task.completed) {
    return (
      <div className={styles.doneRow}>
        <span className={styles.doneCheck}>✓</span>
        <span className={styles.doneTitle}>{task.title}</span>
        <button className={styles.deleteBtn} onClick={(e) => { e.stopPropagation(); onDelete(task.id); }}>✕</button>
      </div>
    );
  }

  // ─── 미완료 카드 ───
  const handleClick = () => {
    if (expanded) {
      onTap && onTap(task);
    } else {
      setExpanded(true);
    }
  };

  return (
    <div className={styles.card} onClick={handleClick}>
      {/* 좌측 카테고리 바 */}
      <div className={styles.leftBar} style={{ background: cat.color }} />

      {/* 기본 행: 항상 보이는 부분 */}
      <div className={styles.mainRow}>
        <div className={styles.titleBlock}>
          <div className={styles.title}>{task.title}</div>
          <div className={styles.meta}>
            <span className={styles.catLabel} style={{ color: cat.color }}>{cat.label}</span>
            {task.time && <span className={styles.timeLabel}>{task.time}</span>}
            {!task.time && <span className={styles.timeAuto}>시간미정</span>}
          </div>
        </div>
        <div className={styles.rightInfo}>
          <span className={styles.priBadge} style={{ color: pl.color, background: pl.bg }}>{pl.text}</span>
          <button className={styles.deleteBtn} onClick={(e) => { e.stopPropagation(); onDelete(task.id); }}>✕</button>
        </div>
      </div>

      {/* 마감 압박 (기본 상태에서도 표시) */}
      {dl && (
        <div className={styles.deadlineMsg} style={{ background: `${dl.color}08`, borderColor: `${dl.color}22` }}>
          <span style={{ color: dl.color }}>{dl.msg}</span>
        </div>
      )}

      {/* 펼침 상태: 상세 정보 */}
      {expanded && (
        <div className={styles.detail}>
          {task.location && task.location !== "미정" && (
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>장소</span>
              <span>{task.location}</span>
            </div>
          )}
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>이동</span>
            <span>{formatTime(task.travelTime || 0)}</span>
            {dep && <><span className={styles.detailLabel} style={{ marginLeft: 12 }}>출발</span><span>{dep}</span></>}
          </div>
          {(task.prepItems || []).length > 0 && (
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>준비물</span>
              <span>{(task.prepItems || []).length}개</span>
            </div>
          )}

          {/* 미루기 뱃지 */}
          {task.postponeCount > 0 && (
            <div className={styles.postponeMsg} style={{ color: task.postponeCount >= 2 ? "#E8590C" : "#E67700" }}>
              {task.postponeCount}번 미룸 {task.postponeCount >= 2 ? "· 지금 하면 개운해요" : ""}
            </div>
          )}

          <QuickActions task={task} size="small" />

          <button
            className={styles.completeBtn}
            onClick={(e) => { e.stopPropagation(); onComplete(task.id); }}
          >
            완료
          </button>
        </div>
      )}
    </div>
  );
}
