"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/* ─── Animated particles (reused from login) ─── */
export function Particles({ count = 50 }: { count?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let animId: number;
    const pts: { x: number; y: number; vx: number; vy: number; r: number; a: number }[] = [];
    const resize = () => { canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight; };
    resize(); window.addEventListener("resize", resize);
    for (let i = 0; i < count; i++) pts.push({ x: Math.random() * canvas.width, y: Math.random() * canvas.height, vx: (Math.random() - 0.5) * 0.3, vy: (Math.random() - 0.5) * 0.3, r: Math.random() * 2 + 0.5, a: Math.random() * 0.35 + 0.05 });
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const p of pts) {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x = canvas.width; if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height; if (p.y > canvas.height) p.y = 0;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(59,130,246,${p.a})`; ctx.fill();
      }
      animId = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(animId); window.removeEventListener("resize", resize); };
  }, [count]);
  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none motion-reduce:hidden" />;
}

/* ─── Glitch text ─── */
export function GlitchText({ text, className = "" }: { text: string; className?: string }) {
  return (
    <div className="relative select-none">
      <span className={`block text-white ${className}`} aria-label={text}>{text}</span>
      <span className={`absolute inset-0 block text-[#3B82F6] opacity-60 animate-glitch-1 ${className}`} aria-hidden="true">{text}</span>
      <span className={`absolute inset-0 block text-white/30 animate-glitch-2 ${className}`} aria-hidden="true">{text}</span>
    </div>
  );
}

/* ─── Eyebrow label ─── */
export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <div className="w-[3px] h-5 bg-[#3B82F6] rounded-full" />
      <span className="text-[13px] font-semibold uppercase tracking-[2px] text-[#3B82F6]">{children}</span>
    </div>
  );
}

/* ─── Scroll-triggered fade in ─── */
export function FadeIn({ children, className = "", delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } }, { threshold: 0.15 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return (
    <div ref={ref} className={`transition-all duration-700 ease-out ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"} ${className}`} style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  );
}

/* ─── Animated counter ─── */
export function Counter({ target, suffix = "", prefix = "" }: { target: number; suffix?: string; prefix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [val, setVal] = useState(0);
  const [started, setStarted] = useState(false);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setStarted(true); obs.disconnect(); } }, { threshold: 0.5 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  useEffect(() => {
    if (!started) return;
    const duration = 1500; const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(Math.round(target * eased));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [started, target]);
  return <span ref={ref}>{prefix}{val.toLocaleString("pt-BR")}{suffix}</span>;
}

/* ─── Diagonal background stripe ─── */
export function DiagonalStripes() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div className="absolute -left-20 top-[20%] w-[500px] h-[3px] bg-gradient-to-r from-transparent via-[#3B82F6]/40 to-transparent rotate-[-18deg]" />
      <div className="absolute -left-10 top-[40%] w-[600px] h-[2px] bg-gradient-to-r from-transparent via-[#3B82F6]/20 to-transparent rotate-[-18deg]" />
      <div className="absolute -right-20 bottom-[25%] w-[500px] h-[3px] bg-gradient-to-r from-transparent via-[#3B82F6]/30 to-transparent rotate-[-18deg]" />
      <div className="absolute -left-40 top-[65%] w-[800px] h-[80px] bg-gradient-to-r from-[#3B82F6]/5 via-[#3B82F6]/10 to-transparent rotate-[-18deg] blur-sm" />
    </div>
  );
}

/* ─── Grid texture (light sections) ─── */
export function GridTexture() {
  return (
    <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 30h60M30 0v60' stroke='%23000' stroke-width='.5' fill='none'/%3E%3C/svg%3E")`, backgroundSize: "60px 60px" }} />
  );
}

/* ─── Topo map texture (dark sections) ─── */
export function TopoTexture() {
  return (
    <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 30h60M30 0v60' stroke='%23fff' stroke-width='.5' fill='none'/%3E%3C/svg%3E")`, backgroundSize: "60px 60px" }} />
  );
}

/* ─── Global glitch CSS ─── */
export function GlitchStyles() {
  return (
    <style jsx global>{`
      @keyframes glitch-1 { 0%,92%,100%{transform:translate(0);opacity:0} 93%{transform:translate(-3px,1px);opacity:.6} 94%{transform:translate(2px,-1px);opacity:.4} 95%{transform:translate(-1px,2px);opacity:.6} 96%{transform:translate(0);opacity:0} }
      @keyframes glitch-2 { 0%,90%,100%{transform:translate(0);opacity:0} 91%{transform:translate(3px,-1px);opacity:.3} 92%{transform:translate(-2px,1px);opacity:.2} 93%{transform:translate(1px,-2px);opacity:.3} 94%{transform:translate(0);opacity:0} }
      .animate-glitch-1 { animation: glitch-1 8s infinite; }
      .animate-glitch-2 { animation: glitch-2 8s infinite 0.5s; }
      @keyframes spin-slow { to { transform: rotate(360deg); } }
      .animate-spin-slow { animation: spin-slow 20s linear infinite; }
      @media (prefers-reduced-motion: reduce) { .animate-glitch-1,.animate-glitch-2{animation:none!important;opacity:0!important} .animate-spin-slow{animation:none!important} .animate-ping{animation:none!important} .animate-pulse{animation:none!important} .motion-reduce\\:hidden{display:none!important} }
    `}</style>
  );
}
