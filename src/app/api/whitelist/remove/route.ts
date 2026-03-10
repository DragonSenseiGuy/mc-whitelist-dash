import { NextRequest, NextResponse } from "next/server";
import { removeFromWhitelist, getWhitelist } from "@/lib/ssh";

export async function POST(request: NextRequest) {
  const { username } = await request.json();

  if (!username || typeof username !== "string") {
    return NextResponse.json(
      { error: "Username is required" },
      { status: 400 }
    );
  }

  try {
    const result = await removeFromWhitelist(username.trim());
    const whitelist = await getWhitelist();
    return NextResponse.json({ success: true, message: result, whitelist });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
