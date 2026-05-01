import { redirect } from "next/navigation";

// Superadmin compartilha toda a UI com admin (sidebar/permissões iguais).
// A diferença vive no backend (cross-tenant via getRequestScope/getAdminScope).
// Mantemos esta rota só para o login redirect (router.push(`/${role}`)) e
// para qualquer link que use /superadmin diretamente.
export default function SuperadminPage() {
  redirect("/admin");
}
