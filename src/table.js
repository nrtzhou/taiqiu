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
    bevelThickness: 0.003,
    bevelSize: 0.003,
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
  const apron = new THREE.Mesh(
    new THREE.BoxGeometry(OUTER_WIDTH - 0.03, FRAME_BOTTOM - APRON_BOTTOM, OUTER_HEIGHT - 0.03),
    woodMaterial,
  );
  apron.position.y = (FRAME_BOTTOM + APRON_BOTTOM) / 2;
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

function createCushionGeometry() {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.lineTo(0, 0.03);
  shape.lineTo(0.006, 0.037);
  shape.lineTo(CUSHION_DEPTH, 0.041);
  shape.lineTo(CUSHION_DEPTH, 0);
  shape.closePath();

  const geometry = new THREE.ExtrudeGeometry(shape, { depth: 1, bevelEnabled: false, steps: 1 });
  // 以段中点定位，旋转只决定剖面朝向。
  geometry.translate(0, 0, -0.5);
  return geometry;
}

function addCushion(group, geometry, material, x, z, length, rotationY) {
  const cushion = new THREE.Mesh(geometry, material);
  cushion.position.set(x, 0, z);
  cushion.rotation.y = rotationY;
  cushion.scale.z = length;
  cushion.castShadow = true;
  cushion.receiveShadow = true;
  group.add(cushion);
}

function createCushions(clothMaterial) {
  const cushions = new THREE.Group();
  const geometry = createCushionGeometry();
  const longSegments = [
    [-HALF_WIDTH + CORNER_MOUTH, -MIDDLE_MOUTH],
    [MIDDLE_MOUTH, HALF_WIDTH - CORNER_MOUTH],
  ];

  for (const [start, end] of longSegments) {
    const center = (start + end) / 2;
    const length = end - start;
    // 鼻线在台边，剖面朝木框方向;局部 +x 指向台外。
    addCushion(cushions, geometry, clothMaterial, center, HALF_HEIGHT, length, -Math.PI / 2);
    addCushion(cushions, geometry, clothMaterial, center, -HALF_HEIGHT, length, Math.PI / 2);
  }

  const shortLength = TABLE_HEIGHT - 2 * CORNER_MOUTH;
  addCushion(cushions, geometry, clothMaterial, HALF_WIDTH, 0, shortLength, 0);
  addCushion(cushions, geometry, clothMaterial, -HALF_WIDTH, 0, shortLength, Math.PI);

  return cushions;
}

function createPockets() {
  const pockets = new THREE.Group();
  const cavityMaterial = new THREE.MeshStandardMaterial({
    color: 0x050806,
    roughness: 0.92,
    metalness: 0,
    side: THREE.DoubleSide,
  });
  const ringMaterial = new THREE.MeshStandardMaterial({
    color: 0xa08a5a,
    metalness: 1,
    roughness: 0.35,
    envMapIntensity: 0.9,
  });

  for (const pocket of POCKETS) {
    const mouth = pocket.mouthRadius;
    const depth = RAIL_TOP + 0.001 + 0.019;
    const shaft = new THREE.Mesh(
      new THREE.CylinderGeometry(mouth, mouth, depth, 48, 1, true),
      cavityMaterial,
    );
    shaft.position.set(pocket.x, RAIL_TOP + 0.001 - depth / 2, pocket.z);
    pockets.add(shaft);

    const bottom = new THREE.Mesh(new THREE.CircleGeometry(mouth, 32), cavityMaterial);
    bottom.position.set(pocket.x, -0.019, pocket.z);
    bottom.rotation.x = -Math.PI / 2;
    pockets.add(bottom);

    const collar = new THREE.Mesh(
      new THREE.RingGeometry(mouth - 0.0015, mouth + FRAME_CUT_MARGIN, 48),
      cavityMaterial,
    );
    collar.position.set(pocket.x, RAIL_TOP + 0.0005, pocket.z);
    collar.rotation.x = -Math.PI / 2;
    pockets.add(collar);

    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(mouth + 0.003, 0.0045, 12, 64),
      ringMaterial,
    );
    ring.position.set(pocket.x, RAIL_TOP + 0.001, pocket.z);
    ring.rotation.x = -Math.PI / 2;
    ring.castShadow = true;
    pockets.add(ring);
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
  // ShapeGeometry / ExtrudeGeometry 的 UV 以米为单位，重复次数按米换算。
  clothMap.repeat.set(2.3, 2.3);
  clothBump.repeat.set(2.3, 2.3);
  woodMap.wrapS = THREE.MirroredRepeatWrapping;
  woodMap.wrapT = THREE.MirroredRepeatWrapping;

  const clothMaterial = new THREE.MeshStandardMaterial({
    map: clothMap,
    bumpMap: clothBump,
    bumpScale: 0.15,
    roughness: 0.94,
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
