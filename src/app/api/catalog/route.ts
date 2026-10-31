import { NextResponse } from "next/server";
import { categories } from "@/lib/catalog";
import { getDb } from "@/lib/db";
import { clean, fail } from "@/lib/api";
export async function GET() {
  try {
    const db = await getDb();
    const active = (
      await db.collection("agencies").find({ status: "active" }).toArray()
    ).map((a) => a.id);
    return NextResponse.json(
      clean(
        await db
          .collection("listings")
          .find({
            status: "published",
            category: { $in: categories.map((c) => c.id) },
            agencyId: { $in: active },
          })
          .toArray(),
      ),
    );
  } catch {
    return fail(
      "The catalog is temporarily unavailable. Please try again.",
      503,
    );
  }
}
