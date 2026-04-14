import { useState, useRef, useEffect, useCallback } from "react";
import { getDateStr } from "../../utils/dateUtils";
import { extractFieldsFromText } from "../../utils/textExtractor";
import { parseWithAI, hasAIKey } from "../../utils/aiParser";
import { findSmartMatch, findHistoryMatches } from "../../utils/placeUtils";
import { CATEGORIES } from "../../constants/categories";
import { FONT_FAMILY } from "../../constants/fonts";
import useAddTaskForm from "../../hooks/useAddTaskForm";
import styles from "./AddTaskModal.module.css";

const QUICK_DATES = [
  { label: "오늘", value: getDateStr(0) },
  { label: "내일", value: getDateStr(1) },
];

const RECURRING_TYPES = [
  { key: "none", label: "없음" },
  { key: "weekly", label: "매주" },
  { key: "monthly", label: "매월" },
  { key: "yearly", label: "매년" },
];

const WEEKDAYS = ["월","화","수","목","금","토","일"];

export default function AddTaskModal({ onAdd, onClose, initDate, visitHistory = [] }) {
  const form = useAddTaskForm({ initDate, onAdd });
  const [mode, setMode] = useState("natural");
  const [nlInput, setNlInput] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  const [aiError, setAiError] = useState("");
  const [guideVisible, setGuideVisible] = useState(true);
  const [historyMatches, setHistoryMatches] = useState([]);
  const [smartMatch, setSmartMatch] = useState(null);
  const [selectedPlace, setSelectedPlace] = useState(null);
  // 반복 일정
  const [recurring, setRecurring] = useState("none");
  const [recurringDays, setRecurringDays] = useState([]); // 매주 요일
  const [recurringDate, setRecurringDate] = useState(25); // 매월 날짜
  const [recurringMonth, setRecurringMonth] = useState(1);
  const [recurringMonthDay, setRecurringMonthDay] = useState(1);

  const recognitionRef = useRef(null);
  const textareaRef = useRef(null);

  // ─── textarea 자동 확장 ───
  const autoResize = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 200) + "px";
  }, []);

  // ─── 입력 시 가이드 접힘 + 매칭 ───
  const handleNlInput = (value) => {
    setNlInput(value);
    if (value.trim()) setGuideVisible(false);
    else setGuideVisible(true);
    // 실시간 방문기록 매칭
    const hm = findHistoryMatches(value, visitHistory);
    setHistoryMatches(hm);
    const sm = findSmartMatch(value);
    setSmartMatch(sm);
  };

  useEffect(() => { autoResize(); }, [nlInput, autoResize]);

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
    rec.lang = "ko-KR"; rec.continuous = true; rec.interimResults = true;
    rec.onresult = (e) => {
      let text = "";
      for (let i = 0; i < e.results.length; i++) text += e.results[i][0].transcript;
      handleNlInput(text);
    };
    rec.onerror = () => setIsListening(false);
    rec.onend = () => setIsListening(false);
    recognitionRef.current = rec;
    rec.start();
    setIsListening(true);
  };

  // ─── 3단계 분석 파이프라인 ───
  const analyze = async () => {
    if (!nlInput.trim()) return;
    setIsAnalyzing(true);
    setAiError("");
    setAiResult(null);

    // ① 로컬 전처리: 방문기록 + 스마트DB 매칭
    const hm = findHistoryMatches(nlInput, visitHistory);
    const sm = findSmartMatch(nlInput);
    let localData = {};

    if (hm.length > 0) {
      const best = hm[0];
      localData = {
        location: best.name,
        address: best.address,
        phone: best.phone || "",
        travelTime: best.travelTime,
        category: best.category,
        prepItems: best.prep || [],
      };
    } else if (sm) {
      localData = {
        category: sm.category,
        prepItems: sm.prep || [],
      };
    }

    // ② Claude API 또는 regex 파서
    let apiResult = null;
    if (hasAIKey()) {
      apiResult = await parseWithAI(nlInput);
    }
    if (!apiResult) {
      const extracted = extractFieldsFromText(nlInput);
      apiResult = {
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

    // ③ 결과 통합 (방문기록 우선, API 보충)
    const merged = {
      ...apiResult,
      location: localData.location || apiResult.location || "",
      address: localData.address || apiResult.address || "",
      phone: localData.phone || apiResult.phone || "",
      travelTime: localData.travelTime || apiResult.travelTime || 20,
      category: localData.category || apiResult.category || "errand",
      prepItems: [...new Set([...(localData.prepItems || []), ...(apiResult.prepItems || [])])],
      prepGuide: apiResult.prepGuide || [],
    };

    setIsAnalyzing(false);
    setAiResult(merged);
    setHistoryMatches(hm);
    setSmartMatch(sm);
  };

  // ─── 장소 선택 (방문기록 카드) ───
  const selectPlace = (place) => {
    setSelectedPlace(place);
    if (aiResult) {
      setAiResult((prev) => ({
        ...prev,
        location: place.name,
        address: place.address || "",
        phone: place.phone || "",
        travelTime: place.travelTime,
        category: place.category || prev.category,
        prepItems: [...new Set([...(place.prep || []), ...(prev.prepItems || [])])],
      }));
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
      duration: "", contact: aiResult.phone || "", attendees: "", manager: "",
      postponeCount: 0, completed: false,
      recurring, recurringDays, recurringDate, recurringMonth, recurringMonthDay,
    });
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerTitle}>새 할 일</div>
          <button className={styles.headerClose} onClick={onClose}>✕</button>
        </div>

        {/* ═══ AI 자연어 모드 ═══ */}
        {mode === "natural" && !aiResult && (
          <>
            <label className={styles.label}>하고 싶은 말을 적거나 말하세요</label>
            <textarea
              ref={textareaRef}
              value={nlInput}
              onChange={(e) => handleNlInput(e.target.value)}
              placeholder={`예시:\n"내일 오후 2시에 법무사 사무실 가서 등기 서류 제출해야 돼. 신분증이랑 도장 챙겨야 해"`}
              className={styles.noteArea}
              rows={5}
              autoFocus
            />

            {/* 실시간 방문기록 매칭 힌트 */}
            {nlInput.trim() && historyMatches.length > 0 && !selectedPlace && (
              <div className={styles.matchHint}>
                <span className={styles.matchHintIcon}>⭐</span>
                <span>전에 가던 곳: <strong>{historyMatches[0].name}</strong> ({historyMatches[0].dist})</span>
              </div>
            )}

            {/* 음성 + 분석 버튼 */}
            <div className={styles.nlBtns}>
              <button onClick={toggleVoice} className={`${styles.voiceBtn} ${isListening ? styles.voiceBtnActive : ""}`}>
                {isListening ? <><span className={styles.recordDot} />말하는 중...</> : <>🎤 음성입력</>}
              </button>
              <button onClick={analyze} disabled={!nlInput.trim() || isAnalyzing} className={styles.analyzeBtn}
                style={{
                  background: nlInput.trim() && !isAnalyzing ? "linear-gradient(135deg, #0891b2, #0e7490)" : "var(--border)",
                  color: nlInput.trim() && !isAnalyzing ? "#fff" : "var(--text-muted)",
                  cursor: nlInput.trim() && !isAnalyzing ? "pointer" : "default",
                }}>
                {isAnalyzing ? <><span className={styles.spinner} />저장 중...</> : <>저장하기</>}
              </button>
            </div>

            {aiError && <div className={styles.errorBox}>{aiError}</div>}

            {/* 입력 가이드 (입력 시 접힘) */}
            {guideVisible && (
              <div className={styles.helpBox}>
                <div className={styles.helpTitle}>💡 이렇게 입력하면 됩니다</div>
                <div className={styles.helpText}>
                  • "내일 3시 치과 예약인데 보험증 챙겨야 해"<br/>
                  • "이번 달 25일까지 은행 가서 서류 제출"<br/>
                  • "법무사한테 등기 서류 갖다줘야 해"<br/>
                  • 🎤 버튼 누르고 그냥 말해도 됩니다
                </div>
              </div>
            )}
          </>
        )}

        {/* ═══ AI 결과 프리뷰 ═══ */}
        {mode === "natural" && aiResult && (
          <>
            <div className={styles.aiSuccessBox}>
              <div className={styles.aiSuccessTitle}>✅ 분석 완료 — 아래 내용을 확인하세요</div>
              <div className={styles.aiSuccessHint}>수정이 필요하면 각 항목을 직접 고칠 수 있습니다</div>
            </div>

            {/* 방문기록 매칭 카드 */}
            {historyMatches.length > 0 && (
              <div className={styles.visitCard}>
                <div className={styles.visitCardHeader}>
                  <span>⭐ 전에 가던 곳</span>
                </div>
                {historyMatches.slice(0, 2).map((place, i) => (
                  <div key={i} className={`${styles.visitCardItem} ${selectedPlace?.name === place.name ? styles.visitCardItemSelected : ""}`}>
                    <div className={styles.visitCardInfo}>
                      <div className={styles.visitCardName}>{place.name}</div>
                      <div className={styles.visitCardAddr}>{place.address}</div>
                      <div className={styles.visitCardMeta}>
                        {place.dist} · 방문 {place.visits}회
                      </div>
                    </div>
                    <button className={styles.visitCardBtn} onClick={() => selectPlace(place)}>
                      {selectedPlace?.name === place.name ? "✅ 선택됨" : "선택"}
                    </button>
                  </div>
                ))}
              </div>
            )}

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
              <input value={aiResult.title || ""} onChange={(e) => setAiResult({ ...aiResult, title: e.target.value })} className={styles.fieldInput} />
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
                <label className={styles.label}>📍 장소 {selectedPlace && <span style={{ color: "#2B8A3E", fontSize: 10 }}>⭐ 자동</span>}</label>
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
              <textarea value={(aiResult.prepItems || []).join("\n")} onChange={(e) => setAiResult({ ...aiResult, prepItems: e.target.value.split("\n").filter((l) => l.trim()) })} rows={3} className={styles.noteArea} style={{ minHeight: 80 }} />
            </div>

            {/* 카테고리 */}
            <div className={styles.fieldGroup}>
              <label className={styles.label}>카테고리</label>
              <div className={styles.catRow}>
                {Object.entries(CATEGORIES).map(([k, v]) => (
                  <button key={k} className={`${styles.catBtn} ${aiResult.category === k ? styles.catBtnActive : ""}`}
                    style={{ borderColor: aiResult.category === k ? v.color : "var(--border)", background: aiResult.category === k ? v.color + "22" : "transparent", color: aiResult.category === k ? v.color : "var(--text-secondary)" }}
                    onClick={() => setAiResult({ ...aiResult, category: k })}>{v.icon} {v.label}</button>
                ))}
              </div>
            </div>

            {/* 반복 일정 */}
            <div className={styles.fieldGroup}>
              <label className={styles.label}>🔁 반복</label>
              <div className={styles.catRow}>
                {RECURRING_TYPES.map((rt) => (
                  <button key={rt.key} className={`${styles.catBtn} ${recurring === rt.key ? styles.catBtnActive : ""}`}
                    style={{ borderColor: recurring === rt.key ? "#0891b2" : "var(--border)", background: recurring === rt.key ? "#0891b218" : "transparent", color: recurring === rt.key ? "#0891b2" : "var(--text-secondary)" }}
                    onClick={() => setRecurring(rt.key)}>{rt.label}</button>
                ))}
              </div>
              {recurring === "weekly" && (
                <div className={styles.recurringDetail}>
                  {WEEKDAYS.map((d, i) => (
                    <button key={d} className={`${styles.dayBtn} ${recurringDays.includes(i) ? styles.dayBtnActive : ""}`}
                      onClick={() => setRecurringDays((prev) => prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i])}>{d}</button>
                  ))}
                </div>
              )}
              {recurring === "monthly" && (
                <div className={styles.recurringDetail}>
                  <span className={styles.recurringLabel}>매월</span>
                  <input type="number" min={1} max={31} value={recurringDate} onChange={(e) => setRecurringDate(Number(e.target.value))} className={styles.recurringInput} />
                  <span className={styles.recurringLabel}>일</span>
                </div>
              )}
              {recurring === "yearly" && (
                <div className={styles.recurringDetail}>
                  <input type="number" min={1} max={12} value={recurringMonth} onChange={(e) => setRecurringMonth(Number(e.target.value))} className={styles.recurringInput} />
                  <span className={styles.recurringLabel}>월</span>
                  <input type="number" min={1} max={31} value={recurringMonthDay} onChange={(e) => setRecurringMonthDay(Number(e.target.value))} className={styles.recurringInput} />
                  <span className={styles.recurringLabel}>일</span>
                </div>
              )}
            </div>

            {/* 버튼 */}
            <div className={styles.actionRow}>
              <button className={styles.resetBtn} onClick={() => { setAiResult(null); setNlInput(""); setSelectedPlace(null); setGuideVisible(true); }}>↩ 다시</button>
              <button className={styles.cancelBtn} onClick={onClose}>취소</button>
              <button className={styles.submitBtn} disabled={!aiResult.title}
                style={{ background: aiResult.title ? "#0891b2" : "var(--border)", color: aiResult.title ? "#fff" : "var(--text-muted)" }}
                onClick={doAddFromAI}>추가</button>
            </div>
          </>
        )}

        {/* ═══ 직접 입력 모드 ═══ */}
        {mode === "manual" && (
          <>
            <div className={styles.datePills}>
              {QUICK_DATES.map((qd) => (
                <button key={qd.value} className={`${styles.datePill} ${form.date === qd.value ? styles.datePillActive : ""}`} onClick={() => form.setDate(qd.value)}>{qd.label}</button>
              ))}
            </div>

            <textarea ref={textareaRef} value={form.noteText} onChange={(e) => { form.onNoteChange(e.target.value); autoResize(); }}
              placeholder={"할 일을 자유롭게 적어주세요\n\n예) 오후 3시에 스타벅스에서 김대리님 미팅\n계약서 사본 2부 챙기기"}
              className={styles.noteArea} rows={5} autoFocus />
            <div className={styles.noteHint}><span className={styles.noteHintDot} />자유롭게 적으면 제목·시간·장소 등이 자동 추출됩니다</div>

            {form.title && form.noteText.trim() && (
              <div className={styles.titlePreview}>
                <span className={styles.titlePreviewLabel}>제목</span>
                <span className={styles.titlePreviewText}>{form.title}</span>
              </div>
            )}

            {/* 직접입력 방문기록 매칭 */}
            {form.noteText.trim() && (() => {
              const manualHm = findHistoryMatches(form.noteText, visitHistory);
              return manualHm.length > 0 && !form.location ? (
                <div className={styles.matchHint} onClick={() => {
                  const p = manualHm[0];
                  form.setLocation(p.name);
                }}>
                  <span className={styles.matchHintIcon}>⭐</span>
                  <span>전에 가던 곳: <strong>{manualHm[0].name}</strong> — 터치하여 자동입력</span>
                </div>
              ) : null;
            })()}

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
              <div className={styles.fieldRow}><span className={styles.fieldIcon}>📍</span><input value={form.location} onChange={(e) => form.setLocation(e.target.value)} placeholder="장소" className={styles.fieldInputInline} /></div>
            )}
            {form.duration && (
              <div className={styles.fieldRow}><span className={styles.fieldIcon}>⏱️</span><input value={form.duration} onChange={(e) => form.setDuration(e.target.value)} placeholder="소요시간" className={styles.fieldInputInline} /></div>
            )}
            {form.deadline && (
              <div className={styles.fieldRow}><span className={styles.fieldIcon}>📅</span><input type="date" value={form.deadline} onChange={(e) => form.setDeadline(e.target.value)} min={getDateStr(0)} className={styles.deadlineInput} /></div>
            )}
            {form.contact && (
              <div className={styles.fieldRow}><span className={styles.fieldIcon}>📞</span><input value={form.contact} onChange={(e) => form.setContact(e.target.value)} placeholder="연락처" className={styles.fieldInputInline} /></div>
            )}

            {/* 반복 일정 (직접입력) */}
            <div className={styles.fieldGroup} style={{ marginTop: 12 }}>
              <label className={styles.label}>🔁 반복</label>
              <div className={styles.catRow}>
                {RECURRING_TYPES.map((rt) => (
                  <button key={rt.key} className={`${styles.catBtn} ${recurring === rt.key ? styles.catBtnActive : ""}`}
                    style={{ borderColor: recurring === rt.key ? "#0891b2" : "var(--border)", background: recurring === rt.key ? "#0891b218" : "transparent", color: recurring === rt.key ? "#0891b2" : "var(--text-secondary)" }}
                    onClick={() => setRecurring(rt.key)}>{rt.label}</button>
                ))}
              </div>
              {recurring === "weekly" && (
                <div className={styles.recurringDetail}>
                  {WEEKDAYS.map((d, i) => (
                    <button key={d} className={`${styles.dayBtn} ${recurringDays.includes(i) ? styles.dayBtnActive : ""}`}
                      onClick={() => setRecurringDays((prev) => prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i])}>{d}</button>
                  ))}
                </div>
              )}
              {recurring === "monthly" && (
                <div className={styles.recurringDetail}>
                  <span className={styles.recurringLabel}>매월</span>
                  <input type="number" min={1} max={31} value={recurringDate} onChange={(e) => setRecurringDate(Number(e.target.value))} className={styles.recurringInput} />
                  <span className={styles.recurringLabel}>일</span>
                </div>
              )}
            </div>

            <div className={styles.actionRow}>
              <button className={styles.cancelBtn} onClick={onClose}>취소</button>
              <button className={styles.submitBtn} style={{ opacity: form.title ? 1 : 0.4, cursor: form.title ? "pointer" : "default" }} onClick={form.handleSubmit}>저장</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
