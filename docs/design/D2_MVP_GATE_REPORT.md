# VPD Office 3D — Đợt 2 G1+G2, cổng nghiệm thu

CEO đã nghiệm thu G0 và chấp thuận có điều kiện Đợt 2 để bắt đầu Đợt 3. Tổng cộng 2/3 đợt đã nghiệm thu, gồm D2 CONDITIONAL GO.

## Kết quả

| Checkpoint | Kết quả | Bằng chứng chính |
| --- | --- | --- |
| D2-01 Contract | DONE | `PROJECT_PROGRESS.md`, technical v1.0 và R3 |
| D2-02 Layout/validator | DONE, geometry 2D | `plugin-office-poc/src/layout.ts`, `tests/layout.test.mjs` |
| D2-03 Scene | DONE | 7 phòng + lounge, 34×24 m, browser WebGL `d2-office-browser.png` |
| D2-04 12 agent | DONE | Rig GLB CC0, 12 clone/9 clip, `d2-office-12-agents-runtime.png` |
| D2-05 Business State | DONE | Host bridge: 12 agent, issue `OFFAA-1`, run `422d0980…`, approval `259858b4…`; `d2-issue-runtime.png`, `d2-run-runtime.png` |
| D2-06 Polling/scope | DONE | 5 s, reconnect, A/B isolation; `tmp/d2-acceptance.cjs` |
| D2-07 Animation/workflow | PARTIAL | Workload đọc từ host theo quyền. Browser xác nhận Idle 15 giây → Lounge → quay về khi có việc. Handoff dùng Case đã giao. Meeting thiếu nguồn intent. |
| D2-08 UI/fallback | DONE | Sidebar, agent detail, task/run/approval link, WebGL failure → 2D |
| D2-09 Kiểm thử tổng hợp | PARTIAL | Build và 22/22 test PASS. Kiểm tra 36 tuyến tĩnh, tuyến giao nhau và vị trí agent đỗ. Browser xác nhận hai agent đi đồng thời trên các tuyến rời nhau. |
| D2-10 Demo | PARTIAL | Browser fixture OFFAA xác nhận hai agent đi Lounge và một agent quay về khi có task riêng tư thật. Agent key nhận 403 ở hai company. Meeting còn BLOCKED. |

**CEO CONDITIONAL GO.** Kết quả kiểm thử vẫn là 7/10 DONE, 3/10 PARTIAL. Đợt 2 được nghiệm thu có điều kiện để bắt đầu Đợt 3. Meeting intent, va chạm cấp mesh, Request.actor và CI/regression revision cuối là điều kiện bắt buộc trước release.

## Code, asset và cách chạy

- Plugin: `packages/plugins/plugin-office-poc/` (`src/layout.ts`, `src/business.ts`, `src/worker.ts`, `src/ui/{scene,index,polling}.*`, GLB `src/ui/assets/office-base-rig.glb`, test trong `tests/`). GLB gốc do script nội bộ tạo, giấy phép CC0 ghi trong `src/ui/assets/README.md`.
- Core được CEO cho phép sửa hẹp: `server/src/services/{plugin-loader,plugin-lifecycle}.ts`, `server/src/routes/plugins.ts`, test liên quan và `doc/plugins/PLUGIN_SPEC.md`. Candidate có capability mới được giữ `upgrade_pending`; chỉ admin được preview/approve đúng SHA-256. Re-enable không cấp quyền mới.
- Test host dùng checkout LF `tmp/office-poc-lf-worktree` và DB test duy nhất `tmp/office-poc-lf-runtime`: đặt `PAPERCLIP_HOME=D:\Code Part Two\qlda\tmp\office-poc-lf-runtime`, `PORT=3101`, `PAPERCLIP_MIGRATION_PROMPT=never`, chạy `pnpm.cmd --filter @paperclipai/server dev` từ checkout LF. Mở `http://127.0.0.1:3101/OFFAA/office`. Không dùng DB mặc định/production. Plugin source được cài từ workspace chính.
- Rollback Core: đảo đúng diff loader/lifecycle/routes/docs/test sau khi dừng host. Rollback capability khi upgrade còn pending: khôi phục manifest gốc rồi gọi `cancel-upgrade`; plugin đã ready có thể disable để dừng Office trước khi triển khai lại bản cũ. Không reset database.

## Test và giới hạn bằng chứng

- Plugin `pnpm.cmd --filter @paperclipai/plugin-office-poc test`: 22/22 PASS; `build`: PASS.
- Core focused `plugin-lifecycle-restart.test.ts` + `plugin-loader-error-retry.test.ts`: 10/10 PASS, có test red→green cho auto-refresh escalation. DB manifest refresh 1/1 PASS trong checkout LF; checkout Windows chính không chạy DB test vì CRLF migration guard đã biết.
- Browser thật: `tmp/d2-acceptance.cjs`, `d2-12-browser.cjs`, `d2-issue-browser.cjs`, `d2-approval-browser.cjs`, `d2-run-browser.cjs` PASS. Agent fixture Yan được cấu hình process adapter hợp lệ trên DB test, run thật làm Office hiển thị `working`; sau demo Yan đã pause để tránh chạy lặp. Plugin disable/re-enable và host health HTTP 200; restart giữ `ready` + `issues.read`. Agent key thật nhận 403 ở upgrade preview/approve và bridge company khác; key đã thu hồi (`tmp/d2-upgrade-auth.cjs`).
- SSE vẫn HTTP 501. Polling 5 giây PASS. Bản build cuối qua kiểm tra camera, chọn agent, fallback 2D và cô lập company trong browser. Disable/re-enable giữ host HTTP 200 và ẩn/khôi phục Office trong UI contributions. Manifest quyền chỉ đọc giữ nguyên.

