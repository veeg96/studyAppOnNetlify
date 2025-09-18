const $ = (sel) => document.querySelector(sel);
const cardsEl = $("#cards");
const countdownEl = $("#countdown");
const statusEl = $("#status");
const progressBar = $("#progressBar");
const durationSel = $("#duration");
const sourceUrlInput = $("#sourceUrl");
const userIdInput = $("#userId");

let allQA = [];
let timer = null;
let remaining = 0;
let total = 0;
let paused = false;

const QUESTION_MAP = { 10: 1, 20: 2, 30: 3 };

init();

async function init(){
  await loadQuestions(sourceUrlInput.value);
  $("#toggleSettings").addEventListener("click", toggleSettings);
  $("#startSession").addEventListener("click", startSession);
  $("#pauseResume").addEventListener("click", pauseResume);
  $("#resetSession").addEventListener("click", resetSession);
  $("#reloadQuestions").addEventListener("click", () => loadQuestions(sourceUrlInput.value));
  $("#reviewBtn").addEventListener("click", openReview);
  updateCountdown(0,0);
}

async function loadQuestions(url){
  try{
    const res = await fetch(url + "?t=" + Date.now());
    if(!res.ok) throw new Error("HTTP " + res.status);
    const data = await res.json();
    if(!Array.isArray(data)) throw new Error("JSON should be an array");
    allQA = data;
    setStatus(`Loaded ${allQA.length} items.`);
  }catch(e){
    setStatus("Failed to load questions: " + e.message);
  }
}

function getUserId(){
  const id = (userIdInput.value || "").trim();
  if(!id) throw new Error("Enter a User ID in settings (email or nickname).");
  return id;
}

async function startSession(){
  try{
    const minutes = Number(durationSel.value);
    const numQ = QUESTION_MAP[minutes] ?? 1;
    const userId = getUserId();

    const resp = await fetch("/.netlify/functions/sessions-next", {
      method: "POST",
      headers: {"content-type":"application/json"},
      body: JSON.stringify({ userId, numQ, totalItems: allQA.length })
    });
    if(!resp.ok) throw new Error("Server error getting next indices");
    const { indices, sessionId } = await resp.json();

    const selected = indices.map(idx => ({...allQA[idx % allQA.length], _idx: idx % allQA.length}));
    renderCards(selected);

    await fetch("/.netlify/functions/sessions-save", {
      method: "POST",
      headers: {"content-type":"application/json"},
      body: JSON.stringify({ userId, sessionId, minutes, items: indices })
    });

    total = minutes * 60;
    remaining = total;
    paused = false;
    $("#pauseResume").disabled = false;
    $("#resetSession").disabled = false;
    tick();
    timer = setInterval(tick, 1000);
    setStatus("Session running…");
  }catch(e){
    setStatus(e.message);
  }
}

function renderCards(items){
  cardsEl.innerHTML = "";
  for(const [i, qa] of items.entries()){
    const card = document.createElement("article");
    card.className = "card";
    const title = document.createElement("h3");
    title.textContent = `Q${i+1}: ${qa.title || qa.question?.slice(0,80) || "Question"}`;
    const q = document.createElement("div");
    q.className = "qa";
    q.innerHTML = `<strong>Question:</strong> ${escapeHTML(qa.question || "")}`;
    const a = document.createElement("div");
    a.className = "qa";
    a.innerHTML = `<strong>Answer:</strong> ${escapeHTML(qa.answer || "")}`;
    const meta = document.createElement("div");
    meta.className = "meta";
    meta.innerHTML = `<span class="tag">#${qa.topic || "general"}</span>`;
    card.appendChild(title);
    card.appendChild(q);
    card.appendChild(a);
    card.appendChild(meta);
    cardsEl.appendChild(card);
  }
}

function tick(){
  if(paused) return;
  remaining = Math.max(0, remaining - 1);
  updateCountdown(remaining, total);
  if(remaining === 0){
    clearInterval(timer);
    timer = null;
    setStatus("✅ Time's up! Start another or open Review.");
  }
}

function pauseResume(){
  if(timer === null && remaining > 0){
    timer = setInterval(tick, 1000);
    paused = false;
    $("#pauseResume").textContent = "Pause";
    setStatus("Resumed.");
    return;
  }
  paused = !paused;
  $("#pauseResume").textContent = paused ? "Resume" : "Pause";
  setStatus(paused ? "Paused." : "Running…");
}

function resetSession(){
  if(timer){ clearInterval(timer); timer = null; }
  remaining = 0; total = 0;
  updateCountdown(0,0);
  $("#pauseResume").disabled = true;
  $("#resetSession").disabled = true;
  setStatus("Session reset.");
}

function updateCountdown(rem, tot){
  const mm = String(Math.floor(rem/60)).padStart(2,"0");
  const ss = String(rem%60).padStart(2,"0");
  countdownEl.textContent = `${mm}:${ss}`;
  const pct = tot ? (100*(tot-rem)/tot) : 0;
  progressBar.style.width = pct + "%";
}

async function openReview(){
  try{
    const userId = getUserId();
    const res = await fetch(`/.netlify/functions/sessions-list?userId=${encodeURIComponent(userId)}`);
    if(!res.ok) throw new Error("Failed to load sessions");
    const data = await res.json();

    const dlg = document.querySelector("#reviewDialog");
    const listEl = document.querySelector("#sessionList");
    listEl.innerHTML = "";
    if(data.sessions.length === 0){
      listEl.textContent = "No sessions yet.";
    }else{
      data.sessions.sort((a,b)=> new Date(b.startedAt)-new Date(a.startedAt));
      data.sessions.forEach(s => {
        const d = new Date(s.startedAt);
        const item = document.createElement("div");
        item.className = "session-item";
        item.textContent = `${d.toDateString()} • ${d.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})} • ${s.minutes} min • ${s.items.length} Q`;
        item.addEventListener("click", () => {
          const picked = s.items.map(idx => ({...allQA[idx % allQA.length], _idx: idx % allQA.length}));
          renderCards(picked);
        });
        listEl.appendChild(item);
      });
    }
    dlg.showModal();
  }catch(e){
    setStatus(e.message);
  }
}

function setStatus(msg){ statusEl.textContent = msg; }
function toggleSettings(){
  const panel = document.querySelector("#settings");
  const btn = document.querySelector("#toggleSettings");
  const nowHidden = !panel.classList.toggle("hidden");
  btn.setAttribute("aria-expanded", String(!nowHidden));
}
function escapeHTML(str){ return (str || "").replace(/[&<>"']/g, s => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[s])); }
