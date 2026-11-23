import test from 'node:test';
import assert from 'node:assert/strict';

import {
  BALL_RADIUS,
  CORNER_POCKET_MOUTH_RADIUS,
  MAX_CUT_ANGLE,
  MIDDLE_POCKET_MOUTH_RADIUS,
  POCKETS,
  TABLE_HEIGHT,
  TABLE_WIDTH,
  createShot,
  evaluatePocket,
  randomShot,
} from '../src/geometry.js';

const R = BALL_RADIUS;
const EPS = 1e-9;
const TOP_MIDDLE = POCKETS.find((pocket) => pocket.x === 0 && pocket.z > 0);

function assertClose(actual, expected, tolerance = EPS, message = '') {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `${message}实际 ${actual}，期望 ${expected}，容差 ${tolerance}`,
  );
}

function pointSegmentDistance(point, start, end) {
  const dx = end.x - start.x;
  const dz = end.z - start.z;
  const lengthSquared = dx * dx + dz * dz;
  const t = lengthSquared === 0
    ? 0
    : Math.min(1, Math.max(0, ((point.x - start.x) * dx + (point.z - start.z) * dz) / lengthSquared));
  return Math.hypot(point.x - (start.x + dx * t), point.z - (start.z + dz * t));
}

function firstRailExit(target, pocket) {
  const dx = pocket.x - target.x;
  const dz = pocket.z - target.z;
  const xLimit = TABLE_WIDTH / 2 - R;
  const zLimit = TABLE_HEIGHT / 2 - R;
  const tx = dx === 0 ? Infinity : ((dx > 0 ? xLimit : -xLimit) - target.x) / dx;
  const tz = dz === 0 ? Infinity : ((dz > 0 ? zLimit : -zLimit) - target.z) / dz;
  const t = Math.min(tx, tz);
  return { x: target.x + dx * t, z: target.z + dz * t };
}

function assertClearOfPockets(point, label) {
  for (const pocket of POCKETS) {
    assert.ok(
      Math.hypot(point.x - pocket.x, point.z - pocket.z) >= pocket.mouthRadius + R - EPS,
      `${label} 落入袋口区域`,
    );
  }
}

