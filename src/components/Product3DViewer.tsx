"use client";

import { useRef, Suspense } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { PRODUCT_TYPES, ShapeType } from "@/lib/productTypes";
import { Product } from "@/types";

function Spinner({ children }: { children: React.ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (ref.current) {
      ref.current.rotation.y = clock.elapsedTime * 0.65;
      ref.current.rotation.x = Math.sin(clock.elapsedTime * 0.25) * 0.12;
    }
  });
  return <group ref={ref}>{children}</group>;
}

function M({ color, r = 0.38, m = 0.06, t }: { color: string; r?: number; m?: number; t?: boolean }) {
  return <meshStandardMaterial color={color} roughness={r} metalness={m} transparent={t} opacity={t ? 0.32 : 1} />;
}

function darken(hex: string, amt = 0.32) {
  return new THREE.Color(hex).lerp(new THREE.Color("#1A0800"), amt).getStyle();
}
function lighten(hex: string, amt = 0.4) {
  return new THREE.Color(hex).lerp(new THREE.Color("#FFFFFF"), amt).getStyle();
}
function metallic(hex: string) {
  return new THREE.Color(hex).lerp(new THREE.Color("#C8C4BC"), 0.25).getStyle();
}

export function ProductShape({ shape, color }: { shape: ShapeType; color: string }) {
  const dk = darken(color);
  const lt = lighten(color);

  switch (shape) {

    // ─── SHOES ───────────────────────────────────────────────────────────────
    case "shoe_flat": return (
      <group scale={[1.4, 1.4, 1.4]}>
        {/* Sole */}
        <mesh position={[0, -0.32, 0]}>
          <boxGeometry args={[1.25, 0.10, 0.52]} />
          <M color={dk} r={0.7} />
        </mesh>
        {/* Midsole */}
        <mesh position={[0, -0.22, 0]}>
          <boxGeometry args={[1.18, 0.07, 0.46]} />
          <M color="#E8E2DA" r={0.5} />
        </mesh>
        {/* Toe box — flat rounded */}
        <mesh position={[0.35, -0.1, 0]} scale={[1, 0.55, 1]}>
          <sphereGeometry args={[0.28, 16, 10]} />
          <M color={color} r={0.3} />
        </mesh>
        {/* Upper body */}
        <mesh position={[-0.08, -0.1, 0]}>
          <boxGeometry args={[0.85, 0.26, 0.44]} />
          <M color={color} r={0.3} />
        </mesh>
        {/* Back heel counter */}
        <mesh position={[-0.52, -0.04, 0]}>
          <boxGeometry args={[0.22, 0.35, 0.44]} />
          <M color={dk} r={0.38} />
        </mesh>
        {/* Toe cap accent */}
        <mesh position={[0.41, -0.06, 0]}>
          <boxGeometry args={[0.05, 0.18, 0.42]} />
          <M color={lt} r={0.22} />
        </mesh>
      </group>
    );

    case "shoe_heel": return (
      <group scale={[1.28, 1.28, 1.28]}>
        <mesh position={[0.34, -0.5, 0]}>
          <boxGeometry args={[0.55, 0.08, 0.40]} />
          <M color={dk} r={0.65} />
        </mesh>
        <mesh position={[-0.06, -0.46, 0]} rotation={[0, 0, 0.28]}>
          <boxGeometry args={[0.58, 0.06, 0.38]} />
          <M color={dk} r={0.6} />
        </mesh>
        <mesh position={[-0.5, -0.25, 0]}>
          <cylinderGeometry args={[0.028, 0.048, 0.54, 10]} />
          <M color={dk} r={0.35} m={0.25} />
        </mesh>
        <mesh position={[-0.5, -0.54, 0]}>
          <cylinderGeometry args={[0.022, 0.028, 0.04, 8]} />
          <M color="#2A2A2A" r={0.4} m={0.6} />
        </mesh>
        <mesh position={[0.3, -0.22, 0]}>
          <boxGeometry args={[0.52, 0.38, 0.38]} />
          <M color={color} r={0.2} />
        </mesh>
        <mesh position={[0.58, -0.26, 0]} scale={[1.3, 0.55, 0.65]}>
          <sphereGeometry args={[0.2, 14, 10]} />
          <M color={color} r={0.18} />
        </mesh>
        <mesh position={[-0.38, 0.0, 0]}>
          <boxGeometry args={[0.18, 0.44, 0.36]} />
          <M color={color} r={0.22} />
        </mesh>
        <mesh position={[-0.28, 0.2, 0]}>
          <boxGeometry args={[0.32, 0.05, 0.06]} />
          <M color={dk} r={0.25} />
        </mesh>
        <mesh position={[-0.12, 0.2, 0.04]}>
          <boxGeometry args={[0.1, 0.08, 0.04]} />
          <M color={metallic("#C9A96E")} r={0.1} m={0.92} />
        </mesh>
      </group>
    );

    case "shoe_sneaker": return (
      <group scale={[1.3, 1.3, 1.3]}>
        {/* Rubber sole — thick chunky */}
        <mesh position={[0, -0.38, 0]}>
          <boxGeometry args={[1.28, 0.18, 0.54]} />
          <M color="#E0DDD8" r={0.6} />
        </mesh>
        {/* Midsole foam */}
        <mesh position={[0, -0.26, 0]}>
          <boxGeometry args={[1.22, 0.1, 0.5]} />
          <M color={lt} r={0.45} />
        </mesh>
        {/* Main upper */}
        <mesh position={[0, -0.04, 0]}>
          <boxGeometry args={[1.12, 0.36, 0.46]} />
          <M color={color} r={0.55} />
        </mesh>
        {/* Toe box — rounded */}
        <mesh position={[0.48, -0.08, 0]} scale={[1, 0.75, 1]}>
          <sphereGeometry args={[0.25, 14, 10]} />
          <M color={color} r={0.5} />
        </mesh>
        {/* Side stripe */}
        <mesh position={[0.05, -0.06, 0.24]}>
          <boxGeometry args={[0.8, 0.14, 0.02]} />
          <M color={lt} r={0.3} />
        </mesh>
        {/* Tongue */}
        <mesh position={[-0.08, 0.18, 0.22]}>
          <boxGeometry args={[0.34, 0.22, 0.03]} />
          <M color={lt} r={0.5} />
        </mesh>
        {/* Lace area */}
        {[-0.3, -0.1, 0.1].map((x, i) => (
          <mesh key={i} position={[x, 0.12, 0.24]}>
            <boxGeometry args={[0.02, 0.02, 0.02]} />
            <M color={metallic("#A0A0A0")} r={0.2} m={0.9} />
          </mesh>
        ))}
      </group>
    );

    case "shoe_dress": return (
      <group scale={[1.3, 1.3, 1.3]}>
        {/* Sole */}
        <mesh position={[0, -0.35, 0]}>
          <boxGeometry args={[1.3, 0.08, 0.45]} />
          <M color={dk} r={0.65} />
        </mesh>
        {/* Upper body — loafer/oxford */}
        <mesh position={[0, -0.18, 0]}>
          <boxGeometry args={[1.18, 0.28, 0.42]} />
          <M color={color} r={0.22} />
        </mesh>
        {/* Toe cap seam */}
        <mesh position={[0.5, -0.18, 0.22]}>
          <boxGeometry args={[0.24, 0.25, 0.02]} />
          <M color={dk} r={0.28} />
        </mesh>
        {/* Toe rounded */}
        <mesh position={[0.56, -0.2, 0]} scale={[1, 0.6, 1]}>
          <sphereGeometry args={[0.22, 12, 8]} />
          <M color={color} r={0.2} />
        </mesh>
        {/* Quarter panel */}
        <mesh position={[-0.36, -0.1, 0]}>
          <boxGeometry args={[0.46, 0.4, 0.4]} />
          <M color={dk} r={0.28} />
        </mesh>
        {/* Vamp perforations accent */}
        <mesh position={[0.14, -0.1, 0.22]}>
          <boxGeometry args={[0.45, 0.12, 0.02]} />
          <M color={lt} r={0.3} />
        </mesh>
      </group>
    );

    // ─── BAGS ────────────────────────────────────────────────────────────────
    case "bag_tote": return (
      <group scale={[1.2, 1.2, 1.2]}>
        {/* Body */}
        <mesh>
          <boxGeometry args={[1.0, 0.9, 0.4]} />
          <M color={color} r={0.45} />
        </mesh>
        {/* Top gusset */}
        <mesh position={[0, 0.46, 0]}>
          <boxGeometry args={[0.96, 0.05, 0.38]} />
          <M color={lt} r={0.25} />
        </mesh>
        {/* Brand patch */}
        <mesh position={[0, 0.06, 0.21]}>
          <boxGeometry args={[0.32, 0.12, 0.01]} />
          <M color={metallic("#C8A86E")} r={0.2} m={0.65} />
        </mesh>
        {/* Left handle */}
        <mesh position={[-0.22, 0.82, 0]}>
          <torusGeometry args={[0.18, 0.032, 10, 24, Math.PI]} />
          <M color={dk} r={0.38} />
        </mesh>
        {/* Right handle */}
        <mesh position={[0.22, 0.82, 0]}>
          <torusGeometry args={[0.18, 0.032, 10, 24, Math.PI]} />
          <M color={dk} r={0.38} />
        </mesh>
        {/* Base reinforcement */}
        <mesh position={[0, -0.46, 0]}>
          <boxGeometry args={[0.98, 0.05, 0.38]} />
          <M color={dk} r={0.5} />
        </mesh>
      </group>
    );

    case "bag_messenger": return (
      <group scale={[1.2, 1.2, 1.2]}>
        {/* Main body */}
        <mesh>
          <boxGeometry args={[1.05, 0.76, 0.3]} />
          <M color={color} r={0.48} />
        </mesh>
        {/* Front pocket */}
        <mesh position={[0, -0.08, 0.16]}>
          <boxGeometry args={[0.72, 0.46, 0.06]} />
          <M color={dk} r={0.42} />
        </mesh>
        {/* Flap */}
        <mesh position={[0, 0.28, 0.16]} rotation={[-0.28, 0, 0]}>
          <boxGeometry args={[1.05, 0.36, 0.06]} />
          <M color={dk} r={0.32} />
        </mesh>
        {/* Buckle */}
        <mesh position={[0, 0.12, 0.2]}>
          <boxGeometry args={[0.18, 0.14, 0.04]} />
          <M color={metallic("#A8A090")} r={0.18} m={0.88} />
        </mesh>
        {/* Shoulder strap stub */}
        <mesh position={[-0.52, 0.36, 0]}>
          <boxGeometry args={[0.06, 0.12, 0.06]} />
          <M color={dk} r={0.45} />
        </mesh>
        <mesh position={[0.52, 0.36, 0]}>
          <boxGeometry args={[0.06, 0.12, 0.06]} />
          <M color={dk} r={0.45} />
        </mesh>
      </group>
    );

    case "bag_backpack": return (
      <group scale={[1.1, 1.1, 1.1]}>
        {/* Main body — slightly tapered */}
        <mesh scale={[1, 1, 0.82]}>
          <boxGeometry args={[0.82, 1.08, 0.48]} />
          <M color={color} r={0.52} />
        </mesh>
        {/* Front pocket */}
        <mesh position={[0, -0.18, 0.22]}>
          <boxGeometry args={[0.66, 0.5, 0.08]} />
          <M color={dk} r={0.42} />
        </mesh>
        {/* Top handle */}
        <mesh position={[0, 0.6, 0]}>
          <torusGeometry args={[0.1, 0.028, 8, 16, Math.PI]} />
          <M color={dk} r={0.4} />
        </mesh>
        {/* Shoulder strap L */}
        <mesh position={[-0.22, 0.12, -0.22]}>
          <boxGeometry args={[0.08, 0.82, 0.06]} />
          <M color={dk} r={0.48} />
        </mesh>
        {/* Shoulder strap R */}
        <mesh position={[0.22, 0.12, -0.22]}>
          <boxGeometry args={[0.08, 0.82, 0.06]} />
          <M color={dk} r={0.48} />
        </mesh>
        {/* Zipper pull */}
        <mesh position={[0, 0.22, 0.26]}>
          <boxGeometry args={[0.05, 0.07, 0.03]} />
          <M color={metallic("#A0A0A8")} r={0.15} m={0.92} />
        </mesh>
      </group>
    );

    // ─── ACCESSORIES ─────────────────────────────────────────────────────────
    case "ring_bangle": return (
      <group scale={[1.5, 1.5, 1.5]}>
        <mesh>
          <torusGeometry args={[0.48, 0.13, 20, 60]} />
          <M color={color} r={0.1} m={0.88} />
        </mesh>
        {/* Engraving band */}
        <mesh>
          <torusGeometry args={[0.48, 0.16, 20, 60, Math.PI * 0.4]} />
          <M color={lt} r={0.08} m={0.95} />
        </mesh>
      </group>
    );

    case "ring_chain": return (
      <group scale={[1.4, 1.4, 1.4]}>
        <mesh>
          <torusGeometry args={[0.46, 0.055, 12, 60]} />
          <M color={color} r={0.1} m={0.92} />
        </mesh>
        {/* Chain links simulation */}
        {[0, 1, 2, 3].map(i => (
          <mesh key={i} position={[Math.sin(i * 1.57) * 0.32, Math.cos(i * 1.57) * 0.32, 0]}
            rotation={[0, 0, i * 1.57]}>
            <torusGeometry args={[0.1, 0.024, 8, 14, Math.PI]} />
            <M color={lt} r={0.12} m={0.88} />
          </mesh>
        ))}
        {/* Pendant */}
        <mesh position={[0, -0.6, 0]}>
          <sphereGeometry args={[0.12, 16, 12]} />
          <M color={color} r={0.08} m={0.9} />
        </mesh>
      </group>
    );

    case "watch": return (
      <group scale={[1.3, 1.3, 1.3]}>
        {/* Case */}
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.32, 0.32, 0.12, 40]} />
          <M color={metallic(color)} r={0.1} m={0.92} />
        </mesh>
        {/* Dial */}
        <mesh position={[0, 0, 0.07]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.27, 0.27, 0.02, 40]} />
          <M color="#0A0A12" r={0.05} m={0.08} />
        </mesh>
        {/* Hour / minute hands */}
        <mesh position={[0, 0.09, 0.09]}>
          <boxGeometry args={[0.03, 0.18, 0.01]} />
          <M color="#E8E4DC" r={0.2} m={0.7} />
        </mesh>
        <mesh position={[0.06, 0.06, 0.09]}>
          <boxGeometry args={[0.02, 0.22, 0.01]} />
          <M color="#C8A86E" r={0.15} m={0.8} />
        </mesh>
        {/* Crown */}
        <mesh position={[0.34, 0, 0]} rotation={[Math.PI / 2, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.035, 0.028, 0.08, 12]} />
          <M color={metallic(color)} r={0.12} m={0.9} />
        </mesh>
        {/* Strap top */}
        <mesh position={[0, 0.44, 0]}>
          <boxGeometry args={[0.24, 0.52, 0.1]} />
          <M color={color} r={0.48} m={0.04} />
        </mesh>
        {/* Strap bottom */}
        <mesh position={[0, -0.42, 0]}>
          <boxGeometry args={[0.24, 0.48, 0.1]} />
          <M color={color} r={0.48} m={0.04} />
        </mesh>
        {/* Buckle */}
        <mesh position={[0, -0.62, 0]}>
          <boxGeometry args={[0.2, 0.1, 0.05]} />
          <M color={metallic(color)} r={0.1} m={0.95} />
        </mesh>
      </group>
    );

    case "glasses": return (
      <group scale={[1.4, 1.4, 1.4]}>
        {/* Left lens frame */}
        <mesh position={[-0.38, 0, 0]}>
          <torusGeometry args={[0.26, 0.048, 12, 40]} />
          <M color={color} r={0.2} m={0.28} />
        </mesh>
        {/* Right lens frame */}
        <mesh position={[0.38, 0, 0]}>
          <torusGeometry args={[0.26, 0.048, 12, 40]} />
          <M color={color} r={0.2} m={0.28} />
        </mesh>
        {/* Left lens glass */}
        <mesh position={[-0.38, 0, 0]}>
          <circleGeometry args={[0.22, 40]} />
          <M color="#B8D8F0" r={0.0} m={0.08} t />
        </mesh>
        {/* Right lens glass */}
        <mesh position={[0.38, 0, 0]}>
          <circleGeometry args={[0.22, 40]} />
          <M color="#B8D8F0" r={0.0} m={0.08} t />
        </mesh>
        {/* Bridge */}
        <mesh>
          <boxGeometry args={[0.24, 0.048, 0.048]} />
          <M color={color} r={0.2} m={0.28} />
        </mesh>
        {/* Temple L */}
        <mesh position={[-0.82, 0, -0.2]} rotation={[0, 0.32, 0]}>
          <boxGeometry args={[0.6, 0.042, 0.042]} />
          <M color={color} r={0.25} m={0.2} />
        </mesh>
        {/* Temple R */}
        <mesh position={[0.82, 0, -0.2]} rotation={[0, -0.32, 0]}>
          <boxGeometry args={[0.6, 0.042, 0.042]} />
          <M color={color} r={0.25} m={0.2} />
        </mesh>
      </group>
    );

    case "wallet": return (
      <group scale={[1.5, 1.5, 1.5]}>
        {/* Body */}
        <mesh>
          <boxGeometry args={[0.88, 0.56, 0.11]} />
          <M color={color} r={0.35} />
        </mesh>
        {/* Top edge stitching */}
        <mesh position={[0, 0.28, 0.06]}>
          <boxGeometry args={[0.84, 0.01, 0.01]} />
          <M color={lt} r={0.6} />
        </mesh>
        {/* Clasp */}
        <mesh position={[0, 0, 0.07]}>
          <boxGeometry args={[0.18, 0.12, 0.04]} />
          <M color={metallic("#C9A96E")} r={0.12} m={0.88} />
        </mesh>
        {/* Card slot hint */}
        <mesh position={[0.2, 0.1, 0.06]}>
          <boxGeometry args={[0.28, 0.3, 0.01]} />
          <M color={lt} r={0.4} />
        </mesh>
      </group>
    );

    case "belt": return (
      <group scale={[1.1, 1.1, 1.1]} rotation={[0, 0, 0.06]}>
        {/* Strap */}
        <mesh>
          <boxGeometry args={[2.1, 0.16, 0.045]} />
          <M color={color} r={0.48} />
        </mesh>
        {/* Buckle frame */}
        <mesh position={[-0.96, 0, 0.04]}>
          <boxGeometry args={[0.28, 0.25, 0.06]} />
          <M color={metallic("#B0A890")} r={0.14} m={0.9} />
        </mesh>
        {/* Buckle bar */}
        <mesh position={[-0.96, 0, 0.075]}>
          <boxGeometry args={[0.26, 0.025, 0.02]} />
          <M color="#FFFFFF" r={0.1} m={0.95} />
        </mesh>
        {/* Holes */}
        {[-0.1, 0.18, 0.46, 0.74, 1.02].map((x, i) => (
          <mesh key={i} position={[x, 0, 0.04]}>
            <cylinderGeometry args={[0.022, 0.022, 0.06, 10]} />
            <M color={darken(color, 0.5)} r={0.5} />
          </mesh>
        ))}
      </group>
    );

    case "hat_beret": return (
      <group scale={[1.4, 1.4, 1.4]}>
        <mesh position={[0, 0.08, 0.08]} scale={[1, 0.6, 1]}>
          <sphereGeometry args={[0.56, 20, 14]} />
          <M color={color} r={0.68} />
        </mesh>
        <mesh position={[0, -0.18, 0]}>
          <torusGeometry args={[0.52, 0.09, 10, 40]} />
          <M color={dk} r={0.62} />
        </mesh>
        {/* Top button */}
        <mesh position={[0, 0.36, 0.08]}>
          <sphereGeometry args={[0.06, 10, 8]} />
          <M color={dk} r={0.5} />
        </mesh>
      </group>
    );

    case "hat_cap": return (
      <group scale={[1.3, 1.3, 1.3]}>
        {/* Crown */}
        <mesh position={[0, 0.14, 0]} scale={[1, 0.75, 1]}>
          <cylinderGeometry args={[0.36, 0.43, 0.54, 24]} />
          <M color={color} r={0.55} />
        </mesh>
        {/* Top panel seam */}
        <mesh position={[0, 0.42, 0]} scale={[1, 0.2, 1]}>
          <sphereGeometry args={[0.36, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <M color={dk} r={0.58} />
        </mesh>
        {/* Brim */}
        <mesh position={[0.24, -0.18, 0.26]} rotation={[-0.22, 0, 0]}>
          <cylinderGeometry args={[0.56, 0.56, 0.04, 32, 1, false, -Math.PI * 0.65, Math.PI * 1.15]} />
          <M color={dk} r={0.55} />
        </mesh>
        {/* Logo patch */}
        <mesh position={[0, 0.14, 0.38]}>
          <boxGeometry args={[0.22, 0.14, 0.02]} />
          <M color={lt} r={0.35} />
        </mesh>
        {/* Button top */}
        <mesh position={[0, 0.44, 0]}>
          <sphereGeometry args={[0.055, 8, 8]} />
          <M color={dk} r={0.4} />
        </mesh>
      </group>
    );

    case "scarf": return (
      <group scale={[1.2, 1.2, 1.2]}>
        <mesh rotation={[0.12, 0.08, 0]}>
          <boxGeometry args={[0.92, 0.3, 0.28]} />
          <M color={color} r={0.72} />
        </mesh>
        <mesh position={[0.26, -0.22, 0.1]} rotation={[0.38, 0.18, 0.14]}>
          <boxGeometry args={[0.58, 0.18, 0.1]} />
          <M color={color} r={0.72} />
        </mesh>
        <mesh position={[-0.26, -0.22, 0.08]} rotation={[0.32, -0.18, -0.08]}>
          <boxGeometry args={[0.58, 0.18, 0.1]} />
          <M color={lt} r={0.72} />
        </mesh>
        {/* Fringe hint */}
        {[-3, -1, 1, 3].map(x => (
          <mesh key={x} position={[x * 0.07, -0.36, 0.08]}>
            <boxGeometry args={[0.02, 0.1, 0.02]} />
            <M color={dk} r={0.8} />
          </mesh>
        ))}
      </group>
    );

    case "keychain": return (
      <group scale={[1.6, 1.6, 1.6]}>
        {/* Ring */}
        <mesh position={[0, 0.36, 0]}>
          <torusGeometry args={[0.18, 0.042, 12, 36]} />
          <M color={metallic("#A8B0B8")} r={0.1} m={0.95} />
        </mesh>
        {/* Chain */}
        <mesh position={[0, 0.14, 0]}>
          <cylinderGeometry args={[0.018, 0.018, 0.18, 8]} />
          <M color={metallic("#A8B0B8")} r={0.12} m={0.92} />
        </mesh>
        {/* Charm */}
        <mesh position={[0, -0.14, 0]}>
          <sphereGeometry args={[0.28, 18, 14]} />
          <M color={color} r={0.38} />
        </mesh>
        {/* Charm accent */}
        <mesh position={[0, -0.14, 0.18]}>
          <circleGeometry args={[0.14, 20]} />
          <M color={lt} r={0.25} />
        </mesh>
      </group>
    );

    case "earring": return (
      <group scale={[1.6, 1.6, 1.6]}>
        {/* Hook */}
        <mesh position={[0, 0.28, 0]}>
          <torusGeometry args={[0.18, 0.03, 10, 22, Math.PI * 1.4]} />
          <M color={metallic(color)} r={0.1} m={0.94} />
        </mesh>
        {/* Pin */}
        <mesh position={[0, -0.04, 0]}>
          <cylinderGeometry args={[0.015, 0.015, 0.18, 8]} />
          <M color={metallic(color)} r={0.12} m={0.92} />
        </mesh>
        {/* Drop gem */}
        <mesh position={[0, -0.2, 0]} scale={[1, 1.3, 1]}>
          <sphereGeometry args={[0.2, 18, 14]} />
          <M color={color} r={0.05} m={0.75} />
        </mesh>
        {/* Gem facet highlight */}
        <mesh position={[0.06, -0.14, 0.12]}>
          <sphereGeometry args={[0.06, 10, 8]} />
          <M color="#FFFFFF" r={0.0} m={0.9} />
        </mesh>
      </group>
    );

    case "sock": return (
      <group scale={[1.3, 1.3, 1.3]}>
        {/* Leg tube */}
        <mesh position={[0, 0.28, 0]}>
          <cylinderGeometry args={[0.28, 0.26, 0.58, 18]} />
          <M color={color} r={0.72} />
        </mesh>
        {/* Cuff */}
        <mesh position={[0, 0.58, 0]}>
          <cylinderGeometry args={[0.3, 0.28, 0.16, 18]} />
          <M color={lt} r={0.7} />
        </mesh>
        {/* Foot */}
        <mesh position={[0.12, -0.12, 0.22]} rotation={[Math.PI / 2.1, 0, 0]}>
          <cylinderGeometry args={[0.24, 0.22, 0.5, 18]} />
          <M color={color} r={0.72} />
        </mesh>
        {/* Toe */}
        <mesh position={[0.12, -0.12, 0.5]} scale={[1, 0.72, 1]}>
          <sphereGeometry args={[0.24, 14, 10]} />
          <M color={dk} r={0.68} />
        </mesh>
        {/* Heel */}
        <mesh position={[0.12, -0.18, -0.06]} scale={[0.7, 0.7, 0.7]}>
          <sphereGeometry args={[0.26, 12, 10]} />
          <M color={dk} r={0.7} />
        </mesh>
      </group>
    );

    case "shoe_ballet": return (
      <group scale={[1.35, 1.35, 1.35]}>
        <mesh position={[0, -0.28, 0]}>
          <boxGeometry args={[1.2, 0.06, 0.46]} />
          <M color={dk} r={0.65} />
        </mesh>
        <mesh position={[0.1, -0.18, 0]}>
          <boxGeometry args={[0.88, 0.18, 0.44]} />
          <M color={color} r={0.22} />
        </mesh>
        <mesh position={[0.48, -0.2, 0]} scale={[1, 0.55, 0.95]}>
          <sphereGeometry args={[0.26, 18, 12]} />
          <M color={color} r={0.2} />
        </mesh>
        <mesh position={[-0.52, -0.14, 0]}>
          <boxGeometry args={[0.18, 0.22, 0.44]} />
          <M color={dk} r={0.3} />
        </mesh>
        <mesh position={[0.3, -0.07, 0.23]}>
          <boxGeometry args={[0.18, 0.08, 0.02]} />
          <M color={lt} r={0.2} />
        </mesh>
        <mesh position={[0.24, -0.04, 0.23]} rotation={[0, 0, 0.7]}>
          <boxGeometry args={[0.12, 0.04, 0.02]} />
          <M color={lt} r={0.2} />
        </mesh>
        <mesh position={[0.36, -0.04, 0.23]} rotation={[0, 0, -0.7]}>
          <boxGeometry args={[0.12, 0.04, 0.02]} />
          <M color={lt} r={0.2} />
        </mesh>
      </group>
    );

    case "shoe_sneaker_women": return (
      <group scale={[1.25, 1.25, 1.25]}>
        <mesh position={[0, -0.36, 0]}>
          <boxGeometry args={[1.18, 0.14, 0.44]} />
          <M color="#E8E4E0" r={0.55} />
        </mesh>
        <mesh position={[0, -0.27, 0.22]}>
          <boxGeometry args={[1.14, 0.06, 0.02]} />
          <M color={lt} r={0.3} />
        </mesh>
        <mesh position={[0.02, -0.1, 0]}>
          <boxGeometry args={[1.0, 0.32, 0.40]} />
          <M color={color} r={0.45} />
        </mesh>
        <mesh position={[0.46, -0.14, 0]} scale={[1.0, 0.62, 0.85]}>
          <sphereGeometry args={[0.23, 16, 10]} />
          <M color={color} r={0.4} />
        </mesh>
        <mesh position={[0.1, -0.12, 0.21]}>
          <boxGeometry args={[0.62, 0.09, 0.02]} />
          <M color={dk} r={0.25} />
        </mesh>
        <mesh position={[-0.1, 0.14, 0.21]}>
          <boxGeometry args={[0.28, 0.2, 0.03]} />
          <M color={lt} r={0.4} />
        </mesh>
        {([-0.28, -0.08, 0.12] as const).map((x, i) => (
          <mesh key={i} position={[x, 0.08, 0.22]}>
            <sphereGeometry args={[0.018, 8, 6]} />
            <M color="#C8C4C0" r={0.2} m={0.85} />
          </mesh>
        ))}
      </group>
    );

    case "sandal_strappy": return (
      <group scale={[1.3, 1.3, 1.3]}>
        <mesh position={[0, -0.30, 0]}>
          <boxGeometry args={[1.15, 0.07, 0.42]} />
          <M color={dk} r={0.55} />
        </mesh>
        <mesh position={[0, -0.24, 0]}>
          <boxGeometry args={[1.08, 0.05, 0.38]} />
          <M color={lt} r={0.4} />
        </mesh>
        <mesh position={[0.32, -0.16, 0]}>
          <boxGeometry args={[0.32, 0.06, 0.38]} />
          <M color={color} r={0.28} />
        </mesh>
        <mesh position={[-0.18, -0.05, 0]}>
          <boxGeometry args={[0.52, 0.05, 0.38]} />
          <M color={color} r={0.28} />
        </mesh>
        <mesh position={[-0.5, 0.05, 0]}>
          <boxGeometry args={[0.05, 0.28, 0.05]} />
          <M color={color} r={0.28} />
        </mesh>
        <mesh position={[-0.5, 0.18, 0.03]}>
          <boxGeometry args={[0.09, 0.07, 0.04]} />
          <M color={metallic("#C9A96E")} r={0.1} m={0.92} />
        </mesh>
        <mesh position={[-0.44, -0.24, 0]}>
          <cylinderGeometry args={[0.05, 0.07, 0.14, 10]} />
          <M color={dk} r={0.45} m={0.1} />
        </mesh>
      </group>
    );

    case "sandal_slide": return (
      <group scale={[1.35, 1.35, 1.35]}>
        <mesh position={[0, -0.28, 0]}>
          <boxGeometry args={[1.2, 0.16, 0.52]} />
          <M color={dk} r={0.68} />
        </mesh>
        <mesh position={[0, -0.19, 0]}>
          <boxGeometry args={[1.12, 0.04, 0.46]} />
          <M color={lt} r={0.45} />
        </mesh>
        <mesh position={[0.06, -0.08, 0]}>
          <boxGeometry args={[0.64, 0.18, 0.46]} />
          <M color={color} r={0.38} />
        </mesh>
        {([-0.12, 0.0, 0.12] as const).map((z, i) => (
          <mesh key={i} position={[0.06, -0.05, z]}>
            <boxGeometry args={[0.62, 0.02, 0.01]} />
            <M color={dk} r={0.5} />
          </mesh>
        ))}
        <mesh position={[0.06, -0.04, 0.24]}>
          <boxGeometry args={[0.22, 0.07, 0.01]} />
          <M color={metallic(color)} r={0.2} m={0.5} />
        </mesh>
      </group>
    );

    case "shoe_loafer": return (
      <group scale={[1.3, 1.3, 1.3]}>
        <mesh position={[0, -0.36, 0]}>
          <boxGeometry args={[1.32, 0.07, 0.46]} />
          <M color={dk} r={0.68} />
        </mesh>
        <mesh position={[-0.52, -0.26, 0]}>
          <boxGeometry args={[0.26, 0.22, 0.44]} />
          <M color={dk} r={0.55} />
        </mesh>
        <mesh position={[0.0, -0.2, 0]}>
          <boxGeometry args={[1.12, 0.22, 0.42]} />
          <M color={color} r={0.18} />
        </mesh>
        <mesh position={[0.6, -0.22, 0]} scale={[1.2, 0.55, 0.75]}>
          <sphereGeometry args={[0.22, 16, 10]} />
          <M color={color} r={0.15} />
        </mesh>
        <mesh position={[-0.28, -0.16, 0.22]}>
          <boxGeometry args={[0.55, 0.2, 0.02]} />
          <M color={dk} r={0.2} />
        </mesh>
        <mesh position={[0.22, -0.08, 0.22]}>
          <boxGeometry args={[0.24, 0.06, 0.02]} />
          <M color={metallic("#C0A870")} r={0.12} m={0.88} />
        </mesh>
        <mesh position={[0.22, -0.02, 0.22]}>
          <cylinderGeometry args={[0.015, 0.015, 0.08, 8]} />
          <M color={metallic("#C0A870")} r={0.12} m={0.88} />
        </mesh>
        <mesh position={[0, -0.32, 0.24]}>
          <boxGeometry args={[1.28, 0.04, 0.02]} />
          <M color={dk} r={0.4} />
        </mesh>
      </group>
    );

    case "bag_structured": return (
      <group scale={[1.15, 1.15, 1.15]}>
        <mesh>
          <boxGeometry args={[1.0, 0.75, 0.35]} />
          <M color={color} r={0.22} />
        </mesh>
        <mesh position={[0, -0.39, 0]}>
          <boxGeometry args={[1.02, 0.06, 0.37]} />
          <M color={dk} r={0.3} />
        </mesh>
        {([-1, 1] as const).map(s => (
          <mesh key={s} position={[s * 0.52, 0, 0]}>
            <boxGeometry args={[0.06, 0.75, 0.33]} />
            <M color={dk} r={0.25} />
          </mesh>
        ))}
        <mesh position={[0, 0.32, 0.18]} rotation={[-0.18, 0, 0]}>
          <boxGeometry args={[0.98, 0.3, 0.04]} />
          <M color={dk} r={0.2} />
        </mesh>
        <mesh position={[0, 0.22, 0.2]}>
          <boxGeometry args={[0.14, 0.11, 0.05]} />
          <M color={metallic("#C9A96E")} r={0.1} m={0.92} />
        </mesh>
        <mesh position={[-0.2, 0.66, 0]}>
          <torusGeometry args={[0.16, 0.028, 10, 20, Math.PI]} />
          <M color={dk} r={0.3} />
        </mesh>
        <mesh position={[0.2, 0.66, 0]}>
          <torusGeometry args={[0.16, 0.028, 10, 20, Math.PI]} />
          <M color={dk} r={0.3} />
        </mesh>
        {([-0.32, -0.16, 0, 0.16, 0.32] as const).map((x, i) => (
          <mesh key={i} position={[x, -0.24, 0.18]} rotation={[0, 0, i % 2 === 0 ? 0.3 : -0.3]}>
            <torusGeometry args={[0.038, 0.01, 6, 8, Math.PI]} />
            <M color={metallic("#C9A96E")} r={0.1} m={0.92} />
          </mesh>
        ))}
        <mesh position={[0, 0.06, 0.18]}>
          <boxGeometry args={[0.28, 0.09, 0.01]} />
          <M color={metallic("#C9A96E")} r={0.12} m={0.88} />
        </mesh>
      </group>
    );

    default: return (
      <mesh scale={[1.4, 1.4, 1.4]}>
        <boxGeometry args={[0.8, 0.8, 0.8]} />
        <M color={color} />
      </mesh>
    );
  }
}

