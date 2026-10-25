import React, { useState, useEffect, useRef, useMemo, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Environment, Float, Text, Html, ContactShadows, useGLTF, Sky, Decal, useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { Activity, Battery, Droplets, Gauge, Info, Power, Zap, ChevronRight, ChevronDown, ChevronUp, Settings, Box, Menu, X } from 'lucide-react';
import { createXRStore, XR, TeleportTarget, XROrigin, useXRControllerLocomotion, DefaultXRController } from '@react-three/xr';
import { COMPONENTS_DATA } from './constants';

// --- VR Custom Controller ---
const CustomController = (props: any) => {
  const handedness = props.inputSource?.handedness;
  const isLeft = handedness === 'left';
  
  return (
    <DefaultXRController
      {...props}
      // Mano izquierda: Teletransporte por defecto
      teleportPointer={{
        makeDefault: isLeft,
        rayModel: { color: '#00ff00' },
        cursorModel: { color: '#00ff00' }
      }}
      // Mano derecha: Interacción por defecto
      rayPointer={{
        makeDefault: !isLeft,
        rayModel: { color: '#0088ff' },
        cursorModel: { color: '#0088ff' }
      }}
    />
  );
};

const store = createXRStore({
  controller: CustomController,
  foveation: 0,
});

// --- Refueling Visuals ---
const RefuelingParticles = ({ isRefueling, type = "tank" }: { isRefueling: boolean, type?: "tank" | "port" | "vent" }) => {
  const points = useRef<THREE.Points>(null);
  const particleCount = type === "tank" ? 200 : (type === "vent" ? 120 : 100);
  
  // Create a circular texture for the bubbles
  const bubbleTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
      gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
      gradient.addColorStop(0.3, 'rgba(16, 185, 129, 0.8)');
      gradient.addColorStop(1, 'rgba(16, 185, 129, 0)');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(32, 32, 32, 0, Math.PI * 2);
      ctx.fill();
    }
    const texture = new THREE.CanvasTexture(canvas);
    return texture;
  }, []);

  const positions = useMemo(() => {
    const pos = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      if (type === "tank") {
        pos[i * 3] = (Math.random() - 0.5) * 0.8;
        pos[i * 3 + 1] = (Math.random() - 0.5) * 0.8;
        pos[i * 3 + 2] = (Math.random() - 0.5) * 2.0;
      } else if (type === "vent") {
        pos[i * 3] = (Math.random() - 0.5) * 0.1;
        pos[i * 3 + 1] = 0;
        pos[i * 3 + 2] = (Math.random() - 0.5) * 0.1;
      } else {
        // Port spray: start at center (local space of port mesh)
        pos[i * 3] = 0;
        pos[i * 3 + 1] = 0.03; // Start at the surface
        pos[i * 3 + 2] = 0;
      }
    }
    return pos;
  }, [type]);

  const velocities = useMemo(() => {
    const vels = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      if (type === "tank") {
        vels[i * 3] = (Math.random() - 0.5) * 0.02;
        vels[i * 3 + 1] = (Math.random() - 0.5) * 0.02;
        vels[i * 3 + 2] = (Math.random() - 0.5) * 0.02;
      } else if (type === "vent") {
        const angle = Math.random() * Math.PI * 2;
        const spread = 0.015;
        vels[i * 3] = Math.cos(angle) * spread;
        vels[i * 3 + 1] = 0.04 + Math.random() * 0.06; // Upwards
        vels[i * 3 + 2] = Math.sin(angle) * spread;
      } else {
        // Port spray: move INTO the car (positive local Y for the port cylinder)
        const angle = Math.random() * Math.PI * 2;
        const spread = 0.02;
        vels[i * 3] = Math.cos(angle) * spread;
        vels[i * 3 + 1] = 0.05 + Math.random() * 0.08; // Move into the car
        vels[i * 3 + 2] = Math.sin(angle) * spread;
      }
    }
    return vels;
  }, [type]);

  useFrame((state) => {
    if (!isRefueling || !points.current) return;
    const posAttr = points.current.geometry.attributes.position;
    
    for (let i = 0; i < particleCount; i++) {
      let x = posAttr.getX(i);
      let y = posAttr.getY(i);
      let z = posAttr.getZ(i);
      
      if (type === "tank") {
        // Move particles along the tank (Z-axis) and swirl
        z -= 0.04; 
        x += Math.sin(state.clock.elapsedTime * 4 + i) * 0.02;
        y += Math.cos(state.clock.elapsedTime * 4 + i) * 0.02;

        if (z < -1.1) {
          z = 1.1;
          x = (Math.random() - 0.5) * 0.4;
          y = (Math.random() - 0.5) * 0.4;
        }
      } else if (type === "vent") {
        x += velocities[i * 3];
        y += velocities[i * 3 + 1];
        z += velocities[i * 3 + 2];
        
        if (y > 1.5) {
          x = (Math.random() - 0.5) * 0.1;
          y = 0;
          z = (Math.random() - 0.5) * 0.1;
        }
      } else {
        // Port spray
        x += velocities[i * 3];
        y += velocities[i * 3 + 1];
        z += velocities[i * 3 + 2];

        if (y > 0.8) {
          x = 0; y = 0.01; z = 0;
        }
      }
      
      posAttr.setXYZ(i, x, y, z);
    }
    posAttr.needsUpdate = true;
  });

  if (!isRefueling) return null;

  return (
    <points ref={points}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={particleCount}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={type === "tank" ? 0.13 : (type === "vent" ? 0.12 : 0.08)}
        map={bubbleTexture}
        transparent
        opacity={0.7}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        sizeAttenuation
      />
    </points>
  );
};

// --- VR Info Panel ---
const VRInfoPanel = ({ carStatus, telemetry, isRunning, position, rotation }: any) => {
  return (
    <group position={position || [-4, 2.5, -2]} rotation={rotation || [0, Math.PI / 4, 0]}>
      {/* Background */}
      <mesh>
        <planeGeometry args={[2.5, 1.8]} />
        <meshStandardMaterial color="#0f172a" transparent opacity={0.85} metalness={0.8} roughness={0.2} />
      </mesh>
      <mesh position={[0, 0, -0.01]}>
        <planeGeometry args={[2.55, 1.85]} />
        <meshBasicMaterial color="#10b981" transparent opacity={0.2} />
      </mesh>

      {/* Title */}
      <Text position={[0, 0.7, 0.02]} fontSize={0.12} color="#10b981">
        SISTEMA DE HIDRÓGENO
      </Text>

      {/* Car Status */}
      <group position={[-1, 0.3, 0.02]}>
        <Text position={[0, 0.1, 0]} fontSize={0.08} color="#94a3b8" anchorX="left">
          Hyundai ix35 Status:
        </Text>
        <Text position={[0, -0.05, 0]} fontSize={0.15} color="white" anchorX="left">
          {carStatus.soc.toFixed(1)}% H2
        </Text>
        <Text position={[0, -0.2, 0]} fontSize={0.07} color={carStatus.isRefueling ? "#10b981" : "#94a3b8"} anchorX="left">
          {carStatus.isRefueling ? "CARGANDO (350 bar)" : carStatus.isConnected ? "CONECTADO" : "DESCONECTADO"}
        </Text>
      </group>

      {/* Plant Telemetry */}
      <group position={[-1, -0.3, 0.02]}>
        <Text position={[0, 0.1, 0]} fontSize={0.08} color="#94a3b8" anchorX="left">
          Telemetría Planta:
        </Text>
        <Text position={[0, -0.05, 0]} fontSize={0.12} color="white" anchorX="left">
          Presión: {telemetry.pressure.toFixed(1)} bar
        </Text>
        <Text position={[0, -0.2, 0]} fontSize={0.12} color="white" anchorX="left">
          Caudal: {telemetry.flow.toFixed(0)} NL/h
        </Text>
      </group>

      {/* System Status Indicator */}
      <mesh position={[0.9, 0.7, 0.02]}>
        <circleGeometry args={[0.05, 32]} />
        <meshBasicMaterial color={isRunning ? "#10b981" : "#ef4444"} />
      </mesh>
    </group>
  );
};

// --- Componentes 3D ---

