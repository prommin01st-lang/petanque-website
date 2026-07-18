import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useLoader, useThree } from '@react-three/fiber';
import type { ThreeEvent } from '@react-three/fiber';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';
import type { Font } from 'three/examples/jsm/loaders/FontLoader.js';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';
import type { HoverInfo } from '../SandboxCanvas';

/* ------------------------------------------------------------------ */
/*  Types & constants                                                  */
/* ------------------------------------------------------------------ */

type Emblem = 'text' | 'atom' | 'docker' | 'git';

interface BlockDef {
  name: string;
  color: string;
  emblem: Emblem;
  text?: string;
  size: number;
  home: [number, number, number];
  spawn: [number, number, number];
  initialRotation: [number, number, number];
}

interface BlockState {
  vel: THREE.Vector3;
  angVel: THREE.Vector3;
  grabbed: boolean;
  sleeping: boolean;
  hovered: boolean;
  floatSeed: number;
  dragPlane: THREE.Plane;
  grabOffset: THREE.Vector3;
  lastTime: number;
}

const GRAVITY = 14;
const RESTITUTION = 0.52;
const FRICTION = 0.88;
const ANG_DAMPING = 0.985;
const MAX_THROW_SPEED = 26;
const BOUND_X = 8.5;
const BOUND_Z_MIN = -7;
const BOUND_Z_MAX = 3;
const MAX_Y = 9;

const FONT_URL = `${import.meta.env.BASE_URL}fonts/helvetiker_bold.typeface.json`;

