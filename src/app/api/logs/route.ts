import { NextRequest } from "next/server";
import { NodeSSH } from "node-ssh";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const ssh = new NodeSSH();
      let disposed = false;

      const cleanup = () => {
        if (!disposed) {
          disposed = true;
          ssh.dispose();
        }
      };

      request.signal.addEventListener("abort", cleanup);

      try {
        await ssh.connect({
          host: process.env.MC_SSH_HOST || "localhost",
          username: process.env.MC_SSH_USER || "server",
          privateKeyPath:
            process.env.MC_SSH_KEY_PATH || "/etc/mc-dashboard/id_ed25519",
          readyTimeout: 10000,
        });

        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: "connected" })}\n\n`)
        );

        const conn = ssh.connection;
        if (!conn) {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: "error", message: "No SSH connection" })}\n\n`
            )
          );
          controller.close();
          return;
        }

        conn.exec(
          "docker compose -f /home/server/minecraft/docker-compose.yml logs -f --tail=100",
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (err: Error | undefined, channel: any) => {
            if (err) {
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ type: "error", message: err.message })}\n\n`
                )
              );
              controller.close();
              cleanup();
              return;
            }

            channel.on("data", (data: Buffer) => {
              if (disposed) return;
              const lines = data.toString().split("\n").filter(Boolean);
              for (const line of lines) {
                try {
                  controller.enqueue(
                    encoder.encode(
                      `data: ${JSON.stringify({ type: "log", line })}\n\n`
                    )
                  );
                } catch {
                  // Controller may be closed
                }
              }
            });

            channel.stderr.on("data", (data: Buffer) => {
              if (disposed) return;
              const lines = data.toString().split("\n").filter(Boolean);
              for (const line of lines) {
                try {
                  controller.enqueue(
                    encoder.encode(
                      `data: ${JSON.stringify({ type: "log", line })}\n\n`
                    )
                  );
                } catch {
                  // Controller may be closed
                }
              }
            });

            channel.on("close", () => {
              if (!disposed) {
                try {
                  controller.enqueue(
                    encoder.encode(
                      `data: ${JSON.stringify({ type: "disconnected" })}\n\n`
                    )
                  );
                  controller.close();
                } catch {
                  // Already closed
                }
              }
              cleanup();
            });
          }
        );
      } catch (error) {
        const msg = error instanceof Error ? error.message : "Unknown error";
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ type: "error", message: msg })}\n\n`
          )
        );
        try {
          controller.close();
        } catch {}
        cleanup();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
