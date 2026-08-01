import { Canvas, useFrame } from "@react-three/fiber";
import { useRef, useState } from "react";
import type { MutableRefObject, PointerEvent } from "react";
import type { Group, Mesh } from "three";

type SceneCoreProps = {
  targetRotation: MutableRefObject<{ x: number; y: number }>;
  isDragging: boolean;
};

const nodes = [
  { position: [-1.75, 1.12, 0.22], scale: 0.42, color: "#5eead4" },
  { position: [1.74, 0.92, -0.12], scale: 0.48, color: "#f5d36f" },
  { position: [-1.42, -1.1, -0.16], scale: 0.38, color: "#c4b5fd" },
  { position: [1.22, -1.18, 0.18], scale: 0.36, color: "#86efac" },
  { position: [0, 1.72, -0.24], scale: 0.28, color: "#bae6fd" },
  { position: [0.04, -1.76, 0.1], scale: 0.28, color: "#fecdd3" }
] as const;

function PatternNode({ position, scale, color }: typeof nodes[number]) {
  const mesh = useRef<Mesh>(null);

  useFrame(({ clock }) => {
    if (!mesh.current) return;
    const t = clock.getElapsedTime();
    mesh.current.rotation.x = t * 0.38 + position[1] * 0.4;
    mesh.current.rotation.y = t * 0.44 + position[0] * 0.3;
  });

  return (
    <mesh ref={mesh} position={position} scale={scale}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.32} metalness={0.28} roughness={0.2} />
    </mesh>
  );
}

function SceneCore({ targetRotation, isDragging }: SceneCoreProps) {
  const group = useRef<Group>(null);
  const core = useRef<Mesh>(null);
  const ring = useRef<Mesh>(null);
  const band = useRef<Mesh>(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();

    if (group.current) {
      if (!isDragging) {
        targetRotation.current.y += 0.0035;
        targetRotation.current.x = Math.sin(t * 0.5) * 0.08;
      }
      group.current.rotation.x += (targetRotation.current.x - group.current.rotation.x) * 0.08;
      group.current.rotation.y += (targetRotation.current.y - group.current.rotation.y) * 0.08;
    }

    if (core.current) {
      core.current.position.y = Math.sin(t * 1.4) * 0.07;
    }
    if (ring.current) {
      ring.current.rotation.z = t * 0.32;
      ring.current.rotation.x = 1.25 + Math.sin(t) * 0.08;
    }
    if (band.current) {
      band.current.rotation.y = t * -0.24;
      band.current.rotation.x = 0.9 + Math.sin(t * 0.8) * 0.08;
    }
  });

  return (
    <group ref={group} rotation={[0.16, -0.38, 0]}>
      <mesh ref={core}>
        <dodecahedronGeometry args={[1.08, 0]} />
        <meshStandardMaterial color="#dbeafe" emissive="#2dd4bf" emissiveIntensity={0.26} metalness={0.64} roughness={0.16} />
      </mesh>
      <mesh ref={ring}>
        <torusGeometry args={[1.82, 0.024, 14, 120]} />
        <meshStandardMaterial color="#2dd4bf" emissive="#2dd4bf" emissiveIntensity={0.9} />
      </mesh>
      <mesh ref={band} rotation={[1.1, 0.35, 0]}>
        <torusGeometry args={[2.28, 0.014, 12, 120]} />
        <meshStandardMaterial color="#f5d36f" emissive="#f5d36f" emissiveIntensity={0.6} />
      </mesh>
      <mesh rotation={[0, 0, 0.78]}>
        <torusGeometry args={[1.36, 0.012, 12, 96]} />
        <meshStandardMaterial color="#a7f3d0" emissive="#a7f3d0" emissiveIntensity={0.5} />
      </mesh>
      {nodes.map((node) => (
        <PatternNode key={node.position.join("-")} {...node} />
      ))}
    </group>
  );
}

export function AiScene() {
  const targetRotation = useRef({ x: 0.16, y: -0.38 });
  const lastPointer = useRef({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);

  function beginRotate(event: PointerEvent<HTMLDivElement>) {
    setIsDragging(true);
    lastPointer.current = { x: event.clientX, y: event.clientY };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function rotate(event: PointerEvent<HTMLDivElement>) {
    if (!isDragging) return;
    const deltaX = event.clientX - lastPointer.current.x;
    const deltaY = event.clientY - lastPointer.current.y;
    targetRotation.current.y += deltaX * 0.01;
    targetRotation.current.x += deltaY * 0.01;
    targetRotation.current.x = Math.max(-0.85, Math.min(0.85, targetRotation.current.x));
    lastPointer.current = { x: event.clientX, y: event.clientY };
  }

  function endRotate(event: PointerEvent<HTMLDivElement>) {
    setIsDragging(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  return (
    <div
      className={`scene ${isDragging ? "is-dragging" : ""}`}
      aria-label="Rotatable 3D AI commerce pattern"
      role="img"
      onPointerDown={beginRotate}
      onPointerMove={rotate}
      onPointerUp={endRotate}
      onPointerCancel={endRotate}
      onPointerLeave={() => setIsDragging(false)}
    >
      <Canvas camera={{ position: [0, 0, 5.2], fov: 43 }}>
        <ambientLight intensity={0.82} />
        <directionalLight position={[3, 4, 5]} intensity={2.1} color="#ffffff" />
        <pointLight position={[-4, -1, 3]} intensity={1.6} color="#2dd4bf" />
        <pointLight position={[2, -3, 2]} intensity={1.2} color="#f5d36f" />
        <SceneCore targetRotation={targetRotation} isDragging={isDragging} />
      </Canvas>
    </div>
  );
}
