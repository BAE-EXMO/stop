/**
 * 사용자가 작성한 자유 텍스트에서 시간, 장소, 연락처, 참석자, 소요시간, 제목 등을 추출한다.
 *
 * 핵심 원칙: 서술문에서 "행동 동사 + 핵심 목적어"만 제목으로 추출하고,
 * 나머지(시간, 장소, 사람, 전화번호, 날짜)는 각각의 필드로 분리한다.
 */

// ─── 행동 키워드 (제목의 핵심이 되는 동사/명사) ───
const ACTION_KEYWORDS = [
  "미팅", "회의", "면접", "상담", "진료", "예약", "발급", "제출", "납부", "이체",
  "수령", "방문", "출장", "등기", "서류", "계약", "신청", "접수", "검진", "치료",
  "수업", "강의", "스터디", "공부", "시험", "면허", "갱신", "연장", "해지", "취소",
  "운동", "헬스", "수영", "필라테스", "요가", "산책",
  "장보기", "쇼핑", "주문", "배송", "택배", "세탁", "세차", "청소",
  "전화", "통화", "연락", "문자", "메일", "송금",
  "생일", "기념일", "선물", "파티",
];

// ─── 장소 키워드 ───
const PLACE_KEYWORDS = [
  "카페", "스타벅스", "투썸", "이디야", "병원", "치과", "한의원", "약국",
  "학교", "대학교", "사무실", "회사", "오피스", "은행", "주민센터", "구청", "시청",
  "도서관", "헬스장", "피트니스", "마트", "이마트", "홈플러스", "코스트코",
  "식당", "레스토랑", "역", "터미널", "공항", "공원", "센터",
  "빌딩", "타워", "아파트", "호텔", "법원", "법무사", "세무서",
  "편의점", "미용실", "네일", "우체국", "세탁소", "세차장",
  "교회", "성당", "절", "학원",
];

const PLACE_RE = new RegExp(`([\\w가-힣]*(?:${PLACE_KEYWORDS.join("|")})[\\w가-힣\\s]{0,8})`, "g");
const PLACE_SINGLE_RE = new RegExp(`([\\w가-힣]*(?:${PLACE_KEYWORDS.join("|")})[\\w가-힣\\s]{0,8})`);

/**
 * 시간 추출
 */
function extractTime(text) {
  const korTime = text.match(/(?<prefix>오전|오후)\s*(?<h>\d{1,2})시\s*(?:(?<m>\d{1,2})분|반)?/);
  if (korTime) {
    let h = parseInt(korTime.groups.h, 10);
    const m = korTime.groups.m ? parseInt(korTime.groups.m, 10) : (text.includes("반") ? 30 : 0);
    const isPm = korTime.groups.prefix === "오후";
    if (isPm && h < 12) h += 12;
    if (!isPm && h === 12) h = 0;
    return { time: `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`, timeMode: "exact", ampm: isPm ? "pm" : "am" };
  }

  const simpleKor = text.match(/(?<h>\d{1,2})시\s*(?:(?<m>\d{1,2})분|반)?/);
  if (simpleKor) {
    const h = parseInt(simpleKor.groups.h, 10);
    const m = simpleKor.groups.m ? parseInt(simpleKor.groups.m, 10) : 0;
    if (h >= 0 && h <= 23) {
      return { time: `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`, timeMode: "exact", ampm: h < 12 ? "am" : "pm" };
    }
  }

  const colonTime = text.match(/\b(?<h>\d{1,2}):(?<m>\d{2})\b/);
  if (colonTime) {
    const h = parseInt(colonTime.groups.h, 10);
    const m = parseInt(colonTime.groups.m, 10);
    if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
      return { time: `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`, timeMode: "exact", ampm: h < 12 ? "am" : "pm" };
    }
  }

  if (/오전/.test(text) && !/오후/.test(text)) return { time: "09:00", timeMode: "ampm", ampm: "am" };
  if (/오후/.test(text) && !/오전/.test(text)) return { time: "14:00", timeMode: "ampm", ampm: "pm" };

  return null;
}

/**
 * 장소 추출
 */
function extractLocation(text) {
  const labelMatch = text.match(/장소[:\s]\s*(.+)/);
  if (labelMatch) return labelMatch[1].trim();

  // "~에서" 패턴
  const atMatch = text.match(/([\w가-힣]+(?:\s[\w가-힣]+){0,3})\s*에서/);
  if (atMatch) return atMatch[1].trim();

  // "~에" + 장소 키워드
  const atMatch2 = text.match(/([\w가-힣]+(?:\s[\w가-힣]+){0,3})\s*에\b/);
  if (atMatch2 && PLACE_KEYWORDS.some((k) => atMatch2[1].includes(k))) return atMatch2[1].trim();

  // 장소 키워드 단독
  const placeMatch = text.match(PLACE_SINGLE_RE);
  if (placeMatch) return placeMatch[1].trim();

  return null;
}

/**
 * 연락처 추출
 */
function extractContact(text) {
  const labelMatch = text.match(/연락처[:\s]\s*(.+)/);
  if (labelMatch) return labelMatch[1].trim();
  const phoneMatch = text.match(/\d{2,3}[-.\s]?\d{3,4}[-.\s]?\d{4}/);
  if (phoneMatch) return phoneMatch[0].trim();
  return null;
}

/**
 * 사람 이름 추출 — "김대리님", "박과장", "이선생님", "김정호 법무사" 등
 */
