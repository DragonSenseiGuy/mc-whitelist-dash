"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function SetupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    fetch("/api/auth/check")
      .then((r) => r.json())
      .then((data) => {
        if (data.hasAdmin) {
          router.replace("/login");
        }
        setChecking(false);
      })
      .catch(() => setChecking(false));
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Setup failed");
        return;
      }

      router.replace("/dashboard/logs");
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-text-secondary font-mono text-sm animate-pulse-glow">
          INITIALIZING...
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md animate-fade-in">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-3 h-3 bg-status-warning rounded-sm" />
            <span className="text-status-warning font-mono text-xs tracking-widest uppercase">
              First Run
            </span>
          </div>
          <h1 className="font-display text-3xl font-bold text-text-primary tracking-tight">
            Create Admin
          </h1>
          <p className="text-text-secondary text-sm mt-2 font-mono">
            {"// set up your admin account"}
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
              placeholder="Min 8 characters"
            />
          </div>

          <div>
            <label className="block text-xs text-text-secondary font-mono uppercase tracking-wider mb-2">
              Confirm Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
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
              <span className="animate-pulse-glow">CREATING ACCOUNT...</span>
            ) : (
              "CREATE ADMIN ACCOUNT →"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
