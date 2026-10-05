"use strict";
// JARVIS core.js (part 1 of 2)
const $ = (id) => document.getElementById(id);
const out = $("out"), st = $("st"), cv = $("cv"), ctx = cv.getContext("2d");
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
function load(k, d) { try { return JSON.parse(localStorage.getItem(k)) || d; } catch (e) { return d; } }
function put(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
let cfg = Object.assign({ worker: "", voice: "auto", rate: 0.95, pitch: 0.75, lang: "en-IN" }, load("jarvis_cfg", {}));
let notes = load("jarvis_notes", []), rem = load("jarvis_rem", []), log = load("jarvis_log", []);
let sysOn = true, jarvis = false, state = "idle", rec = null, listening = false;
let history = [], voices = [], lock = null;

/* ORB */
let W = 0, H = 0, P = [], E = 0, target = 0.25, rot = 0;
function size() {
  const r = cv.getBoundingClientRect(), d = Math.min(window.devicePixelRatio || 1, 2);
  W = r.width; H = r.height; cv.width = W * d; cv.height = H * d;
  ctx.setTransform(d, 0, 0, d, 0, 0);
}
function initOrb() {
  P = [];
  for (let i = 0; i < 190; i++) {
    const u = Math.random() * 2 - 1, a = Math.random() * 6.283, s = Math.sqrt(1 - u * u);
    const R = 0.78 + Math.random() * 0.22;
    P.push({ x: s * Math.cos(a) * R, y: u * R, z: s * Math.sin(a) * R });
  }
}
function drawGlow(cx, cy, R, k0, t) {
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * (0.55 + E * 0.25));
  g.addColorStop(0, "rgba(190,245,255," + 0.9 * k0 + ")");
  g.addColorStop(0.35, "rgba(43,212,255," + 0.55 * k0 + ")");
  g.addColorStop(1, "rgba(43,212,255,0)");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(cx, cy, R * (0.6 + E * 0.25 + Math.sin(t / 500) * 0.02), 0, 6.283);
  ctx.fill();
}
function drawNet(cx, cy, R, k0) {
  const cr = Math.cos(rot), sr = Math.sin(rot), pts = [];
  for (const p of P) {
    const x = p.x * cr - p.z * sr, z = p.x * sr + p.z * cr, k = 1 / (1.9 - z * 0.5);
    pts.push({ x: cx + x * R * k * 1.5, y: cy + p.y * R * k * 1.5, a: 0.25 + (z + 1) * 0.35 });
  }
  ctx.lineWidth = 0.7;
  for (let i = 0; i < pts.length; i++) {
    for (let j = i + 1; j < pts.length; j += 3) {
      const dx = pts[i].x - pts[j].x, dy = pts[i].y - pts[j].y, d = dx * dx + dy * dy;
      if (d < 2600) {
        ctx.strokeStyle = "rgba(43,212,255," + (1 - d / 2600) * 0.35 * k0 + ")";
        ctx.beginPath(); ctx.moveTo(pts[i].x, pts[i].y); ctx.lineTo(pts[j].x, pts[j].y); ctx.stroke();
      }
    }
  }
  for (const p of pts) {
    ctx.fillStyle = "rgba(120,230,255," + p.a * k0 + ")";
    ctx.fillRect(p.x, p.y, 2, 2);
  }
}
function draw(t) {
  ctx.clearRect(0, 0, W, H);
  const cx = W / 2, cy = H / 2, R = Math.min(W, H) * 0.46, k0 = sysOn ? 1 : 0.15;
  E += (target - E) * 0.06;
  rot += 0.0025 + E * 0.01;
  drawGlow(cx, cy, R, k0, t);
  drawNet(cx, cy, R, k0);
  requestAnimationFrame(draw);
}
function setState(s, label) {
  state = s;
  st.textContent = label || s.toUpperCase();
  target = !sysOn ? 0.05 : s === "speaking" ? 0.9 : s === "listening" ? 0.6 : s === "thinking" ? 0.45 : 0.25;
}
window.addEventListener("resize", size);
size(); initOrb(); requestAnimationFrame(draw);

