"use client";

import { useState, useEffect, useRef, useCallback } from "react";

type ConnectionStatus = "connecting" | "connected" | "disconnected" | "error";

export default function LogsPage() {
  const [logs, setLogs] = useState<string[]>([]);
  const [filter, setFilter] = useState("");
  const [status, setStatus] = useState<ConnectionStatus>("connecting");
  const [autoScroll, setAutoScroll] = useState(true);
  const logContainerRef = useRef<HTMLDivElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  const connect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    setStatus("connecting");

    const es = new EventSource("/api/logs");
    eventSourceRef.current = es;

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        switch (data.type) {
          case "connected":
            setStatus("connected");
            break;
          case "log":
            setLogs((prev) => {
              const next = [...prev, data.line];
              // Keep last 2000 lines
              if (next.length > 2000) {
                return next.slice(-2000);
              }
              return next;
            });
            break;
          case "disconnected":
            setStatus("disconnected");
            break;
          case "error":
            setStatus("error");
            break;
        }
      } catch {
        // ignore malformed events
      }
    };

    es.onerror = () => {
      setStatus("disconnected");
      es.close();
      // Reconnect after 3 seconds
      setTimeout(connect, 3000);
    };
  }, []);

  useEffect(() => {
    connect();
    return () => {
      eventSourceRef.current?.close();
    };
  }, [connect]);

  // Auto-scroll
  useEffect(() => {
    if (autoScroll && logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  const handleScroll = () => {
    if (!logContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = logContainerRef.current;
    const atBottom = scrollHeight - scrollTop - clientHeight < 50;
    setAutoScroll(atBottom);
  };

  const filteredLogs = filter
    ? logs.filter((line) => line.toLowerCase().includes(filter.toLowerCase()))
    : logs;

  const clearLogs = () => setLogs([]);

  const statusConfig = {
    connecting: {
      color: "bg-status-warning",
      text: "CONNECTING",
      shadow: "shadow-[0_0_6px_rgba(255,170,0,0.5)]",
    },
    connected: {
      color: "bg-status-online",
      text: "LIVE",
      shadow: "shadow-[0_0_6px_rgba(0,255,136,0.5)]",
    },
    disconnected: {
      color: "bg-status-offline",
      text: "DISCONNECTED",
      shadow: "shadow-[0_0_6px_rgba(255,68,68,0.5)]",
    },
    error: {
      color: "bg-status-offline",
      text: "ERROR",
      shadow: "shadow-[0_0_6px_rgba(255,68,68,0.5)]",
    },
  };

  const currentStatus = statusConfig[status];

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <h1 className="font-display text-xl font-bold text-text-primary">
            Live Logs
          </h1>
          <div className="flex items-center gap-2">
            <div
              className={`w-2 h-2 rounded-full ${currentStatus.color} ${currentStatus.shadow} ${
                status === "connecting" ? "animate-pulse-glow" : ""
              }`}
            />
            <span className="text-xs font-mono text-text-secondary">
              {currentStatus.text}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-text-muted">
            {logs.length} lines
          </span>
          <button
            onClick={clearLogs}
            className="text-xs font-mono text-text-secondary hover:text-text-primary transition-colors px-2 py-1 border border-border rounded hover:border-border-bright"
          >
            CLEAR
          </button>
          {status === "disconnected" && (
            <button
              onClick={connect}
              className="text-xs font-mono text-accent hover:text-accent-dim transition-colors px-2 py-1 border border-accent/30 rounded hover:border-accent/50"
            >
              RECONNECT
            </button>
          )}
        </div>
      </div>

      {/* Filter */}
      <div className="px-6 py-3 border-b border-border shrink-0">
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-sm">
            ⌕
          </span>
          <input
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter logs..."
            className="w-full bg-bg-input border border-border rounded pl-8 pr-4 py-2 text-sm text-text-primary font-mono placeholder:text-text-muted focus:border-accent/50 transition-colors"
          />
          {filter && (
            <button
              onClick={() => setFilter("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary text-sm"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Log viewer */}
      <div
        ref={logContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-6 py-4 relative scanlines"
      >
        {filteredLogs.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-text-muted font-mono text-sm">
              {status === "connecting"
                ? "Connecting to server..."
                : status === "connected"
                  ? "Waiting for log output..."
                  : "No logs available"}
            </p>
          </div>
        ) : (
          <div className="space-y-0">
            {filteredLogs.map((line, i) => (
              <LogLine key={i} line={line} filter={filter} />
            ))}
            {autoScroll && status === "connected" && (
              <span className="cursor-blink text-transparent">_</span>
            )}
          </div>
        )}
      </div>

      {/* Scroll indicator */}
      {!autoScroll && (
        <div className="absolute bottom-4 right-8 z-10">
          <button
            onClick={() => {
              setAutoScroll(true);
              if (logContainerRef.current) {
                logContainerRef.current.scrollTop =
                  logContainerRef.current.scrollHeight;
              }
            }}
            className="bg-bg-card border border-accent/30 text-accent font-mono text-xs px-3 py-2 rounded shadow-lg hover:border-accent/50 transition-all glow-green"
          >
            ↓ SCROLL TO BOTTOM
          </button>
        </div>
      )}
    </div>
  );
}

function LogLine({ line, filter }: { line: string; filter: string }) {
  // Color based on log level
  let textColor = "text-accent/80";
  if (line.includes("WARN") || line.includes("WARNING")) {
    textColor = "text-status-warning";
  } else if (line.includes("ERROR") || line.includes("SEVERE")) {
    textColor = "text-status-offline";
  } else if (line.includes("INFO")) {
    textColor = "text-accent/70";
  }

  // Highlight filter matches
  if (filter) {
    const regex = new RegExp(`(${escapeRegex(filter)})`, "gi");
    const parts = line.split(regex);

    return (
      <div
        className={`log-line font-mono text-xs leading-6 px-2 -mx-2 rounded ${textColor}`}
      >
        {parts.map((part, i) =>
          regex.test(part) ? (
            <mark
              key={i}
              className="bg-accent/25 text-accent rounded px-0.5"
            >
              {part}
            </mark>
          ) : (
            <span key={i}>{part}</span>
          )
        )}
      </div>
    );
  }

  return (
    <div
      className={`log-line font-mono text-xs leading-6 px-2 -mx-2 rounded ${textColor}`}
    >
      {line}
    </div>
  );
}

function escapeRegex(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
