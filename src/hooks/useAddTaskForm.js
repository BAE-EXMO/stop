import { useState, useMemo, useRef } from "react";
import { getDateStr } from "../utils/dateUtils";
import { extractFieldsFromText } from "../utils/textExtractor";

/**
 * 노트 텍스트에서 첫 줄 = 제목, 나머지 줄 = 메모/준비물로 분리
 */
function parseNote(noteText) {
  const lines = noteText.split("\n");
  const title = (lines[0] || "").trim();
  const rest = lines
    .slice(1)
    .filter((l) => l.trim())
    .map((l) => l.trim());
  return { title, rest };
}

export default function useAddTaskForm({ initDate, onAdd }) {
  // 입력 시점 기준 오전/오후, 오늘/내일 자동 판별
  const now = new Date();
  const currentHour = now.getHours();
  const defaultAmpm = currentHour < 12 ? "am" : "pm";
  const defaultDate = initDate || getDateStr(0);

  const [noteText, setNoteText] = useState("");
  const [date, setDate] = useState(defaultDate);
  const [hasTime, setHasTime] = useState(false);
  const [timeMode, setTimeMode] = useState("ampm"); // "ampm" | "exact"
  const [ampm, setAmpm] = useState(defaultAmpm);
  const [time, setTime] = useState(currentHour < 12 ? "09:00" : "14:00");
  const [location, setLocation] = useState("");
  const [deadline, setDeadline] = useState("");
  const [duration, setDuration] = useState("");
  const [contact, setContact] = useState("");
  const [attendees, setAttendees] = useState("");
  const [manager, setManager] = useState("");

  // 사용자가 직접 수정한 필드는 자동 추출로 덮어쓰지 않는다
  const userEdited = useRef({});

  const { rest: noteLines } = useMemo(() => parseNote(noteText), [noteText]);
  const [extractedTitle, setExtractedTitle] = useState("");

  // 외부에서 사용할 제목: 추출된 제목 우선, 없으면 첫 줄 원본
  const title = extractedTitle || (noteText.split("\n")[0] || "").trim();

  const onNoteChange = (value) => {
    setNoteText(value);

    const extracted = extractFieldsFromText(value);

    // 제목 추출
    if (extracted.title) {
      setExtractedTitle(extracted.title);
    } else {
      setExtractedTitle("");
    }

    if (extracted.time && !userEdited.current.time) {
      setHasTime(true);
      setTimeMode(extracted.time.timeMode);
      setAmpm(extracted.time.ampm);
      setTime(extracted.time.time);
    }
    if (extracted.location && !userEdited.current.location) {
      setLocation(extracted.location);
    }
    if (extracted.contact && !userEdited.current.contact) {
      setContact(extracted.contact);
    }
    if (extracted.attendees && !userEdited.current.attendees) {
      setAttendees(extracted.attendees);
    }
    if (extracted.duration && !userEdited.current.duration) {
      setDuration(extracted.duration);
    }
    if (extracted.manager && !userEdited.current.manager) {
      setManager(extracted.manager);
    }
  };

  // 사용자가 필드를 직접 수정하면 플래그 설정
  const markEdited = (field, setter) => (value) => {
    userEdited.current[field] = true;
    setter(value);
  };

  const handleSubmit = () => {
    if (!title) return;

    const prepItems = noteLines.map((text) => ({ text, done: false }));

    onAdd({
      id: Date.now(),
      title,
      date,
      time: hasTime ? (timeMode === "exact" ? time : (ampm === "am" ? "09:00" : ampm === "pm" ? "14:00" : "")) : "",
      timeLabel: hasTime && timeMode === "ampm" && ampm ? (ampm === "am" ? "오전" : "오후") : "",
      hasTime,
      location: location.trim() || "미정",
      travelTime: 20,
      prepItems: prepItems.length > 0 ? prepItems : [],
      prepTime: 10,
      category: "errand",
      deadline,
      duration: duration.trim(),
      contact: contact.trim(),
      attendees: attendees.trim(),
      manager: manager.trim(),
      postponeCount: 0,
      completed: false,
    });
  };

  return {
    noteText, title, date, hasTime, timeMode, ampm, time, location, noteLines,
    deadline, duration, contact, attendees, manager,
    setDate, setHasTime, setTimeMode, setAmpm,
    setTime: markEdited("time", setTime),
    setLocation: markEdited("location", setLocation),
    setDeadline, setDuration: markEdited("duration", setDuration),
    setContact: markEdited("contact", setContact),
    setAttendees: markEdited("attendees", setAttendees),
    setManager: markEdited("manager", setManager),
    onNoteChange, handleSubmit,
  };
}
