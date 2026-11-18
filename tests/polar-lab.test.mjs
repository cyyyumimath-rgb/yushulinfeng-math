import assert from "node:assert/strict";
import test from "node:test";
import { coefficients, contactPoints, polarLine, visibleSegment } from "../components/polar-lab-geometry.ts";

const cases = [
  ["ellipse", 2, [0, 0], 0],
  ["ellipse", 2, [1, 0], 0],
  ["ellipse", 2, [3, 0], 1],
  ["ellipse", 2, [4, 1], 2],
  ["hyperbola", 1.5, [0, 0], 0],
  ["hyperbola", 1.5, [2, 1.5], 1],
  ["hyperbola", 1.5, [0, 2], 2],
  ["hyperbola", 1.5, [4, 0], 0],
  ["parabola", 2, [0, 0], 1],
  ["parabola", 2, [-1, 0], 2],
  ["parabola", 2, [1, 0], 0],
];

for (const [kind, size, pole, expected] of cases) {
  test(`${kind} contacts for pole ${pole}`, () => {
    const line = polarLine(kind, size, pole);
    const contacts = contactPoints(kind, size, line);
    assert.equal(contacts.length, expected);
    const f = coefficients(kind, size);
    for (const [x, y] of contacts) {
      assert.ok(Math.abs(f.xx*x*x+f.yy*y*y+2*f.lx*x+f.c) < 1e-8);
      const [a, b, c] = polarLine(kind, size, [x, y]);
      assert.ok(Math.abs(a*pole[0]+b*pole[1]+c) < 1e-8);
    }
  });
}

test("a center has no finite polar segment, an axis pole gives a vertical polar", () => {
  assert.equal(visibleSegment(polarLine("ellipse", 2, [0, 0]), 5, 3).length, 0);
  const hits = visibleSegment(polarLine("ellipse", 2, [3, 0]), 5, 3);
  assert.deepEqual(hits, [[3, -3], [3, 3]]);
});
