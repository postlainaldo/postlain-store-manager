"use client";

import { useRef, useState, Suspense, useEffect } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, useTexture, Text } from "@react-three/drei";
import * as THREE from "three";
import { useStore } from "@/store/useStore";
import { Product } from "@/types";

// ─── Dynamic layout helpers ───────────────────────────────────────────────────
const SLOT_W = 1.85;
const SLOT_H = 2.0;
const SLOT_D = 0.14;
const SLOT_GAP_X = 2.25;
const SLOT_GAP_Y = 2.55;
const SHELF_THICK = 0.1;
const SHELF_DEPTH = 1.4;

function getLayout(rows: number, cols: number) {
  const shelfW = cols * SLOT_GAP_X + 0.4;
  const slotX = Array.from({ length: cols }, (_, i) => (i - (cols - 1) / 2) * SLOT_GAP_X);
  const shelfY = Array.from({ length: rows }, (_, i) => (i - (rows - 1) / 2) * SLOT_GAP_Y);
  return { shelfW, slotX, shelfY };
}

// ─── Lighting ─────────────────────────────────────────────────────────────────
function Lighting({ shelfY }: { shelfY: number[] }) {
  return (
    <>
      <ambientLight intensity={0.7} color="#FFFFFF" />
      {shelfY.map((y, i) => (
        <group key={i}>
          {/* Main overhead retail spot — very bright, focused */}
          <spotLight position={[0, y + 3.2, 2.5]} intensity={160} angle={0.42} penumbra={0.4} color="#FFFFFF" castShadow />
          {/* Side fill lights */}
          <pointLight position={[-2.2, y + 1.2, 2.2]} intensity={18} color="#FFFCF8" />
          <pointLight position={[2.2, y + 1.2, 2.2]} intensity={18} color="#FFFCF8" />
        </group>
      ))}
      <directionalLight position={[0, 10, 6]} intensity={1.2} color="#FFFFFF" />
    </>
  );
}

