/**
 * 사용자가 작성한 자유 텍스트에서 시간, 장소, 연락처, 참석자, 소요시간 등을 추출한다.
 */

/**
 * 시간 추출 — "오후 3시", "15:00", "10시 30분", "오전 9시반" 등
 * @returns {{ time: string, timeMode: string, ampm: string } | null}
 */
function extractTime(text) {
  // "오전/오후 N시 (M분/반)" 패턴
  const korTime = text.match(/(?<prefix>오전|오후)\s*(?<h>\d{1,2})시\s*(?:(?<m>\d{1,2})분|반)?/);
  if (korTime) {
    let h = parseInt(korTime.groups.h, 10);
    const m = korTime.groups.m ? parseInt(korTime.groups.m, 10) : (text.includes("반") ? 30 : 0);
    const isPm = korTime.groups.prefix === "오후";
    if (isPm && h < 12) h += 12;
    if (!isPm && h === 12) h = 0;
    return {
      time: `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`,
      timeMode: "exact",
      ampm: isPm ? "pm" : "am",
    };
  }

  // "N시 (M분/반)" (오전/오후 없음)
  const simpleKor = text.match(/(?<h>\d{1,2})시\s*(?:(?<m>\d{1,2})분|반)?/);
  if (simpleKor) {
    const h = parseInt(simpleKor.groups.h, 10);
    const m = simpleKor.groups.m ? parseInt(simpleKor.groups.m, 10) : (text.match(new RegExp(simpleKor[0] + "\\s*반")) ? 30 : 0);
    if (h >= 0 && h <= 23) {
      return {
        time: `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`,
        timeMode: "exact",
        ampm: h < 12 ? "am" : "pm",
      };
    }
  }

  // "HH:MM" 패턴
  const colonTime = text.match(/\b(?<h>\d{1,2}):(?<m>\d{2})\b/);
  if (colonTime) {
    const h = parseInt(colonTime.groups.h, 10);
    const m = parseInt(colonTime.groups.m, 10);
    if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
      return {
        time: `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`,
        timeMode: "exact",
        ampm: h < 12 ? "am" : "pm",
      };
    }
  }

  // "오전" / "오후" 만 단독으로 있는 경우
  if (/오전/.test(text) && !/오후/.test(text)) {
    return { time: "09:00", timeMode: "ampm", ampm: "am" };
  }
  if (/오후/.test(text) && !/오전/.test(text)) {
    return { time: "14:00", timeMode: "ampm", ampm: "pm" };
  }

  return null;
}

/**
 * 장소 추출 — "장소: xxx", "~에서", "카페/병원/학교..." 등
 */
function extractLocation(text) {
  // "장소: xxx" 또는 "장소 xxx"
  const labelMatch = text.match(/장소[:\s]\s*(.+)/);
  if (labelMatch) return labelMatch[1].trim();

  // "~에서" 패턴 (앞의 명사구 추출)
  const atMatch = text.match(/([\w가-힣]+(?:\s[\w가-힣]+){0,3})\s*에서/);
  if (atMatch) return atMatch[1].trim();

  // 장소 키워드
  const placeKeywords = /(?:카페|스타벅스|병원|학교|사무실|회사|은행|주민센터|도서관|헬스장|마트|식당|역|공원|센터|빌딩|타워|호텔|법원|법무사|약국|편의점|미용실)/;
  const placeMatch = text.match(new RegExp(`([\\w가-힣]*${placeKeywords.source}[\\w가-힣\\s]{0,10})`));
  if (placeMatch) return placeMatch[1].trim();

  return null;
}

/**
 * 연락처 추출 — 전화번호 패턴
 */
function extractContact(text) {
  // "연락처: xxx"
  const labelMatch = text.match(/연락처[:\s]\s*(.+)/);
  if (labelMatch) return labelMatch[1].trim();

  // 전화번호 패턴: 010-1234-5678, 02-123-4567 등
  const phoneMatch = text.match(/\d{2,3}[-.\s]?\d{3,4}[-.\s]?\d{4}/);
  if (phoneMatch) return phoneMatch[0].trim();

  return null;
}

/**
 * 참석자 추출 — "참석자: xxx", "~님", "~씨"
 */
