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
  eaglerProxy: boolean;
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
      eaglerProxy: lines.some(
        (l) => l.includes("eagler-proxy") && l.toLowerCase().includes("up")
      ),
    };
  } catch {
    return { paper: false, eaglerProxy: false };
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
  container: "minecraft" | "eagler-proxy"
): Promise<string> {
  const containerName =
    container === "minecraft"
      ? "minecraft-minecraft-1"
      : "eagler-proxy-eagler-proxy-1";
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

export async function getUUIDFromLogs(username: string): Promise<string | null> {
  try {
    const output = await execCommand(
      `docker compose -f /home/server/minecraft/docker-compose.yml logs --no-color 2>&1 | grep -i "UUID of player ${username} is" | tail -1`
    );
    const match = output.match(/UUID of player \w+ is ([0-9a-f-]+)/i);
    if (match) return match[1];

    // Also try disconnect pattern: id=uuid,name=NAME
    const output2 = await execCommand(
      `docker compose -f /home/server/minecraft/docker-compose.yml logs --no-color 2>&1 | grep -i "id=[0-9a-f-]*,name=${username}" | tail -1`
    );
    const match2 = output2.match(/id=([0-9a-f-]+),name=\w+/i);
    if (match2) return match2[1];

    return null;
  } catch {
    return null;
  }
}

export async function addToWhitelist(username: string): Promise<string> {
  // First, try to find the UUID from server logs
  const logUUID = await getUUIDFromLogs(username);

  if (logUUID) {
    // Read current whitelist
    const currentWhitelist = await getWhitelist();

    // Remove existing entry for this player if present
    const filtered = currentWhitelist.filter(
      (p) => p.name.toLowerCase() !== username.toLowerCase()
    );

    // Add with the correct UUID from logs
    filtered.push({ uuid: logUUID, name: username });

    // Write the updated whitelist.json
    const json = JSON.stringify(filtered, null, 2);
    await execCommand(
      `docker exec -i minecraft-minecraft-1 sh -c 'cat > /data/whitelist.json' <<'WHITELIST_EOF'\n${json}\nWHITELIST_EOF`
    );

    // Reload the whitelist in-game
    await execCommand(
      `docker exec -i minecraft-minecraft-1 rcon-cli whitelist reload`
    );

    return `Added ${username} to whitelist (UUID from logs: ${logUUID})`;
  }

  // Fallback: UUID not in logs, still add via RCON
  await execCommand(
    `docker exec -i minecraft-minecraft-1 rcon-cli whitelist add ${username}`
  );

  return `Added ${username} to whitelist — UUID not found in logs, used server lookup`;
}

export async function stopMinecraftServer(): Promise<string> {
  await execCommand(
    "docker compose -f /home/server/minecraft/docker-compose.yml down"
  );
  return "Minecraft server stopped";
}

export async function startMinecraftServer(): Promise<string> {
  await execCommand(
    "docker compose -f /home/server/minecraft/docker-compose.yml up -d"
  );
  return "Minecraft server started";
}

export async function rebootRpi(): Promise<string> {
  const sudoPass = process.env.MC_SSH_SUDO_PASS;
  if (!sudoPass) throw new Error("MC_SSH_SUDO_PASS is not configured");

  const ssh = await getSSHConnection();
  try {
    await ssh.execCommand(`echo '${sudoPass.replace(/'/g, "'\\''")}' | sudo -S reboot`, {
      execOptions: { pty: true },
    });
  } finally {
    ssh.dispose();
  }
  return "Raspberry Pi is rebooting";
}

export async function removeFromWhitelist(username: string): Promise<string> {
  return execCommand(
    `docker exec -i minecraft-minecraft-1 rcon-cli whitelist remove ${username}`
  );
}
