import * as THREE from 'three';

import { POCKETS, TABLE_HEIGHT, TABLE_WIDTH } from './geometry.js';
import { createClothBumpTexture, createClothTexture, createWoodTexture } from './textures.js';

const CUSHION_DEPTH = 0.05;
const RAIL_WIDTH = 0.13;
const RAIL_TOP = 0.045;
const FRAME_BOTTOM = -0.02;
const APRON_BOTTOM = -0.14;
const FLOOR_Y = -0.76;

const HALF_WIDTH = TABLE_WIDTH / 2;
const HALF_HEIGHT = TABLE_HEIGHT / 2;

const CORNER_MOUTH = POCKETS.find((pocket) => pocket.x !== 0).mouthRadius;
const MIDDLE_MOUTH = POCKETS.find((pocket) => pocket.x === 0).mouthRadius;
const OUTER_WIDTH = TABLE_WIDTH + 2 * (CUSHION_DEPTH + RAIL_WIDTH);
const OUTER_HEIGHT = TABLE_HEIGHT + 2 * (CUSHION_DEPTH + RAIL_WIDTH);

function roundedRectShape(width, height, radius) {
  const halfWidth = width / 2;
  const halfHeight = height / 2;
  const shape = new THREE.Shape();
  shape.moveTo(-halfWidth + radius, -halfHeight);
  shape.lineTo(halfWidth - radius, -halfHeight);
  shape.quadraticCurveTo(halfWidth, -halfHeight, halfWidth, -halfHeight + radius);
  shape.lineTo(halfWidth, halfHeight - radius);
  shape.quadraticCurveTo(halfWidth, halfHeight, halfWidth - radius, halfHeight);
  shape.lineTo(-halfWidth + radius, halfHeight);
  shape.quadraticCurveTo(-halfWidth, halfHeight, -halfWidth, halfHeight - radius);
  shape.lineTo(-halfWidth, -halfHeight + radius);
  shape.quadraticCurveTo(-halfWidth, -halfHeight, -halfWidth + radius, -halfHeight);
  shape.closePath();
  return shape;
}

const FRAME_CUT_MARGIN = 0.009;
const FRAME_BEVEL = 0.003;
const LINER_WALL_INSET = 0.004;
const LINER_FLANGE_OVERLAP = 0.0002;
const BUCKET_BOTTOM_Y = -0.12;
const BUCKET_BOTTOM_INSET = 0.001;

function createFrameHolePath(halfWidth, halfHeight) {
  const path = new THREE.Path();
  const steps = 720;

  // 袋口圆必须从木框内缘切出去，否则木料会露在袋圈内。
  for (let step = 0; step < steps; step += 1) {
    const angle = (step / steps) * Math.PI * 2;
    const dx = Math.cos(angle);
    const dy = Math.sin(angle);
    let distance = Math.min(
      halfWidth / Math.max(Math.abs(dx), 1e-9),
      halfHeight / Math.max(Math.abs(dy), 1e-9),
    );

    for (const pocket of POCKETS) {
      const centerX = pocket.x;
      const centerY = -pocket.z;
      const radius = pocket.mouthRadius + FRAME_CUT_MARGIN;
      const projection = centerX * dx + centerY * dy;
      const discriminant = projection * projection
        - (centerX * centerX + centerY * centerY)
        + radius * radius;
      if (discriminant > 0) {
        distance = Math.max(distance, projection + Math.sqrt(discriminant));
      }
    }

    const x = dx * distance;
    const y = dy * distance;
    if (step === 0) {
      path.moveTo(x, y);
    } else {
      path.lineTo(x, y);
    }
  }

  path.closePath();
  return path;
}

