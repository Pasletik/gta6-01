// The HUD: wanted stars, health, money, mission objective, a live minimap, toasts and the
// title / pause / end screens. All DOM over the WebGL canvas.
import { CITY, FONT } from './config.js';

export function createHud() {
  const $ = (id) => document.getElementById(id);
  const wantedEl = $('wanted');
  const healthFill = $('health-fill');
  const healthText = $('health-text');
  const moneyEl = $('money');
  const missionTitleEl = $('mission-title');
  const objectiveEl = $('objective');
  const toastEl = $('toast');
  const bannerEl = $('banner');
  const bannerTitle = $('banner-title');
  const bannerSub = $('banner-sub');
  const speedEl = $('speed');
  const hintEl = $('hint');
  const minimap = $('minimap');
  const mapCtx = minimap.getContext('2d');
  const titleScreen = $('title-screen');
  const pauseScreen = $('pause-screen');
  const endScreen = $('end-screen');
  const endTitle = $('end-title');
  const endText = $('end-text');
  const crosshair = $('crosshair');

  let toastTimer = null;
  let bannerTimer = null;

  function setWanted(level) {
    let stars = '';
    for (let i = 0; i < 3; i += 1) stars += i < level ? '★' : '☆';
    wantedEl.textContent = stars;
    wantedEl.style.color = level > 0 ? '#ffcf3c' : '#ffffff88';
  }

  function setHealth(value) {
    const v = Math.max(0, Math.min(100, Math.round(value)));
    healthFill.style.width = `${v}%`;
    healthFill.style.background = v > 50 ? '#58c96b' : v > 25 ? '#e8a13c' : '#e5534b';
    healthText.textContent = `${v}`;
  }

  function setMoney(value) {
    moneyEl.textContent = `$${value.toLocaleString('en-US')}`;
  }

  function setMissionTitle(title) {
    missionTitleEl.textContent = title;
  }

  function setObjective(text) {
    objectiveEl.textContent = text;
  }

  function toast(text, ms) {
    toastEl.textContent = text;
    toastEl.style.opacity = '1';
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toastEl.style.opacity = '0';
    }, ms || 4200);
  }

  function hideToast() {
    if (toastTimer) clearTimeout(toastTimer);
    toastEl.style.opacity = '0';
  }

  function setCrosshairVisible(visible) {
    crosshair.style.display = visible ? 'block' : 'none';
  }

  function banner(title, sub) {
    bannerTitle.textContent = title;
    bannerSub.textContent = sub || '';
    bannerEl.style.opacity = '1';
    if (bannerTimer) clearTimeout(bannerTimer);
    bannerTimer = setTimeout(() => {
      bannerEl.style.opacity = '0';
    }, 3200);
  }

  function setSpeed(kmh, inCar, ammo) {
    speedEl.textContent = inCar ? `${Math.round(kmh)} km/h` : '';
    hintEl.textContent = inCar
      ? 'W A S D drive · Space handbrake · E exit car'
      : `W A S D move · Shift run · E enter car · Click shoot (${ammo ?? 12}/12) · R reload`;
  }

  function showScreen(name) {
    titleScreen.style.display = name === 'title' ? 'flex' : 'none';
    pauseScreen.style.display = name === 'pause' ? 'flex' : 'none';
    endScreen.style.display = name === 'end' ? 'flex' : 'none';
    crosshair.style.display = name === 'play' ? 'block' : 'none';
  }

  function showEnd(kind, money) {
    if (kind === 'wasted') {
      endTitle.textContent = 'WASTED';
      endText.textContent = 'Dante went down in Solara Bay. The city keeps your money — start again.';
    } else if (kind === 'busted') {
      endTitle.textContent = 'BUSTED';
      endText.textContent = 'The Solara Bay PD caught up with Dante. Bail is not cheap.';
    } else {
      endTitle.textContent = 'CLEAN — FOR NOW';
      endText.textContent = `Three jobs done, the heat is off and Dante walks away with $${money.toLocaleString('en-US')}. Solara Bay is yours to roam.`;
    }
    showScreen('end');
  }

  // Minimap: whole city, north up, player arrow in the middle of the action.
  function drawMinimap(world, player, cars, peds, marker, time) {
    const size = minimap.width;
    const scale = size / (CITY.half * 2 + 60);
    const toMap = (x, z) => [size / 2 + x * scale, size / 2 + z * scale];
    mapCtx.fillStyle = '#10151c';
    mapCtx.fillRect(0, 0, size, size);
    // Ocean (south edge).
    mapCtx.fillStyle = '#2e7fa8';
    const [, beachY] = toMap(0, CITY.beachFrom);
    mapCtx.fillRect(0, beachY, size, size - beachY);
    // Roads.
    mapCtx.strokeStyle = '#565e68';
    mapCtx.lineWidth = Math.max(2, CITY.roadWidth * scale);
    for (const c of CITY.roads) {
      const [x1] = toMap(c, 0);
      mapCtx.beginPath();
      mapCtx.moveTo(x1, 0);
      mapCtx.lineTo(x1, size);
      mapCtx.stroke();
      const [, z1] = toMap(0, c);
      mapCtx.beginPath();
      mapCtx.moveTo(0, z1);
      mapCtx.lineTo(size, z1);
      mapCtx.stroke();
    }
    // Mission marker.
    if (marker) {
      const [mx, mz] = toMap(marker.x, marker.z);
      const pulse = 5 + Math.sin(time * 4) * 2;
      mapCtx.fillStyle = '#ffd23c';
      mapCtx.beginPath();
      mapCtx.arc(mx, mz, pulse, 0, Math.PI * 2);
      mapCtx.fill();
    }
    // Cars and peds.
    for (const car of cars) {
      if (car.kind === 'parked') continue;
      const [cx, cz] = toMap(car.pos.x, car.pos.z);
      mapCtx.fillStyle = car.kind === 'police' ? '#ff4d4d' : '#ffd23c';
      mapCtx.fillRect(cx - 2, cz - 2, 4, 4);
    }
    mapCtx.fillStyle = '#9aa5b1';
    for (const ped of peds) {
      if (ped.state === 'down') continue;
      const [px, pz] = toMap(ped.pos.x, ped.pos.z);
      mapCtx.fillRect(px - 1, pz - 1, 2, 2);
    }
    // Player arrow: the map is north-up (x right, z down); a heading of 0 faces +z (south,
    // down on the map), so the up-pointing arrow rotates by PI - heading.
    const [px, pz] = toMap(player.pos.x, player.pos.z);
    mapCtx.save();
    mapCtx.translate(px, pz);
    mapCtx.rotate(Math.PI - player.heading);
    mapCtx.fillStyle = '#ffffff';
    mapCtx.beginPath();
    mapCtx.moveTo(0, -7);
    mapCtx.lineTo(5, 6);
    mapCtx.lineTo(0, 3);
    mapCtx.lineTo(-5, 6);
    mapCtx.closePath();
    mapCtx.fill();
    mapCtx.restore();
  }

  return {
    setWanted,
    setHealth,
    setMoney,
    setMissionTitle,
    setObjective,
    toast,
    hideToast,
    setCrosshairVisible,
    banner,
    setSpeed,
    showScreen,
    showEnd,
    drawMinimap,
    font: FONT,
  };
}
