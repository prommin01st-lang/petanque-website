import { memo, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

/* ------------------------------------------------------------------ */
/*  CameraRig — pointer parallax + scroll-driven dolly                 */
/* ------------------------------------------------------------------ */

const tmpLook = new THREE.Vector3();

const CameraRig = memo(function CameraRig() {
  const scrollRef = useRef(0);
  const pointerRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const updateScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      scrollRef.current = max > 0 ? Math.min(Math.max(window.scrollY / max, 0), 1) : 0;
    };
    const updatePointer = (e: PointerEvent) => {
      pointerRef.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointerRef.current.y = -((e.clientY / window.innerHeight) * 2 - 1);
    };

    updateScroll();
    window.addEventListener('scroll', updateScroll, { passive: true });
    window.addEventListener('resize', updateScroll);
    window.addEventListener('pointermove', updatePointer, { passive: true });
    return () => {
      window.removeEventListener('scroll', updateScroll);
      window.removeEventListener('resize', updateScroll);
      window.removeEventListener('pointermove', updatePointer);
    };
  }, []);

  useFrame((state, delta) => {
    const p = scrollRef.current;
    const { x: px, y: py } = pointerRef.current;
    const cam = state.camera;

    const targetX = px * 1.4;
    const targetY = 2.2 - p * 1.3 + py * 0.45;
    const targetZ = 9 - p * 2.2;

    cam.position.x = THREE.MathUtils.damp(cam.position.x, targetX, 2.2, delta);
    cam.position.y = THREE.MathUtils.damp(cam.position.y, targetY, 2.2, delta);
    cam.position.z = THREE.MathUtils.damp(cam.position.z, targetZ, 2.2, delta);

    tmpLook.set(px * 0.4, 1.2 - p * 0.9, 0);
    cam.lookAt(tmpLook);
  });

  return null;
});

export default CameraRig;