const HyundaiIX35 = ({ position, rotation, isConnected, isRefueling, soc, onClick, onSelectComponent, selectedKey }: any) => {
  const { scene } = useGLTF('https://raw.githubusercontent.com/THEKITHENIS/IX35/main/hyundai_ix35_tucson_2011-v1.glb');
  
  const bodyOpacity = isConnected ? 0.2 : 1;
  const clonedScene = useMemo(() => scene.clone(), [scene]);

  useEffect(() => {
    clonedScene.traverse((child: any) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        if (child.material) {
          // Clonamos el material solo si es necesario para evitar fugas de memoria y mejorar rendimiento
          if (!child.userData.originalMaterial) {
            child.userData.originalMaterial = child.material.clone();
          }
          child.material = child.userData.originalMaterial.clone();
          child.material.transparent = true;
          child.material.opacity = bodyOpacity;
          child.material.depthWrite = !isConnected;
          const name = child.name.toLowerCase();
          if (name.includes('glass') || name.includes('window') || name.includes('cristal')) {
            child.material.opacity = isConnected ? 0.05 : 0.5;
          }
        }
      }
    });
  }, [clonedScene, isConnected, bodyOpacity]);

  const isCarSelected = selectedKey === 'car';

  return (
    <group 
      position={position || [0, 0, 0]} 
      rotation={rotation || [0, -Math.PI / 4, 0]} 
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      scale={isCarSelected ? 1.05 : 1}
    >
      {/* Floating Label when car is selected */}
      {isCarSelected && (
        <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
          <Text
            position={[0, 4.5, 0]}
            fontSize={0.3}
            color="#10b981"
            anchorX="center"
            anchorY="bottom"
          >
            HYUNDAI IX35 FCEV
          </Text>
        </Float>
      )}

      {/* --- MODELO REAL --- */}
      <primitive 
        object={clonedScene} 
        scale={0.025} 
        position={[0, -0.05, 0]} 
        rotation={[-Math.PI / 2, 0, Math.PI / 2]} 
      />

      {/* --- COMPONENTES INTERNOS --- */}
      <group visible={isConnected}>
        {/* 1. Stack Pila de Combustible (Más adelante y arriba) */}
        <mesh position={[3.2, 1.6, 0]} onClick={(e) => { e.stopPropagation(); onSelectComponent('car_stack'); }}>
          <boxGeometry args={[1.75, 0.875, 2.25]} />
          <meshStandardMaterial 
            color={selectedKey === 'car_stack' ? "#ffffff" : "#475569"} 
            emissive={selectedKey === 'car_stack' ? "#10b981" : "#000000"}
            emissiveIntensity={selectedKey === 'car_stack' ? 0.8 : 0}
            metalness={0.8} 
            roughness={0.2} 
          />
          {selectedKey === 'car_stack' && (
            <Text position={[0, 1.0, 0]} fontSize={0.2} color="#10b981" rotation={[0, Math.PI/2, 0]}>FUEL CELL STACK</Text>
          )}
        </mesh>

        {/* 2. Motor de Tracción (En el extremo frontal, más abajo) */}
        <mesh position={[4.4, 1.0, 0]} rotation={[Math.PI / 2, 0, 0]} onClick={(e) => { e.stopPropagation(); onSelectComponent('car_motor'); }}>
          <cylinderGeometry args={[0.5, 0.5, 1.25, 16]} />
          <meshStandardMaterial 
            color={selectedKey === 'car_motor' ? "#ffffff" : "#1e293b"} 
            emissive={selectedKey === 'car_motor' ? "#10b981" : "#000000"}
            emissiveIntensity={selectedKey === 'car_motor' ? 0.8 : 0}
            metalness={0.9} 
            roughness={0.1} 
          />
          {selectedKey === 'car_motor' && (
            <Text position={[0, 0.8, 0]} fontSize={0.2} color="#10b981" rotation={[-Math.PI/2, 0, Math.PI/2]}>MOTOR</Text>
          )}
        </mesh>

        {/* 3. Batería de Alto Voltaje (Bien ubicada en el centro) */}
        <mesh position={[0, 1.2, 0]} onClick={(e) => { e.stopPropagation(); onSelectComponent('car_battery'); }}>
          <boxGeometry args={[2.5, 0.3, 3.0]} />
          <meshStandardMaterial 
            color={selectedKey === 'car_battery' ? "#ffffff" : "#334155"} 
            emissive={selectedKey === 'car_battery' ? "#10b981" : "#000000"}
            emissiveIntensity={selectedKey === 'car_battery' ? 0.8 : 0}
            metalness={0.6} 
            roughness={0.4} 
          />
          {selectedKey === 'car_battery' && (
            <Text position={[0, 0.5, 0]} fontSize={0.2} color="#10b981" rotation={[-Math.PI/2, 0, Math.PI/2]}>BATERÍA HV</Text>
          )}
        </mesh>

        {/* 4. Tanques de Hidrógeno (Traseros / Maletero) */}
        <group position={[-3.6, 1.4, 0]} onClick={(e) => { e.stopPropagation(); onSelectComponent('car_tanks'); }}>
          {/* Tanque Grande (Atrás) */}
          <group position={[-0.6, 0, 0]}>
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.7, 0.7, 2.25, 32]} />
              <meshStandardMaterial 
                color={selectedKey === 'car_tanks' ? "#ffffff" : "#0ea5e9"} 
                transparent 
                opacity={selectedKey === 'car_tanks' ? 0.8 : 0.3} 
                emissive={selectedKey === 'car_tanks' ? "#10b981" : "#0ea5e9"} 
                emissiveIntensity={selectedKey === 'car_tanks' ? 1 : (isRefueling ? 0.8 : 0.2)} 
              />
            </mesh>
            <RefuelingParticles isRefueling={isRefueling} />
          </group>
          {/* Tanque Pequeño (Adelante) */}
          <group position={[0.6, 0, 0]}>
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.5, 0.5, 1.75, 32]} />
              <meshStandardMaterial 
                color={selectedKey === 'car_tanks' ? "#ffffff" : "#0ea5e9"} 
                transparent 
                opacity={selectedKey === 'car_tanks' ? 0.8 : 0.3} 
                emissive={selectedKey === 'car_tanks' ? "#10b981" : "#0ea5e9"} 
                emissiveIntensity={selectedKey === 'car_tanks' ? 1 : (isRefueling ? 0.8 : 0.2)} 
              />
            </mesh>
            <RefuelingParticles isRefueling={isRefueling} />
          </group>
          {selectedKey === 'car_tanks' && (
            <Text position={[0, 1.2, 0]} fontSize={0.2} color="#10b981" rotation={[-Math.PI/2, 0, Math.PI/2]}>TANQUES H2</Text>
          )}
        </group>

        {/* Refueling Port (Side - Adjusted to match nozzle position) */}
        <mesh position={[-2.2, 2.4, -2.8]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.12, 0.12, 0.05, 16]} />
          <meshStandardMaterial color="#334155" metalness={0.8} />
          {/* Inner port hole */}
          <mesh position={[0, 0.03, 0]}>
            <cylinderGeometry args={[0.06, 0.06, 0.01, 16]} />
            <meshStandardMaterial color="#000000" />
          </mesh>
          {/* Port Refueling Particles (Spray into the car) */}
          <RefuelingParticles isRefueling={isRefueling} type="port" />
        </mesh>

        {/* Cables de Alta Tensión (Ajustados para llegar al motor frontal) */}
        <mesh position={[2.2, 1.2, 0.2]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.05, 0.05, 4.5, 8]} />
          <meshStandardMaterial color="#f97316" emissive="#f97316" emissiveIntensity={0.5} />
        </mesh>
      </group>

      {/* Puerto de Carga */}
      <mesh position={[-1.2, 0.85, -0.96]}>
        <circleGeometry args={[0.08, 16]} />
        <meshBasicMaterial color={isConnected ? "#22c55e" : "#ef4444"} />
      </mesh>
      
      {/* Label only visible on click (handled by Dashboard) */}
      <Html position={[0, 2.6, 0]} center>
        <div className="flex flex-col items-center pointer-events-none">
          <div className="w-20 h-2 bg-slate-900/90 rounded-full mt-2 overflow-hidden border border-white/10 p-[1px] shadow-lg">
            <div className="h-full bg-emerald-500 rounded-full transition-all duration-500 shadow-[0_0_12px_rgba(16,185,129,0.6)]" style={{ width: `${soc}%` }} />
          </div>
        </div>
      </Html>
    </group>
  );
};

