/**
 * Regression test for PAP-9585.
 *
 * `restartWorker` is called by the dev file-watcher whenever a local-path
 * plugin's source files change. Before PAP-9585 it only bounced the worker
 * subprocess, which left newly added `migrations/*.sql` files unapplied — the
 * plugin schema would silently drift out of sync with worker code.
 *
 * The fix is for `restartWorker` to do a full deactivate + reactivate cycle
 * via the plugin loader, which re-reads the manifest from disk and runs
 * `applyMigrations` (idempotently) before starting the new worker.
 */
import { describe, expect, it, vi } from "vitest";

const pluginRecord = {
  id: "plugin-1",
  pluginKey: "example.plugin",
  status: "ready",
  manifestJson: { id: "example.plugin", capabilities: [] },
  packageName: "@example/plugin",
  version: "1.0.0",
  packagePath: "/tmp/example-plugin",
};

const mockRegistry = vi.hoisted(() => ({
  getById: vi.fn(),
  getByKey: vi.fn(),
  update: vi.fn(),
  updateStatus: vi.fn(),
  upsertConfig: vi.fn(),
  getConfig: vi.fn(),
  list: vi.fn(),
  delete: vi.fn(),
}));

vi.mock("../services/plugin-registry.js", () => ({
  pluginRegistryService: () => mockRegistry,
}));

import { pluginLifecycleManager } from "../services/plugin-lifecycle.js";
import type { PluginLoader } from "../services/plugin-loader.js";
import type { PluginWorkerManager } from "../services/plugin-worker-manager.js";

function makeWorkerManagerStub() {
  const handle = {
    restart: vi.fn().mockResolvedValue(undefined),
    stop: vi.fn().mockResolvedValue(undefined),
  };
  return {
    handle,
    workerManager: {
      getWorker: vi.fn().mockReturnValue(handle),
      isRunning: vi.fn().mockReturnValue(true),
      startWorker: vi.fn().mockResolvedValue(undefined),
      stopWorker: vi.fn().mockResolvedValue(undefined),
      restartWorker: vi.fn().mockResolvedValue(undefined),
    } as unknown as PluginWorkerManager,
  };
}

describe("pluginLifecycleManager.restartWorker", () => {
  it("does a full deactivate+reactivate cycle when the loader has runtime services", async () => {
    mockRegistry.getById.mockResolvedValue(pluginRecord);
    mockRegistry.updateStatus.mockResolvedValue(pluginRecord);

    const { handle, workerManager } = makeWorkerManagerStub();

    const loader: Partial<PluginLoader> = {
      hasRuntimeServices: vi.fn().mockReturnValue(true) as PluginLoader["hasRuntimeServices"],
      loadSingle: vi.fn().mockResolvedValue({
        success: true,
        plugin: pluginRecord,
        registered: { worker: true, eventSubscriptions: 0, jobs: 0, webhooks: 0, tools: 0 },
      }) as PluginLoader["loadSingle"],
      unloadSingle: vi.fn().mockResolvedValue(undefined) as PluginLoader["unloadSingle"],
    };

    const lifecycle = pluginLifecycleManager(
      {} as never,
      { loader: loader as PluginLoader, workerManager },
    );
    const stopped = vi.fn();
    const started = vi.fn();
    lifecycle.on("plugin.worker_stopped", stopped);
    lifecycle.on("plugin.worker_started", started);

    await lifecycle.restartWorker("plugin-1");

    expect(loader.unloadSingle).toHaveBeenCalledWith("plugin-1", "example.plugin");
    expect(loader.loadSingle).toHaveBeenCalledWith("plugin-1");
    // The bare worker handle should NOT be bounced — the loader handles
    // worker (re)start as part of activate.
    expect(handle.restart).not.toHaveBeenCalled();
    expect(stopped).not.toHaveBeenCalled();
    expect(started).not.toHaveBeenCalled();
  });

  it("falls back to bouncing the worker handle when the loader has no runtime services", async () => {
    mockRegistry.getById.mockResolvedValue(pluginRecord);
    mockRegistry.updateStatus.mockResolvedValue(pluginRecord);

    const { handle, workerManager } = makeWorkerManagerStub();

    const loader: Partial<PluginLoader> = {
      hasRuntimeServices: vi.fn().mockReturnValue(false) as PluginLoader["hasRuntimeServices"],
      loadSingle: vi.fn() as PluginLoader["loadSingle"],
      unloadSingle: vi.fn() as PluginLoader["unloadSingle"],
    };

    const lifecycle = pluginLifecycleManager(
      {} as never,
      { loader: loader as PluginLoader, workerManager },
    );
    const stopped = vi.fn();
    const started = vi.fn();
    lifecycle.on("plugin.worker_stopped", stopped);
    lifecycle.on("plugin.worker_started", started);

    await lifecycle.restartWorker("plugin-1");

    expect(loader.unloadSingle).not.toHaveBeenCalled();
    expect(loader.loadSingle).not.toHaveBeenCalled();
    expect(handle.restart).toHaveBeenCalledTimes(1);
    expect(stopped).toHaveBeenCalledTimes(1);
    expect(stopped).toHaveBeenCalledWith({ pluginId: "plugin-1", pluginKey: "example.plugin" });
    expect(started).toHaveBeenCalledTimes(1);
    expect(started).toHaveBeenCalledWith({ pluginId: "plugin-1", pluginKey: "example.plugin" });
  });
});

