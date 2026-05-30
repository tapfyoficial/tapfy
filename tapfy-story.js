// tapfy-story.js — Apple-style 3D scroll story (Three.js + GSAP ScrollTrigger)
import * as THREE from './vendor/three/three.module.js';

const REVIEW_TEXT = 'Atendimento excelente e experiência incrível!';

// ────────────────────────────────────────────────────────────────────────────
// Geometry helpers
// ────────────────────────────────────────────────────────────────────────────

function roundedBoxGeo(w, h, d, r, segs = 5) {
  const shape = new THREE.Shape();
  const hw = w / 2, hh = h / 2;
  shape.moveTo(-hw + r, -hh);
  shape.lineTo(hw - r, -hh);
  shape.quadraticCurveTo(hw, -hh, hw, -hh + r);
  shape.lineTo(hw, hh - r);
  shape.quadraticCurveTo(hw, hh, hw - r, hh);
  shape.lineTo(-hw + r, hh);
  shape.quadraticCurveTo(-hw, hh, -hw, hh - r);
  shape.lineTo(-hw, -hh + r);
  shape.quadraticCurveTo(-hw, -hh, -hw + r, -hh);

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: d,
    bevelEnabled: true,
    bevelThickness: 0.006,
    bevelSize: 0.006,
    bevelSegments: segs,
  });
  geo.center();
  geo.computeVertexNormals();
  return geo;
}

// ────────────────────────────────────────────────────────────────────────────
// 2-D canvas textures
// ────────────────────────────────────────────────────────────────────────────

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function wrapText(ctx, text, x, y, maxW, lineH) {
  const words = text.split(' ');
  let line = '';
  for (const word of words) {
    const test = line + word + ' ';
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line.trim(), x, y);
      line = word + ' ';
      y += lineH;
    } else { line = test; }
  }
  ctx.fillText(line.trim(), x, y);
}

// ── Wallpaper ────────────────────────────────────────────────────────────────
function drawWallpaper(ctx, W, H) {
  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, '#1c1c2e');
  g.addColorStop(0.4, '#16213e');
  g.addColorStop(0.7, '#0f3460');
  g.addColorStop(1, '#1a1a2e');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  const r1 = ctx.createRadialGradient(W * 0.4, H * 0.6, 0, W * 0.4, H * 0.6, W * 0.9);
  r1.addColorStop(0, 'rgba(110,70,200,.28)');
  r1.addColorStop(1, 'transparent');
  ctx.fillStyle = r1;
  ctx.fillRect(0, 0, W, H);

  const r2 = ctx.createRadialGradient(W * 0.75, H * 0.3, 0, W * 0.75, H * 0.3, W * 0.7);
  r2.addColorStop(0, 'rgba(50,110,220,.18)');
  r2.addColorStop(1, 'transparent');
  ctx.fillStyle = r2;
  ctx.fillRect(0, 0, W, H);
}

// ── Lock screen ──────────────────────────────────────────────────────────────
function drawIdle(ctx, W, H) {
  drawWallpaper(ctx, W, H);
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(255,255,255,.96)';
  ctx.font = `200 ${Math.round(W * .22)}px -apple-system,HelveticaNeue,Arial`;
  ctx.fillText('9:41', W / 2, H * .43);
  ctx.fillStyle = 'rgba(255,255,255,.72)';
  ctx.font = `400 ${Math.round(W * .048)}px -apple-system,HelveticaNeue,Arial`;
  ctx.fillText('Sexta-feira, 30 de maio', W / 2, H * .49);
}

