import * as THREE from 'three';

import { BALL_RADIUS } from './geometry.js';
import { createCueBallTexture, createNineBallTexture } from './textures.js';

function createBall(texture) {
  const material = new THREE.MeshPhysicalMaterial({
    map: texture,
    roughness: 0.08,
    metalness: 0,
    clearcoat: 1,
    clearcoatRoughness: 0.05,
    envMapIntensity: 1.1,
  });
  const ball = new THREE.Mesh(new THREE.SphereGeometry(BALL_RADIUS, 48, 32), material);
  ball.castShadow = true;
  ball.receiveShadow = true;
  return ball;
}

export function createCueBall() {
  return createBall(createCueBallTexture());
}

export function createTargetBall() {
  return createBall(createNineBallTexture());
}