function extractAttendees(text) {
  // "참석자: xxx"
  const labelMatch = text.match(/참석자[:\s]\s*(.+)/);
  if (labelMatch) return labelMatch[1].trim();

  // "~님" 패턴 모두 수집
  const nimMatches = text.match(/[가-힣]{2,5}님/g);
  if (nimMatches && nimMatches.length > 0) {
    return [...new Set(nimMatches)].join(", ");
  }

  return null;
}

/**
 * 소요시간 추출 — "1시간", "30분", "1시간 30분"
 */
function extractDuration(text) {
  // "소요시간: xxx" 또는 "소요: xxx"
  const labelMatch = text.match(/소요(?:시간)?[:\s]\s*(.+)/);
  if (labelMatch) return labelMatch[1].trim();

  const durMatch = text.match(/(\d+시간\s*(?:\d+분)?|\d+분)/);
  if (durMatch) return durMatch[1].trim();

  return null;
}

/**
 * 담당자 추출
 */
function extractManager(text) {
  const labelMatch = text.match(/담당자?[:\s]\s*(.+)/);
  if (labelMatch) return labelMatch[1].trim();
  return null;
}

/**
 * 제목 추출 — 첫 줄에서 시간·장소·연락처 등 메타 정보를 제거하고 핵심 행동만 남긴다.
 * 예) "오후 3시에 스타벅스에서 김대리님 미팅" → "미팅"
 * 예) "내일 병원 진료 예약 010-1234-5678" → "진료 예약"
 */
function extractTitle(text) {
  const firstLine = text.split("\n")[0] || "";
  if (!firstLine.trim()) return "";

  let cleaned = firstLine;

  // 시간 패턴 제거
  cleaned = cleaned.replace(/(?:오전|오후)\s*\d{1,2}시\s*(?:\d{1,2}분|반)?/g, "");
  cleaned = cleaned.replace(/\d{1,2}시\s*(?:\d{1,2}분|반)?/g, "");
  cleaned = cleaned.replace(/\b\d{1,2}:\d{2}\b/g, "");
  cleaned = cleaned.replace(/(?:오전|오후)/g, "");

  // 장소 라벨 제거 ("장소: xxx")
  cleaned = cleaned.replace(/장소[:\s]\s*.+/g, "");

  // 연락처 제거
  cleaned = cleaned.replace(/연락처[:\s]\s*.+/g, "");
  cleaned = cleaned.replace(/\d{2,3}[-.\s]?\d{3,4}[-.\s]?\d{4}/g, "");

  // 참석자 라벨 제거
  cleaned = cleaned.replace(/참석자[:\s]\s*.+/g, "");

  // 소요시간 라벨 제거
  cleaned = cleaned.replace(/소요(?:시간)?[:\s]\s*.+/g, "");

  // 담당자 라벨 제거
  cleaned = cleaned.replace(/담당자?[:\s]\s*.+/g, "");

  // 날짜 키워드 제거
  cleaned = cleaned.replace(/(?:오늘|내일|모레|이번\s*주|다음\s*주)/g, "");

  // "~에서" 장소구 제거 (장소 키워드 포함 시)
  const placeKeywords = /(?:카페|스타벅스|병원|학교|사무실|회사|은행|주민센터|도서관|헬스장|마트|식당|역|공원|센터|빌딩|타워|호텔|법원|법무사|약국|편의점|미용실)/;
  cleaned = cleaned.replace(new RegExp(`[\\w가-힣]*${placeKeywords.source}[\\w가-힣]*\\s*에서`, "g"), "");

  // 조사·접속사 정리 ("에", "에서", "까지", "부터" 등이 앞뒤 없이 남은 경우)
  cleaned = cleaned.replace(/^\s*(?:에|에서|까지|부터|에게)\s+/g, "");

  // 연속 공백·앞뒤 공백 정리
  cleaned = cleaned.replace(/\s+/g, " ").trim();

  // 제목이 비어버리면 첫 줄 원본 사용
  return cleaned || firstLine.trim();
}

/**
 * 텍스트에서 모든 필드를 한 번에 추출
 */
export function extractFieldsFromText(text) {
  return {
    title: extractTitle(text),
    time: extractTime(text),
    location: extractLocation(text),
    contact: extractContact(text),
    attendees: extractAttendees(text),
    duration: extractDuration(text),
    manager: extractManager(text),
  };
}