// ─── Scene ────────────────────────────────────────────────────────────────────
function ViewerScene({ product }: { product: Product }) {
  const typeConfig = product.productType ? PRODUCT_TYPES[product.productType] : null;
  const shape: ShapeType = (typeConfig?.shape ?? "shoe_flat") as ShapeType;
  const color = product.color ?? typeConfig?.defaultColor ?? "#C9A96E";
  return (
    <>
      <ambientLight intensity={1.0} color="#FFF8F0" />
      <directionalLight position={[2.5, 4, 3]} intensity={2.0} color="#FFFFFF" castShadow />
      <directionalLight position={[-2, 2, -1]} intensity={0.7} color="#F0EEFF" />
      <pointLight position={[1, -1.5, 2.5]} intensity={0.8} color="#FFE8C8" />
      <pointLight position={[-1.5, 1, 1.5]} intensity={0.4} color="#E8F0FF" />
      <Suspense fallback={null}>
        <Spinner>
          <ProductShape shape={shape} color={color} />
        </Spinner>
      </Suspense>
    </>
  );
}

export function Product3DCanvas({ product }: { product: Product }) {
  return (
    <Canvas camera={{ position: [0, 0.2, 3.2], fov: 36 }}
      gl={{ antialias: true, alpha: false, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.45 }}
      shadows
      style={{ width: "100%", height: "100%" }}>
      <color attach="background" args={["#F5F2EE"]} />
      <ViewerScene product={product} />
    </Canvas>
  );
}

