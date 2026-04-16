"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { wishSchema, type WishFormData } from "@/lib/validators/wish";
import {
  BRANDS,
  MODELS_BY_BRAND,
  BRAZILIAN_STATES,
  CAR_COLORS,
  TRANSMISSION_OPTIONS,
  FUEL_OPTIONS,
  URGENCY_OPTIONS,
  VALIDITY_OPTIONS,
} from "@/lib/data/fipe-mock";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { User, Car, SlidersHorizontal, Settings2, Loader2 } from "lucide-react";

interface WishFormProps {
  onSubmit?: (data: WishFormData) => Promise<void> | void;
}

export function WishForm({ onSubmit }: WishFormProps) {
  const [loading, setLoading] = useState(false);
  const [selectedBrand, setSelectedBrand] = useState<string>("");

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<WishFormData>({
    resolver: zodResolver(wishSchema),
    defaultValues: {
      transmission: "indiferente",
      fuel: "indiferente",
      urgency: "media",
      validityDays: 30,
      radiusKm: 100,
      colors: [],
      lgpdConsent: false,
    },
  });

  const watchedColors = watch("colors") ?? [];

  const handleFormSubmit = async (data: WishFormData) => {
    setLoading(true);
    try {
      if (onSubmit) {
        await onSubmit(data);
      } else {
        console.log("Wish submitted:", data);
      }
      toast.success("Desejo cadastrado com sucesso!", {
        description: `${data.brand} ${data.model} para ${data.clientName}`,
      });
    } catch {
      toast.error("Erro ao cadastrar desejo. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const models = selectedBrand ? (MODELS_BY_BRAND[selectedBrand] ?? []) : [];

  function toggleColor(color: string) {
    const current = watchedColors;
    const next = current.includes(color)
      ? current.filter((c) => c !== color)
      : [...current, color];
    setValue("colors", next);
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      {/* Dados do Cliente */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <User className="h-5 w-5 text-primary" />
            Dados do Cliente
          </CardTitle>
          <CardDescription>
            Informações do cliente que deseja o veículo
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="clientName">Nome completo *</Label>
            <Input id="clientName" placeholder="Nome do cliente" {...register("clientName")} />
            {errors.clientName && <p className="text-xs text-destructive">{errors.clientName.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="clientPhone">Telefone (WhatsApp) *</Label>
            <Input id="clientPhone" placeholder="(31) 99999-9999" {...register("clientPhone")} />
            {errors.clientPhone && <p className="text-xs text-destructive">{errors.clientPhone.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="clientCpf">CPF (opcional)</Label>
            <Input id="clientCpf" placeholder="000.000.000-00" {...register("clientCpf")} />
            {errors.clientCpf && <p className="text-xs text-destructive">{errors.clientCpf.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="clientEmail">E-mail (opcional)</Label>
            <Input id="clientEmail" type="email" placeholder="cliente@email.com" {...register("clientEmail")} />
            {errors.clientEmail && <p className="text-xs text-destructive">{errors.clientEmail.message}</p>}
          </div>
        </CardContent>
      </Card>

      {/* Veículo Desejado */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Car className="h-5 w-5 text-primary" />
            Veículo Desejado
          </CardTitle>
          <CardDescription>
            Especifique o veículo que o cliente procura
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Marca *</Label>
            <Select
              onValueChange={(v) => {
                const val = v as string;
                setSelectedBrand(val);
                setValue("brand", BRANDS.find((b) => b.value === val)?.label ?? val);
                setValue("model", "");
              }}
            >
              <SelectTrigger><SelectValue placeholder="Selecione a marca" /></SelectTrigger>
              <SelectContent>
                {BRANDS.map((b) => (
                  <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.brand && <p className="text-xs text-destructive">{errors.brand.message}</p>}
          </div>
          <div className="space-y-2">
            <Label>Modelo *</Label>
            <Select
              disabled={!selectedBrand}
              onValueChange={(v) => {
                const val = v as string;
                setValue("model", models.find((m) => m.value === val)?.label ?? val);
              }}
            >
              <SelectTrigger><SelectValue placeholder={selectedBrand ? "Selecione o modelo" : "Selecione a marca primeiro"} /></SelectTrigger>
              <SelectContent>
                {models.map((m) => (
                  <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.model && <p className="text-xs text-destructive">{errors.model.message}</p>}
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="version">Versão (opcional)</Label>
            <Input id="version" placeholder="Ex: EXL 2.0 CVT" {...register("version")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="yearMin">Ano mínimo</Label>
            <Input id="yearMin" type="number" placeholder="2020" {...register("yearMin")} />
            {errors.yearMin && <p className="text-xs text-destructive">{errors.yearMin.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="yearMax">Ano máximo</Label>
            <Input id="yearMax" type="number" placeholder="2025" {...register("yearMax")} />
            {errors.yearMax && <p className="text-xs text-destructive">{errors.yearMax.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="kmMax">Quilometragem máxima</Label>
            <Input id="kmMax" type="number" placeholder="50000" {...register("kmMax")} />
            {errors.kmMax && <p className="text-xs text-destructive">{errors.kmMax.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="priceMin">Preço mínimo (R$)</Label>
            <Input id="priceMin" type="number" placeholder="80000" {...register("priceMin")} />
            {errors.priceMin && <p className="text-xs text-destructive">{errors.priceMin.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="priceMax">Preço máximo (R$)</Label>
            <Input id="priceMax" type="number" placeholder="130000" {...register("priceMax")} />
            {errors.priceMax && <p className="text-xs text-destructive">{errors.priceMax.message}</p>}
          </div>

          {/* Cores */}
          <div className="space-y-2 sm:col-span-2">
            <Label>Cores de preferência</Label>
            <p className="text-xs text-muted-foreground mb-2">Deixe em branco para &quot;qualquer cor&quot;</p>
            <div className="flex flex-wrap gap-2">
              {CAR_COLORS.map((color) => (
                <button
                  key={color.value}
                  type="button"
                  onClick={() => toggleColor(color.value)}
                  className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
                    watchedColors.includes(color.value)
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background hover:bg-muted border-border"
                  }`}
                >
                  {color.label}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Preferências */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <SlidersHorizontal className="h-5 w-5 text-primary" />
            Preferências
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Câmbio</Label>
            <Select defaultValue="indiferente" onValueChange={(v) => setValue("transmission", v as WishFormData["transmission"])}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {TRANSMISSION_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Combustível</Label>
            <Select defaultValue="indiferente" onValueChange={(v) => setValue("fuel", v as WishFormData["fuel"])}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {FUEL_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Estado</Label>
            <Select onValueChange={(v) => setValue("stateRef", v as string)}>
              <SelectTrigger><SelectValue placeholder="Qualquer estado" /></SelectTrigger>
              <SelectContent>
                {BRAZILIAN_STATES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="cityRef">Cidade</Label>
            <Input id="cityRef" placeholder="Ex: Belo Horizonte" {...register("cityRef")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="radiusKm">Raio de busca (km)</Label>
            <Input id="radiusKm" type="number" defaultValue={100} {...register("radiusKm")} />
            {errors.radiusKm && <p className="text-xs text-destructive">{errors.radiusKm.message}</p>}
          </div>
        </CardContent>
      </Card>

      {/* Configurações */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Settings2 className="h-5 w-5 text-primary" />
            Configurações
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-3">
            <Label>Urgência</Label>
            <RadioGroup
              defaultValue="media"
              onValueChange={(v) => setValue("urgency", v as WishFormData["urgency"])}
              className="flex gap-4"
            >
              {URGENCY_OPTIONS.map((o) => (
                <div key={o.value} className="flex items-center gap-2">
                  <RadioGroupItem value={o.value} id={`urgency-${o.value}`} />
                  <Label htmlFor={`urgency-${o.value}`} className="text-sm cursor-pointer">
                    {o.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>
          <div className="space-y-2">
            <Label>Validade do desejo</Label>
            <Select defaultValue="30" onValueChange={(v) => setValue("validityDays", parseInt(v as string))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {VALIDITY_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="notes">Observações</Label>
            <Textarea
              id="notes"
              placeholder="Detalhes adicionais sobre o que o cliente procura..."
              rows={3}
              {...register("notes")}
            />
            {errors.notes && <p className="text-xs text-destructive">{errors.notes.message}</p>}
          </div>
        </CardContent>
      </Card>

      {/* LGPD + Submit */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-start gap-3">
            <Checkbox
              id="lgpdConsent"
              onCheckedChange={(checked) => {
                setValue("lgpdConsent", checked === true);
              }}
            />
            <div className="space-y-1">
              <Label htmlFor="lgpdConsent" className="text-sm cursor-pointer leading-relaxed">
                Autorizo o registro deste desejo e o compartilhamento dos dados do veículo
                com terceiros do ecossistema Canal do Repasse, conforme a LGPD. *
              </Label>
              {errors.lgpdConsent && (
                <p className="text-xs text-destructive">{errors.lgpdConsent.message}</p>
              )}
            </div>
          </div>

          <Button type="submit" className="w-full sm:w-auto" size="lg" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Cadastrar Desejo
          </Button>
        </CardContent>
      </Card>
    </form>
  );
}
