import { getDateStr } from "../utils/dateUtils";

/**
 * 샘플 task 목록 생성 (호출 시점의 날짜 기준)
 */
function getTestTime(offsetMin = 2) {
  const now = new Date();
  now.setMinutes(now.getMinutes() + offsetMin);
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
}

export function createSampleTasks() {
  return [
    {
      id: 999,
      title: "⚡ 알람 테스트 — 2분 후 트리거",
      time: getTestTime(2),
      date: getDateStr(0),
      location: "테스트 장소",
      travelTime: 0,
      prepTime: 0,
      prepItems: [
        { text: "감각전환 화면 확인", done: false },
        { text: "모달 표시 확인", done: false },
      ],
      category: "work",
      hasTime: true,
      deadline: getDateStr(0),
      postponeCount: 0,
      completed: false,
    },
    {
      id: 1,
      title: "법무사 미팅",
      time: "10:00",
      date: getDateStr(0),
      location: "법무사 김정호 사무실",
      travelTime: 12,
      prepItems: [
        { text: "등기 서류 준비", done: false },
        { text: "신분증 지참", done: false },
        { text: "도장 챙기기", done: false },
      ],
      prepTime: 15,
      category: "work",
      hasTime: true,
      deadline: getDateStr(0),
      postponeCount: 0,
      completed: false,
    },
    {
      id: 2,
      title: "인감증명서 발급",
      time: "",
      date: getDateStr(0),
      location: "하남시 미사1동 주민센터",
      travelTime: 8,
      prepItems: [
        { text: "신분증 챙기기", done: false },
        { text: "인감도장 지참", done: false },
      ],
      prepTime: 10,
      category: "errand",
      hasTime: false,
      deadline: getDateStr(1),
      postponeCount: 1,
      completed: false,
    },
    {
      id: 3,
      title: "은행 서류 제출",
      time: "",
      date: getDateStr(0),
      location: "국민은행 미사역지점",
      travelTime: 8,
      prepItems: [
        { text: "신분증", done: false },
        { text: "서류 준비", done: false },
      ],
      prepTime: 10,
      category: "errand",
      hasTime: false,
      deadline: getDateStr(0),
      postponeCount: 2,
      completed: false,
    },
    {
      id: 4,
      title: "헬스장",
      time: "",
      date: getDateStr(0),
      location: "애니타임피트니스 미사역점",
      travelTime: 10,
      prepItems: [
        { text: "운동복", done: false },
        { text: "물통 준비", done: false },
      ],
      prepTime: 10,
      category: "health",
      hasTime: false,
      deadline: "",
      postponeCount: 0,
      completed: false,
    },
    {
      id: 5,
      title: "토익 스터디",
      time: "13:00",
      date: getDateStr(1),
      location: "스타벅스 미사역점",
      travelTime: 6,
      prepItems: [
        { text: "교재", done: false },
        { text: "오답노트", done: false },
      ],
      prepTime: 15,
      category: "study",
      hasTime: true,
      deadline: "",
      postponeCount: 0,
      completed: false,
    },
  ];
}
