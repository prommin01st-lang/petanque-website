import { memo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

/* ------------------------------------------------------------------ */
/*  CoreObject — 3D React Atom Logo floating in the hero zone        */
/* ------------------------------------------------------------------ */

const CoreObject = memo(function CoreObject() {
  const coreRef = useRef<THREE.Mesh>(null);
  const ring1Ref = useRef<THREE.Mesh>(null);
  const ring2Ref = useRef<THREE.Mesh>(null);
  const ring3Ref = useRef<THREE.Mesh>(null);

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    
    // Spin the central nucleus core
    if (coreRef.current) {
      coreRef.current.rotation.y += delta * 0.4;
      coreRef.current.rotation.x = Math.sin(t * 0.3) * 0.15;
      const pulse = 1 + Math.sin(t * 1.5) * 0.05;
      coreRef.current.scale.setScalar(pulse);
    }

    // Spin each orbit at slightly different speeds for a dynamic HUD feel
    if (ring1Ref.current) {
      ring1Ref.current.rotation.z += delta * 0.25;
    }
    if (ring2Ref.current) {
      ring2Ref.current.rotation.z += delta * 0.18;
    }
    if (ring3Ref.current) {
      ring3Ref.current.rotation.z += delta * 0.32;
    }
  });

  return (
    <group position={[0, 2.0, -3.5]}>
      {/* Central nucleus */}
      <mesh ref={coreRef}>
        <sphereGeometry args={[0.42, 32, 32]} />
        <meshStandardMaterial
          color="#6C5CE7"
          emissive="#6C5CE7"
          emissiveIntensity={1.0}
          roughness={0.1}
          metalness={0.8}
        />
      </mesh>

      {/* Orbit 1: Tilted around X axis */}
      <mesh ref={ring1Ref} rotation={[Math.PI / 3, 0, 0]}>
        <torusGeometry args={[1.5, 0.025, 12, 64]} />
        <meshBasicMaterial color="#00E5FF" transparent opacity={0.5} />
      </mesh>

      {/* Orbit 2: Tilted around Y and X axis */}
      <mesh ref={ring2Ref} rotation={[-Math.PI / 6, Math.PI / 2.5, 0]}>
        <torusGeometry args={[1.5, 0.025, 12, 64]} />
        <meshBasicMaterial color="#00E5FF" transparent opacity={0.5} />
      </mesh>

      {/* Orbit 3: Tilted in opposite direction */}
      <mesh ref={ring3Ref} rotation={[-Math.PI / 6, -Math.PI / 2.5, 0]}>
        <torusGeometry args={[1.5, 0.025, 12, 64]} />
        <meshBasicMaterial color="#00E5FF" transparent opacity={0.5} />
      </mesh>
    </group>
  );
});

export default CoreObject;
