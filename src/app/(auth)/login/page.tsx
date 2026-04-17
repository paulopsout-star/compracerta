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
  Car,
  X,
  Users,
  BarChart3,
  Package,
  Settings,
} from "lucide-react";

/* ─── Particles (reduced to 35) ─── */
function Particles() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current; if (!c) return;
    const ctx = c.getContext("2d"); if (!ctx) return;
    let id: number;
    const pts: { x: number; y: number; vx: number; vy: number; r: number; a: number }[] = [];
    const resize = () => { c.width = c.offsetWidth; c.height = c.offsetHeight; };
    resize(); window.addEventListener("resize", resize);
    for (let i = 0; i < 35; i++) pts.push({ x: Math.random() * c.width, y: Math.random() * c.height, vx: (Math.random() - 0.5) * 0.25, vy: (Math.random() - 0.5) * 0.25, r: Math.random() * 1.5 + 0.5, a: Math.random() * 0.3 + 0.05 });
    const draw = () => {
      ctx.clearRect(0, 0, c.width, c.height);
      for (const p of pts) { p.x += p.vx; p.y += p.vy; if (p.x < 0) p.x = c.width; if (p.x > c.width) p.x = 0; if (p.y < 0) p.y = c.height; if (p.y > c.height) p.y = 0; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fillStyle = `rgba(59,130,246,${p.a})`; ctx.fill(); }
      id = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(id); window.removeEventListener("resize", resize); };
  }, []);
  return <canvas ref={ref} className="absolute inset-0 w-full h-full pointer-events-none motion-reduce:hidden" />;
}

/* ─── Glitch text (subtle, smaller) ─── */
function GlitchText({ text, className = "" }: { text: string; className?: string }) {
  return (
    <div className="relative select-none">
      <span className={`block text-white ${className}`} aria-label={text}>{text}</span>
      <span className={`absolute inset-0 block text-[#3B82F6] opacity-50 animate-glitch-1 ${className}`} aria-hidden="true">{text}</span>
      <span className={`absolute inset-0 block text-white/20 animate-glitch-2 ${className}`} aria-hidden="true">{text}</span>
    </div>
  );
}

