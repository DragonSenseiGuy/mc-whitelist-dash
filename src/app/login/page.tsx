"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Login failed");
        return;
      }

      router.replace("/dashboard/logs");
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md animate-fade-in">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-3 h-3 bg-accent rounded-sm glow-green" />
            <span className="text-text-secondary font-mono text-xs tracking-widest uppercase">
              MC Admin
            </span>
          </div>
          <h1 className="font-display text-3xl font-bold text-text-primary tracking-tight">
            Server Access
          </h1>
          <p className="text-text-secondary text-sm mt-2 font-mono">
            {"// authenticate to continue"}
          </p>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="bg-bg-card border border-border rounded-lg p-6 space-y-5"
        >
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded px-4 py-2.5 text-red-400 text-sm font-mono">
              ERROR: {error}
            </div>
          )}

          <div>
            <label className="block text-xs text-text-secondary font-mono uppercase tracking-wider mb-2">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full bg-bg-input border border-border rounded px-4 py-3 text-sm text-text-primary font-mono placeholder:text-text-muted focus:border-accent transition-colors"
              placeholder="admin@server.local"
            />
          </div>

          <div>
            <label className="block text-xs text-text-secondary font-mono uppercase tracking-wider mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full bg-bg-input border border-border rounded px-4 py-3 text-sm text-text-primary font-mono placeholder:text-text-muted focus:border-accent transition-colors"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-accent/10 border border-accent/30 text-accent font-mono text-sm font-semibold py-3 rounded hover:bg-accent/20 hover:border-accent/50 transition-all btn-press disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="animate-pulse-glow">AUTHENTICATING...</span>
            ) : (
              "SIGN IN →"
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-text-muted text-xs font-mono">
            ▸ Authorized personnel only
          </p>
        </div>
      </div>
    </div>
  );
}
