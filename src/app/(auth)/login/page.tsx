"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Car, Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    // Simulated login — replace with NextAuth
    setTimeout(() => {
      setLoading(false);
      router.push("/vendedor");
    }, 1000);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-primary/5 to-background p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Brand */}
        <div className="flex flex-col items-center gap-3">
          <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-primary text-primary-foreground shadow-lg">
            <Car className="w-7 h-7" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold tracking-tight">Compra Certa</h1>
            <p className="text-sm text-muted-foreground">Canal do Repasse</p>
          </div>
        </div>

        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-lg">Entrar no sistema</CardTitle>
            <CardDescription>
              Use suas credenciais do Canal do Repasse
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label htmlFor="password">Senha</Label>
                  <Link
                    href="#"
                    className="text-xs text-primary hover:underline"
                  >
                    Esqueci minha senha
                  </Link>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Entrar
              </Button>
            </form>

            {/* Demo access */}
            <div className="mt-6 pt-4 border-t">
              <p className="text-xs text-center text-muted-foreground mb-3">
                Acesso rápido para demonstração
              </p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: "Vendedor", href: "/vendedor" },
                  { label: "Gestor", href: "/gestor" },
                  { label: "Lojista", href: "/lojista" },
                  { label: "Admin", href: "/admin" },
                ].map((item) => (
                  <Link key={item.href} href={item.href}>
                    <Button variant="outline" size="sm" className="w-full text-xs">
                      {item.label}
                    </Button>
                  </Link>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <p className="text-xs text-center text-muted-foreground">
          &copy; {new Date().getFullYear()} Canal do Repasse. Todos os direitos reservados.
        </p>
      </div>
    </div>
  );
}
