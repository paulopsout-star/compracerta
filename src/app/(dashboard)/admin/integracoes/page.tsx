"use client";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Plug, CheckCircle, XCircle, Clock, Wifi, Database, MessageSquare, Zap, Loader2, RefreshCw, Settings2, Eye, EyeOff,
} from "lucide-react";

interface IntegrationStatus {
  name: string;
  status: "online" | "desabilitado" | "erro";
  latency: number | null;
  message: string | null;
}

interface ZapiField {
  value: string;
  source: "flag" | "env" | "default";
  masked: boolean;
}

interface ZapiConfigResponse {
  configured: boolean;
  fields: {
    baseUrl: ZapiField;
    instanceId: ZapiField;
    instanceToken: ZapiField;
    clientToken: ZapiField;
  };
  endpointPreview: string | null;
}

const META: Record<string, { label: string; desc: string; icon: typeof Wifi }> = {
  canal_repasse: { label: "Canal do Repasse (Marketplace)", desc: "Integração via API REST (aguardando)", icon: Wifi },
  avaliador: { label: "Avaliador Digital", desc: "API pública — ConsultaPublica", icon: Database },
  whatsapp: { label: "WhatsApp Business API", desc: "Provedor padrão: Z-API. Fallback: Meta Cloud API", icon: MessageSquare },
};

const STATUS_STYLE: Record<string, { bg: string; text: string; icon: typeof CheckCircle; label: string }> = {
  online: { bg: "bg-[rgba(37,99,235,0.1)]", text: "text-[#2563EB]", icon: CheckCircle, label: "Online" },
  desabilitado: { bg: "bg-amber-50", text: "text-amber-700", icon: Clock, label: "Desabilitado" },
  erro: { bg: "bg-red-50", text: "text-[#E5484D]", icon: XCircle, label: "Erro" },
};

const SOURCE_BADGE: Record<ZapiField["source"], { label: string; cls: string }> = {
  flag: { label: "Banco", cls: "bg-[rgba(37,99,235,0.1)] text-[#2563EB]" },
  env: { label: "Env", cls: "bg-amber-50 text-amber-700" },
  default: { label: "Default", cls: "bg-gray-100 text-gray-600" },
};

interface FormState {
  baseUrl: string;
  instanceId: string;
  instanceToken: string;
  clientToken: string;
}