// ── Notification banner ──────────────────────────────────────────────────────
function drawNotification(ctx, W, H) {
  drawWallpaper(ctx, W, H);

  // small time top-left
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'left';
  ctx.font = `400 ${Math.round(W * .072)}px -apple-system,HelveticaNeue,Arial`;
  ctx.fillText('9:41', W * .07, H * .09);

  // banner
  const bx = W * .03, by = H * .12, bw = W * .94, bh = H * .14;
  roundRect(ctx, bx, by, bw, bh, W * .055);
  const bg = ctx.createLinearGradient(bx, by, bx, by + bh);
  bg.addColorStop(0, 'rgba(38,38,48,.93)');
  bg.addColorStop(1, 'rgba(22,22,32,.93)');
  ctx.fillStyle = bg;
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,.07)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Google G icon
  const iSz = bh * .52;
  const iX = bx + bh * .3, iY = by + bh / 2;
  roundRect(ctx, iX - iSz / 2, iY - iSz / 2, iSz, iSz, iSz * .22);
  ctx.fillStyle = '#fff';
  ctx.fill();
  ctx.fillStyle = '#4285F4';
  ctx.font = `700 ${Math.round(iSz * .66)}px Arial`;
  ctx.textAlign = 'center';
  ctx.fillText('G', iX, iY + iSz * .24);

  // texts
  const tx = bx + bh * .7;
  ctx.textAlign = 'left';
  ctx.fillStyle = '#fff';
  ctx.font = `600 ${Math.round(W * .046)}px -apple-system,HelveticaNeue,Arial`;
  ctx.fillText('Avaliar no Google', tx, by + bh * .40);
  ctx.fillStyle = 'rgba(255,255,255,.62)';
  ctx.font = `400 ${Math.round(W * .038)}px -apple-system,HelveticaNeue,Arial`;
  ctx.fillText('Toque para abrir', tx, by + bh * .70);

  ctx.fillStyle = 'rgba(255,255,255,.42)';
  ctx.font = `400 ${Math.round(W * .034)}px -apple-system,HelveticaNeue,Arial`;
  ctx.textAlign = 'right';
  ctx.fillText('agora', bx + bw - W * .04, by + bh * .36);
}

// ── Google review ────────────────────────────────────────────────────────────
function drawReview(ctx, W, H, stars, typed) {
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, W, H);

  // header bar
  ctx.fillStyle = '#f8f9fa';
  ctx.fillRect(0, 0, W, H * .165);
  ctx.fillStyle = '#e8eaed';
  ctx.fillRect(0, H * .165, W, 1.5);

  // Google G
  const gSz = H * .07;
  const gX = W * .09, gY = H * .085;
  roundRect(ctx, gX - gSz / 2, gY - gSz / 2, gSz, gSz, gSz * .2);
  ctx.fillStyle = '#4285F4';
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = `700 ${Math.round(gSz * .62)}px Arial`;
  ctx.textAlign = 'center';
  ctx.fillText('G', gX, gY + gSz * .22);

  ctx.textAlign = 'left';
  ctx.fillStyle = '#202124';
  ctx.font = `700 ${Math.round(W * .053)}px -apple-system,HelveticaNeue,Arial`;
  ctx.fillText('Sua Empresa', gX + gSz * .8, H * .07);
  ctx.fillStyle = '#5f6368';
  ctx.font = `400 ${Math.round(W * .037)}px -apple-system,HelveticaNeue,Arial`;
  ctx.fillText('Rua das Flores, 123 · Centro', gX + gSz * .8, H * .105);

  // stars
  const sY = H * .24, sSize = W * .11, sGap = W * .13;
  const sTotal = sGap * 4 + sSize;
  let sx = (W - sTotal) / 2;
  for (let i = 0; i < 5; i++) {
    ctx.font = `${Math.round(sSize)}px serif`;
    ctx.textAlign = 'center';
    ctx.fillStyle = i < stars ? '#FBBC05' : '#e0e0e0';
    ctx.fillText('★', sx + sSize / 2, sY + sSize);
    sx += sGap;
  }

  // textarea
  const taX = W * .05, taY = H * .37, taW = W * .9, taH = H * .24;
  roundRect(ctx, taX, taY, taW, taH, W * .03);
  ctx.fillStyle = '#f8f9fa';
  ctx.fill();
  ctx.strokeStyle = '#e8eaed';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  if (typed) {
    ctx.fillStyle = '#202124';
    ctx.font = `400 ${Math.round(W * .04)}px -apple-system,HelveticaNeue,Arial`;
    ctx.textAlign = 'left';
    wrapText(ctx, typed, taX + W * .04, taY + H * .04, taW - W * .08, W * .054);
  } else {
    ctx.fillStyle = '#9aa0a6';
    ctx.font = `400 ${Math.round(W * .038)}px -apple-system,HelveticaNeue,Arial`;
    ctx.textAlign = 'left';
    ctx.fillText('Compartilhe detalhes da sua', taX + W * .04, taY + H * .046);
    ctx.fillText('experiência neste local', taX + W * .04, taY + H * .083);
  }

  // publish button
  const btnActive = stars >= 5;
  const btnX = taX, btnY = H * .65, btnW = taW, btnH = H * .075;
  roundRect(ctx, btnX, btnY, btnW, btnH, W * .025);
  ctx.fillStyle = btnActive ? '#1a73e8' : 'rgba(26,115,232,.35)';
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = `600 ${Math.round(W * .05)}px -apple-system,HelveticaNeue,Arial`;
  ctx.textAlign = 'center';
  ctx.fillText('Publicar', W / 2, btnY + btnH * .64);
}