/* ─── Demo modal ─── */
function DemoModal({ open, onClose, onSelect }: { open: boolean; onClose: () => void; onSelect: (email: string) => void }) {
  if (!open) return null;

  const profiles = [
    { label: "Vendedor", desc: "Cadastra desejos e recebe matches", email: "vendedor@compracerta.com", icon: Users, color: "#2563EB" },
    { label: "Gestor", desc: "Acompanha equipe e relatórios", email: "gestor@compracerta.com", icon: BarChart3, color: "#3B82F6" },
    { label: "Lojista", desc: "Gerencia estoque e recebe leads", email: "lojista@compracerta.com", icon: Package, color: "#60A5FA" },
    { label: "Admin", desc: "Administra plataforma e integrações", email: "admin@compracerta.com", icon: Settings, color: "#93C5FD" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-[16px] shadow-2xl w-full max-w-[400px] p-6 animate-modal-in">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-[18px] font-bold text-[#111827]">Acessar demonstração</h3>
            <p className="text-[13px] text-[#6B7280] mt-0.5">Selecione um perfil para explorar</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[#F3F4F6] text-[#9AA0AB] hover:text-[#5B6370] transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-2">
          {profiles.map((p) => (
            <button
              key={p.email}
              onClick={() => onSelect(p.email)}
              className="w-full flex items-center gap-4 p-4 rounded-[12px] border border-[#E5E7EB] hover:border-[#2563EB]/30 hover:bg-[#F7F8FA] transition-all text-left group"
            >
              <div className="w-10 h-10 rounded-[10px] flex items-center justify-center shrink-0" style={{ backgroundColor: `${p.color}12` }}>
                <p.icon className="w-5 h-5" style={{ color: p.color }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-semibold text-[#111827] group-hover:text-[#2563EB] transition-colors">{p.label}</p>
                <p className="text-[12px] text-[#9AA0AB]">{p.desc}</p>
              </div>
              <svg className="w-4 h-4 text-[#D1D5DB] group-hover:text-[#2563EB] transition-colors shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
            </button>
          ))}
        </div>
      </div>
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
  const [demoOpen, setDemoOpen] = useState(false);

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
    setDemoOpen(false);
    setLoading(true);
    setError("");
    const result = await signIn("credentials", { email: demoEmail, password: "123456", redirect: false });
    if (result?.error) { setError("Erro ao acessar demonstração"); setLoading(false); return; }
    const res = await fetch("/api/auth/session");
    const session = await res.json();
    router.push(`/${session?.user?.role ?? "vendedor"}`);
    router.refresh();
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row overflow-hidden">
      {/* ─── HERO (clean, minimal) ─── */}
      <div className="relative flex-1 bg-gradient-to-br from-[#0A0D12] via-[#0F1219] to-[#141822] overflow-hidden flex flex-col p-8 md:p-12 lg:p-16 min-h-[40vh] lg:min-h-screen">
        {/* Topo texture */}
        <div className="absolute inset-0 opacity-[0.025]" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 30h60M30 0v60' stroke='%23fff' stroke-width='.5' fill='none'/%3E%3C/svg%3E")`, backgroundSize: "60px 60px" }} />

        {/* Two subtle diagonal stripes */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -left-20 top-[30%] w-[600px] h-[2px] bg-gradient-to-r from-transparent via-[#3B82F6]/25 to-transparent rotate-[-18deg]" />
          <div className="absolute -right-20 bottom-[35%] w-[500px] h-[2px] bg-gradient-to-r from-transparent via-[#3B82F6]/15 to-transparent rotate-[-18deg]" />
        </div>

        <Particles />

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-[10px] bg-[#2563EB] flex items-center justify-center shadow-lg shadow-[#2563EB]/25">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.5 2.8C1.4 11.3 1 12.1 1 13v3c0 .6.4 1 1 1h2" />
              <circle cx="7" cy="17" r="2" /><circle cx="17" cy="17" r="2" />
            </svg>
          </div>
          <div>
            <span className="text-[15px] font-bold text-white">Compra Certa</span>
            <span className="text-[11px] text-white/30 ml-2">by Canal do Repasse</span>
          </div>
        </div>

        {/* Headline — clean, centered vertically */}
        <div className="relative z-10 flex-1 flex flex-col justify-center max-w-[520px]">
          <GlitchText text="COMPRA" className="text-[clamp(48px,8vw,80px)] font-black leading-[0.9] tracking-[-2px]" />
          <GlitchText text="CERTA" className="text-[clamp(48px,8vw,80px)] font-black leading-[0.9] tracking-[-2px]" />

          <p className="text-[clamp(15px,1.3vw,18px)] text-white/60 mt-6 leading-relaxed max-w-[420px]">
            O match definitivo entre demanda e estoque na maior rede B2B automotiva do Brasil.
          </p>
        </div>

      </div>

      {/* ─── FORM (focused, clean) ─── */}
      <div className="w-full lg:w-[460px] xl:w-[500px] bg-white flex flex-col justify-center px-8 md:px-12 lg:px-14 py-12 lg:py-0 lg:shadow-[-16px_0_48px_rgba(0,0,0,0.12)] relative z-20">
        <div className="max-w-[360px] mx-auto w-full">
          {/* Title */}
          <div className="mb-10">
            <h2 className="text-[24px] font-bold text-[#111827]">Bem-vindo de volta</h2>
            <p className="text-[14px] text-[#6B7280] mt-1.5">
              Acesse sua conta e encontre o carro certo
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2.5 p-3.5 mb-6 rounded-[10px] bg-red-50 border border-red-100 text-[13px] text-[#E5484D] animate-shake">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="email" className="text-[13px] font-medium text-[#374151]">
                E-mail ou CNPJ
              </label>
              <input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full h-[48px] px-4 rounded-[10px] bg-[#F9FAFB] text-[14px] text-[#111827] placeholder:text-[#C1C7D0] outline-none focus:ring-2 focus:ring-[#2563EB]/25 focus:bg-white transition-all border border-[#E5E7EB] focus:border-[#2563EB]/40"
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label htmlFor="password" className="text-[13px] font-medium text-[#374151]">Senha</label>
                <button type="button" className="text-[12px] text-[#2563EB] font-medium hover:underline">
                  Esqueci minha senha
                </button>
              </div>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full h-[48px] px-4 pr-12 rounded-[10px] bg-[#F9FAFB] text-[14px] text-[#111827] placeholder:text-[#C1C7D0] outline-none focus:ring-2 focus:ring-[#2563EB]/25 focus:bg-white transition-all border border-[#E5E7EB] focus:border-[#2563EB]/40"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#C1C7D0] hover:text-[#6B7280] transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <input type="checkbox" id="remember" className="w-4 h-4 rounded border-[#D1D5DB] text-[#2563EB] focus:ring-[#2563EB]/25 cursor-pointer" />
              <label htmlFor="remember" className="text-[13px] text-[#6B7280] cursor-pointer">Manter conectado</label>
            </div>

            {/* PRIMARY CTA — maximum prominence */}
            <button
              type="submit"
              disabled={loading}
              className="w-full h-[52px] rounded-[12px] bg-[#2563EB] text-white text-[16px] font-semibold hover:bg-[#1D4ED8] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-[0_4px_16px_rgba(37,99,235,0.3)] hover:shadow-[0_8px_24px_rgba(37,99,235,0.35)]"
            >
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Entrar"}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-4 my-8">
            <div className="flex-1 h-px bg-[#E5E7EB]" />
            <span className="text-[12px] text-[#C1C7D0] font-medium">ou</span>
            <div className="flex-1 h-px bg-[#E5E7EB]" />
          </div>

          {/* SSO */}
          <button className="w-full h-[48px] rounded-[10px] border border-[#E5E7EB] text-[14px] font-medium text-[#374151] hover:border-[#2563EB]/40 hover:text-[#2563EB] transition-all flex items-center justify-center gap-2.5">
            <Shield className="w-4 h-4" />
            Entrar com Canal do Repasse
          </button>

          {/* Solicitar acesso + Demo discreto */}
          <div className="mt-8 space-y-4 text-center">
            <p className="text-[13px] text-[#6B7280]">
              Ainda não faz parte da rede?{" "}
              <button className="text-[#2563EB] font-semibold hover:underline">
                Solicite acesso
              </button>
            </p>

            <button
              onClick={() => setDemoOpen(true)}
              className="text-[12px] text-[#C1C7D0] hover:text-[#9AA0AB] transition-colors"
            >
              Acessar demonstração
            </button>
          </div>

          {/* Security seals */}
          <div className="flex items-center justify-center gap-5 mt-8 pt-6 border-t border-[#F3F4F6]">
            <span className="flex items-center gap-1.5 text-[11px] text-[#C1C7D0]">
              <Lock className="w-3 h-3" />Conexão segura
            </span>
            <span className="flex items-center gap-1.5 text-[11px] text-[#C1C7D0]">
              <Shield className="w-3 h-3" />LGPD
            </span>
          </div>
        </div>
      </div>

      {/* Demo modal */}
      <DemoModal open={demoOpen} onClose={() => setDemoOpen(false)} onSelect={handleDemoLogin} />

      {/* CSS */}
      <style jsx global>{`
        @keyframes glitch-1 { 0%,93%,100%{transform:translate(0);opacity:0} 94%{transform:translate(-2px,1px);opacity:.5} 95%{transform:translate(1px,-1px);opacity:.3} 96%{transform:translate(0);opacity:0} }
        @keyframes glitch-2 { 0%,91%,100%{transform:translate(0);opacity:0} 92%{transform:translate(2px,-1px);opacity:.2} 93%{transform:translate(-1px,1px);opacity:.15} 94%{transform:translate(0);opacity:0} }
        .animate-glitch-1 { animation: glitch-1 10s infinite; }
        .animate-glitch-2 { animation: glitch-2 10s infinite 0.5s; }
        @keyframes shake { 0%,100%{transform:translateX(0)} 25%{transform:translateX(-4px)} 75%{transform:translateX(4px)} }
        .animate-shake { animation: shake 0.3s ease; }
        @keyframes modal-in { from{opacity:0;transform:scale(0.95) translateY(8px)} to{opacity:1;transform:scale(1) translateY(0)} }
        .animate-modal-in { animation: modal-in 0.2s ease-out; }
        .motion-reduce\\:hidden { display: block; }
        @media (prefers-reduced-motion: reduce) {
          .animate-glitch-1,.animate-glitch-2{animation:none!important;opacity:0!important}
          .animate-ping{animation:none!important}
          .motion-reduce\\:hidden{display:none!important}
          canvas{display:none!important}
        }
      `}</style>
    </div>
  );
}
