"use strict";
// JARVIS app.js (part 2 of 2) - needs core.js loaded first
const SITES = { youtube: "https://www.youtube.com", google: "https://www.google.com", maps: "https://www.google.com/maps", whatsapp: "https://web.whatsapp.com", gmail: "https://mail.google.com", instagram: "https://www.instagram.com", facebook: "https://www.facebook.com" };
const JOKES = [
  "Sir, WiFi aur main me ek cheez common hai: dono tabhi yaad aate hain jab disconnect ho jaayein.",
  "Programmer ki biwi boli: bazaar se ek dahi laana, aur agar ande dikhein to 6 le aana. Wo 6 dahi le aaya, kyunki ande the.",
  "Sir, mere paas bug nahi hote, sirf unexpected features hote hain."
];
const UNIT = "(sec(?:ond)?s?|min(?:ute)?s?|ghant[ae]|hours?|hrs?)";
const idleLabel = () => (jarvis ? "LISTENING FOR 'HEY JARVIS'" : "STANDBY");
const openTab = (u) => window.open(u, "_blank");

/* COMMANDS: each returns true if it handled the text */
async function cmdBasic(l) {
  if (/^(stop|chup|ruko|bas|shut up|quiet)\b/.test(l)) { speechSynthesis.cancel(); setState("idle", idleLabel()); return true; }
  if (/(kitne baje|time kya|what.?s the time|current time|samay)/.test(l)) {
    say("Sir, abhi " + new Date().toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true }) + " ho rahe hain.");
    return true;
  }
  if (/(\bdate\b|tarikh|aaj kya din|which day|what day)/.test(l)) {
    say("Sir, aaj " + new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" }) + " hai.");
    return true;
  }
  if (/(weather|mausam|temperature|tapman)/.test(l)) { say(await getWeather()); return true; }
  if (/battery/.test(l)) {
    if (!navigator.getBattery) { say("Is browser me battery info nahi milti, Sir."); return true; }
    const b = await navigator.getBattery();
    say("Sir, battery " + Math.round(b.level * 100) + " percent hai" + (b.charging ? " aur charging chal rahi hai." : "."));
    return true;
  }
  if (/(history|chat) (clear|delete)/.test(l)) {
    history = []; log = []; put("jarvis_log", log);
    say("Baat-cheet ki history saaf kar di, Sir.");
    return true;
  }
  return false;
}
async function cmdMath(l) {
  let m = l.match(/(\d+(?:\.\d+)?)\s*([a-z]+)\s*(?:to|in|ko|me|se)\s*([a-z]+)/);
  if (m && CUR[m[2]] && CUR[m[3]]) { say(await currency(+m[1], m[2], m[3])); return true; }
  if (/(\d\s*(?:[+\-*/x^]|plus|minus|times|into|divided by|multiplied by)\s*\d)|calculate|percent of|% of/.test(l)) {
    const r = calc(l);
    if (r) { say(r); return true; }
  }
  return false;
}
function cmdReminder(l) {
  const m = l.match(new RegExp("(\\d+)\\s*" + UNIT));
  if (!m || !/remind|yaad|timer|alarm/.test(l)) return false;
  const n = +m[1], u = /^sec/.test(m[2]) ? 1 : /^m/.test(m[2]) ? 60 : 3600;
  const filler = /\b(remind me|remind|yaad dila(?:o|na)?|yaad|timer|alarm|set|karo|baad|later|after|in|to|ke liye|for|me|ka|ki|ek)\b/g;
  const text = l.replace(m[0], "").replace(filler, " ").replace(/\s+/g, " ").trim() || "samay poora ho gaya";
  rem.push({ at: Date.now() + n * u * 1000, text: text });
  saveRem();
  try { if ("Notification" in window && Notification.permission === "default") Notification.requestPermission(); } catch (e) {}
  say("Theek hai Sir, " + m[1] + " " + m[2] + " baad yaad dila dunga.");
  return true;
}
function cmdNotes(l) {
  let m = l.match(/(?:note karo|note kar lo|note this|remember|yaad rakho|note:)\s*(.+)/);
  if (m) { notes.push({ t: m[1], ts: Date.now() }); put("jarvis_notes", notes); say("Note kar liya, Sir."); return true; }
  if (/(mere notes|show notes|read notes|notes padho|notes dikhao)/.test(l)) {
    if (!notes.length) { say("Abhi koi note nahi hai, Sir."); return true; }
    const last = notes.slice(-3).map((n, i) => (i + 1) + ". " + n.t).join(". ");
    say("Aapke " + notes.length + " notes hain. " + last);
    return true;
  }
  if (/notes/.test(l) && /clear|delete|hata/.test(l)) { notes = []; put("jarvis_notes", notes); say("Saare notes hata diye, Sir."); return true; }
  return false;
}
function cmdFun(l) {
  if (/joke|chutkula|hasao/.test(l)) { say(JOKES[Math.floor(Math.random() * JOKES.length)]); return true; }
  if (/coin|sikka|toss/.test(l)) { say(Math.random() < 0.5 ? "Heads aaya, Sir." : "Tails aaya, Sir."); return true; }
  if (/dice|paasa|ludo/.test(l)) { say("Paase par " + (1 + Math.floor(Math.random() * 6)) + " aaya, Sir."); return true; }
  return false;
}
async function cmdWeb(l) {
  let m = l.match(/(?:open|kholo|khol do|chalu karo)\s+(\w+)|(\w+)\s+(?:kholo|khol do|open karo)/);
  const site = m && (m[1] || m[2]);
  if (site && SITES[site]) { openTab(SITES[site]); say(site + " khol raha hoon, Sir."); return true; }
  m = l.match(/(?:search|google|dhundo|khojo)\s+(?:karo\s+|for\s+)?(.+)/);
  if (m && !/news|latest|aaj|today/.test(l)) {
    openTab("https://www.google.com/search?q=" + encodeURIComponent(m[1]));
    say("Google par " + m[1] + " search kar diya, Sir.");
    return true;
  }
  m = l.match(/(?:youtube par|youtube pe|play)\s+(.+)/);
  if (m) {
    openTab("https://www.youtube.com/results?search_query=" + encodeURIComponent(m[1]));
    say("YouTube par " + m[1] + " dhundh raha hoon.");
    return true;
  }
  m = l.match(/(?:map|route|directions?|raasta)\D*(?:to|for|ka|ke liye)?\s+(.+)/);
  if (m && /map|route|direction|raasta/.test(l)) {
    openTab("https://www.google.com/maps/search/" + encodeURIComponent(m[1]));
    say("Maps me " + m[1] + " khol diya, Sir.");
    return true;
  }
  m = l.match(/(?:wikipedia|wiki)\s+(?:par\s+|for\s+)?(.+)/);
  if (m) { say(await wiki(m[1])); return true; }
  return false;
}
async function cmdAI(q) {
  if (!navigator.onLine) { say("Internet band hai, Sir. Offline commands hi chalenge.", true); return; }
  let ans;
  try {
    ans = await askAI(q);
  } catch (e) {
    if (!cfg.worker) throw e;
    try {
      const topic = q.replace(/^(who is|what is|kaun hai|kya hai)\s*/i, "");
      ans = "AI abhi busy hai, Sir, par Wikipedia ke mutabik: " + (await wiki(topic));
    } catch (e2) { throw e; }
  }
  history.push({ role: "user", text: q }, { role: "model", text: ans });
  say(ans);
}
async function handle(raw) {
  const q = raw.trim();
  if (!q || !sysOn) return;
  const l = q.toLowerCase();
  show("> " + q); addLog("u", q); setState("thinking", "PROCESSING");
  try {
    if (await cmdBasic(l)) return;
    if (await cmdMath(l)) return;
    if (cmdReminder(l)) return;
    if (cmdNotes(l)) return;
    if (cmdFun(l)) return;
    if (await cmdWeb(l)) return;
    await cmdAI(q);
  } catch (e) {
    say(e.message || "Kuch gadbad ho gayi, Sir.", true);
  }
}

