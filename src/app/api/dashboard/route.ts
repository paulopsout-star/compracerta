import { NextResponse } from "next/server";
import { supabase } from "@/lib/db";
import { getRequestScope } from "@/lib/tenant-scope";

// GET /api/dashboard — Stats for the current user's dashboard, scoped to tenant.
export async function GET() {
  try {
    const scopeRes = await getRequestScope();
    if (!scopeRes.ok) {
      return NextResponse.json({ error: scopeRes.reason }, { status: scopeRes.status });
    }
    const { scope } = scopeRes;
    const tenantId = scope.tenantId;

    if (scope.role === "vendedor") {
      const [wishes, activeWishes, matches, converted] = await Promise.all([
        supabase.from("wishes").select("*", { count: "exact", head: true }).eq("tenant_id", tenantId).eq("seller_id", scope.userId),
        supabase.from("wishes").select("*", { count: "exact", head: true }).eq("tenant_id", tenantId).eq("seller_id", scope.userId).eq("status", "procurando"),
        supabase.from("matches").select("*, wishes!inner(*)").eq("tenant_id", tenantId).eq("wishes.seller_id", scope.userId),
        supabase.from("wishes").select("*", { count: "exact", head: true }).eq("tenant_id", tenantId).eq("seller_id", scope.userId).eq("status", "convertido"),
      ]);

      const totalWishes = wishes.count ?? 0;
      const totalConverted = converted.count ?? 0;

      return NextResponse.json({
        totalWishes,
        activeWishes: activeWishes.count ?? 0,
        totalMatches: matches.data?.length ?? 0,
        conversionRate: totalWishes > 0 ? Math.round((totalConverted / totalWishes) * 1000) / 10 : 0,
        recentWishes: (await supabase.from("wishes").select("*").eq("tenant_id", tenantId).eq("seller_id", scope.userId).order("created_at", { ascending: false }).limit(10)).data ?? [],
        recentMatches: matches.data?.slice(0, 5) ?? [],
      });
    }

    if (scope.role === "gestor" && scope.dealershipId) {
      const [wishes, matches, sellers] = await Promise.all([
        supabase.from("wishes").select("*", { count: "exact" }).eq("tenant_id", tenantId).eq("dealership_id", scope.dealershipId),
        supabase.from("matches").select("*, wishes!inner(*)").eq("tenant_id", tenantId).eq("wishes.dealership_id", scope.dealershipId),
        supabase.from("users").select("*").eq("tenant_id", tenantId).eq("dealership_id", scope.dealershipId).eq("role", "vendedor"),
      ]);

      return NextResponse.json({
        totalWishes: wishes.count ?? 0,
        totalMatches: matches.data?.length ?? 0,
        sellers: sellers.data ?? [],
        wishes: wishes.data ?? [],
      });
    }

    if (scope.role === "lojista" && scope.dealerStoreId) {
      const [offers, matches] = await Promise.all([
        supabase.from("offers").select("*", { count: "exact" }).eq("tenant_id", tenantId).eq("dealer_store_id", scope.dealerStoreId).eq("active", true),
        supabase.from("matches").select("*, offers!inner(*)").eq("tenant_id", tenantId).eq("offers.dealer_store_id", scope.dealerStoreId),
      ]);

      return NextResponse.json({
        totalOffers: offers.count ?? 0,
        totalMatches: matches.data?.length ?? 0,
        offers: offers.data ?? [],
        matches: matches.data ?? [],
      });
    }

    // admin / superadmin: agrega dentro do tenant resolvido
    if (scope.role === "admin" || scope.role === "superadmin") {
      const [users, wishes, offers, matches, notifications] = await Promise.all([
        supabase.from("users").select("*", { count: "exact", head: true }).eq("tenant_id", tenantId).eq("active", true),
        supabase.from("wishes").select("*", { count: "exact", head: true }).eq("tenant_id", tenantId),
        supabase.from("offers").select("*", { count: "exact", head: true }).eq("tenant_id", tenantId).eq("active", true),
        supabase.from("matches").select("*", { count: "exact", head: true }).eq("tenant_id", tenantId),
        supabase.from("notifications").select("*", { count: "exact", head: true }).eq("tenant_id", tenantId),
      ]);

      return NextResponse.json({
        totalUsers: users.count ?? 0,
        totalWishes: wishes.count ?? 0,
        totalOffers: offers.count ?? 0,
        totalMatches: matches.count ?? 0,
        totalNotifications: notifications.count ?? 0,
      });
    }

    return NextResponse.json({});
  } catch (error) {
    console.error("[API] Dashboard error:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
