import { Canvas, useFrame } from "@react-three/fiber";
import { useRef, useState } from "react";
import type { MutableRefObject, PointerEvent } from "react";
import type { Group } from "three";

type SceneCoreProps = {
  targetRotation: MutableRefObject<{ x: number; y: number }>;
  isDragging: boolean;
};

function ShoppingBag() {
  return (
    <group>
      <mesh position={[0, -0.12, 0]} scale={[1.32, 1.5, 0.64]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#7dd3fc" emissive="#0f766e" emissiveIntensity={0.16} metalness={0.28} roughness={0.24} />
      </mesh>
      <mesh position={[0, 0.72, 0.02]} rotation={[Math.PI / 2, 0, 0]} scale={[0.9, 0.42, 0.52]}>
        <torusGeometry args={[0.6, 0.045, 12, 72]} />
        <meshStandardMaterial color="#f8fafc" emissive="#5eead4" emissiveIntensity={0.28} metalness={0.42} roughness={0.18} />
      </mesh>
      <mesh position={[-0.3, 0.2, 0.35]} scale={[0.16, 0.55, 0.035]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#14b8a6" emissive="#14b8a6" emissiveIntensity={0.22} />
      </mesh>
      <mesh position={[0.04, 0.02, 0.36]} scale={[0.16, 0.82, 0.035]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#f5d36f" emissive="#f5d36f" emissiveIntensity={0.22} />
      </mesh>
      <mesh position={[0.38, -0.16, 0.36]} scale={[0.16, 0.42, 0.035]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#86efac" emissive="#86efac" emissiveIntensity={0.18} />
      </mesh>
    </group>
  );
}

function SaleTag() {
  return (
    <group position={[-1.75, 1.0, 0.18]} rotation={[0.22, -0.52, -0.18]}>
      <mesh scale={[0.72, 0.46, 0.08]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#f5d36f" emissive="#f5d36f" emissiveIntensity={0.22} metalness={0.2} roughness={0.22} />
      </mesh>
      <mesh position={[-0.3, 0.16, 0.07]}>
        <sphereGeometry args={[0.055, 16, 16]} />
        <meshStandardMaterial color="#08111f" />
      </mesh>
      <mesh position={[0.08, 0.05, 0.08]} rotation={[0, 0, -0.65]} scale={[0.08, 0.58, 0.035]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#08111f" />
      </mesh>
      <mesh position={[-0.15, -0.12, 0.08]}>
        <sphereGeometry args={[0.08, 20, 20]} />
        <meshStandardMaterial color="#08111f" />
      </mesh>
      <mesh position={[0.28, 0.17, 0.08]}>
        <sphereGeometry args={[0.08, 20, 20]} />
        <meshStandardMaterial color="#08111f" />
      </mesh>
    </group>
  );
}

function ProductParcel() {
  return (
    <group position={[1.58, 0.92, -0.08]} rotation={[0.15, 0.58, 0.18]}>
      <mesh scale={[0.62, 0.58, 0.58]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#c4b5fd" emissive="#7c3aed" emissiveIntensity={0.12} metalness={0.16} roughness={0.28} />
      </mesh>
      <mesh position={[0, 0.01, 0.31]} scale={[0.11, 0.6, 0.035]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#f8fafc" emissive="#e0e7ff" emissiveIntensity={0.12} />
      </mesh>
      <mesh position={[0, 0.31, 0]} scale={[0.12, 0.04, 0.62]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#f8fafc" emissive="#e0e7ff" emissiveIntensity={0.12} />
      </mesh>
    </group>
  );
}

function ComparisonBars() {
  const bars = [
    { x: -0.28, height: 0.42, color: "#f87171" },
    { x: 0, height: 0.68, color: "#f5d36f" },
    { x: 0.28, height: 0.98, color: "#5eead4" }
  ];

  return (
    <group position={[-1.42, -1.14, 0.12]} rotation={[-0.12, -0.2, 0.08]}>
      <mesh position={[0, -0.35, 0]} scale={[0.82, 0.06, 0.08]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#cbd5e1" emissive="#5eead4" emissiveIntensity={0.08} />
      </mesh>
      {bars.map((bar) => (
        <mesh key={bar.x} position={[bar.x, -0.35 + bar.height / 2, 0]} scale={[0.16, bar.height, 0.14]}>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color={bar.color} emissive={bar.color} emissiveIntensity={0.18} />
        </mesh>
      ))}
    </group>
  );
}

function DeliveryCart() {
  return (
    <group position={[1.36, -1.2, 0.08]} rotation={[0.08, -0.46, 0.02]}>
      <mesh position={[-0.16, 0.03, 0]} scale={[0.72, 0.28, 0.28]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#5eead4" emissive="#14b8a6" emissiveIntensity={0.18} roughness={0.22} />
      </mesh>
      <mesh position={[0.38, -0.02, 0]} scale={[0.3, 0.22, 0.28]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#bae6fd" emissive="#38bdf8" emissiveIntensity={0.14} roughness={0.22} />
      </mesh>
      <mesh position={[-0.36, -0.22, 0.16]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.09, 0.09, 0.06, 24]} />
        <meshStandardMaterial color="#08111f" />
      </mesh>
      <mesh position={[0.34, -0.22, 0.16]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.09, 0.09, 0.06, 24]} />
        <meshStandardMaterial color="#08111f" />
      </mesh>
    </group>
  );
}

function SceneCore({ targetRotation, isDragging }: SceneCoreProps) {
  const group = useRef<Group>(null);
  const orbit = useRef<Group>(null);

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

    if (orbit.current) {
      orbit.current.rotation.y = t * 0.22;
      orbit.current.rotation.z = Math.sin(t * 0.6) * 0.04;
    }
  });

  return (
    <group ref={group} rotation={[0.16, -0.38, 0]}>
      <ShoppingBag />
      <group ref={orbit}>
        <SaleTag />
        <ProductParcel />
        <ComparisonBars />
        <DeliveryCart />
        <mesh rotation={[1.1, 0.16, 0.05]}>
          <torusGeometry args={[1.86, 0.018, 12, 120]} />
          <meshStandardMaterial color="#99f6e4" emissive="#2dd4bf" emissiveIntensity={0.72} />
        </mesh>
        <mesh rotation={[1.42, -0.28, 0.88]}>
          <torusGeometry args={[2.12, 0.012, 12, 120]} />
          <meshStandardMaterial color="#f5d36f" emissive="#f5d36f" emissiveIntensity={0.48} />
        </mesh>
      </group>
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
