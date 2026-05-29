import * as THREE from './vendor/three/three.module.js';

const CARD_RATIO = 1024 / 1536;
const CARD_HEIGHT = 3.42;
const CARD_WIDTH = CARD_HEIGHT * CARD_RATIO;
const CARD_RADIUS = .22;
const CARD_THICKNESS = .035;

const cardAssets = loadCardAssets();

const heroCanvas = document.getElementById('tapfyHeroCard3d');
const heroShell = document.getElementById('heroImgWrap');
const scrollCanvas = document.getElementById('tapfyScrollCard3d');
const scrollShell = document.getElementById('tapfyScrollStage');
const scrollSection = document.getElementById('tapfyScrollShowcase');
const scrollBeats = [...document.querySelectorAll('.tapfy-scroll-beat')];

initWhatsAppReveal();

if (heroCanvas && heroShell) {
  initTapfyCardScene({
    canvas: heroCanvas,
    shell: heroShell,
    mode: 'hero',
    showReflection: true
  }).catch((error) => showFallback(heroShell, error));
}

if (scrollCanvas && scrollShell && scrollSection) {
  initTapfyCardScene({
    canvas: scrollCanvas,
    shell: scrollShell,
    mode: 'scroll',
    scrollHost: scrollSection,
    showReflection: true
  }).catch((error) => showFallback(scrollShell, error));
}

async function initTapfyCardScene({ canvas, shell, mode, scrollHost, showReflection }) {
  const { frontTexture, backTexture } = await cardAssets;
  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
    powerPreference: 'high-performance'
  });
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = .94;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(mode === 'scroll' ? 31 : 34, 1, .1, 100);
  camera.position.set(0, mode === 'scroll' ? .02 : .03, mode === 'scroll' ? 8.25 : 8.65);

  const root = new THREE.Group();
  const card = createCard(frontTexture, backTexture);
  root.add(card);

  if (showReflection) {
    const reflection = createCard(frontTexture, backTexture);
    reflection.scale.set(1, -1, 1);
    reflection.position.y = -3.72;
    reflection.traverse((child) => {
      if (child.material) {
        child.material = child.material.clone();
        child.material.opacity = mode === 'scroll' ? .06 : .075;
        child.material.transparent = true;
        child.material.depthWrite = false;
      }
    });
    root.add(reflection);
  }

  scene.add(root);
  scene.add(makeAmbientLight(), makeKeyLight(), makeRimLight(), makeLowLight());

  let reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let width = 0;
  let height = 0;
  let hasRendered = false;

  window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener?.('change', (event) => {
    reduceMotion = event.matches;
  });

  function resize() {
    const rect = canvas.getBoundingClientRect();
    const nextWidth = Math.max(1, Math.floor(rect.width));
    const nextHeight = Math.max(1, Math.floor(rect.height));
    if (nextWidth === width && nextHeight === height) return;
    width = nextWidth;
    height = nextHeight;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }

  function render() {
    resize();
    const progress = mode === 'scroll' && !reduceMotion
      ? easeInOutCubic(getScrollProgress(scrollHost))
      : 0;
    const pose = mode === 'scroll' ? getScrollPose(progress) : getHeroPose();
    if (mode === 'scroll') updateScrollBeats(progress);

    root.rotation.x = THREE.MathUtils.lerp(root.rotation.x, pose.rx, .11);
    root.rotation.y = THREE.MathUtils.lerp(root.rotation.y, pose.ry, .11);
    root.rotation.z = THREE.MathUtils.lerp(root.rotation.z, pose.rz, .11);
    root.position.x = THREE.MathUtils.lerp(root.position.x, pose.x, .11);
    root.position.y = THREE.MathUtils.lerp(root.position.y, pose.y, .11);
    root.scale.setScalar(THREE.MathUtils.lerp(root.scale.x, pose.scale, .11));

    renderer.render(scene, camera);
    if (!hasRendered) {
      hasRendered = true;
      shell.classList.remove('is-fallback');
      shell.classList.add('is-3d-ready');
    }
    requestAnimationFrame(render);
  }

  render();
}

async function loadCardAssets() {
  const loader = new THREE.TextureLoader();
  const rawFront = await loadTexture(loader, './assets/tapfy-3d/card-front.png');
  rawFront.colorSpace = THREE.SRGBColorSpace;
  return {
    frontTexture: prepareFrontTexture(rawFront),
    backTexture: makeBackTexture()
  };
}

function getHeroPose() {
  const isMobile = window.matchMedia('(max-width: 768px)').matches;
  return {
    rx: isMobile ? -.1 : -.13,
    ry: isMobile ? -.42 : -.48,
    rz: isMobile ? -.045 : -.055,
    x: 0,
    y: isMobile ? .03 : 0,
    scale: isMobile ? .76 : .9
  };
}

