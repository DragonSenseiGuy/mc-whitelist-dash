import { NextResponse } from "next/server";
import { hasAdmin } from "@/lib/db";

export async function GET() {
  return NextResponse.json({ hasAdmin: hasAdmin() });
}