describe("pluginLifecycleManager capability upgrade", () => {
  it("holds a new capability pending, rejects enable and changed approval, then activates the approved manifest", async () => {
    const original = { ...pluginRecord, manifestJson: { ...pluginRecord.manifestJson, version: "1.0.0" } };
    const candidate = { ...original.manifestJson, version: "1.1.0", capabilities: ["issues.read"] };
    let current = original;
    mockRegistry.getById.mockImplementation(async () => current);
    mockRegistry.updateStatus.mockImplementation(async (_id, patch) => { current = { ...current, ...patch }; return current; });
    mockRegistry.update.mockImplementation(async (_id, patch) => { current = { ...current, manifestJson: patch.manifest, version: patch.version }; return current; });
    const loader: Partial<PluginLoader> = {
      upgradePlugin: vi.fn().mockImplementation(async () => ({ oldManifest: current.manifestJson, newManifest: candidate, discovered: { packageName: original.packageName, version: candidate.version } })) as PluginLoader["upgradePlugin"],
      hasRuntimeServices: vi.fn().mockReturnValue(true) as PluginLoader["hasRuntimeServices"],
      unloadSingle: vi.fn().mockResolvedValue(undefined) as PluginLoader["unloadSingle"],
      loadSingle: vi.fn().mockResolvedValue({ success: true, plugin: current }) as PluginLoader["loadSingle"],
    };
    const lifecycle = pluginLifecycleManager({} as never, { loader: loader as PluginLoader });
    const pending = await lifecycle.upgrade(original.id);
    expect(pending.status).toBe("upgrade_pending");
    expect(current.manifestJson.capabilities).toEqual([]);
    expect(loader.loadSingle).not.toHaveBeenCalled();
    await expect(lifecycle.enable(original.id)).rejects.toThrow();
    const preview = await lifecycle.previewUpgrade(original.id);
    expect(preview.addedCapabilities).toEqual(["issues.read"]);
    await expect(lifecycle.approveUpgrade(original.id, "0".repeat(64))).rejects.toThrow();
    expect(current.status).toBe("upgrade_pending");
    expect(current.manifestJson.capabilities).toEqual([]);
    const ready = await lifecycle.approveUpgrade(original.id, preview.manifestDigest);
    expect(ready.status).toBe("ready");
    expect(current.manifestJson.capabilities).toEqual(["issues.read"]);
    expect(loader.loadSingle).toHaveBeenCalledTimes(1);
  });

  it("requires the old package to be restored before cancel", async () => {
    const original = { ...pluginRecord, manifestJson: { ...pluginRecord.manifestJson, version: "1.0.0" } };
    let current = original;
    let candidate = { ...original.manifestJson, version: "1.1.0", capabilities: ["issues.read"] };
    mockRegistry.getById.mockImplementation(async () => current);
    mockRegistry.updateStatus.mockImplementation(async (_id, patch) => { current = { ...current, ...patch }; return current; });
    const loader: Partial<PluginLoader> = {
      upgradePlugin: vi.fn().mockImplementation(async () => ({ oldManifest: current.manifestJson, newManifest: candidate, discovered: { packageName: original.packageName, version: candidate.version } })) as PluginLoader["upgradePlugin"],
      hasRuntimeServices: vi.fn().mockReturnValue(true) as PluginLoader["hasRuntimeServices"],
      unloadSingle: vi.fn().mockResolvedValue(undefined) as PluginLoader["unloadSingle"],
      loadSingle: vi.fn().mockResolvedValue({ success: true, plugin: current }) as PluginLoader["loadSingle"],
    };
    const lifecycle = pluginLifecycleManager({} as never, { loader: loader as PluginLoader });
    await lifecycle.upgrade(original.id);
    await expect(lifecycle.cancelUpgrade(original.id)).rejects.toThrow("Restore the installed plugin package");
    candidate = original.manifestJson;
    expect((await lifecycle.cancelUpgrade(original.id)).status).toBe("ready");
    expect(loader.loadSingle).toHaveBeenCalledTimes(1);
  });
});