function getScrollPose(progress) {
  const turn = progress < .5
    ? THREE.MathUtils.lerp(-.56, Math.PI + .22, easeInOutCubic(progress / .5))
    : THREE.MathUtils.lerp(Math.PI + .22, Math.PI * 2 - .52, easeInOutCubic((progress - .5) / .5));

  const isMobile = window.matchMedia('(max-width: 768px)').matches;

  return {
    rx: THREE.MathUtils.lerp(isMobile ? -.12 : -.08, isMobile ? .1 : .1, Math.sin(progress * Math.PI)),
    ry: turn,
    rz: THREE.MathUtils.lerp(-.045, .045, Math.sin(progress * Math.PI * 2) * .5 + .5),
    x: 0,
    y: isMobile ? THREE.MathUtils.lerp(.05, -.05, progress) : Math.sin(progress * Math.PI) * .04,
    scale: isMobile
      ? THREE.MathUtils.lerp(.78, .72, Math.abs(progress - .5) * .5)
      : .82 - Math.abs(progress - .5) * .1
  };
}

function getScrollProgress(host) {
  const rect = host.getBoundingClientRect();
  const distance = Math.max(1, rect.height - window.innerHeight);
  return clamp(-rect.top / distance, 0, 1);
}

function createCard(frontMap, backMap) {
  const group = new THREE.Group();
  const frontMaterial = new THREE.MeshPhysicalMaterial({
    map: frontMap,
    roughness: .66,
    metalness: .03,
    clearcoat: .38,
    clearcoatRoughness: .34,
    reflectivity: .28,
    side: THREE.FrontSide
  });
  const backMaterial = new THREE.MeshPhysicalMaterial({
    map: backMap,
    roughness: .68,
    metalness: .04,
    clearcoat: .34,
    clearcoatRoughness: .38,
    side: THREE.FrontSide
  });
  const sideMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x090b0c,
    roughness: .5,
    metalness: .12,
    clearcoat: .28,
    clearcoatRoughness: .28
  });

  const front = new THREE.Mesh(roundedGeometry(CARD_WIDTH, CARD_HEIGHT, CARD_RADIUS), frontMaterial);
  front.position.z = CARD_THICKNESS / 2 + .001;
  const back = new THREE.Mesh(roundedGeometry(CARD_WIDTH, CARD_HEIGHT, CARD_RADIUS), backMaterial);
  back.rotation.y = Math.PI;
  back.position.z = -CARD_THICKNESS / 2 - .001;
  const side = new THREE.Mesh(wallGeometry(CARD_WIDTH, CARD_HEIGHT, CARD_RADIUS, CARD_THICKNESS), sideMaterial);
  const edgeGlow = new THREE.Mesh(
    roundedGeometry(CARD_WIDTH * 1.006, CARD_HEIGHT * 1.006, CARD_RADIUS * 1.03),
    new THREE.MeshBasicMaterial({
      color: 0x4bd4ff,
      transparent: true,
      opacity: .06,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    })
  );
  edgeGlow.position.z = CARD_THICKNESS / 2 + .004;
  group.add(side, front, back, edgeGlow);
  return group;
}

function roundedGeometry(width, height, radius) {
  const geometry = new THREE.ShapeGeometry(roundedShape(width, height, radius), 36);
  const pos = geometry.attributes.position;
  const uv = [];
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    uv.push((x + width / 2) / width, (y + height / 2) / height);
  }
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  return geometry;
}

