# VPD Office 3D — G0 Technical Spike & Plugin Feasibility Report

Ngày: 25/11/2026  
Trạng thái: **SURVEY COMPLETE — DỪNG CHỜ CEO PHÊ DUYỆT PoC**  
Phạm vi: khảo sát source và lập kế hoạch; không sửa production code, không cài dependency, không triển khai plugin/G1.

## 1. Executive summary

Repository hiện đã có một plugin platform thực tế với worker SDK, manifest UI slots, React UI bridge, company-scoped bridge authorization và SSE stream bridge. Vì vậy một Office PoC là **khả thi về kiến trúc**.

Các điểm đã xác minh bằng source:

- Paperclip host hiện tại là monorepo pnpm, server Express 5.1.0, UI React 19.2.8 + Vite 8.2.2.
- Plugin SDK hiện tại là `@paperclipai/plugin-sdk` **1.0.0**; workspace host/server/shared đang ở **0.3.1**.
- Có slot `page` và `sidebar`, bundle UI qua `entrypoints.ui`, component export qua `ui.slots[].exportName`.
- Worker có host RPC đọc `agents.list`, `agents.get`, `issues.list/get`, `issues.listComments`, `approvals.list/get`; các capability tương ứng tồn tại.
- UI có `usePluginData`, `usePluginStream`, `useHostContext`, `useHostNavigation`.
- Realtime UI bridge dùng SSE `/api/plugins/:pluginId/bridge/stream/:channel`, scoped theo `companyId`.
- Three.js `0.185.1` đã có trong `@paperclipai/shared`; `@types/three` `0.185.4` có ở devDependencies. React Three Fiber/Drei chưa xuất hiện trong package manifests đã khảo sát.

Kết luận hiện tại: **GO để xin phê duyệt PoC tối thiểu; NO-GO cho G1**. PoC cần approval riêng nếu muốn thêm R3F hoặc thay đổi dependency/plugin package.

## 2. Source evidence và kiến trúc repository

| Khu vực | Evidence | Kết luận |
|---|---|---|
| Monorepo/tooling | `package.json`, `pnpm-workspace.yaml`, `pnpm-lock.yaml` | pnpm 9.15.4; Node `>=24.11.0`; TypeScript 7; Vitest 5; Turbo 2.11.10. |
| Host server | `server/package.json` dependencies; `server/src/app.ts` | Express `^5.1.0`, REST API mounted dưới `/api`, server phục vụ UI và plugin routes. |
| Main UI | `ui/package.json`, `ui/vite.config.ts` | React `^19.2.8`, React DOM, Vite `^8.2.2`, React Router DOM `^7.18.4`. |
| Plugin worker SDK | `packages/plugins/sdk/package.json`, `src/define-plugin.ts` | `definePlugin()` tạo sealed worker plugin; SDK version 1.0.0. |
| Shared contracts | `packages/shared/src/types/plugin.ts`, `src/constants.ts` | Manifest, capabilities, UI slot declarations và plugin validation nằm ở shared. |
| Plugin host routes | `server/src/routes/plugins.ts`, `server/src/routes/plugin-ui-static.ts` | UI contributions discovery, static/dev UI serving, bridge data/action/stream, company access. |
| Existing examples | `packages/plugins/examples/plugin-kitchen-sink-example/src/manifest.ts` | Có mẫu `page`, `sidebar`, dashboard/detail UI, manifest capability và UI bundle. |

### Frontend/backend boundary

Plugin UI bundle chạy trong host UI và chỉ giao tiếp qua SDK bridge hooks. SDK UI types ghi rõ plugin UI không gọi host internals hoặc host APIs trực tiếp. Worker xử lý host RPC/data/events; UI đọc data qua `usePluginData` và nhận stream qua `usePluginStream`.

## 3. Plugin registration và sidebar/page

Manifest model thực tế:

