import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabase } from "@/lib/db";

// GET /api/dashboard — Stats for the current user's dashboard
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const role = (session.user as Record<string, unknown>).role as string;
    const userId = session.user.id;
    const dealershipId = (session.user as Record<string, unknown>).dealershipId as string | null;
    const dealerStoreId = (session.user as Record<string, unknown>).dealerStoreId as string | null;

    if (role === "vendedor") {
      const [wishes, activeWishes, matches, converted] = await Promise.all([
        supabase.from("wishes").select("*", { count: "exact", head: true }).eq("seller_id", userId),
        supabase.from("wishes").select("*", { count: "exact", head: true }).eq("seller_id", userId).eq("status", "procurando"),
        supabase.from("matches").select("*, wishes!inner(*)").eq("wishes.seller_id", userId),
        supabase.from("wishes").select("*", { count: "exact", head: true }).eq("seller_id", userId).eq("status", "convertido"),
      ]);

      const totalWishes = wishes.count ?? 0;
      const totalConverted = converted.count ?? 0;

      return NextResponse.json({
        totalWishes,
        activeWishes: activeWishes.count ?? 0,
        totalMatches: matches.data?.length ?? 0,
        conversionRate: totalWishes > 0 ? Math.round((totalConverted / totalWishes) * 1000) / 10 : 0,
        recentWishes: (await supabase.from("wishes").select("*").eq("seller_id", userId).order("created_at", { ascending: false }).limit(10)).data ?? [],
        recentMatches: matches.data?.slice(0, 5) ?? [],
      });
    }

    if (role === "gestor" && dealershipId) {
      const [wishes, matches, sellers] = await Promise.all([
        supabase.from("wishes").select("*", { count: "exact" }).eq("dealership_id", dealershipId),
        supabase.from("matches").select("*, wishes!inner(*)").eq("wishes.dealership_id", dealershipId),
        supabase.from("users").select("*").eq("dealership_id", dealershipId).eq("role", "vendedor"),
      ]);

      return NextResponse.json({
        totalWishes: wishes.count ?? 0,
        totalMatches: matches.data?.length ?? 0,
        sellers: sellers.data ?? [],
        wishes: wishes.data ?? [],
      });
    }

    if (role === "lojista" && dealerStoreId) {
      const [offers, matches] = await Promise.all([
        supabase.from("offers").select("*", { count: "exact" }).eq("dealer_store_id", dealerStoreId).eq("active", true),
        supabase.from("matches").select("*, offers!inner(*)").eq("offers.dealer_store_id", dealerStoreId),
      ]);

      return NextResponse.json({
        totalOffers: offers.count ?? 0,
        totalMatches: matches.data?.length ?? 0,
        offers: offers.data ?? [],
        matches: matches.data ?? [],
      });
    }

    if (role === "admin") {
      const [users, wishes, offers, matches, notifications] = await Promise.all([
        supabase.from("users").select("*", { count: "exact", head: true }).eq("active", true),
        supabase.from("wishes").select("*", { count: "exact", head: true }),
        supabase.from("offers").select("*", { count: "exact", head: true }).eq("active", true),
        supabase.from("matches").select("*", { count: "exact", head: true }),
        supabase.from("notifications").select("*", { count: "exact", head: true }),
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