/* Deterministic pseudo-random (pure) — safe to call during render */
function hashRand(seed: number): number {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

/* ------------------------------------------------------------------ */
/*  Tech stack blocks — extruded-text / logo emblems per technology    */
/* ------------------------------------------------------------------ */

function buildDefs(): BlockDef[] {
  const raw: Array<[string, string, Emblem, string | undefined, number, number, number]> = [
    // name, color, emblem, text, size, homeX, homeZ
    ['.NET 9', '#9B6DFF', 'text', '.NET', 0.5, -5.4, -1.5],
    ['C#', '#7B5CFF', 'text', 'C#', 0.46, -3.2, -3.5],
    ['ASP.NET Core', '#B48CFF', 'text', 'ASP', 0.42, 4.6, -2.2],
    ['SignalR', '#C9A6FF', 'text', 'SR', 0.42, 6.2, -0.6],
    ['EF Core 9', '#6A5ACD', 'text', 'EF', 0.42, -6.6, 0.6],
    ['TypeScript', '#3178C6', 'text', 'TS', 0.52, 3.1, -4.2],
    ['React 19', '#61DAFB', 'atom', undefined, 0.5, -1.8, -5.0],
    ['Next.js', '#E8E8E8', 'text', 'N', 0.46, 5.6, 1.2],
    ['Tailwind CSS', '#38BDF8', 'text', '~', 0.5, -4.4, 1.8],
    ['Material UI', '#007FFF', 'text', 'MUI', 0.4, 1.4, -2.6],
    ['PostgreSQL', '#5391CF', 'text', 'PG', 0.46, -2.6, -1.2],
    ['SQL Server', '#CC292B', 'text', 'SQL', 0.44, 2.2, 0.4],
    ['Redis', '#D82C20', 'text', 'RDS', 0.4, 6.8, -3.2],
    ['Docker', '#2496ED', 'docker', undefined, 0.5, -6.0, -3.0],
    ['PowerShell', '#5391FE', 'text', '>_', 0.44, 0.2, -4.4],
    ['xUnit', '#4AF626', 'text', 'xU', 0.4, -0.9, 1.4],
    ['Testcontainers', '#2ECC71', 'text', 'TC', 0.42, 4.0, -0.9],
    ['Cloudflare R2', '#F6821F', 'text', 'R2', 0.44, -3.8, -0.2],
    ['Gemini AI', '#8E75FF', 'text', 'AI', 0.44, 1.9, 1.9],
    ['MCP', '#00E5FF', 'text', 'MCP', 0.44, 0.4, -1.6],
    ['Git', '#F05033', 'git', undefined, 0.46, -1.5, -2.8],
    ['Google APIs', '#FFD93D', 'text', 'G', 0.44, 5.0, -4.6],
  ];

  return raw.map(([name, color, emblem, text, size, x, z], i) => ({
    name,
    color,
    emblem,
    text,
    size,
    home: [x, size, z],
    spawn: [
      x + (hashRand(i * 7 + 1) - 0.5) * 1.5,
      size + 2.5 + hashRand(i * 7 + 2) * 4.5,
      z + (hashRand(i * 7 + 3) - 0.5) * 1.5,
    ],
    initialRotation:
      emblem === 'text'
        ? [0, (hashRand(i * 7 + 5) - 0.5) * 0.9, 0]
        : [
            hashRand(i * 7 + 4) * Math.PI,
            hashRand(i * 7 + 5) * Math.PI,
            hashRand(i * 7 + 6) * Math.PI,
          ],
  }));
}

/* ------------------------------------------------------------------ */
/*  Emblem components                                                  */
/* ------------------------------------------------------------------ */

function emblemMaterial(color: string) {
  return (
    <meshStandardMaterial
      color={color}
      emissive={color}
      emissiveIntensity={0.3}
      roughness={0.4}
      metalness={0.2}
    />
  );
}

/** Extruded 3D text (helvetiker bold, self-hosted typeface JSON) */
function TextEmblem({ text, size, color, font }: { text: string; size: number; color: string; font: Font }) {
  const geometry = useMemo(() => {
    const geo = new TextGeometry(text, {
      font,
      size: size * 1.1,
      depth: size * 0.45,
      curveSegments: 5,
      bevelEnabled: false,
    });
    geo.center();
    return geo;
  }, [text, size, font]);

  useEffect(() => () => geometry.dispose(), [geometry]);

  return (
    <mesh geometry={geometry}>{emblemMaterial(color)}</mesh>
  );
}

/** React-style atom: 3 ellipses + nucleus */
function AtomEmblem({ size, color }: { size: number; color: string }) {
  const s = size;
  return (
    <group>
      {[0, Math.PI / 3, (2 * Math.PI) / 3].map((rz) => (
        <mesh key={rz} rotation={[0, 0, rz]} scale={[1, 1.55, 1]}>
          <torusGeometry args={[s, s * 0.07, 8, 32]} />
          {emblemMaterial(color)}
        </mesh>
      ))}
      <mesh>
        <sphereGeometry args={[s * 0.28, 12, 12]} />
        {emblemMaterial(color)}
      </mesh>
    </group>
  );
}

/** Docker-style container stack on a platform */
function DockerEmblem({ size, color }: { size: number; color: string }) {
  const s = size;
  const c = s * 0.52; // container cube size
  return (
    <group>
      {/* platform */}
      <mesh position={[0, -s * 0.85, 0]}>
        <boxGeometry args={[s * 2.3, s * 0.32, s * 1.5]} />
        {emblemMaterial(color)}
      </mesh>
      {/* containers: rows of 3 / 2 / 1 */}
      {[-0.58, 0, 0.58].map((x) => (
        <mesh key={`r1-${x}`} position={[x * s * 1.6, -s * 0.35, 0]}>
          <boxGeometry args={[c, c, c]} />
          {emblemMaterial(color)}
        </mesh>
      ))}
      {[-0.29, 0.29].map((x) => (
        <mesh key={`r2-${x}`} position={[x * s * 1.6, s * 0.2, 0]}>
          <boxGeometry args={[c, c, c]} />
          {emblemMaterial(color)}
        </mesh>
      ))}
      <mesh position={[0, s * 0.75, 0]}>
        <boxGeometry args={[c, c, c]} />
        {emblemMaterial(color)}
      </mesh>
    </group>
  );
}

/** Thin cylinder linking two points (for the Git emblem) */
function BranchLink({
  from,
  to,
  r,
  color,
}: {
  from: [number, number, number];
  to: [number, number, number];
  r: number;
  color: string;
}) {
  const { position, quaternion, length } = useMemo(() => {
    const a = new THREE.Vector3(...from);
    const b = new THREE.Vector3(...to);
    const dir = b.clone().sub(a);
    const len = dir.length();
    const mid = a.clone().add(b).multiplyScalar(0.5);
    const q = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      dir.normalize(),
    );
    return { position: mid, quaternion: q, length: len };
  }, [from, to]);

  return (
    <mesh position={position} quaternion={quaternion}>
      <cylinderGeometry args={[r, r, length, 8]} />
      {emblemMaterial(color)}
    </mesh>
  );
}

