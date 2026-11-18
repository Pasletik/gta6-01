// DOM HUD: money, objective, stars, health, speed, minimap, toasts, screens.
import { CFG } from './config.js';

export class HUD {
  constructor() {
    this.el = (id) => document.getElementById(id);
    this.moneyEl = this.el('money');
    this.objEl = this.el('objective');
    this.starsEl = this.el('stars');
    this.healthEl = this.el('health-fill');
    this.speedEl = this.el('speed');
    this.toastEl = this.el('toast');
    this.crossEl = this.el('crosshair');
    this.vigEl = this.el('vignette');
    this.map = this.el('minimap').getContext('2d');
    this.toastT = 0;
  }
  setMoney(m) { this.moneyEl.textContent = '$' + m.toLocaleString('en-US'); }
  setObjective(t) { this.objEl.textContent = t; }
  setStars(n) {
    this.starsEl.textContent = '★'.repeat(n) + '☆'.repeat(3 - n);
    this.starsEl.style.color = n > 0 ? '#ffd94d' : 'rgba(255,255,255,0.5)';
  }
  setHealth(h) {
    this.healthEl.style.width = Math.max(0, h) + '%';
    this.healthEl.style.background = h > 50 ? '#4caf50' : h > 25 ? '#ff9800' : '#f44336';
  }
  setSpeed(kmh) { this.speedEl.textContent = Math.round(kmh) + ' km/h'; }
  toast(msg, dur = 3.5) {
    this.toastEl.textContent = msg;
    this.toastEl.style.opacity = '1';
    this.toastT = dur;
  }
  clearToast() { this.toastEl.style.opacity = '0'; }
  damageFlash() {
    this.vigEl.style.opacity = '0.85';
    setTimeout(() => { this.vigEl.style.opacity = '0'; }, 180);
  }
  showScreen(name) {
    for (const id of ['screen-title', 'screen-pause', 'screen-wasted', 'screen-busted', 'screen-complete']) {
      this.el(id).style.display = id === name ? 'flex' : 'none';
    }
    this.el('hud').style.display = name === 'screen-title' ? 'none' : 'block';
    this.crossEl.style.display = name ? 'none' : 'block';
  }
  hideScreens() { this.showScreen(null); }
  update(dt, game) {
    if (this.toastT > 0) {
      this.toastT -= dt;
      if (this.toastT <= 0) this.clearToast();
    }
    this.drawMinimap(game);
  }
  drawMinimap(game) {
    const g = this.map, S = 170;
    g.clearRect(0, 0, S, S);
    g.fillStyle = 'rgba(10,14,20,0.78)';
    g.fillRect(0, 0, S, S);
    const X = (x) => ((x + 130) / 260) * S;
    const Z = (z) => ((z + 130) / 330) * S;
    // ocean + beach
    g.fillStyle = '#1a5f8a'; g.fillRect(0, Z(132), S, S - Z(132));
    g.fillStyle = '#c9b183'; g.fillRect(0, Z(119), S, Z(132) - Z(119));
    // park
    g.fillStyle = '#3f7d3a'; g.fillRect(X(-30), Z(-30), X(30) - X(-30), Z(30) - Z(-30));
    // roads
    g.strokeStyle = '#5a6068'; g.lineWidth = 4;
    for (const r of CFG.roads) {
      g.beginPath(); g.moveTo(0, Z(r)); g.lineTo(S, Z(r)); g.stroke();
      g.beginPath(); g.moveTo(X(r), 0); g.lineTo(X(r), S); g.stroke();
    }
    // pier
    g.strokeStyle = '#8a6f4d'; g.lineWidth = 3;
    g.beginPath(); g.moveTo(X(51), Z(119)); g.lineTo(X(51), Z(172)); g.stroke();
    // mission beacon
    if (!game.missions.done) {
      const t = game.missions.targetPos();
      g.fillStyle = '#ffd94d';
      g.save(); g.translate(X(t[0]), Z(t[2])); g.rotate(Math.PI / 4);
      g.fillRect(-4, -4, 8, 8); g.restore();
    }
    const dot = (x, z, col, r = 3) => { g.fillStyle = col; g.beginPath(); g.arc(X(x), Z(z), r, 0, Math.PI * 2); g.fill(); };
    for (const c of game.traffic.cars) dot(c.pos.x, c.pos.z, '#dddddd', 2);
    for (const p of game.wanted.police) if (!p.disabled) dot(p.pos.x, p.pos.z, '#ff4444', 3);
    for (const p of game.peds.list) if (p.state !== 'down') dot(p.pos.x, p.pos.z, '#7dd7ff', 1.6);
    // player arrow
    const pp = game.player.inCar ? game.player.inCar.pos : game.player.pos;
    const h = game.player.inCar ? game.player.inCar.heading : game.player.heading;
    g.save(); g.translate(X(pp.x), Z(pp.z)); g.rotate(Math.atan2(Math.sin(h), -Math.cos(h)) + Math.PI);
    g.fillStyle = '#ffffff';
    g.beginPath(); g.moveTo(0, -7); g.lineTo(5, 6); g.lineTo(-5, 6); g.closePath(); g.fill();
    g.restore();
    // north
    g.fillStyle = '#ffffff'; g.font = 'bold 11px Arial'; g.textAlign = 'left';
    g.fillText('N', 6, 14);
  }
}
