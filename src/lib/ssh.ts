import { NodeSSH } from "node-ssh";

const SSH_HOST = process.env.MC_SSH_HOST || "localhost";
const SSH_USER = process.env.MC_SSH_USER || "server";
const SSH_KEY_PATH = process.env.MC_SSH_KEY_PATH || "/etc/mc-dashboard/id_ed25519";

export async function getSSHConnection(): Promise<NodeSSH> {
  const ssh = new NodeSSH();

  await ssh.connect({
    host: SSH_HOST,
    username: SSH_USER,
    privateKeyPath: SSH_KEY_PATH,
    readyTimeout: 10000,
  });

  return ssh;
}

export async function execCommand(command: string): Promise<string> {
  const ssh = await getSSHConnection();
  try {
    const result = await ssh.execCommand(command);
    if (result.stderr && !result.stdout) {
      throw new Error(result.stderr);
    }
    return result.stdout;
  } finally {
    ssh.dispose();
  }
}

export async function getContainerStatus(): Promise<{
  paper: boolean;
  waterfall: boolean;
}> {
  try {
    const output = await execCommand(
      'docker ps --format "{{.Names}}:{{.Status}}"'
    );
    const lines = output.split("\n");
    return {
      paper: lines.some(
        (l) => l.includes("minecraft") && l.toLowerCase().includes("up")
      ),
      waterfall: lines.some(
        (l) => l.includes("waterfall") && l.toLowerCase().includes("up")
      ),
    };
  } catch {
    return { paper: false, waterfall: false };
  }
}

export async function getPlayerCount(): Promise<{
  online: number;
  max: number;
  players: string[];
}> {
  try {
    const output = await execCommand(
      'docker exec minecraft-minecraft-1 rcon-cli list'
    );
    // Parse "There are X of a max of Y players online: player1, player2"
    const match = output.match(
      /There are (\d+) of a max of (\d+) players online:(.*)/
    );
    if (match) {
      const players = match[3]
        .trim()
        .split(",")
        .map((p) => p.trim())
        .filter(Boolean);
      return { online: parseInt(match[1]), max: parseInt(match[2]), players };
    }
    return { online: 0, max: 0, players: [] };
  } catch {
    return { online: 0, max: 0, players: [] };
  }
}

export async function restartContainer(
  container: "minecraft" | "waterfall"
): Promise<string> {
  const containerName =
    container === "minecraft"
      ? "minecraft-minecraft-1"
      : "minecraft-waterfall-1";
  return execCommand(`docker restart ${containerName}`);
}

export async function getWhitelist(): Promise<
  Array<{ uuid: string; name: string }>
> {
  const output = await execCommand(
    "docker exec minecraft-minecraft-1 cat /data/whitelist.json"
  );
  return JSON.parse(output);
}

export async function addToWhitelist(username: string): Promise<string> {
  return execCommand(
    `docker exec -i minecraft-minecraft-1 rcon-cli whitelist add ${username}`
  );
}

export async function removeFromWhitelist(username: string): Promise<string> {
  return execCommand(
    `docker exec -i minecraft-minecraft-1 rcon-cli whitelist remove ${username}`
  );
}
