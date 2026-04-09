import { useState, useRef, useCallback } from "react";
import { getDateStr } from "../utils/dateUtils";
import { calcPriority, getPriorityLabel } from "../utils/priorityUtils";
import { findSmartMatch, findHistoryMatches } from "../utils/placeUtils";

export default function useAddTaskForm({ initDate, visitHistory, onAdd }) {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(initDate || getDateStr(0));
  const [hasTime, setHasTime] = useState(false);
  const [time, setTime] = useState("12:00");
  const [location, setLocation] = useState("");
  const [category, setCategory] = useState("errand");
  const [travelTime, setTravelTime] = useState(20);
  const [prepText, setPrepText] = useState("");
  const [deadline, setDeadline] = useState("");
  const [smartMatch, setSmartMatch] = useState(null);
  const [historyMatches, setHistoryMatches] = useState([]);
  const [dismissed, setDismissed] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [isFromHistory, setIsFromHistory] = useState(false);

  const debounceRef = useRef(null);

  const onTitleChange = useCallback(
    (value) => {
      setTitle(value);
      setDismissed(false);
      setSelectedPlace(null);

      if (debounceRef.current) clearTimeout(debounceRef.current);

      debounceRef.current = setTimeout(() => {
        const smart = findSmartMatch(value);
        const history = findHistoryMatches(value, visitHistory);
        setSmartMatch(smart);
        setHistoryMatches(history);

        if (history.length > 0) {
          setCategory(history[0].category);
        } else if (smart) {
          setCategory(smart.category);
        }
      }, 400);
    },
    [visitHistory]
  );

  const onSelectPlace = (place, fromHistory) => {
    setLocation(place.name);
    setTravelTime(place.travelTime);
    setSelectedPlace(place);
    setIsFromHistory(fromHistory);

    if (place.prep) {
      setPrepText(place.prep.join("\n"));
    } else if (smartMatch?.prep) {
      setPrepText(smartMatch.prep.join("\n"));
    }
    if (place.category) {
      setCategory(place.category);
    }
  };

  const handleSubmit = () => {
    if (!title.trim()) return;

    const prepItems = prepText
      .split("\n")
      .filter((line) => line.trim())
      .map((text) => ({ text: text.trim(), done: false }));

    onAdd({
      id: Date.now(),
      title: title.trim(),
      date,
      time: hasTime ? time : "",
      hasTime,
      location: location.trim() || "미정",
      travelTime,
      prepItems: prepItems.length > 0 ? prepItems : [{ text: "준비물 확인", done: false }],
      prepTime: 10,
      category,
      deadline,
      postponeCount: 0,
      completed: false,
    });
  };

  const clearSelectedPlace = () => {
    setSelectedPlace(null);
    setLocation("");
    setDismissed(false);
  };

  // Preview priority
  const previewTask = {
    title,
    time: hasTime ? time : "",
    date,
    travelTime,
    prepItems: prepText.split("\n").filter((l) => l.trim()),
    category,
  };
  const previewPriority = title.trim() ? calcPriority(previewTask) : null;
  const previewLabel = previewPriority ? getPriorityLabel(previewPriority.score) : null;

  const hasSuggestions = !dismissed && !selectedPlace && (historyMatches.length > 0 || smartMatch);

  return {
    // State
    title, date, hasTime, time, location, category,
    travelTime, prepText, deadline,
    smartMatch, historyMatches,
    selectedPlace, isFromHistory,
    hasSuggestions,
    previewPriority, previewLabel,

    // Setters
    setDate, setHasTime, setTime, setLocation,
    setCategory, setTravelTime, setPrepText, setDeadline,
    setDismissed,

    // Handlers
    onTitleChange, onSelectPlace, handleSubmit, clearSelectedPlace,
  };
}