```ts
entrypoints: { worker: "./dist/worker.js", ui: "./dist/ui" }
capabilities: ["ui.sidebar.register", "ui.page.register", ...]
ui: {
  slots: [
    { type: "page", id: "office-page", displayName: "Office", exportName: "OfficePage", routePath: "office" },
    { type: "sidebar", id: "office-sidebar", displayName: "Office", exportName: "OfficeSidebar", routePath: "office" }
  ]
}
```

Đây là cấu trúc đề xuất dựa trên type/validator/example; chưa tạo manifest PoC. `PluginPageProps` và `PluginSidebarProps` nhận `context` có `companyId`, `companyPrefix`, entity/project/user context. Route page có thể là global hoặc company-context tùy `routePath`/host slot semantics.

Evidence: `packages/shared/src/types/plugin.ts` `PluginUiSlotDeclaration`, `packages/plugins/sdk/src/ui/types.ts` `PluginPageProps`/`PluginSidebarProps`, `packages/plugins/examples/plugin-kitchen-sink-example/src/manifest.ts`, `server/src/routes/plugins.ts` UI contribution route.

## 4. Data/API/SDK thực tế

### 4.1 Worker host RPC

| Data | SDK protocol method | Capability | PoC status |
|---|---|---|---|
| Companies | `companies.list`, `companies.get` | `companies.read` | VERIFIED in `packages/plugins/sdk/src/protocol.ts` + capability list |
| Agents | `agents.list`, `agents.get` | `agents.read` | VERIFIED; `agents.list` nhận `companyId`, status, limit, offset |
| Issues | `issues.list`, `issues.get` | `issues.read` | VERIFIED; company/project/status/assignee filters tồn tại |
| Comments | `issues.listComments` | `issue.comments.read` | VERIFIED; nhận `issueId`, `companyId` |
| Runs/runtime | `agents.getRuntime`, issue subtree/orchestration methods | `agents.read` hoặc orchestration read tùy method | PARTIAL cho exact trạng thái cần Office; cần chọn payload tối thiểu trong PoC |
| Approvals | `approvals.list`, `approvals.get` | `approvals.read` | VERIFIED source; payload được host redact theo comment trong constants |
| Realtime lifecycle | `events.subscribe` worker capability + `ctx.events` | `events.subscribe` | VERIFIED as SDK surface; exact event feed needed for agent status must be tested |
| Plugin UI data | worker `ctx.data.register` → `usePluginData` | bridge + declared read capabilities | VERIFIED |
| Plugin UI stream | worker `ctx.streams.emit` → `usePluginStream` → SSE | bridge + company scope | VERIFIED |

The protocol also exposes write methods (`issues.create/update`, comments create, approvals decide, agents pause/resume/invoke), but the Office PoC must not declare or call those capabilities. Read-only is a deliberate scope gate.

### 4.2 Approval read limitation

`approvals.read` and `approvals.list/get` exist in source, so reading approvals is **architecturally supported**. It is not yet verified that the current runtime has an allowed approval read route/capability configuration for the target fork/company. The PoC must fail visibly with a supported-state banner if the host returns denied/unsupported; it must never show fake zero pending approvals.

### 4.3 Realtime

The source provides a real plugin stream bridge:

- Worker: `ctx.streams.emit(channel, event)`.
- Host: `GET /api/plugins/:pluginId/bridge/stream/:channel`.
- Query: required `companyId`; host calls `assertCompanyAccess`.
- Bus key: plugin id + channel + company id.
- UI: `usePluginStream(channel, { companyId })`.

This proves a supported realtime transport for plugin-originated events. It does not yet prove which Paperclip domain events are available for every agent status transition. A minimal PoC can use a worker snapshot poll plus stream invalidation/re-fetch, provided the stream event source is authorized and labeled.

## 5. Auth, company isolation and write boundary

Verified source protections:

