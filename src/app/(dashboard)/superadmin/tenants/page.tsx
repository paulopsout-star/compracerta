"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Building2, Plus, Loader2, ChevronRight, Globe } from "lucide-react";

interface TenantRow {
  id: string;
  name: string;
  slug: string;
  primaryDomain: string | null;
  supportEmail: string | null;
  active: boolean;
  createdAt: string;
  kpis: { users: number; wishes: number; offers: number };
}

interface CreateForm {
  name: string;
  slug: string;
  primaryDomain: string;
  supportEmail: string;
  appName: string;
  tagline: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
}

const EMPTY_FORM: CreateForm = {
  name: "",
  slug: "",
  primaryDomain: "",
  supportEmail: "",
  appName: "",
  tagline: "",
  primaryColor: "#2563EB",
  secondaryColor: "#111827",
  accentColor: "#10B981",
};

export default function SuperadminTenantsPage() {
  const [tenants, setTenants] = useState<TenantRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<CreateForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/admin/tenants");
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? "Erro ao carregar");
      setTenants(d.data ?? []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao carregar tenants");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function openCreate() {
    setForm(EMPTY_FORM);
    setCreating(true);
  }

  async function handleCreate() {
    if (!form.name.trim()) return toast.error("Nome obrigatório");
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        name: form.name.trim(),
        primaryColor: form.primaryColor,
        secondaryColor: form.secondaryColor,
        accentColor: form.accentColor,
      };
      if (form.slug.trim())          payload.slug = form.slug.trim();
      if (form.primaryDomain.trim()) payload.primaryDomain = form.primaryDomain.trim();
      if (form.supportEmail.trim())  payload.supportEmail = form.supportEmail.trim();
      if (form.appName.trim())       payload.appName = form.appName.trim();
      if (form.tagline.trim())       payload.tagline = form.tagline.trim();

      const r = await fetch("/api/admin/tenants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? `Erro ${r.status}`);
      toast.success("Tenant criado");
      setCreating(false);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao criar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <DashboardLayout role="superadmin" subtitle="Gestão de empresas e white label">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Building2 className="w-5 h-5 text-[#2563EB]" />
            <h2 className="text-[20px] font-semibold text-[#111827]">Tenants</h2>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[13px] text-[#9AA0AB]">{tenants.length} empresas</span>
            <Button onClick={openCreate} size="sm" className="gap-1.5">
              <Plus className="w-4 h-4" /> Novo tenant
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-[#9AA0AB]" /></div>
        ) : tenants.length === 0 ? (
          <div className="card-tradox text-center py-12 text-[14px] text-[#9AA0AB]">
            Nenhum tenant cadastrado.
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {tenants.map((t) => (
              <Link
                key={t.id}
                href={`/superadmin/tenants/${t.id}`}
                className="card-tradox hover:border-[var(--primary)]/30 hover:shadow-sm transition-all flex items-start justify-between gap-3 group"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-[15px] font-semibold text-[#111827] truncate">{t.name}</p>
                    {!t.active && (
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-red-50 text-[#E5484D]">INATIVO</span>
                    )}
                    {t.slug === "compra-certa" && (
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700">DEFAULT</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[11px] text-[#9AA0AB] font-mono">{t.slug}</span>
                    {t.primaryDomain && (
                      <span className="inline-flex items-center gap-1 text-[11px] text-[#9AA0AB]">
                        <Globe className="w-3 h-3" />
                        {t.primaryDomain}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 mt-3 text-[12px] text-[#5B6370]">
                    <span><b className="text-[#111827] tabular-nums">{t.kpis.users}</b> usuários</span>
                    <span><b className="text-[#111827] tabular-nums">{t.kpis.wishes}</b> desejos</span>
                    <span><b className="text-[#111827] tabular-nums">{t.kpis.offers}</b> ofertas</span>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-[#9AA0AB] group-hover:text-[var(--primary)] transition-colors shrink-0 mt-1" />
              </Link>
            ))}
          </div>
        )}
      </div>

      <Dialog open={creating} onOpenChange={(open) => !open && setCreating(false)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Novo tenant</DialogTitle>
            <DialogDescription>
              Cria empresa + branding inicial. Você poderá editar logos, cores e domínios na tela de detalhe.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="grid gap-1.5">
              <Label htmlFor="name">Nome <span className="text-[#E5484D]">*</span></Label>
              <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value, appName: form.appName || e.target.value })} placeholder="Grupo Exemplo" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="slug">Slug</Label>
                <Input id="slug" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") })} placeholder="auto" />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="domain">Domínio principal</Label>
                <Input id="domain" value={form.primaryDomain} onChange={(e) => setForm({ ...form, primaryDomain: e.target.value })} placeholder="exemplo.com.br" />
              </div>
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="email">E-mail de suporte</Label>
              <Input id="email" type="email" value={form.supportEmail} onChange={(e) => setForm({ ...form, supportEmail: e.target.value })} placeholder="suporte@exemplo.com.br" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="appName">Nome exibido</Label>
                <Input id="appName" value={form.appName} onChange={(e) => setForm({ ...form, appName: e.target.value })} placeholder="igual ao nome" />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="tagline">Tagline</Label>
                <Input id="tagline" value={form.tagline} onChange={(e) => setForm({ ...form, tagline: e.target.value })} placeholder="ex: by Canal" />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <ColorField label="Primária" value={form.primaryColor} onChange={(v) => setForm({ ...form, primaryColor: v })} />
              <ColorField label="Secundária" value={form.secondaryColor} onChange={(v) => setForm({ ...form, secondaryColor: v })} />
              <ColorField label="Destaque" value={form.accentColor} onChange={(v) => setForm({ ...form, accentColor: v })} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreating(false)} disabled={saving}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
              Criar tenant
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="grid gap-1.5">
      <Label className="text-[12px]">{label}</Label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
          className="w-10 h-10 rounded-[8px] border border-[#E8EAEE] cursor-pointer shrink-0"
        />
        <Input
          value={value}
          onChange={(e) => {
            const v = e.target.value.trim();
            if (/^#[0-9A-Fa-f]{0,6}$/.test(v)) onChange(v.toUpperCase());
          }}
          className="font-mono text-[12px]"
          maxLength={7}
        />
      </div>
    </div>
  );
}
