const dark = matchMedia('(prefers-color-scheme: dark)').matches;
const scene = new THREE.Scene();
const skyCol = dark ? 0x10182a : 0xcfe8f5;
scene.background = new THREE.Color(skyCol);
scene.fog = new THREE.Fog(skyCol, 30, 90);
const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 200);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

scene.add(new THREE.HemisphereLight(0xffffff, 0x445533, dark ? 0.5 : 0.9));
const sun = new THREE.DirectionalLight(0xfff2d0, dark ? 0.6 : 1);
sun.position.set(10, 20, 8);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
Object.assign(sun.shadow.camera, { left: -25, right: 25, top: 25, bottom: -25, far: 60 });
scene.add(sun, sun.target);

// Ground and scenery
const ground = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.MeshStandardMaterial({ color: 0x6b8f3a }));
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);
const grid = new THREE.GridHelper(100, 50, 0x4d6b2a, 0x587a30);
grid.position.y = 0.01;
scene.add(grid);

let seed = 7;
const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const stoneMat = new THREE.MeshStandardMaterial({ color: 0x8a8578 });
const bladeMat = new THREE.MeshStandardMaterial({ color: 0x3f7a2a });
for (let i = 0; i < 40; i++) {
    const s = 0.3 + rnd() * 0.9;
    const m = new THREE.Mesh(new THREE.DodecahedronGeometry(s, 0), stoneMat);
    m.position.set((rnd() - 0.5) * 90, s * 0.4, (rnd() - 0.5) * 90);
    m.rotation.set(rnd() * 3, rnd() * 3, rnd() * 3);
    m.castShadow = m.receiveShadow = true;
    scene.add(m);
}
for (let i = 0; i < 160; i++) {
    const h = 1.5 + rnd() * 2.5;
    const m = new THREE.Mesh(new THREE.ConeGeometry(0.12, h, 4), bladeMat);
    m.position.set((rnd() - 0.5) * 95, h / 2, (rnd() - 0.5) * 95);
    m.castShadow = true;
    scene.add(m);
}

// Ant
const ant = new THREE.Group();
scene.add(ant);
const body = new THREE.Group();
body.position.y = 0.62;
ant.add(body);
const mat = new THREE.MeshStandardMaterial({ color: 0x4a1f10, roughness: 0.45 });
const dim = new THREE.MeshStandardMaterial({ color: 0x2b110a, roughness: 0.6 });
const black = new THREE.MeshStandardMaterial({ color: 0x000000, roughness: 0.2 });

function ball(r, sx, sy, sz, x, y, z, m = mat) {
    const o = new THREE.Mesh(new THREE.SphereGeometry(r, 24, 16), m);
    o.scale.set(sx, sy, sz);
    o.position.set(x, y, z);
    o.castShadow = true;
    body.add(o);
    return o;
}
ball(0.5, 0.8, 0.75, 1.15, 0, 0, 0);          // thorax
ball(0.65, 1, 0.9, 1.4, 0, 0.05, -1.15);       // abdomen
ball(0.42, 1, 0.85, 1.05, 0, 0.05, 0.85);      // head
ball(0.12, 1, 1, 1, 0, 0, -0.55, dim);         // waist
ball(0.09, 1, 1, 1, 0.22, 0.2, 1.1, black);    // eyes
ball(0.09, 1, 1, 1, -0.22, 0.2, 1.1, black);

function seg(a, b, r, m) {
    const d = b.clone().sub(a), len = d.length();
    const o = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 0.8, len, 6), m);
    o.position.copy(a).add(b).multiplyScalar(0.5);
    o.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
    o.castShadow = true;
    return o;
}
const V = (x, y, z) => new THREE.Vector3(x, y, z);

// Antennae
const antennae = [];
for (const s of [1, -1]) {
    const p = new THREE.Group();
    p.position.set(s * 0.15, 0.25, 1.2);
    p.add(seg(V(0, 0, 0), V(s * 0.25, 0.45, 0.4), 0.03, dim), seg(V(s * 0.25, 0.45, 0.4), V(s * 0.55, 0.3, 0.95), 0.025, dim));
    body.add(p);
    antennae.push({ p, s });
}
// Mandibles
for (const s of [1, -1]) body.add(seg(V(s * 0.12, -0.12, 1.25), V(s * 0.04, -0.12, 1.55), 0.04, dim));