- UI bridge calls require board organization access and optional `companyId` is checked by `assertPluginBridgeScope`/`assertCompanyAccess` in `server/src/routes/plugins.ts`.
- Stream route requires `companyId` and calls `assertCompanyAccess` before subscribing.
- Plugin worker invocation scope in `packages/plugins/sdk/src/host-client-factory.ts` rejects missing company context and rejects requested company IDs different from the authorized invocation scope.
- Plugin config is company-scoped; `multiCompanyConfig` plugins must key state by company ID according to `define-plugin.ts` comments.
- Manifest capabilities are host-validated; read-only PoC should request only `ui.sidebar.register`, `ui.page.register`, `agents.read`, `issues.read`, `issue.comments.read`, optionally `approvals.read`, and the minimum event capability after event design is confirmed.

Security conclusion: **company isolation is VERIFIED at the bridge/host contract level**. The PoC still needs negative tests with two companies and must avoid global caches keyed only by agent display name.

## 6. Three.js / GLB / R3F feasibility

| Question | Result | Evidence / gap |
|---|---|---|
| Three.js available in workspace | VERIFIED | `packages/shared/package.json`: `three: 0.185.1`; lockfile resolves it. |
| React Three Fiber available | NOT VERIFIED / likely absent | No `@react-three/fiber` or `@react-three/drei` package entry found in manifests searched. Do not import until dependency approval. |
| Plain Three.js in plugin UI | PARTIAL | Browser UI is Vite/React and Three.js exists in workspace, but no plugin UI bundle test proves direct import/loading under current plugin bundler. |
| GLB loading | NOT VERIFIED | `GLTFLoader` usage in a plugin UI bundle and asset serving path have not been tested. |
| GLB skeleton/animation | NOT VERIFIED | Three.js supports `AnimationMixer`/skinned GLTF in principle, but this repository survey did not run a loader/animation test. |
| 12 characters in one scene | NOT VERIFIED | No scene, instancing strategy, draw-call budget or device benchmark exists. |
| Isometric camera/picking | PARTIAL | Plain Three.js can express orthographic camera and raycasting, but plugin integration and mobile evidence are absent. |
| R3 JSON/layout usage | PARTIAL | R3 exists as SVG/Markdown, not a runtime JSON contract. A versioned JSON layout should be derived/approved before G1. |

### Dependency proposal

- Keep current dependency set for the first PoC if possible: plain Three.js, `GLTFLoader`, React, Vite.
- If React Three Fiber is preferred, add `@react-three/fiber` and possibly `@react-three/drei` to the plugin package only, with explicit version pins compatible with React 19/Vite 8. This requires CEO/maintainer approval and a lockfile change.
- Do not rely on `three` transitively through `@paperclipai/shared`; the plugin should declare its own direct runtime dependency if it imports Three.js.
- No dependency was installed in this survey.

## 7. Minimal PoC proposal — not implemented

### Scope

1. Register one company-scoped `Office` page and one sidebar entry.
2. Render a non-production test scene: floor plane, 7 colored room blocks, lounge block, orthographic camera, and one placeholder/approved test GLB if asset loading is approved.
3. Worker registers `office-snapshot` data handler returning company-scoped agents and normalized read-only status.
4. UI calls `usePluginData("office-snapshot", { companyId })`.
5. Worker emits `office-updated` only when a verified source event changes the snapshot; UI uses `usePluginStream` to invalidate/refetch.
6. Optional approval panel is read-only and only enabled when `approvals.read` succeeds.
7. Clicking a placeholder agent selects it locally; no Paperclip write action is exposed.

### Proposed source shape

```text
office-plugin/
  src/worker.ts                 # definePlugin, read handlers, event subscriptions
  src/manifest.ts               # read-only capabilities + page/sidebar slots
  src/layout/r3-layout.json     # versioned copy of approved R3 geometry
  src/ui/index.tsx              # OfficePage + OfficeSidebar exports
  src/ui/OfficePage.tsx
  src/ui/OfficeScene.tsx        # Three/R3F boundary
  src/ui/useOfficeSnapshot.ts
  src/ui/statusProjection.ts
  src/ui/assets/test-agent.glb  # only if asset path/size/license approved
  tests/                         # scope, snapshot, stream, loader, render tests
```

This is a proposal only; no directory or source was created by this spike.

## 8. PoC test plan

