import { useState, useEffect, useRef, useCallback } from "react";

function getDateStr(o = 0) { const d = new Date(); d.setDate(d.getDate() + o); return d.toISOString().slice(0, 10); }
function getDateLabel(ds) {
  const t = getDateStr(0), tm = getDateStr(1);
  if (ds === t) return "오늘"; if (ds === tm) return "내일";
  const d = new Date(ds), wd = ["일","월","화","수","목","금","토"];
  return `${d.getMonth()+1}/${d.getDate()} (${wd[d.getDay()]})`;
}
const F = "'Noto Sans KR', sans-serif";
function fmtTime(m) { const h = Math.floor(m/60), r = m%60; return h > 0 ? `${h}시간${r>0?" "+r+"분":""}` : `${m}분`; }
function subMin(ts, m) { const [h,mi]=ts.split(":").map(Number); let t=h*60+mi-m; if(t<0)t+=1440; return `${String(Math.floor(t/60)).padStart(2,"0")}:${String(t%60).padStart(2,"0")}`; }

// Priority
const PR = { biz:["인감증명서","등본","여권","주민센터","은행","우체국","법무사","등기","구청","면허"], appt:["치과","병원","미팅","회의","면접","상담"], urg:["마감","급한","오늘까지","제출","납부"], flex:["운동","헬스","카페","마트","장보기","세탁","세차","미용실","공부"] };
function calcPri(t) {
  const l=t.title.toLowerCase(); let s=50,r=[];
  if(t.time&&t.time!==""){const[h]=t.time.split(":").map(Number);s+=30+(24-h);r.push("⏰ 시간 지정");}
  if(PR.biz.some(k=>l.includes(k))){s+=25;r.push("🏛️ 영업시간 제한");}
  if(PR.appt.some(k=>l.includes(k))){s+=20;r.push("📋 예약/약속");}
  if(PR.urg.some(k=>l.includes(k))){s+=35;r.push("🔥 긴급");}
  if(PR.flex.some(k=>l.includes(k))){s-=10;r.push("🌿 유연");}
  if(t.date===getDateStr(0)){s+=15;r.push("📅 오늘");}
  return{score:Math.min(100,Math.max(0,s)),reasons:r};
}
function priLabel(s) {
  if(s>=80) return{text:"지금 바로",color:"#E03131",bg:"#E0313118",icon:"🔴"};
  if(s>=60) return{text:"오전 중",color:"#E8590C",bg:"#E8590C18",icon:"🟠"};
  if(s>=40) return{text:"오후 가능",color:"#E67700",bg:"#E6770018",icon:"🟡"};
  return{text:"여유 있음",color:"#2B8A3E",bg:"#2B8A3E18",icon:"🟢"};
}

// Default favorite photos (Unsplash placeholder URLs for demo)
const DEFAULT_PHOTOS = [
  "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800&h=600&fit=crop",
  "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=800&h=600&fit=crop",
  "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&h=600&fit=crop",
  "https://images.unsplash.com/photo-1518837695005-2083093ee35b?w=800&h=600&fit=crop",
];

const HISTORY = [
  { name:"법무사 김정호 사무실", address:"경기 하남시 미사강변대로 505, 3층", dist:"차량 12분", travelTime:12, keywords:["법무사","등기"], visits:5, lastVisit:"2026-03-25", category:"work", prep:["등기 서류 준비","신분증 지참","도장 챙기기","계약서 사본 준비"] },
  { name:"애니타임피트니스 미사역점", address:"경기 하남시 미사강변대로 220", dist:"도보 10분", travelTime:10, keywords:["헬스","운동","헬스장"], visits:42, lastVisit:"2026-04-07", category:"health", prep:["운동복 챙기기","물통 준비","이어폰 충전","수건"] },
  { name:"국민은행 미사역지점", address:"경기 하남시 미사강변대로 215", dist:"도보 8분", travelTime:8, keywords:["은행","통장","계좌"], visits:8, lastVisit:"2026-04-01", category:"errand", prep:["신분증","통장","도장"] },
  { name:"하남시 미사1동 주민센터", address:"경기 하남시 미사강변한강로 135", dist:"도보 8분", travelTime:8, keywords:["주민센터","인감","등본","인감증명서"], visits:4, lastVisit:"2026-03-10", category:"errand", prep:["신분증","인감도장","수수료 준비"] },
  { name:"스타벅스 미사역점", address:"경기 하남시 미사강변대로 205", dist:"도보 6분", travelTime:6, keywords:["카페","커피","스타벅스"], visits:15, lastVisit:"2026-04-06", category:"social", prep:["노트북 충전기","이어폰"] },
];

const SMART_DB = [
  { keywords:["인감증명서","인감"], search:"주민센터", category:"errand", prep:["신분증","인감도장","수수료(600원)"], placeName:"주민센터" },
  { keywords:["헬스","운동","헬스장"], search:"헬스장", category:"health", prep:["운동복","물통","이어폰","수건"], placeName:"헬스장" },
  { keywords:["은행","통장"], search:"은행", category:"errand", prep:["신분증","통장","도장"], placeName:"은행" },
  { keywords:["법무사","등기"], search:"법무사", category:"work", prep:["등기 서류","신분증","도장","계약서"], placeName:"법무사" },
  { keywords:["카페","커피"], search:"카페", category:"social", prep:["노트북 충전기","이어폰"], placeName:"카페" },
  { keywords:["마트","장보기"], search:"마트", category:"errand", prep:["장바구니","살 것 목록"], placeName:"마트" },
  { keywords:["미용실","헤어","머리"], search:"미용실", category:"errand", prep:["스타일 사진","예약시간 확인"], placeName:"미용실" },
];
const SIM_PLACES = {
  "주민센터":[{name:"하남시 미사2동 주민센터",address:"경기 하남시 미사강변중앙로 190",dist:"도보 12분",travelTime:12}],
  "헬스장":[{name:"스포애니 하남미사점",address:"경기 하남시 미사강변중앙로 50",dist:"도보 15분",travelTime:15}],
  "법무사":[{name:"하남종합법무사사무소",address:"경기 하남시 미사대로 310",dist:"차량 8분",travelTime:8}],
  "은행":[{name:"신한은행 하남미사점",address:"경기 하남시 미사강변중앙로 100",dist:"도보 10분",travelTime:10}],
  "카페":[{name:"투썸플레이스 하남미사점",address:"경기 하남시 미사강변중앙로 80",dist:"도보 8분",travelTime:8}],
  "마트":[{name:"이마트 하남점",address:"경기 하남시 미사대로 750",dist:"차량 8분",travelTime:8}],
};
function findSmart(t){const l=t.toLowerCase().trim();if(!l)return null;for(const e of SMART_DB){for(const k of e.keywords){if(l.includes(k))return e;}}return null;}
function findHist(t,h){const l=t.toLowerCase().trim();if(!l)return[];return h.filter(x=>x.keywords.some(k=>l.includes(k))||x.name.toLowerCase().includes(l)).sort((a,b)=>b.visits-a.visits);}
const CATS={work:{label:"업무",color:"#E8590C",icon:"💼"},health:{label:"건강",color:"#2B8A3E",icon:"💪"},social:{label:"약속",color:"#7048E8",icon:"🎉"},study:{label:"공부",color:"#1C7ED6",icon:"📚"},errand:{label:"용무",color:"#E67700",icon:"🏃"}};

