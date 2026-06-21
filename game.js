(() => {
  'use strict';

  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d', { alpha: false });
  const scoreEl = document.getElementById('score');
  const bestEl = document.getElementById('best');
  const speedEl = document.getElementById('speed');
  const overlay = document.getElementById('overlay');
  const startButton = document.getElementById('startButton');

  const W = canvas.width;
  const H = canvas.height;
  const LANES = [-180, 0, 180];
  const ROAD_TOP = 190;
  const ROAD_BOTTOM = 940;
  const DEPTH = ROAD_BOTTOM - ROAD_TOP;
  const DPR = Math.min(window.devicePixelRatio || 1, 2);
  const STORE_KEY = 'pink-metro-rush-best';

  let best = Number(localStorage.getItem(STORE_KEY) || 0);
  let running = false;
  let lastTime = 0;
  let spawnTimer = 0;
  let pickupTimer = 0;
  let distance = 0;
  let score = 0;
  let speed = 520;
  let shake = 0;
  let raf = 0;

  const player = {
    lane: 1,
    x: W / 2,
    y: 780,
    vy: 0,
    jump: 0,
    slide: 0,
    invincible: 0,
  };

  const obstacles = [];
  const pickups = [];
  const particles = [];
  const keys = new Set();

  function fitCanvas() {
    const box = canvas.getBoundingClientRect();
    canvas.width = Math.round(box.width * DPR);
    canvas.height = Math.round(box.height * DPR);
    ctx.setTransform(canvas.width / W, 0, 0, canvas.height / H, 0, 0);
  }

  function reset() {
    obstacles.length = pickups.length = particles.length = 0;
    Object.assign(player, { lane: 1, x: W / 2, y: 780, vy: 0, jump: 0, slide: 0, invincible: 0 });
    spawnTimer = 0.35;
    pickupTimer = 1.1;
    distance = score = 0;
    speed = 520;
    shake = 0;
    running = true;
    lastTime = performance.now();
    overlay.classList.add('hidden');
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(loop);
  }

  function endGame() {
    running = false;
    shake = 18;
    best = Math.max(best, Math.floor(score));
    localStorage.setItem(STORE_KEY, String(best));
    bestEl.textContent = best;
    overlay.querySelector('h1').textContent = 'Run Complete!';
    overlay.querySelector('p').textContent = `Score ${Math.floor(score)} — dodge faster and collect more hearts next time.`;
    startButton.textContent = 'Run Again';
    overlay.classList.remove('hidden');
  }

  function laneX(lane, depth) {
    return W / 2 + LANES[lane] * (0.38 + depth * 0.62);
  }

  function depthScale(z) {
    return 0.22 + z * 0.98;
  }

  function spawnObstacle() {
    const lane = Math.floor(Math.random() * 3);
    const type = Math.random() < 0.58 ? 'train' : Math.random() < 0.72 ? 'barrier' : 'cone';
    obstacles.push({ lane, z: 0, type, passed: false });
  }

  function spawnPickup() {
    pickups.push({ lane: Math.floor(Math.random() * 3), z: 0, spin: 0 });
  }

  function burst(x, y, color, amount = 10) {
    for (let i = 0; i < amount; i++) {
      particles.push({ x, y, vx: (Math.random() - 0.5) * 220, vy: -Math.random() * 220, life: 0.55, color });
    }
  }

  function moveLane(dir) {
    player.lane = Math.max(0, Math.min(2, player.lane + dir));
  }

  function jump() {
    if (player.jump <= 0.01) player.vy = 860;
  }

  function slide() {
    player.slide = 0.52;
  }

  function handleInput() {
    if (keys.has('arrowleft') || keys.has('a')) { moveLane(-1); keys.delete('arrowleft'); keys.delete('a'); }
    if (keys.has('arrowright') || keys.has('d')) { moveLane(1); keys.delete('arrowright'); keys.delete('d'); }
    if (keys.has('arrowup') || keys.has('w') || keys.has(' ')) { jump(); keys.delete('arrowup'); keys.delete('w'); keys.delete(' '); }
    if (keys.has('arrowdown') || keys.has('s')) { slide(); keys.delete('arrowdown'); keys.delete('s'); }
  }

  function update(dt) {
    handleInput();
    distance += speed * dt;
    score += dt * (10 + speed * 0.045);
    speed = Math.min(1180, 520 + distance * 0.042);
    spawnTimer -= dt;
    pickupTimer -= dt;
    if (spawnTimer <= 0) { spawnObstacle(); spawnTimer = Math.max(0.42, 1.04 - speed / 1900) + Math.random() * 0.24; }
    if (pickupTimer <= 0) { spawnPickup(); pickupTimer = 0.7 + Math.random() * 1.1; }

    player.x += (laneX(player.lane, 1) - player.x) * Math.min(1, dt * 13);
    player.vy -= 2400 * dt;
    player.jump = Math.max(0, player.jump + player.vy * dt);
    if (player.jump === 0) player.vy = Math.max(0, player.vy);
    player.slide = Math.max(0, player.slide - dt);
    player.invincible = Math.max(0, player.invincible - dt);

    for (let i = obstacles.length - 1; i >= 0; i--) {
      const o = obstacles[i];
      o.z += (speed / DEPTH) * dt;
      if (o.z > 1.12) obstacles.splice(i, 1);
      const near = o.z > 0.78 && o.z < 1.04 && o.lane === player.lane;
      const canClear = (o.type === 'barrier' && player.jump > 88) || (o.type === 'cone' && player.slide > 0);
      if (near && !canClear && player.invincible <= 0) endGame();
      if (!o.passed && o.z > 1) { o.passed = true; score += 25; }
    }

    for (let i = pickups.length - 1; i >= 0; i--) {
      const p = pickups[i];
      p.z += (speed / DEPTH) * dt;
      p.spin += dt * 8;
      if (p.z > 1.12) pickups.splice(i, 1);
      if (p.z > 0.84 && p.z < 1.05 && p.lane === player.lane) {
        score += 120;
        burst(laneX(p.lane, p.z), ROAD_TOP + p.z * DEPTH, '#ffd6ec', 16);
        pickups.splice(i, 1);
      }
    }

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 520 * dt;
      if (p.life <= 0) particles.splice(i, 1);
    }

    scoreEl.textContent = Math.floor(score);
    bestEl.textContent = best;
    speedEl.textContent = `${(speed / 520).toFixed(1)}x`;
  }

  function drawTrack() {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#ffb1d8');
    g.addColorStop(0.35, '#7e2a79');
    g.addColorStop(1, '#230b26');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = '#1f1026';
    ctx.beginPath();
    ctx.moveTo(180, H); ctx.lineTo(290, ROAD_TOP); ctx.lineTo(430, ROAD_TOP); ctx.lineTo(540, H); ctx.closePath();
    ctx.fill();

    for (let lane = 0; lane < 4; lane++) {
      const a = 230 + lane * 86;
      ctx.strokeStyle = lane === 0 || lane === 3 ? '#ff8fc9' : 'rgba(255, 216, 238, 0.7)';
      ctx.lineWidth = lane === 0 || lane === 3 ? 7 : 3;
      ctx.beginPath(); ctx.moveTo(a, ROAD_TOP); ctx.lineTo(170 + lane * 126, H); ctx.stroke();
    }

    ctx.strokeStyle = 'rgba(255,255,255,0.18)';
    for (let z = (distance / 260) % 1; z < 1; z += 0.11) {
      const y = ROAD_TOP + z * DEPTH;
      const half = 34 + z * 260;
      ctx.lineWidth = 2 + z * 8;
      ctx.beginPath(); ctx.moveTo(W / 2 - half, y); ctx.lineTo(W / 2 + half, y); ctx.stroke();
    }

    ctx.fillStyle = 'rgba(255, 105, 180, 0.3)';
    for (let i = 0; i < 10; i++) {
      const y = (i * 120 + distance * 0.25) % H;
      ctx.fillRect(40, y, 72, 10); ctx.fillRect(W - 112, (y + 60) % H, 72, 10);
    }
  }

  function drawTrain(x, y, s) {
    ctx.fillStyle = '#ff4faa';
    roundRect(x - 54 * s, y - 98 * s, 108 * s, 158 * s, 18 * s);
    ctx.fill();
    ctx.fillStyle = '#421144';
    roundRect(x - 38 * s, y - 75 * s, 76 * s, 48 * s, 9 * s); ctx.fill();
    ctx.fillStyle = '#ffd3eb';
    ctx.fillRect(x - 42 * s, y + 25 * s, 84 * s, 8 * s);
  }

  function drawObstacle(o) {
    const x = laneX(o.lane, o.z);
    const y = ROAD_TOP + o.z * DEPTH;
    const s = depthScale(o.z);
    if (o.type === 'train') return drawTrain(x, y, s);
    ctx.fillStyle = o.type === 'barrier' ? '#ffd1e8' : '#ff9c2f';
    roundRect(x - 48 * s, y - 28 * s, 96 * s, 56 * s, 10 * s); ctx.fill();
    ctx.fillStyle = '#ff2f98';
    ctx.fillRect(x - 38 * s, y - 6 * s, 76 * s, 12 * s);
  }

  function drawHeart(x, y, s, spin) {
    ctx.save(); ctx.translate(x, y); ctx.scale(Math.cos(spin) * 0.25 + 0.85, 1); ctx.scale(s, s);
    ctx.fillStyle = '#fff0f8';
    ctx.beginPath();
    ctx.moveTo(0, 22); ctx.bezierCurveTo(-42, -10, -20, -42, 0, -18); ctx.bezierCurveTo(20, -42, 42, -10, 0, 22); ctx.fill();
    ctx.restore();
  }

  function drawPlayer() {
    const x = player.x;
    const y = player.y - player.jump;
    const sliding = player.slide > 0;
    ctx.save(); ctx.translate(x, y); if (sliding) ctx.scale(1.25, 0.72);
    // shadow
    ctx.fillStyle = 'rgba(0,0,0,0.28)'; ctx.beginPath(); ctx.ellipse(0, 74 + player.jump * 0.25, 56, 14, 0, 0, Math.PI * 2); ctx.fill();
    // baggy pants
    ctx.fillStyle = '#8b4fb3'; roundRect(-33, 5, 26, 70, 12); ctx.fill(); roundRect(7, 5, 26, 70, 12); ctx.fill();
    ctx.fillStyle = '#ffc1df'; roundRect(-48, -54, 96, 74, 23); ctx.fill();
    ctx.fillStyle = '#ff2f98'; roundRect(-38, -64, 76, 54, 18); ctx.fill();
    ctx.fillStyle = '#7d315f'; roundRect(-58, -48, 24, 62, 13); ctx.fill(); roundRect(34, -48, 24, 62, 13); ctx.fill();
    ctx.fillStyle = '#ffd0b3'; ctx.beginPath(); ctx.arc(0, -96, 28, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#3b183d'; ctx.beginPath(); ctx.arc(0, -104, 31, Math.PI, Math.PI * 2); ctx.fill(); roundRect(18, -92, 18, 42, 9); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.fillRect(-10, -99, 6, 5); ctx.fillRect(8, -99, 6, 5);
    ctx.fillStyle = '#ff6eb6'; roundRect(-39, 71, 30, 12, 6); ctx.fill(); roundRect(9, 71, 30, 12, 6); ctx.fill();
    ctx.restore();
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }

  function render() {
    ctx.save();
    if (shake > 0) { ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake); shake *= 0.88; }
    drawTrack();
    pickups.sort((a, b) => a.z - b.z).forEach(p => drawHeart(laneX(p.lane, p.z), ROAD_TOP + p.z * DEPTH, depthScale(p.z), p.spin));
    obstacles.sort((a, b) => a.z - b.z).forEach(drawObstacle);
    particles.forEach(p => { ctx.globalAlpha = Math.max(0, p.life / 0.55); ctx.fillStyle = p.color; ctx.fillRect(p.x, p.y, 6, 6); ctx.globalAlpha = 1; });
    drawPlayer();
    ctx.restore();
  }

  function loop(now) {
    const dt = Math.min(0.033, (now - lastTime) / 1000 || 0);
    lastTime = now;
    if (running) update(dt);
    render();
    if (running) raf = requestAnimationFrame(loop);
  }

  let touchStart = null;
  window.addEventListener('keydown', e => { keys.add(e.key.toLowerCase()); if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key)) e.preventDefault(); });
  canvas.addEventListener('pointerdown', e => { touchStart = { x: e.clientX, y: e.clientY }; });
  canvas.addEventListener('pointerup', e => {
    if (!running || !touchStart) return;
    const dx = e.clientX - touchStart.x;
    const dy = e.clientY - touchStart.y;
    if (Math.abs(dx) > 36 && Math.abs(dx) > Math.abs(dy)) moveLane(dx > 0 ? 1 : -1);
    else if (Math.abs(dy) > 36) dy < 0 ? jump() : slide();
    else e.clientY < window.innerHeight * 0.5 ? jump() : slide();
  });
  startButton.addEventListener('click', reset);
  window.addEventListener('resize', fitCanvas);

  fitCanvas();
  bestEl.textContent = best;
  render();
})();