// ── Success ──────────────────────────────────────────────────────────────────
function drawSuccess(ctx, W, H) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#09090f');
  g.addColorStop(1, '#0c111a');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  const cx = W / 2, cy = H * .42, cr = W * .24;
  ctx.beginPath();
  ctx.arc(cx, cy, cr, 0, Math.PI * 2);
  ctx.strokeStyle = '#34A853';
  ctx.lineWidth = cr * .1;
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(cx - cr * .42, cy + cr * .06);
  ctx.lineTo(cx - cr * .08, cy + cr * .42);
  ctx.lineTo(cx + cr * .5, cy - cr * .3);
  ctx.strokeStyle = '#34A853';
  ctx.lineWidth = cr * .12;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.stroke();

  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.font = `700 ${Math.round(W * .083)}px -apple-system,HelveticaNeue,Arial`;
  ctx.fillText('Avaliação enviada!', W / 2, H * .62);
  ctx.fillStyle = 'rgba(255,255,255,.55)';
  ctx.font = `400 ${Math.round(W * .048)}px -apple-system,HelveticaNeue,Arial`;
  ctx.fillText('Obrigado por compartilhar', W / 2, H * .685);
  ctx.fillText('sua experiência.', W / 2, H * .73);
}

// ── Card front texture ───────────────────────────────────────────────────────
function makeCardTexture() {
  const W = 800, H = 504;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const ctx = c.getContext('2d');

  // background
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, '#0e0e12');
  bg.addColorStop(0.5, '#18181e');
  bg.addColorStop(1, '#0a0a0e');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // subtle sheen
  const sh = ctx.createLinearGradient(0, 0, W, H);
  sh.addColorStop(0, 'rgba(255,255,255,.035)');
  sh.addColorStop(0.5, 'rgba(255,255,255,.0)');
  sh.addColorStop(1, 'rgba(255,255,255,.015)');
  ctx.fillStyle = sh;
  ctx.fillRect(0, 0, W, H);

  // Google ring (colorful arc segments)
  const gcx = W * .38, gcy = H * .5;
  const outerR = H * .38, innerR = H * .27;
  const colors = ['#4285F4', '#EA4335', '#FBBC05', '#34A853'];
  colors.forEach((col, i) => {
    const a0 = (i / 4) * Math.PI * 2 - Math.PI / 2;
    const a1 = ((i + 1) / 4) * Math.PI * 2 - Math.PI / 2;
    ctx.beginPath();
    ctx.arc(gcx, gcy, outerR, a0, a1);
    ctx.arc(gcx, gcy, innerR, a1, a0, true);
    ctx.closePath();
    ctx.fillStyle = col;
    ctx.fill();
  });

  // center fill
  ctx.beginPath();
  ctx.arc(gcx, gcy, innerR - 3, 0, Math.PI * 2);
  ctx.fillStyle = '#0e0e12';
  ctx.fill();

  // "Avalie no"
  ctx.fillStyle = 'rgba(255,255,255,.72)';
  ctx.font = `500 ${Math.round(H * .064)}px -apple-system,HelveticaNeue,Arial`;
  ctx.textAlign = 'center';
  ctx.fillText('Avalie no', gcx, gcy - H * .085);

  // "Google" colored letters
  const googleL = [
    { c: 'G', col: '#4285F4' }, { c: 'o', col: '#EA4335' },
    { c: 'o', col: '#FBBC05' }, { c: 'g', col: '#4285F4' },
    { c: 'l', col: '#34A853' }, { c: 'e', col: '#EA4335' },
  ];
  ctx.font = `700 ${Math.round(H * .135)}px -apple-system,HelveticaNeue,Arial`;
  let totalW = googleL.reduce((s, l) => s + ctx.measureText(l.c).width, 0);
  let gx = gcx - totalW / 2;
  ctx.textAlign = 'left';
  googleL.forEach(({ c: ch, col }) => {
    ctx.fillStyle = col;
    ctx.fillText(ch, gx, gcy + H * .115);
    gx += ctx.measureText(ch).width;
  });

  // NFC symbol (right area)
  const nx = W * .76, ny = H * .44;
  ctx.lineCap = 'round';
  for (let i = 0; i < 3; i++) {
    const r = H * (.08 + i * .065);
    ctx.beginPath();
    ctx.arc(nx, ny, r, -Math.PI * .55, Math.PI * .22);
    ctx.strokeStyle = `rgba(255,255,255,${.72 - i * .2})`;
    ctx.lineWidth = 3 - i * .4;
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.arc(nx + H * .065, ny + H * .045, H * .026, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,.9)';
  ctx.fill();

  // "APROXIME SEU CELULAR"
  ctx.fillStyle = 'rgba(255,255,255,.36)';
  ctx.font = `500 ${Math.round(H * .044)}px -apple-system,HelveticaNeue,Arial`;
  ctx.textAlign = 'center';
  ctx.fillText('APROXIME SEU CELULAR', W * .5, H * .84);

  // "tapfy."
  ctx.fillStyle = 'rgba(255,255,255,.9)';
  ctx.font = `700 ${Math.round(H * .1)}px -apple-system,HelveticaNeue,Arial`;
  ctx.fillText('tapfy.', W * .5, H * .95);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// ────────────────────────────────────────────────────────────────────────────
// Build the iPhone group
// ────────────────────────────────────────────────────────────────────────────

function buildIphone(screenTexture) {
  const group = new THREE.Group();

  // Materials
  const titanium = new THREE.MeshPhysicalMaterial({
    color: 0x1b1b1d,
    metalness: 0.94,
    roughness: 0.16,
    envMapIntensity: 1.8,
  });
  const frame = new THREE.MeshPhysicalMaterial({
    color: 0x2d2d30,
    metalness: 0.98,
    roughness: 0.07,
    envMapIntensity: 2.2,
  });
  const screenGlassMat = new THREE.MeshPhysicalMaterial({
    color: 0x030306,
    roughness: 0.03,
    metalness: 0.0,
    envMapIntensity: 1.5,
    transmission: 0.06,
  });
  const screenMat = new THREE.MeshBasicMaterial({ map: screenTexture });
  const islandMat = new THREE.MeshPhysicalMaterial({
    color: 0x000000,
    roughness: 0.06,
    metalness: 0.15,
  });
  const btnMat = new THREE.MeshPhysicalMaterial({
    color: 0x292929,
    metalness: 0.96,
    roughness: 0.10,
  });
  const camMat = new THREE.MeshPhysicalMaterial({
    color: 0x090909,
    metalness: 0.7,
    roughness: 0.22,
  });

  const W = 0.77, H = 1.58, D = 0.098, R = 0.088;

  // Body
  const body = new THREE.Mesh(roundedBoxGeo(W, H, D, R, 6), titanium);
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);

  // Frame (thin border, slightly lighter)
  const frameGeo = roundedBoxGeo(W + .005, H + .005, D - .01, R + .003, 6);
  const frameMesh = new THREE.Mesh(frameGeo, frame);
  frameMesh.position.z = -.004;
  group.add(frameMesh);

  // Screen glass
  const sGlass = new THREE.Mesh(roundedBoxGeo(W - .055, H - .055, .003, R - .018, 5), screenGlassMat);
  sGlass.position.z = D / 2 + .001;
  group.add(sGlass);

  // Screen content
  const sMesh = new THREE.Mesh(new THREE.PlaneGeometry(W - .07, H - .07), screenMat);
  sMesh.position.z = D / 2 + .0015;
  group.add(sMesh);

  // Dynamic Island
  const island = new THREE.Mesh(roundedBoxGeo(.2, .042, .006, .021, 5), islandMat);
  island.position.set(0, H / 2 - .115, D / 2 + .002);
  group.add(island);
  group.userData.island = island;

  // Camera bump (back)
  const camBump = new THREE.Mesh(roundedBoxGeo(.22, .2, .022, .026, 4), camMat);
  camBump.position.set(-W / 2 + .145, H / 2 - .215, -D / 2 - .012);
  group.add(camBump);

  // Lenses
  const lensGeo = new THREE.CircleGeometry(.034, 18);
  const lensMat = new THREE.MeshPhysicalMaterial({ color: 0x040404, roughness: .04, metalness: .6 });
  const lensPositions = [
    [-W / 2 + .10, H / 2 - .19],
    [-W / 2 + .195, H / 2 - .19],
    [-W / 2 + .148, H / 2 - .272],
  ];
  lensPositions.forEach(([lx, ly]) => {
    const l = new THREE.Mesh(lensGeo.clone(), lensMat);
    l.position.set(lx, ly, -D / 2 - .024);
    group.add(l);
  });

  // Side buttons
  const btn = (bw, bh, bd, bx, by, bz) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, bd), btnMat);
    m.position.set(bx, by, bz);
    group.add(m);
  };
  btn(.013, .1, .028, W / 2 + .007, .22, 0);   // power right
  btn(.013, .04, .022, -W / 2 - .007, .42, 0);  // mute
  btn(.013, .074, .026, -W / 2 - .007, .26, 0); // vol+
  btn(.013, .074, .026, -W / 2 - .007, .14, 0); // vol-

  return group;
}

