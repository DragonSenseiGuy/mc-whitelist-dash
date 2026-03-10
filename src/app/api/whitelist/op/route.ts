import { NextRequest, NextResponse } from "next/server";
import { opPlayer, deopPlayer, getOps } from "@/lib/ssh";

export async function GET() {
  try {
    const ops = await getOps();
    return NextResponse.json({ ops });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const { username, action } = await request.json();

  if (!username || typeof username !== "string") {
    return NextResponse.json(
      { error: "Username is required" },
      { status: 400 }
    );
  }

  if (action !== "op" && action !== "deop") {
    return NextResponse.json(
      { error: "Action must be 'op' or 'deop'" },
      { status: 400 }
    );
  }

  try {
    const result =
      action === "op"
        ? await opPlayer(username.trim())
        : await deopPlayer(username.trim());
    const ops = await getOps();
    return NextResponse.json({ success: true, message: result, ops });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
