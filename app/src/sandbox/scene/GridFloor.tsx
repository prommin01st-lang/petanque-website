import { memo } from 'react';
import { Grid } from '@react-three/drei';

/* ------------------------------------------------------------------ */
/*  GridFloor — infinite neon grid plane at y = 0                      */
/* ------------------------------------------------------------------ */

const GridFloor = memo(function GridFloor() {
  return (
    <Grid
      position={[0, -0.01, 0]}
      infiniteGrid
      cellSize={0.7}
      sectionSize={3.5}
      cellThickness={0.6}
      sectionThickness={1.2}
      cellColor="#12303C"
      sectionColor="#0E4A5C"
      fadeDistance={42}
      fadeStrength={3}
    />
  );
});

export default GridFloor;
