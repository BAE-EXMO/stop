import { useState, useEffect } from "react";

/**
 * localStorage에 자동 동기화되는 useState.
 * @param {string} key - localStorage 키
 * @param {*} defaultValue - 초기값 (함수도 가능)
 */
export default function usePersistedState(key, defaultValue) {
  const [value, setValue] = useState(() => {
    try {
      const stored = localStorage.getItem(key);
      if (stored !== null) {
        return JSON.parse(stored);
      }
    } catch {
      // parse error — fall through to default
    }
    return typeof defaultValue === "function" ? defaultValue() : defaultValue;
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // storage full or unavailable — silently ignore
    }
  }, [key, value]);

  return [value, setValue];
}
