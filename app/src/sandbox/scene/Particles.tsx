import { memo } from 'react';
import { Stars } from '@react-three/drei';

/* ------------------------------------------------------------------ */
/*  Particles — slow drifting starfield backdrop                       */
/* ------------------------------------------------------------------ */

const Particles = memo(function Particles({ mobile = false }: { mobile?: boolean }) {
  return (
    <Stars
      radius={55}
      depth={35}
      count={mobile ? 1200 : 2400}
      factor={3}
      saturation={0}
      fade
      speed={0.5}
    />
  );
});

export default Particles;
