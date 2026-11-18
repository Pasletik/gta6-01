// Solara Bay — the HUD and the screens. DOM overlay: a live minimap
// canvas, health, money, wanted stars, speed and the current objective,
// plus title / pause / wasted / busted / mission-complete screens.

export function createHud(G, ui) {
  const $ = (id) => document.getElementById(id);
  const minimap = $('minimap');
  const mctx = minimap.getContext('2d');
  const hud = {
    toastTimer: 0,
    bannerTimer: 0,
  };

  function showOnly(id) {
    for (const s of ['screen-title', 'screen-pause', 'screen-wasted', 'screen-busted', 'screen-complete']) {
      $(s).classList.toggle('hidden', s !== id);
    }
    $('hud').classList.toggle('hidden', id !== null);
  }

  hud.showScreen = function (name) {
    if (name === null) {
      showOnly(null);
      return;
    }
    showOnly('screen-' + name);
  };

  hud.toast = function (text) {
    const el = $('toast');
    el.textContent = text;
    el.classList.remove('hidden');
    hud.toastTimer = 3.2;
  };

  hud.banner = function (title, text) {
    $('banner-title').textContent = title;
    $('banner-text').textContent = text;
    $('banner').classList.remove('hidden');
    hud.bannerTimer = 5;
  };

  $('btn-start').addEventListener('click', () => {
    G.audio.ensure();
    ui.onStart(false);
  });
  $('btn-continue').addEventListener('click', () => {
    G.audio.ensure();
    ui.onStart(true);
  });
  $('btn-resume').addEventListener('click', () => ui.onResume());
  $('btn-restart').addEventListener('click', () => ui.onRestart());
  $('btn-retry').addEventListener('click', () => ui.onRestart());
  $('btn-busted').addEventListener('click', () => ui.onRestart());
  $('btn-again').addEventListener('click', () => ui.onRestart());

  const MM = 168; // minimap pixels; world -168..168 maps 1:2
  function toMap(x, z) {
    return [(x + 168) / 2, (z + 168) / 2];
  }

  hud.update = function (dt) {
    if (hud.toastTimer > 0) {
      hud.toastTimer -= dt;
      if (hud.toastTimer <= 0) $('toast').classList.add('hidden');
    }
    if (hud.bannerTimer > 0) {
      hud.bannerTimer -= dt;
      if (hud.bannerTimer <= 0) $('banner').classList.add('hidden');
    }
    // stats
    $('money').textContent = '$' + G.player.money.toLocaleString('en-US');
    const hp = Math.max(0, Math.round(G.player.health));
    $('health-fill').style.width = hp + '%';
    $('health-fill').style.background = hp > 50 ? '#58d68d' : hp > 25 ? '#f2c200' : '#e2553a';
    let stars = '';
    for (let i = 0; i < 3; i++) stars += i < G.wanted.level ? '★' : '☆';
    $('stars').textContent = stars;
    $('stars').style.color = G.wanted.level > 0 ? '#ffd24a' : '#ffffff88';
    const speed = G.player.car ? Math.abs(G.player.car.speed) * 3.6 : 0;
    $('speed').textContent = Math.round(speed) + ' km/h';
    // no crosshair while driving — it would sit on the car's roof
    $('crosshair').style.display = G.player.car ? 'none' : 'block';
    $('objective').textContent = G.missions.currentObjective();
    $('mission-label').textContent = G.missions.done ? 'Story complete' : 'Mission ' + (G.missions.index + 1) + ' of 3';
    // minimap
    const g = mctx;
    g.clearRect(0, 0, MM, MM);
    g.fillStyle = '#20262c';
    g.fillRect(0, 0, MM, MM);
    // ocean + beach
    g.fillStyle = '#2e7fa8';
    g.fillRect(0, MM - 9, MM, 9);
    g.fillRect(MM - 9, 0, 9, MM);
    g.fillStyle = '#e6cf9a';
    g.fillRect(0, MM - 13, MM, 4);
    // park
    g.fillStyle = '#58a447';
    g.fillRect(60, 60, 48, 48);
    // roads
    g.strokeStyle = '#565d66';
    g.lineWidth = 6;
    for (const x of [-144, -96, -48, 0, 48, 96, 144]) {
      const [mx] = toMap(x, 0);
      g.beginPath(); g.moveTo(mx, 0); g.lineTo(mx, MM); g.stroke();
      const [, mz] = toMap(0, x);
      g.beginPath(); g.moveTo(0, mz); g.lineTo(MM, mz); g.stroke();
    }
    // pier
    g.fillStyle = '#8a6b4a';
    const [px0, pz0] = toMap(120, 156);
    g.fillRect(px0, pz0, 12, 26);
    // mission beacon
    if (G.missions.beacon.visible) {
      const [bx, bz] = toMap(G.missions.beacon.position.x, G.missions.beacon.position.z);
      const pulse = 3 + Math.sin(G.time * 4) * 1.5;
      g.fillStyle = '#f2c200';
      g.beginPath(); g.arc(bx, bz, pulse + 2, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#fff';
      g.beginPath(); g.arc(bx, bz, 2, 0, Math.PI * 2); g.fill();
    }
    // traffic + parked cars
    g.fillStyle = '#bbbbbb';
    for (const c of G.vehicles.traffic.concat(G.vehicles.parked)) {
      const [cx, cz] = toMap(c.x, c.z);
      g.fillRect(cx - 1, cz - 1, 2, 2);
    }
    // police
    g.fillStyle = '#4da3ff';
    for (const c of G.vehicles.police) {
      if (!c.active) continue;
      const [cx, cz] = toMap(c.x, c.z);
      g.beginPath(); g.arc(cx, cz, 3, 0, Math.PI * 2); g.fill();
    }
    // peds
    g.fillStyle = '#888888';
    for (const p of G.peds.list) {
      if (p.state === 'down') continue;
      const [px, pz] = toMap(p.x, p.z);
      g.fillRect(px - 1, pz - 1, 2, 2);
    }
    // player arrow
    const [ux, uz] = toMap(G.player.pos.x, G.player.pos.z);
    const heading = G.player.car ? G.player.car.heading : G.player.yaw;
    g.save();
    g.translate(ux, uz);
    g.rotate(Math.atan2(Math.sin(heading), Math.cos(heading)) * -1 + Math.PI);
    g.fillStyle = '#e2553a';
    g.beginPath();
    g.moveTo(0, -6); g.lineTo(4, 5); g.lineTo(0, 2.5); g.lineTo(-4, 5);
    g.closePath();
    g.fill();
    g.restore();
  };

  return hud;
}
