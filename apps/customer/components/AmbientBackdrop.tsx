"use client";
import { useEffect, useRef } from "react";

// Lightweight canvas animation - soft drifting embers/particles behind the
// hero. Deliberately NOT a full WebGL/three.js scene: this is a QR-scan
// mobile page where load speed matters more than a 3D showcase, and a 2D
// canvas gives most of the visual "premium" feel at a fraction of the
// bundle cost and battery drain.
export function AmbientBackdrop() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = (canvas.width = canvas.offsetWidth);
    let height = (canvas.height = canvas.offsetHeight);

    const particles = Array.from({ length: 28 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      r: 1 + Math.random() * 2.5,
      speed: 0.15 + Math.random() * 0.35,
      drift: (Math.random() - 0.5) * 0.3,
      opacity: 0.15 + Math.random() * 0.25
    }));

    let frame: number;
    function tick() {
      ctx!.clearRect(0, 0, width, height);
      for (const p of particles) {
        p.y -= p.speed;
        p.x += p.drift;
        if (p.y < -10) { p.y = height + 10; p.x = Math.random() * width; }
        ctx!.beginPath();
        ctx!.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx!.fillStyle = `rgba(227, 160, 8, ${p.opacity})`; // turmeric-400
        ctx!.fill();
      }
      frame = requestAnimationFrame(tick);
    }
    tick();

    function onResize() {
      if (!canvas) return;
      width = canvas.width = canvas.offsetWidth;
      height = canvas.height = canvas.offsetHeight;
    }
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return <canvas ref={ref} className="pointer-events-none absolute inset-0 h-full w-full" />;
}