/** Git-style branch: 3 nodes + 2 links */
function GitEmblem({ size, color }: { size: number; color: string }) {
  const s = size;
  const r = s * 0.3;
  const bottom: [number, number, number] = [0, -s * 0.75, 0];
  const top: [number, number, number] = [-s * 0.1, s * 0.75, 0];
  const branch: [number, number, number] = [s * 0.65, s * 0.15, 0];
  return (
    <group>
      {[bottom, top, branch].map((p, i) => (
        <mesh key={i} position={p}>
          <sphereGeometry args={[r, 14, 14]} />
          {emblemMaterial(color)}
        </mesh>
      ))}
      <BranchLink from={bottom} to={top} r={s * 0.09} color={color} />
      <BranchLink from={branch} to={top} r={s * 0.09} color={color} />
    </group>
  );
}

function BlockEmblem({ def, font }: { def: BlockDef; font: Font }) {
  switch (def.emblem) {
    case 'atom':
      return <AtomEmblem size={def.size} color={def.color} />;
    case 'docker':
      return <DockerEmblem size={def.size} color={def.color} />;
    case 'git':
      return <GitEmblem size={def.size} color={def.color} />;
    case 'text':
    default:
      return <TextEmblem text={def.text ?? def.name} size={def.size} color={def.color} font={font} />;
  }
}

/* ------------------------------------------------------------------ */
/*  TechBlocks — draggable / throwable physics emblems                 */
/* ------------------------------------------------------------------ */

