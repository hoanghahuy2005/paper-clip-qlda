# Workstation Seed Validation R3

Source: `VPD_Office_3D_Thiet_ke_chi_tiet_v1.0.md` §8.3. Coordinates are `(X,Z)`; `Y=0` floor. These are source seed positions, not final collision-resolved furniture.

| # | Agent | Seed (X,Z) | Expected room | Bounds check | R3 result |
|---:|---|---:|---|---|---|
| 01 | Yan | (-8.0, 9.0) | PM `[-11,-5] × [5,12]` | inside | PASS |
| 02 | Creative Director | (-5.0, -9.0) | Creative `[-7,5] × [-12,-5]` | inside | PASS |
| 03 | Scriptwriter | (-1.2, -9.0) | Creative | inside | PASS |
| 04 | Shot Planner | (2.6, -9.0) | Creative | inside | PASS |
| 05 | AI Production Lead | (6.9, -9.0) | AI ` [5,17] × [-12,-5]` | inside | PASS |
| 06 | Character & Consistency | (10.0, -9.0) | AI | inside | PASS |
| 07 | Visual Generator | (13.1, -9.0) | AI | inside | PASS |
| 08 | Voice & Audio | (16.0, -9.0) | AI | inside | PASS |
| 09 | Video Editor | (-3.0, 9.0) | Post `[-5,7] × [5,12]` | inside | PASS |
| 10 | Motion & Subtitle | (1.0, 9.0) | Post | inside | PASS |
| 11 | Color & Sound Mix | (5.0, 9.0) | Post | inside | PASS |
| 12 | QA Reviewer | (12.0, 9.0) | QA `[7,17] × [5,12]` | inside | PASS |

## Reproducible checks

- Count = 12.
- Every seed satisfies `xmin <= X <= xmax` and `zmin <= Z <= zmax` for its assigned room.
- Yan is in PM, not lounge.
- No seed is in a room overlap; the room rectangles are disjoint.
- Seed positions remain baseline. No offset is applied in R3.

## Limitation

This validates 2D point-in-rectangle membership only. It does not validate chair mesh clearance, desk collision, `seatAnchor`, door clearance or 3D collider behavior. Source §8.3 explicitly allows a later in-room offset after collision validation.

