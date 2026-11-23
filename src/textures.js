import * as THREE from 'three';

function createCanvas(width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return { canvas, ctx: canvas.getContext('2d') };
}

function toTexture(canvas, { repeatX = 1, repeatY = 1, srgb = true } = {}) {
  const texture = new THREE.CanvasTexture(canvas);
  if (srgb) {
    texture.colorSpace = THREE.SRGBColorSpace;
  }
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeatX, repeatY);
  texture.anisotropy = 8;
  return texture;
}

export function createClothTexture() {
  const size = 512;
  const cells = 16;
  const grid = Array.from({ length: cells * cells }, () => Math.random());
  const { canvas, ctx } = createCanvas(size, size);
  const image = ctx.createImageData(size, size);

  const at = (ix, iy) => grid[((iy % cells + cells) % cells) * cells + ((ix % cells + cells) % cells)];
  const sampleNoise = (x, y) => {
    const gx = (x / size) * cells;
    const gy = (y / size) * cells;
    const x0 = Math.floor(gx);
    const y0 = Math.floor(gy);
    const fx = gx - x0;
    const fy = gy - y0;
    const sx = fx * fx * (3 - 2 * fx);
    const sy = fy * fy * (3 - 2 * fy);
    const top = at(x0, y0) * (1 - sx) + at(x0 + 1, y0) * sx;
    const bottom = at(x0, y0 + 1) * (1 - sx) + at(x0 + 1, y0 + 1) * sx;
    return top * (1 - sy) + bottom * sy;
  };

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      // 平纹编织 + 细噪声 + 有机低频绒面，远看不会出现规则格子。
      const weave = ((x % 4) < 2 ? 2 : -2) + ((y % 4) < 2 ? 2 : -2);
      const noise = (Math.random() - 0.5) * 14;
      const mottle = (sampleNoise(x, y) - 0.5) * 10;
      const offset = (y * size + x) * 4;
      image.data[offset] = 30 + weave + noise + mottle;
      image.data[offset + 1] = 78 + weave + noise + mottle;
      image.data[offset + 2] = 48 + weave * 0.6 + noise + mottle;
      image.data[offset + 3] = 255;
    }
  }

  ctx.putImageData(image, 0, 0);
  return toTexture(canvas, { repeatX: 6, repeatY: 3.2 });
}

export function createClothBumpTexture() {
  const size = 256;
  const { canvas, ctx } = createCanvas(size, size);
  const image = ctx.createImageData(size, size);

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const weave = ((x % 4) < 2 ? 22 : -22) + ((y % 4) < 2 ? 22 : -22);
      const noise = (Math.random() - 0.5) * 24;
      const offset = (y * size + x) * 4;
      const value = 128 + weave + noise;
      image.data[offset] = value;
      image.data[offset + 1] = value;
      image.data[offset + 2] = value;
      image.data[offset + 3] = 255;
    }
  }

  ctx.putImageData(image, 0, 0);
  return toTexture(canvas, { repeatX: 6, repeatY: 3.2, srgb: false });
}

export function createWoodTexture() {
  const size = 512;
  const { canvas, ctx } = createCanvas(size, size);
  const gradient = ctx.createLinearGradient(0, 0, size, size);
  gradient.addColorStop(0, '#3f2614');
  gradient.addColorStop(0.5, '#56351d');
  gradient.addColorStop(1, '#2e1a0c');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  for (let i = 0; i < 180; i += 1) {
    const baseY = Math.random() * size;
    const amplitude = 2 + Math.random() * 10;
    const frequency = 1 + Math.random() * 3;
    const phase = Math.random() * Math.PI * 2;
    const dark = Math.random() < 0.72;
    ctx.strokeStyle = dark
      ? `rgba(28, 15, 6, ${0.06 + Math.random() * 0.16})`
      : `rgba(200, 152, 92, ${0.04 + Math.random() * 0.08})`;
    ctx.lineWidth = 1 + Math.random() * 2.5;
    ctx.beginPath();
    for (let x = 0; x <= size; x += 8) {
      const y = baseY + Math.sin((x / size) * Math.PI * 2 * frequency + phase) * amplitude;
      if (x === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();
  }

  for (let i = 0; i < 3; i += 1) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    for (let radius = 8; radius < 34; radius += 7) {
      ctx.strokeStyle = 'rgba(30, 16, 6, 0.12)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(x, y, radius * 2.2, radius * 0.8, 0.2, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  return toTexture(canvas);
}

export function createCueBallTexture() {
  const width = 1024;
  const height = 512;
  const { canvas, ctx } = createCanvas(width, height);
  ctx.fillStyle = '#f6f2e6';
  ctx.fillRect(0, 0, width, height);

  for (let i = 0; i < 40; i += 1) {
    ctx.fillStyle = `rgba(214, 198, 168, ${0.03 + Math.random() * 0.05})`;
    ctx.beginPath();
    ctx.arc(Math.random() * width, Math.random() * height, 3 + Math.random() * 9, 0, Math.PI * 2);
    ctx.fill();
  }

  const dots = [
    [180, 150], [420, 330], [760, 120], [880, 400], [300, 430],
    [600, 220], [70, 300], [980, 250], [520, 90], [150, 420],
  ];
  ctx.fillStyle = '#a81f1f';
  for (const [x, y] of dots) {
    ctx.beginPath();
    ctx.arc(x, y, 13, 0, Math.PI * 2);
    ctx.fill();
  }

  return toTexture(canvas);
}

export function createNineBallTexture() {
  const width = 1024;
  const height = 512;
  const { canvas, ctx } = createCanvas(width, height);
  ctx.fillStyle = '#f4f0e2';
  ctx.fillRect(0, 0, width, height);

  // 9 号球：赤道黄色条纹 + 两端白色编号圆。
  ctx.fillStyle = '#e0b81d';
  ctx.fillRect(0, height * 0.29, width, height * 0.42);
  ctx.fillStyle = 'rgba(120, 90, 8, 0.35)';
  ctx.fillRect(0, height * 0.29, width, 3);
  ctx.fillRect(0, height * 0.71 - 3, width, 3);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 82px Arial, Helvetica, sans-serif';
  for (const centerX of [width * 0.25, width * 0.75]) {
    ctx.fillStyle = '#fbf9f1';
    ctx.beginPath();
    ctx.arc(centerX, height / 2, 64, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#d9d3c2';
    ctx.lineWidth = 4;
    ctx.stroke();

    ctx.fillStyle = '#141414';
    ctx.fillText('9', centerX, height / 2 + 2);
  }

  return toTexture(canvas);
}