function extractPerson(text) {
  // "~님", "~씨" 패턴
  const nimMatch = text.match(/([가-힣]{2,5}(?:님|씨))/g);
  if (nimMatch) return [...new Set(nimMatch)].join(", ");

  // "김/이/박/최 + 직함" 패턴
  const titleMatch = text.match(/([가-힣]{1,3})\s*(?:대리|과장|부장|차장|사장|대표|팀장|실장|선생|교수|원장|사무관|법무사|세무사|회계사|변호사|의사)/g);
  if (titleMatch) return [...new Set(titleMatch)].join(", ");

  return null;
}

/**
 * 참석자 추출
 */
function extractAttendees(text) {
  const labelMatch = text.match(/참석자[:\s]\s*(.+)/);
  if (labelMatch) return labelMatch[1].trim();
  return extractPerson(text);
}

/**
 * 소요시간 추출
 */
function extractDuration(text) {
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
 * 날짜 표현 추출 — "오늘", "내일", "모레", "이번 주 금요일", "4월 20일" 등
 */
function extractDateExpr(text) {
  const datePatterns = [
    /오늘/, /내일/, /모레/,
    /이번\s*주\s*[월화수목금토일]요일/,
    /다음\s*주\s*[월화수목금토일]요일/,
    /\d{1,2}월\s*\d{1,2}일/,
    /\d{4}[-./]\d{1,2}[-./]\d{1,2}/,
  ];
  for (const p of datePatterns) {
    const m = text.match(p);
    if (m) return m[0];
  }
  return null;
}

/**
 * 제목 추출 — 서술문에서 메타 정보를 모두 제거하고 "핵심 행동"만 남긴다.
 *
 * 전략:
 *  1. 시간, 날짜, 전화번호, 장소("~에서"), 사람("~님") 패턴을 제거
 *  2. 접속 조사("가서", "해야", "하고", "인데") 뒤의 행동 키워드를 찾아 제목 후보로 사용
 *  3. 행동 키워드가 없으면 정제된 텍스트에서 앞 5단어를 사용
 */
function extractTitle(text) {
  const firstLine = (text.split("\n")[0] || "").trim();
  if (!firstLine) return "";

  let cleaned = firstLine;

  // 시간 패턴 제거
  cleaned = cleaned.replace(/(?:오전|오후)\s*\d{1,2}시\s*(?:\d{1,2}분|반)?/g, "");
  cleaned = cleaned.replace(/\d{1,2}시\s*(?:\d{1,2}분|반)?/g, "");
  cleaned = cleaned.replace(/\b\d{1,2}:\d{2}\b/g, "");

  // 날짜 키워드 제거
  cleaned = cleaned.replace(/(?:오늘|내일|모레|이번\s*주\s*[월화수목금토일]?요?일?|다음\s*주\s*[월화수목금토일]?요?일?)/g, "");
  cleaned = cleaned.replace(/\d{1,2}월\s*\d{1,2}일/g, "");

  // 전화번호 제거
  cleaned = cleaned.replace(/\d{2,3}[-.\s]?\d{3,4}[-.\s]?\d{4}/g, "");

  // "~에서" 장소구 제거
  cleaned = cleaned.replace(/[\w가-힣]+(?:\s[\w가-힣]+){0,3}\s*에서/g, "");

  // 장소 키워드 + "에/가서/로" 제거
  const placeWithParticle = new RegExp(`[\\w가-힣]*(?:${PLACE_KEYWORDS.join("|")})[\\w가-힣]*\\s*(?:에|가서|로|까지)`, "g");
  cleaned = cleaned.replace(placeWithParticle, "");

  // 사람 이름("~님", "~씨", 직함) 제거
  cleaned = cleaned.replace(/[가-힣]{1,3}\s*(?:대리|과장|부장|차장|사장|대표|팀장|실장|선생|교수|원장|법무사|세무사|회계사|변호사|의사)(?:님)?/g, "");
  cleaned = cleaned.replace(/[가-힣]{2,5}(?:님|씨)/g, "");

  // 라벨 패턴 제거
  cleaned = cleaned.replace(/(?:장소|연락처|참석자|소요(?:시간)?|담당자?)[:\s]\s*.+/g, "");

  // 오전/오후 단독 제거
  cleaned = cleaned.replace(/(?:오전|오후)/g, "");

  // 불필요한 접속 표현 제거
  cleaned = cleaned.replace(/\s*(?:해야\s*(?:돼|됩니다|해|함|합니다)?|해야\s*하는데|하러|갖다줘야\s*(?:돼|해|함)?)\s*/g, " ");
  cleaned = cleaned.replace(/\s*(?:가서|가야|갔다가|들러서|들러)\s*/g, " ");
  cleaned = cleaned.replace(/\s*(?:인데|이고|하고|그리고|이랑|랑|도)\s*/g, " ");
  cleaned = cleaned.replace(/\s*(?:번호는?|전화번호는?|전화는?)\s*/g, " ");

  // "~을/를/이/가" 등 조사가 앞에 남은 경우
  cleaned = cleaned.replace(/^\s*(?:을|를|이|가|에|에서|까지|부터|에게|한테)\s+/g, "");

  // 연속 공백 정리
  cleaned = cleaned.replace(/\s+/g, " ").trim();

  // 제목이 너무 길면 (5단어 초과) 앞 5단어만 사용
  const words = cleaned.split(" ");
  if (words.length > 5) {
    cleaned = words.slice(0, 5).join(" ");
  }

  // 제목이 비어버리면 행동 키워드로 복구 시도
  if (!cleaned) {
    for (const kw of ACTION_KEYWORDS) {
      if (firstLine.includes(kw)) {
        cleaned = kw;
        break;
      }
    }
  }

  // 그래도 비어있으면 첫 줄에서 앞 3단어
  if (!cleaned) {
    cleaned = firstLine.split(/\s+/).slice(0, 3).join(" ");
  }

  return cleaned;
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