export default function TechBlocks({
  mobile = false,
  onTooltip,
}: {
  mobile?: boolean;
  onTooltip: (info: HoverInfo | null) => void;
}) {
  const camera = useThree((s) => s.camera);
  const font = useLoader(FontLoader, FONT_URL);

  const defs = useMemo(() => {
    const all = buildDefs();
    return mobile ? all.filter((_, i) => i % 2 === 0) : all;
  }, [mobile]);

  const rootsRef = useRef<Array<THREE.Object3D | null>>([]);
  const statesRef = useRef<BlockState[]>([]);

  /*
   * Mutable per-block physics state lives in a ref (mutated by the frame
   * loop and event handlers). Refs may only be written outside render,
   * so the array is (re)built in an effect whenever defs changes.
   */
  useEffect(() => {
    statesRef.current = defs.map((_, i) => ({
      vel: new THREE.Vector3((hashRand(i * 5 + 1) - 0.5) * 2, 0, (hashRand(i * 5 + 2) - 0.5) * 2),
      angVel: new THREE.Vector3(
        defs[i].emblem === 'text' ? 0 : (hashRand(i * 5 + 3) - 0.5) * 2,
        (hashRand(i * 5 + 4) - 0.5) * 2,
        defs[i].emblem === 'text' ? 0 : (hashRand(i * 5 + 5) - 0.5) * 2,
      ),
      grabbed: false,
      sleeping: false,
      hovered: false,
      floatSeed: hashRand(i * 5 + 6) * Math.PI * 2,
      dragPlane: new THREE.Plane(),
      grabOffset: new THREE.Vector3(),
      lastTime: 0,
    }));
  }, [defs]);

  /* ---------- physics loop ---------- */
  useFrame((state, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const t = state.clock.elapsedTime;

    for (let i = 0; i < defs.length; i++) {
      const m = rootsRef.current[i];
      const s = statesRef.current[i];
      if (!m || !s) continue;
      const def = defs[i];
      const r = def.size;
      const isText = def.emblem === 'text';

      // hover / grab scale feedback (uniform for meshes and groups)
      const targetScale = s.grabbed ? 1.22 : s.hovered ? 1.15 : 1;
      m.scale.setScalar(THREE.MathUtils.damp(m.scale.x, targetScale, 10, dt));

      if (s.grabbed) continue; // position driven by drag handler

      if (s.sleeping) {
        // gentle idle bob around home; text stays upright (turntable)
        m.position.set(
          def.home[0],
          def.home[1] + Math.sin(t * 1.2 + s.floatSeed) * 0.08,
          def.home[2],
        );
        if (isText) {
          m.rotation.x = THREE.MathUtils.damp(m.rotation.x, 0, 4, dt);
          m.rotation.z = THREE.MathUtils.damp(m.rotation.z, 0, 4, dt);
          m.rotation.y += dt * 0.35;
        } else {
          m.rotation.y += dt * 0.2;
        }
        continue;
      }

      // integrate
      s.vel.y -= GRAVITY * dt;
      m.position.addScaledVector(s.vel, dt);

      // floor bounce
      if (m.position.y < r) {
        m.position.y = r;
        if (Math.abs(s.vel.y) > 1.0) {
          s.vel.y = -s.vel.y * RESTITUTION;
          if (!isText) {
            s.angVel.x += (Math.random() - 0.5) * 2;
            s.angVel.z += (Math.random() - 0.5) * 2;
          }
        } else {
          s.vel.y = 0;
        }
        s.vel.x *= FRICTION;
        s.vel.z *= FRICTION;
      }

      // walls
      if (m.position.x < -BOUND_X) {
        m.position.x = -BOUND_X;
        s.vel.x = -s.vel.x * RESTITUTION;
      } else if (m.position.x > BOUND_X) {
        m.position.x = BOUND_X;
        s.vel.x = -s.vel.x * RESTITUTION;
      }
      if (m.position.z < BOUND_Z_MIN) {
        m.position.z = BOUND_Z_MIN;
        s.vel.z = -s.vel.z * RESTITUTION;
      } else if (m.position.z > BOUND_Z_MAX) {
        m.position.z = BOUND_Z_MAX;
        s.vel.z = -s.vel.z * RESTITUTION;
      }
      if (m.position.y > MAX_Y) {
        m.position.y = MAX_Y;
        s.vel.y = Math.min(s.vel.y, 0);
      }

      // rotation
      m.rotation.x += s.angVel.x * dt;
      m.rotation.y += s.angVel.y * dt;
      m.rotation.z += s.angVel.z * dt;
      s.angVel.multiplyScalar(ANG_DAMPING);

      // settle → drift back home → sleep
      const onFloor = m.position.y <= r + 0.02;
      const speed = s.vel.length();
      if (onFloor && speed < 0.6) {
        m.position.x = THREE.MathUtils.damp(m.position.x, def.home[0], 1.8, dt);
        m.position.z = THREE.MathUtils.damp(m.position.z, def.home[2], 1.8, dt);
        if (isText) {
          // ease text blocks back to upright before sleeping
          m.rotation.x = THREE.MathUtils.damp(m.rotation.x, 0, 4, dt);
          m.rotation.z = THREE.MathUtils.damp(m.rotation.z, 0, 4, dt);
        }
        const dx = m.position.x - def.home[0];
        const dz = m.position.z - def.home[2];
        if (dx * dx + dz * dz < 0.01) {
          s.sleeping = true;
          s.angVel.set(0, 0, 0);
        }
      }
    }
  });

  /* ---------- interaction handlers ---------- */

  const anyGrabbed = () => statesRef.current.some((s) => s.grabbed);

  const handleOver = (i: number) => (e: ThreeEvent<PointerEvent>) => {
    const s = statesRef.current[i];
    if (!s || anyGrabbed()) return;
    e.stopPropagation();
    s.hovered = true;
    document.body.style.cursor = 'grab';
    onTooltip({ name: defs[i].name, x: e.clientX, y: e.clientY });
  };

  const handleOut = (i: number) => () => {
    const s = statesRef.current[i];
    if (!s) return;
    s.hovered = false;
    if (!s.grabbed) {
      document.body.style.cursor = 'auto';
      onTooltip(null);
    }
  };

  const handleDown = (i: number) => (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    (e.target as Element).setPointerCapture(e.pointerId);

    const m = rootsRef.current[i];
    const s = statesRef.current[i];
    if (!m || !s) return;

    s.grabbed = true;
    s.sleeping = false;
    s.hovered = false;
    s.vel.set(0, 0, 0);
    s.angVel.set(0, 0, 0);
    s.lastTime = performance.now();

    // drag plane: through block center, parallel to the screen
    const camDir = new THREE.Vector3();
    camera.getWorldDirection(camDir);
    s.dragPlane.setFromNormalAndCoplanarPoint(camDir.negate(), m.position);

    const hit = new THREE.Vector3();
    if (e.ray.intersectPlane(s.dragPlane, hit)) {
      s.grabOffset.copy(m.position).sub(hit);
    } else {
      s.grabOffset.set(0, 0, 0);
    }

    document.body.style.cursor = 'grabbing';
    onTooltip(null);
  };

  const handleMove = (i: number) => (e: ThreeEvent<PointerEvent>) => {
    const m = rootsRef.current[i];
    const s = statesRef.current[i];
    if (!m || !s) return;

    if (s.grabbed) {
      e.stopPropagation();
      const hit = new THREE.Vector3();
      if (e.ray.intersectPlane(s.dragPlane, hit)) {
        const now = performance.now();
        const dt = Math.max((now - s.lastTime) / 1000, 1e-3);
        hit.add(s.grabOffset);

        hit.x = THREE.MathUtils.clamp(hit.x, -BOUND_X, BOUND_X);
        hit.y = THREE.MathUtils.clamp(hit.y, defs[i].size, MAX_Y);
        hit.z = THREE.MathUtils.clamp(hit.z, BOUND_Z_MIN, BOUND_Z_MAX);

        s.vel.copy(hit).sub(m.position).divideScalar(dt);
        if (s.vel.length() > MAX_THROW_SPEED) s.vel.setLength(MAX_THROW_SPEED);

        m.position.copy(hit);
        s.lastTime = now;
      }
    } else if (s.hovered) {
      onTooltip({ name: defs[i].name, x: e.clientX, y: e.clientY });
    }
  };

  const release = (i: number) => (e: ThreeEvent<PointerEvent>) => {
    const s = statesRef.current[i];
    if (!s || !s.grabbed) return;
    e.stopPropagation();
    (e.target as Element).releasePointerCapture(e.pointerId);

    s.grabbed = false;
    // throw: keep computed velocity, add spin kick (not for text — keep readable)
    if (defs[i].emblem !== 'text') {
      s.angVel.set(
        (Math.random() - 0.5) * 4 + s.vel.z * 0.2,
        (Math.random() - 0.5) * 4,
        (Math.random() - 0.5) * 4 - s.vel.x * 0.2,
      );
    }

    document.body.style.cursor = 'auto';
    onTooltip(null);
  };

  /* ---------- render ---------- */

  return (
    <group>
      {defs.map((def, i) => (
        <group
          key={def.name}
          ref={(el) => {
            rootsRef.current[i] = el;
          }}
          position={def.spawn}
          rotation={def.initialRotation}
          onPointerOver={handleOver(i)}
          onPointerOut={handleOut(i)}
          onPointerDown={handleDown(i)}
          onPointerMove={handleMove(i)}
          onPointerUp={release(i)}
          onPointerCancel={release(i)}
        >
          <BlockEmblem def={def} font={font} />
        </group>
      ))}
    </group>
  );
}
