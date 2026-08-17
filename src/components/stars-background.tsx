"use client";

import { Canvas } from "@react-three/fiber";
import { Stars } from "@react-three/drei";

/**
 * StarsBackground — fixed, non-interactive starfield used behind page content,
 * identical to the reference dashboard's ambient background canvas.
 */
export function StarsBackground() {
  return (
    <Canvas style={{ pointerEvents: "none" }}>
      <Stars radius={300} depth={50} count={2000} factor={4} saturation={0} fade speed={0.5} />
    </Canvas>
  );
}

export default StarsBackground;