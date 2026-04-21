"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Loader2, Pencil, Plus, Trash2, Users } from "lucide-react";

type Role = "vendedor" | "gestor" | "lojista" | "admin";

interface UserRow {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: Role;
  dealership_id: string | null;
  dealer_store_id: string | null;
  active: boolean;
  created_at: string;
}

interface DealershipOption { id: string; name: string; city: string; state: string; active: boolean }
interface DealerStoreOption { id: string; name: string; city: string; state: string; active: boolean }

const ROLE_BADGES: Record<Role, { label: string; className: string }> = {
  vendedor: { label: "Vendedor", className: "bg-[rgba(37,99,235,0.1)] text-[#2563EB]" },
  gestor:   { label: "Gestor",   className: "bg-purple-50 text-purple-700" },
  lojista:  { label: "Lojista",  className: "bg-green-50 text-green-700" },
  admin:    { label: "Admin",    className: "bg-red-50 text-[#E5484D]" },
};

interface FormState {
  name: string;
  email: string;
  phone: string;
  role: Role;
  dealershipId: string;
  dealerStoreId: string;
  active: boolean;
  password: string;
}

const EMPTY_FORM: FormState = {
  name: "", email: "", phone: "", role: "vendedor",
  dealershipId: "", dealerStoreId: "", active: true, password: "",
};

