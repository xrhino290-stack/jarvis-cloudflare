"use strict";
// JARVIS orb.js - dense streak orb, turns orange and moves when listening or thinking
// Load after core.js and before app.js
const ORB_IDLE = [43, 212, 255];
const ORB_HOT = [255, 150, 40];
let orbCol = [43, 212, 255], orbTarget = ORB_IDLE, orbSpeed = 0.002, orbSpeedT = 0.002, tilt = 0;
let STREAKS = [], NODES = [];

function rgba(a, whiten) {
  const w = whiten || 0;
  const r = Math.round(orbCol[0] + (255 - orbCol[0]) * w);
  const g = Math.round(orbCol[1] + (255 - orbCol[1]) * w);
  const b = Math.round(orbCol[2] + (255 - orbCol[2]) * w);
  return "rgba(" + r + "," + g + "," + b + "," + a + ")";
}
function makePoint(minR) {
  const u = Math.random() * 2 - 1, a = Math.random() * 6.283, s = Math.sqrt(1 - u * u);
  const rad = minR + (1 - minR) * Math.cbrt(Math.random());
  return { x: s * Math.cos(a), y: u, z: s * Math.sin(a), rad: rad, ph: Math.random() * 6.283 };
}
function initOrb() {
  STREAKS = []; NODES = [];
  for (let i = 0; i < 800; i++) STREAKS.push(makePoint(0.2));
  for (let i = 0; i < 110; i++) NODES.push(makePoint(0.45));
}
function project(p, ang, t, cx, cy, R) {
  const br = 1 + E * 0.07 * Math.sin(t / 170 + p.ph);
  const x0 = p.x * p.rad * br, y0 = p.y * p.rad * br, z0 = p.z * p.rad * br;
  const ca = Math.cos(ang), sa = Math.sin(ang);
  const x1 = x0 * ca - z0 * sa, z1 = x0 * sa + z0 * ca;
  const ct = Math.cos(tilt), stl = Math.sin(tilt);
  const y2 = y0 * ct - z1 * stl, z2 = y0 * stl + z1 * ct;
  const k = 1 / (1.8 - z2 * 0.45);
  return { x: cx + x1 * R * k * 1.62, y: cy + y2 * R * k * 1.62, z: z2 };
}
function drawDisc(cx, cy, R, k0) {
  ctx.fillStyle = "rgba(8,28,44," + 0.35 * k0 + ")";
  ctx.beginPath(); ctx.arc(cx, cy, R * 1.02, 0, 6.283); ctx.fill();
}
function drawCore(cx, cy, R, k0, t) {
  const pulse = 1 + E * 0.18 * Math.sin(t / 220);
  const rr = R * (0.36 + E * 0.12) * pulse;
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rr);
  g.addColorStop(0, rgba(0.95 * k0, 0.8));
  g.addColorStop(0.4, rgba(0.7 * k0, 0.1));
  g.addColorStop(1, rgba(0, 0));
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(cx, cy, rr, 0, 6.283); ctx.fill();
}
function drawStreaks(t, cx, cy, R, k0) {
  const trail = 0.05 + orbSpeed * 6;
  ctx.lineWidth = 1.2; ctx.lineCap = "round";
  for (const p of STREAKS) {
    const sp = 0.6 + (p.ph % 1) * 0.8;
    const a1 = rot * sp, a0 = a1 - trail * sp;
    const q1 = project(p, a1, t, cx, cy, R), q0 = project(p, a0, t, cx, cy, R);
    ctx.strokeStyle = rgba((0.2 + (q1.z + 1) * 0.35) * k0, 0.25);
    ctx.beginPath(); ctx.moveTo(q0.x, q0.y); ctx.lineTo(q1.x, q1.y); ctx.stroke();
  }
}
function drawNodes(t, cx, cy, R, k0) {
  const pts = NODES.map((p) => project(p, rot, t, cx, cy, R));
  const maxD = R * R * 0.04;
  ctx.lineWidth = 0.8;
  for (let i = 0; i < pts.length; i++) {
    for (let j = i + 1; j < pts.length; j++) {
      const dx = pts[i].x - pts[j].x, dy = pts[i].y - pts[j].y, d = dx * dx + dy * dy;
      if (d < maxD) {
        ctx.strokeStyle = rgba((1 - d / maxD) * 0.55 * k0, 0.1);
        ctx.beginPath(); ctx.moveTo(pts[i].x, pts[i].y); ctx.lineTo(pts[j].x, pts[j].y); ctx.stroke();
      }
    }
  }
  for (const q of pts) {
    ctx.fillStyle = rgba((0.5 + (q.z + 1) * 0.25) * k0, 0.45);
    ctx.fillRect(q.x - 1.3, q.y - 1.3, 2.6, 2.6);
  }
}
function draw(t) {
  ctx.clearRect(0, 0, W, H);
  const cx = W / 2, cy = H / 2, R = Math.min(W, H) * 0.5, k0 = sysOn ? 1 : 0.15;
  E += (target - E) * 0.06;
  orbSpeed += (orbSpeedT - orbSpeed) * 0.05;
  for (let i = 0; i < 3; i++) orbCol[i] += (orbTarget[i] - orbCol[i]) * 0.08;
  rot += orbSpeed;
  tilt = E * 0.28 * Math.sin(t / 650);
  drawDisc(cx, cy, R, k0);
  drawCore(cx, cy, R, k0, t);
  drawStreaks(t, cx, cy, R, k0);
  drawNodes(t, cx, cy, R, k0);
  requestAnimationFrame(draw);
}
function setState(s, label) {
  state = s;
  st.textContent = label || s.toUpperCase();
  const hot = s === "listening" || s === "thinking";
  orbTarget = hot ? ORB_HOT : ORB_IDLE;
  target = !sysOn ? 0.05 : s === "speaking" ? 0.9 : hot ? 0.8 : 0.25;
  orbSpeedT = !sysOn ? 0.0004 : s === "speaking" ? 0.006 : hot ? 0.013 : 0.002;
}
initOrb();
// END orb.js
