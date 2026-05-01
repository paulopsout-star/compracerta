import { redirect } from "next/navigation";

// Home do superadmin: gestao cross-tenant. Sidebar tambem da acesso a
// /admin (UI compartilhada, mas operada com escopo cross-tenant via backend).
export default function SuperadminPage() {
  redirect("/superadmin/tenants");
}