export default function AdminUsuariosPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [dealerships, setDealerships] = useState<DealershipOption[]>([]);
  const [dealerStores, setDealerStores] = useState<DealerStoreOption[]>([]);
  const [loading, setLoading] = useState(true);

  const [editing, setEditing] = useState<UserRow | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/admin/usuarios");
      const d = await r.json();
      setUsers(d.data ?? []);
      setDealerships(d.dealerships ?? []);
      setDealerStores(d.dealerStores ?? []);
    } catch {
      toast.error("Erro ao carregar usuários");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function openCreate() {
    setForm(EMPTY_FORM);
    setEditing(null);
    setCreating(true);
  }

  function openEdit(user: UserRow) {
    setForm({
      name: user.name,
      email: user.email,
      phone: user.phone ?? "",
      role: user.role,
      dealershipId: user.dealership_id ?? "",
      dealerStoreId: user.dealer_store_id ?? "",
      active: user.active,
      password: "",
    });
    setEditing(user);
    setCreating(false);
  }

  function closeDialog() {
    setEditing(null);
    setCreating(false);
    setForm(EMPTY_FORM);
  }

  async function handleSubmit() {
    if (!form.name.trim()) return toast.error("Nome obrigatório");
    if (!form.email.trim()) return toast.error("E-mail obrigatório");
    if (creating && (!form.password || form.password.length < 6)) {
      return toast.error("Senha mínima de 6 caracteres");
    }

    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim() || null,
        role: form.role,
        dealershipId: form.dealershipId || null,
        dealerStoreId: form.dealerStoreId || null,
        active: form.active,
        ...(form.password ? { password: form.password } : {}),
      };

      const res = editing
        ? await fetch(`/api/admin/usuarios/${editing.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
        : await fetch(`/api/admin/usuarios`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? `Erro ${res.status}`);
      }

      toast.success(editing ? "Usuário atualizado" : "Usuário criado");
      closeDialog();
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeactivate() {
    if (!editing) return;
    if (!confirm(`Desativar o usuário ${editing.name}? Ele não conseguirá mais fazer login.`)) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/admin/usuarios/${editing.id}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? `Erro ${res.status}`);
      }
      toast.success("Usuário desativado");
      closeDialog();
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao desativar");
    } finally {
      setSaving(false);
    }
  }

  const dialogOpen = editing !== null || creating;
  const dialogTitle = editing ? "Editar usuário" : "Novo usuário";

  const availableDealerships = useMemo(
    () => dealerships.filter((d) => d.active),
    [dealerships]
  );
  const availableStores = useMemo(
    () => dealerStores.filter((s) => s.active),
    [dealerStores]
  );

  return (
    <DashboardLayout role="admin" subtitle="Gerencie os usuários da plataforma">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Users className="w-5 h-5 text-[#2563EB]" />
            <h2 className="text-[20px] font-semibold text-[#111827]">Usuários</h2>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[13px] text-[#9AA0AB]">{users.length} usuários</span>
            <Button onClick={openCreate} size="sm" className="gap-1.5">
              <Plus className="w-4 h-4" /> Novo usuário
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-[#9AA0AB]" />
          </div>
        ) : (
          <div className="card-tradox !p-0 overflow-hidden">
            <div className="px-6 py-3 bg-[#F7F8FA] border-b border-[#EEF0F3]">
              <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_auto] gap-4 text-[11px] font-medium text-[#9AA0AB] uppercase tracking-[0.4px]">
                <span>Nome / E-mail</span>
                <span>Telefone</span>
                <span>Perfil</span>
                <span>Status</span>
                <span>Criado em</span>
                <span className="w-[88px] text-right">Ações</span>
              </div>
            </div>
            <div className="divide-y divide-[#EEF0F3]">
              {users.map((user) => {
                const badge = ROLE_BADGES[user.role] ?? ROLE_BADGES.vendedor;
                return (
                  <div
                    key={user.id}
                    onClick={() => openEdit(user)}
                    className="group grid grid-cols-[2fr_1fr_1fr_1fr_1fr_auto] gap-4 items-center px-6 py-4 hover:bg-[#F7F8FA]/50 transition-colors cursor-pointer"
                  >
                    <div>
                      <p className="text-[14px] font-medium text-[#111827]">{user.name}</p>
                      <p className="text-[12px] text-[#9AA0AB]">{user.email}</p>
                    </div>
                    <span className="text-[13px] text-[#5B6370]">{user.phone ?? "—"}</span>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold w-fit ${badge.className}`}>
                      {badge.label}
                    </span>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold w-fit ${user.active ? "bg-green-50 text-green-700" : "bg-red-50 text-[#E5484D]"}`}>
                      {user.active ? "Ativo" : "Inativo"}
                    </span>
                    <span className="text-[13px] text-[#5B6370]">
                      {new Date(user.created_at).toLocaleDateString("pt-BR")}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => { e.stopPropagation(); openEdit(user); }}
                      className="w-[88px] gap-1.5 h-8 text-[12px]"
                    >
                      <Pencil className="w-3.5 h-3.5" /> Editar
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{dialogTitle}</DialogTitle>
            <DialogDescription>
              {editing
                ? "Atualize os dados do usuário. Deixe a senha em branco para mantê-la."
                : "Preencha os dados para criar um novo usuário."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="grid gap-1.5">
              <Label htmlFor="name">Nome</Label>
              <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nome completo" />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="usuario@compracerta.com" />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="phone">Telefone (WhatsApp)</Label>
              <Input id="phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+5531988887777" />
              <p className="text-[11px] text-[#9AA0AB]">Aceita +5531988887777, (31) 98888-7777 ou 31988887777.</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>Perfil</Label>
                <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v as Role })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="vendedor">Vendedor</SelectItem>
                    <SelectItem value="gestor">Gestor</SelectItem>
                    <SelectItem value="lojista">Lojista</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-1.5">
                <Label>Status</Label>
                <Select value={form.active ? "ativo" : "inativo"} onValueChange={(v) => setForm({ ...form, active: v === "ativo" })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ativo">Ativo</SelectItem>
                    <SelectItem value="inativo">Inativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {(form.role === "vendedor" || form.role === "gestor") && (
              <div className="grid gap-1.5">
                <Label>Concessionária</Label>
                <Select value={form.dealershipId || "none"} onValueChange={(v) => setForm({ ...form, dealershipId: !v || v === "none" ? "" : v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione uma concessionária" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— Nenhuma —</SelectItem>
                    {availableDealerships.map((d) => (
                      <SelectItem key={d.id} value={d.id}>{d.name} ({d.city}/{d.state})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {form.role === "lojista" && (
              <div className="grid gap-1.5">
                <Label>Loja</Label>
                <Select value={form.dealerStoreId || "none"} onValueChange={(v) => setForm({ ...form, dealerStoreId: !v || v === "none" ? "" : v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione uma loja" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— Nenhuma —</SelectItem>
                    {availableStores.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name} ({s.city}/{s.state})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid gap-1.5">
              <Label htmlFor="password">{editing ? "Nova senha (opcional)" : "Senha"}</Label>
              <Input id="password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder={editing ? "Deixe em branco para manter" : "Mínimo 6 caracteres"} />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-2 sm:justify-between">
            <div>
              {editing && editing.active && (
                <Button variant="outline" onClick={handleDeactivate} disabled={saving} className="gap-1.5 text-[#E5484D] hover:text-[#E5484D]">
                  <Trash2 className="w-4 h-4" /> Desativar
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={closeDialog} disabled={saving}>Cancelar</Button>
              <Button onClick={handleSubmit} disabled={saving}>
                {saving && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
                {editing ? "Salvar alterações" : "Criar usuário"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
