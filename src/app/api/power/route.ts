import { NextRequest, NextResponse } from "next/server";
import {
  stopMinecraftServer,
  startMinecraftServer,
  rebootRpi,
} from "@/lib/ssh";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const { action } = await request.json();

  try {
    switch (action) {
      case "stop-server":
        await stopMinecraftServer();
        return NextResponse.json({ success: true, message: "Minecraft server stopped" });

      case "start-server":
        await startMinecraftServer();
        return NextResponse.json({ success: true, message: "Minecraft server started" });

      case "reboot-rpi":
        await rebootRpi();
        return NextResponse.json({ success: true, message: "Raspberry Pi is rebooting" });

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