// ────────────────────────────────────────────────────────────────────────────
// Build Tapfy card group
// ────────────────────────────────────────────────────────────────────────────

function buildCard(cardTexture) {
  const group = new THREE.Group();

  const bodyMat = new THREE.MeshPhysicalMaterial({
    color: 0x080808,
    metalness: .05,
    roughness: .22,
    transparent: true,
    opacity: 1,
  });
  const faceMat = new THREE.MeshBasicMaterial({
    map: cardTexture,
    transparent: true,
    opacity: 1,
  });

  const CW = .86, CH = .54, CD = .013, CR = .04;
  const cardBody = new THREE.Mesh(roundedBoxGeo(CW, CH, CD, CR, 5), bodyMat);
  group.add(cardBody);

  const cardFace = new THREE.Mesh(new THREE.PlaneGeometry(CW - .012, CH - .012), faceMat);
  cardFace.position.z = CD / 2 + .0006;
  group.add(cardFace);

  group.userData.bodyMat = bodyMat;
  group.userData.faceMat = faceMat;

  return group;
}

// ────────────────────────────────────────────────────────────────────────────
// NFC pulse rings (torus)
// ────────────────────────────────────────────────────────────────────────────

function buildNFCRings(scene) {
  const rings = [];
  for (let i = 0; i < 3; i++) {
    const mat = new THREE.MeshBasicMaterial({ color: 0x4bD4ff, transparent: true, opacity: 0 });
    const mesh = new THREE.Mesh(new THREE.TorusGeometry(.06, .002, 8, 48), mat);
    mesh.position.set(0, .72, .12);
    scene.add(mesh);
    rings.push({ mesh, mat });
  }
  return rings;
}

