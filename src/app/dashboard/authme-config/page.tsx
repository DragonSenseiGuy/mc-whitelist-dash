"use client";

import { useState, useEffect } from "react";
import { fetchWithAuth } from "@/lib/fetchWithAuth";

export default function AuthmeConfigPage() {
  const [content, setContent] = useState("");
  const [originalContent, setOriginalContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pushing, setPushing] = useState(false);
  const [message, setMessage] = useState<{
    text: string;
    type: "success" | "error";
  } | null>(null);

  useEffect(() => {
    fetchWithAuth("/api/authme-config")
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setMessage({ text: data.error, type: "error" });
        } else {
          setContent(data.content);
          setOriginalContent(data.content);
        }
      })
      .catch((err) =>
        setMessage({ text: err.message, type: "error" })
      )
      .finally(() => setLoading(false));
  }, []);

  const hasChanges = content !== originalContent;

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetchWithAuth("/api/authme-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      const data = await res.json();
      if (data.error) {
        setMessage({ text: data.error, type: "error" });
      } else {
        setOriginalContent(content);
        setMessage({ text: "Config saved to file", type: "success" });
      }
    } catch (err) {
      setMessage({
        text: err instanceof Error ? err.message : "Save failed",
        type: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  const handlePush = async () => {
    setPushing(true);
    setMessage(null);
    try {
      // Save first if there are unsaved changes
      if (hasChanges) {
        const saveRes = await fetchWithAuth("/api/authme-config", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content }),
        });
        const saveData = await saveRes.json();
        if (saveData.error) {
          setMessage({ text: saveData.error, type: "error" });
          return;
        }
        setOriginalContent(content);
      }

      const res = await fetchWithAuth("/api/authme-config", { method: "POST" });
      const data = await res.json();
      if (data.error) {
        setMessage({ text: data.error, type: "error" });
      } else {
        setMessage({ text: data.message, type: "success" });
      }
    } catch (err) {
      setMessage({
        text: err instanceof Error ? err.message : "Push failed",
        type: "error",
      });
    } finally {
      setPushing(false);
    }
  };

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <h1 className="font-display text-xl font-bold text-text-primary">
            AuthMe Config
          </h1>
          {hasChanges && (
            <span className="text-xs font-mono text-status-warning">
              ● UNSAVED
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={saving || !hasChanges}
            className="text-xs font-mono text-text-secondary hover:text-text-primary transition-colors px-3 py-1.5 border border-border rounded hover:border-border-bright disabled:opacity-40 disabled:cursor-not-allowed btn-press"
          >
            {saving ? "SAVING..." : "SAVE"}
          </button>
          <button
            onClick={handlePush}
            disabled={pushing}
            className="text-xs font-mono text-accent hover:text-accent-dim transition-colors px-3 py-1.5 border border-accent/30 rounded hover:border-accent/50 disabled:opacity-40 disabled:cursor-not-allowed btn-press glow-green"
          >
            {pushing ? "PUSHING..." : "PUSH & RESTART"}
          </button>
        </div>
      </div>

      {/* Status message */}
      {message && (
        <div
          className={`px-6 py-2 text-xs font-mono border-b border-border ${
            message.type === "success"
              ? "text-status-online bg-status-online/5"
              : "text-status-offline bg-status-offline/5"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Editor */}
      <div className="flex-1 overflow-hidden p-6">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-text-muted font-mono text-sm">
              Loading config...
            </p>
          </div>
        ) : (
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            spellCheck={false}
            className="w-full h-full bg-bg-input border border-border rounded p-4 text-sm text-text-primary font-mono resize-none focus:border-accent/50 transition-colors leading-6"
          />
        )}
      </div>
    </div>
  );
}
