import { getDateStr } from "./dateUtils";

const API_KEY_STORAGE = "memchwo-claude-api-key";

/**
 * Claude API를 사용하여 자연어 텍스트를 구조화된 태스크 데이터로 변환한다.
 * API 키가 없으면 null을 반환하여 regex 파서로 폴백한다.
 *
 * @param {string} text
 * @returns {Promise<object|null>}
 */
export async function parseWithAI(text) {
  const apiKey = localStorage.getItem(API_KEY_STORAGE);
  if (!apiKey) return null;

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        system: `You parse Korean natural language task descriptions into structured JSON. Today is ${getDateStr(0)}. User lives in 하남시 미사동. Return ONLY valid JSON, no markdown, no backticks. Format:
{"title":"short title","date":"YYYY-MM-DD or empty","time":"HH:MM or empty","location":"place name or empty","phone":"phone number or empty","travelTime":minutes_number,"category":"work|health|social|study|errand","deadline":"YYYY-MM-DD or empty","prepItems":["item1","item2"],"prepGuide":[{"item":"item name","how":"how to get/do it","when":"when to prepare"}]}
For dates: 오늘=${getDateStr(0)}, 내일=${getDateStr(1)}. Extract all details from the text. If something is not mentioned, use empty string or reasonable defaults. Always suggest relevant prepItems and prepGuide based on the task type.`,
        messages: [{ role: "user", content: text }],
      }),
    });
    const data = await res.json();
    const raw = data.content.map((c) => c.text || "").join("");
    return JSON.parse(raw.replace(/```json|```/g, "").trim());
  } catch (e) {
    console.error("AI parse error:", e);
    return null;
  }
}

/**
 * Claude API 키가 설정되어 있는지 확인한다.
 */
export function hasAIKey() {
  return !!localStorage.getItem(API_KEY_STORAGE);
}

/**
 * Claude API 키를 저장한다.
 */
export function setAIKey(key) {
  if (key && key.trim()) {
    localStorage.setItem(API_KEY_STORAGE, key.trim());
  } else {
    localStorage.removeItem(API_KEY_STORAGE);
  }
}

/**
 * 저장된 API 키를 반환한다 (마스킹된 형태).
 */
export function getAIKeyMasked() {
  const key = localStorage.getItem(API_KEY_STORAGE);
  if (!key) return "";
  return key.slice(0, 10) + "..." + key.slice(-4);
}