/* MIC */
function stopRec() { listening = false; try { if (rec) rec.abort(); } catch (e) {} }
function onWakeText(t) {
  const m = t.toLowerCase().match(/(?:hey |hi |ok |arre )?(?:jarvis|jarvish|service)\b[\s,]*(.*)/);
  if (!m) return;
  stopRec();
  if (m[1]) handle(m[1]); else say("Ji Sir, boliye.");
}
function startRec(wake) {
  if (!SR) { say("Is browser me mic support nahi hai. Chrome use karo ya type karo.", true); return; }
  if (!sysOn || state === "speaking") return;
  stopRec();
  rec = new SR();
  rec.lang = cfg.lang; rec.interimResults = false; rec.continuous = !!wake;
  rec.onstart = () => { listening = true; setState("listening", wake ? "LISTENING FOR 'HEY JARVIS'" : "LISTENING"); };
  rec.onresult = (e) => {
    const t = e.results[e.results.length - 1][0].transcript.trim();
    if (wake) onWakeText(t); else handle(t);
  };
  rec.onerror = (e) => {
    if (e.error === "not-allowed" || e.error === "service-not-allowed") {
      jarvis = false; sync(); say("Mic ki permission do, Sir.", true);
    }
  };
  rec.onend = () => {
    listening = false;
    const again = wake && jarvis && sysOn && state !== "speaking" && state !== "thinking";
    if (again) setTimeout(() => startRec(true), 300);
    else if (state === "listening") setState("idle");
  };
  try { rec.start(); } catch (e) {}
}

