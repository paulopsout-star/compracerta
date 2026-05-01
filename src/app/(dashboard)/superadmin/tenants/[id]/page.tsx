"use client";

import { useCallback, useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Building2, ArrowLeft, Save, Loader2, Globe, Plus, Trash2, ShieldCheck, ShieldAlert, Power,
} from "lucide-react";

interface TenantDetail {
  id: string;
  name: string;
  legalName: string | null;
  cnpj: string | null;
  slug: string;
  primaryDomain: string | null;
  supportEmail: string | null;
  supportPhone: string | null;
  active: boolean;
  branding: {
    appName: string;
    tagline: string | null;
    logoUrl: string | null;
    logoDarkUrl: string | null;
    faviconUrl: string | null;
    loginBackgroundUrl: string | null;
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
    sidebarPrimaryColor: string;
    fontFamily: string;
    termsUrl: string | null;
    privacyUrl: string | null;
  } | null;
  domains: Array<{
    id: string;
    domain: string;
    verified: boolean;
    isPrimary: boolean;
    createdAt: string;
    verifiedAt: string | null;
  }>;
}

export default function SuperadminTenantDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [data, setData] = useState<TenantDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newDomain, setNewDomain] = useState("");
  const [newDomainPrimary, setNewDomainPrimary] = useState(false);
  const [addingDomain, setAddingDomain] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/admin/tenants/${id}`);
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? "Erro");
      setData(d.data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao carregar tenant");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  function update<K extends keyof TenantDetail>(key: K, value: TenantDetail[K]) {
    if (!data) return;
    setData({ ...data, [key]: value });
  }

  function updateBranding<K extends keyof NonNullable<TenantDetail["branding"]>>(
    key: K,
    value: NonNullable<TenantDetail["branding"]>[K]
  ) {
    if (!data?.branding) return;
    setData({ ...data, branding: { ...data.branding, [key]: value } });
  }

  async function handleSave() {
    if (!data) return;
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        name: data.name,
        legalName: data.legalName,
        cnpj: data.cnpj,
        primaryDomain: data.primaryDomain,
        supportEmail: data.supportEmail,
        supportPhone: data.supportPhone,
        active: data.active,
      };
      if (data.branding) {
        Object.assign(payload, {
          appName: data.branding.appName,
          tagline: data.branding.tagline,
          logoUrl: data.branding.logoUrl,
          logoDarkUrl: data.branding.logoDarkUrl,
          faviconUrl: data.branding.faviconUrl,
          loginBackgroundUrl: data.branding.loginBackgroundUrl,
          primaryColor: data.branding.primaryColor,
          secondaryColor: data.branding.secondaryColor,
          accentColor: data.branding.accentColor,
          sidebarPrimaryColor: data.branding.sidebarPrimaryColor,
          termsUrl: data.branding.termsUrl,
          privacyUrl: data.branding.privacyUrl,
        });
      }
      const r = await fetch(`/api/admin/tenants/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? `Erro ${r.status}`);
      toast.success("Salvo");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  }

  async function handleAddDomain() {
    if (!newDomain.trim()) return;
    setAddingDomain(true);
    try {
      const r = await fetch(`/api/admin/tenants/${id}/domains`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: newDomain.trim(), isPrimary: newDomainPrimary }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? `Erro ${r.status}`);
      toast.success("Domínio adicionado");
      setNewDomain("");
      setNewDomainPrimary(false);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao adicionar domínio");
    } finally {
      setAddingDomain(false);
    }
  }

  async function handleRemoveDomain(domainId: string, label: string) {
    if (!confirm(`Remover o domínio ${label}?`)) return;
    try {
      const r = await fetch(`/api/admin/tenants/${id}/domains?domainId=${domainId}`, {
        method: "DELETE",
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error ?? `Erro ${r.status}`);
      toast.success("Domínio removido");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao remover");
    }
  }

  async function handleToggleActive() {
    if (!data) return;
    if (!data.active) {
      // Reativar
      update("active", true);
      return;
    }
    if (!confirm(`Desativar o tenant "${data.name}"? Usuários não conseguirão mais acessar.`)) return;
    try {
      const r = await fetch(`/api/admin/tenants/${id}`, { method: "DELETE" });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error ?? `Erro ${r.status}`);
      toast.success("Tenant desativado");
      router.push("/superadmin/tenants");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao desativar");
    }
  }

  return (
    <DashboardLayout role="superadmin" subtitle="Edição de tenant e branding">
      <div className="space-y-6 max-w-4xl">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={() => router.push("/superadmin/tenants")} className="p-1.5 rounded-[8px] hover:bg-[#F3F4F6]">
              <ArrowLeft className="w-4 h-4 text-[#5B6370]" />
            </button>
            <Building2 className="w-5 h-5 text-[#2563EB] shrink-0" />
            <h2 className="text-[20px] font-semibold text-[#111827] truncate">
              {data?.name ?? "Carregando..."}
            </h2>
            {data && data.slug === "compra-certa" && (
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700">DEFAULT</span>
            )}
          </div>
          <Button onClick={handleSave} disabled={saving || !data} className="gap-1.5">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Salvar alterações
          </Button>
        </div>

        {loading || !data ? (
          <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-[#9AA0AB]" /></div>
        ) : (
          <>
            <Section title="Identificação" subtitle="Dados cadastrais da empresa">
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Nome">
                  <Input value={data.name} onChange={(e) => update("name", e.target.value)} />
                </Field>
                <Field label="Razão social">
                  <Input value={data.legalName ?? ""} onChange={(e) => update("legalName", e.target.value || null)} />
                </Field>
                <Field label="Slug" hint="Identificador URL — não recomendado alterar após criação">
                  <Input value={data.slug} disabled className="font-mono text-[13px]" />
                </Field>
                <Field label="CNPJ">
                  <Input value={data.cnpj ?? ""} onChange={(e) => update("cnpj", e.target.value || null)} />
                </Field>
                <Field label="E-mail de suporte">
                  <Input type="email" value={data.supportEmail ?? ""} onChange={(e) => update("supportEmail", e.target.value || null)} />
                </Field>
                <Field label="Telefone de suporte">
                  <Input value={data.supportPhone ?? ""} onChange={(e) => update("supportPhone", e.target.value || null)} />
                </Field>
              </div>
            </Section>

            {data.branding && (
              <Section title="Branding" subtitle="Identidade visual aplicada em todo o app deste tenant">
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Nome exibido (app_name)">
                    <Input value={data.branding.appName} onChange={(e) => updateBranding("appName", e.target.value)} />
                  </Field>
                  <Field label="Tagline">
                    <Input value={data.branding.tagline ?? ""} onChange={(e) => updateBranding("tagline", e.target.value || null)} />
                  </Field>
                  <Field label="URL do logo">
                    <Input value={data.branding.logoUrl ?? ""} onChange={(e) => updateBranding("logoUrl", e.target.value || null)} placeholder="https://..." />
                  </Field>
                  <Field label="URL do logo (dark)">
                    <Input value={data.branding.logoDarkUrl ?? ""} onChange={(e) => updateBranding("logoDarkUrl", e.target.value || null)} placeholder="https://..." />
                  </Field>
                  <Field label="URL do favicon">
                    <Input value={data.branding.faviconUrl ?? ""} onChange={(e) => updateBranding("faviconUrl", e.target.value || null)} placeholder="https://..." />
                  </Field>
                  <Field label="URL do background do login">
                    <Input value={data.branding.loginBackgroundUrl ?? ""} onChange={(e) => updateBranding("loginBackgroundUrl", e.target.value || null)} placeholder="https://..." />
                  </Field>
                </div>
                <div className="grid gap-4 md:grid-cols-4 mt-4">
                  <ColorField label="Cor primária" value={data.branding.primaryColor} onChange={(v) => updateBranding("primaryColor", v)} />
                  <ColorField label="Cor secundária" value={data.branding.secondaryColor} onChange={(v) => updateBranding("secondaryColor", v)} />
                  <ColorField label="Cor de destaque" value={data.branding.accentColor} onChange={(v) => updateBranding("accentColor", v)} />
                  <ColorField label="Sidebar primária" value={data.branding.sidebarPrimaryColor} onChange={(v) => updateBranding("sidebarPrimaryColor", v)} />
                </div>
                <div className="grid gap-4 md:grid-cols-2 mt-4">
                  <Field label="URL dos termos">
                    <Input value={data.branding.termsUrl ?? ""} onChange={(e) => updateBranding("termsUrl", e.target.value || null)} placeholder="https://..." />
                  </Field>
                  <Field label="URL da política de privacidade">
                    <Input value={data.branding.privacyUrl ?? ""} onChange={(e) => updateBranding("privacyUrl", e.target.value || null)} placeholder="https://..." />
                  </Field>
                </div>

                {/* Preview */}
                <div className="mt-6 p-4 rounded-[10px] border border-[#EEF0F3]">
                  <p className="text-[11px] font-semibold text-[#9AA0AB] uppercase tracking-[0.4px] mb-3">Preview</p>
                  <div className="flex items-center gap-3">
                    {data.branding.logoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={data.branding.logoUrl} alt={data.branding.appName} className="w-10 h-10 rounded-[10px] object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded-[10px]" style={{ backgroundColor: data.branding.primaryColor }} />
                    )}
                    <div>
                      <p className="text-[16px] font-bold text-[#111827]">{data.branding.appName}</p>
                      {data.branding.tagline && <p className="text-[11px] text-[#9AA0AB]">{data.branding.tagline}</p>}
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <span className="px-3 py-1 rounded-full text-[11px] font-medium text-white" style={{ backgroundColor: data.branding.primaryColor }}>
                      Primária
                    </span>
                    <span className="px-3 py-1 rounded-full text-[11px] font-medium text-white" style={{ backgroundColor: data.branding.secondaryColor }}>
                      Secundária
                    </span>
                    <span className="px-3 py-1 rounded-full text-[11px] font-medium text-white" style={{ backgroundColor: data.branding.accentColor }}>
                      Destaque
                    </span>
                  </div>
                </div>
              </Section>
            )}

            <Section title="Domínios" subtitle="Hosts que resolvem pra este tenant. Configure o DNS no Vercel após cadastrar.">
              <div className="space-y-2">
                {data.domains.length === 0 && (
                  <p className="text-[13px] text-[#9AA0AB] py-2">Nenhum domínio cadastrado.</p>
                )}
                {data.domains.map((d) => (
                  <div key={d.id} className="flex items-center justify-between gap-3 px-4 py-3 rounded-[10px] border border-[#EEF0F3]">
                    <div className="flex items-center gap-3 min-w-0">
                      <Globe className="w-4 h-4 text-[#9AA0AB] shrink-0" />
                      <span className="text-[14px] font-medium text-[#111827] truncate">{d.domain}</span>
                      {d.isPrimary && (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-[rgba(37,99,235,0.1)] text-[#2563EB]">PRINCIPAL</span>
                      )}
                      {d.verified ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-green-50 text-green-700">
                          <ShieldCheck className="w-3 h-3" /> VERIFICADO
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700">
                          <ShieldAlert className="w-3 h-3" /> PENDENTE
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => handleRemoveDomain(d.id, d.domain)}
                      className="p-1.5 rounded-[8px] text-[#9AA0AB] hover:text-[#E5484D] hover:bg-red-50 transition-colors"
                      aria-label="Remover"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex flex-col md:flex-row gap-2 mt-4">
                <Input
                  value={newDomain}
                  onChange={(e) => setNewDomain(e.target.value)}
                  placeholder="exemplo.com.br"
                  className="flex-1"
                />
                <label className="inline-flex items-center gap-2 text-[12px] text-[#5B6370] px-2">
                  <input type="checkbox" checked={newDomainPrimary} onChange={(e) => setNewDomainPrimary(e.target.checked)} />
                  Definir como principal
                </label>
                <Button onClick={handleAddDomain} disabled={addingDomain || !newDomain.trim()} className="gap-1.5">
                  {addingDomain ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  Adicionar
                </Button>
              </div>
            </Section>

            <Section title="Status" subtitle="Desativar bloqueia o acesso de todos os usuários deste tenant. O tenant default não pode ser desativado.">
              <Button
                variant="outline"
                onClick={handleToggleActive}
                disabled={data.slug === "compra-certa"}
                className={`gap-1.5 ${data.active ? "text-[#E5484D] hover:text-[#E5484D]" : ""}`}
              >
                <Power className="w-4 h-4" />
                {data.active ? "Desativar tenant" : "Reativar tenant"}
              </Button>
            </Section>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="card-tradox">
      <div className="mb-4">
        <h3 className="text-[15px] font-semibold text-[#111827]">{title}</h3>
        {subtitle && <p className="text-[12px] text-[#9AA0AB] mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <Label>{label}</Label>
      {children}
      {hint && <p className="text-[11px] text-[#9AA0AB]">{hint}</p>}
    </div>
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
