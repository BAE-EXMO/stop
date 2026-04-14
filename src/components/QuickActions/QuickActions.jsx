import { FONT_FAMILY } from "../../constants/fonts";
import styles from "./QuickActions.module.css";

const ACTION_RULES = [
  { keywords: ["전화","통화","콜","연락"], type: "call", icon: "📞", label: "전화하기", color: "#2B8A3E",
    getUrl: (t) => t.phone ? `tel:${t.phone.replace(/[^0-9+]/g, "")}` : (t.contact ? `tel:${t.contact.replace(/[^0-9+]/g, "")}` : null),
    guide: "전화번호를 터치하면 바로 통화가 연결됩니다" },
  { keywords: ["문자","메시지","카톡","카카오톡","답장"], type: "message", icon: "💬", label: "메시지", color: "#1C7ED6",
    getUrl: (t) => t.phone ? `sms:${t.phone.replace(/[^0-9+]/g, "")}` : (t.contact ? `sms:${t.contact.replace(/[^0-9+]/g, "")}` : null),
    guide: "터치하면 메시지 앱이 열립니다" },
  { keywords: ["송금","이체","입금","납부","경조사비","용돈"], type: "transfer", icon: "💳", label: "송금하기", color: "#7048E8",
    getUrl: () => "https://toss.me",
    guide: "토스/카카오페이로 바로 이동합니다" },
  { keywords: ["예약","부킹"], type: "reserve", icon: "📋", label: "예약하기", color: "#E8590C",
    getUrl: () => "https://m.place.naver.com",
    guide: "네이버 예약 페이지로 이동합니다" },
  { keywords: ["메일","이메일","email","회신"], type: "email", icon: "📧", label: "이메일", color: "#E67700",
    getUrl: () => "mailto:",
    guide: "이메일 앱이 열립니다" },
  { keywords: ["주문","재주문","구매","사기","구입","쇼핑"], type: "order", icon: "🛒", label: "주문하기", color: "#2B8A3E",
    getUrl: () => "https://www.coupang.com",
    guide: "쿠팡으로 바로 이동합니다" },
  { keywords: ["해지","취소","탈퇴","환불","반품"], type: "cancel", icon: "🚫", label: "해지/취소", color: "#E03131",
    getUrl: (t) => t.phone ? `tel:${t.phone.replace(/[^0-9+]/g, "")}` : (t.contact ? `tel:${t.contact.replace(/[^0-9+]/g, "")}` : null),
    guide: "고객센터로 바로 연결됩니다" },
  { keywords: ["검진","건강검진","예방접종"], type: "checkup", icon: "🏥", label: "검진 예약", color: "#2B8A3E",
    getUrl: () => "https://www.nhis.or.kr",
    guide: "국민건강보험 검진 예약 페이지로 이동합니다" },
  { keywords: ["공과금","전기세","수도세","가스비","관리비"], type: "bill", icon: "🧾", label: "납부하기", color: "#7048E8",
    getUrl: () => "https://toss.me",
    guide: "토스/카카오페이 납부로 이동합니다" },
];

/**
 * 태스크에서 빠른 액션을 감지한다.
 * @returns {Array<{ type, icon, label, color, url, guide }>} 최대 3개
 */
export function detectActions(task) {
  const l = (task.title + " " + (task.location || "")).toLowerCase();
  const actions = [];
  const seen = new Set();

  for (const rule of ACTION_RULES) {
    if (seen.has(rule.type)) continue;
    if (rule.keywords.some((k) => l.includes(k))) {
      const url = rule.getUrl(task);
      actions.push({ ...rule, url });
      seen.add(rule.type);
    }
  }

  // 전화번호가 있으면 항상 전화 액션 추가
  const phone = task.phone || task.contact;
  if (phone && !seen.has("call")) {
    actions.unshift({
      type: "call", icon: "📞", label: "전화하기", color: "#2B8A3E",
      url: `tel:${phone.replace(/[^0-9+]/g, "")}`,
      guide: "바로 통화 연결",
    });
  }

  return actions.slice(0, 3);
}

/**
 * 빠른 액션 버튼 행
 * @param {{ task, size: "small"|"normal" }} props
 */
export default function QuickActions({ task, size = "small" }) {
  const actions = detectActions(task);
  if (actions.length === 0) return null;

  const isSmall = size === "small";

  return (
    <div className={isSmall ? styles.rowSmall : styles.rowNormal}>
      {actions.map((a, i) => (
        <a
          key={i}
          href={a.url || "#"}
          onClick={(e) => {
            e.stopPropagation();
            if (!a.url) { e.preventDefault(); }
          }}
          className={isSmall ? styles.btnSmall : styles.btnNormal}
          style={{
            borderColor: a.color + "55",
            background: a.color + "15",
            color: a.color,
          }}
        >
          <span className={isSmall ? styles.iconSmall : styles.iconNormal}>{a.icon}</span>
          <span>{a.label}</span>
        </a>
      ))}
    </div>
  );
}
