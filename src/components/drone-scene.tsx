"use client";

import { Suspense, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Stars, useGLTF } from "@react-three/drei";
import * as THREE from "three";

/**
 * DroneMesh — loads the SwiftAir 3D drone model and keeps it alive with the
 * same floating + gentle rotation animation as the reference dashboard.
 */
function DroneMesh() {
  const meshRef = useRef<THREE.Mesh>(null);

  const { scene } = useGLTF("/models/scene.gltf");

  useFrame((state) => {
    if (!meshRef.current) return;
    meshRef.current.position.y = Math.sin(state.clock.elapsedTime) * 0.1;
    meshRef.current.rotation.y += 0.005;
  });

  return (
    <mesh ref={meshRef} scale={[0.5, 0.5, 0.5]} position={[0, 0, 0]}>
      <primitive object={scene} />
    </mesh>
  );
}

useGLTF.preload("/models/scene.gltf");

/**
 * DroneScene — interactive 3D drone view. Mirrors the reference Landing
 * canvas (auto-rotating orbit, stars, floating drone) with deterministic
 * lighting so it renders offline without fetching an HDR preset.
 */
export function DroneScene({ className }: { className?: string }) {
  return (
    <Canvas
      className={className}
      dpr={[1, 2]}
      camera={{ position: [0, 0, 5] }}
      gl={{ antialias: true }}
    >
      <Suspense fallback={null}>
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1} />
        <directionalLight position={[-8, 6, -6]} intensity={0.6} color="#ffd9a0" />
        <DroneMesh />
        <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
        <OrbitControls enableZoom={false} enablePan={false} autoRotate autoRotateSpeed={1} />
      </Suspense>
    </Canvas>
  );
}

export default DroneScene;