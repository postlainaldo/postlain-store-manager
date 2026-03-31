"use client";

/**
 * AudioUnlocker — mounts once, listens for first user interaction,
 * then calls unlockAudio() to wake the AudioContext from suspended state.
 * Must be rendered inside the app shell so it's always present.
 */

import { useEffect } from "react";
import { unlockAudio } from "@/hooks/useSFX";

export default function AudioUnlocker() {
  useEffect(() => {
    const unlock = () => {
      unlockAudio();
      // Once unlocked, remove listeners — no need to keep listening
      window.removeEventListener("click",      unlock, true);
      window.removeEventListener("touchstart", unlock, true);
      window.removeEventListener("keydown",    unlock, true);
    };

    window.addEventListener("click",      unlock, true);
    window.addEventListener("touchstart", unlock, true);
    window.addEventListener("keydown",    unlock, true);

    return () => {
      window.removeEventListener("click",      unlock, true);
      window.removeEventListener("touchstart", unlock, true);
      window.removeEventListener("keydown",    unlock, true);
    };
  }, []);

  return null;
}