function createFrame(woodMaterial) {
  const shape = roundedRectShape(OUTER_WIDTH, OUTER_HEIGHT, 0.06);
  shape.holes.push(createFrameHolePath(HALF_WIDTH + CUSHION_DEPTH, HALF_HEIGHT + CUSHION_DEPTH));

  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: RAIL_TOP - FRAME_BOTTOM - 0.006,
    bevelEnabled: true,
    bevelThickness: FRAME_BEVEL,
    bevelSize: FRAME_BEVEL,
    bevelSegments: 2,
    curveSegments: 10,
  });
  geometry.rotateX(-Math.PI / 2);

  const frame = new THREE.Mesh(geometry, woodMaterial);
  frame.position.y = FRAME_BOTTOM + 0.003;
  frame.castShadow = true;
  frame.receiveShadow = true;
  return frame;
}

function createApron(woodMaterial) {
  const shape = roundedRectShape(OUTER_WIDTH - 0.03, OUTER_HEIGHT - 0.03, 0.06);

  // 围板在袋口处开净空，袋桶从中间穿过，避免封住袋底。
  for (const pocket of POCKETS) {
    const hole = new THREE.Path();
    hole.absarc(pocket.x, -pocket.z, pocket.mouthRadius + FRAME_CUT_MARGIN, 0, Math.PI * 2, true);
    shape.holes.push(hole);
  }

  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: FRAME_BOTTOM - APRON_BOTTOM,
    bevelEnabled: false,
    curveSegments: 32,
  });
  geometry.rotateX(-Math.PI / 2);

  const apron = new THREE.Mesh(geometry, woodMaterial);
  apron.position.y = APRON_BOTTOM;
  apron.castShadow = true;
  apron.receiveShadow = true;
  return apron;
}

function createLegs(woodMaterial) {
  const legs = new THREE.Group();
  const geometry = new THREE.BoxGeometry(0.11, APRON_BOTTOM - FLOOR_Y, 0.11);

  for (const x of [-1, 1]) {
    for (const z of [-1, 1]) {
      const leg = new THREE.Mesh(geometry, woodMaterial);
      leg.position.set(
        x * (HALF_WIDTH + RAIL_WIDTH - 0.06),
        (APRON_BOTTOM + FLOOR_Y) / 2,
        z * (HALF_HEIGHT + RAIL_WIDTH - 0.06),
      );
      leg.castShadow = true;
      leg.receiveShadow = true;
      legs.add(leg);
    }
  }

  return legs;
}

function createBed(clothMaterial) {
  const width = TABLE_WIDTH + 0.16;
  const height = TABLE_HEIGHT + 0.16;
  const shape = new THREE.Shape();
  shape.moveTo(-width / 2, -height / 2);
  shape.lineTo(width / 2, -height / 2);
  shape.lineTo(width / 2, height / 2);
  shape.lineTo(-width / 2, height / 2);
  shape.closePath();

  // 袋口在布面开真实圆孔，下方放深色袋洞，避免黑圆片贴在布上。
  for (const pocket of POCKETS) {
    const hole = new THREE.Path();
    hole.absarc(pocket.x, -pocket.z, pocket.mouthRadius, 0, Math.PI * 2, true);
    shape.holes.push(hole);
  }

  const geometry = new THREE.ShapeGeometry(shape, 32);
  geometry.rotateX(-Math.PI / 2);
  const bed = new THREE.Mesh(geometry, clothMaterial);
  bed.receiveShadow = true;
  return bed;
}

function createCushionGeometry(length) {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.lineTo(0, 0.03);
  shape.lineTo(0.006, 0.037);
  shape.lineTo(CUSHION_DEPTH, 0.041);
  shape.lineTo(CUSHION_DEPTH, 0);
  shape.closePath();

  // 按实际段长挤出，UV 与床面同为米制；不能再靠 scale.z 拉伸。
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: length, bevelEnabled: false, steps: 1 });
  geometry.translate(0, 0, -length / 2);
  return geometry;
}

function addCushion(group, geometry, material, x, z, rotationY) {
  const cushion = new THREE.Mesh(geometry, material);
  cushion.position.set(x, 0, z);
  cushion.rotation.y = rotationY;
  cushion.castShadow = true;
  cushion.receiveShadow = true;
  group.add(cushion);
}

