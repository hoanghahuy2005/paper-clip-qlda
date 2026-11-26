import type { PaperclipPluginManifestV1 } from "@paperclipai/plugin-sdk";

const manifest: PaperclipPluginManifestV1 = {
  id: "vpd-office-poc",
  apiVersion: 1,
  version: "0.1.0",
  displayName: "Office 3D PoC",
  description: "Read-only company office feasibility prototype",
  author: "VPD",
  categories: ["ui"],
  capabilities: ["ui.page.register", "ui.sidebar.register", "agents.read", "approvals.read", "events.subscribe", "issues.read"],
  entrypoints: { worker: "./dist/worker.js", ui: "./dist/ui" },
  ui: { slots: [
    { type: "page", id: "office-page", displayName: "Office", exportName: "OfficePage", routePath: "office" },
    { type: "sidebar", id: "office-sidebar", displayName: "Office", exportName: "OfficeSidebar" },
  ] },
};
export default manifest;
