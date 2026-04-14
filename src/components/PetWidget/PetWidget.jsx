import { PET_TYPES, getPetMood, getPetStage } from "../../utils/petSystem";
import { FONT_FAMILY } from "../../constants/fonts";

/**
 * 메인 화면에 표시되는 반려동물 상태 위젯
 */
export default function PetWidget({ pet, petType, onClick }) {
  const pt = PET_TYPES[petType];
  const mood = getPetMood(pet.hp);
  const stage = getPetStage(pet.xp);

  return (
    <button onClick={onClick} style={{
      width: "100%", background: "var(--card-bg)", borderRadius: 16,
      padding: "14px 18px", display: "flex", alignItems: "center", gap: 14,
      border: `1px solid ${mood.color}33`, cursor: "pointer", textAlign: "left",
    }}>
      {/* 아바타 */}
      <div style={{
        width: 48, height: 48, borderRadius: 14,
        background: `${mood.color}15`, display: "flex", alignItems: "center",
        justifyContent: "center", fontSize: 28,
        border: `1px solid ${mood.color}33`, flexShrink: 0,
      }}>
        {pt.stages[stage]}
      </div>

      {/* 정보 */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
          <span style={{ fontSize: 14, fontWeight: 800, color: "var(--text-primary)", fontFamily: FONT_FAMILY }}>
            {pet.name}
          </span>
          <span style={{ fontSize: 11, color: mood.color, fontWeight: 700, fontFamily: FONT_FAMILY }}>
            {mood.face} {mood.label}
          </span>
        </div>

        {/* HP 바 */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ flex: 1, height: 6, background: "var(--border)", borderRadius: 3, overflow: "hidden" }}>
            <div style={{
              width: `${pet.hp}%`, height: "100%",
              background: mood.color, borderRadius: 3, transition: "width 0.5s ease",
            }} />
          </div>
          <span style={{ fontSize: 11, fontWeight: 700, color: mood.color, fontFamily: FONT_FAMILY, flexShrink: 0 }}>
            {pet.hp}/100
          </span>
        </div>

        {/* 통계 */}
        <div style={{ fontSize: 10, color: "var(--text-muted)", fontFamily: FONT_FAMILY, marginTop: 3 }}>
          완수 {pet.completions}회 · 경험치 {pet.xp}
          {pet.streak > 0 && (
            <span style={{ color: "#E8590C", fontWeight: 700 }}> · 🔥 {pet.streak}일 연속</span>
          )}
        </div>
      </div>
    </button>
  );
}