| Test | Evidence required | Acceptance |
|---|---|---|
| Plugin registration | Host discovery response + sidebar/page screenshot | Office appears only through declared slots; no core route edit |
| Company context | UI context log/test with company A and B | Snapshot request always carries active company ID |
| Agent read | Worker unit/integration test + redacted fixture | Returns only agents for requested company |
| Status projection | Fixture from real supported read payload | Status mapping is explicit; unknown/stale is not silently idle |
| Realtime | Worker emit + SSE capture + UI refetch trace | Company-scoped update reaches UI; reconnect refetches snapshot |
| Approval read | Capability-on and denied cases | Read-only list/get works when granted; denied state is visible, no fake zero |
| Write boundary | Manifest and runtime negative test | No write capabilities; no issue/comment/approval mutations possible |
| GLB load | Browser test with one small licensed/test GLB | Model loads, errors visibly, no production asset claim |
| Animation | One known clip and `AnimationMixer` smoke test | Clip can start/stop without asserting full character quality |
| Camera/picking | Browser test | Orthographic view, local selection, no host mutation |
| Shutdown isolation | Disable plugin while Paperclip heartbeat/run fixture active | Paperclip workflow continues; plugin worker stops/fails closed |
| Company isolation | Cross-company negative test | A cannot read B through data/action/stream bridge |
| Mobile/performance | 390×844 and desktop capture, frame timing | Evidence recorded; no 60 FPS claim without measurement |

## 9. Risks and blockers

| Risk | Level | Current status / mitigation |
|---|---|---|
| Exact Paperclip event pattern for agent status | High | NOT VERIFIED; start with snapshot + explicit stream invalidation, then prove event mapping. |
| Approval capability/runtime availability | High | PARTIAL; request `approvals.read` only after host capability check; show unsupported state. |
| Plugin UI direct Three import/bundling | High | NOT VERIFIED; run isolated bundle PoC after approval, no transitive dependency reliance. |
| R3 SVG/Markdown not runtime JSON | Medium | Create versioned JSON only in approved PoC/G1 scope; preserve source coordinates and assumptions. |
| GLB serving, asset size and licensing | High | NOT VERIFIED; use one tiny test GLB with provenance/license record. |
| 12-character performance/mobile readability | Medium | NOT VERIFIED; benchmark one/12 instances on target viewport. |
| Host/plugin API drift | Medium | Pin/report host and SDK versions; validate against the actual fork, not upstream docs. |
| Cross-company leakage | High | Bridge has guards; add explicit A/B negative tests and company-keyed worker state. |

## 10. Expected changes after approval

Only after explicit approval:

- Add a new plugin package/manifest and UI bundle under the repository’s plugin conventions.
- Add direct Three.js dependency to that plugin package, or request R3F/Drei approval.
- Add a read-only worker data handler and narrowly scoped event subscription.
- Add plugin-local tests and a tiny test asset with provenance.
- Add company-scoped layout JSON derived from approved R3 coordinates.

Not proposed: Paperclip Core edits, schema/migration changes, agent workflow changes, write actions, production GLB library, or G1 scene implementation.

## 11. G0 acceptance and decision

### G0 acceptance criteria

- [x] Repository architecture and versions surveyed from source.
- [x] Plugin registration, UI slots and bridge hooks identified from source.
- [x] Agent/issue/comment/approval read surfaces identified from SDK protocol and capability definitions.
- [x] Realtime bridge identified from source.
- [x] Company/auth/write boundaries documented.
- [x] Three.js/R3F/GLB feasibility classified without claiming unrun tests.
- [x] Minimal PoC and reproducible test plan documented.
- [x] No production code, dependency, schema or workflow changed.

### Decision

**GO for CEO review of the G0 PoC scope.** The platform seams are present for a read-only company-scoped plugin PoC.

**NEEDS APPROVAL before implementation:** plugin package location/manifest, direct Three.js import strategy, optional R3F/Drei dependency, test GLB provenance, exact Paperclip event patterns, and approval-read enablement.

**NO-GO for G1 and for any production 3D implementation in this turn.**

