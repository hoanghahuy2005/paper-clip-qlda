export type SnapshotClock = { generatedAt: string } | null | undefined;

export function snapshotFreshness(snapshot: SnapshotClock, error: unknown, now: number): "unknown" | "stale" | "active" {
  if (!snapshot) return "unknown";
  const generatedAt = Date.parse(snapshot.generatedAt);
  if (error || !Number.isFinite(generatedAt) || now - generatedAt > 30_000) return "stale";
  return "active";
}

export function startSnapshotPolling(refresh: () => void, everyMs = 5_000): () => void {
  const timer = setInterval(refresh, everyMs);
  return () => clearInterval(timer);
}
