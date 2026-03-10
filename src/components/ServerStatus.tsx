"use client";

import { useState, useEffect, useCallback } from "react";

interface StatusData {
  containers: { paper: boolean; eaglerProxy: boolean };
  players: { online: number; max: number; players: string[] };
  error?: string;
}

export default function ServerStatus() {
  const [status, setStatus] = useState<StatusData | null>(null);
  const [restarting, setRestarting] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/status");
      const data = await res.json();
      setStatus(data);
    } catch {
      setStatus(null);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 15000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  const handleRestart = async (container: "minecraft" | "eagler-proxy") => {
    if (
      !confirm(`Restart ${container} container? This will disconnect players.`)
    )
      return;
    setRestarting(container);
    try {
      await fetch("/api/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ container }),
      });
      // Wait a bit then refresh status
      setTimeout(fetchStatus, 3000);
    } catch {
      // ignore
    } finally {
      setRestarting(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Container Status */}
      <div>
        <h3 className="text-xs text-text-secondary font-mono uppercase tracking-wider mb-3">
          Containers
        </h3>
        <div className="space-y-2">
          <ContainerRow
            name="Paper"
            running={status?.containers.paper ?? false}
            restarting={restarting === "minecraft"}
            onRestart={() => handleRestart("minecraft")}
          />
          <ContainerRow
            name="Eagler Proxy"
            running={status?.containers.eaglerProxy ?? false}
            restarting={restarting === "eagler-proxy"}
            onRestart={() => handleRestart("eagler-proxy")}
          />
        </div>
      </div>

      {/* Players */}
      <div>
        <h3 className="text-xs text-text-secondary font-mono uppercase tracking-wider mb-3">
          Players
        </h3>
        <div className="bg-bg-input border border-border rounded p-3">
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-2xl font-display font-bold text-accent">
              {status?.players.online ?? "—"}
            </span>
            <span className="text-text-secondary text-xs font-mono">
              / {status?.players.max ?? "—"} online
            </span>
          </div>
          {status?.players.players && status.players.players.length > 0 && (
            <div className="space-y-1">
              {status.players.players.map((player) => (
                <div
                  key={player}
                  className="text-xs font-mono text-text-primary flex items-center gap-2"
                >
                  <span className="w-1.5 h-1.5 bg-accent rounded-full" />
                  {player}
                </div>
              ))}
            </div>
          )}
          {(!status?.players.players ||
            status.players.players.length === 0) && (
            <p className="text-xs text-text-muted font-mono">
              No players online
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function ContainerRow({
  name,
  running,
  restarting,
  onRestart,
}: {
  name: string;
  running: boolean;
  restarting: boolean;
  onRestart: () => void;
}) {
  return (
    <div className="flex items-center justify-between bg-bg-input border border-border rounded px-3 py-2.5">
      <div className="flex items-center gap-2.5">
        <div
          className={`w-2 h-2 rounded-full ${
            running
              ? "bg-status-online shadow-[0_0_6px_rgba(0,255,136,0.5)]"
              : "bg-status-offline shadow-[0_0_6px_rgba(255,68,68,0.5)]"
          }`}
        />
        <div>
          <span className="text-sm text-text-primary font-mono">{name}</span>
          <span className="text-xs text-text-muted ml-2">
            {running ? "RUNNING" : "STOPPED"}
          </span>
        </div>
      </div>
      <button
        onClick={onRestart}
        disabled={restarting}
        className="text-xs font-mono text-text-secondary hover:text-status-warning transition-colors disabled:opacity-50"
        title={`Restart ${name}`}
      >
        {restarting ? (
          <span className="animate-pulse-glow">⟳</span>
        ) : (
          "⟳"
        )}
      </button>
    </div>
  );
}
