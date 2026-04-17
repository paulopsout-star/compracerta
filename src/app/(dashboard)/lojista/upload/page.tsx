"use client";
import { useState } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Upload, FileSpreadsheet, Loader2, CheckCircle, AlertCircle, Plus } from "lucide-react";
import { toast } from "sonner";
import { BRAZILIAN_STATES } from "@/lib/data/fipe-mock";

export default function UploadPage() {
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<string | null>(null);
  const [manualForm, setManualForm] = useState({ brand: "", model: "", version: "", year: "", km: "", price: "", color: "", city: "", state: "", plate: "" });
  const [saving, setSaving] = useState(false);

  async function handleUpload(file: File) {
    setUploading(true); setUploadResult(null);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (res.ok) { setUploadResult("success"); toast.success(data.message); }
      else { setUploadResult("error"); toast.error(data.error); }
    } catch { setUploadResult("error"); toast.error("Erro no upload"); }
    finally { setUploading(false); }
  }

  async function handleManualSave() {
    if (!manualForm.brand || !manualForm.model || !manualForm.year || !manualForm.km || !manualForm.price || !manualForm.city || !manualForm.state) { toast.error("Preencha todos os campos obrigatórios"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/ofertas", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...manualForm, year: parseInt(manualForm.year), km: parseInt(manualForm.km), price: parseFloat(manualForm.price), source: "estoque_lojista" }) });
      if (res.ok) { toast.success("Veículo cadastrado!"); setManualForm({ brand: "", model: "", version: "", year: "", km: "", price: "", color: "", city: "", state: "", plate: "" }); }
      else { const d = await res.json(); toast.error(d.error); }
    } catch { toast.error("Erro ao salvar"); }
    finally { setSaving(false); }
  }

  return (
    <DashboardLayout role="lojista" subtitle="Atualize seu estoque de veículos">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Upload area */}
        <div className="card-tradox">
          <div className="flex items-center gap-3 mb-4"><Upload className="w-5 h-5 text-[#2563EB]" /><h2 className="text-[16px] font-semibold text-[#111827]">Upload de Arquivo</h2></div>
          <label className={`block border-2 border-dashed rounded-[12px] p-10 text-center cursor-pointer transition-colors ${uploading ? "border-[#2563EB] bg-[rgba(37,99,235,0.04)]" : "border-[#E8EAEE] hover:border-[#2563EB]/30 hover:bg-[rgba(37,99,235,0.02)]"}`}>
            <input type="file" accept=".csv,.xls,.xlsx,.pdf" className="hidden" onChange={e => { if (e.target.files?.[0]) handleUpload(e.target.files[0]); }} disabled={uploading} />
            {uploading ? <Loader2 className="w-10 h-10 mx-auto text-[#2563EB] animate-spin mb-3" /> : uploadResult === "success" ? <CheckCircle className="w-10 h-10 mx-auto text-green-500 mb-3" /> : uploadResult === "error" ? <AlertCircle className="w-10 h-10 mx-auto text-[#E5484D] mb-3" /> : <FileSpreadsheet className="w-10 h-10 mx-auto text-[#9AA0AB] mb-3" />}
            <p className="text-[14px] font-medium text-[#111827]">{uploading ? "Enviando..." : "Arraste um arquivo ou clique aqui"}</p>
            <p className="text-[12px] text-[#9AA0AB] mt-1">CSV, XLS, XLSX ou PDF (máx. 10MB)</p>
          </label>
        </div>

        {/* Manual form */}
        <div className="card-tradox">
          <div className="flex items-center gap-3 mb-4"><Plus className="w-5 h-5 text-[#2563EB]" /><h2 className="text-[16px] font-semibold text-[#111827]">Cadastro Manual</h2></div>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              { key: "brand", label: "Marca *", placeholder: "Honda" },
              { key: "model", label: "Modelo *", placeholder: "Civic" },
              { key: "version", label: "Versão", placeholder: "EXL 2.0" },
              { key: "year", label: "Ano *", placeholder: "2022", type: "number" },
              { key: "km", label: "Quilometragem *", placeholder: "32000", type: "number" },
              { key: "price", label: "Preço (R$) *", placeholder: "125000", type: "number" },
              { key: "color", label: "Cor", placeholder: "Preto" },
              { key: "city", label: "Cidade *", placeholder: "Belo Horizonte" },
              { key: "plate", label: "Placa", placeholder: "BET2A34" },
            ].map(f => (
              <div key={f.key} className="space-y-1.5">
                <label className="text-[13px] font-medium text-[#111827]">{f.label}</label>
                <input type={f.type ?? "text"} placeholder={f.placeholder} value={(manualForm as Record<string, string>)[f.key]} onChange={e => setManualForm({ ...manualForm, [f.key]: e.target.value })} className="w-full h-[40px] px-3 rounded-[8px] bg-[#F7F8FA] text-[14px] text-[#111827] placeholder:text-[#9AA0AB] outline-none focus:ring-2 focus:ring-[#2563EB]/20" />
              </div>
            ))}
            <div className="space-y-1.5">
              <label className="text-[13px] font-medium text-[#111827]">Estado *</label>
              <select value={manualForm.state} onChange={e => setManualForm({ ...manualForm, state: e.target.value })} className="w-full h-[40px] px-3 rounded-[8px] bg-[#F7F8FA] text-[14px] text-[#111827] outline-none focus:ring-2 focus:ring-[#2563EB]/20">
                <option value="">Selecione</option>
                {BRAZILIAN_STATES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
          </div>
          <button onClick={handleManualSave} disabled={saving} className="mt-4 w-full h-[44px] rounded-[10px] bg-[#2563EB] text-white text-[14px] font-medium hover:brightness-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}Cadastrar Veículo
          </button>
        </div>
      </div>
    </DashboardLayout>
  );
}
