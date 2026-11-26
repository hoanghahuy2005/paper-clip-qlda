# Door Anchor Specification R3

Source rules: technical design v1.0 §8.1 and §8.4. v1.0 specifies one main door per room, opening to the nearest corridor, with `doorSegment`, `doorInside`, and `doorOutside`; it does not specify exact door coordinates. The coordinates below are therefore **AI-DESIGN proposals**, not CEO-LOCKED values.

Coordinate convention: X/Z floor plane, Y=0. Door target width is 1.2–1.4 m. Proposed width is 1.3 m for every door until an asset/collider test chooses a final value.

| Door | Room | doorSegment (proposed) | doorInside (proposed) | doorOutside (proposed) | Status |
|---|---|---|---|---|---|
| D01 | Meeting | X=-12.0, Z=-5.0, along X | (-12.0,-4.9) | (-12.0,-5.1) | AI-DESIGN; corridor-connected |
| D02 | Creative | X=-1.0, Z=-5.0, along X | (-1.0,-4.9) | (-1.0,-5.1) | AI-DESIGN; corridor-connected |
| D03 | AI Production | X=11.0, Z=-5.0, along X | (11.0,-4.9) | (11.0,-5.1) | AI-DESIGN; corridor-connected |
| D04 | CEO | X=-14.0, Z=5.0, along X | (-14.0,4.9) | (-14.0,5.1) | AI-DESIGN; corridor-connected |
| D05 | PM | X=-8.0, Z=5.0, along X | (-8.0,4.9) | (-8.0,5.1) | AI-DESIGN; corridor-connected |
| D06 | Post | X=1.0, Z=5.0, along X | (1.0,4.9) | (1.0,5.1) | AI-DESIGN; corridor-connected |
| D07 | QA | X=12.0, Z=5.0, along X | (12.0,4.9) | (12.0,5.1) | AI-DESIGN; corridor-connected |

No lounge door is added: lounge is open to the central circulation zone by source design. No extra room, asset store, tool station or hidden service door is introduced.

## Validation

- Door count = 7, matching the seven functional rooms.
- All door X values lie within their room X bounds.
- All doors touch the nearest corridor boundary.
- Each proposed segment is 1.3 m wide, within the 1.2–1.4 m target.
- `doorInside`/`doorOutside` are separated across the room/corridor boundary by 0.2 m total; final collider offset is NOT VERIFIED.
- Navigation through these anchors is a 2D proposal only; runtime A* and 3D collision remain NOT VERIFIED.

