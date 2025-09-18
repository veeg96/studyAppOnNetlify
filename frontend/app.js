const $ = (sel) => document.querySelector(sel);
const cardsEl = $("#cards");
const countdownEl = $("#countdown");
const statusEl = $("#status");
const progressBar = $("#progressBar");
const durationSel = $("#duration");
const sourceUrlInput = $("#sourceUrl");

let allQA = [];
let timer = null;
let remaining = 0;
let total = 0;
let paused = false;
let currentUser = null;

const QUESTION_MAP = { 10: 1, 20: 2, 30: 3 };

init();

async function init(){
  // Check authentication
  const token = localStorage.getItem('sessionToken');
  if (!token) {
    // Redirect to login page if not authenticated
    window.location.href = '/login.html';
    return;
  }
  
  try {
    // Verify token
    const response = await fetch('/.netlify/functions/auth-verify', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      throw new Error('Authentication failed');
    }
    
    const data = await response.json();
    currentUser = data.username;
    
    // Update UI with username
    const userDisplay = document.createElement('div');
    userDisplay.className = 'user-display';
    userDisplay.innerHTML = `
      <span>Logged in as: <strong>${currentUser}</strong></span>
      <button id="logoutBtn" class="btn">Logout</button>
    `;
    document.querySelector('header').appendChild(userDisplay);
    $('#logoutBtn').addEventListener('click', logout);
    
    // Load questions and set up event listeners
    await loadQuestions(sourceUrlInput.value);
    $("#toggleSettings").addEventListener("click", toggleSettings);
    $("#startSession").addEventListener("click", startSession);
    $("#pauseResume").addEventListener("click", pauseResume);
    $("#resetSession").addEventListener("click", resetSession);
    $("#reloadQuestions").addEventListener("click", () => loadQuestions(sourceUrlInput.value));
    $("#reviewBtn").addEventListener("click", openReview);
    $("#testFunction").addEventListener("click", testNetlifyFunction);
    updateCountdown(0,0);
    
    setStatus(`Welcome, ${currentUser}! Loaded ${allQA.length} items.`);
  } catch (error) {
    console.error('Authentication error:', error);
    localStorage.removeItem('sessionToken');
    localStorage.removeItem('username');
    window.location.href = '/login.html';
  }
}

function logout() {
  localStorage.removeItem('sessionToken');
  localStorage.removeItem('username');
  window.location.href = '/login.html';
}

// Test function to verify Netlify Functions are working
async function testNetlifyFunction() {
  try {
    setStatus("Testing Netlify function...");
    const response = await fetch("/.netlify/functions/test");
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    const data = await response.json();
    setStatus(`Test successful: ${data.message} at ${data.timestamp}`);
    console.log("Test function response:", data);
  } catch (error) {
    setStatus(`Test failed: ${error.message}`);
    console.error("Test function error:", error);
  }
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


async function startSession(){
  try{
    const minutes = Number(durationSel.value);
    const numQ = QUESTION_MAP[minutes] ?? 1;
    const token = localStorage.getItem('sessionToken');

    // Debug log
    console.log("Starting session with params:", { numQ, totalItems: allQA.length });
    setStatus("Calling sessions-next function...");

    const resp = await fetch("/.netlify/functions/sessions-next", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({ numQ, totalItems: allQA.length })
    });
    
    console.log("Response status:", resp.status);
    if(!resp.ok) {
      const errorText = await resp.text();
      console.error("Error response:", errorText);
      throw new Error(`Server error getting next indices (${resp.status}): ${errorText}`);
    }
    
    const data = await resp.json();
    console.log("Response data:", data);
    const { indices, sessionId } = data;

    const selected = indices.map(idx => ({...allQA[idx % allQA.length], _idx: idx % allQA.length}));
    renderCards(selected);

    await fetch("/.netlify/functions/sessions-save", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({ sessionId, minutes, items: indices })
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
    const token = localStorage.getItem('sessionToken');
    
    // Debug log
    console.log("Opening review for user:", currentUser);
    setStatus("Fetching session list...");
    
    const res = await fetch("/.netlify/functions/sessions-list", {
      headers: {
        "Authorization": `Bearer ${token}`
      }
    });
    
    console.log("Response status:", res.status);
    if(!res.ok) {
      const errorText = await res.text();
      console.error("Error response:", errorText);
      throw new Error(`Failed to load sessions (${res.status}): ${errorText}`);
    }
    
    const data = await res.json();
    console.log("Sessions data:", data);

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