function createCushions(clothMaterial) {
  const cushions = new THREE.Group();
  const longSegments = [
    [-HALF_WIDTH + CORNER_MOUTH, -MIDDLE_MOUTH],
    [MIDDLE_MOUTH, HALF_WIDTH - CORNER_MOUTH],
  ];
  const longGeometry = createCushionGeometry(longSegments[0][1] - longSegments[0][0]);

  for (const [start, end] of longSegments) {
    const center = (start + end) / 2;
    // 鼻线在台边，剖面朝木框方向;局部 +x 指向台外。
    addCushion(cushions, longGeometry, clothMaterial, center, HALF_HEIGHT, -Math.PI / 2);
    addCushion(cushions, longGeometry, clothMaterial, center, -HALF_HEIGHT, Math.PI / 2);
  }

  const shortLength = TABLE_HEIGHT - 2 * CORNER_MOUTH;
  const shortGeometry = createCushionGeometry(shortLength);
  addCushion(cushions, shortGeometry, clothMaterial, HALF_WIDTH, 0, 0);
  addCushion(cushions, shortGeometry, clothMaterial, -HALF_WIDTH, 0, Math.PI);

  return cushions;
}

// 布面孔到框孔之间用一条与布面齐平的深色环带收口；木框/库边一侧的外弧段
// 立壁升到框顶并外翻盖住倒角；下壁全周延伸到袋底，遮住围板孔内壁。
function addPocketShell(positions, indices, mouth, wallRadius) {
  const segments = 256;
  const quad = (a, b, c, d) => indices.push(a, b, c, b, d, c);

  for (let i = 0; i <= segments; i += 1) {
    const angle = (i / segments) * Math.PI * 2;
    const dx = Math.sin(angle);
    const dz = Math.cos(angle);
    positions.push(dx * mouth, 0, dz * mouth);
    positions.push(dx * wallRadius, 0, dz * wallRadius);
  }
  for (let i = 0; i < segments; i += 1) {
    const a = i * 2;
    quad(a, a + 1, a + 2, a + 3);
  }

  const lowerBase = positions.length / 3;
  for (let i = 0; i <= segments; i += 1) {
    const angle = (i / segments) * Math.PI * 2;
    const dx = Math.sin(angle);
    const dz = Math.cos(angle);
    positions.push(dx * wallRadius, 0, dz * wallRadius);
    positions.push(dx * wallRadius, BUCKET_BOTTOM_Y, dz * wallRadius);
  }
  for (let i = 0; i < segments; i += 1) {
    const a = lowerBase + i * 2;
    quad(a, a + 1, a + 2, a + 3);
  }
}

// 弧段从库边后面起，止于与两侧木框缺口的交点，露出布面开口、不包到袋口两侧。
function addPocketRim(positions, indices, wallRadius, rimOuter, arcStart, arcLength) {
  const segments = 96;
  const quad = (a, b, c, d) => indices.push(a, b, c, b, d, c);
  const rimBase = positions.length / 3;

  for (let i = 0; i <= segments; i += 1) {
    const angle = arcStart + (arcLength * i) / segments;
    const dx = Math.sin(angle);
    const dz = Math.cos(angle);
    positions.push(dx * wallRadius, 0, dz * wallRadius);
    positions.push(dx * wallRadius, RAIL_TOP, dz * wallRadius);
    positions.push(dx * rimOuter, RAIL_TOP, dz * rimOuter);
  }
  for (let i = 0; i < segments; i += 1) {
    for (let band = 0; band < 2; band += 1) {
      const a = rimBase + i * 3 + band;
      quad(a, a + 1, a + 3, a + 4);
    }
  }

  for (const end of [arcStart, arcStart + arcLength]) {
    const dx = Math.sin(end);
    const dz = Math.cos(end);
    const base = positions.length / 3;
    positions.push(dx * wallRadius, 0, dz * wallRadius);
    positions.push(dx * wallRadius, RAIL_TOP, dz * wallRadius);
    positions.push(dx * rimOuter, RAIL_TOP, dz * rimOuter);
    indices.push(base, base + 1, base + 2);
  }
}