/* OUTPUT + LOG */
let tw = 0;
function show(t, isErr) {
  clearInterval(tw);
  out.className = isErr ? "err" : "";
  out.textContent = "";
  let i = 0;
  tw = setInterval(() => {
    i += 3;
    out.textContent = t.slice(0, i);
    out.scrollTop = out.scrollHeight;
    if (i >= t.length) clearInterval(tw);
  }, 16);
}
function addLog(r, t) { log.push({ r: r, t: t, ts: Date.now() }); log = log.slice(-60); put("jarvis_log", log); }
function renderLog() {
  const box = $("logs");
  box.textContent = "";
  if (!log.length) { box.textContent = "Abhi koi baat-cheet nahi hui."; return; }
  log.forEach((m) => {
    const d = document.createElement("div");
    d.className = "m " + m.r;
    d.textContent = m.t;
    const s = document.createElement("small");
    s.textContent = new Date(m.ts).toLocaleString("en-IN", { hour: "numeric", minute: "2-digit", day: "numeric", month: "short" });
    d.appendChild(s);
    box.appendChild(d);
  });
  $("logp").scrollTop = 1e6;
}

/* VOICE (browser TTS) */
function loadVoices() {
  voices = speechSynthesis.getVoices();
  const s = $("vSel");
  s.innerHTML = "";
  const a = document.createElement("option");
  a.value = "auto"; a.textContent = "Auto (male)";
  s.appendChild(a);
  voices.forEach((v) => {
    const o = document.createElement("option");
    o.value = v.name; o.textContent = v.name + " (" + v.lang + ")";
    s.appendChild(o);
  });
  s.value = cfg.voice;
}
if ("speechSynthesis" in window) { loadVoices(); speechSynthesis.onvoiceschanged = loadVoices; }
function pickVoice() {
  if (cfg.voice !== "auto") {
    const v = voices.find((x) => x.name === cfg.voice);
    if (v) return v;
  }
  const male = /male|madhur|ravi|hemant|david|rishi|prabhat|guy|daniel|james|alex/i;
  const tests = [(v) => /en-IN|hi-IN/i.test(v.lang), (v) => /^en/i.test(v.lang)];
  for (const f of tests) {
    const v = voices.find((x) => f(x) && male.test(x.name) && !/female/i.test(x.name));
    if (v) return v;
  }
  return voices.find((x) => /en-IN|hi-IN/i.test(x.lang)) || voices[0] || null;
}
function splitSentences(text) {
  const clean = text.replace(/[*_`#]/g, "").replace(/https?:\/\/\S+/g, "link");
  const parts = clean.match(/[^.!?]+[.!?]*/g) || [clean];
  return parts.map((p) => p.trim()).filter(Boolean);
}
function speak(text, done) {
  if (!("speechSynthesis" in window)) { if (done) done(); return; }
  speechSynthesis.cancel();
  const parts = splitSentences(text), v = pickVoice();
  let n = 0;
  function finish() {
    setState("idle", jarvis ? "LISTENING FOR 'HEY JARVIS'" : "STANDBY");
    if (done) done();
  }
  function next() {
    if (n >= parts.length) { finish(); return; }
    const u = new SpeechSynthesisUtterance(parts[n]);
    n += 1;
    if (v) { u.voice = v; u.lang = v.lang; } else { u.lang = "en-IN"; }
    u.rate = +cfg.rate; u.pitch = +cfg.pitch;
    if (n === 1) u.onstart = () => setState("speaking", "SPEAKING");
    u.onend = next; u.onerror = finish;
    speechSynthesis.speak(u);
  }
  next();
}
function say(text, isErr) {
  show(text, isErr);
  if (!isErr) addLog("j", text);
  stopRec();
  speak(text, () => { if (jarvis && sysOn) startRec(true); });
}

/* LIVE DATA */
const WMO = { 0: "saaf aasmaan", 1: "mostly saaf", 2: "thode badal", 3: "badal chhaye hue", 45: "kohra", 48: "kohra", 51: "halki boondabandi", 53: "boondabandi", 55: "tez boondabandi", 61: "halki baarish", 63: "baarish", 65: "tez baarish", 71: "barfbari", 80: "baarish ki bauchhaar", 81: "baarish ki bauchhaar", 82: "tez bauchhaar", 95: "garaj ke saath toofan", 96: "toofan aur ole", 99: "toofan aur ole" };
async function fetchWeather(lat, lon) {
  const url = "https://api.open-meteo.com/v1/forecast?latitude=" + lat + "&longitude=" + lon + "&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&timezone=auto";
  const c = (await (await fetch(url)).json()).current;
  return "Sir, abhi temperature " + Math.round(c.temperature_2m) + " degree hai, " + (WMO[c.weather_code] || "mausam theek hai") + ". Humidity " + c.relative_humidity_2m + " percent aur hawa " + Math.round(c.wind_speed_10m) + " kilometre per hour.";
}
function getWeather() {
  return new Promise((res, rej) => {
    if (!navigator.geolocation) { rej(new Error("Location support nahi hai, Sir.")); return; }
    navigator.geolocation.getCurrentPosition(
      (p) => { fetchWeather(p.coords.latitude, p.coords.longitude).then(res, rej); },
      () => rej(new Error("Location permission do, Sir.")),
      { timeout: 9000 }
    );
  });
}
async function wiki(q) {
  const api = "https://en.wikipedia.org/w/api.php?action=query&list=search&srlimit=1&format=json&origin=*&srsearch=";
  const s = await (await fetch(api + encodeURIComponent(q))).json();
  const hit = s.query && s.query.search[0];
  if (!hit) throw new Error("Kuch nahi mila, Sir.");
  const d = await (await fetch("https://en.wikipedia.org/api/rest_v1/page/summary/" + encodeURIComponent(hit.title))).json();
  return d.extract.split(". ").slice(0, 3).join(". ") + ".";
}
const CUR = { dollar: "USD", dollars: "USD", usd: "USD", euro: "EUR", euros: "EUR", eur: "EUR", pound: "GBP", pounds: "GBP", gbp: "GBP", rupee: "INR", rupees: "INR", rupaye: "INR", inr: "INR", yen: "JPY", jpy: "JPY", dirham: "AED", aed: "AED" };
async function currency(n, a, b) {
  const f = CUR[a], t = CUR[b];
  const d = await (await fetch("https://open.er-api.com/v6/latest/" + f)).json();
  if (!d.rates || !d.rates[t]) throw new Error("Rate nahi mil paya, Sir.");
  return n + " " + f + " matlab lagbhag " + (n * d.rates[t]).toFixed(2) + " " + t + " hai, Sir.";
}
function calc(l) {
  let e = l.replace(/(\d+(?:\.\d+)?)\s*(?:%|percent)\s*of\s*(\d+(?:\.\d+)?)/g, "($1/100*$2)");
  e = e.replace(/divided by/g, "/").replace(/multiplied by|times|into/g, "*").replace(/plus/g, "+").replace(/minus/g, "-");
  e = e.replace(/(\d)\s*x\s*(\d)/g, "$1*$2").replace(/\^/g, "**").replace(/[^0-9+\-*/().% ]/g, "");
  if (!/\d/.test(e)) return null;
  let r;
  try { r = Function('"use strict";return (' + e + ")")(); } catch (x) { return null; }
  return isFinite(r) ? "Sir, jawab hai " + Math.round(r * 1e6) / 1e6 + "." : null;
}

/* REMINDERS */
function saveRem() { put("jarvis_rem", rem); }
function fire(r) {
  const t = "Sir, yaad dila raha hoon: " + r.text;
  if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
  try { if ("Notification" in window && Notification.permission === "granted") new Notification("JARVIS", { body: r.text }); } catch (e) {}
  if (sysOn) say(t); else show(t);
}
setInterval(() => {
  const n = Date.now(), due = rem.filter((r) => r.at <= n);
  if (due.length) { rem = rem.filter((r) => r.at > n); saveRem(); due.forEach(fire); }
}, 2000);

/* AI (Worker) with timeout + retry */
const LIVE = /latest|news|aaj|today|current|abhi|score|price|rate|cricket|result|khabar|trending|2025|2026/i;
function pickReply(d) {
  const c = d.candidates && d.candidates[0];
  const fromC = c && c.content && c.content.parts.map((p) => p.text).join("");
  return d.reply || d.text || d.answer || d.response || d.message || fromC;
}
async function askOnce(body) {
  const ac = new AbortController(), to = setTimeout(() => ac.abort(), 20000);
  try {
    const r = await fetch(cfg.worker, { method: "POST", headers: { "Content-Type": "application/json" }, body: body, signal: ac.signal });
    if (!r.ok) throw new Error("Server error " + r.status);
    const t = pickReply(await r.json());
    if (!t) throw new Error("Khaali jawab aaya");
    return t;
  } catch (e) {
    if (e.name === "AbortError") throw new Error("Server ne der kar di, Sir.");
    throw e;
  } finally {
    clearTimeout(to);
  }
}
async function askAI(q) {
  if (!cfg.worker) { panel(true); throw new Error("Pehle VOICE me Worker URL daalo, Sir."); }
  const body = JSON.stringify({ message: q, prompt: q, history: history.slice(-8), live: LIVE.test(q), search: LIVE.test(q) });
  try {
    return await askOnce(body);
  } catch (e) {
    await new Promise((r) => setTimeout(r, 700));
    return askOnce(body);
  }
}
// END core.js
