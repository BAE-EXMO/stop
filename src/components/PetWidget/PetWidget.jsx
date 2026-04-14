import { PET_TYPES, getPetMood, getPetStage } from "../../utils/petSystem";
import { FONT_FAMILY } from "../../constants/fonts";
import styles from "./PetWidget.module.css";

/**
 * 메인 화면에 표시되는 반려동물 상태 위젯
 * HP에 따라 펫 표정 애니메이션이 달라짐
 */
export default function PetWidget({ pet, petType, onClick }) {
  const pt = PET_TYPES[petType];
  const mood = getPetMood(pet.hp);
  const stage = getPetStage(pet.xp);

  // HP에 따른 애니메이션 클래스
  let animClass = styles.animIdle;
  if (pet.hp >= 81) animClass = styles.animHappy;
  else if (pet.hp >= 61) animClass = styles.animContent;
  else if (pet.hp >= 41) animClass = styles.animIdle;
  else if (pet.hp >= 21) animClass = styles.animSad;
  else animClass = styles.animCry;

  return (
    <button className={styles.widget} onClick={onClick} style={{ borderColor: `${mood.color}33` }}>
      {/* 펫 아바타 (크게) */}
      <div className={styles.avatarArea}>
        <div className={`${styles.avatar} ${animClass}`} style={{ background: `${mood.color}10`, borderColor: `${mood.color}22` }}>
          <span className={styles.petEmoji}>{pt.stages[stage]}</span>
        </div>
        {/* 기분 표정 말풍선 */}
        <div className={styles.moodBubble} style={{ background: `${mood.color}15`, borderColor: `${mood.color}33` }}>
          <span className={styles.moodFace}>{mood.face}</span>
        </div>
      </div>

      {/* 정보 */}
      <div className={styles.info}>
        <div className={styles.nameRow}>
          <span className={styles.name}>{pet.name}</span>
          <span className={styles.moodLabel} style={{ color: mood.color }}>{mood.label}</span>
        </div>

        {/* HP 바 */}
        <div className={styles.hpRow}>
          <div className={styles.hpTrack}>
            <div className={styles.hpFill} style={{ width: `${pet.hp}%`, background: mood.color }} />
          </div>
          <span className={styles.hpText} style={{ color: mood.color }}>{pet.hp}</span>
        </div>

        {/* 통계 */}
        <div className={styles.stats}>
          완수 {pet.completions}회 · 경험치 {pet.xp}
          {pet.streak > 0 && (
            <span className={styles.streak}> · {pet.streak}일 연속</span>
          )}
        </div>
      </div>
    </button>
  );
}