function createPocketLinerGeometry(pocket) {
  const mouth = pocket.mouthRadius;
  const cutRadius = mouth + FRAME_CUT_MARGIN;
  const wallRadius = cutRadius - LINER_WALL_INSET;
  const halfAngle = Math.acos(CUSHION_DEPTH / cutRadius);
  const outward = Math.atan2(Math.sign(pocket.x), Math.sign(pocket.z));
  const corner = pocket.x !== 0;
  const arcStart = outward - halfAngle - (corner ? Math.PI / 4 : 0);
  const arcLength = 2 * halfAngle + (corner ? Math.PI / 2 : 0);
  const rimOuter = cutRadius + FRAME_BEVEL + LINER_FLANGE_OVERLAP;
  const positions = [];
  const indices = [];

  addPocketShell(positions, indices, mouth, wallRadius);
  addPocketRim(positions, indices, wallRadius, rimOuter, arcStart, arcLength);

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function createPockets() {
  const pockets = new THREE.Group();
  const cavityMaterial = new THREE.MeshStandardMaterial({
    color: 0x252c27,
    roughness: 0.95,
    metalness: 0,
    side: THREE.DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });

  for (const pocket of POCKETS) {
    const liner = new THREE.Mesh(createPocketLinerGeometry(pocket), cavityMaterial);
    liner.position.set(pocket.x, 0, pocket.z);
    liner.receiveShadow = true;
    pockets.add(liner);

    const bottomRadius = pocket.mouthRadius + FRAME_CUT_MARGIN - BUCKET_BOTTOM_INSET;
    const bottom = new THREE.Mesh(new THREE.CircleGeometry(bottomRadius, 128), cavityMaterial);
    bottom.position.set(pocket.x, BUCKET_BOTTOM_Y, pocket.z);
    bottom.rotation.x = -Math.PI / 2;
    bottom.receiveShadow = true;
    pockets.add(bottom);
  }

  return pockets;
}

function createSights() {
  const sights = new THREE.Group();
  const material = new THREE.MeshStandardMaterial({
    color: 0xe5dcc0,
    roughness: 0.35,
    metalness: 0.1,
  });
  const geometry = new THREE.CylinderGeometry(0.0055, 0.0055, 0.0015, 20);
  const longRailZ = HALF_HEIGHT + CUSHION_DEPTH + RAIL_WIDTH / 2;
  const shortRailX = HALF_WIDTH + CUSHION_DEPTH + RAIL_WIDTH / 2;

  for (const z of [longRailZ, -longRailZ]) {
    for (const step of [-3, -2, -1, 1, 2, 3]) {
      const sight = new THREE.Mesh(geometry, material);
      sight.position.set((step * TABLE_WIDTH) / 8, RAIL_TOP + 0.0005, z);
      sights.add(sight);
    }
  }

  for (const x of [shortRailX, -shortRailX]) {
    for (const step of [-1, 0, 1]) {
      const sight = new THREE.Mesh(geometry, material);
      sight.position.set(x, RAIL_TOP + 0.0005, (step * TABLE_HEIGHT) / 4);
      sights.add(sight);
    }
  }

  return sights;
}

export function createTable() {
  const table = new THREE.Group();
  const clothMap = createClothTexture();
  const clothBump = createClothBumpTexture();
  const woodMap = createWoodTexture();
  woodMap.wrapS = THREE.MirroredRepeatWrapping;
  woodMap.wrapT = THREE.MirroredRepeatWrapping;

  const clothMaterial = new THREE.MeshStandardMaterial({
    map: clothMap,
    bumpMap: clothBump,
    bumpScale: 0.03,
    roughness: 0.92,
    metalness: 0,
  });
  const woodMaterial = new THREE.MeshPhysicalMaterial({
    map: woodMap,
    roughness: 0.45,
    clearcoat: 0.35,
    clearcoatRoughness: 0.35,
    metalness: 0,
  });

  table.add(createBed(clothMaterial));
  table.add(createCushions(clothMaterial));
  table.add(createFrame(woodMaterial));
  table.add(createApron(woodMaterial));
  table.add(createLegs(woodMaterial));
  table.add(createPockets());
  table.add(createSights());

  return table;
}