function wallGeometry(width, height, radius, depth) {
  const points = roundedShape(width, height, radius).getSpacedPoints(96);
  const vertices = [];
  const indices = [];
  for (let i = 0; i < points.length; i++) {
    vertices.push(points[i].x, points[i].y, depth / 2);
    vertices.push(points[i].x, points[i].y, -depth / 2);
  }
  for (let i = 0; i < points.length; i++) {
    const next = (i + 1) % points.length;
    const a = i * 2;
    const b = a + 1;
    const c = next * 2;
    const d = c + 1;
    indices.push(a, b, c, b, d, c);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function roundedShape(width, height, radius) {
  const x = -width / 2;
  const y = -height / 2;
  const r = Math.min(radius, width / 2, height / 2);
  const shape = new THREE.Shape();
  shape.moveTo(x + r, y);
  shape.lineTo(x + width - r, y);
  shape.quadraticCurveTo(x + width, y, x + width, y + r);
  shape.lineTo(x + width, y + height - r);
  shape.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  shape.lineTo(x + r, y + height);
  shape.quadraticCurveTo(x, y + height, x, y + height - r);
  shape.lineTo(x, y + r);
  shape.quadraticCurveTo(x, y, x + r, y);
  return shape;
}

function makeAmbientLight() {
  return new THREE.AmbientLight(0xffffff, .42);
}

function makeKeyLight() {
  const key = new THREE.DirectionalLight(0xffffff, 2.55);
  key.position.set(-2.4, 3.6, 4.4);
  return key;
}

function makeRimLight() {
  const rim = new THREE.DirectionalLight(0x55ccff, 3.05);
  rim.position.set(3.8, 1.3, -2.8);
  return rim;
}

function makeLowLight() {
  const low = new THREE.PointLight(0x34a853, 2.15, 8);
  low.position.set(-2.1, -2.3, 2.8);
  return low;
}

function loadTexture(loader, url) {
  return new Promise((resolve, reject) => {
    loader.load(url, resolve, undefined, reject);
  });
}

function prepareFrontTexture(sourceTexture) {
  const source = sourceTexture.image;
  const scan = document.createElement('canvas');
  const scanCtx = scan.getContext('2d', { willReadFrequently: true });
  scan.width = source.width;
  scan.height = source.height;
  scanCtx.drawImage(source, 0, 0);
  const pixels = scanCtx.getImageData(0, 0, scan.width, scan.height).data;
  let minX = scan.width;
  let minY = scan.height;
  let maxX = 0;
  let maxY = 0;
  for (let y = 0; y < scan.height; y += 2) {
    for (let x = 0; x < scan.width; x += 2) {
      const i = (y * scan.width + x) * 4;
      if (pixels[i] < 238 || pixels[i + 1] < 238 || pixels[i + 2] < 238) {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
  }

  const textureCanvas = document.createElement('canvas');
  textureCanvas.width = 1536;
  textureCanvas.height = 2304;
  const ctx = textureCanvas.getContext('2d');
  ctx.fillStyle = '#111314';
  roundRect(ctx, 0, 0, textureCanvas.width, textureCanvas.height, 156);
  ctx.fill();
  ctx.clip();
  ctx.drawImage(
    source,
    Math.max(0, minX - 4),
    Math.max(0, minY - 4),
    Math.min(scan.width, maxX + 4) - Math.max(0, minX - 4),
    Math.min(scan.height, maxY + 4) - Math.max(0, minY - 4),
    0,
    0,
    textureCanvas.width,
    textureCanvas.height
  );
  addSubtleFaceFinish(ctx, textureCanvas.width, textureCanvas.height);

  const texture = new THREE.CanvasTexture(textureCanvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 16;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

function makeBackTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 1536;
  canvas.height = 2304;
  const ctx = canvas.getContext('2d');
  const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  grad.addColorStop(0, '#111314');
  grad.addColorStop(.55, '#060707');
  grad.addColorStop(1, '#101112');
  ctx.fillStyle = grad;
  roundRect(ctx, 0, 0, canvas.width, canvas.height, 156);
  ctx.fill();
  ctx.clip();
  addSubtleFaceFinish(ctx, canvas.width, canvas.height);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 16;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

function roundRect(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function addSubtleFaceFinish(ctx, width, height) {
  const sheen = ctx.createLinearGradient(0, 0, width, height);
  sheen.addColorStop(0, 'rgba(255,255,255,.07)');
  sheen.addColorStop(.28, 'rgba(255,255,255,.012)');
  sheen.addColorStop(.55, 'rgba(0,0,0,.08)');
  sheen.addColorStop(1, 'rgba(255,255,255,.025)');
  ctx.fillStyle = sheen;
  ctx.fillRect(0, 0, width, height);
}

function easeInOutCubic(value) {
  return value < .5 ? 4 * value * value * value : 1 - Math.pow(-2 * value + 2, 3) / 2;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function showFallback(shell, error) {
  console.error('Tapfy 3D failed:', error);
  shell.classList.remove('is-3d-ready');
  shell.classList.add('is-fallback');
}

function updateScrollBeats(progress) {
  if (!scrollBeats.length) return;
  const isDesktop = window.matchMedia('(min-width: 769px)').matches;
  scrollBeats.forEach((beat, index) => {
    const active = isDesktop && (
      (index === 0 && progress < .28) ||
      (index === 1 && progress >= .22 && progress < .52) ||
      (index === 2 && progress >= .48 && progress < .78) ||
      (index === 3 && progress >= .72)
    );
    beat.classList.toggle('is-active', active);
  });
}

function isPastScrollShowcase() {
  if (!scrollSection) return window.scrollY > 420;
  return window.scrollY > scrollSection.offsetTop + scrollSection.offsetHeight - window.innerHeight * .72;
}

window.tapfyIsPastScrollShowcase = isPastScrollShowcase;

function initWhatsAppReveal() {
  const button = document.querySelector('.wa-float');
  if (!button) return;

  let ready = false;
  const reveal = () => {
    const isMobile = window.matchMedia('(max-width: 768px)').matches;
    if (!ready) return;
    if (!isMobile || window.scrollY > 420) {
      button.classList.add('is-visible');
    } else {
      button.classList.remove('is-visible');
    }
  };

  window.setTimeout(() => {
    ready = true;
    reveal();
  }, 2600);

  window.addEventListener('scroll', reveal, { passive: true });
  window.addEventListener('resize', reveal);
}