// ─── Side panel ───────────────────────────────────────────────────────────────
export default function Product3DViewer({ product }: { product: Product }) {
  const typeConfig = product.productType ? PRODUCT_TYPES[product.productType] : null;
  return (
    <div className="w-[180px] flex-shrink-0 border-l border-border bg-bg-surface flex flex-col overflow-hidden">
      <div className="flex-1 relative" style={{ minHeight: 0 }}>
        <Product3DCanvas product={product} />
        <div className="absolute bottom-0 left-0 right-0 h-10 pointer-events-none"
          style={{ background: "linear-gradient(to top, #F8F5F2 20%, transparent)" }} />
      </div>
      <div className="px-3 py-2.5 border-t border-border flex-shrink-0 space-y-1 bg-bg-surface">
        <p className="text-[9px] text-gold font-medium leading-tight truncate" title={product.name}>
          {product.name}
        </p>
        {typeConfig && <p className="text-[8px] text-text-muted">{typeConfig.label}</p>}
        <div className="flex items-center gap-2 flex-wrap mt-0.5">
          {product.size && (
            <span className="text-[7px] text-text-secondary border border-border rounded px-1 py-0.5">
              {product.size}
            </span>
          )}
          {product.color && (
            <div className="w-3 h-3 rounded-full border border-border/60 flex-shrink-0"
              style={{ background: product.color }} />
          )}
          <span className="text-[7px] text-text-muted">×{product.quantity}</span>
        </div>
      </div>
    </div>
  );
}