## Office State Adapter và bằng chứng runtime

- `server/src/services/office-workload.ts` đọc task, run, hàng đợi wakeup, approval và handoff từ Paperclip. Hai route đọc snapshot buộc company trong worker khớp scope của request. Chỉ board có quyền rộng nhận `clear`/`busy`. Actor giới hạn nhận `unknown` độc lập với sự tồn tại của task riêng tư. Snapshot lọc approval theo quyền hiện hành và chỉ đưa alias workstation hợp lệ từ metadata. Không trả số lượng, nội dung hoặc ID của task riêng tư trong workload.
- Browser `tmp/d2-workload-browser.cjs` trên fixture `OFFAA`: hai agent đi Lounge đồng thời sau 15 giây, nghỉ tại hai điểm khác nhau. Task riêng tư giao cho Creative Director làm agent quay về bàn. QA tiếp tục nghỉ, task không xuất hiện trong snapshot Office, đổi company không lẫn dữ liệu, agent key nhận 403 ở cả hai company. Đã thu hồi key và dọn trạng thái fixture. Chưa xác minh browser với một board member giới hạn.
- Browser `tmp/d2-case-browser.cjs`: Paperclip tạo và giao Case handoff `488ac000…`. Office hiển thị Creative Director đi bàn giao và quay về. Adapter dùng nguồn Case được cấp quyền đọc, yêu cầu bản ghi đã giao, hai agent trong roster và Cases đang bật. Khi mở Office hoặc reconnect, dữ liệu hiện có dùng làm mốc để tránh chạy lại hoạt ảnh cũ. Host test đã khôi phục cấu hình Cases sau khi thử.
- `route-traffic.ts` giữ chỗ cho toàn bộ tuyến đang đi. Tuyến có thể giao nhau phải chờ, các tuyến cách xa nhau được đi đồng thời. Unit test kiểm tra tuyến đối đầu, giao nhau, các vị trí bàn và Lounge, cùng 132 tuyến tiếp cận bàn giao. Xác minh dùng bán kính đại diện 0,55 m, chưa kiểm tra va chạm từng mesh hoạt ảnh hoặc vật thể động bên ngoài roster.
- Bằng chứng ảnh `d2-office-parallel-lounge.png`, `d2-office-workload-return.png` và `d2-office-case-handoff.png`. Mở Office tại `http://127.0.0.1:3101/OFFAA/office`.
- Regression trên host PASS cho offline/reconnect, approval Yan và disable/re-enable. Run thật `40fe68f3…` làm Yan chuyển sang `working` trong browser. Ảnh `d2-office-adapter-run.png`.
- Server integration `plugin-operational-reads-tenant-scope.test.ts` PASS 5/5 trên PostgreSQL test của checkout LF. Dùng worker stub để kiểm tra route và DB thật với actor board giới hạn và admin. Snapshot của board giới hạn giống nhau trước/sau khi thêm task và approval riêng tư. Admin thấy `busy`. Request lệch company nhận 403. Lần chạy đầu đã qua assertion nhưng lỗi kiểm tra cuối do thứ tự dọn FK của fixture. Đã sửa thứ tự và chạy lại PASS.

## Cổng còn mở

1. Meeting vẫn BLOCKED. Nguồn Case chỉ chứng minh giao việc. Đề xuất contract nhỏ nhất gồm ID ổn định từ workflow, company, người khởi tạo, danh sách agent, thời điểm bắt đầu và hủy/kết thúc, cùng kiểm tra quyền đọc bản ghi nguồn. Cần CEO chọn workflow phát intent hoặc duyệt bổ sung contract này trước khi có cơ chế tạo meeting.
2. Server typecheck LF vẫn báo 8 lỗi `Request.actor` trong `issue-document-batch.ts` như baseline. Kiểm tra lại lớp chứa route Office ghi nhận 39 lỗi trong `plugins.ts`, bằng baseline, và 0 lỗi tại `office-workload.ts`. Log đối chiếu nằm trong `tmp/d2-server-typecheck-lf.log`, `tmp/d2-office-adapter-typecheck.log` và `tmp/d2-office-adapter-above.log`. CI chưa có run trên revision hiện tại.
3. Đợt 2 có 7/10 checkpoint DONE và 3 PARTIAL tại cổng kỹ thuật. CEO đã chuyển các mục còn tồn đọng sang Đợt 3. Xem `PROJECT_PROGRESS.md` để theo dõi trạng thái hiện tại.