// Deadline pressure messages
function getDeadlineInfo(task) {
  if (!task.deadline) return null;
  const today = getDateStr(0);
  const dl = task.deadline;
  const daysLeft = Math.floor((new Date(dl) - new Date(today)) / 86400000);
  const postponed = task.postponeCount || 0;
  let msg = "", color = "", urgency = 0;
  if (daysLeft < 0) { msg = `⛔ 기한 ${Math.abs(daysLeft)}일 초과! 즉시 처리하세요`; color = "#E03131"; urgency = 3; }
  else if (daysLeft === 0) { msg = "🔥 오늘이 마감입니다! 더 이상 미룰 수 없습니다"; color = "#E03131"; urgency = 3; }
  else if (daysLeft === 1) { msg = "⚠️ 내일이 마감입니다. 오늘 반드시 처리하세요"; color = "#E8590C"; urgency = 2; }
  else if (daysLeft <= 3) { msg = `📅 마감까지 ${daysLeft}일 남았습니다`; color = "#E67700"; urgency = 1; }
  else { msg = `📅 마감 ${dl} (${daysLeft}일 남음)`; color = "#888"; urgency = 0; }
  if (postponed > 0) {
    const pMsg = postponed >= 3 ? `😤 이미 ${postponed}번 미뤘습니다. 그만 미루세요!` : postponed >= 2 ? `😟 ${postponed}번째 미루는 중입니다` : `⏰ 1번 미룬 할 일입니다`;
    msg += " · " + pMsg;
    if (postponed >= 2) { color = "#E03131"; urgency = Math.max(urgency, 2); }
  }
  return { msg, color, urgency, daysLeft, postponed };
}

const SAMPLE_TASKS = [
  {id:1,title:"법무사 미팅",time:"10:00",date:getDateStr(0),location:"법무사 김정호 사무실",travelTime:12,prepItems:[{text:"등기 서류 준비",done:false},{text:"신분증 지참",done:false},{text:"도장 챙기기",done:false}],prepTime:15,category:"work",hasTime:true,deadline:getDateStr(0),postponeCount:0,completed:false},
  {id:2,title:"인감증명서 발급",time:"",date:getDateStr(0),location:"하남시 미사1동 주민센터",travelTime:8,prepItems:[{text:"신분증 챙기기",done:false},{text:"인감도장 지참",done:false}],prepTime:10,category:"errand",hasTime:false,deadline:getDateStr(1),postponeCount:1,completed:false},
  {id:3,title:"은행 서류 제출",time:"",date:getDateStr(0),location:"국민은행 미사역지점",travelTime:8,prepItems:[{text:"신분증",done:false},{text:"서류 준비",done:false}],prepTime:10,category:"errand",hasTime:false,deadline:getDateStr(0),postponeCount:2,completed:false},
  {id:4,title:"헬스장",time:"",date:getDateStr(0),location:"애니타임피트니스 미사역점",travelTime:10,prepItems:[{text:"운동복",done:false},{text:"물통 준비",done:false}],prepTime:10,category:"health",hasTime:false,deadline:"",postponeCount:0,completed:false},
  {id:5,title:"토익 스터디",time:"13:00",date:getDateStr(1),location:"스타벅스 미사역점",travelTime:6,prepItems:[{text:"교재",done:false},{text:"오답노트",done:false}],prepTime:15,category:"study",hasTime:true,deadline:"",postponeCount:0,completed:false},
];