// ─── Store room environment ────────────────────────────────────────────────────
function StoreRoom({ shelfY, shelfW }: { shelfY: number[]; shelfW: number }) {
  const bottomY = shelfY[0] - SLOT_H / 2 - SHELF_THICK - 0.04;
  const topY = shelfY[shelfY.length - 1] + SLOT_H / 2 + SHELF_THICK + 0.1;
  const ceilingY = topY + 2.2;
  const midY = (ceilingY + bottomY) / 2;
  const roomH = ceilingY - bottomY + 0.5;
  const roomW = Math.max(shelfW + 10, 22);
  const roomD = 16;

  return (
    <group>
      {/* Wood floor — golden oak */}
      <mesh position={[0, bottomY - 0.04, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[roomW, roomD]} />
        <meshStandardMaterial color="#C4905A" roughness={0.52} metalness={0.06} />
      </mesh>
      {/* Back wall */}
      <mesh position={[0, midY, -SHELF_DEPTH / 2 - 0.05]} receiveShadow>
        <planeGeometry args={[roomW, roomH]} />
        <meshStandardMaterial color="#EDEAE5" roughness={0.88} />
      </mesh>
      {/* Side walls */}
      <mesh position={[-(roomW / 2), midY, 2.5]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
        <planeGeometry args={[roomD, roomH]} />
        <meshStandardMaterial color="#EDEAE5" roughness={0.88} />
      </mesh>
      <mesh position={[roomW / 2, midY, 2.5]} rotation={[0, -Math.PI / 2, 0]} receiveShadow>
        <planeGeometry args={[roomD, roomH]} />
        <meshStandardMaterial color="#EDEAE5" roughness={0.88} />
      </mesh>
      {/* Ceiling */}
      <mesh position={[0, ceilingY, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[roomW, roomD]} />
        <meshStandardMaterial color="#F5F2EE" roughness={0.85} />
      </mesh>
      {/* Recessed ceiling downlights */}
      {[-5, -2.5, 0, 2.5, 5].map((x, i) => (
        <mesh key={i} position={[x, ceilingY - 0.02, 2.5]} rotation={[Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.15, 12]} />
          <meshStandardMaterial color="#FFFEF8" emissive="#FFFEF8" emissiveIntensity={5} />
        </mesh>
      ))}
      {/* Track lights on ceiling */}
      <mesh position={[0, ceilingY - 0.06, 2.5]}>
        <boxGeometry args={[shelfW + 2, 0.04, 0.08]} />
        <meshStandardMaterial color="#B0A8A0" roughness={0.5} metalness={0.8} />
      </mesh>
    </group>
  );
}

// ─── Empty slot ───────────────────────────────────────────────────────────────
function EmptySlot({ isPlacementMode, hovered }: { isPlacementMode: boolean; hovered: boolean }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const mat = ref.current.material as THREE.MeshStandardMaterial;
    mat.emissiveIntensity = isPlacementMode
      ? 0.08 + 0.07 * Math.sin(clock.elapsedTime * 2.5)
      : 0.03;
  });
  return (
    <mesh ref={ref}>
      <boxGeometry args={[SLOT_W, SLOT_H, SLOT_D]} />
      <meshStandardMaterial
        color="#E8E4E0"
        emissive={hovered && isPlacementMode ? "#4A8CDD" : isPlacementMode ? "#2A5CA8" : "#D0CCC8"}
        emissiveIntensity={hovered && isPlacementMode ? 0.4 : isPlacementMode ? 0.1 : 0.04}
        roughness={0.4} metalness={0.02} transparent opacity={0.88}
      />
    </mesh>
  );
}

// ─── Filled slots ─────────────────────────────────────────────────────────────
function TexturedProduct({ product, hovered }: { product: Product; hovered: boolean }) {
  const texture = useTexture(product.imagePath!);
  texture.colorSpace = THREE.SRGBColorSpace;
  return (
    <group>
      <mesh>
        <boxGeometry args={[SLOT_W, SLOT_H, SLOT_D + 0.01]} />
        <meshStandardMaterial color={hovered ? "#F5F5F5" : "#FFFFFF"} roughness={0.15} metalness={0.05} />
      </mesh>
      <mesh position={[0, 0, SLOT_D / 2 + 0.025]}>
        <planeGeometry args={[SLOT_W - 0.13, SLOT_H - 0.13]} />
        <meshStandardMaterial map={texture} roughness={0.4} />
      </mesh>
    </group>
  );
}

const CAT_COLORS: Record<string, string> = {
  "Giày nữ": "#C49A6C", "Giày nam": "#5A7888", "Bốt nữ": "#C4A080",
  "Bốt nam": "#6A8094", "Sandal nữ": "#D4A090", "Sandal nam": "#8888C4",
  "Giày trẻ em": "#8DC4A0", "Túi nữ": "#9B7060", "Túi nam": "#607080",
  "Phụ kiện": "#7A8B6B", "Trang sức": "#B8A045", "Áo": "#607090",
  "Quần": "#706080", "Đầm/Váy": "#906070",
};

function ColoredProduct({ product, hovered }: { product: Product; hovered: boolean }) {
  const color = CAT_COLORS[product.category] || "#9A8878";
  return (
    <group>
      <mesh>
        <boxGeometry args={[SLOT_W, SLOT_H, SLOT_D + 0.01]} />
        <meshStandardMaterial color={hovered ? "#F5F5F5" : "#FFFFFF"} roughness={0.15} metalness={0.05} />
      </mesh>
      <mesh position={[0, 0, SLOT_D / 2 + 0.025]}>
        <planeGeometry args={[SLOT_W - 0.13, SLOT_H - 0.13]} />
        <meshStandardMaterial color={color} roughness={0.6} />
      </mesh>
      <Text position={[0, 0, SLOT_D / 2 + 0.08]} fontSize={0.42} color="#C9A96E" anchorX="center" anchorY="middle" font={undefined}>
        {product.name.charAt(0).toUpperCase()}
      </Text>
    </group>
  );
}

// ─── Product Slot ─────────────────────────────────────────────────────────────
function ProductSlot({ slotIndex, position }: { slotIndex: number; position: [number, number, number] }) {
  const { shelfLayout, products, selectedProduct, placeProduct } = useStore();
  const [hovered, setHovered] = useState(false);
  const { gl } = useThree();

  const productId = shelfLayout[slotIndex] ?? null;
  const product = productId ? products.find((p) => p.id === productId) : null;
  const isPlacementMode = !!selectedProduct;
  const canPlace = isPlacementMode && !product;
  const canRemove = !isPlacementMode && !!product;

  useEffect(() => {
    gl.domElement.style.cursor = hovered && (canPlace || canRemove) ? "pointer" : "default";
  }, [hovered, canPlace, canRemove, gl]);

  const handleClick = () => {
    if (canPlace && selectedProduct) placeProduct(slotIndex, selectedProduct.id);
    else if (canRemove) placeProduct(slotIndex, null);
  };

  return (
    <group position={position} onClick={handleClick} onPointerOver={() => setHovered(true)} onPointerOut={() => setHovered(false)}>
      {product ? (
        product.imagePath ? (
          <Suspense fallback={<ColoredProduct product={product} hovered={hovered} />}>
            <TexturedProduct product={product} hovered={hovered} />
          </Suspense>
        ) : (
          <ColoredProduct product={product} hovered={hovered} />
        )
      ) : (
        <EmptySlot isPlacementMode={isPlacementMode} hovered={hovered} />
      )}

      {product && (
        <Text position={[0, -SLOT_H / 2 - 0.2, 0.1]} fontSize={0.09} color={hovered ? "#C9A96E" : "#888"} anchorX="center" anchorY="middle" maxWidth={SLOT_W + 0.2} font={undefined}>
          {product.name.toUpperCase()}
        </Text>
      )}
      {canRemove && hovered && (
        <Text position={[0, 0, SLOT_D + 0.15]} fontSize={0.09} color="#ff8080" anchorX="center" anchorY="middle" font={undefined}>
          CLICK ĐỂ GỠ
        </Text>
      )}
    </group>
  );
}

// ─── Shelf structure ──────────────────────────────────────────────────────────
function ShelfStructure({ rows, cols }: { rows: number; cols: number }) {
  const { shelfW, slotX, shelfY } = getLayout(rows, cols);

  return (
    <group>
      {/* Boards */}
      {shelfY.map((y, i) => (
        <group key={`b${i}`}>
          <mesh position={[0, y - SLOT_H / 2 - 0.02, 0]} castShadow receiveShadow>
            <boxGeometry args={[shelfW, SHELF_THICK, SHELF_DEPTH]} />
            <meshStandardMaterial color="#F5F2EE" roughness={0.2} metalness={0.02} />
          </mesh>
          {/* LED strip glow on front edge of each shelf board */}
          <mesh position={[0, y - SLOT_H / 2 - 0.02, SHELF_DEPTH / 2 - 0.01]}>
            <boxGeometry args={[shelfW - 0.1, 0.025, 0.025]} />
            <meshStandardMaterial color="#FFFEF0" emissive="#FFFEF0" emissiveIntensity={3.5} />
          </mesh>
        </group>
      ))}
      {/* Top board */}
      <mesh position={[0, shelfY[shelfY.length - 1] + SLOT_H / 2 + 0.05, 0]} castShadow>
        <boxGeometry args={[shelfW, SHELF_THICK, SHELF_DEPTH]} />
        <meshStandardMaterial color="#F5F2EE" roughness={0.2} metalness={0.02} />
      </mesh>
      {/* Side panels */}
      {([-1, 1] as const).map((s) => (
        <mesh key={`s${s}`} position={[s * (shelfW / 2 + 0.06), 0, 0]} castShadow>
          <boxGeometry args={[0.1, rows * SLOT_GAP_Y + SLOT_H * 0.6, SHELF_DEPTH]} />
          <meshStandardMaterial color="#EFEFEF" roughness={0.18} metalness={0.02} />
        </mesh>
      ))}
      {/* Back panel */}
      <mesh position={[0, 0, -SHELF_DEPTH / 2 + 0.02]}>
        <boxGeometry args={[shelfW, rows * SLOT_GAP_Y + SLOT_H * 0.6, 0.06]} />
        <meshStandardMaterial color="#F0EDEA" roughness={0.25} />
      </mesh>
      {/* Slots */}
      {shelfY.map((y, row) =>
        slotX.map((x, col) => {
          const idx = row * cols + col;
          return <ProductSlot key={idx} slotIndex={idx} position={[x, y, 0]} />;
        })
      )}
    </group>
  );
}

// ─── Main Canvas ──────────────────────────────────────────────────────────────
export default function ShelfScene() {
  const { shelfConfig } = useStore();
  const { rows, cols } = shelfConfig;
  const { shelfY } = getLayout(rows, cols);

  // Camera distance scales with shelf size
  const camZ = Math.max(8, cols * 1.8 + rows * 1.2);
  const camY = (rows - 1) * SLOT_GAP_Y * 0.2;

  return (
    <Canvas
      camera={{ position: [0, camY, camZ], fov: 55 }}
      gl={{ antialias: true, alpha: false, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.35 }}
      shadows
      style={{ width: "100%", height: "100%" }}
    >
      <color attach="background" args={["#EAE7E2"]} />
      <Lighting shelfY={shelfY} />
      <StoreRoom shelfY={shelfY} shelfW={getLayout(rows, cols).shelfW} />
      <ShelfStructure rows={rows} cols={cols} />
      <OrbitControls
        enablePan={false}
        maxPolarAngle={Math.PI / 1.7}
        minPolarAngle={Math.PI / 4}
        maxAzimuthAngle={Math.PI / 2.2}
        minAzimuthAngle={-Math.PI / 2.2}
        minDistance={4}
        maxDistance={camZ * 2}
        target={[0, camY, 0]}
        enableDamping
        dampingFactor={0.06}
      />
    </Canvas>
  );
}
