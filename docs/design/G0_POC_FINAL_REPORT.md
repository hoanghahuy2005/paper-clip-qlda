# VPD Office 3D — G0 PoC final runtime report

Ngày 25/11/2026. Phạm vi: plugin PoC, một thay đổi host UI tối thiểu trong Coordinator sidebar và database test riêng; không sửa business logic, schema, migration SQL, workflow hoặc database mặc định. **READY FOR CEO ACCEPTANCE tại cổng G0**; CEO chưa nghiệm thu nên Fast-Track vẫn **0/3 đợt đã nghiệm thu, 3/3 còn lại**. Không bắt đầu G1/G2.

## Kết quả runtime

| Tiêu chí | Kết quả | Bằng chứng và giới hạn |
| --- | --- | --- |
| Host khởi động, plugin ready | PASS | Checkout LF riêng, DB `tmp/office-poc-lf-runtime`; migration 498/498, API/UI HTTP 200. Plugin install/enable ready. |
| Sidebar Office và trang mở được | **PASS runtime** | Root cause: `Sidebar.tsx` chọn `CoordinatorSidebar`, nhưng Coordinator chưa mount `PluginSlotOutlet` như `ClassicSidebar`. Host UI giờ mount outlet `sidebar` một lần với company hiện hành. Browser `/OFF/dashboard`: link Office đúng một lần, click mở `/OFF/office`, active `aria-current=page`, canvas và GLB clip chạy. |
| Enable/disable, quyền và scope của menu | **PASS runtime** | Disable qua API test: `ui-contributions` không còn Office, reload dashboard làm link biến mất; re-enable + reload làm link trở lại. Toggle qua API ngoài UI không làm query cache đang mở tự cập nhật trong 5s, nên cần reload; UI PluginManager có invalidation riêng. Agent key thật bị 403 ở `ui-contributions`, không nhận được slot. B có link `/OFFA/office`, trang B không hiển thị agent A và có 0 approval. Key tạm đã revoke. |
| Các mục Coordinator hiện có | **PASS runtime** | Browser click Chat `/OFF/chats`, Tasks `/OFF/issues`, Projects trong More `/OFF/projects`, rồi Office `/OFF/office`; không có link Office trùng lặp. Coordinator test 39/39 PASS. |
| Agent/approval read-only theo company | PASS | Bridge thật: A `70d0c349-1299-467d-9a76-ae1843b83340` có Yan Test A (paused), 3 pending approvals; B `a2a8be88-c365-436d-a8b1-789b5720bc55` có Agent Test B (paused), 0 pending. Browser `/OFF/office` và `/OFFA/office` hiển thị đúng, không lẫn dữ liệu. Manifest chỉ có `agents.read`, `approvals.read`, UI registration và `events.subscribe`; không có business write capability. |
| Phân quyền actor | PASS | API key thật của agent A: `/api/companies/A/agents` và `/approvals` 200; cùng endpoint cho B 403/403. Office bridge từ agent A trả 403 vì giới hạn board. API keys tạm đã revoke. Board local có quyền A/B; đây là actor khác quyền, không phải mock. |
| Snapshot và fallback cập nhật | PASS | Browser nhận approval count 2→3 sau khi tạo approval thật, trong chu kỳ polling 5s. `src/ui/polling.ts` điều khiển interval và cleanup khi company đổi. |
| `unknown`, `stale`, reconnect | PASS cho fallback | Playwright inject HTTP 403 ở endpoint snapshot: UI hiển thị `unknown` và lỗi; gỡ inject, Reconnect trả dữ liệu A thật và `active`. Inject HTTP 503, đồng hồ browser tiến 31s: `stale`. Unit tests kiểm tra freshness, interval cleanup. Lỗi mạng được inject để thử UI; agent/approval và quyền được kiểm tra với host thật. |
| SSE và event dedup runtime | **NOT VERIFIED / SSE FAIL** | SSE HTTP 501 `Plugin stream bridge is not enabled`. `server/src/routes/plugins.ts:1818-1819` trả 501 khi thiếu `streamBus`; `server/src/app.ts` đăng ký plugin routes không truyền bus. `usePluginStream` có trong SDK nhưng không dùng được ở host này. Fallback polling thay thế đã PASS; worker dedup mới là test cô lập, không có SSE runtime proof. |
| Three.js WebGL, camera và chọn agent | PASS | Chromium headless + SwiftShader: canvas WebGL render; ảnh canvas ở hai thời điểm khác nhau; wheel zoom và drag camera tạo frame khác; click Yan hiển thị `Selected: Yan Test A`. |
| GLB rig và animation clip | PASS | Asset tự tạo CC0 tại `src/ui/assets/test-rig.glb`, nguồn `PROVENANCE.md`; host tải GLB HTTP 200; browser hiển thị `GLB loaded; clip playing: idle_test`, frame thay đổi. Loader/Mixer test headless cũng PASS. |
| Disable/re-enable | PASS | Host plugin disabled → API health 200 → ready sau enable, snapshot trả dữ liệu thật. |