function fireNFCRings(rings, glib) {
  rings.forEach(({ mesh, mat }, i) => {
    glib.fromTo(mesh.scale, { x: .5, y: .5, z: .5 },
      { x: 3.5, y: 3.5, z: 3.5, duration: 1.1, delay: i * .22, ease: 'power1.out', repeat: 1, yoyo: false });
    glib.fromTo(mat, { opacity: .85 },
      { opacity: 0, duration: 1.1, delay: i * .22, ease: 'power1.out', repeat: 1 });
  });
}

// ────────────────────────────────────────────────────────────────────────────
// Dynamic Island 3D expansion
// ────────────────────────────────────────────────────────────────────────────

function expandIsland(island, glib, expand) {
  if (expand) {
    glib.to(island.scale, { x: 2.6, duration: .45, ease: 'back.out(1.4)' });
  } else {
    glib.to(island.scale, { x: 1, duration: .35, ease: 'power2.inOut' });
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Screen canvas manager
// ────────────────────────────────────────────────────────────────────────────

class ScreenSystem {
  constructor() {
    this.W = 780; this.H = 1688;
    this.el = document.createElement('canvas');
    this.el.width = this.W; this.el.height = this.H;
    this.ctx = this.el.getContext('2d');
    this.texture = new THREE.CanvasTexture(this.el);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.current = null;
  }

  set(state, opts = {}) {
    if (this.current === state + JSON.stringify(opts)) return;
    this.current = state + JSON.stringify(opts);
    const { ctx, W, H } = this;
    ctx.clearRect(0, 0, W, H);
    if (state === 'idle') drawIdle(ctx, W, H);
    else if (state === 'notif') drawNotification(ctx, W, H);
    else if (state === 'review') drawReview(ctx, W, H, opts.stars || 0, opts.typed || '');
    else if (state === 'success') drawSuccess(ctx, W, H);
    this.texture.needsUpdate = true;
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Main init
// ────────────────────────────────────────────────────────────────────────────

export function initStory() {
  const canvas = document.getElementById('storyCanvas3d');
  if (!canvas) return;

  if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') {
    setTimeout(initStory, 100);
    return;
  }
  gsap.registerPlugin(ScrollTrigger);

  const parent = canvas.parentElement;

  // ── Renderer ──────────────────────────────────────────────────────────────
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.3;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  // ── Scene & camera ─────────────────────────────────────────────────────────
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, .01, 50);
  camera.position.set(0, .05, 4);

  // ── Lights ────────────────────────────────────────────────────────────────
  scene.add(new THREE.HemisphereLight(0x384a6a, 0x100c1e, 1.1));

  const key = new THREE.DirectionalLight(0xfff6e8, 4);
  key.position.set(2.5, 3.5, 2.5);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  scene.add(key);

  const fill = new THREE.DirectionalLight(0xd0e4ff, .7);
  fill.position.set(-2.5, .5, 1.5);
  scene.add(fill);

  const rim = new THREE.DirectionalLight(0xffffff, 2.2);
  rim.position.set(.5, 3, -3.5);
  scene.add(rim);

  const nfcPt = new THREE.PointLight(0x4bD4ff, 0, 3);
  nfcPt.position.set(0, .72, .5);
  scene.add(nfcPt);

  // Procedural environment cube map for metallic reflections
  const pmrem = new THREE.PMREMGenerator(renderer);
  pmrem.compileCubemapShader();
  const cubeRenderTarget = new THREE.WebGLCubeRenderTarget(128);
  const cubeCamera = new THREE.CubeCamera(.01, 100, cubeRenderTarget);
  // Paint a simple gradient environment
  const envGeo = new THREE.BoxGeometry(50, 50, 50);
  const envMats = [
    new THREE.MeshBasicMaterial({ color: 0x404860, side: THREE.BackSide }), // right: cool
    new THREE.MeshBasicMaterial({ color: 0x202230, side: THREE.BackSide }), // left: dark
    new THREE.MeshBasicMaterial({ color: 0x808090, side: THREE.BackSide }), // top: bright
    new THREE.MeshBasicMaterial({ color: 0x101015, side: THREE.BackSide }), // bottom: dark
    new THREE.MeshBasicMaterial({ color: 0x506070, side: THREE.BackSide }), // front: mid
    new THREE.MeshBasicMaterial({ color: 0x304050, side: THREE.BackSide }), // back: dark blue
  ];
  const envBox = new THREE.Mesh(envGeo, envMats);
  scene.add(envBox);
  scene.add(cubeCamera);
  cubeCamera.update(renderer, scene);
  scene.environment = pmrem.fromCubemap(cubeRenderTarget.texture).texture;
  scene.remove(envBox);
  envBox.geometry.dispose();
  pmrem.dispose();

  // ── Screen system & objects ────────────────────────────────────────────────
  const screen = new ScreenSystem();
  screen.set('idle');

  const cardTex = makeCardTexture();
  const iphone = buildIphone(screen.texture);
  scene.add(iphone);

  const card = buildCard(cardTex);
  scene.add(card);

  const nfcRings = buildNFCRings(scene);

  // Initial transforms
  card.position.set(0, 2.9, .08);
  card.rotation.x = .16;
  card.rotation.z = -.022;
  iphone.position.set(.05, -.08, 0);
  iphone.rotation.y = -.05;

  // ── Resize ────────────────────────────────────────────────────────────────
  function resize() {
    const w = parent.clientWidth, h = parent.clientHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  }
  const ro = new ResizeObserver(resize);
  ro.observe(parent);
  resize();

  // ── Step transitions ──────────────────────────────────────────────────────
  let currentStep = -1;
  const island3d = iphone.userData.island;

  function setStep(s) {
    if (s === currentStep) return;
    currentStep = s;

    document.querySelectorAll('.story-step-slide').forEach((el, i) => el.classList.toggle('active', i === s));
    document.querySelectorAll('.sd').forEach((el, i) => el.classList.toggle('active', i === s));

    if (s <= 1) screen.set('idle');
    else if (s === 2) screen.set('idle'); // card approaching
    else if (s === 3) {
      screen.set('notif');
      expandIsland(island3d, gsap, true);
    } else if (s === 4) {
      screen.set('review', { stars: 0, typed: '' });
      expandIsland(island3d, gsap, false);
    } else if (s === 5) {
      screen.set('review', { stars: 5, typed: REVIEW_TEXT });
    } else if (s === 6) {
      screen.set('success');
    }
  }

  // ── Animated proxy object (scrubbed by GSAP) ──────────────────────────────
  const prx = {
    cardY: 2.9, cardX: 0, cardZ: .08,
    cardRX: .16, cardRZ: -.022, cardScale: 1, cardOpacity: 1,
    nfcGlow: 0, camY: .05, iphRY: -.05,
    starsShown: 0,
  };

  let nfcFired = false;

  // ── GSAP timeline ─────────────────────────────────────────────────────────
  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: '#storySection',
      pin: '#storySticky',
      scrub: 2,
      start: 'top top',
      end: '+=500vh',
      onUpdate(self) {
        const p = self.progress;
        const s = p < .12 ? 0 : p < .26 ? 1 : p < .40 ? 2 : p < .53 ? 3 : p < .67 ? 4 : p < .82 ? 5 : 6;
        setStep(s);
      },
    },
  });

  // 0–0.25  card descends
  tl.to(prx, { cardY: -.06, cardRX: 0, cardRZ: 0, duration: 2.5, ease: 'power2.out' }, 0)
  // 0.25–0.40  card at NFC, glow
    .to(prx, { cardY: .02, duration: 1.2, ease: 'power1.inOut' }, 2.5)
    .to(prx, { nfcGlow: 1, duration: .4 }, 3)
    .to(prx, { nfcGlow: 0, duration: .7 }, 3.8)
    .call(() => { if (!nfcFired) { nfcFired = true; fireNFCRings(nfcRings, gsap); } }, [], 3.1)
  // 0.53–0.67  card slides to side
    .to(prx, {
      cardX: .72, cardY: .55, cardRX: .28, cardRZ: .18,
      cardScale: .68, cardOpacity: .52,
      duration: 1.5, ease: 'power2.inOut',
    }, 4.6)
  // 0.67–0.82  iPhone slight tilt
    .to(prx, { iphRY: .04, duration: 1.5 }, 5.5)
  // 0.82–1.0   card returns, success
    .to(prx, {
      cardX: 0, cardY: 2.9, cardRX: .16, cardRZ: -.022,
      cardScale: 1, cardOpacity: 1,
      duration: 1.8, ease: 'power2.inOut',
    }, 8);

  // ── Render loop ────────────────────────────────────────────────────────────
  let raf;
  const clock = new THREE.Clock();

  function tick() {
    raf = requestAnimationFrame(tick);
    const t = clock.getElapsedTime();

    // Apply proxy → scene objects
    card.position.set(prx.cardX, prx.cardY, prx.cardZ);
    card.rotation.x = prx.cardRX;
    card.rotation.z = prx.cardRZ;
    card.scale.setScalar(prx.cardScale);
    card.userData.bodyMat.opacity = prx.cardOpacity;
    card.userData.faceMat.opacity = prx.cardOpacity;

    nfcPt.intensity = prx.nfcGlow * 2.2;

    // Subtle idle float
    iphone.rotation.y = prx.iphRY + Math.sin(t * .55) * .028;
    iphone.rotation.x = Math.cos(t * .42) * .016;
    iphone.position.y = -.08 + Math.sin(t * .9) * .010;

    camera.position.y = prx.camY;

    renderer.render(scene, camera);
  }
  tick();

  // cleanup if section leaves
  return () => { cancelAnimationFrame(raf); ro.disconnect(); };
}
