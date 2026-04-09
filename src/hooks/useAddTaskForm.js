import { useState, useMemo } from "react";
import { getDateStr } from "../utils/dateUtils";

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
  const [noteText, setNoteText] = useState("");
  const [date, setDate] = useState(initDate || getDateStr(0));
  const [hasTime, setHasTime] = useState(false);
  const [time, setTime] = useState("12:00");
  const [location, setLocation] = useState("");
  const [deadline, setDeadline] = useState("");
  const [duration, setDuration] = useState("");
  const [contact, setContact] = useState("");
  const [attendees, setAttendees] = useState("");
  const [manager, setManager] = useState("");

  const { title, rest: noteLines } = useMemo(() => parseNote(noteText), [noteText]);

  const onNoteChange = (value) => {
    setNoteText(value);
  };

  const handleSubmit = () => {
    if (!title) return;

    const prepItems = noteLines.map((text) => ({ text, done: false }));

    onAdd({
      id: Date.now(),
      title,
      date,
      time: hasTime ? time : "",
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
    noteText, title, date, hasTime, time, location, noteLines,
    deadline, duration, contact, attendees, manager,
    setDate, setHasTime, setTime, setLocation,
    setDeadline, setDuration, setContact, setAttendees, setManager,
    onNoteChange, handleSubmit,
  };
}
