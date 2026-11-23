import * as THREE from 'three';

import { BALL_RADIUS, POCKETS } from './geometry.js';

const LINE_RADIUS = 0.0032;
const LINE_Y = 0.004;
const MARKER_Y = 0.0035;
const HIGHLIGHT_Y = 0.052;
const UP = new THREE.Vector3(0, 1, 0);

function createLine(color) {
  const line = new THREE.Mesh(
    new THREE.CylinderGeometry(LINE_RADIUS, LINE_RADIUS, 1, 10, 1, false),
    new THREE.MeshBasicMaterial({ color, toneMapped: false }),
  );
  return line;
}

function placeLine(line, from, to) {
  const dx = to.x - from.x;
  const dz = to.z - from.z;
  const length = Math.hypot(dx, dz);

  line.position.set((from.x + to.x) / 2, LINE_Y, (from.z + to.z) / 2);
  line.scale.set(1, length, 1);
  line.quaternion.setFromUnitVectors(UP, new THREE.Vector3(dx, 0, dz).normalize());
}

function createGhostBall() {
  const ghost = new THREE.Mesh(
    new THREE.SphereGeometry(BALL_RADIUS, 48, 32),
    new THREE.MeshPhysicalMaterial({
      color: 0xb9f5ff,
      roughness: 0.05,
      metalness: 0,
      clearcoat: 1,
      clearcoatRoughness: 0.05,
      transparent: true,
      opacity: 0.24,
      depthWrite: false,
      envMapIntensity: 1.2,
    }),
  );
  ghost.renderOrder = 2;
  return ghost;
}

// 六枚高亮环一次建好，选袋时只切换可见性。
function createPocketHighlights() {
  const material = new THREE.MeshBasicMaterial({
    color: 0x6dffd2,
    transparent: true,
    opacity: 0.9,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  });
  const rings = POCKETS.map((pocket) => {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(pocket.mouthRadius + 0.004, 0.006, 12, 64),
      material,
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(pocket.x, HIGHLIGHT_Y, pocket.z);
    ring.visible = false;
    ring.userData.pocket = pocket;
    return ring;
  });
  const group = new THREE.Group();
  group.add(...rings);
  return { group, rings };
}

export function createAimOverlay() {
  const group = new THREE.Group();
  const ghostBall = createGhostBall();
  const objectLine = createLine(0x74e8ff);
  const aimLine = createLine(0xffc857);
  const aimMarker = new THREE.Mesh(
    new THREE.TorusGeometry(0.012, 0.0024, 10, 32),
    new THREE.MeshBasicMaterial({ color: 0xffc857, toneMapped: false }),
  );
  aimMarker.rotation.x = -Math.PI / 2;
  const contactMarker = new THREE.Mesh(
    new THREE.SphereGeometry(0.0065, 20, 14),
    new THREE.MeshStandardMaterial({
      color: 0xffa066,
      emissive: 0xff4d1f,
      emissiveIntensity: 1.4,
      roughness: 0.4,
    }),
  );
  const { group: highlightGroup, rings: highlightRings } = createPocketHighlights();
  let selectedHighlight = null;
  let linesVisible = true;

  group.add(ghostBall, objectLine, aimLine, aimMarker, contactMarker, highlightGroup);

  return {
    group,
    update(shot) {
      ghostBall.position.set(shot.ghost.x, BALL_RADIUS, shot.ghost.z);
      aimMarker.position.set(shot.ghost.x, MARKER_Y, shot.ghost.z);
      contactMarker.position.set(shot.contact.x, BALL_RADIUS, shot.contact.z);
      placeLine(objectLine, shot.target, shot.pocket);
      placeLine(aimLine, shot.cue, shot.ghost);

      selectedHighlight = highlightRings.find((ring) => ring.userData.pocket === shot.pocket);
      for (const ring of highlightRings) {
        ring.visible = ring === selectedHighlight;
        ring.scale.setScalar(1);
      }
    },
    setLinesVisible(visible) {
      linesVisible = visible;
      objectLine.visible = visible;
      aimLine.visible = visible;
    },
    get linesVisible() {
      return linesVisible;
    },
    animate(time) {
      if (selectedHighlight) {
        selectedHighlight.scale.setScalar(1 + Math.sin(time * 3) * 0.06);
      }
    },
  };
}
