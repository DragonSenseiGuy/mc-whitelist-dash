"use client";

import { useState, useEffect, useCallback } from "react";
import { fetchWithAuth } from "@/lib/fetchWithAuth";

interface Player {
  uuid: string;
  name: string;
}

export default function WhitelistPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [username, setUsername] = useState("");
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  const [togglingOp, setTogglingOp] = useState<string | null>(null);
  const [ops, setOps] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState("");
  const [warning, setWarning] = useState("");
  const [recentUUIDs, setRecentUUIDs] = useState<
    Array<{ name: string; uuid: string }>
  >([]);
  const [showUUIDHelper, setShowUUIDHelper] = useState(false);

  const fetchWhitelist = useCallback(async () => {
    try {
      const res = await fetchWithAuth("/api/whitelist");
      const data = await res.json();
      if (data.whitelist) {
        setPlayers(data.whitelist);
      }
      if (data.error) {
        setError(data.error);
      }
    } catch {
      setError("Failed to fetch whitelist");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchOps = useCallback(async () => {
    try {
      const res = await fetchWithAuth("/api/whitelist/op");
      const data = await res.json();
      if (data.ops) {
        setOps(new Set(data.ops.map((o: { name: string }) => o.name.toLowerCase())));
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchWhitelist();
    fetchOps();
  }, [fetchWhitelist, fetchOps]);

  // Parse UUIDs from SSE logs
  useEffect(() => {
    const token = localStorage.getItem("mc_admin_token");
    const es = new EventSource(token ? `/api/logs?_token=${token}` : "/api/logs");
    const uuids: Array<{ name: string; uuid: string }> = [];

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "log") {
          // Match patterns like "UUID of player PlayerName is abc-def-..."
          // or "Disconnecting com.mojang.authlib.GameProfile@...[id=uuid,name=NAME,..."
          const uuidMatch = data.line.match(
            /UUID of player (\w+) is ([0-9a-f-]+)/i
          );
          if (uuidMatch) {
            const existing = uuids.findIndex((u) => u.name === uuidMatch[1]);
            if (existing >= 0) {
              uuids[existing] = { name: uuidMatch[1], uuid: uuidMatch[2] };
            } else {
              uuids.push({ name: uuidMatch[1], uuid: uuidMatch[2] });
            }
            setRecentUUIDs([...uuids].slice(-10));
          }

          // Also match "id=uuid,name=NAME" pattern from disconnect messages
          const disconnectMatch = data.line.match(
            /id=([0-9a-f-]+),name=(\w+)/i
          );
          if (disconnectMatch) {
            const existing = uuids.findIndex(
              (u) => u.name === disconnectMatch[2]
            );
            if (existing >= 0) {
              uuids[existing] = {
                name: disconnectMatch[2],
                uuid: disconnectMatch[1],
              };
            } else {
              uuids.push({
                name: disconnectMatch[2],
                uuid: disconnectMatch[1],
              });
            }
            setRecentUUIDs([...uuids].slice(-10));
          }
        }
      } catch {
        // ignore
      }
    };

    return () => es.close();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return;
    setAdding(true);
    setMessage("");
    setWarning("");
    setError("");

    try {
      const res = await fetchWithAuth("/api/whitelist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to add player");
        return;
      }

      const serverMsg = data.message || "";
      if (serverMsg.includes("UUID not found in logs")) {
        setWarning(`Added ${username} — UUID not found in logs, used server lookup (may be incorrect)`);
      } else {
        setMessage(serverMsg || `Added ${username} to whitelist`);
      }
      setUsername("");
      if (data.whitelist) {
        setPlayers(data.whitelist);
      } else {
        await fetchWhitelist();
      }
    } catch {
      setError("Network error");
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async (name: string) => {
    if (!confirm(`Remove ${name} from the whitelist?`)) return;
    setRemoving(name);
    setMessage("");
    setError("");

    try {
      const res = await fetchWithAuth("/api/whitelist/remove", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: name }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to remove player");
        return;
      }

      setMessage(`Removed ${name} from whitelist`);
      if (data.whitelist) {
        setPlayers(data.whitelist);
      } else {
        await fetchWhitelist();
      }
    } catch {
      setError("Network error");
    } finally {
      setRemoving(null);
    }
  };

  const handleToggleOp = async (name: string) => {
    const isOp = ops.has(name.toLowerCase());
    const action = isOp ? "deop" : "op";
    if (!confirm(`${isOp ? "Remove OP from" : "Give OP to"} ${name}?`)) return;
    setTogglingOp(name);
    setMessage("");
    setError("");

    try {
      const res = await fetchWithAuth("/api/whitelist/op", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: name, action }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || `Failed to ${action} player`);
        return;
      }

      setMessage(`${isOp ? "Removed OP from" : "Gave OP to"} ${name}`);
      if (data.ops) {
        setOps(new Set(data.ops.map((o: { name: string }) => o.name.toLowerCase())));
      } else {
        await fetchOps();
      }
    } catch {
      setError("Network error");
    } finally {
      setTogglingOp(null);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setMessage(`Copied UUID to clipboard`);
    setTimeout(() => setMessage(""), 2000);
  };

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-xl font-bold text-text-primary">
              Whitelist Manager
            </h1>
            <p className="text-xs text-text-secondary font-mono mt-0.5">
              {players.length} player{players.length !== 1 ? "s" : ""}{" "}
              whitelisted
            </p>
          </div>
          <button
            onClick={() => setShowUUIDHelper(!showUUIDHelper)}
            className={`text-xs font-mono px-3 py-2 rounded border transition-all ${
              showUUIDHelper
                ? "bg-accent/10 border-accent/30 text-accent"
                : "border-border text-text-secondary hover:text-text-primary hover:border-border-bright"
            }`}
          >
            UUID Helper {recentUUIDs.length > 0 && `(${recentUUIDs.length})`}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Messages */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded px-4 py-2.5 text-red-400 text-sm font-mono animate-fade-in">
            ERROR: {error}
          </div>
        )}
        {message && (
          <div className="bg-accent/10 border border-accent/30 rounded px-4 py-2.5 text-accent text-sm font-mono animate-fade-in">
            ✓ {message}
          </div>
        )}
        {warning && (
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded px-4 py-2.5 text-yellow-400 text-sm font-mono animate-fade-in">
            ⚠ {warning}
          </div>
        )}

        {/* UUID Helper Panel */}
        {showUUIDHelper && (
          <div className="bg-bg-card border border-border rounded-lg p-4 animate-slide-up">
            <h3 className="text-xs text-text-secondary font-mono uppercase tracking-wider mb-3">
              Recent UUIDs from Logs
            </h3>
            {recentUUIDs.length === 0 ? (
              <p className="text-xs text-text-muted font-mono">
                No UUIDs detected in recent logs. UUIDs appear when players try
                to connect.
              </p>
            ) : (
              <div className="space-y-2">
                {recentUUIDs.map((entry) => (
                  <div
                    key={entry.uuid}
                    className="flex items-center justify-between bg-bg-input border border-border rounded px-3 py-2"
                  >
                    <div>
                      <span className="text-sm font-mono text-text-primary">
                        {entry.name}
                      </span>
                      <span className="text-xs font-mono text-text-muted ml-3">
                        {entry.uuid}
                      </span>
                    </div>
                    <button
                      onClick={() => copyToClipboard(entry.uuid)}
                      className="text-xs font-mono text-accent hover:text-accent-dim transition-colors"
                    >
                      COPY
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Add Player Form */}
        <div className="bg-bg-card border border-border rounded-lg p-5">
          <h3 className="text-xs text-text-secondary font-mono uppercase tracking-wider mb-4">
            Add Player
          </h3>
          <form onSubmit={handleAdd} className="flex gap-3">
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Username"
              required
              className="flex-1 bg-bg-input border border-border rounded px-4 py-2.5 text-sm text-text-primary font-mono placeholder:text-text-muted focus:border-accent/50 transition-colors"
            />
            <button
              type="submit"
              disabled={adding || !username.trim()}
              className="bg-accent/10 border border-accent/30 text-accent font-mono text-sm px-5 py-2.5 rounded hover:bg-accent/20 hover:border-accent/50 transition-all btn-press disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
            >
              {adding ? (
                <span className="animate-pulse-glow">ADDING...</span>
              ) : (
                "+ ADD"
              )}
            </button>
          </form>
        </div>

        {/* Player Table */}
        <div className="bg-bg-card border border-border rounded-lg overflow-hidden">
          <div className="px-5 py-3 border-b border-border">
            <h3 className="text-xs text-text-secondary font-mono uppercase tracking-wider">
              Whitelisted Players
            </h3>
          </div>

          {loading ? (
            <div className="p-8 text-center">
              <span className="text-text-muted font-mono text-sm animate-pulse-glow">
                LOADING WHITELIST...
              </span>
            </div>
          ) : players.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-text-muted font-mono text-sm">
                No players whitelisted
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {/* Table Header */}
              <div className="grid grid-cols-[1fr_2fr_auto] px-5 py-2.5 text-xs font-mono text-text-muted uppercase tracking-wider">
                <span>Name</span>
                <span>UUID</span>
                <span>Action</span>
              </div>

              {/* Player Rows */}
              {players.map((player) => {
                const isOp = ops.has(player.name.toLowerCase());
                return (
                  <div
                    key={player.uuid}
                    className="grid grid-cols-[1fr_2fr_auto] px-5 py-3 items-center hover:bg-bg-hover transition-colors group"
                  >
                    <span className="text-sm font-mono text-text-primary flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-accent/50 rounded-full group-hover:bg-accent transition-colors" />
                      {player.name}
                      {isOp && (
                        <span className="text-[10px] font-mono bg-yellow-500/15 text-yellow-400 border border-yellow-500/30 px-1.5 py-0.5 rounded">
                          OP
                        </span>
                      )}
                    </span>
                    <span className="text-xs font-mono text-text-secondary">
                      {player.uuid}
                    </span>
                    <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleToggleOp(player.name)}
                        disabled={togglingOp === player.name}
                        className={`text-xs font-mono transition-colors disabled:opacity-50 ${
                          isOp
                            ? "text-yellow-400 hover:text-yellow-300"
                            : "text-text-muted hover:text-yellow-400"
                        }`}
                      >
                        {togglingOp === player.name ? (
                          <span className="animate-pulse-glow">
                            {isOp ? "DEOPING..." : "OPING..."}
                          </span>
                        ) : isOp ? (
                          "⚡ DEOP"
                        ) : (
                          "⚡ OP"
                        )}
                      </button>
                      <button
                        onClick={() => handleRemove(player.name)}
                        disabled={removing === player.name}
                        className="text-xs font-mono text-text-muted hover:text-status-offline transition-colors disabled:opacity-50"
                      >
                        {removing === player.name ? (
                          <span className="animate-pulse-glow">REMOVING...</span>
                        ) : (
                          "✕ REMOVE"
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
