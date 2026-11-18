// Solara Bay — the HUD and the screens. One job: draw every pixel of the
// interface (money, health, stars, speed, objective, minimap) and run the
// title / pause / wasted / busted / complete screens.

export class Hud {
  constructor() {
    this.root = document.getElementById('hud');
    this.moneyEl = document.getElementById('hud-money');
    this.healthFill = document.getElementById('hud-health-fill');
    this.starsEl = document.getElementById('hud-stars');
    this.speedEl = document.getElementById('hud-speed');
    this.objectiveEl = document.getElementById('hud-objective');
    this.toastEl = document.getElementById('hud-toast');
    this.crosshair = document.getElementById('hud-crosshair');
    this.map = document.getElementById('hud-minimap');
    this.mapCtx = this.map.getContext('2d');
    this.toastTimer = 0;
    this.screens = {
      title: document.getElementById('screen-title'),
      pause: document.getElementById('screen-pause'),
      wasted: document.getElementById('screen-wasted'),
      busted: document.getElementById('screen-busted'),
      complete: document.getElementById('screen-complete'),
    };
    this.completeStats = document.getElementById('complete-stats');
  }

  showScreen(name) {
    for (const [key, el] of Object.entries(this.screens)) {
      el.classList.toggle('hidden', key !== name);
    }
    this.root.classList.toggle('hidden', name === 'title');
    if (name) this.crosshair.classList.add('hidden');
  }

  hideScreens() {
    for (const el of Object.values(this.screens)) el.classList.add('hidden');
    this.root.classList.remove('hidden');
  }

  setMoney(n) {
    this.moneyEl.textContent = '$' + Math.floor(n).toLocaleString('en-US');
  }

  setHealth(h) {
    this.healthFill.style.width = Math.max(0, Math.min(100, h)) + '%';
    this.healthFill.style.background = h > 50 ? '#2ecc71' : h > 25 ? '#f39c12' : '#e74c3c';
  }

  setStars(n) {
    let s = '';
    for (let i = 0; i < 3; i++) s += i < n ? '★' : '☆';
    this.starsEl.textContent = s;
    this.starsEl.classList.toggle('hot', n > 0);
  }

  setSpeed(kmh, driving) {
    if (driving) {
      this.speedEl.textContent = Math.round(kmh) + ' km/h';
      this.speedEl.classList.remove('hidden');
    } else {
      this.speedEl.classList.add('hidden');
    }
  }

  setObjective(title, text) {
    this.objectiveEl.innerHTML = '<b>' + title + '</b><span>' + text + '</span>';
  }

  setCrosshair(on) {
    this.crosshair.classList.toggle('hidden', !on);
  }

  toast(text, seconds = 3) {
    this.toastEl.textContent = text;
    this.toastEl.classList.remove('hidden');
    this.toastTimer = seconds;
  }

  updateToast(dt) {
    if (this.toastTimer > 0) {
      this.toastTimer -= dt;
      if (this.toastTimer <= 0) this.toastEl.classList.add('hidden');
    }
  }

  // Top-down minimap: roads, park, beach, sea, mission marker, cars, police,
  // peds and the player arrow. `view` is { half } in world units.
  drawMinimap(view, player, cars, police, peds, missionMarker) {
    const ctx = this.mapCtx;
    const W = this.map.width;
    const H = this.map.height;
    const scale = W / (view.half * 2 + 60);
    const toX = (x) => W / 2 + x * scale;
    const toZ = (z) => H / 2 + z * scale;
    ctx.clearRect(0, 0, W, H);
    // Sea and beach (south edge).
    ctx.fillStyle = '#1d6f9e';
    ctx.fillRect(0, toZ(-view.half - 26), W, H - toZ(-view.half - 26));
    ctx.fillStyle = '#e0c896';
    ctx.fillRect(0, toZ(-view.half - 26), W, toZ(-view.half) - toZ(-view.half - 26));
    // City ground.
    ctx.fillStyle = '#3a3d42';
    ctx.fillRect(toX(-view.half), toZ(-view.half), view.half * 2 * scale, view.half * 2 * scale);
    // Park.
    ctx.fillStyle = '#4e8f3a';
    ctx.fillRect(toX(-23), toZ(-23), 46 * scale, 46 * scale);
    // Roads: lighter lines on the grid.
    ctx.strokeStyle = '#565b62';
    ctx.lineWidth = 2;
    for (const c of view.roads) {
      ctx.beginPath(); ctx.moveTo(toX(-view.half), toZ(c)); ctx.lineTo(toX(view.half), toZ(c)); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(toX(c), toZ(-view.half)); ctx.lineTo(toX(c), toZ(view.half)); ctx.stroke();
    }
    // Mission marker: pulsing yellow diamond.
    if (missionMarker) {
      const pulse = 5 + Math.sin(performance.now() / 200) * 2;
      ctx.fillStyle = '#f1c40f';
      ctx.beginPath();
      ctx.moveTo(toX(missionMarker.x), toZ(missionMarker.z) - pulse - 3);
      ctx.lineTo(toX(missionMarker.x) + pulse + 3, toZ(missionMarker.z));
      ctx.lineTo(toX(missionMarker.x), toZ(missionMarker.z) + pulse + 3);
      ctx.lineTo(toX(missionMarker.x) - pulse - 3, toZ(missionMarker.z));
      ctx.closePath();
      ctx.fill();
    }
    // Peds as grey dots.
    ctx.fillStyle = '#bbbbbb';
    for (const p of peds) ctx.fillRect(toX(p.x) - 1, toZ(p.z) - 1, 2, 2);
    // Traffic as white dots.
    ctx.fillStyle = '#ffffff';
    for (const c of cars) ctx.fillRect(toX(c.x) - 1.5, toZ(c.z) - 1.5, 3, 3);
    // Police as blue squares.
    ctx.fillStyle = '#4488ff';
    for (const c of police) ctx.fillRect(toX(c.x) - 2.5, toZ(c.z) - 2.5, 5, 5);
    // Player arrow (rotates with heading).
    const px = toX(player.x);
    const pz = toZ(player.z);
    ctx.save();
    ctx.translate(px, pz);
    ctx.rotate(-player.heading);
    ctx.fillStyle = '#2ecc71';
    ctx.beginPath();
    ctx.moveTo(0, -6);
    ctx.lineTo(4.5, 5);
    ctx.lineTo(0, 2.5);
    ctx.lineTo(-4.5, 5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}
