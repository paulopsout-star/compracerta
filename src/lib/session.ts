import { auth } from "@/lib/auth";
import type { UserRole } from "@/types";

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  dealershipId?: string | null;
  dealerStoreId?: string | null;
}

export async function getSession(): Promise<SessionUser | null> {
  const session = await auth();
  if (!session?.user) return null;
  return session.user as SessionUser;
}

export async function requireSession(): Promise<SessionUser> {
  const user = await getSession();
  if (!user) throw new Error("Unauthorized");
  return user;
}
