"use client";

import { useEffect, useRef } from "react";

const CHARACTERS = "01";

export function Background() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    const fontSize = 16;
    let columns = Math.floor(window.innerWidth / fontSize);
    let drops = new Array(columns).fill(0);

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      columns = Math.floor(canvas.width / fontSize);
      drops = new Array(columns).fill(0);
    };

    const draw = () => {
      ctx.fillStyle = "rgba(2, 6, 23, 0.15)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = "rgba(16, 185, 129, 0.9)";
      ctx.font = `${fontSize}px "Courier New", monospace`;

      drops.forEach((drop, column) => {
        const text = CHARACTERS[Math.floor(Math.random() * CHARACTERS.length)];
        const x = column * fontSize;
        const y = drop * fontSize;

        ctx.fillText(text, x, y);

        if (y > canvas.height && Math.random() > 0.975) {
          drops[column] = 0;
        } else {
          drops[column] = drop + 1;
        }
      });

      animationFrameId = requestAnimationFrame(draw);
    };

    resize();
    draw();

    window.addEventListener("resize", resize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <canvas ref={canvasRef} className="h-full w-full" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(15,23,42,0.8),transparent_55%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(15,23,42,0.3)_0%,transparent_45%,transparent_55%,rgba(15,23,42,0.3)_100%)]" />
    </div>
  );
}
