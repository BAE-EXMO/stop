import { useState, useRef } from "react";
import { getDateStr } from "../../utils/dateUtils";
import { extractFieldsFromText } from "../../utils/textExtractor";
import { parseWithAI, hasAIKey } from "../../utils/aiParser";
import { CATEGORIES } from "../../constants/categories";
import useAddTaskForm from "../../hooks/useAddTaskForm";
import styles from "./AddTaskModal.module.css";

const QUICK_DATES = [
  { label: "오늘", value: getDateStr(0) },
  { label: "내일", value: getDateStr(1) },
];

export default function AddTaskModal({ onAdd, onClose, initDate }) {
  const form = useAddTaskForm({ initDate, onAdd });
  const [mode, setMode] = useState("natural"); // "natural" | "manual"
  const [nlInput, setNlInput] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  const [aiError, setAiError] = useState("");
  const recognitionRef = useRef(null);

  // ─── 음성 입력 ───
  const toggleVoice = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { setAiError("이 브라우저는 음성 인식을 지원하지 않습니다"); return; }
    const rec = new SR();
    rec.lang = "ko-KR";
    rec.continuous = true;
    rec.interimResults = true;
    rec.onresult = (e) => {
      let text = "";
      for (let i = 0; i < e.results.length; i++) text += e.results[i][0].transcript;
      setNlInput(text);
    };
    rec.onerror = () => setIsListening(false);
    rec.onend = () => setIsListening(false);
    recognitionRef.current = rec;
    rec.start();
    setIsListening(true);
  };

  // ─── AI 분석 ───
  const analyze = async () => {
    if (!nlInput.trim()) return;
    setIsAnalyzing(true);
    setAiError("");
    setAiResult(null);

    // Claude API 키가 있으면 AI, 없으면 regex 파서
    let result = null;
    if (hasAIKey()) {
      result = await parseWithAI(nlInput);
    }

    if (!result) {
      // regex 파서 폴백
      const extracted = extractFieldsFromText(nlInput);
      result = {
        title: extracted.title || nlInput.split("\n")[0].trim(),
        date: "",
        time: extracted.time?.time || "",
        location: extracted.location || "",
        phone: extracted.contact || "",
        travelTime: 20,
        category: "errand",
        deadline: "",
        prepItems: nlInput.split("\n").slice(1).filter((l) => l.trim()).map((l) => l.trim()),
        prepGuide: [],
      };
    }

    setIsAnalyzing(false);
    if (result) {
      setAiResult(result);
      // form 필드 채우기
      if (result.title) form.onNoteChange(result.title + "\n" + (result.prepItems || []).join("\n"));
      if (result.date) form.setDate(result.date);
      if (result.time) { form.setHasTime(true); form.setTimeMode("exact"); form.setTime(result.time); }
      if (result.location) form.setLocation(result.location);
      if (result.deadline) form.setDeadline(result.deadline);
    } else {
      setAiError("분석에 실패했습니다. 직접 입력으로 전환해주세요.");
      setMode("manual");
      form.onNoteChange(nlInput.trim());
    }
  };

  // ─── AI 결과 → 저장 ───
  const doAddFromAI = () => {
    if (!aiResult?.title) return;
    const pi = (aiResult.prepItems || []).map((t) => ({ text: t, done: false }));
    onAdd({
      id: Date.now(),
      title: aiResult.title,
      date: aiResult.date || form.date,
      time: aiResult.time || "",
      hasTime: !!aiResult.time,
      location: aiResult.location || "미정",
      phone: aiResult.phone || "",
      travelTime: aiResult.travelTime || 20,
      prepItems: pi.length > 0 ? pi : [],
      prepTime: 10,
      category: aiResult.category || "errand",
      deadline: aiResult.deadline || "",
      duration: "",
      contact: aiResult.phone || "",
      attendees: "",
      manager: "",
      postponeCount: 0,
      completed: false,
    });
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerTitle}>➕ 새 할 일</div>
          <div className={styles.modeTabs}>
            <button
              className={`${styles.modeTab} ${mode === "natural" ? styles.modeTabActive : ""}`}
              onClick={() => setMode("natural")}
            >🤖 AI입력</button>
            <button
              className={`${styles.modeTab} ${mode === "manual" ? styles.modeTabActive : ""}`}
              onClick={() => setMode("manual")}
            >✏️ 직접입력</button>
          </div>
        </div>

        {/* ═══ AI 자연어 모드 ═══ */}
        {mode === "natural" && !aiResult && (
          <>
            <div style={{ marginBottom: 16 }}>
              <label className={styles.label}>하고 싶은 말을 그냥 적거나 말하세요</label>
              <textarea
                value={nlInput}
                onChange={(e) => setNlInput(e.target.value)}
                placeholder={`예시:\n"내일 오후 2시에 법무사 사무실 가서 등기 서류 제출해야 돼. 신분증이랑 도장 챙겨야 해"\n\n"이번 주 금요일까지 은행 가서 서류 제출해야 함"`}
                className={styles.noteArea}
                rows={5}
                autoFocus
              />
            </div>

            {/* 음성 + 분석 버튼 */}
            <div className={styles.nlBtns}>
              <button
                onClick={toggleVoice}
                className={`${styles.voiceBtn} ${isListening ? styles.voiceBtnActive : ""}`}
              >
                {isListening ? (
                  <><span className={styles.recordDot} />말하는 중...</>
                ) : (
                  <>🎤 음성입력</>
                )}
              </button>
              <button
                onClick={analyze}
                disabled={!nlInput.trim() || isAnalyzing}
                className={styles.analyzeBtn}
                style={{
                  background: nlInput.trim() && !isAnalyzing ? "linear-gradient(135deg, #0891b2, #0e7490)" : "var(--border)",
                  color: nlInput.trim() && !isAnalyzing ? "#fff" : "var(--text-muted)",
                  cursor: nlInput.trim() && !isAnalyzing ? "pointer" : "default",
                }}
              >
                {isAnalyzing ? (
                  <><span className={styles.spinner} />분석 중...</>
                ) : (
                  <>🧠 {hasAIKey() ? "AI 분석하기" : "텍스트 분석하기"}</>
                )}
              </button>
            </div>

            {aiError && (
              <div className={styles.errorBox}>{aiError}</div>
            )}

            {/* 사용법 */}
            <div className={styles.helpBox}>
              <div className={styles.helpTitle}>💡 이렇게 입력하면 됩니다</div>
              <div className={styles.helpText}>
                • "내일 3시 치과 예약인데 보험증 챙겨야 해"<br/>
                • "이번 달 25일까지 은행 가서 서류 제출"<br/>
                • "법무사한테 등기 서류 갖다줘야 해"<br/>
                • 🎤 버튼 누르고 그냥 말해도 됩니다
              </div>
            </div>
          </>
        )}

        {/* ═══ AI 결과 프리뷰 ═══ */}
        {mode === "natural" && aiResult && (
          <>
            <div className={styles.aiSuccessBox}>
              <div className={styles.aiSuccessTitle}>✅ 분석 완료 — 아래 내용을 확인하세요</div>
              <div className={styles.aiSuccessHint}>수정이 필요하면 각 항목을 직접 고칠 수 있습니다</div>
            </div>

            {/* AI 준비 가이드 */}
            {aiResult.prepGuide?.length > 0 && (
              <div className={styles.prepGuideBox}>
                <div className={styles.prepGuideTitle}>🤖 AI 준비 가이드</div>
                {aiResult.prepGuide.map((g, i) => (
                  <div key={i} className={styles.prepGuideItem}>
                    <div className={styles.prepGuideItemTitle}>{g.item}</div>
                    <div className={styles.prepGuideDetail}>방법: {g.how}</div>
                    <div className={styles.prepGuideWhen}>시기: {g.when}</div>
                  </div>
                ))}
              </div>
            )}

            {/* 편집 가능한 필드 */}
            <div className={styles.fieldGroup}>
              <label className={styles.label}>할 일</label>
              <input value={aiResult.title} onChange={(e) => setAiResult({ ...aiResult, title: e.target.value })} className={styles.fieldInput} />
            </div>
            <div className={styles.fieldRow2}>
              <div className={styles.fieldHalf}>
                <label className={styles.label}>📅 날짜</label>
                <input type="date" value={aiResult.date || form.date} onChange={(e) => setAiResult({ ...aiResult, date: e.target.value })} className={styles.fieldInputDate} />
              </div>
              {aiResult.time && (
                <div className={styles.fieldHalf}>
                  <label className={styles.label}>⏰ 시간</label>
                  <input type="time" value={aiResult.time} onChange={(e) => setAiResult({ ...aiResult, time: e.target.value })} className={styles.fieldInputDate} />
                </div>
              )}
            </div>
            <div className={styles.fieldRow2}>
              <div className={styles.fieldHalf}>
                <label className={styles.label}>📍 장소</label>
                <input value={aiResult.location || ""} onChange={(e) => setAiResult({ ...aiResult, location: e.target.value })} className={styles.fieldInput} />
              </div>
              <div className={styles.fieldHalf}>
                <label className={styles.label}>📞 연락처</label>
                <input value={aiResult.phone || ""} onChange={(e) => setAiResult({ ...aiResult, phone: e.target.value })} className={styles.fieldInput} placeholder="전화번호" />
              </div>
            </div>
            <div className={styles.fieldRow2}>
              <div className={styles.fieldHalf}>
                <label className={styles.label}>🚗 이동(분)</label>
                <input type="number" value={aiResult.travelTime || 20} onChange={(e) => setAiResult({ ...aiResult, travelTime: Number(e.target.value) })} className={styles.fieldInput} />
              </div>
              <div className={styles.fieldHalf}>
                <label className={styles.label}>⏳ 기한</label>
                <input type="date" value={aiResult.deadline || ""} onChange={(e) => setAiResult({ ...aiResult, deadline: e.target.value })} className={styles.fieldInputDate} />
              </div>
            </div>
            <div className={styles.fieldGroup}>
              <label className={styles.label}>📋 준비물</label>
              <textarea
                value={(aiResult.prepItems || []).join("\n")}
                onChange={(e) => setAiResult({ ...aiResult, prepItems: e.target.value.split("\n").filter((l) => l.trim()) })}
                rows={3}
                className={styles.noteArea}
                style={{ minHeight: 80 }}
              />
            </div>

            {/* 카테고리 */}
            <div className={styles.fieldGroup}>
              <label className={styles.label}>카테고리</label>
              <div className={styles.catRow}>
                {Object.entries(CATEGORIES).map(([k, v]) => (
                  <button
                    key={k}
                    className={`${styles.catBtn} ${aiResult.category === k ? styles.catBtnActive : ""}`}
                    style={{
                      borderColor: aiResult.category === k ? v.color : "var(--border)",
                      background: aiResult.category === k ? v.color + "22" : "transparent",
                      color: aiResult.category === k ? v.color : "var(--text-secondary)",
                    }}
                    onClick={() => setAiResult({ ...aiResult, category: k })}
                  >
                    {v.icon} {v.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 버튼 */}
            <div className={styles.actionRow}>
              <button className={styles.resetBtn} onClick={() => { setAiResult(null); setNlInput(""); }}>↩ 다시</button>
              <button className={styles.cancelBtn} onClick={onClose}>취소</button>
              <button
                className={styles.submitBtn}
                disabled={!aiResult.title}
                style={{
                  background: aiResult.title ? "#0891b2" : "var(--border)",
                  color: aiResult.title ? "#fff" : "var(--text-muted)",
                }}
                onClick={doAddFromAI}
              >추가</button>
            </div>
          </>
        )}

        {/* ═══ 직접 입력 모드 ═══ */}
        {mode === "manual" && (
          <>
            {/* Date pills */}
            <div className={styles.datePills}>
              {QUICK_DATES.map((qd) => (
                <button
                  key={qd.value}
                  className={`${styles.datePill} ${form.date === qd.value ? styles.datePillActive : ""}`}
                  onClick={() => form.setDate(qd.value)}
                >{qd.label}</button>
              ))}
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

            {/* 시간 */}
            {form.hasTime && (
              <div className={styles.fieldRow}>
                <span className={styles.fieldIcon}>⏰</span>
                <div className={styles.timeGroup}>
                  <div className={styles.timeModeTabs}>
                    <button className={`${styles.timeModeTab} ${form.timeMode === "ampm" ? styles.timeModeTabActive : ""}`} onClick={() => form.setTimeMode("ampm")}>오전/오후</button>
                    <button className={`${styles.timeModeTab} ${form.timeMode === "exact" ? styles.timeModeTabActive : ""}`} onClick={() => form.setTimeMode("exact")}>정확한 시간</button>
                  </div>
                  {form.timeMode === "ampm" ? (
                    <div className={styles.ampmGroup}>
                      <button className={`${styles.ampmBtn} ${form.ampm === "am" ? styles.ampmBtnActive : ""}`} onClick={() => form.setAmpm("am")}>🌅 오전</button>
                      <button className={`${styles.ampmBtn} ${form.ampm === "pm" ? styles.ampmBtnActive : ""}`} onClick={() => form.setAmpm("pm")}>🌇 오후</button>
                    </div>
                  ) : (
                    <input type="time" value={form.time} onChange={(e) => form.setTime(e.target.value)} className={styles.timeInput} />
                  )}
                  <button className={styles.timeClearBtn} onClick={() => form.setHasTime(false)}>해제</button>
                </div>
              </div>
            )}

            {form.location && (
              <div className={styles.fieldRow}>
                <span className={styles.fieldIcon}>📍</span>
                <input value={form.location} onChange={(e) => form.setLocation(e.target.value)} placeholder="장소" className={styles.fieldInputInline} />
              </div>
            )}
            {form.duration && (
              <div className={styles.fieldRow}>
                <span className={styles.fieldIcon}>⏱️</span>
                <input value={form.duration} onChange={(e) => form.setDuration(e.target.value)} placeholder="소요시간" className={styles.fieldInputInline} />
              </div>
            )}
            {form.deadline && (
              <div className={styles.fieldRow}>
                <span className={styles.fieldIcon}>📅</span>
                <input type="date" value={form.deadline} onChange={(e) => form.setDeadline(e.target.value)} min={getDateStr(0)} className={styles.deadlineInput} />
              </div>
            )}
            {form.contact && (
              <div className={styles.fieldRow}>
                <span className={styles.fieldIcon}>📞</span>
                <input value={form.contact} onChange={(e) => form.setContact(e.target.value)} placeholder="연락처" className={styles.fieldInputInline} />
              </div>
            )}
            {form.attendees && (
              <div className={styles.fieldRow}>
                <span className={styles.fieldIcon}>👥</span>
                <input value={form.attendees} onChange={(e) => form.setAttendees(e.target.value)} placeholder="참석자" className={styles.fieldInputInline} />
              </div>
            )}
            {form.manager && (
              <div className={styles.fieldRow}>
                <span className={styles.fieldIcon}>👤</span>
                <input value={form.manager} onChange={(e) => form.setManager(e.target.value)} placeholder="담당자" className={styles.fieldInputInline} />
              </div>
            )}

            {/* 버튼 */}
            <div className={styles.actionRow}>
              <button className={styles.cancelBtn} onClick={onClose}>취소</button>
              <button
                className={styles.submitBtn}
                style={{
                  opacity: form.title ? 1 : 0.4,
                  cursor: form.title ? "pointer" : "default",
                }}
                onClick={form.handleSubmit}
              >저장</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
