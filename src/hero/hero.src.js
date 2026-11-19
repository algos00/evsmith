/* Source of the 3D hero (Garchomp). Bundled with three.js into src/hero/hero.js by `npm run build-hero --prefix tools`.
   Do not edit hero.js by hand. The page loads it only over http/https; if anything fails, mount() rejects and the
   page keeps its normal header. */
import {
  WebGLRenderer, Scene, PerspectiveCamera, Box3, Vector3, Group, AnimationMixer, Clock, PMREMGenerator,
  DirectionalLight, SRGBColorSpace, ACESFilmicToneMapping, MathUtils
} from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const IDLE_MS = 3000;      // pause after the last touch before the model starts moving by itself again
const SPIN = 0.5;          // rad/s of the automatic rotation
const DRAG = 0.008;        // rad per pixel dragged
const FOV = 28;

export async function mount(host, opts) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const canvas = document.createElement('canvas');
  canvas.tabIndex = 0;
  canvas.setAttribute('role', 'img');
  if (opts.labelId) canvas.setAttribute('aria-labelledby', opts.labelId);
  const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'low-power' });
  host.appendChild(canvas);
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = ACESFilmicToneMapping;
  const scene = new Scene();
  const pmrem = new PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.9;
  const key = new DirectionalLight(0xffffff, 1.4);
  key.position.set(3, 5, 4);
  scene.add(key);
  const camera = new PerspectiveCamera(FOV, 1, 0.1, 200);

  const gltf = await new GLTFLoader().loadAsync(opts.url);
  const pivot = new Group();
  scene.add(pivot);
  const model = gltf.scene;
  pivot.add(model);
  const mixer = new AnimationMixer(model);
  if (gltf.animations.length) mixer.clipAction(gltf.animations[0]).play();
  mixer.update(0);
  model.updateMatrixWorld(true);
  const box = new Box3().setFromObject(model), center = box.getCenter(new Vector3()), size = box.getSize(new Vector3());
  model.position.sub(center);                       // centre on the pivot so it turns around its own middle
  const height = size.y, radius = Math.max(size.x, size.z) / 2;

  let yaw = opts.yaw === undefined ? -0.6 : opts.yaw, vel = 0, dragging = false, lastX = 0, resumeAt = 0, motion = 1;
  let visible = true, raf = 0, dirty = true, ready = false, w = 0, h = 0;

  function fit() {
    const t = Math.tan(MathUtils.degToRad(FOV / 2));
    const dV = (height * 0.56) / t;                                  // the model fills about 112% of the height... of its half
    const dH = (radius * 1.15) / (t * camera.aspect);
    const d = Math.max(dV, dH);
    camera.position.set(0, height * 0.04, d);
    camera.lookAt(0, 0, 0);
    camera.near = d / 20; camera.far = d * 6;
    camera.updateProjectionMatrix();
  }
  function resize() {
    const r = host.getBoundingClientRect();
    if (!r.width || !r.height) return;
    w = Math.round(r.width); h = Math.round(r.height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    fit();
    dirty = true;
  }
  new ResizeObserver(resize).observe(host);
  resize();

  const clock = new Clock();
  function frame() {
    raf = 0;
    if (!visible || document.hidden) return;
    const dt = Math.min(clock.getDelta(), 0.1), now = performance.now();
    const target = dragging || now < resumeAt || reduced.matches ? 0 : 1;
    motion += (target - motion) * (1 - Math.exp(-dt * 6));
    if (motion < 0.002 && target === 0) motion = 0;
    if (!dragging) { yaw += vel * dt; vel *= Math.exp(-dt * 3); if (Math.abs(vel) < 0.001) vel = 0; }
    yaw += SPIN * motion * dt;
    if (motion > 0) mixer.update(dt * motion);
    if (motion > 0 || vel !== 0 || dragging || dirty) {
      pivot.rotation.y = yaw;
      renderer.render(scene, camera);
      dirty = false;
      if (!ready) { ready = true; host.classList.add('is-ready'); }
    }
    raf = requestAnimationFrame(frame);
  }
  function kick() { if (!raf && visible && !document.hidden) { clock.getDelta(); raf = requestAnimationFrame(frame); } }
  new IntersectionObserver(es => { visible = es[es.length - 1].isIntersecting; kick(); }).observe(host);
  document.addEventListener('visibilitychange', kick);
  reduced.addEventListener('change', () => { dirty = true; kick(); });

  let lastT = 0;
  canvas.addEventListener('pointerdown', e => {
    dragging = true; vel = 0; lastX = e.clientX; lastT = e.timeStamp;
    canvas.setPointerCapture(e.pointerId);
    host.classList.add('is-touched');
    if (opts.onTouch) opts.onTouch();
    kick();
  });
  canvas.addEventListener('pointermove', e => {
    if (!dragging) return;
    const dx = e.clientX - lastX, dt = Math.max(e.timeStamp - lastT, 1) / 1000;
    yaw += dx * DRAG; vel = MathUtils.clamp((dx * DRAG) / dt, -8, 8) * 0.6 + vel * 0.4;
    lastX = e.clientX; lastT = e.timeStamp; dirty = true; kick();
  });
  const up = () => { if (!dragging) return; dragging = false; resumeAt = performance.now() + IDLE_MS; kick(); };
  canvas.addEventListener('pointerup', up);
  canvas.addEventListener('pointercancel', up);
  canvas.addEventListener('keydown', e => {
    const k = e.key === 'ArrowLeft' ? -1 : e.key === 'ArrowRight' ? 1 : 0;
    if (!k) return;
    e.preventDefault(); yaw += k * 0.2; resumeAt = performance.now() + IDLE_MS; dirty = true;
    host.classList.add('is-touched'); if (opts.onTouch) opts.onTouch(); kick();
  });
  canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); if (opts.onLost) opts.onLost(); });

  kick();
  return { canvas };
}
