"use client";

import { useEffect } from "react";

export function useCursorGlow() {
  useEffect(() => {
    const root = document.documentElement;

    const move = (e: MouseEvent) => {
      root.style.setProperty("--mouse-x", `${e.clientX}px`);
      root.style.setProperty("--mouse-y", `${e.clientY}px`);
    };

    window.addEventListener("mousemove", move);
    return () => window.removeEventListener("mousemove", move);
  }, []);
}