Ảnh browser: [office-sidebar-runtime.png](g0-evidence/office-sidebar-runtime.png) và [office-runtime.png](g0-evidence/office-runtime.png). Đây là ảnh chụp PoC chạy trên host test, không phải scene G1 hoặc concept final.

## SSE blocker và phạm vi sửa

Host không nối `PluginStreamBus` vào plugin routes; endpoint stream trả 501 theo guard hiện có. Thay đổi Core để nối bus cần CEO duyệt riêng. Plugin PoC dùng snapshot read-only mỗi 5s, giữ `unknown` khi chưa có snapshot, `stale` khi snapshot cũ hơn 30s, `active` khi mới; nút Reconnect gọi refresh. Không giả nhận SSE PASS. Polling có tải request theo số người mở trang; trước khi triển khai quy mô lớn cần giới hạn/đo tải.

## Migration và rollback

0466/0467 trong Git blob LF khớp SHA-256 guard; checkout Windows CRLF làm lệch byte. Dùng nhánh `g0-office-lf-validation` tại `tmp/office-poc-lf-worktree` với LF, không sửa guard/SQL/Core. Backup lạnh `tmp/office-poc-backups/pre-lf-migration` đã khôi phục thử trên instance tách biệt và xác nhận 464 receipts, 0 company/agent/approval. Test migration chuyên biệt 3/3 PASS; DB test mới migrate 498/498 PASS. Rollback: dừng host test, sử dụng backup riêng nếu cần; không đụng DB mặc định hoặc production.

## Kiểm thử và lệnh tái lập

Trong workspace chính:

```powershell
pnpm.cmd --filter @paperclipai/plugin-office-poc build
pnpm.cmd --filter @paperclipai/plugin-office-poc test
```

Host test đang phục vụ UI build tại `http://127.0.0.1:3101/` trong phiên này; port có thể đổi khi khởi động lại. Dùng LF worktree và `PAPERCLIP_HOME=.../tmp/office-poc-lf-runtime` để chạy host, bảo đảm không dùng DB mặc định. Mở `/OFF/dashboard`, nhấn Office ở sidebar; B dùng `/OFFA/dashboard`. Browser scripts cục bộ `tmp/g0-sidebar-browser.cjs` và `tmp/g0-existing-nav-browser.cjs` (tệp thử nghiệm tạm). Host dùng bản `CoordinatorSidebar.tsx` sao chép từ workspace chính vào LF worktree chỉ để build UI trên DB test; source bàn giao nằm ở workspace chính. UI build PASS, Coordinator test **39/39 PASS**, TypeScript `ui/src` PASS qua cấu hình tạm chỉ include source. Plugin build và **7/7 tests PASS**; `git diff --check` PASS. Lệnh `pnpm --filter @paperclipai/ui typecheck` toàn bộ không qua bước Storybook catalog vì liên kết `.agents/skills` thiếu sẵn trong feature map; chạy trực tiếp `run-tsc` nguyên cấu hình cũng lỗi JSON Storybook chưa sinh. Đây là gap repo ngoài phạm vi, không phải kết quả PASS toàn bộ typecheck chuẩn.

## File thay đổi và quyết định cần CEO

- `ui/src/components/CoordinatorSidebar.tsx`: mount slot `sidebar` có sẵn bằng company ID/prefix hiện hành; `CoordinatorSidebar.test.tsx`: xác nhận vị trí mount, company context, không trùng menu, menu hiện có. Không đổi SDK, route, quyền hay business logic.
- `packages/plugins/plugin-office-poc/src/ui/index.tsx`: link Office dùng `useHostLocation` và `useHostNavigation` của SDK 1.0.0 để có active state, cùng pattern của kitchen sink; fallback 5s, freshness và Reconnect từ G0 giữ nguyên. `tests/packaged-worker.test.mjs` đã tăng timeout trước đó để tránh lỗi máy chậm; 7/7 PASS.
- `pnpm-lock.yaml`: importer Office PoC, `three` 0.185.1 đã có trong workspace.
- Hai báo cáo này và ảnh `docs/design/g0-evidence/office-sidebar-runtime.png`.
- Không có schema, migration SQL, business logic hoặc database mặc định bị sửa.

**Kết luận:** tiêu chí sidebar cuối cùng PASS; G0 **READY FOR CEO ACCEPTANCE**. CEO cần nghiệm thu Đợt 1 trước khi cho phép G1/G2. SSE vẫn 501; polling fallback là phương án đã chứng minh. Nếu CEO muốn SSE thật, cần phê duyệt riêng việc nối `streamBus` trong host. Fast-Track **0/3 đợt đã nghiệm thu, 3/3 còn lại**.
