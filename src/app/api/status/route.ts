import { NextRequest, NextResponse } from "next/server";
import { getContainerStatus, getPlayerCount, restartContainer } from "@/lib/ssh";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [containers, players] = await Promise.all([
      getContainerStatus(),
      getPlayerCount(),
    ]);

    return NextResponse.json({
      containers,
      players,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: msg, containers: { paper: false, waterfall: false }, players: { online: 0, max: 0, players: [] } },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const { container } = await request.json();

  if (container !== "minecraft" && container !== "waterfall") {
    return NextResponse.json(
      { error: "Invalid container name" },
      { status: 400 }
    );
  }

  try {
    await restartContainer(container);
    return NextResponse.json({ success: true });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
