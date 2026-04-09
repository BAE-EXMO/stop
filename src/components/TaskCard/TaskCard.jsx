import styles from "./TaskCard.module.css";

export default function TaskCard({ task, onDelete, onComplete, onTap }) {
  return (
    <div className={styles.row} data-completed={task.completed} onClick={() => onTap && onTap(task)}>
      <button
        className={styles.checkBtn}
        data-done={task.completed}
        onClick={(e) => { e.stopPropagation(); !task.completed && onComplete(task.id); }}
      />
      <div className={styles.title} data-completed={task.completed}>
        {task.title}
      </div>
      {task.time && (
        <span className={styles.time}>{task.time}</span>
      )}
      {task.location && task.location !== "미정" && (
        <span className={styles.location}>{task.location}</span>
      )}
      <button className={styles.deleteBtn} onClick={(e) => { e.stopPropagation(); onDelete(task.id); }}>✕</button>
    </div>
  );
}