/* WAKE LOCK */
async function wl(on) {
  try {
    if (on && "wakeLock" in navigator && !lock) {
      lock = await navigator.wakeLock.request("screen");
      lock.onrelease = () => { lock = null; };
    } else if (!on && lock) {
      await lock.release(); lock = null;
    }
  } catch (e) {}
}
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible" && jarvis) wl(true); });

/* UI */
function sync() {
  $("bSys").textContent = sysOn ? "SYSTEM ON" : "SYSTEM OFF";
  $("bSys").classList.toggle("on", sysOn);
  $("bJar").textContent = jarvis ? "JARVIS MODE ON" : "JARVIS MODE OFF";
  $("bJar").classList.toggle("on", jarvis);
  $("bJar").disabled = !sysOn; $("talk").disabled = !sysOn; $("txt").disabled = !sysOn;
}
function panel(open) {
  $("panel").classList.toggle("show", open);
  if (!open) return;
  $("wUrl").value = cfg.worker; $("vSel").value = cfg.voice; $("lSel").value = cfg.lang;
  $("vRate").value = cfg.rate; $("vPitch").value = cfg.pitch;
  $("rv").textContent = cfg.rate; $("pv").textContent = cfg.pitch;
}
function readForm() {
  cfg.worker = $("wUrl").value.trim(); cfg.voice = $("vSel").value; cfg.lang = $("lSel").value;
  cfg.rate = $("vRate").value; cfg.pitch = $("vPitch").value;
  put("jarvis_cfg", cfg);
}
$("bSys").onclick = () => {
  sysOn = !sysOn;
  if (!sysOn) { jarvis = false; stopRec(); speechSynthesis.cancel(); wl(false); setState("idle", "OFFLINE"); show("System band hai."); }
  else { setState("idle", "STANDBY"); say("System online, Sir."); }
  sync();
};
$("bJar").onclick = () => {
  jarvis = !jarvis; sync(); wl(jarvis);
  if (jarvis) say("Jarvis mode on. Bas 'Hey Jarvis' bolo, Sir.");
  else { stopRec(); setState("idle", "STANDBY"); show("Jarvis mode band."); }
};
$("talk").onclick = () => {
  if (state === "speaking") speechSynthesis.cancel();
  if (listening) { stopRec(); setState("idle", "STANDBY"); } else { startRec(false); }
};
$("txt").addEventListener("keydown", (e) => {
  if (e.key === "Enter" && $("txt").value.trim()) { const v = $("txt").value; $("txt").value = ""; handle(v); }
});
[["Mausam", "mausam kaisa hai"], ["Time", "kitne baje"], ["News", "latest news India"], ["Joke", "joke sunao"], ["Notes", "mere notes"], ["Battery", "battery kitni hai"]].forEach((c) => {
  const b = document.createElement("button");
  b.className = "b"; b.textContent = c[0]; b.onclick = () => handle(c[1]);
  $("chips").appendChild(b);
});
$("bVoice").onclick = () => panel(true);
$("vRate").oninput = (e) => { $("rv").textContent = e.target.value; };
$("vPitch").oninput = (e) => { $("pv").textContent = e.target.value; };
$("vTest").onclick = () => { readForm(); speak("Namaste Sir, main Jarvis hoon. Aapki seva me hazir."); };
$("vSave").onclick = () => { readForm(); panel(false); show("Settings save ho gayi, Sir."); };
$("bLog").onclick = () => { renderLog(); $("logp").classList.add("show"); };
$("logX").onclick = () => $("logp").classList.remove("show");
$("logClr").onclick = () => { log = []; put("jarvis_log", log); renderLog(); };
window.addEventListener("online", () => { $("net").textContent = ""; });
window.addEventListener("offline", () => { $("net").textContent = "OFFLINE"; });

const hr = new Date().getHours();
out.textContent = (hr < 12 ? "Good morning" : hr < 17 ? "Good afternoon" : "Good evening") + ", Sir. Main taiyaar hoon. Tap karo ya type karo.";
if (!navigator.onLine) $("net").textContent = "OFFLINE";
sync();
setState("idle", "STANDBY");
// END app.js
