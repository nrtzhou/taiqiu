export const TABLE_WIDTH = 2.54;
export const TABLE_HEIGHT = 1.27;
export const BALL_RADIUS = 0.028575;
export const MAX_CUT_ANGLE = (80 * Math.PI) / 180;
// 袋口直径 5 英寸（角袋）/ 5.25 英寸（中袋），mouthRadius 取半宽。
export const CORNER_POCKET_MOUTH_RADIUS = 0.0635;
export const MIDDLE_POCKET_MOUTH_RADIUS = 0.066675;

// 角袋在前、中袋在后：平局时按此顺序裁决。
export const POCKETS = [
  { x: -TABLE_WIDTH / 2, z: -TABLE_HEIGHT / 2, mouthRadius: CORNER_POCKET_MOUTH_RADIUS },
  { x: TABLE_WIDTH / 2, z: -TABLE_HEIGHT / 2, mouthRadius: CORNER_POCKET_MOUTH_RADIUS },
  { x: -TABLE_WIDTH / 2, z: TABLE_HEIGHT / 2, mouthRadius: CORNER_POCKET_MOUTH_RADIUS },
  { x: TABLE_WIDTH / 2, z: TABLE_HEIGHT / 2, mouthRadius: CORNER_POCKET_MOUTH_RADIUS },
  { x: 0, z: -TABLE_HEIGHT / 2, mouthRadius: MIDDLE_POCKET_MOUTH_RADIUS },
  { x: 0, z: TABLE_HEIGHT / 2, mouthRadius: MIDDLE_POCKET_MOUTH_RADIUS },
];

const EPSILON = 1e-9;
const MIN_CUE_GHOST_DISTANCE = 0.15;
const RANDOM_EDGE_INSET = 0.035;
const MIN_BALL_SEPARATION = 0.22;
const MAX_RANDOM_ATTEMPTS = 500;

const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);

function pointSegmentDistance(point, start, end) {
  const dx = end.x - start.x;
  const dz = end.z - start.z;
  const lengthSquared = dx * dx + dz * dz;
  const t = lengthSquared === 0
    ? 0
    : Math.min(1, Math.max(0, ((point.x - start.x) * dx + (point.z - start.z) * dz) / lengthSquared));
  return Math.hypot(point.x - (start.x + dx * t), point.z - (start.z + dz * t));
}

// 球心落入袋洞（袋口半径 + 球半径）即视为整颗球已进袋，不能再作为任何球位。
function inPocketMouth(point) {
  return POCKETS.some((pocket) => distance(point, pocket) < pocket.mouthRadius + BALL_RADIUS);
}

function onTable(point) {
  return !inPocketMouth(point)
    && Math.abs(point.x) <= TABLE_WIDTH / 2 - BALL_RADIUS + EPSILON
    && Math.abs(point.z) <= TABLE_HEIGHT / 2 - BALL_RADIUS + EPSILON;
}

function firstRailExit(target, pocket) {
  const dx = pocket.x - target.x;
  const dz = pocket.z - target.z;
  const xLimit = TABLE_WIDTH / 2 - BALL_RADIUS;
  const zLimit = TABLE_HEIGHT / 2 - BALL_RADIUS;
  const tx = dx === 0 ? Infinity : ((dx > 0 ? xLimit : -xLimit) - target.x) / dx;
  const tz = dz === 0 ? Infinity : ((dz > 0 ? zLimit : -zLimit) - target.z) / dz;
  const t = Math.max(0, Math.min(tx, tz));
  return { x: target.x + dx * t, z: target.z + dz * t };
}

export function evaluatePocket(cue, target, pocket) {
  const toTargetX = target.x - pocket.x;
  const toTargetZ = target.z - pocket.z;
  const toTargetLength = Math.hypot(toTargetX, toTargetZ);
  const unitX = toTargetX / toTargetLength;
  const unitZ = toTargetZ / toTargetLength;

  const ghost = {
    x: target.x + 2 * BALL_RADIUS * unitX,
    z: target.z + 2 * BALL_RADIUS * unitZ,
  };
  const contact = {
    x: target.x + BALL_RADIUS * unitX,
    z: target.z + BALL_RADIUS * unitZ,
  };

  const aimX = ghost.x - cue.x;
  const aimZ = ghost.z - cue.z;
  const aimLength = Math.hypot(aimX, aimZ);
  const toPocketX = pocket.x - target.x;
  const toPocketZ = pocket.z - target.z;
  const toPocketLength = Math.hypot(toPocketX, toPocketZ);
  const cosine = (aimX * toPocketX + aimZ * toPocketZ) / (aimLength * toPocketLength);
  const cutAngle = Math.acos(Math.min(1, Math.max(-1, cosine)));
  const railExit = firstRailExit(target, pocket);
  const mouthClearance = Math.hypot(railExit.x - pocket.x, railExit.z - pocket.z);

  const feasible = onTable(cue)
    && onTable(target)
    && onTable(ghost)
    && distance(cue, target) > 2 * BALL_RADIUS
    && aimLength >= MIN_CUE_GHOST_DISTANCE
    && pointSegmentDistance(cue, target, pocket) > 2 * BALL_RADIUS
    && pointSegmentDistance(target, cue, ghost) >= 2 * BALL_RADIUS - EPSILON
    && mouthClearance <= pocket.mouthRadius
    && cutAngle < MAX_CUT_ANGLE;

  return { feasible, ghost, contact, cutAngle };
}

export function createShot(cue, target) {
  let shot = null;

  for (const pocket of POCKETS) {
    const result = evaluatePocket(cue, target, pocket);
    if (!result.feasible) {
      continue;
    }
    if (!shot || result.cutAngle < shot.cutAngle - EPSILON) {
      shot = {
        cue,
        target,
        pocket,
        ghost: result.ghost,
        contact: result.contact,
        cutAngle: result.cutAngle,
      };
    }
  }

  return shot;
}

export function randomShot(rng = Math.random) {
  const xLimit = TABLE_WIDTH / 2 - RANDOM_EDGE_INSET;
  const zLimit = TABLE_HEIGHT / 2 - RANDOM_EDGE_INSET;

  for (let attempt = 0; attempt < MAX_RANDOM_ATTEMPTS; attempt += 1) {
    const cue = { x: (rng() * 2 - 1) * xLimit, z: (rng() * 2 - 1) * zLimit };
    const target = { x: (rng() * 2 - 1) * xLimit, z: (rng() * 2 - 1) * zLimit };
    if (distance(cue, target) < MIN_BALL_SEPARATION) {
      continue;
    }
    const shot = createShot(cue, target);
    if (shot) {
      return shot;
    }
  }

  throw new Error(`随机摆球 ${MAX_RANDOM_ATTEMPTS} 次仍未找到可行局面`);
}
