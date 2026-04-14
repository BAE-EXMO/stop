import { useState, useEffect } from "react";
import { PET_TYPES, getPetMood, getPetStage } from "../../utils/petSystem";
import { FONT_FAMILY } from "../../constants/fonts";

/**
 * 할 일 완수 시 반려동물 피드 애니메이션 오버레이
 */
export function PetFeedOverlay({ pet, petType, gained, reason, onClose }) {
  const [step, setStep] = useState(0); // 0=enter, 1=feed, 2=react
  const pt = PET_TYPES[petType];
  const mood = getPetMood(Math.min(100, pet.hp + gained));

  useEffect(() => {
    const t1 = setTimeout(() => setStep(1), 600);
    const t2 = setTimeout(() => setStep(2), 1400);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, zIndex: 1100,
      display: "flex", alignItems: "center", justifyContent: "center",
      background: "rgba(0,0,0,0.85)", backdropFilter: "blur(12px)", cursor: "pointer",
    }}>
      <style>{`
        @keyframes petBounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-20px)} }
        @keyframes foodFloat { 0%{transform:translateY(0) scale(1);opacity:1} 100%{transform:translateY(-40px) scale(0.5);opacity:0} }
        @keyframes hpPulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.15)} }
      `}</style>
      <div style={{ textAlign: "center", animation: "fadeIn 0.4s ease" }}>
        {/* 펫 */}
        <div style={{
          fontSize: 90, lineHeight: 1, marginBottom: 16,
          animation: step >= 1 ? "petBounce 0.6s ease" : "none",
        }}>
          {pt.stages[getPetStage(pet.xp)]}
        </div>

        {/* 먹이 애니메이션 */}
        {step >= 1 && (
          <div style={{ fontSize: 40, animation: "foodFloat 1s ease forwards", marginBottom: 8 }}>
            {pt.feedEmoji} +{gained}
          </div>
        )}

        {/* 기분 반응 */}
        {step >= 2 && (
          <div style={{ animation: "hpPulse 0.5s ease" }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>{mood.face}</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: mood.color, fontFamily: FONT_FAMILY, marginBottom: 6 }}>
              {mood.label}
            </div>
            <div style={{ fontSize: 14, color: "#888", fontFamily: FONT_FAMILY }}>{reason}</div>

            {/* HP 바 */}
            <div style={{
              marginTop: 16, display: "inline-flex", alignItems: "center", gap: 8,
              background: "#1a1a1a", borderRadius: 20, padding: "8px 20px",
              border: `1px solid ${mood.color}44`,
            }}>
              <span style={{ fontSize: 12, color: "#888", fontFamily: FONT_FAMILY }}>체력</span>
              <div style={{ width: 120, height: 8, background: "#333", borderRadius: 4, overflow: "hidden" }}>
                <div style={{
                  width: `${Math.min(100, pet.hp + gained)}%`, height: "100%",
                  background: mood.color, borderRadius: 4, transition: "width 0.8s ease",
                }} />
              </div>
              <span style={{ fontSize: 13, fontWeight: 800, color: mood.color, fontFamily: FONT_FAMILY }}>
                {Math.min(100, pet.hp + gained)}
              </span>
            </div>
          </div>
        )}

        {step >= 2 && (
          <div style={{ marginTop: 20, fontSize: 12, color: "#555", fontFamily: FONT_FAMILY }}>
            화면을 터치하면 닫힙니다
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * 할 일 미루기 시 반려동물 슬픈 오버레이 (2.5초 자동 닫힘)
 */
export function PetSadOverlay({ pet, petType, lost, onClose }) {
  const pt = PET_TYPES[petType];
  const mood = getPetMood(Math.max(0, pet.hp - lost));

  useEffect(() => {
    const t = setTimeout(onClose, 2500);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 1100,
      display: "flex", alignItems: "center", justifyContent: "center",
      background: "rgba(0,0,0,0.8)", backdropFilter: "blur(8px)",
    }}>
      <div style={{ textAlign: "center", animation: "fadeIn 0.3s ease" }}>
        <div style={{ fontSize: 80, lineHeight: 1, marginBottom: 12, filter: "grayscale(0.3)" }}>
          {pt.stages[getPetStage(pet.xp)]}
        </div>
        <div style={{ fontSize: 28, marginBottom: 8 }}>{mood.face}</div>
        <div style={{ fontSize: 16, fontWeight: 800, color: "#E8590C", fontFamily: FONT_FAMILY, marginBottom: 4 }}>
          {pt.name}가 힘들어해요...
        </div>
        <div style={{ fontSize: 13, color: "#888", fontFamily: FONT_FAMILY }}>
          체력 -{lost} (미루기)
        </div>

        {/* HP 바 */}
        <div style={{
          marginTop: 14, display: "inline-flex", alignItems: "center", gap: 8,
          background: "#1a1a1a", borderRadius: 20, padding: "8px 20px",
          border: "1px solid #E8590C33",
        }}>
          <span style={{ fontSize: 12, color: "#888", fontFamily: FONT_FAMILY }}>체력</span>
          <div style={{ width: 120, height: 8, background: "#333", borderRadius: 4, overflow: "hidden" }}>
            <div style={{
              width: `${Math.max(0, pet.hp - lost)}%`, height: "100%",
              background: mood.color, borderRadius: 4, transition: "width 0.6s ease",
            }} />
          </div>
          <span style={{ fontSize: 13, fontWeight: 800, color: mood.color, fontFamily: FONT_FAMILY }}>
            {Math.max(0, pet.hp - lost)}
          </span>
        </div>
      </div>
    </div>
  );
}
