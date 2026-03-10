import { NextRequest, NextResponse } from "next/server";
import {
  readAuthmeConfig,
  writeAuthmeConfig,
  pushAuthmeConfig,
} from "@/lib/ssh";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const content = await readAuthmeConfig();
    return NextResponse.json({ content });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { content } = await request.json();
    await writeAuthmeConfig(content);
    return NextResponse.json({ success: true, message: "Config saved" });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST() {
  try {
    const message = await pushAuthmeConfig();
    return NextResponse.json({ success: true, message });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
