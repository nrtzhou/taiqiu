import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

import { createCueBall, createTargetBall } from './balls.js';
import { BALL_RADIUS } from './geometry.js';
import { createTable } from './table.js';

const CUE_START = { x: -0.58, z: 0.22 };
const TARGET_START = { x: 0.36, z: -0.18 };

const app = document.querySelector('#app');

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1;
renderer.outputColorSpace = THREE.SRGBColorSpace;
app.append(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b1210);

const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.55;
pmrem.dispose();

const camera = new THREE.PerspectiveCamera(44, window.innerWidth / window.innerHeight, 0.05, 50);
camera.position.set(1.85, 2.35, 2.85);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 0.02, 0.03);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.enablePan = false;
controls.minDistance = 1.5;
controls.maxDistance = 7;
controls.minPolarAngle = 0.15;
controls.maxPolarAngle = Math.PI / 2 - 0.12;
controls.rotateSpeed = 0.7;
controls.zoomSpeed = 0.8;
controls.update();

const sun = new THREE.DirectionalLight(0xfff1d6, 3);
sun.position.set(-2.6, 4.8, 2);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -2.2;
sun.shadow.camera.right = 2.2;
sun.shadow.camera.top = 2.2;
sun.shadow.camera.bottom = -2.2;
sun.shadow.camera.near = 0.5;
sun.shadow.camera.far = 12;
sun.shadow.bias = -0.0003;
sun.shadow.normalBias = 0.015;
scene.add(sun);
scene.add(new THREE.HemisphereLight(0x9cb7a6, 0x1c140e, 0.35));

const fill = new THREE.DirectionalLight(0xbcd4ff, 0.5);
fill.position.set(2.6, 2, 2.8);
scene.add(fill);

const floor = new THREE.Mesh(
  new THREE.CircleGeometry(6, 64),
  new THREE.MeshStandardMaterial({ color: 0x080d0b, roughness: 0.94, metalness: 0 }),
);
floor.rotation.x = -Math.PI / 2;
floor.position.y = -0.76;
floor.receiveShadow = true;
scene.add(floor);

scene.add(createTable());

const cueBall = createCueBall();
cueBall.position.set(CUE_START.x, BALL_RADIUS, CUE_START.z);
scene.add(cueBall);

const targetBall = createTargetBall();
targetBall.position.set(TARGET_START.x, BALL_RADIUS, TARGET_START.z);
// 球面编号在纹理 u=0.25 处朝 +z，旋转球体让编号面向初始相机。
targetBall.rotation.y = Math.atan2(
  camera.position.x - TARGET_START.x,
  camera.position.z - TARGET_START.z,
);
scene.add(targetBall);

function handleResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
}

window.addEventListener('resize', handleResize);

renderer.setAnimationLoop(() => {
  controls.update();
  renderer.render(scene, camera);
});
