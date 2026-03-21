"use client";

/**
 * WASDControls — First-person camera for Three.js / R3F
 *
 * Movement:
 *   W / ↑       Move forward
 *   S / ↓       Move backward
 *   A / ←       Strafe left
 *   D / →       Strafe right
 *   Space        Fly up
 *   Shift        Fly down
 *
 * Look (keyboard):
 *   Q / Z        Yaw left  (turn head left)
 *   E / C        Yaw right (turn head right)
 *   R            Pitch up  (look up)
 *   F            Pitch down (look down)
 *
 * Look (mouse):
 *   Left-drag    Look around freely
 *   Scroll       Zoom (move forward/back)
 */

import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

interface Props {
  speed?: number;
  turnSpeed?: number;
  minY?: number;
  maxY?: number;
  minZ?: number;
  maxZ?: number;
  minX?: number;
  maxX?: number;
}

export default function WASDControls({
  speed = 6,
  turnSpeed = 1.4,
  minY = 0.5,
  maxY = 12,
  minZ = -20,
  maxZ = 25,
  minX = -22,
  maxX = 22,
}: Props) {
  const { camera, gl } = useThree();
  const keys = useRef<Set<string>>(new Set());
  const drag = useRef({ active: false, lastX: 0, lastY: 0 });
  const euler = useRef(new THREE.Euler(0, 0, 0, "YXZ"));

  // Sync euler from initial camera quaternion
  useEffect(() => {
    euler.current.setFromQuaternion(camera.quaternion, "YXZ");
  }, [camera]);

  useEffect(() => {
    const canvas = gl.domElement;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      // Prevent page scroll on Space/arrows
      if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code)) {
        e.preventDefault();
      }
      keys.current.add(e.code);
    };
    const onKeyUp = (e: KeyboardEvent) => keys.current.delete(e.code);

    const onMouseDown = (e: MouseEvent) => {
      if (e.button !== 0) return;
      drag.current = { active: true, lastX: e.clientX, lastY: e.clientY };
      canvas.style.cursor = "grabbing";
    };
    const onMouseUp = () => {
      drag.current.active = false;
      canvas.style.cursor = "grab";
    };
    const onMouseMove = (e: MouseEvent) => {
      if (!drag.current.active) return;
      const dx = e.clientX - drag.current.lastX;
      const dy = e.clientY - drag.current.lastY;
      drag.current.lastX = e.clientX;
      drag.current.lastY = e.clientY;
      euler.current.y -= dx * 0.003;
      euler.current.x = THREE.MathUtils.clamp(euler.current.x - dy * 0.003, -Math.PI / 2.4, Math.PI / 2.4);
      camera.quaternion.setFromEuler(euler.current);
    };
    const onWheel = (e: WheelEvent) => {
      const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
      camera.position.addScaledVector(dir, -e.deltaY * 0.012);
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    canvas.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mouseup", onMouseUp);
    window.addEventListener("mousemove", onMouseMove);
    canvas.addEventListener("wheel", onWheel, { passive: true });
    canvas.style.cursor = "grab";

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      canvas.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("mousemove", onMouseMove);
      canvas.removeEventListener("wheel", onWheel);
      canvas.style.cursor = "";
    };
  }, [camera, gl]);

  useFrame((_, delta) => {
    const k = keys.current;
    const vel = new THREE.Vector3();
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);

    // Flatten for ground-relative movement
    forward.y = 0; forward.normalize();
    right.y = 0; right.normalize();

    // Move
    if (k.has("KeyW") || k.has("ArrowUp"))    vel.addScaledVector(forward, 1);
    if (k.has("KeyS") || k.has("ArrowDown"))   vel.addScaledVector(forward, -1);
    if (k.has("KeyA") || k.has("ArrowLeft"))   vel.addScaledVector(right, -1);
    if (k.has("KeyD") || k.has("ArrowRight"))  vel.addScaledVector(right, 1);
    if (k.has("Space"))                         vel.y += 1;
    if (k.has("ShiftLeft") || k.has("ShiftRight")) vel.y -= 1;

    if (vel.lengthSq() > 0) {
      vel.normalize().multiplyScalar(speed * delta);
      camera.position.add(vel);
      camera.position.x = THREE.MathUtils.clamp(camera.position.x, minX, maxX);
      camera.position.y = THREE.MathUtils.clamp(camera.position.y, minY, maxY);
      camera.position.z = THREE.MathUtils.clamp(camera.position.z, minZ, maxZ);
    }

    // Keyboard look (yaw + pitch)
    const yawDelta = turnSpeed * delta;
    const pitchDelta = turnSpeed * delta;
    let changed = false;

    if (k.has("KeyQ") || k.has("KeyZ")) { euler.current.y += yawDelta; changed = true; }
    if (k.has("KeyE") || k.has("KeyC")) { euler.current.y -= yawDelta; changed = true; }
    if (k.has("KeyR")) {
      euler.current.x = THREE.MathUtils.clamp(euler.current.x + pitchDelta, -Math.PI / 2.4, Math.PI / 2.4);
      changed = true;
    }
    if (k.has("KeyF")) {
      euler.current.x = THREE.MathUtils.clamp(euler.current.x - pitchDelta, -Math.PI / 2.4, Math.PI / 2.4);
      changed = true;
    }

    if (changed) camera.quaternion.setFromEuler(euler.current);
  });

  return null;
}
