"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import {
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  Lock,
  Shield,
  Zap,
  Target,
  Car,
} from "lucide-react";

/* ─── Animated particles background ─── */
function Particles() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    const particles: { x: number; y: number; vx: number; vy: number; r: number; a: number }[] = [];
    const resize = () => { canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight; };
    resize();
    window.addEventListener("resize", resize);

    for (let i = 0; i < 60; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        r: Math.random() * 2 + 0.5,
        a: Math.random() * 0.4 + 0.1,
      });
    }

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const p of particles) {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x = canvas.width; if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height; if (p.y > canvas.height) p.y = 0;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(59, 130, 246, ${p.a})`;
        ctx.fill();
      }
      animId = requestAnimationFrame(draw);
    };
    draw();

    return () => { cancelAnimationFrame(animId); window.removeEventListener("resize", resize); };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />;
}

/* ─── Glitch headline ─── */
function GlitchText({ text }: { text: string }) {
  return (
    <div className="relative select-none">
      <h1
        className="text-[clamp(56px,10vw,120px)] font-black leading-[0.9] tracking-[-3px] text-white"
        aria-label={text}
      >
        {text}
      </h1>
      {/* Glitch layers */}
      <h1
        className="absolute inset-0 text-[clamp(56px,10vw,120px)] font-black leading-[0.9] tracking-[-3px] text-[#3B82F6] opacity-60 animate-glitch-1"
        aria-hidden="true"
      >
        {text}
      </h1>
      <h1
        className="absolute inset-0 text-[clamp(56px,10vw,120px)] font-black leading-[0.9] tracking-[-3px] text-white/30 animate-glitch-2"
        aria-hidden="true"
      >
        {text}
      </h1>
    </div>
  );
}

/* ─── Vehicle brand cards ─── */
const BRAND_CARDS = [
  { brand: "Honda Civic", caption: "ALTA DEMANDA", initial: "H", color: "#E40521" },
  { brand: "Toyota Corolla", caption: "TOP MATCH DA SEMANA", initial: "T", color: "#1A1A1A" },
  { brand: "Jeep Compass", caption: "MAIS PROCURADO", initial: "J", color: "#3D5A1E" },
  { brand: "VW T-Cross", caption: "TENDÊNCIA 2026", initial: "V", color: "#001E50" },
];

function BrandCards() {
  return (
    <div className="flex gap-4 overflow-x-auto pb-4 px-1 -mx-1 snap-x snap-mandatory scrollbar-hide">
      {BRAND_CARDS.map((card, i) => (
        <div
          key={card.brand}
          className="shrink-0 w-[200px] md:w-[220px] bg-white rounded-[14px] p-5 shadow-lg shadow-black/20 snap-start transform hover:-translate-y-1 hover:shadow-xl hover:shadow-[#3B82F6]/10 transition-all duration-300"
          style={{
            transform: `rotate(${-3 + i * 1.5}deg)`,
            animationDelay: `${i * 150}ms`,
          }}
        >
          <div className="flex items-center justify-between mb-3">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-white text-[13px] font-bold"
              style={{ backgroundColor: card.color }}
            >
              {card.initial}
            </div>
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#3B82F6] opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#3B82F6]" />
            </span>
          </div>
          <p className="text-[16px] font-bold text-[#111827]">{card.brand}</p>
          <p className="text-[10px] font-semibold text-[#3B82F6] uppercase tracking-[1.5px] mt-1">
            {card.caption}
          </p>
        </div>
      ))}
    </div>
  );
}

/* ─── Concentric rings ─── */
function ConcentricRings() {
  return (
    <div className="absolute right-[10%] top-1/2 -translate-y-1/2 hidden lg:block pointer-events-none">
      {[180, 260, 340].map((size, i) => (
        <div
          key={size}
          className="absolute rounded-full border border-dashed border-[#3B82F6]/20 animate-spin-slow"
          style={{
            width: size,
            height: size,
            top: `calc(50% - ${size / 2}px)`,
            left: `calc(50% - ${size / 2}px)`,
            animationDuration: `${20 + i * 10}s`,
          }}
        />
      ))}
      {/* Central glow */}
      <div className="absolute w-32 h-32 rounded-full bg-[#3B82F6]/10 blur-3xl top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
      {/* Car icon in center */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
        <div className="w-20 h-20 rounded-full bg-[#3B82F6]/20 backdrop-blur-md flex items-center justify-center border border-[#3B82F6]/30">
          <Car className="w-10 h-10 text-[#3B82F6]" />
        </div>
      </div>
    </div>
  );
}

/* ─── Stats badges ─── */
function StatBadges() {
  return (
    <div className="hidden lg:flex flex-col gap-3 absolute left-8 bottom-[220px]">
      {[
        { icon: Zap, text: "2.847 desejos ativos agora" },
        { icon: Target, text: "87% de taxa de match" },
        { icon: Car, text: "12.500+ veículos na rede" },
      ].map((stat) => (
        <div
          key={stat.text}
          className="flex items-center gap-2 px-3 py-2 rounded-full bg-white/5 backdrop-blur-sm border border-white/10 text-[12px] text-white/70"
        >
          <stat.icon className="w-3.5 h-3.5 text-[#3B82F6]" />
          {stat.text}
        </div>
      ))}
    </div>
  );
}

/* ─── Main page ─── */
export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const result = await signIn("credentials", { email, password, redirect: false });
    if (result?.error) { setError("E-mail ou senha incorretos"); setLoading(false); return; }
    const res = await fetch("/api/auth/session");
    const session = await res.json();
    router.push(`/${session?.user?.role ?? "vendedor"}`);
    router.refresh();
  }

  async function handleDemoLogin(demoEmail: string) {
    setLoading(true); setError("");
    const result = await signIn("credentials", { email: demoEmail, password: "123456", redirect: false });
    if (result?.error) { setError("Erro no login demo"); setLoading(false); return; }
    const res = await fetch("/api/auth/session");
    const session = await res.json();
    router.push(`/${session?.user?.role ?? "vendedor"}`);
    router.refresh();
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row overflow-hidden">
      {/* ─── HERO (dark side) ─── */}
      <div className="relative flex-1 bg-gradient-to-br from-[#0A0D12] via-[#0F1219] to-[#141822] overflow-hidden flex flex-col justify-between p-6 md:p-10 lg:p-12 min-h-[50vh] lg:min-h-screen">
        {/* Topo map texture */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 30h60M30 0v60' stroke='%23fff' stroke-width='.5' fill='none'/%3E%3C/svg%3E")`,
            backgroundSize: "60px 60px",
          }}
        />

        {/* Diagonal stripes */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -left-20 top-[20%] w-[500px] h-[3px] bg-gradient-to-r from-transparent via-[#3B82F6]/40 to-transparent rotate-[-18deg]" />
          <div className="absolute -left-10 top-[35%] w-[600px] h-[2px] bg-gradient-to-r from-transparent via-[#3B82F6]/20 to-transparent rotate-[-18deg]" />
          <div className="absolute -right-20 bottom-[30%] w-[500px] h-[3px] bg-gradient-to-r from-transparent via-[#3B82F6]/30 to-transparent rotate-[-18deg]" />
          {/* Large diagonal accent */}
          <div className="absolute -left-40 top-[60%] w-[800px] h-[80px] bg-gradient-to-r from-[#3B82F6]/5 via-[#3B82F6]/10 to-transparent rotate-[-18deg] blur-sm" />
        </div>

        <Particles />
        <ConcentricRings />
        <StatBadges />

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-[10px] bg-[#2563EB] flex items-center justify-center shadow-lg shadow-[#2563EB]/30">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.5 2.8C1.4 11.3 1 12.1 1 13v3c0 .6.4 1 1 1h2" />
              <circle cx="7" cy="17" r="2" /><circle cx="17" cy="17" r="2" />
            </svg>
          </div>
          <div>
            <span className="text-[16px] font-bold text-white">Compra Certa</span>
            <span className="text-[11px] text-white/40 ml-2">by Canal do Repasse</span>
          </div>
        </div>

        {/* Headline */}
        <div className="relative z-10 flex-1 flex flex-col justify-center py-8 lg:py-0 lg:max-w-[600px]">
          <GlitchText text="COMPRA" />
          <GlitchText text="CERTA" />
          <div className="mt-6 space-y-3">
            <p className="text-[clamp(16px,1.5vw,20px)] text-white/80 font-medium">
              O match definitivo entre demanda e estoque
            </p>
            <p className="text-[14px] text-white/40 max-w-[480px] leading-relaxed">
              Cadastre o desejo do seu cliente. Deixe a rede encontrar o carro certo.
              Receba o match no WhatsApp.
            </p>
          </div>
        </div>

        {/* Brand cards + region label */}
        <div className="relative z-10 space-y-4">
          <BrandCards />
          <p className="text-[11px] text-white/20 uppercase tracking-[2px] font-medium">
            Minas Gerais &bull; Goiás &bull; Expansão Nacional &nbsp;&mdash;&nbsp; 19°55&apos;S 43°56&apos;W
          </p>
        </div>
      </div>

      {/* ─── FORM (light side) ─── */}
      <div className="w-full lg:w-[440px] xl:w-[480px] bg-white flex flex-col justify-center px-8 md:px-12 py-10 lg:py-0 lg:shadow-[-20px_0_60px_rgba(0,0,0,0.15)] relative z-20">
        <div className="max-w-[380px] mx-auto w-full">
          {/* Title */}
          <div className="mb-8">
            <h2 className="text-[24px] font-bold text-[#111827]">Bem-vindo de volta</h2>
            <p className="text-[14px] text-[#6B7280] mt-1">
              Acesse sua conta e encontre o carro certo
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 p-3 mb-5 rounded-[10px] bg-red-50 text-[13px] text-[#E5484D] animate-shake">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-1.5">
              <label htmlFor="email" className="text-[13px] font-medium text-[#111827]">
                E-mail ou CNPJ
              </label>
              <input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full h-[48px] px-4 rounded-[10px] bg-[#F7F8FA] text-[14px] text-[#111827] placeholder:text-[#9AA0AB] outline-none focus:ring-2 focus:ring-[#3B82F6]/30 focus:bg-white transition-all border border-transparent focus:border-[#3B82F6]/20"
              />
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label htmlFor="password" className="text-[13px] font-medium text-[#111827]">Senha</label>
                <button type="button" className="text-[12px] text-[#3B82F6] font-medium hover:underline">Esqueci minha senha</button>
              </div>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full h-[48px] px-4 pr-12 rounded-[10px] bg-[#F7F8FA] text-[14px] text-[#111827] placeholder:text-[#9AA0AB] outline-none focus:ring-2 focus:ring-[#3B82F6]/30 focus:bg-white transition-all border border-transparent focus:border-[#3B82F6]/20"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#9AA0AB] hover:text-[#5B6370]"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input type="checkbox" id="remember" className="w-4 h-4 rounded border-[#D1D5DB] text-[#2563EB] focus:ring-[#3B82F6]/30" />
              <label htmlFor="remember" className="text-[13px] text-[#6B7280]">Manter conectado</label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-[48px] rounded-[10px] bg-[#2563EB] text-white text-[15px] font-semibold hover:bg-[#1D4ED8] transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-[#2563EB]/20 hover:shadow-xl hover:shadow-[#2563EB]/30"
            >
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Entrar"}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-[#E5E7EB]" />
            <span className="text-[12px] text-[#9AA0AB]">ou</span>
            <div className="flex-1 h-px bg-[#E5E7EB]" />
          </div>

          {/* SSO */}
          <button className="w-full h-[48px] rounded-[10px] border border-[#E5E7EB] text-[14px] font-medium text-[#374151] hover:border-[#2563EB] hover:text-[#2563EB] transition-all flex items-center justify-center gap-2">
            <Shield className="w-4 h-4" />
            Entrar com Canal do Repasse
          </button>

          {/* Demo */}
          <div className="mt-6 pt-5 border-t border-[#F3F4F6]">
            <p className="text-[12px] text-center text-[#9AA0AB] mb-3">Demo (senha: 123456)</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "Vendedor", email: "vendedor@compracerta.com" },
                { label: "Gestor", email: "gestor@compracerta.com" },
                { label: "Lojista", email: "lojista@compracerta.com" },
                { label: "Admin", email: "admin@compracerta.com" },
              ].map((item) => (
                <button
                  key={item.email}
                  onClick={() => handleDemoLogin(item.email)}
                  disabled={loading}
                  className="h-[36px] rounded-[8px] border border-[#E5E7EB] text-[12px] font-medium text-[#6B7280] hover:border-[#3B82F6] hover:text-[#3B82F6] hover:bg-[#3B82F6]/5 transition-all disabled:opacity-50"
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="mt-6 text-center">
            <p className="text-[13px] text-[#6B7280]">
              Ainda não faz parte da rede?{" "}
              <button className="text-[#2563EB] font-semibold hover:underline">
                Solicite acesso
              </button>
            </p>
          </div>

          <div className="flex items-center justify-center gap-4 mt-6 text-[11px] text-[#9AA0AB]">
            <span className="flex items-center gap-1"><Lock className="w-3 h-3" />Conexão segura</span>
            <span className="flex items-center gap-1"><Shield className="w-3 h-3" />LGPD</span>
          </div>
        </div>
      </div>

      {/* ─── CSS Animations ─── */}
      <style jsx global>{`
        @keyframes glitch-1 {
          0%, 92%, 100% { transform: translate(0); opacity: 0; }
          93% { transform: translate(-3px, 1px); opacity: 0.6; }
          94% { transform: translate(2px, -1px); opacity: 0.4; }
          95% { transform: translate(-1px, 2px); opacity: 0.6; }
          96% { transform: translate(0); opacity: 0; }
        }
        @keyframes glitch-2 {
          0%, 90%, 100% { transform: translate(0); opacity: 0; }
          91% { transform: translate(3px, -1px); opacity: 0.3; }
          92% { transform: translate(-2px, 1px); opacity: 0.2; }
          93% { transform: translate(1px, -2px); opacity: 0.3; }
          94% { transform: translate(0); opacity: 0; }
        }
        .animate-glitch-1 { animation: glitch-1 8s infinite; }
        .animate-glitch-2 { animation: glitch-2 8s infinite; animation-delay: 0.5s; }
        @keyframes spin-slow { to { transform: rotate(360deg); } }
        .animate-spin-slow { animation: spin-slow 20s linear infinite; }
        @keyframes shake { 0%,100%{transform:translateX(0)} 25%{transform:translateX(-4px)} 75%{transform:translateX(4px)} }
        .animate-shake { animation: shake 0.3s ease; }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        @media (prefers-reduced-motion: reduce) {
          .animate-glitch-1, .animate-glitch-2 { animation: none !important; opacity: 0 !important; }
          .animate-spin-slow { animation: none !important; }
          .animate-ping { animation: none !important; }
          .animate-pulse { animation: none !important; }
          canvas { display: none !important; }
        }
      `}</style>
    </div>
  );
}
