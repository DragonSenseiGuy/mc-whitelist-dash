import { NextRequest, NextResponse } from "next/server";
import { getWhitelist, addToWhitelist } from "@/lib/ssh";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const whitelist = await getWhitelist();
    return NextResponse.json({ whitelist });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const { username } = await request.json();

  if (!username || typeof username !== "string") {
    return NextResponse.json(
      { error: "Username is required" },
      { status: 400 }
    );
  }

  try {
    const result = await addToWhitelist(username.trim());

    // Re-fetch whitelist to get the updated list with UUIDs
    const whitelist = await getWhitelist();

    return NextResponse.json({ success: true, message: result, whitelist });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