// ─── SENSORY TRANSITION ALARM ───
// Phase 1: Full-screen favorite photo + music viz (4s) to break flow
// Phase 2: Task info slides up over photo
function SensoryAlarm({ task, photos, onDismiss, onSnooze, queueCount }) {
  const [phase, setPhase] = useState(1); // 1=photo, 2=info
  const [photoIdx] = useState(Math.floor(Math.random() * photos.length));
  const [countdown, setCountdown] = useState(4);
  const [prep, setPrep] = useState(task.prepItems.map(p=>({...p})));
  const [pulse, setPulse] = useState(true);
  const [particles, setParticles] = useState([]);
  const allDone = prep.every(p=>p.done);
  const cat = CATS[task.category];
  const pri = calcPri(task);
  const pl = priLabel(pri.score);
  const depTime = task.time ? subMin(task.time, task.travelTime) : null;

  // Generate floating particles
  useEffect(() => {
    const pts = Array.from({length: 20}, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: 4 + Math.random() * 12,
      dur: 3 + Math.random() * 4,
      delay: Math.random() * 2,
      opacity: 0.3 + Math.random() * 0.5,
    }));
    setParticles(pts);
  }, []);

  // Phase 1 countdown → auto-transition to Phase 2
  useEffect(() => {
    if (phase === 1) {
      const timer = setInterval(() => {
        setCountdown(c => {
          if (c <= 1) { clearInterval(timer); setPhase(2); return 0; }
          return c - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [phase]);

  useEffect(() => { const i = setInterval(() => setPulse(v=>!v), 800); return () => clearInterval(i); }, []);
  const toggle = i => setPrep(prev => prev.map((p,idx) => idx===i ? {...p,done:!p.done} : p));

  // Phase 1: Sensory break screen
  if (phase === 1) {
    return (
      <div style={{ position:"fixed", inset:0, zIndex:1000, background:"#000", animation:"fadeIn 0.5s ease" }}>
        <style>{`
          @keyframes floatUp { 0% { transform: translateY(0) scale(1); opacity: var(--op); } 100% { transform: translateY(-120px) scale(0.5); opacity: 0; } }
          @keyframes breathe { 0%,100% { transform: scale(1); } 50% { transform: scale(1.05); } }
          @keyframes pulseRing { 0% { transform: translate(-50%,-50%) scale(0.8); opacity: 0.6; } 100% { transform: translate(-50%,-50%) scale(2); opacity: 0; } }
          @keyframes slideUp { from { transform: translateY(30px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        `}</style>

        {/* Background photo with slow zoom */}
        <div style={{ position:"absolute", inset:0, backgroundImage:`url(${photos[photoIdx]})`, backgroundSize:"cover", backgroundPosition:"center", animation:"breathe 8s ease-in-out infinite", filter:"brightness(0.6)" }} />

        {/* Floating light particles */}
        {particles.map(p => (
          <div key={p.id} style={{
            position:"absolute", left:`${p.x}%`, top:`${p.y}%`,
            width:p.size, height:p.size, borderRadius:"50%",
            background:`radial-gradient(circle, rgba(255,255,255,${p.opacity}), transparent)`,
            animation:`floatUp ${p.dur}s ease-in-out ${p.delay}s infinite`,
            "--op": p.opacity,
          }} />
        ))}

        {/* Expanding pulse rings */}
        <div style={{ position:"absolute", top:"45%", left:"50%", width:120, height:120, borderRadius:"50%", border:"2px solid rgba(255,255,255,0.3)", animation:"pulseRing 2s ease-out infinite" }} />
        <div style={{ position:"absolute", top:"45%", left:"50%", width:120, height:120, borderRadius:"50%", border:"2px solid rgba(255,255,255,0.2)", animation:"pulseRing 2s ease-out 0.7s infinite" }} />

        {/* Central content */}
        <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:40 }}>
          {/* Music visualization bars */}
          <div style={{ display:"flex", gap:4, marginBottom:30, height:50, alignItems:"flex-end" }}>
            {Array.from({length:12}, (_,i) => (
              <div key={i} style={{
                width:4, borderRadius:4,
                background:`linear-gradient(to top, ${cat.color}, rgba(255,255,255,0.8))`,
                height: `${20 + Math.random()*80}%`,
                animation:`musicBar${i%3} ${0.4+Math.random()*0.6}s ease-in-out infinite alternate`,
              }} />
            ))}
          </div>
          <style>{`
            @keyframes musicBar0 { from{height:20%} to{height:90%} }
            @keyframes musicBar1 { from{height:40%} to{height:70%} }
            @keyframes musicBar2 { from{height:15%} to{height:95%} }
          `}</style>

          <div style={{ fontSize:16, color:"rgba(255,255,255,0.7)", fontFamily:F, fontWeight:500, letterSpacing:4, marginBottom:12, textTransform:"uppercase" }}>
            🎵 잠시 멈추세요
          </div>
          <div style={{ fontSize:48, fontWeight:900, color:"#fff", fontFamily:F, textShadow:"0 4px 30px rgba(0,0,0,0.5)", marginBottom:8, textAlign:"center" }}>
            {cat.icon} {task.title}
          </div>
          <div style={{ fontSize:14, color:"rgba(255,255,255,0.5)", fontFamily:F }}>
            {countdown}초 후 상세 정보가 표시됩니다
          </div>

          {/* Skip button */}
          <button onClick={() => setPhase(2)} style={{ marginTop:40, padding:"12px 32px", borderRadius:30, border:"1px solid rgba(255,255,255,0.3)", background:"rgba(255,255,255,0.1)", backdropFilter:"blur(10px)", color:"rgba(255,255,255,0.7)", fontSize:14, fontFamily:F, cursor:"pointer", fontWeight:600 }}>
            바로 확인하기 →
          </button>
        </div>
      </div>
    );
  }

  // Phase 2: Task info (slides up over faded photo)
  return (
    <div style={{ position:"fixed", inset:0, zIndex:1000, background:"rgba(0,0,0,0.92)", backdropFilter:"blur(20px)" }}>
      <style>{`@keyframes slideUp{from{transform:translateY(40px);opacity:0}to{transform:translateY(0);opacity:1}}`}</style>

      {/* Faded photo remnant at top */}
      <div style={{ position:"absolute", top:0, left:0, right:0, height:120, backgroundImage:`url(${photos[photoIdx]})`, backgroundSize:"cover", backgroundPosition:"center", opacity:0.15, maskImage:"linear-gradient(to bottom, black, transparent)" }} />

      <div style={{ position:"relative", maxWidth:430, margin:"0 auto", height:"100%", overflowY:"auto", padding:"0 16px" }}>
        <div style={{ animation:"slideUp 0.5s ease", paddingTop:20, paddingBottom:30 }}>
          {/* Header */}
          <div style={{ background:`linear-gradient(135deg, ${cat.color}22, ${cat.color}44)`, borderRadius:24, padding:"24px 20px", textAlign:"center", marginBottom:16, border:`1px solid ${cat.color}33` }}>
            <div style={{ fontSize:13, color:cat.color, fontFamily:F, fontWeight:700, letterSpacing:3, marginBottom:8 }}>⚡ 지금 멈추세요</div>
            <div style={{ fontSize:28, fontWeight:900, color:"#fff", fontFamily:F, marginBottom:6 }}>{cat.icon} {task.title}</div>
            {task.time ? <div style={{fontSize:15,color:"#999",fontFamily:F}}>{task.time}까지 도착</div> : <div style={{fontSize:13,color:pl.color,fontFamily:F,fontWeight:700}}>{pl.icon} AI: {pl.text}</div>}
            {queueCount>0 && <div style={{fontSize:12,color:"#666",fontFamily:F,marginTop:6}}>다음 할 일 {queueCount}개 대기</div>}
            {/* Deadline pressure in alarm */}
            {(()=>{ const dli=getDeadlineInfo(task); return dli&&dli.urgency>=1 ? <div style={{marginTop:10,padding:"8px 14px",borderRadius:10,background:`${dli.color}15`,border:`1px solid ${dli.color}33`}}><div style={{fontSize:12,fontWeight:800,color:dli.color,fontFamily:F}}>{dli.msg}</div></div> : null; })()}
          </div>

          {/* Info cards */}
          <div style={{ display:"flex", gap:10, marginBottom:12 }}>
            <div style={{ flex:1, background:"#1a1a1a", borderRadius:16, padding:"14px", textAlign:"center", border:"1px solid #2a2a2a" }}>
              <div style={{fontSize:11,color:"#666",fontFamily:F,marginBottom:4}}>이동시간</div>
              <div style={{fontSize:22,fontWeight:800,color:cat.color,fontFamily:F}}>{fmtTime(task.travelTime)}</div>
            </div>
            <div style={{ flex:1, background:"#1a1a1a", borderRadius:16, padding:"14px", textAlign:"center", border:"1px solid #2a2a2a" }}>
              <div style={{fontSize:11,color:"#666",fontFamily:F,marginBottom:4}}>{task.time?"출발시각":"우선순위"}</div>
              <div style={{fontSize:22,fontWeight:800,color:"#fff",fontFamily:F}}>{depTime||`${pri.score}점`}</div>
            </div>
          </div>

          {/* Location */}
          <div style={{ background:"#1a1a1a", borderRadius:14, padding:"12px 16px", marginBottom:12, display:"flex", alignItems:"center", gap:10, border:"1px solid #2a2a2a" }}>
            <span style={{fontSize:18}}>📍</span>
            <span style={{fontSize:14,color:"#ccc",fontFamily:F,flex:1}}>{task.location}</span>
          </div>

          {/* Prep checklist */}
          <div style={{ background:"#1a1a1a", borderRadius:18, padding:"16px", marginBottom:12, border:"1px solid #2a2a2a" }}>
            <div style={{fontSize:12,color:"#666",fontFamily:F,marginBottom:12,fontWeight:700}}>✅ 준비 체크리스트 ({prep.filter(p=>p.done).length}/{prep.length})</div>
            {prep.map((item,idx)=>(
              <div key={idx} onClick={()=>toggle(idx)} style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 14px", marginBottom:8, borderRadius:12, background:item.done?`${cat.color}12`:"#222", border:`1px solid ${item.done?cat.color+"44":"#333"}`, cursor:"pointer", transition:"all 0.2s" }}>
                <div style={{ width:24, height:24, borderRadius:8, border:`2px solid ${item.done?cat.color:"#444"}`, background:item.done?cat.color:"transparent", display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, color:"#fff", flexShrink:0 }}>{item.done?"✓":""}</div>
                <span style={{ fontSize:14, color:item.done?"#888":"#ddd", fontFamily:F, textDecoration:item.done?"line-through":"none" }}>{item.text}</span>
              </div>
            ))}
          </div>

          {/* Buttons */}
          <div style={{ display:"flex", gap:10, paddingBottom:20 }}>
            <button onClick={onSnooze} style={{ flex:1, padding:"15px", borderRadius:16, border:"1px solid #333", background:"#1a1a1a", color:"#999", fontSize:14, fontWeight:700, fontFamily:F, cursor:"pointer" }}>5분 뒤</button>
            <button onClick={onDismiss} style={{ flex:2, padding:"15px", borderRadius:16, border:"none", background:allDone?cat.color:`linear-gradient(135deg,${cat.color},${cat.color}cc)`, color:"#fff", fontSize:15, fontWeight:800, fontFamily:F, cursor:"pointer", boxShadow:`0 4px 20px ${cat.color}44` }}>{allDone?"출발! 🚀":"확인"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Settings Screen ───
function SettingsScreen({ photos, setPhotos, onClose }) {
  const [newUrl, setNewUrl] = useState("");
  const addPhoto = () => { if(newUrl.trim()){setPhotos(p=>[...p,newUrl.trim()]);setNewUrl("");} };
  const removePhoto = (i) => setPhotos(p=>p.filter((_,idx)=>idx!==i));
  const S = {width:"100%",padding:"12px 14px",borderRadius:12,border:"1px solid #333",background:"#1a1a1a",color:"#eee",fontSize:15,fontFamily:F,outline:"none",boxSizing:"border-box"};

  return (
    <div style={{position:"fixed",inset:0,zIndex:800,background:"#0a0a0a",overflowY:"auto"}}>
      <div style={{maxWidth:430,margin:"0 auto",padding:"20px 24px"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:24}}>
          <div><div style={{fontSize:24,fontWeight:900,color:"#fff",fontFamily:F}}>설정</div><div style={{fontSize:13,color:"#555",fontFamily:F,marginTop:2}}>감각 전환 알림 설정</div></div>
          <button onClick={onClose} style={{background:"#151515",border:"1px solid #2a2a2a",borderRadius:12,color:"#888",padding:"10px 16px",fontSize:14,fontFamily:F,cursor:"pointer"}}>닫기</button>
        </div>

        {/* Explanation */}
        <div style={{background:"#1C7ED611",border:"1px solid #1C7ED622",borderRadius:16,padding:"16px",marginBottom:24}}>
          <div style={{fontSize:14,fontWeight:700,color:"#1C7ED6",fontFamily:F,marginBottom:6}}>🧠 감각 전환 알림이란?</div>
          <div style={{fontSize:13,color:"#888",fontFamily:F,lineHeight:1.6}}>
            알림이 올 때 좋아하는 사진과 음악을 먼저 보여줘서, 하던 일에 대한 몰입을 자연스럽게 풀어줍니다. 연구에 따르면 개인적으로 의미 있는 긍정적 자극이 현재 작업에서 주의를 전환하는 데 가장 효과적입니다.
          </div>
        </div>

        {/* Photo management */}
        <div style={{fontSize:16,fontWeight:800,color:"#fff",fontFamily:F,marginBottom:12}}>📸 좋아하는 사진</div>
        <div style={{fontSize:12,color:"#666",fontFamily:F,marginBottom:16}}>알림 시 랜덤으로 하나가 표시됩니다. 가족사진, 여행사진, 반려동물 등 개인적으로 의미 있는 사진이 효과적이에요.</div>

        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:16}}>
          {photos.map((url,i)=>(
            <div key={i} style={{position:"relative",borderRadius:14,overflow:"hidden",aspectRatio:"4/3",border:"1px solid #2a2a2a"}}>
              <img src={url} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}} onError={(e)=>{e.target.style.display="none";}} />
              <button onClick={()=>removePhoto(i)} style={{position:"absolute",top:6,right:6,width:28,height:28,borderRadius:8,background:"rgba(0,0,0,0.7)",border:"none",color:"#fff",fontSize:14,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
              <div style={{position:"absolute",bottom:0,left:0,right:0,padding:"6px 10px",background:"linear-gradient(transparent,rgba(0,0,0,0.8))",fontSize:10,color:"#aaa",fontFamily:F}}>사진 {i+1}</div>
            </div>
          ))}
        </div>

        <div style={{display:"flex",gap:8,marginBottom:32}}>
          <input value={newUrl} onChange={e=>setNewUrl(e.target.value)} placeholder="사진 URL 입력" style={{...S,flex:1}} />
          <button onClick={addPhoto} style={{padding:"12px 20px",borderRadius:12,border:"none",background:newUrl.trim()?"#E8590C":"#333",color:newUrl.trim()?"#fff":"#666",fontSize:14,fontWeight:700,fontFamily:F,cursor:newUrl.trim()?"pointer":"default"}}>추가</button>
        </div>

        {/* Music note */}
        <div style={{fontSize:16,fontWeight:800,color:"#fff",fontFamily:F,marginBottom:12}}>🎵 좋아하는 음악</div>
        <div style={{background:"#151515",border:"1px solid #2a2a2a",borderRadius:14,padding:"16px"}}>
          <div style={{fontSize:13,color:"#888",fontFamily:F,lineHeight:1.6}}>
            실제 앱에서는 기기의 음악 라이브러리와 연동하여 좋아하는 곡을 선택할 수 있습니다. 이 프로토타입에서는 시각적 효과(음악 시각화 바)로 대체하여 보여드립니다.
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Place Suggestions ───
function PlaceSugg({hm,sm,onSelect,onDismiss}){
  const np=sm?(SIM_PLACES[sm.search]||[]).filter(p=>!hm.some(h=>h.name===p.name)):[];
  if(!hm.length&&!np.length)return null;
  return(
    <div style={{marginBottom:16,borderRadius:16,border:"1px solid #7048E833",background:"#7048E808",padding:"16px",animation:"fadeIn 0.3s ease"}}>
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:14}}>
        <div style={{width:28,height:28,borderRadius:8,background:"#7048E822",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14}}>🤖</div>
        <div style={{flex:1}}><div style={{fontSize:13,fontWeight:700,color:"#7048E8",fontFamily:F}}>AI 장소 추천</div></div>
        <button onClick={onDismiss} style={{background:"none",border:"none",color:"#555",fontSize:14,cursor:"pointer"}}>✕</button>
      </div>
      {hm.length>0&&<><div style={{fontSize:11,color:"#7048E8",fontFamily:F,fontWeight:700,marginBottom:8}}>🕐 전에 가던 곳</div>
        {hm.map((p,i)=><button key={"h"+i} onClick={()=>onSelect(p,true)} style={{width:"100%",display:"flex",alignItems:"center",gap:12,padding:"12px 14px",marginBottom:8,borderRadius:12,border:"1px solid #7048E833",background:"#7048E80a",cursor:"pointer",textAlign:"left"}}>
          <div style={{width:40,height:40,borderRadius:12,background:"#7048E822",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,border:"1px solid #7048E844"}}>⭐</div>
          <div style={{flex:1,minWidth:0}}><div style={{fontSize:14,fontWeight:700,color:"#fff",fontFamily:F,marginBottom:2}}>{p.name}</div><div style={{fontSize:11,color:"#888",fontFamily:F}}>{p.address}</div><div style={{marginTop:4}}><span style={{fontSize:10,color:"#7048E8",background:"#7048E818",padding:"2px 6px",borderRadius:4,fontWeight:600,fontFamily:F}}>방문 {p.visits}회</span></div></div>
          <div style={{fontSize:13,fontWeight:800,color:"#7048E8",fontFamily:F,flexShrink:0}}>{p.dist}</div>
        </button>)}</>}
      {np.length>0&&<><div style={{fontSize:11,color:"#E8590C",fontFamily:F,fontWeight:700,marginBottom:8,marginTop:hm.length>0?12:0}}>📍 주변 다른 곳</div>
        {np.map((p,i)=><button key={"n"+i} onClick={()=>onSelect({...p,prep:sm?.prep},false)} style={{width:"100%",display:"flex",alignItems:"center",gap:12,padding:"12px 14px",marginBottom:i<np.length-1?8:0,borderRadius:12,border:"1px solid #2a2a2a",background:"#151515",cursor:"pointer",textAlign:"left"}}>
          <div style={{width:40,height:40,borderRadius:12,background:"#1a1a1a",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0,border:"1px solid #2a2a2a"}}>📍</div>
          <div style={{flex:1}}><div style={{fontSize:14,fontWeight:700,color:"#ccc",fontFamily:F}}>{p.name}</div><div style={{fontSize:11,color:"#666",fontFamily:F}}>{p.address}</div></div>
          <div style={{fontSize:13,fontWeight:800,color:"#888",fontFamily:F,flexShrink:0}}>{p.dist}</div>
        </button>)}</>}
    </div>
  );
}

// ─── Add Task Modal ───
function AddModal({onAdd,onClose,initDate,hist}){
  const[title,setTitle]=useState("");const[date,setDate]=useState(initDate||getDateStr(0));const[hasTime,setHasTime]=useState(false);const[time,setTime]=useState("12:00");const[loc,setLoc]=useState("");const[cat,setCat]=useState("errand");const[tv,setTv]=useState(20);const[prepTxt,setPrepTxt]=useState("");const[deadline,setDeadline]=useState("");const[sm,setSm]=useState(null);const[hm,setHm]=useState([]);const[dismissed,setDismissed]=useState(false);const[selPlace,setSelPlace]=useState(null);const[fromHist,setFromHist]=useState(false);const dr=useRef(null);

  const onTitle=useCallback(v=>{setTitle(v);setDismissed(false);setSelPlace(null);if(dr.current)clearTimeout(dr.current);dr.current=setTimeout(()=>{const s=findSmart(v),h=findHist(v,hist);setSm(s);setHm(h);if(h.length>0)setCat(h[0].category);else if(s)setCat(s.category);},400);},[hist]);
  const onSelPlace=(p,fh)=>{setLoc(p.name);setTv(p.travelTime);setSelPlace(p);setFromHist(fh);if(p.prep)setPrepTxt(p.prep.join("\n"));else if(sm?.prep)setPrepTxt(sm.prep.join("\n"));if(p.category)setCat(p.category);};
  const doAdd=()=>{if(!title.trim())return;const pi=prepTxt.split("\n").filter(l=>l.trim()).map(t=>({text:t.trim(),done:false}));onAdd({id:Date.now(),title:title.trim(),date,time:hasTime?time:"",hasTime,location:loc.trim()||"미정",travelTime:tv,prepItems:pi.length>0?pi:[{text:"준비물 확인",done:false}],prepTime:10,category:cat,deadline,postponeCount:0,completed:false});};

  const pvT={title,time:hasTime?time:"",date,travelTime:tv,prepItems:prepTxt.split("\n").filter(l=>l.trim()),category:cat};
  const pvP=title.trim()?calcPri(pvT):null;const pvL=pvP?priLabel(pvP.score):null;
  const S={width:"100%",padding:"12px 14px",borderRadius:12,border:"1px solid #333",background:"#1a1a1a",color:"#eee",fontSize:15,fontFamily:F,outline:"none",boxSizing:"border-box"};
  const qd=[{l:"오늘",v:getDateStr(0)},{l:"내일",v:getDateStr(1)}];
  const hasSugg=!dismissed&&!selPlace&&(hm.length>0||sm);

  return(
    <div style={{position:"fixed",inset:0,zIndex:900,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(0,0,0,0.7)",backdropFilter:"blur(8px)"}}>
      <div style={{width:"100%",maxWidth:400,margin:"0 16px",borderRadius:24,background:"#111",border:"1px solid #2a2a2a",padding:"28px 24px",maxHeight:"88vh",overflowY:"auto"}}>
        <div style={{fontSize:20,fontWeight:800,color:"#fff",fontFamily:F,marginBottom:24}}>➕ 새 할 일</div>
        <div style={{marginBottom:16}}>
          <label style={{fontSize:12,color:"#666",fontFamily:F,marginBottom:6,display:"block"}}>할 일</label>
          <div style={{position:"relative"}}><input value={title} onChange={e=>onTitle(e.target.value)} placeholder="예: 법무사 미팅, 인감증명서..." style={S} />
            {hasSugg&&<div style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",fontSize:11,color:hm.length>0?"#7048E8":"#E8590C",fontFamily:F,fontWeight:700,background:hm.length>0?"#7048E818":"#E8590C18",padding:"3px 8px",borderRadius:6}}>{hm.length>0?"⭐ 가던 곳":"🤖 추천"}</div>}
          </div>
        </div>
        {hasSugg&&<PlaceSugg hm={hm} sm={sm} onSelect={onSelPlace} onDismiss={()=>setDismissed(true)}/>}
        {selPlace&&<div style={{marginBottom:16,borderRadius:14,border:`1px solid ${fromHist?"#7048E844":"#2B8A3E44"}`,background:fromHist?"#7048E811":"#2B8A3E11",padding:"14px 16px",display:"flex",alignItems:"center",gap:12}}><div style={{fontSize:20}}>{fromHist?"⭐":"✅"}</div><div style={{flex:1}}><div style={{fontSize:14,fontWeight:700,color:fromHist?"#7048E8":"#2B8A3E",fontFamily:F}}>{selPlace.name}</div><div style={{fontSize:11,color:"#888",fontFamily:F,marginTop:2}}>{selPlace.dist} · 자동입력됨</div></div><button onClick={()=>{setSelPlace(null);setLoc("");setDismissed(false);}} style={{background:"none",border:"none",color:"#666",fontSize:12,cursor:"pointer",fontFamily:F}}>변경</button></div>}
        <div style={{marginBottom:16}}><label style={{fontSize:12,color:"#666",fontFamily:F,marginBottom:8,display:"block"}}>📅 날짜</label>
          <div style={{display:"flex",gap:8}}>{qd.map(q=><button key={q.v} onClick={()=>setDate(q.v)} style={{flex:1,padding:"10px 0",borderRadius:12,border:`1.5px solid ${date===q.v?"#E8590C":"#333"}`,background:date===q.v?"#E8590C22":"transparent",color:date===q.v?"#E8590C":"#777",fontSize:14,fontWeight:date===q.v?800:500,fontFamily:F,cursor:"pointer"}}>{q.l}</button>)}</div>
        </div>
        <div style={{marginBottom:16}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:hasTime?10:0}}><label style={{fontSize:12,color:"#666",fontFamily:F}}>⏰ 시간</label><button onClick={()=>setHasTime(!hasTime)} style={{padding:"6px 14px",borderRadius:20,border:`1.5px solid ${hasTime?"#E8590C":"#333"}`,background:hasTime?"#E8590C22":"transparent",color:hasTime?"#E8590C":"#777",fontSize:12,fontWeight:700,fontFamily:F,cursor:"pointer"}}>{hasTime?"✓ 시간 지정":"시간 없이"}</button></div>
          {hasTime?<div style={{display:"flex",gap:12}}><div style={{flex:1}}><input type="time" value={time} onChange={e=>setTime(e.target.value)} style={{...S,colorScheme:"dark"}}/></div><div style={{flex:1}}><input type="number" value={tv} onChange={e=>setTv(Number(e.target.value))} placeholder="이동(분)" style={S}/></div></div>:<div style={{background:"#1C7ED611",border:"1px solid #1C7ED633",borderRadius:12,padding:"10px 14px",marginTop:8}}><div style={{fontSize:12,color:"#1C7ED6",fontFamily:F,fontWeight:700}}>🧠 AI가 순서를 정해드려요</div></div>}
        </div>
        {!hasTime&&<div style={{marginBottom:16}}><label style={{fontSize:12,color:"#666",fontFamily:F,marginBottom:6,display:"block"}}>🚗 이동 (분)</label><input type="number" value={tv} onChange={e=>setTv(Number(e.target.value))} style={S}/></div>}
        <div style={{marginBottom:16}}><label style={{fontSize:12,color:"#666",fontFamily:F,marginBottom:6,display:"block"}}>📍 장소</label><input value={loc} onChange={e=>setLoc(e.target.value)} placeholder="예: 강남역 위워크" style={S}/></div>
        <div style={{marginBottom:16}}><label style={{fontSize:12,color:"#666",fontFamily:F,marginBottom:6,display:"block"}}>⏳ 기한 (선택)</label><input type="date" value={deadline} onChange={e=>setDeadline(e.target.value)} min={getDateStr(0)} style={{...S,colorScheme:"dark"}}/><div style={{fontSize:11,color:"#888",fontFamily:F,marginTop:4}}>기한이 있으면 마감일이 다가올수록 더 강하게 알려드려요</div></div>
        <div style={{marginBottom:16}}><label style={{fontSize:12,color:"#666",fontFamily:F,marginBottom:8,display:"block"}}>카테고리</label><div style={{display:"flex",gap:8,flexWrap:"wrap"}}>{Object.entries(CATS).map(([k,v])=><button key={k} onClick={()=>setCat(k)} style={{padding:"8px 14px",borderRadius:10,border:`1.5px solid ${cat===k?v.color:"#333"}`,background:cat===k?v.color+"22":"transparent",color:cat===k?v.color:"#777",fontSize:13,fontFamily:F,cursor:"pointer",fontWeight:cat===k?700:400}}>{v.icon} {v.label}</button>)}</div></div>
        <div style={{marginBottom:16}}><label style={{fontSize:12,color:"#666",fontFamily:F,marginBottom:6,display:"block"}}>📋 준비할 것</label><textarea value={prepTxt} onChange={e=>setPrepTxt(e.target.value)} placeholder={"서류 준비\n신분증"} rows={3} style={{...S,resize:"vertical",lineHeight:1.6}}/></div>
        {pvL&&title.trim()&&<div style={{marginBottom:20,borderRadius:14,border:`1px solid ${pvL.color}33`,background:pvL.bg,padding:"12px 16px",display:"flex",alignItems:"center",gap:10}}><span style={{fontSize:20}}>{pvL.icon}</span><div style={{flex:1}}><div style={{fontSize:13,fontWeight:700,color:pvL.color,fontFamily:F}}>AI 우선순위: {pvL.text}</div><div style={{fontSize:11,color:"#888",fontFamily:F,marginTop:2}}>{pvP.reasons.slice(0,2).join(" · ")}</div></div><div style={{fontSize:18,fontWeight:900,color:pvL.color,fontFamily:F}}>{pvP.score}</div></div>}
        <div style={{display:"flex",gap:10}}><button onClick={onClose} style={{flex:1,padding:"14px",borderRadius:14,border:"1px solid #333",background:"transparent",color:"#888",fontSize:14,fontWeight:600,fontFamily:F,cursor:"pointer"}}>취소</button><button onClick={doAdd} style={{flex:2,padding:"14px",borderRadius:14,border:"none",background:title.trim()?CATS[cat].color:"#333",color:title.trim()?"#fff":"#666",fontSize:15,fontWeight:800,fontFamily:F,cursor:title.trim()?"pointer":"default"}}>{getDateLabel(date)}에 추가</button></div>
      </div>
    </div>
  );
}

// ─── Task Card ───
function Card({task,onAlarm,onDel,onComplete,onPostpone,rank}){
  const cat=CATS[task.category];const pri=calcPri(task);const pl=priLabel(pri.score);
  const dep=task.time?subMin(task.time,task.travelTime+task.prepTime):null;
  const dl=getDeadlineInfo(task);
  return(
    <div style={{background:task.completed?"#0d1a0d":"#151515",borderRadius:20,border:`1px solid ${task.completed?"#2B8A3E44":"#2a2a2a"}`,padding:"18px 20px",marginBottom:12,position:"relative",overflow:"hidden",opacity:task.completed?0.6:1,transition:"all 0.3s"}}>
      <div style={{position:"absolute",top:0,left:0,width:4,height:"100%",background:task.completed?"#2B8A3E":cat.color}}/>
      <div style={{position:"absolute",top:12,right:12,display:"flex",alignItems:"center",gap:6}}>
        {!task.completed&&<span style={{fontSize:10,color:pl.color,background:pl.bg,padding:"3px 8px",borderRadius:6,fontWeight:700,fontFamily:F}}>{pl.icon} {pl.text}</span>}
        {task.completed&&<span style={{fontSize:10,color:"#2B8A3E",background:"#2B8A3E18",padding:"3px 8px",borderRadius:6,fontWeight:700,fontFamily:F}}>✅ 완료</span>}
        <button onClick={()=>onDel(task.id)} style={{background:"none",border:"none",color:"#444",fontSize:14,cursor:"pointer",padding:2}}>✕</button>
      </div>
      <div style={{display:"flex",alignItems:"flex-start",gap:12,marginBottom:10}}>
        <div style={{width:32,height:32,borderRadius:10,background:task.completed?"#2B8A3E18":pl.bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:task.completed?16:16,fontWeight:900,color:task.completed?"#2B8A3E":pl.color,fontFamily:F,flexShrink:0,border:`1px solid ${task.completed?"#2B8A3E33":pl.color+"33"}`}}>{task.completed?"✓":rank}</div>
        <div style={{flex:1}}><div style={{fontSize:16,fontWeight:800,color:task.completed?"#666":"#fff",fontFamily:F,marginBottom:3,paddingRight:80,textDecoration:task.completed?"line-through":"none"}}>{cat.icon} {task.title}</div><div style={{fontSize:12,color:"#777",fontFamily:F}}>📍 {task.location}</div></div>
      </div>
      {/* Deadline pressure message */}
      {dl&&!task.completed&&<div style={{marginLeft:44,marginBottom:10,padding:"8px 12px",borderRadius:10,background:dl.urgency>=2?"#E0313112":dl.urgency>=1?"#E8590C12":"#1a1a1a",border:`1px solid ${dl.color}33`}}>
        <div style={{fontSize:12,fontWeight:700,color:dl.color,fontFamily:F}}>{dl.msg}</div>
      </div>}
      {/* Postpone count badge */}
      {task.postponeCount>0&&!task.completed&&!dl&&<div style={{marginLeft:44,marginBottom:10}}><span style={{fontSize:11,color:task.postponeCount>=3?"#E03131":task.postponeCount>=2?"#E8590C":"#E67700",background:task.postponeCount>=3?"#E0313112":task.postponeCount>=2?"#E8590C12":"#E6770012",padding:"4px 10px",borderRadius:8,fontWeight:700,fontFamily:F}}>{task.postponeCount>=3?`😤 ${task.postponeCount}번 미룸 — 그만 미루세요!`:task.postponeCount>=2?`😟 ${task.postponeCount}번 미룸`:`⏰ ${task.postponeCount}번 미룸`}</span></div>}
      <div style={{display:"flex",gap:12,marginBottom:12,fontSize:12,color:"#888",fontFamily:F,flexWrap:"wrap",paddingLeft:44}}>
        {task.time?<span style={{color:cat.color,fontWeight:700}}>⏰ {task.time}</span>:<span style={{color:"#1C7ED6",fontWeight:600}}>🧠 AI</span>}
        <span>🚗 {fmtTime(task.travelTime)}</span>{dep&&<span>🚀 {dep}</span>}<span>📋 {task.prepItems.length}개</span>
      </div>
      {/* Action buttons */}
      {!task.completed?<div style={{paddingLeft:44,display:"flex",gap:8}}>
        <button onClick={()=>onAlarm(task)} style={{flex:1,padding:"10px",borderRadius:12,border:`1px solid ${cat.color}44`,background:`${cat.color}11`,color:cat.color,fontSize:12,fontWeight:700,fontFamily:F,cursor:"pointer"}}>🔔 알림</button>
        <button onClick={()=>onPostpone(task.id)} style={{flex:1,padding:"10px",borderRadius:12,border:"1px solid #E6770044",background:"#E6770011",color:"#E67700",fontSize:12,fontWeight:700,fontFamily:F,cursor:"pointer"}}>📅 내일로</button>
        <button onClick={()=>onComplete(task.id)} style={{flex:1,padding:"10px",borderRadius:12,border:"1px solid #2B8A3E44",background:"#2B8A3E11",color:"#2B8A3E",fontSize:12,fontWeight:700,fontFamily:F,cursor:"pointer"}}>✅ 완료</button>
      </div>:<div style={{paddingLeft:44,fontSize:12,color:"#555",fontFamily:F}}>완료됨</div>}
    </div>
  );
}

// ─── Main ───
export default function App(){
  const[tasks,setTasks]=useState(SAMPLE_TASKS);
  const[visitHist]=useState(HISTORY);
  const[alarm,setAlarm]=useState(null);
  const[showAdd,setShowAdd]=useState(false);
  const[showSettings,setShowSettings]=useState(false);
  const[selDate,setSelDate]=useState(getDateStr(0));
  const[photos,setPhotos]=useState(DEFAULT_PHOTOS);

  const addTask=t=>{setTasks(p=>[...p,t]);setShowAdd(false);};
  const delTask=id=>setTasks(p=>p.filter(t=>t.id!==id));
  const completeTask=id=>setTasks(p=>p.map(t=>t.id===id?{...t,completed:true}:t));
  const postponeTask=id=>setTasks(p=>p.map(t=>{
    if(t.id!==id)return t;
    const dl=getDeadlineInfo(t);
    // Move to tomorrow, increment postpone count
    return{...t,date:getDateStr(1),postponeCount:(t.postponeCount||0)+1};
  }));
  const allDates=[...new Set([getDateStr(0),getDateStr(1),...tasks.map(t=>t.date)])].sort();
  const filtered=tasks.filter(t=>t.date===selDate).map(t=>{
    const p=calcPri(t);
    // Boost priority for deadline tasks
    const dl=getDeadlineInfo(t);
    let bonus=0;
    if(dl){if(dl.urgency>=3)bonus=40;else if(dl.urgency>=2)bonus=25;else if(dl.urgency>=1)bonus=10;}
    if(t.postponeCount>=3)bonus+=15;else if(t.postponeCount>=2)bonus+=8;
    return{...t,_pri:{...p,score:Math.min(100,p.score+bonus),reasons:[...p.reasons,...(dl?[dl.msg]:[])]}};
  }).sort((a,b)=>{
    // Completed always last
    if(a.completed!==b.completed)return a.completed?1:-1;
    return b._pri.score-a._pri.score;
  });
  const next=[...tasks].map(t=>({...t,_pri:calcPri(t)})).filter(t=>t.date>=getDateStr(0)).sort((a,b)=>a.date===b.date?b._pri.score-a._pri.score:a.date.localeCompare(b.date))[0];
  const qc=alarm?filtered.filter(t=>t.id!==alarm.id).length:0;

  return(
    <div style={{maxWidth:430,margin:"0 auto",minHeight:"100vh",background:"#0a0a0a",fontFamily:F,position:"relative"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700;800;900&display=swap');
        @keyframes fadeIn{from{opacity:0;transform:scale(0.95)}to{opacity:1;transform:scale(1)}}
        @keyframes floatPulse{0%,100%{box-shadow:0 8px 32px #E8590C55}50%{box-shadow:0 8px 48px #E8590C88}}
        *{box-sizing:border-box}::-webkit-scrollbar{width:0}
      `}</style>

      <div style={{padding:"14px 24px 8px",display:"flex",justifyContent:"space-between",color:"#666",fontSize:12}}>
        <span style={{fontWeight:700}}>9:41</span><div style={{display:"flex",gap:6}}><span>📶</span><span>🔋</span></div>
      </div>

      <div style={{padding:"16px 24px 8px",display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
        <div><div style={{fontSize:28,fontWeight:900,color:"#fff",lineHeight:1.2}}>멈춰!</div><div style={{fontSize:13,color:"#555",marginTop:2}}>AI가 순서를 정해드려요</div></div>
        <button onClick={()=>setShowSettings(true)} style={{background:"#151515",border:"1px solid #2a2a2a",borderRadius:12,padding:"8px 14px",color:"#888",fontSize:12,fontWeight:700,fontFamily:F,cursor:"pointer",marginTop:4}}>⚙️ 설정</button>
      </div>

      <div style={{padding:"12px 0 4px",overflowX:"auto",WebkitOverflowScrolling:"touch"}}>
        <div style={{display:"inline-flex",gap:8,padding:"0 24px"}}>
          {allDates.map(d=>{const sel=d===selDate,cnt=tasks.filter(t=>t.date===d).length;
            return<button key={d} onClick={()=>setSelDate(d)} style={{padding:"10px 18px",borderRadius:14,border:`1.5px solid ${sel?"#E8590C":"#222"}`,background:sel?"#E8590C18":"#151515",color:sel?"#E8590C":"#777",fontSize:14,fontWeight:sel?800:500,fontFamily:F,cursor:"pointer",flexShrink:0}}>
              {getDateLabel(d)}{cnt>0&&<span style={{display:"inline-block",marginLeft:6,background:sel?"#E8590C":"#333",color:sel?"#fff":"#888",fontSize:11,fontWeight:700,borderRadius:8,padding:"1px 7px"}}>{cnt}</span>}
            </button>;
          })}
        </div>
      </div>

      {filtered.length>1&&filtered.some(t=>!t.hasTime)&&<div style={{padding:"8px 24px"}}><div style={{background:"#1C7ED611",border:"1px solid #1C7ED622",borderRadius:12,padding:"10px 14px",display:"flex",alignItems:"center",gap:10}}><span style={{fontSize:16}}>🧠</span><div style={{flex:1}}><div style={{fontSize:12,color:"#1C7ED6",fontFamily:F,fontWeight:700}}>AI 스마트 정렬</div><div style={{fontSize:11,color:"#888",fontFamily:F}}>영업시간·긴급도 기반 순서</div></div></div></div>}

      {next&&<div style={{padding:"8px 24px"}}><div style={{background:"#151515",borderRadius:14,padding:"14px 18px",display:"flex",alignItems:"center",gap:12,border:"1px solid #222"}}>
        <div style={{width:40,height:40,borderRadius:12,background:"linear-gradient(135deg,#E8590C22,#E8590C44)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>⏳</div>
        <div style={{flex:1,minWidth:0}}><div style={{fontSize:13,color:"#aaa",fontWeight:700}}>가장 먼저</div><div style={{fontSize:11,color:"#666",marginTop:2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{next.date!==getDateStr(0)?getDateLabel(next.date)+" · ":""}{next.title}</div></div>
        <div style={{textAlign:"right"}}><div style={{fontSize:20,fontWeight:900,color:"#E8590C"}}>{next.time||"AI"}</div></div>
      </div></div>}

      <div style={{padding:"8px 24px 4px",fontSize:12,fontWeight:700,color:"#444",letterSpacing:2,display:"flex",alignItems:"center",gap:8}}>
        <span>{getDateLabel(selDate)} · {filtered.length}개</span>
        <span style={{fontSize:10,color:"#1C7ED6",background:"#1C7ED611",padding:"2px 8px",borderRadius:4}}>우선순위순</span>
        {filtered.filter(t=>t.completed).length>0&&<span style={{fontSize:10,color:"#2B8A3E",background:"#2B8A3E11",padding:"2px 8px",borderRadius:4}}>✅ {filtered.filter(t=>t.completed).length}개 완료</span>}
      </div>

      <div style={{padding:"8px 24px 120px"}}>
        {filtered.map((t,i)=><Card key={t.id} task={t} onAlarm={setAlarm} onDel={delTask} onComplete={completeTask} onPostpone={postponeTask} rank={i+1}/>)}
        {filtered.length===0&&<div style={{textAlign:"center",padding:"50px 20px",color:"#444"}}><div style={{fontSize:48,marginBottom:16}}>🎯</div><div style={{fontSize:15,fontWeight:700,marginBottom:8,color:"#555"}}>{getDateLabel(selDate)}은 비어있어요</div></div>}
      </div>

      <div style={{position:"fixed",bottom:28,left:"50%",transform:"translateX(-50%)",zIndex:100}}>
        <button onClick={()=>setShowAdd(true)} style={{display:"flex",alignItems:"center",gap:10,padding:"16px 32px",borderRadius:50,border:"none",background:"linear-gradient(135deg,#E8590C,#D9480F)",color:"#fff",fontSize:16,fontWeight:800,fontFamily:F,cursor:"pointer",animation:"floatPulse 3s ease-in-out infinite",boxShadow:"0 8px 32px #E8590C55"}}>
          <span style={{fontSize:22,lineHeight:1}}>+</span><span>할 일 추가</span>
        </button>
      </div>

      {alarm&&<SensoryAlarm task={alarm} photos={photos} onDismiss={()=>setAlarm(null)} onSnooze={()=>{setAlarm(null);setTimeout(()=>setAlarm(alarm),1500);}} queueCount={qc}/>}
      {showAdd&&<AddModal initDate={selDate} onAdd={addTask} onClose={()=>setShowAdd(false)} hist={visitHist}/>}
      {showSettings&&<SettingsScreen photos={photos} setPhotos={setPhotos} onClose={()=>setShowSettings(false)}/>}
    </div>
  );
}