function mulberry32(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

test('直球：切角约为 0，并选中正对的袋口', () => {
  const target = { x: 0, z: 0 };
  const cue = { x: 0, z: -0.52 };
  const shot = createShot(cue, target);

  assert.ok(shot);
  assertClose(shot.cutAngle, 0);
  assert.deepEqual(shot.pocket, TOP_MIDDLE);
});

test('ghost 球心位于 T→P 反向延长线上，且距目标球 2R', () => {
  const target = { x: 0, z: 0.2 };
  const cue = { x: 0, z: -0.4 };
  const { ghost } = evaluatePocket(cue, target, TOP_MIDDLE);

  assertClose(ghost.x, 0);
  assertClose(ghost.z, 0.2 - 2 * R);
  assertClose(Math.hypot(ghost.x - target.x, ghost.z - target.z), 2 * R);
});

test('接触点位于 T 与 ghost 连线上，且距目标球 R', () => {
  const target = { x: 0, z: 0.2 };
  const cue = { x: 0, z: -0.4 };
  const { ghost, contact } = evaluatePocket(cue, target, TOP_MIDDLE);

  assertClose(contact.x, 0);
  assertClose(contact.z, 0.2 - R);
  assert.ok(contact.z > ghost.z && contact.z < target.z);
  assertClose(Math.hypot(contact.x - target.x, contact.z - target.z), R);
});

test('母球挡住进球线时该袋不可行', () => {
  const target = { x: 0, z: 0 };
  const cue = { x: 0.01, z: 0.3 };

  assert.equal(evaluatePocket(cue, target, TOP_MIDDLE).feasible, false);
});

test('母球/ghost 出界或母球到 ghost 路径穿过目标球时不可行', async (t) => {
  await t.test('母球出界', () => {
    const cue = { x: TABLE_WIDTH / 2, z: 0 };
    const target = { x: 0, z: 0 };

    assert.ok(Math.abs(cue.x) > TABLE_WIDTH / 2 - R);
    assert.equal(evaluatePocket(cue, target, TOP_MIDDLE).feasible, false);
  });

  await t.test('ghost 球出界', () => {
    const target = { x: TABLE_WIDTH / 2 - R - 0.005, z: 0 };
    const cue = { x: 0.4, z: -0.3 };
    const pocket = POCKETS.find((candidate) => candidate.x < 0 && candidate.z > 0);
    const { feasible, ghost } = evaluatePocket(cue, target, pocket);

    assert.ok(Math.abs(ghost.x) > TABLE_WIDTH / 2 - R);
    assert.equal(feasible, false);
  });

  await t.test('母球到 ghost 的路径穿过目标球', () => {
    const target = { x: 0, z: 0 };
    const cue = { x: 0.05, z: 0.2 };
    const { feasible, ghost } = evaluatePocket(cue, target, TOP_MIDDLE);

    assert.ok(pointSegmentDistance(target, cue, ghost) < 2 * R);
    assert.equal(feasible, false);
  });
});

test('袋口规格按袋型共享开口半径', () => {
  for (const pocket of POCKETS) {
    const expected = pocket.x === 0 ? MIDDLE_POCKET_MOUTH_RADIUS : CORNER_POCKET_MOUTH_RADIUS;
    assert.equal(pocket.mouthRadius, expected);
  }
});

test('目标球进袋路径先碰库边时该袋不可行，改选有净空的袋口', () => {
  const target = { x: 0.9, z: -0.57 };
  const cue = { x: 1.2, z: -0.54833 };
  const nearMiddle = POCKETS.find((pocket) => pocket.x === 0 && pocket.z < 0);
  const nearLeftCorner = POCKETS.find((pocket) => pocket.x < 0 && pocket.z < 0);
  const farLeftCorner = POCKETS.find((pocket) => pocket.x < 0 && pocket.z > 0);

  assert.ok(evaluatePocket(cue, target, nearMiddle).cutAngle < (0.1 * Math.PI) / 180);
  assert.equal(evaluatePocket(cue, target, nearMiddle).feasible, false);
  assert.equal(evaluatePocket(cue, target, nearLeftCorner).feasible, false);

  const shot = createShot(cue, target);
  assert.ok(shot);
  assert.deepEqual(shot.pocket, farLeftCorner);
  assertClose(shot.cutAngle, (40.2 * Math.PI) / 180, 1e-3);
});

test('选中袋口的切角等于所有可行袋口切角的最小值', () => {
  const cue = { x: -1.1, z: 0.2 };
  const target = { x: -1, z: -0.1 };
  const evaluated = POCKETS.map((pocket) => ({
    pocket,
    ...evaluatePocket(cue, target, pocket),
  }));
  const feasible = evaluated.filter((result) => result.feasible);

  assert.ok(feasible.length >= 2, '该局面应有多个可行袋口，才能验证最小切角');
  const minCutAngle = Math.min(...feasible.map((result) => result.cutAngle));
  const shot = createShot(cue, target);

  assert.ok(shot);
  assertClose(shot.cutAngle, minCutAngle);
  assert.deepEqual(shot.pocket, feasible.find((result) => result.cutAngle === minCutAngle).pocket);
});

test('袋洞内的球心不能作为母球、目标球或 ghost', () => {
  assert.equal(createShot({ x: 0, z: -0.599 }, { x: 0, z: 0 }), null);
  assert.equal(createShot({ x: 0, z: -0.3 }, { x: 0, z: -0.599 }), null);

  const target = { x: -0.1, z: 0.58 };
  const cue = { x: 0.4, z: -0.3 };
  const topLeftCorner = POCKETS.find((pocket) => pocket.x < 0 && pocket.z > 0);
  const { feasible, ghost } = evaluatePocket(cue, target, topLeftCorner);

  assert.ok(
    Math.hypot(ghost.x - TOP_MIDDLE.x, ghost.z - TOP_MIDDLE.z)
      < MIDDLE_POCKET_MOUTH_RADIUS + R,
    '该局面的 ghost 应落入上中袋洞',
  );
  assert.equal(feasible, false);
});

test('随机摆球丢弃落入袋口的首次采样，返回后备局面', () => {
  const samples = [
    0.5, 1 / 1200, 0.5, 0.5,
    0.6619433198380567, 0.6666666666666667, 0.33805668016194335, 0.41666666666666663,
  ];
  let calls = 0;
  const shot = randomShot(() => samples[calls++]);

  assert.equal(calls, samples.length, '首次采样应被丢弃，恰好消耗两轮采样');
  assert.ok(shot);
  assertClose(shot.cue.x, 0.4, 1e-12, '后备母球 x；');
  assertClose(shot.cue.z, 0.2, 1e-12, '后备母球 z；');
  assertClose(shot.target.x, -0.4, 1e-12, '后备目标球 x；');
  assertClose(shot.target.z, -0.1, 1e-12, '后备目标球 z；');
  for (const [name, point] of [['母球', shot.cue], ['目标球', shot.target], ['ghost', shot.ghost]]) {
    assertClearOfPockets(point, `后备局面 ${name}`);
  }
});

test('随机局面满足几何不变量，且选袋切角最小', () => {
  for (let seed = 1; seed <= 100; seed += 1) {
    const shot = randomShot(mulberry32(seed));
    const label = `seed ${seed}`;

    assert.ok(shot, `${label} 应产生合法局面`);
    const { cue, target, pocket, ghost, contact, cutAngle } = shot;
    assert.ok(
      Math.hypot(cue.x - target.x, cue.z - target.z) > 2 * R,
      `${label} 母球与目标球不应重叠`,
    );
    for (const [name, point] of [['母球', cue], ['目标球', target], ['ghost', ghost]]) {
      assert.ok(Math.abs(point.x) <= TABLE_WIDTH / 2 - R + EPS, `${label} ${name} x 出界`);
      assert.ok(Math.abs(point.z) <= TABLE_HEIGHT / 2 - R + EPS, `${label} ${name} z 出界`);
      assertClearOfPockets(point, `${label} ${name}`);
    }
    assert.ok(pointSegmentDistance(cue, target, pocket) > 2 * R, `${label} 母球挡住了进球线`);
    assert.ok(
      pointSegmentDistance(target, cue, ghost) >= 2 * R - EPS,
      `${label} 母球到 ghost 的路径穿过了目标球`,
    );
    assert.ok(cutAngle >= 0 && cutAngle < MAX_CUT_ANGLE, `${label} 切角超出范围`);
    assert.ok(
      POCKETS.some((candidate) => candidate.x === pocket.x && candidate.z === pocket.z),
      `${label} 袋口不在袋口规格内`,
    );
    assertClose(
      Math.hypot(contact.x - target.x, contact.z - target.z),
      R,
      EPS,
      `${label} 接触点距目标球不是 R；`,
    );
    const railExit = firstRailExit(target, pocket);
    assert.ok(
      Math.hypot(railExit.x - pocket.x, railExit.z - pocket.z) <= pocket.mouthRadius,
      `${label} 目标球进袋路径先撞库边`,
    );
    const pocketEvaluation = evaluatePocket(cue, target, pocket);
    assert.ok(pocketEvaluation.feasible, `${label} 选中袋口应可行`);
    assertClose(pocketEvaluation.cutAngle, cutAngle, EPS, `${label} 选中袋口切角与返回值不一致；`);

    const feasible = POCKETS
      .map((candidate) => evaluatePocket(cue, target, candidate))
      .filter((result) => result.feasible);
    assert.ok(feasible.length > 0, `${label} 至少应有一个可行袋口`);
    assertClose(cutAngle, Math.min(...feasible.map((result) => result.cutAngle)), EPS, `${label} 未选中最小切角；`);
  }
});