const CompressorModel = ({ position, rotation, onClick, isSelected }: any) => {
  const { scene } = useGLTF('https://raw.githubusercontent.com/THEKITHENIS/IX35/main/compresor.glb');
  const clonedScene = useMemo(() => scene.clone(), [scene]);

  const pulseScale = isSelected ? 1 + Math.sin(Date.now() * 0.005) * 0.02 : 1;

  return (
    <group 
      position={position || [0, 0, -4.5]} 
      rotation={rotation || [0, Math.PI, 0]}
      scale={isSelected ? 4.6 : 4.5}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
    >
      {/* Floating Label when selected */}
      {isSelected && (
        <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
          <Text
            position={[0, 1.25, 0]}
            fontSize={0.08}
            color="#10b981"
            anchorX="center"
            anchorY="bottom"
          >
            Compresor Aire Drive
          </Text>
        </Float>
      )}
      <primitive object={clonedScene} />
      {isSelected && (
        <mesh position={[0, 0.1, 0]}>
          <boxGeometry args={[0.5, 0.3, 0.5]} />
          <meshBasicMaterial color="#10b981" transparent opacity={0.1} />
        </mesh>
      )}
    </group>
  );
};

const Module = ({ position, color, label, onClick, isTransparent = false, type, isRunning = false, isSelected = false }: any) => {
  const [hovered, setHovered] = useState(false);
  const bubblesCount = 30;
  const bubbles = useMemo(() => Array.from({ length: bubblesCount }, () => ({
    x: (Math.random() - 0.5) * 2,
    y: (Math.random() - 0.5) * 0.6,
    z: (Math.random() - 0.5) * 2,
    speed: 0.2 + Math.random() * 0.3,
    scale: 0.5 + Math.random() * 0.5
  })), [bubblesCount]);
  
  const instancedMeshRef = useRef<THREE.InstancedMesh>(null);
  const tempObject = useMemo(() => new THREE.Object3D(), []);

  useFrame((state, delta) => {
    if (type === 'el' && isRunning && instancedMeshRef.current) {
      bubbles.forEach((b, i) => {
        b.y += delta * b.speed;
        if (b.y > 0.4) b.y = -0.4;
        
        tempObject.position.set(b.x, b.y, b.z);
        tempObject.scale.setScalar(b.scale);
        tempObject.updateMatrix();
        instancedMeshRef.current!.setMatrixAt(i, tempObject.matrix);
      });
      instancedMeshRef.current.instanceMatrix.needsUpdate = true;
    }
  });

  // Pulsing effect for selection
  const pulseScale = isSelected ? 1 + Math.sin(Date.now() * 0.005) * 0.02 : 1;
  
  return (
    <group 
      position={position} 
      onClick={(e) => { e.stopPropagation(); onClick(); }} 
      onPointerOver={() => setHovered(true)} 
      onPointerOut={() => setHovered(false)}
      scale={isSelected ? 1.02 : 1}
    >
      <mesh castShadow receiveShadow>
        <boxGeometry args={[2.4, 1.0, 2.4]} />
        <meshStandardMaterial 
          color={isSelected ? "#ffffff" : (hovered ? "#d1d5db" : "#bdc3c7")} 
          roughness={0.3} 
          metalness={0.2} 
          transparent={isTransparent || isSelected} 
          opacity={isSelected ? 0.8 : (isTransparent ? 0.4 : 1)}
          emissive={isSelected ? "#10b981" : "#000000"}
          emissiveIntensity={isSelected ? 0.5 : 0}
        />
      </mesh>
      
      {/* Selection Outline / Glow */}
      {isSelected && (
        <mesh scale={[1.05, 1.05, 1.05]}>
          <boxGeometry args={[2.4, 1.0, 2.4]} />
          <meshBasicMaterial color="#10b981" transparent opacity={0.2} side={THREE.BackSide} />
        </mesh>
      )}
      
      {/* Front Panel */}
      <mesh position={[0, 0, 1.21]}>
        <planeGeometry args={[2.3, 0.9]} />
        <meshStandardMaterial color="#ecf0f1" />
      </mesh>

      {/* Stripe */}
      <mesh position={[0, 0.35, 1.22]}>
        <planeGeometry args={[2.3, 0.15]} />
        <meshBasicMaterial color={color} />
      </mesh>

      {/* Label */}
      <Text position={[0, 0.35, 1.23]} fontSize={0.1} color="white" anchorX="center" anchorY="middle">
        {label}
      </Text>

      {/* Special Visuals */}
      {type === 'wtm' && (
        <mesh position={[0, -0.1, 0]}>
          <boxGeometry args={[2.2, 0.7, 2.2]} />
          <meshStandardMaterial color="#0066cc" transparent opacity={0.5} />
        </mesh>
      )}

      {type === 'el' && isRunning && (
        <instancedMesh ref={instancedMeshRef} args={[undefined, undefined, bubblesCount]}>
          <sphereGeometry args={[0.03, 8, 8]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.6} />
        </instancedMesh>
      )}
    </group>
  );
};

