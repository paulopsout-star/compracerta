import * as XLSX from "xlsx";

export interface ParsedVehicle {
  plate?: string;
  brand: string;
  model: string;
  version?: string;
  year: number;
  km: number;
  color?: string;
  price: number;
  city: string;
  state: string;
}

export interface ParseResult {
  vehicles: ParsedVehicle[];
  errors: { line: number; message: string }[];
}

const COLUMN_MAP: Record<string, string> = {
  placa: "plate", plate: "plate",
  marca: "brand", brand: "brand",
  modelo: "model", model: "model",
  versao: "version", versão: "version", version: "version",
  ano: "year", year: "year",
  km: "km", quilometragem: "km", kilometers: "km", quilometros: "km",
  cor: "color", color: "color",
  preco: "price", preço: "price", price: "price", valor: "price",
  cidade: "city", city: "city",
  estado: "state", uf: "state", state: "state",
};

function normalizeColumnName(col: string): string {
  const normalized = col
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
  return COLUMN_MAP[normalized] ?? normalized;
}

function parseRow(
  row: Record<string, unknown>,
  columnMapping: Record<string, string>,
  lineNum: number
): { vehicle?: ParsedVehicle; error?: string } {
  const get = (field: string): string => {
    const col = Object.entries(columnMapping).find(([, v]) => v === field)?.[0];
    if (!col) return "";
    const val = row[col];
    return val != null ? String(val).trim() : "";
  };

  const brand = get("brand");
  const model = get("model");
  const yearStr = get("year");
  const kmStr = get("km");
  const priceStr = get("price");
  const city = get("city");
  const state = get("state");

  if (!brand || !model) return { error: `Linha ${lineNum}: marca e modelo são obrigatórios` };
  if (!yearStr || !priceStr) return { error: `Linha ${lineNum}: ano e preço são obrigatórios` };

  const year = parseInt(yearStr);
  const km = parseInt(kmStr.replace(/\D/g, "")) || 0;
  const price = parseFloat(priceStr.replace(/[^\d.,]/g, "").replace(",", ".")) || 0;

  if (isNaN(year) || year < 2000 || year > 2027) return { error: `Linha ${lineNum}: ano inválido (${yearStr})` };
  if (price <= 0) return { error: `Linha ${lineNum}: preço inválido (${priceStr})` };

  return {
    vehicle: {
      plate: get("plate") || undefined,
      brand,
      model,
      version: get("version") || undefined,
      year,
      km,
      color: get("color") || undefined,
      price,
      city: city || "Não informada",
      state: state.toUpperCase().slice(0, 2) || "XX",
    },
  };
}

export function parseCSV(content: string): ParseResult {
  const lines = content.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return { vehicles: [], errors: [{ line: 1, message: "Arquivo vazio ou sem dados" }] };

  const separator = lines[0].includes(";") ? ";" : ",";
  const headers = lines[0].split(separator).map((h) => h.trim().replace(/^"(.*)"$/, "$1"));
  const columnMapping: Record<string, string> = {};
  for (const header of headers) {
    columnMapping[header] = normalizeColumnName(header);
  }

  const vehicles: ParsedVehicle[] = [];
  const errors: { line: number; message: string }[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(separator).map((v) => v.trim().replace(/^"(.*)"$/, "$1"));
    const row: Record<string, unknown> = {};
    headers.forEach((h, j) => { row[h] = values[j] ?? ""; });

    const result = parseRow(row, columnMapping, i + 1);
    if (result.vehicle) vehicles.push(result.vehicle);
    if (result.error) errors.push({ line: i + 1, message: result.error });
  }

  return { vehicles, errors };
}

export function parseXLSX(buffer: ArrayBuffer): ParseResult {
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return { vehicles: [], errors: [{ line: 1, message: "Planilha vazia" }] };

  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);

  if (rows.length === 0) return { vehicles: [], errors: [{ line: 1, message: "Planilha sem dados" }] };

  const headers = Object.keys(rows[0]);
  const columnMapping: Record<string, string> = {};
  for (const header of headers) {
    columnMapping[header] = normalizeColumnName(header);
  }

  const vehicles: ParsedVehicle[] = [];
  const errors: { line: number; message: string }[] = [];

  rows.forEach((row, i) => {
    const result = parseRow(row, columnMapping, i + 2);
    if (result.vehicle) vehicles.push(result.vehicle);
    if (result.error) errors.push({ line: i + 2, message: result.error });
  });

  return { vehicles, errors };
}
