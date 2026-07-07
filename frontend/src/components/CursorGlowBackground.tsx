"use client";

import { useCursorGlow } from "./useCursorGlow";

export default function CursorGlowBackground() {
  useCursorGlow();

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="cursor-glow" />
      <div className="cursor-glow cursor-glow-2" />
      <div className="cursor-glow cursor-glow-3" />
    </div>
  );
}