const Pipe = ({ points, color, particleColor, radius = 0.03, isRunning = false }: any) => {
  const curve = useMemo(() => new THREE.CatmullRomCurve3(points.map((p: any) => new THREE.Vector3(...p))), [points]);
  const pColor = particleColor || color;
  const particlesCount = 70; // Un poco más denso
  const particles = useMemo(() => Array.from({ length: particlesCount }, () => ({ 
    progress: Math.random(),
    offset: new THREE.Vector3(
      (Math.random() - 0.5) * radius * 2.2,
      (Math.random() - 0.5) * radius * 2.2,
      (Math.random() - 0.5) * radius * 2.2
    ),
    speed: 0.18 + Math.random() * 0.28,
    scale: 0.75 + Math.random() * 0.65
  })), [particlesCount, radius]);
  
  const instancedMeshRef = useRef<THREE.InstancedMesh>(null);
  const tempObject = useMemo(() => new THREE.Object3D(), []);

  useFrame((state, delta) => {
    if (!isRunning || !instancedMeshRef.current) return;
    
    particles.forEach((p, i) => {
      p.progress += delta * p.speed;
      if (p.progress > 1) p.progress = 0;
      
      const pos = curve.getPoint(p.progress);
      tempObject.position.copy(pos).add(p.offset);
      
      const pulse = 1.0 + Math.sin(state.clock.elapsedTime * 9 + i) * 0.35;
      tempObject.scale.setScalar(p.scale * pulse);
      tempObject.updateMatrix();
      
      instancedMeshRef.current!.setMatrixAt(i, tempObject.matrix);
    });
    
    instancedMeshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <group>
      <mesh castShadow>
        <tubeGeometry args={[curve, 64, radius, 16, false]} />
        <meshStandardMaterial 
          color={color} 
          roughness={0.1} 
          metalness={0.8} 
          transparent 
          opacity={0.45} 
        />
      </mesh>
      {isRunning && (
        <instancedMesh ref={instancedMeshRef} args={[undefined, undefined, particlesCount]}>
          <sphereGeometry args={[radius * 0.85, 8, 8]} />
          <meshBasicMaterial 
            color={pColor} 
            transparent 
            opacity={0.85} 
            blending={THREE.AdditiveBlending}
          />
        </instancedMesh>
      )}
    </group>
  );
};

// --- Componentes 3D ---
function InfoPanel3D({ selectedKey }: { selectedKey: string | null }) {
  if (!selectedKey) return null;
  const data = COMPONENTS_DATA[selectedKey as keyof typeof COMPONENTS_DATA];
  if (!data) return null;

  return (
    <group position={[-4.5, 2.8, -5]} scale={0.8} rotation={[0, Math.PI / 4, 0]}>
      {/* Main Glass Background */}
      <mesh>
        <planeGeometry args={[2.4, 3.2]} />
        <meshStandardMaterial 
          color="#0f172a" 
          transparent 
          opacity={0.9} 
          roughness={0.1}
          metalness={0.5}
        />
      </mesh>
      
      {/* Glowing Border */}
      <mesh position={[0, 0, -0.01]}>
        <planeGeometry args={[2.45, 3.25]} />
        <meshStandardMaterial 
          color="#38bdf8" 
          emissive="#38bdf8" 
          emissiveIntensity={0.5} 
        />
      </mesh>

      {/* Header Bar */}
      <mesh position={[0, 1.4, 0.01]}>
        <planeGeometry args={[2.4, 0.4]} />
        <meshBasicMaterial color="#38bdf8" />
      </mesh>
      <Text
        position={[0, 1.4, 0.02]}
        fontSize={0.1}
        color="#0f172a"
        anchorX="center"
        fontWeight="bold"
      >
        {data.name.toUpperCase()}
      </Text>

      {/* ID Label */}
      <Text
        position={[-1.1, 1.1, 0.02]}
        fontSize={0.05}
        color="#94a3b8"
        anchorX="left"
        fontWeight="bold"
      >
        SYSTEM ID: {data.id}
      </Text>

      {/* Specifications Section */}
      <group position={[0, 0.2, 0]}>
        {data.specs.map((spec, i) => {
          const parts = spec.split(':');
          const label = parts[0];
          const value = parts.slice(1).join(':').trim();
          
          return (
            <group key={i} position={[0, 0.6 - (i * 0.25), 0]}>
              {/* Label */}
              <Text
                position={[-1.1, 0.08, 0.02]}
                fontSize={0.06}
                color="#38bdf8"
                anchorX="left"
                fontWeight="bold"
              >
                {label.toUpperCase()}
              </Text>
              {/* Value */}
              <Text
                position={[-1.1, -0.02, 0.02]}
                fontSize={0.07}
                color="white"
                anchorX="left"
                maxWidth={2.2}
              >
                {value || label}
              </Text>
              {/* Divider */}
              {i < data.specs.length - 1 && (
                <mesh position={[0, -0.12, 0.01]}>
                  <planeGeometry args={[2.2, 0.005]} />
                  <meshBasicMaterial color="white" transparent opacity={0.1} />
                </mesh>
              )}
            </group>
          );
        })}
      </group>

      {/* Footer Status Bar */}
      <mesh position={[0, -1.4, 0.01]}>
        <planeGeometry args={[2.4, 0.4]} />
        <meshBasicMaterial color="#1e293b" />
      </mesh>
      <group position={[-1.1, -1.4, 0.02]}>
        <mesh position={[-0.05, 0, 0]}>
          <circleGeometry args={[0.04, 16]} />
          <meshBasicMaterial color={data.color} />
        </mesh>
        <Text
          position={[0.1, 0, 0]}
          fontSize={0.08}
          color="white"
          anchorX="left"
          fontWeight="bold"
        >
          STATUS: {data.status.toUpperCase()}
        </Text>
      </group>
    </group>
  );
}

function StartButton3D({ isRunning, onClick }: { isRunning: boolean, onClick: () => void }) {
  const [clicks, setClicks] = useState(0);
  const [rotation, setRotation] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const handleInteraction = (e: any) => {
    e.stopPropagation();
    // Girar 45 grados por click, como un dial (eje Y)
    setRotation(prev => prev + Math.PI / 4);
    
    if (timerRef.current) clearTimeout(timerRef.current);
    
    const newClicks = clicks + 1;
    if (newClicks >= 3) {
      onClick();
      setClicks(0);
    } else {
      setClicks(newClicks);
      timerRef.current = setTimeout(() => setClicks(0), 1500);
    }
  };

  return (
    <group position={[-4.5, 1.2, -4.5]} onClick={handleInteraction} scale={0.9} rotation={[0, Math.PI / 4, 0]}>
      {/* Base del botón */}
      <mesh position={[0, -0.06, 0]}>
        <cylinderGeometry args={[0.2, 0.2, 0.05, 32]} />
        <meshStandardMaterial color="#1e293b" />
      </mesh>

      {/* Dial giratorio */}
      <mesh castShadow rotation={[0, rotation, 0]}>
        <cylinderGeometry args={[0.15, 0.15, 0.1, 32]} />
        <meshStandardMaterial 
          color={isRunning ? "#10b981" : "#f59e0b"} 
          emissive={isRunning ? "#10b981" : "#f59e0b"} 
          emissiveIntensity={isRunning ? 0.5 : 0.2} 
        />
        {/* Marca indicadora (como una manecilla de reloj) */}
        <mesh position={[0, 0.06, 0.08]}>
          <boxGeometry args={[0.02, 0.02, 0.1]} />
          <meshBasicMaterial color="white" />
        </mesh>
      </mesh>

      <Text
        position={[0, 0.25, 0]}
        fontSize={0.06}
        color="white"
        anchorX="center"
      >
        {isRunning ? "STOP (3 CLICKS)" : "START (3 CLICKS)"}
      </Text>
      {clicks > 0 && (
        <Text position={[0, 0.4, 0]} fontSize={0.08} color="#38bdf8">
          {clicks}/3
        </Text>
      )}
    </group>
  );
}

const Rack = ({ position }: any) => (
  <group position={position || [0, 0, 0]}>
    {/* Vertical Posts */}
    {[[-1.4, 2.5, -1.4], [1.4, 2.5, -1.4], [-1.4, 2.5, 1.4], [1.4, 2.5, 1.4]].map((p: any, i) => (
      <mesh key={i} position={p} castShadow>
        <boxGeometry args={[0.12, 5.0, 0.12]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>
    ))}
    {/* Horizontal Frames */}
    {[0, 5.0].map((y, i) => (
      <mesh key={i} position={[0, y, 0]} castShadow>
        <boxGeometry args={[2.9, 0.1, 2.9]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>
    ))}
  </group>
);

// --- Nozzle Component (Stäubli TK17 Style) ---
const Nozzle = ({ isSelected, isConnected, onClick }: any) => {
  return (
    <group 
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      onPointerOver={() => (document.body.style.cursor = 'pointer')}
      onPointerOut={() => (document.body.style.cursor = 'auto')}
    >
      {/* Main Body - Stainless Steel look */}
      <mesh castShadow>
        <cylinderGeometry args={[0.04, 0.05, 0.35, 16]} />
        <meshStandardMaterial color="#cbd5e1" metalness={0.9} roughness={0.1} />
      </mesh>
      {/* Handle - Ergonomic black */}
      <mesh position={[0, -0.05, 0.12]} rotation={[Math.PI / 3, 0, 0]}>
        <boxGeometry args={[0.06, 0.22, 0.08]} />
        <meshStandardMaterial color="#0f172a" roughness={0.9} />
      </mesh>
      {/* Safety Lever (Red) */}
      <mesh position={[0, -0.12, 0.06]} rotation={[0.2, 0, 0]}>
        <boxGeometry args={[0.02, 0.12, 0.01]} />
        <meshStandardMaterial color="#ef4444" />
      </mesh>
      {/* Coupling Interface */}
      <mesh position={[0, 0.18, 0]}>
        <cylinderGeometry args={[0.035, 0.04, 0.08, 16]} />
        <meshStandardMaterial color="#94a3b8" metalness={1} />
      </mesh>
      
      {/* Selection Glow */}
      {isSelected && (
        <mesh scale={[1.8, 1.4, 2.5]}>
          <boxGeometry args={[0.1, 0.4, 0.2]} />
          <meshBasicMaterial color="#10b981" transparent opacity={0.2} />
        </mesh>
      )}
      
      {/* Invisible Hitbox for easier interaction */}
      <mesh visible={false}>
        <boxGeometry args={[0.4, 0.7, 0.5]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>
    </group>
  );
};

const Dispenser = ({ position, rotation, isRunning, onKeyClick, onSelectComponent, isSelected, isConnected }: any) => {
  const [keyClicks, setKeyClicks] = useState(0);
  const keyRef = useRef<any>(null);

  const handleKey = (e: any) => {
    e.stopPropagation();
    setKeyClicks(prev => {
      const next = prev + 1;
      if (next >= 3) {
        onKeyClick();
        return 0;
      }
      return next;
    });
    if (keyRef.current) keyRef.current.rotation.z += Math.PI / 4;
  };

  return (
    <group 
      position={position || [3.5, 0, 2.5]} 
      rotation={rotation || [0, -Math.PI / 6, 0]}
      scale={isSelected ? 1.02 : 1}
    >
      {/* Floating Label when selected */}
      {isSelected && (
        <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
          <Text
            position={[0, 4.5, 0]}
            fontSize={0.25}
            color="#10b981"
            anchorX="center"
            anchorY="bottom"
          >
            SURTIDOR H2
          </Text>
        </Float>
      )}

      {/* Cabinet - Lighter Gray */}
      <group onClick={(e) => { e.stopPropagation(); onSelectComponent('dispenser'); }}>
        <mesh position={[0, 1.9, 0]} castShadow>
          <boxGeometry args={[1.0, 3.8, 1.0]} />
          <meshStandardMaterial 
            color={isSelected ? "#f8fafc" : "#e2e8f0"} 
            metalness={0.4}
            roughness={0.3}
            emissive={isSelected ? "#10b981" : "#000000"}
            emissiveIntensity={isSelected ? 0.15 : 0}
          />
        </mesh>
      </group>
      
      {/* Selection Glow */}
      {isSelected && (
        <mesh position={[0, 1.9, 0]} scale={[1.1, 1.05, 1.1]}>
          <boxGeometry args={[1.0, 3.8, 1.0]} />
          <meshBasicMaterial color="#10b981" transparent opacity={0.15} side={THREE.BackSide} />
        </mesh>
      )}
      
      {/* Pistola (Nozzle) - Holster on the side */}
      {!isConnected && (
        <group position={[0.55, 2.1, 0]} rotation={[Math.PI, 0, 0]}>
          <Nozzle 
            isSelected={isSelected === 'nozzle'} 
            isConnected={false}
            onClick={() => onSelectComponent('nozzle')} 
          />
          {/* Holster socket */}
          <mesh position={[0, 0.15, 0]}>
            <boxGeometry args={[0.15, 0.1, 0.2]} />
            <meshStandardMaterial color="#475569" />
          </mesh>
        </group>
      )}

      {/* Buttons */}
      <mesh position={[-0.25, 2.9, 0.54]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.06, 0.06, 0.05, 16]} />
        <meshStandardMaterial color={isRunning ? "#22c55e" : "#166534"} emissive={isRunning ? "#22c55e" : "#000"} emissiveIntensity={isRunning ? 1 : 0} />
      </mesh>

      {/* Key Switch */}
      <group 
        position={[-0.25, 2.6, 0.54]} 
        onClick={handleKey}
        onPointerOver={() => (document.body.style.cursor = 'pointer')}
        onPointerOut={() => (document.body.style.cursor = 'auto')}
      >
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.06, 0.06, 0.02, 16]} />
          <meshStandardMaterial color="#111" />
        </mesh>
        <mesh ref={keyRef} position={[0, 0, 0.02]}>
          <boxGeometry args={[0.02, 0.08, 0.04]} />
          <meshStandardMaterial color="#f59e0b" />
        </mesh>
      </group>
    </group>
  );
};

// --- Logos Overlay Component (2D) ---
const LogosOverlay = () => {
  const h2LogoUrl = "https://lh3.googleusercontent.com/d/1sB2_iNJfF1ODdFmqoSGofr4fA7OLWWzJ";
  const logo1Url = "https://lh3.googleusercontent.com/d/1pjpkZs7zecN4ph4fSIIcSh7G9dHEDlUC";
  const logo2Url = "https://lh3.googleusercontent.com/d/1aUXW26UXmKGnr6_LMsBbXeENAoKSZB7K";
  const logo3Url = "https://lh3.googleusercontent.com/d/1MXDFyqPXB2nX0Znr6oR8klBBhsnTF_cX";
  const logo4Url = "https://lh3.googleusercontent.com/d/1OebgQaNJCWnEqDEfXPEK-VNUDCbAnZ3k";
  const logo5Url = "https://lh3.googleusercontent.com/d/1sB2_iNJfF1ODdFmqoSGofr4fA7OLWWzJ";

  return (
    <div className="fixed bottom-0 left-0 w-full p-4 md:p-6 z-[40] pointer-events-none flex flex-row items-end justify-between gap-2 md:gap-4">
      {/* Left side: Institutional Logos (Collaborators) */}
      <div className="flex items-center gap-2 md:gap-6 bg-white/80 backdrop-blur-md p-2 md:p-3 px-3 md:px-5 rounded-xl md:rounded-2xl border border-white/20 pointer-events-auto shadow-lg overflow-x-auto max-w-[70%]">
        <img src={logo1Url} alt="Mendizabala" className="h-5 md:h-9 w-auto object-contain shrink-0" referrerPolicy="no-referrer" />
        <img src={logo2Url} alt="Don Bosco" className="h-5 md:h-9 w-auto object-contain shrink-0" referrerPolicy="no-referrer" />
        <img src={logo3Url} alt="Fidegas" className="h-5 md:h-9 w-auto object-contain shrink-0" referrerPolicy="no-referrer" />
        <img src={logo4Url} alt="Centro Numero Uno" className="h-5 md:h-9 w-auto object-contain shrink-0" referrerPolicy="no-referrer" />
        <img src={logo5Url} alt="H2 Partner" className="h-5 md:h-9 w-auto object-contain shrink-0" referrerPolicy="no-referrer" />
      </div>

      {/* Right side: H2 Logo & Project Name */}
      <div className="flex items-center gap-2 md:gap-3 bg-slate-900/40 backdrop-blur-sm p-2 md:p-3 px-3 md:px-4 rounded-xl md:rounded-2xl border border-white/5 pointer-events-auto shrink-0">
        <img src={h2LogoUrl} alt="H2 Logo" className="h-5 md:h-8 w-auto object-contain" referrerPolicy="no-referrer" />
        <span className="text-[10px] md:text-sm text-white font-bold tracking-tight whitespace-nowrap">PORTABLEgreenH2FP</span>
      </div>
    </div>
  );
};

// --- UI Components ---

const Dashboard = ({ isRunning, selectedComponent, carStatus, telemetry, onDeselect, isOpen, onToggle, onEnterVR }: any) => {
  const [openSections, setOpenSections] = useState({
    status: true,
    car: true,
    telemetry: true
  });

  // En móviles, cerramos algunas secciones por defecto para ahorrar espacio
  useEffect(() => {
    if (window.innerWidth < 768) {
      setOpenSections({
        status: true,
        car: false,
        telemetry: false
      });
    }
  }, []);

  const toggleSection = (section: keyof typeof openSections) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  return (
    <div className={`fixed top-0 right-0 h-full w-full md:w-80 p-4 md:p-6 flex flex-col gap-3 md:gap-4 z-[60] pointer-events-none transition-transform duration-300 ${isOpen ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}`}>
      {/* Mobile Header with Close Button */}
      <div className="md:hidden flex justify-between items-center pointer-events-auto bg-slate-900/90 backdrop-blur-md p-3 rounded-2xl border border-white/10 mb-2">
        <h2 className="text-sm font-bold text-white">PANEL DE CONTROL</h2>
        <button onClick={onToggle} className="p-1.5 bg-white/10 rounded-lg text-white">
          <X size={20} />
        </button>
      </div>

      <div className="flex flex-col gap-3 md:gap-4 overflow-y-auto custom-scrollbar flex-1 pb-20 md:pb-0">
        {/* System Status */}
        <div className="glass-panel p-3 md:p-4 rounded-2xl pointer-events-auto">
          <div 
            className="flex items-center justify-between cursor-pointer group"
            onClick={() => toggleSection('status')}
          >
            <div className="flex items-center gap-2">
              <h2 className="text-[10px] font-mono uppercase tracking-widest text-white">Estado Planta</h2>
              {!openSections.status && (
                <span className={`text-[10px] font-bold ${isRunning ? 'text-emerald-400' : 'text-rose-400'}`}>
                  • {isRunning ? 'RUNNING' : 'STANDBY'}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isRunning ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
              {openSections.status ? <ChevronUp size={14} className="text-slate-300" /> : <ChevronDown size={14} className="text-slate-300" />}
            </div>
          </div>
          
          {openSections.status && (
            <div className="mt-2 flex items-end gap-2 animate-in fade-in slide-in-from-top-1 duration-300">
              <span className={`text-2xl font-bold ${isRunning ? 'text-emerald-400' : 'text-rose-400'}`}>
                {isRunning ? 'RUNNING' : 'STANDBY'}
              </span>
            </div>
          )}
        </div>

        {/* Car Status */}
        <div className={`glass-panel p-3 md:p-4 rounded-2xl pointer-events-auto border-emerald-500/30 transition-all ${!openSections.car ? 'opacity-90' : ''}`}>
          <div 
            className="flex items-center justify-between cursor-pointer group"
            onClick={() => toggleSection('car')}
          >
            <div className="flex items-center gap-2">
              <h2 className="text-[10px] font-mono uppercase tracking-widest text-emerald-300">Hyundai ix35 Status</h2>
              {!openSections.car && (
                <span className="text-[10px] font-bold text-emerald-400">
                  • {carStatus.soc.toFixed(0)}%
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Battery size={14} className={carStatus.isRefueling ? 'text-emerald-400 animate-bounce' : 'text-slate-300'} />
              {openSections.car ? <ChevronUp size={14} className="text-slate-300" /> : <ChevronDown size={14} className="text-slate-300" />}
            </div>
          </div>
          
          {openSections.car && (
            <div className="mt-3 animate-in fade-in slide-in-from-top-1 duration-300">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <p className="text-[9px] text-slate-300 uppercase font-bold">Nivel Tanque</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-xl font-mono font-bold text-white">{carStatus.soc.toFixed(1)}</span>
                    <span className="text-[10px] text-slate-400">%</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-[9px] text-slate-300 uppercase font-bold">H2 Cargado</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-xl font-mono font-bold text-white">{carStatus.kgDelivered.toFixed(3)}</span>
                    <span className="text-[10px] text-slate-400">kg</span>
                  </div>
                </div>
              </div>

              <div className="mt-3 w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-emerald-500 transition-all duration-1000" 
                  style={{ width: `${(carStatus.soc / 58.3) * 100}%` }}
                />
              </div>
              
              <p className="mt-2 text-[9px] text-center text-slate-200 italic font-medium">
                {carStatus.isConnected ? (carStatus.isRefueling ? 'Cargando a 350 bar...' : (carStatus.soc >= 58.3 ? 'Carga Máxima (Límite 350 bar)' : 'Conectado - Esperando Planta')) : 'Vehículo no detectado'}
              </p>
              {carStatus.soc >= 58.3 && (
                <p className="text-[8px] text-amber-400 text-center mt-1 font-bold">
                  * Límite físico alcanzado: Planta 350 bar vs Coche 600 bar
                </p>
              )}
            </div>
          )}
        </div>

        {/* Telemetry */}
        <div className={`glass-panel p-3 md:p-4 rounded-2xl pointer-events-auto flex flex-col gap-3 overflow-hidden transition-all ${openSections.telemetry ? 'flex-1' : ''}`}>
          <div 
            className="flex items-center justify-between cursor-pointer group"
            onClick={() => toggleSection('telemetry')}
          >
            <div className="flex items-center gap-2">
              <h2 className="text-[10px] font-mono uppercase tracking-widest text-white">Telemetría Planta</h2>
              {!openSections.telemetry && (
                <span className="text-[10px] font-bold text-slate-300">
                  • {telemetry.pressure.toFixed(1)} bar
                </span>
              )}
            </div>
            {openSections.telemetry ? <ChevronUp size={14} className="text-slate-300" /> : <ChevronDown size={14} className="text-slate-300" />}
          </div>
          
          {openSections.telemetry && (
            <div className="flex-1 flex flex-col gap-3 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-300">
              <div className="space-y-3 overflow-y-auto pr-1 custom-scrollbar">
                <div className="p-2.5 bg-white/5 rounded-xl border border-white/5">
                  <div className="flex items-center gap-2 text-slate-200 mb-0.5">
                    <Gauge size={12} />
                    <span className="text-[9px] uppercase font-bold">Presión Salida</span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-xl font-mono font-bold text-white">{telemetry.pressure.toFixed(1)}</span>
                    <span className="text-[10px] text-slate-400">bar</span>
                  </div>
                </div>

                <div className="p-2.5 bg-white/5 rounded-xl border border-white/5">
                  <div className="flex items-center gap-2 text-slate-200 mb-0.5">
                    <Activity size={12} />
                    <span className="text-[9px] uppercase font-bold">Caudal Producción</span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-xl font-mono font-bold text-white">{telemetry.flow.toFixed(0)}</span>
                    <span className="text-[10px] text-slate-400">NL/h</span>
                  </div>
                </div>

                {/* Info Adicional Electrolinera */}
                <div className="p-2.5 bg-emerald-500/5 rounded-xl border border-emerald-500/10">
                  <p className="text-[8px] text-emerald-300 uppercase font-bold mb-1">Info Hidrolinera</p>
                  <div className="grid grid-cols-1 gap-1 text-[9px] text-slate-200">
                    <p>• Línea Venteo: <span className="text-amber-400 font-bold">Activa (Seguridad)</span></p>
                    <p>• Aire Drive: <span className="text-slate-300">8.2 bar (Neumática)</span></p>
                    <p>• Pistola: <span className="text-white font-bold">WEH TK17 (NGV1)</span></p>
                  </div>
                </div>
              </div>

              {/* Component Info */}
              {selectedComponent && (
                <div className="mt-auto pt-3 border-t border-white/10 relative">
                  <button 
                    onClick={onDeselect}
                    className="absolute top-3 right-0 text-slate-300 hover:text-white transition-colors pointer-events-auto"
                  >
                    <Settings size={12} />
                  </button>
                  <h3 className="text-xs font-bold text-white mb-0.5 pr-4">{selectedComponent.name}</h3>
                  <p className="text-[9px] font-mono text-slate-400 mb-2">{selectedComponent.id}</p>
                  <ul className="space-y-1 max-h-32 overflow-y-auto pr-1 custom-scrollbar">
                    {selectedComponent.specs.map((spec: string, i: number) => (
                      <li key={i} className="text-[10px] text-slate-200 flex items-start gap-1.5 leading-tight">
                        <ChevronRight size={8} className="text-emerald-500 mt-0.5 shrink-0" />
                        <span>{spec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* VR Button for Pico 4 - Inside Dashboard on Mobile */}
        <div className="md:hidden mt-2 pointer-events-auto">
          <button 
            onClick={onEnterVR}
            className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-2xl shadow-lg transition-all flex items-center justify-center gap-3 group active:scale-95"
          >
            <Box size={20} className="group-hover:scale-110 transition-transform" />
            MODO VR (PICO 4)
          </button>
        </div>
      </div>
    </div>
  );
};

const Overlay = ({ isRunning, onKeyClick, onToggleDashboard }: any) => (
  <div className="fixed top-0 left-0 p-4 md:p-8 z-50 pointer-events-none w-full flex justify-between items-start">
    <div className="flex flex-col gap-0.5 md:gap-1">
      <h1 className="text-xl md:text-4xl font-bold tracking-tighter text-white drop-shadow-lg">PORTABLEgreenH2FP</h1>
      <p className="text-slate-300 text-[10px] md:text-sm font-semibold">Digital Twin HD • Educational Edition</p>
      
      <div className="mt-6 md:mt-12 flex flex-col gap-4">
        <div 
          className="flex items-center gap-3 text-slate-200 pointer-events-auto cursor-pointer group"
          onClick={onKeyClick}
        >
          <div className={`w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center border transition-all duration-500 ${isRunning ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400 status-glow-green' : 'bg-slate-800 border-white/10 text-slate-400'}`}>
            <Power size={16} className={isRunning ? 'animate-pulse' : ''} />
          </div>
          <div className="text-[10px] md:text-xs">
            <p className="font-bold text-white group-hover:text-emerald-400 transition-colors">Control Maestro</p>
            <p className="opacity-80 text-slate-300 hidden md:block">Haz clic aquí o 3 veces en la llave</p>
          </div>
        </div>
      </div>
    </div>

    <div className="flex flex-col items-end gap-3 pointer-events-auto">
      {/* Mobile Menu Toggle */}
      <button 
        onClick={onToggleDashboard}
        className="md:hidden p-2.5 bg-slate-900/90 backdrop-blur-md rounded-xl border border-white/10 text-white shadow-xl active:scale-95 transition-transform"
      >
        <Menu size={24} />
      </button>

      {/* Branding Logos */}
      <div className="hidden md:flex items-center gap-4 bg-white/5 backdrop-blur-md p-3 rounded-2xl border border-white/10">
        <div className="text-right">
          <p className="text-[10px] font-bold text-white leading-none">MENDIZABALA</p>
          <p className="text-[8px] text-slate-300">Vitoria-Gasteiz</p>
        </div>
        <div className="h-6 w-[1px] bg-white/10" />
        <div className="text-left">
          <p className="text-[10px] font-bold text-emerald-400 leading-none">TKNIKA</p>
          <p className="text-[8px] text-slate-300">Investigación FP</p>
        </div>
      </div>
    </div>
  </div>
);

// --- Main App ---

const LoadingScreen = () => (
  <Html center>
    <div style={{ 
      color: '#38bdf8', 
      background: 'rgba(15, 23, 42, 0.9)', 
      padding: '20px 40px', 
      borderRadius: '12px',
      border: '2px solid #38bdf8',
      fontFamily: 'sans-serif',
      textAlign: 'center'
    }}>
      <h2 style={{ margin: '0 0 10px 0' }}>CARGANDO GEMELO DIGITAL</h2>
      <div style={{ fontSize: '12px', opacity: 0.8 }}>Iniciando sistemas de hidrógeno...</div>
    </div>
  </Html>
);

// --- VR Controls Manager ---
const VRControls = ({ originRef }: { originRef: React.RefObject<THREE.Group | null> }) => {
  useXRControllerLocomotion(originRef);
  return null;
};

export default function App() {
  const [isRunning, setIsRunning] = useState(false);
  const [isVenting, setIsVenting] = useState(false);
  const prevIsRunning = useRef(isRunning);
  const [telemetry, setTelemetry] = useState({ pressure: 0, temp: 20, flow: 0 });

  useEffect(() => {
    if (prevIsRunning.current && !isRunning) {
      // Plant just stopped, start venting
      setIsVenting(true);
      const timer = setTimeout(() => setIsVenting(false), 4000); // Vent for 4 seconds
      return () => clearTimeout(timer);
    }
    prevIsRunning.current = isRunning;
  }, [isRunning]);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [isDashboardOpen, setIsDashboardOpen] = useState(false);
  const originRef = useRef<THREE.Group>(null);
  
  const handleTeleport = (point: THREE.Vector3) => {
    if (originRef.current) {
      // Move the player origin to the teleport point in world space
      originRef.current.position.set(point.x, 0, point.z);
    }
  };

  // Enable joystick locomotion as well
  // useXRControllerLocomotion(originRef);
  
  // Car State
  const [carStatus, setCarStatus] = useState({
    isConnected: false,
    isRefueling: false,
    soc: 15.0, // Start at 15%
    kgDelivered: 0.0,
  });

  const toggleConnection = () => {
    setCarStatus(prev => ({
      ...prev,
      isConnected: !prev.isConnected,
      isRefueling: false
    }));
    if (!carStatus.isConnected) {
      setSelectedKey('nozzle');
    } else {
      setSelectedKey(null);
    }
  };

  const selectedComponent = selectedKey ? COMPONENTS_DATA[selectedKey] : null;

  // Telemetry Simulation
  useEffect(() => {
    let interval: any;
    if (isRunning) {
      interval = window.setInterval(() => {
        setTelemetry({
          pressure: 35 + Math.random() * 0.5,
          temp: 45 + Math.random() * 2,
          flow: 480 + Math.random() * 20
        });
      }, 1000);
    } else {
      setTelemetry({ pressure: 0, temp: 20, flow: 0 });
    }
    return () => {
      if (interval) window.clearInterval(interval);
    };
  }, [isRunning]);

  // Refueling Logic
  useEffect(() => {
    let interval: any;
    // Physical Limit: 350 bar (Plant) / 600 bar (Car) = 58.3% max charge
    const MAX_SOC = 58.3;

    if (isRunning && carStatus.isConnected && carStatus.soc < MAX_SOC) {
      setCarStatus(prev => ({ ...prev, isRefueling: true }));
      interval = window.setInterval(() => {
        setCarStatus(prev => {
          if (prev.soc >= MAX_SOC) {
            window.clearInterval(interval);
            return { ...prev, soc: MAX_SOC, isRefueling: false };
          }
          // Hyundai ix35 tank is ~5.6kg. 
          // Refueling speed simulation: 0.05% per tick
          const addedSoc = 0.1; 
          const addedKg = (addedSoc / 100) * 5.6;
          return {
            ...prev,
            soc: Math.min(MAX_SOC, prev.soc + addedSoc),
            kgDelivered: prev.kgDelivered + (prev.soc < MAX_SOC ? addedKg : 0)
          };
        });
      }, 500);
    } else {
      setCarStatus(prev => ({ ...prev, isRefueling: false }));
    }
    return () => {
      if (interval) window.clearInterval(interval);
    };
  }, [isRunning, carStatus.isConnected]);

  const toggleCarConnection = () => {
    setCarStatus(prev => ({
      ...prev,
      isConnected: !prev.isConnected,
      // Reset if disconnecting
      kgDelivered: !prev.isConnected ? prev.kgDelivered : 0,
    }));
  };

  return (
    <div className="w-full h-screen bg-slate-950">
      <Overlay 
        isRunning={isRunning} 
        onKeyClick={() => setIsRunning(!isRunning)} 
        onToggleDashboard={() => setIsDashboardOpen(!isDashboardOpen)}
      />
      <Dashboard 
        isRunning={isRunning} 
        selectedComponent={selectedComponent} 
        carStatus={carStatus}
        telemetry={telemetry}
        onDeselect={() => setSelectedKey(null)}
        isOpen={isDashboardOpen}
        onToggle={() => setIsDashboardOpen(!isDashboardOpen)}
        onEnterVR={() => store.enterVR()}
      />

      <LogosOverlay />

      {/* VR Button for Pico 4 - Hidden on mobile (moved to dashboard) */}
      <div className="hidden md:block fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
        <button 
          onClick={() => store.enterVR()}
          className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-full shadow-[0_0_20px_rgba(16,185,129,0.4)] transition-all flex items-center gap-2 group"
        >
          <Box size={20} className="group-hover:scale-110 transition-transform" />
          MODO VR (PICO 4)
        </button>
      </div>

      <Canvas 
        shadows 
        dpr={[1, 2]}
        gl={{ 
          antialias: true, 
          alpha: true,
          powerPreference: "high-performance",
          preserveDrawingBuffer: true
        }}
      >
        <color attach="background" args={['#87ceeb']} />
        <PerspectiveCamera makeDefault position={[6, 4, 6]} fov={45} />
        <OrbitControls enableDamping target={[0, 1, -3]} />
        <XR store={store}>
          <XROrigin ref={originRef} />
          <VRControls originRef={originRef} />
          <TeleportTarget onTeleport={handleTeleport}>
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]} receiveShadow>
              <planeGeometry args={[500, 500]} />
              <meshStandardMaterial color="#ffffff" />
            </mesh>
          </TeleportTarget>
          <gridHelper args={[100, 100, "#cccccc", "#eeeeee"]} position={[0, -0.04, 0]} />
          
          <ambientLight intensity={1.0} />
          <pointLight position={[0, 10, 0]} intensity={2} />
          <directionalLight position={[10, 20, 10]} intensity={1.5} castShadow />

          <group position={[0, 0, 0]} scale={0.5}> {/* Escala reducida para realismo en VR */}
            {/* UI INMERSIVA */}
            <InfoPanel3D selectedKey={selectedKey} />
            <StartButton3D isRunning={isRunning} onClick={() => setIsRunning(!isRunning)} />

            {/* PLANTA PRINCIPAL (RACK) */}
            <group position={[0, 0, -8]}>
              {/* Collision box to prevent teleporting inside the rack */}
              <mesh position={[0, 3, 0]} visible={false}>
                <boxGeometry args={[4, 7, 2]} />
                <meshBasicMaterial transparent opacity={0} side={THREE.FrontSide} />
              </mesh>
              <Rack position={[0, 0, 0]} />
              <Module position={[0, 0.8, 0]} color="#0066ff" label="WTM" type="wtm" isTransparent isRunning={isRunning} onClick={() => setSelectedKey('wtm')} isSelected={selectedKey === 'wtm'} />
              <Module position={[0, 2.0, 0]} color="#00cc44" label="EL" type="el" isRunning={isRunning} onClick={() => setSelectedKey('el')} isSelected={selectedKey === 'el'} />
              <Module position={[0, 3.2, 0]} color="#999999" label="DRY" type="dry" isRunning={isRunning} onClick={() => setSelectedKey('dry')} isSelected={selectedKey === 'dry'} />
              
              {/* Booster & PLC */}
              <group position={[0, 4.4, 0]} onClick={(e) => { e.stopPropagation(); setSelectedKey('booster'); }}>
                <mesh>
                  <boxGeometry args={[0.8, 0.6, 0.5]} />
                  <meshStandardMaterial 
                    color={selectedKey === 'booster' ? "#ffffff" : "#b87333"} 
                    emissive={selectedKey === 'booster' ? "#10b981" : "#000000"}
                    emissiveIntensity={selectedKey === 'booster' ? 0.5 : 0}
                  />
                </mesh>
                {selectedKey === 'booster' && (
                  <Text position={[0, 0.4, 0]} fontSize={0.12} color="#10b981">BOOSTER H2</Text>
                )}
              </group>

              <group position={[0, 5.5, 0.5]} onClick={(e) => { e.stopPropagation(); setSelectedKey('plc'); }}>
                <mesh>
                  <boxGeometry args={[1.8, 1.0, 0.6]} />
                  <meshStandardMaterial 
                    color={selectedKey === 'plc' ? "#ffffff" : "#ffffff"} 
                    emissive={selectedKey === 'plc' ? "#10b981" : "#000000"}
                    emissiveIntensity={selectedKey === 'plc' ? 0.5 : 0}
                  />
                </mesh>
                {selectedKey === 'plc' && (
                  <Text position={[0, 0.8, 0]} fontSize={0.15} color="#10b981">PLC CONTROL</Text>
                )}
              </group>

              {/* LÍNEA DE VENTEO (VENT STACK) */}
              <group position={[0, 6, -1]} onClick={(e) => { e.stopPropagation(); setSelectedKey('vent'); }}>
                <mesh castShadow>
                  <cylinderGeometry args={[0.05, 0.05, 2.5, 16]} />
                  <meshStandardMaterial 
                    color={selectedKey === 'vent' ? "#ffffff" : "#fbbf24"} 
                    emissive={selectedKey === 'vent' ? "#10b981" : "#000000"}
                    emissiveIntensity={selectedKey === 'vent' ? 0.5 : 0}
                    metalness={0.8} 
                    roughness={0.2} 
                  />
                </mesh>
                <mesh position={[0, 1.2, 0]}>
                  <cylinderGeometry args={[0.08, 0.05, 0.2, 16]} />
                  <meshStandardMaterial color={selectedKey === 'vent' ? "#10b981" : "#fbbf24"} />
                  {/* Vent Particles (Only when plant stops) */}
                  <RefuelingParticles isRefueling={isVenting} type="vent" />
                </mesh>
                <Text position={[0, 1.5, 0]} fontSize={0.15} color={selectedKey === 'vent' ? "#10b981" : "#fbbf24"}>VENT STACK</Text>
              </group>

              {/* TUBERÍAS INTERNAS */}
              <Pipe isRunning={isRunning} color="#0066ff" points={[[0.5, 1.2, 0.2], [0.8, 1.2, 0.4], [0.8, 2.0, 0.4], [0.5, 2.0, 0.2]]} />
              <Pipe isRunning={isRunning} color="#22c55e" points={[[-0.5, 2.4, 0.2], [-0.8, 2.4, 0.4], [-0.8, 3.2, 0.4], [-0.5, 3.2, 0.2]]} />
              <Pipe isRunning={isRunning} color="#22c55e" points={[[0.5, 3.7, 0.2], [0.5, 3.9, 0.2], [0.2, 3.9, 0], [0.2, 4.1, 0]]} />
            </group>

            {/* COMPRESOR */}
            <Suspense fallback={null}>
              <group position={[-6, 0, -8]}>
                {/* Collision box for compressor */}
                <mesh position={[0, 1.5, 0]} visible={false}>
                  <boxGeometry args={[3, 3, 3]} />
                  <meshBasicMaterial transparent opacity={0} side={THREE.FrontSide} />
                </mesh>
                <CompressorModel position={[0, 0, 0]} rotation={[0, Math.PI / 2, 0]} onClick={() => setSelectedKey('comp')} isSelected={selectedKey === 'comp'} />
              </group>
            </Suspense>

            {/* DISPENSADOR */}
            <Dispenser 
              position={[5, 0, -4]} 
              rotation={[0, -Math.PI / 4, 0]} 
              isRunning={isRunning} 
              onKeyClick={() => setIsRunning(!isRunning)} 
              onSelectComponent={setSelectedKey} 
              isSelected={selectedKey === 'dispenser' || selectedKey === 'nozzle'}
              isConnected={carStatus.isConnected}
            />
            
            {/* COCHE Y REPOSTAJE */}
            <Suspense fallback={<group position={[14, 0, -1]}><mesh><boxGeometry args={[4, 1.5, 2]} /><meshStandardMaterial color="#334155" wireframe /></mesh></group>}>
              <group position={[14, 0, -1]}>
                {/* Collision box to prevent teleporting inside the car */}
                <mesh position={[0, 0.75, 0]} visible={false}>
                  <boxGeometry args={[4.5, 1.6, 2.2]} />
                  <meshBasicMaterial transparent opacity={0} side={THREE.FrontSide} />
                </mesh>
                <HyundaiIX35 
                  position={[0, 0, 0]}
                  rotation={[0, -Math.PI / 2, 0]}
                  isConnected={carStatus.isConnected} 
                  isRefueling={carStatus.isRefueling}
                  soc={carStatus.soc} 
                  onClick={toggleCarConnection} 
                  onSelectComponent={setSelectedKey}
                  selectedKey={selectedKey}
                />

                {/* Pantalla de Telemetría sobre el coche en VR */}
                <VRInfoPanel 
                  carStatus={carStatus} 
                  telemetry={telemetry} 
                  isRunning={isRunning} 
                  position={[0, 5, 0]} 
                  rotation={[0, 0, 0]} 
                />

                {/* Nozzle connected to car port (Rear Right Side - Hydrogen Tanks) */}
                {carStatus.isConnected && (
                  <group position={[-2.2, 2.4, -2.8]} rotation={[0, 0, Math.PI / 2]}>
                    <Nozzle 
                      isSelected={selectedKey === 'nozzle'} 
                      isConnected={true}
                      onClick={() => setSelectedKey('nozzle')}
                    />
                  </group>
                )}
              </group>
            </Suspense>

            {/* TUBERÍAS EXTERNAS Y ANIMACIONES */}
            <Pipe isRunning={isRunning} color="#94a3b8" radius={0.03} points={[[-6, 1.5, -8], [-6, 4.4, -8], [-0.3, 4.4, -8]]} />
            <Pipe isRunning={isRunning} color="#22c55e" radius={0.04} points={[[0.3, 4.4, -8], [5, 4.4, -8], [5, 2.4, -4]]} />

            {/* MANGUERA DE ALTA PRESIÓN (DINÁMICA) */}
            {carStatus.isConnected ? (
              <Pipe 
                isRunning={carStatus.isRefueling} 
                color="#1a1a1a" 
                particleColor="#22c55e"
                radius={0.04}
                points={[
                  [5.35, 2.2, -3.65],   // Salida lateral del dispensador
                  [6.0, 1.2, -3.7],     // Curva de caída
                  [8.0, 0.25, -4.0],    // Por el suelo
                  [11.0, 0.25, -4.0],   // Recorrido por el suelo
                  [11.6, 1.2, -3.8],    // Sube hacia el coche
                  [11.8, 2.4, -3.8]     // Conexión exacta (X=14-2.2, Z=-1-2.8)
                ]} 
              />
            ) : (
              <Pipe 
                isRunning={false} 
                color="#1a1a1a" 
                radius={0.04}
                points={[
                  [5.35, 2.2, -3.65],   // Salida lateral
                  [5.5, 1.0, -3.8],     // Cuelga hacia abajo
                  [5.388, 2.0, -4.388]  // Vuelve a la pistola en el surtidor
                ]} 
              />
            )}
          </group>
        </XR>
      </Canvas>
    </div>
  );
}
