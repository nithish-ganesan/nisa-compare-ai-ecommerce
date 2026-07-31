import { Canvas, useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type { Mesh } from "three";

function Core() {
  const mesh = useRef<Mesh>(null);
  const ring = useRef<Mesh>(null);
  useFrame(({ clock, pointer }) => {
    const t = clock.getElapsedTime();
    if (mesh.current) {
      mesh.current.rotation.x = t * 0.35 + pointer.y * 0.25;
      mesh.current.rotation.y = t * 0.5 + pointer.x * 0.35;
      mesh.current.position.y = Math.sin(t * 1.4) * 0.08;
    }
    if (ring.current) {
      ring.current.rotation.z = t * 0.32;
      ring.current.rotation.x = 1.25 + Math.sin(t) * 0.08;
    }
  });

  return (
    <group>
      <mesh ref={mesh}>
        <icosahedronGeometry args={[1.35, 2]} />
        <meshStandardMaterial color="#dbeafe" emissive="#6d5dfc" emissiveIntensity={0.38} metalness={0.55} roughness={0.18} />
      </mesh>
      <mesh ref={ring}>
        <torusGeometry args={[1.82, 0.018, 12, 96]} />
        <meshStandardMaterial color="#2dd4bf" emissive="#2dd4bf" emissiveIntensity={0.9} />
      </mesh>
      <mesh rotation={[1.1, 0.35, 0]}>
        <torusGeometry args={[2.18, 0.012, 12, 96]} />
        <meshStandardMaterial color="#f5d36f" emissive="#f5d36f" emissiveIntensity={0.6} />
      </mesh>
    </group>
  );
}

export function AiScene() {
  return (
    <div className="scene" aria-hidden="true">
      <Canvas camera={{ position: [0, 0, 5], fov: 45 }}>
        <ambientLight intensity={0.9} />
        <pointLight position={[3, 3, 4]} intensity={2.2} color="#f8fafc" />
        <pointLight position={[-4, -1, 3]} intensity={1.3} color="#2dd4bf" />
        <Core />
      </Canvas>
    </div>
  );
}
