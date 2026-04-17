"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Eye, EyeOff, Loader2, AlertCircle } from "lucide-react";

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

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      setError("E-mail ou senha incorretos");
      setLoading(false);
      return;
    }

    // Fetch session to get role and redirect
    const res = await fetch("/api/auth/session");
    const session = await res.json();
    const role = session?.user?.role ?? "vendedor";
    router.push(`/${role}`);
    router.refresh();
  }

  async function handleDemoLogin(demoEmail: string) {
    setLoading(true);
    setError("");
    const result = await signIn("credentials", {
      email: demoEmail,
      password: "123456",
      redirect: false,
    });

    if (result?.error) {
      setError("Erro no login demo");
      setLoading(false);
      return;
    }

    const res = await fetch("/api/auth/session");
    const session = await res.json();
    const role = session?.user?.role ?? "vendedor";
    router.push(`/${role}`);
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F7F8FA] p-4">
      <div className="w-full max-w-[400px] space-y-8">
        {/* Brand */}
        <div className="flex flex-col items-center gap-3">
          <div className="flex items-center justify-center w-14 h-14 rounded-[14px] bg-[#2563EB] text-white shadow-[var(--shadow-md)]">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.5 2.8C1.4 11.3 1 12.1 1 13v3c0 .6.4 1 1 1h2" />
              <circle cx="7" cy="17" r="2" />
              <circle cx="17" cy="17" r="2" />
            </svg>
          </div>
          <div className="text-center">
            <h1 className="text-[24px] font-bold text-[#111827]">Compra Certa</h1>
            <p className="text-[13px] text-[#9AA0AB]">by Canal do Repasse</p>
          </div>
        </div>

        {/* Card */}
        <div className="card-tradox">
          <div className="text-center mb-6">
            <h2 className="text-[18px] font-semibold text-[#111827]">Entrar no sistema</h2>
            <p className="text-[13px] text-[#9AA0AB] mt-1">
              Use suas credenciais do Canal do Repasse
            </p>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 mb-4 rounded-[10px] bg-red-50 text-[13px] text-[#E5484D]">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="email" className="text-[13px] font-medium text-[#111827]">
                E-mail
              </label>
              <input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full h-[44px] px-4 rounded-[10px] bg-[#F7F8FA] border-none text-[14px] text-[#111827] placeholder:text-[#9AA0AB] outline-none focus:ring-2 focus:ring-[#2563EB]/20 transition-shadow"
              />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label htmlFor="password" className="text-[13px] font-medium text-[#111827]">
                  Senha
                </label>
                <Link href="#" className="text-[12px] text-[#2563EB] font-medium hover:underline">
                  Esqueci minha senha
                </Link>
              </div>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full h-[44px] px-4 pr-11 rounded-[10px] bg-[#F7F8FA] border-none text-[14px] text-[#111827] placeholder:text-[#9AA0AB] outline-none focus:ring-2 focus:ring-[#2563EB]/20 transition-shadow"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9AA0AB] hover:text-[#5B6370] transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full h-[44px] rounded-[10px] bg-[#2563EB] text-white text-[14px] font-medium hover:brightness-90 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Entrar
            </button>
          </form>

          {/* Demo access */}
          <div className="mt-6 pt-5 border-t border-[#EEF0F3]">
            <p className="text-[12px] text-center text-[#9AA0AB] mb-3">
              Acesso demo (senha: 123456)
            </p>
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
                  className="h-[36px] rounded-[8px] border border-[#E8EAEE] text-[13px] font-medium text-[#5B6370] hover:border-[#2563EB] hover:text-[#2563EB] transition-colors disabled:opacity-50"
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <p className="text-[12px] text-center text-[#9AA0AB]">
          &copy; {new Date().getFullYear()} Canal do Repasse. Todos os direitos reservados.
        </p>
      </div>
    </div>
  );
}