export default function AdminIntegracoesPage() {
  const [data, setData] = useState<Record<string, IntegrationStatus> | null>(null);
  const [loading, setLoading] = useState(true);

  const [zapiOpen, setZapiOpen] = useState(false);
  const [zapiCfg, setZapiCfg] = useState<ZapiConfigResponse | null>(null);
  const [zapiLoading, setZapiLoading] = useState(false);
  const [form, setForm] = useState<FormState>({ baseUrl: "", instanceId: "", instanceToken: "", clientToken: "" });
  const [showInstanceToken, setShowInstanceToken] = useState(false);
  const [showClientToken, setShowClientToken] = useState(false);
  const [saving, setSaving] = useState(false);

  function load() {
    setLoading(true);
    fetch("/api/admin/integracoes/health")
      .then(r => r.json())
      .then(d => setData(d.integrations))
      .finally(() => setLoading(false));
  }
  useEffect(load, []);

  async function openZapiDialog() {
    setZapiOpen(true);
    setZapiLoading(true);
    setShowInstanceToken(false);
    setShowClientToken(false);
    try {
      const r = await fetch("/api/admin/integracoes/zapi");
      const d: ZapiConfigResponse = await r.json();
      setZapiCfg(d);
      // Pre-popula só não-mascarados; tokens ficam vazios = "manter atual".
      setForm({
        baseUrl: d.fields.baseUrl.source === "flag" ? d.fields.baseUrl.value : "",
        instanceId: d.fields.instanceId.source === "flag" ? d.fields.instanceId.value : "",
        instanceToken: "",
        clientToken: "",
      });
    } catch {
      toast.error("Erro ao carregar configuração Z-API");
      setZapiOpen(false);
    } finally {
      setZapiLoading(false);
    }
  }

  async function saveZapi() {
    setSaving(true);
    try {
      const payload: Record<string, string> = {};
      // baseUrl/instanceId sempre enviados (string vazia = limpa o flag e cai pra env).
      payload.baseUrl = form.baseUrl.trim();
      payload.instanceId = form.instanceId.trim();
      // Tokens: só envia se preenchido (vazio = manter o que já está).
      if (form.instanceToken.trim()) payload.instanceToken = form.instanceToken.trim();
      if (form.clientToken.trim()) payload.clientToken = form.clientToken.trim();

      const r = await fetch("/api/admin/integracoes/zapi", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        throw new Error(err.error ?? `Erro ${r.status}`);
      }
      toast.success("Configuração Z-API atualizada");
      setZapiOpen(false);
      load(); // refresh do health
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  }

  async function clearZapiField(field: keyof FormState) {
    setSaving(true);
    try {
      const payload: Record<string, string> = { [field]: "" };
      const r = await fetch("/api/admin/integracoes/zapi", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!r.ok) throw new Error(`Erro ${r.status}`);
      toast.success("Campo limpo (voltou a usar env)");
      // Recarrega e re-popula form
      const r2 = await fetch("/api/admin/integracoes/zapi");
      const d: ZapiConfigResponse = await r2.json();
      setZapiCfg(d);
      setForm((f) => ({ ...f, [field]: "" }));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao limpar");
    } finally {
      setSaving(false);
    }
  }

  const matchingMeta = { label: "Motor de Matching", desc: "Score 0-100 com 8 critérios ponderados", icon: Zap };

  return (
    <DashboardLayout role="admin" subtitle="Status das integrações do ecossistema">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Plug className="w-5 h-5 text-[#2563EB]" />
            <h2 className="text-[20px] font-semibold text-[#111827]">Integrações</h2>
          </div>
          <button onClick={load} disabled={loading} className="h-[36px] px-3 rounded-[8px] border border-[#E8EAEE] text-[13px] text-[#5B6370] hover:border-[#2563EB] hover:text-[#2563EB] transition-colors disabled:opacity-50 inline-flex items-center gap-1.5">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />Atualizar
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-[#9AA0AB]" /></div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {data && Object.entries(data).map(([key, item]) => {
              const meta = META[key];
              const style = STATUS_STYLE[item.status];
              if (!meta || !style) return null;
              const Icon = meta.icon;
              const StatusIcon = style.icon;
              const isWhatsapp = key === "whatsapp";
              return (
                <div key={key} className="card-tradox">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-[rgba(37,99,235,0.08)] shrink-0">
                        <Icon className="w-5 h-5 text-[#2563EB]" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[14px] font-semibold text-[#111827]">{meta.label}</p>
                        <p className="text-[12px] text-[#9AA0AB] mt-0.5">{meta.desc}</p>
                        {item.latency !== null && item.status === "online" && (
                          <p className="text-[12px] text-[#5B6370] mt-1">Latência: {item.latency}ms</p>
                        )}
                        {item.message && item.status !== "online" && (
                          <p className="text-[12px] text-[#9AA0AB] mt-1">{item.message}</p>
                        )}
                      </div>
                    </div>
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold shrink-0 ${style.bg} ${style.text}`}>
                      <StatusIcon className="w-3 h-3" />{style.label}
                    </span>
                  </div>
                  {isWhatsapp && (
                    <div className="mt-4 pt-4 border-t border-[#EEF0F3] flex justify-end">
                      <Button onClick={openZapiDialog} variant="outline" size="sm" className="gap-1.5">
                        <Settings2 className="w-3.5 h-3.5" /> Configurar Z-API
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Matching engine — always online */}
            <div className="card-tradox">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-[rgba(37,99,235,0.08)] shrink-0">
                    <matchingMeta.icon className="w-5 h-5 text-[#2563EB]" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[14px] font-semibold text-[#111827]">{matchingMeta.label}</p>
                    <p className="text-[12px] text-[#9AA0AB] mt-0.5">{matchingMeta.desc}</p>
                    <p className="text-[12px] text-[#5B6370] mt-1">Latência: 12ms</p>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[rgba(37,99,235,0.1)] text-[#2563EB] shrink-0">
                  <CheckCircle className="w-3 h-3" /> Online
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      <Dialog open={zapiOpen} onOpenChange={(open) => !open && setZapiOpen(false)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Configuração Z-API</DialogTitle>
            <DialogDescription>
              Define a rota usada para envio de WhatsApp. Salvo no banco; precedência: <strong>Banco</strong> &gt; Env &gt; Default.
            </DialogDescription>
          </DialogHeader>

          {zapiLoading || !zapiCfg ? (
            <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-[#9AA0AB]" /></div>
          ) : (
            <>
              <div className="grid gap-4 py-2">
                <ConfigField
                  label="Base URL"
                  field={zapiCfg.fields.baseUrl}
                  inputId="baseUrl"
                  placeholder="https://api.z-api.io"
                  value={form.baseUrl}
                  onChange={(v) => setForm({ ...form, baseUrl: v })}
                  onClear={() => clearZapiField("baseUrl")}
                  saving={saving}
                />

                <ConfigField
                  label="Instance ID"
                  field={zapiCfg.fields.instanceId}
                  inputId="instanceId"
                  placeholder="3D1A1B2C3D4E5F6G7H8I9J0K"
                  value={form.instanceId}
                  onChange={(v) => setForm({ ...form, instanceId: v })}
                  onClear={() => clearZapiField("instanceId")}
                  saving={saving}
                />

                <ConfigField
                  label="Instance Token"
                  field={zapiCfg.fields.instanceToken}
                  inputId="instanceToken"
                  placeholder={zapiCfg.fields.instanceToken.value ? `Atual: ${zapiCfg.fields.instanceToken.value}` : "Token da instância"}
                  type={showInstanceToken ? "text" : "password"}
                  value={form.instanceToken}
                  onChange={(v) => setForm({ ...form, instanceToken: v })}
                  onToggleShow={() => setShowInstanceToken(!showInstanceToken)}
                  showToggle={showInstanceToken}
                  onClear={() => clearZapiField("instanceToken")}
                  saving={saving}
                  hint="Vazio = manter o atual."
                />

                <ConfigField
                  label="Client Token"
                  field={zapiCfg.fields.clientToken}
                  inputId="clientToken"
                  placeholder={zapiCfg.fields.clientToken.value ? `Atual: ${zapiCfg.fields.clientToken.value}` : "Token de conta (account)"}
                  type={showClientToken ? "text" : "password"}
                  value={form.clientToken}
                  onChange={(v) => setForm({ ...form, clientToken: v })}
                  onToggleShow={() => setShowClientToken(!showClientToken)}
                  showToggle={showClientToken}
                  onClear={() => clearZapiField("clientToken")}
                  saving={saving}
                  hint="Vazio = manter o atual."
                />

                {zapiCfg.endpointPreview && (
                  <div className="rounded-[8px] bg-[#F7F8FA] border border-[#EEF0F3] p-3">
                    <p className="text-[11px] font-semibold text-[#9AA0AB] uppercase tracking-[0.4px] mb-1">Endpoint Atual</p>
                    <code className="text-[11px] text-[#111827] break-all">{zapiCfg.endpointPreview}</code>
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setZapiOpen(false)} disabled={saving}>Cancelar</Button>
                <Button onClick={saveZapi} disabled={saving}>
                  {saving && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
                  Salvar
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}

function ConfigField({
  label, field, inputId, placeholder, value, onChange, onClear, saving,
  type = "text", onToggleShow, showToggle, hint,
}: {
  label: string;
  field: ZapiField;
  inputId: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  onClear: () => void;
  saving: boolean;
  type?: "text" | "password";
  onToggleShow?: () => void;
  showToggle?: boolean;
  hint?: string;
}) {
  const badge = SOURCE_BADGE[field.source];
  return (
    <div className="grid gap-1.5">
      <div className="flex items-center justify-between">
        <Label htmlFor={inputId}>{label}</Label>
        <div className="flex items-center gap-1.5">
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${badge.cls}`}>
            {badge.label}
          </span>
          {field.source === "flag" && (
            <button
              type="button"
              onClick={onClear}
              disabled={saving}
              className="text-[10px] text-[#9AA0AB] hover:text-[#E5484D] disabled:opacity-50"
            >
              limpar
            </button>
          )}
        </div>
      </div>
      <div className="relative">
        <Input
          id={inputId}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={saving}
          className={onToggleShow ? "pr-10" : undefined}
        />
        {onToggleShow && (
          <button
            type="button"
            onClick={onToggleShow}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-[#9AA0AB] hover:text-[#5B6370]"
          >
            {showToggle ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        )}
      </div>
      {hint && <p className="text-[11px] text-[#9AA0AB]">{hint}</p>}
    </div>
  );
}