// Legs (3 per side)
const legs = [];
[0.38, 0, -0.38].forEach((zOff, i) => {
    for (const s of [1, -1]) {
        const pivot = new THREE.Group();
        pivot.position.set(s * 0.3, -0.1, zOff);
        const knee = V(s * 0.6, 0.35, 0), foot = V(s * 1.1, -0.52, 0);
        pivot.add(seg(V(0, 0, 0), knee, 0.045, dim), seg(knee, foot, 0.035, dim));
        body.add(pivot);
        legs.push({ pivot, s, base: [-0.55, 0, 0.55][i] * s, phase: ((i + (s > 0 ? 0 : 1)) % 2) * Math.PI });
    }
});

// Controls
const keys = {};
addEventListener('keydown', e => { if (e.key.startsWith('Arrow')) { keys[e.key] = true; e.preventDefault(); } });
addEventListener('keyup', e => { if (e.key.startsWith('Arrow')) keys[e.key] = false; });
addEventListener('blur', () => { for (const k in keys) keys[k] = false; });
document.querySelectorAll('#pad button').forEach(b => {
    const k = b.dataset.k;
    b.addEventListener('pointerdown', e => { keys[k] = true; e.preventDefault(); });
    ['pointerup', 'pointercancel', 'pointerleave'].forEach(ev => b.addEventListener(ev, () => (keys[k] = false)));
});

let heading = 0, walkPhase = 0, speed = 0, t = 0;
camera.position.set(0, 5, -8);
const clock = new THREE.Clock();

function frame() {
    requestAnimationFrame(frame);
    const dt = Math.min(clock.getDelta(), 0.05);
    t += dt;
    const move = (keys.ArrowUp ? 1 : 0) - (keys.ArrowDown ? 1 : 0);
    const turn = (keys.ArrowLeft ? 1 : 0) - (keys.ArrowRight ? 1 : 0);
    heading += turn * 2.2 * dt * (move < 0 ? -1 : 1);
    const target = move * 5;
    speed += (target - speed) * Math.min(1, dt * 8);
    const moving = Math.abs(speed) > 0.05 || turn !== 0;
    ant.position.x = THREE.MathUtils.clamp(ant.position.x + Math.sin(heading) * speed * dt, -48, 48);
    ant.position.z = THREE.MathUtils.clamp(ant.position.z + Math.cos(heading) * speed * dt, -48, 48);
    ant.rotation.y = heading;

    if (moving) walkPhase += dt * (Math.abs(speed) * 2.2 + (turn ? 6 : 0)) * Math.sign(speed || 1);
    for (const l of legs) {
        const ph = walkPhase + l.phase;
        const sw = moving ? Math.sin(ph) * 0.35 : 0;
        l.pivot.rotation.y = l.base - l.s * sw;
        l.pivot.position.y = -0.1 + (moving ? Math.max(0, Math.cos(ph)) * 0.18 : 0);
    }
    body.position.y = 0.62 + (moving ? Math.abs(Math.sin(walkPhase)) * 0.04 : 0);
    body.rotation.z = moving ? Math.sin(walkPhase) * 0.025 : 0;
    for (const a of antennae) a.p.rotation.y = Math.sin(t * 3 + a.s) * 0.12 * a.s;

    const off = V(-Math.sin(heading) * 7, 4.5, -Math.cos(heading) * 7);
    camera.position.lerp(ant.position.clone().add(off), Math.min(1, dt * 4));
    camera.lookAt(ant.position.x, 0.8, ant.position.z);
    sun.position.set(ant.position.x + 10, 20, ant.position.z + 8);
    sun.target.position.copy(ant.position);
    renderer.render(scene, camera);
}
frame();

addEventListener('resize', () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
});