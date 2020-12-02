import * as twgl from "twgl.js";
import dat from "dat.gui";
import textureFrag from "../resources/texture.vert";
import fluidFrag from "../resources/fluid.frag";
import Repulser from "./Repulser";
import Attractor from "./Attractor";
const settings: SimSettings = {
  cellSize: 3,
  gridSize: 0,
  timeStep: 0.4,
  dissipation: 0.4,
  viscosity: 0,
  diffusion: 0,
  iteration: 6,
  blur: 0,
  emissionRate: 1,
  separation: 5,
  splatRadius: 4,
  color: [255, 255, 255, 1],
  fluidColor: [1, 1, 1, 1],
};
const mouseTexel: [number, number] = [0, 0];
const repulsers: Repulser[] = [];
const attractors: Attractor[] = [];
const canvas = document.getElementById("scene") as HTMLCanvasElement;
onResize();
const gl = canvas.getContext("webgl2");
twgl.addExtensionsToContext(gl);
const drawProgram = twgl.createProgramInfo(gl, [textureFrag, fluidFrag]);
const densityTextureOptions = {
  target: gl.TEXTURE_2D,
  wrap: gl.CLAMP_TO_EDGE,
  minMag: gl.NEAREST,
  format: gl.RED,
  internalFormat: gl.R16F,
};
let densityFramebuffer: twgl.FramebufferInfo;
let pathFBO: twgl.FramebufferInfo;

const IX = (x: number, y: number) => x + y * settings.gridSize;

init();

class Fluid {
  size: number;

  s: number[]; // Previous density
  density: number[];

  Vx: number[];
  Vy: number[];

  Vx0: number[];
  Vy0: number[];

  constructor() {
    const gSize = settings.gridSize ** 2;
    this.s = new Array(gSize).fill(0);
    this.density = new Array(gSize).fill(0);
    this.Vx = new Array(gSize).fill(0);
    this.Vy = new Array(gSize).fill(0);
    this.Vx0 = new Array(gSize).fill(0);
    this.Vy0 = new Array(gSize).fill(0);
    twgl.resizeFramebufferInfo(
      gl,
      densityFramebuffer,
      [densityTextureOptions],
      settings.gridSize,
      settings.gridSize
    );
  }

  addDye(x: number, y: number, amount: number) {
    let dx: number, dy: number;
    let a = amount / 2 / settings.splatRadius;
    for (dy = -settings.splatRadius; dy < settings.splatRadius; dy++)
      for (dx = -settings.splatRadius; dx < settings.splatRadius; dx++) {
        if (this.density[IX(dx + x, dy + y)] + a < 255) {
          this.density[IX(dx + x, dy + y)] += a;
        }
      }
  }

  addVelocity(i: number, j: number, amountX: number, amountY: number) {
    const index = IX(i, j);
    this.Vx[index] += amountX;
    this.Vy[index] += amountY;
  }

  step() {
    const visc = settings.viscosity;
    const dt = settings.timeStep;
    const iter = settings.iteration;
    const diff = settings.diffusion;
    diffuse(1, this.Vx0, this.Vx, visc, dt, iter, settings.gridSize);
    diffuse(2, this.Vy0, this.Vy, visc, dt, iter, settings.gridSize);

    project(this.Vx0, this.Vy0, this.Vx, this.Vy, iter, settings.gridSize);

    advect(1, this.Vx, this.Vx0, this.Vx0, this.Vy0, dt, settings.gridSize);
    advect(2, this.Vy, this.Vy0, this.Vx0, this.Vy0, dt, settings.gridSize);

    project(this.Vx, this.Vy, this.Vx0, this.Vy0, iter, settings.gridSize);

    // step the Dye
    diffuse(0, this.s, this.density, diff, dt, iter, settings.gridSize);
    advect(0, this.density, this.s, this.Vx, this.Vy, dt, settings.gridSize);
  }

  dissipate() {
    for (let i = 0; i < this.density.length; i++) {
      this.density[i] = Math.max(
        this.density[i] - settings.dissipation * 0.001,
        0
      );
    }
  }

  renderDensity() {
    twgl.setTextureFromArray(
      gl,
      densityFramebuffer.attachments[0],
      this.density,
      densityTextureOptions
    );

    twgl.setUniforms(drawProgram, {
      uTexture: densityFramebuffer.attachments[0],
    });
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
    gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
  }
}

let fluid = new Fluid();

function diffuse(
  b: number,
  x: number[],
  x0: number[],
  diff: number,
  dt: number,
  iter: number,
  N: number
) {
  const a = dt * diff * (N - 2) * (N - 2);
  linearSolver(b, x, x0, a, 1 + 6 * a, iter, N);
}

function linearSolver(
  b: number,
  x: number[],
  x0: number[],
  a: number,
  c: number,
  iter: number,
  N: number
) {
  let cRecip = 1.0 / c;
  for (let k = 0; k < iter; k++) {
    for (let j = 1; j < N - 1; j++) {
      for (let i = 1; i < N - 1; i++) {
        x[IX(i, j)] = // new current value equals
          (x0[IX(i, j)] + // Old val
            a *
              (x[IX(i + 1, j)] +
                x[IX(i - 1, j)] + //Combined current values
                x[IX(i, j + 1)] +
                x[IX(i, j - 1)])) *
          cRecip;
      }
    }

    setBounds(b, x, N);
  }
}

function project(
  velocX: number[],
  velocY: number[],
  p: number[],
  div: number[],
  iter: number,
  N: number
) {
  for (let j = 1; j < N - 1; j++) {
    for (let i = 1; i < N - 1; i++) {
      div[IX(i, j)] =
        (-0.5 *
          (velocX[IX(i + 1, j)] -
            velocX[IX(i - 1, j)] +
            velocY[IX(i, j + 1)] -
            velocY[IX(i, j - 1)])) /
        N;
      p[IX(i, j)] = 0;
    }
  }

  setBounds(0, div, N);
  setBounds(0, p, N);
  linearSolver(0, p, div, 1, 6, iter, N);

  for (let j = 1; j < N - 1; j++) {
    for (let i = 1; i < N - 1; i++) {
      velocX[IX(i, j)] -= 0.5 * (p[IX(i + 1, j)] - p[IX(i - 1, j)]) * N;
      velocY[IX(i, j)] -= 0.5 * (p[IX(i, j + 1)] - p[IX(i, j - 1)]) * N;
    }
  }

  setBounds(1, velocX, N);
  setBounds(2, velocY, N);
}

function advect(
  b: number,
  d: number[],
  d0: number[],
  velocX: number[],
  velocY: number[],
  dt: number,
  N: number
) {
  let i0: number, i1: number, j0: number, j1: number;

  let dtx = dt * (N - 2);
  let dty = dt * (N - 2);

  let s0: number, s1: number, t0: number, t1: number;
  let tmp1: number, tmp2: number, x: number, y: number;

  let Nfloat = N - 2;
  let ifloat: number, jfloat: number;
  let i: number, j: number, k: number;

  for (j = 1, jfloat = 1; j < N - 1; j++, jfloat++) {
    for (i = 1, ifloat = 1; i < N - 1; i++, ifloat++) {
      tmp1 = dtx * velocX[IX(i, j)];
      tmp2 = dty * velocY[IX(i, j)];
      x = ifloat - tmp1;
      y = jfloat - tmp2;

      if (x < 0.5) x = 0.5;
      if (x > Nfloat + 0.5) x = Nfloat + 0.5;
      i0 = Math.floor(x);
      i1 = i0 + 1;
      if (y < 0.5) y = 0.5;
      if (y > Nfloat + 0.5) y = Nfloat + 0.5;
      j0 = Math.floor(y);
      j1 = j0 + 1;

      s1 = x - i0;
      s0 = 1 - s1;
      t1 = y - j0;
      t0 = 1 - t1;

      let i0i = Math.floor(i0);
      let i1i = Math.floor(i1);
      let j0i = Math.floor(j0);
      let j1i = Math.floor(j1);

      d[IX(i, j)] =
        s0 * (t0 * d0[IX(i0i, j0i)] + t1 * d0[IX(i0i, j1i)]) +
        s1 * (t0 * d0[IX(i1i, j0i)] + t1 * d0[IX(i1i, j1i)]);
    }
  }

  setBounds(b, d, N);
}

function setBounds(b: number, x: number[], N: number) {
  for (let i = 1; i < N - 1; i++) {
    x[IX(i, 0)] = b == 2 ? -x[IX(i, 1)] : x[IX(i, 1)];
    x[IX(i, N - 1)] = b == 2 ? -x[IX(i, N - 2)] : x[IX(i, N - 2)];
  }
  for (let j = 1; j < N - 1; j++) {
    x[IX(0, j)] = b == 1 ? -x[IX(1, j)] : x[IX(1, j)];
    x[IX(N - 1, j)] = b == 1 ? -x[IX(N - 2, j)] : x[IX(N - 2, j)];
  }

  x[IX(0, 0)] = 0.5 * (x[IX(1, 0)] + x[IX(0, 1)]);
  x[IX(0, N - 1)] = 0.5 * (x[IX(1, N - 1)] + x[IX(0, N - 2)]);
  x[IX(N - 1, 0)] = 0.5 * (x[IX(N - 2, 0)] + x[IX(N - 1, 1)]);
  x[IX(N - 1, N - 1)] = 0.5 * (x[IX(N - 2, N - 1)] + x[IX(N - 1, N - 2)]);
}

function init() {
  // Create quad for 2D scene
  onResize();
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, -1, 1, 1, 1, 1, -1]),
    gl.STATIC_DRAW
  );
  // Create normals
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(
    gl.ELEMENT_ARRAY_BUFFER,
    new Uint16Array([0, 1, 2, 0, 2, 3]),
    gl.STATIC_DRAW
  );
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(0);

  densityFramebuffer = twgl.createFramebufferInfo(
    gl,
    [densityTextureOptions],
    settings.gridSize,
    settings.gridSize
  );
  setupGui();
  createEvents();
}

function createEvents() {
  let pressed = false;
  window.addEventListener("resize", onResize);
  canvas.addEventListener("mousemove", addCursorDye);
  canvas.addEventListener("mouseup", stopEmitting);
  canvas.addEventListener("mouseleave", stopEmitting);
  canvas.addEventListener("mousedown", startEmitting);
  canvas.addEventListener("click", addRepulser);

  function addCursorDye(e: MouseEvent) {
    let j = Math.floor(e.offsetX / settings.cellSize);
    let i = Math.floor((canvas.height - e.offsetY) / settings.cellSize);
    fluid.addVelocity(j, i, e.movementX, -e.movementY);
    if (!pressed) return;
    fluid.addDye(j, i, settings.emissionRate);
  }

  function addRepulser(e: MouseEvent) {
    if (!e.metaKey) return;
    let j = Math.floor(e.offsetX / settings.cellSize);
    let i = Math.floor((canvas.height - e.offsetY) / settings.cellSize);
    console.log("added repulser");
    // repulsers.push(new Repulser(j, i, 3, 10, settings));
    attractors.push(new Attractor(j, i, 70, 5, settings));
  }

  function startEmitting() {
    pressed = true;
  }

  function stopEmitting() {
    pressed = false;
  }
}

function setupGui() {
  let gui = new dat.GUI();
  gui.add(settings, "cellSize", 1, 20, 1).onChange(reload);
  gui.add(settings, "timeStep", 0, 1, 0.001);
  gui.add(settings, "dissipation", 0, 100);
  gui.add(settings, "viscosity", 0, 0.1, 0.0001);
  gui.add(settings, "iteration", 1, 25, 1);
  gui.add(settings, "emissionRate", 0, 10);
  gui.add(settings, "splatRadius", 1, 25, 1);
  gui
    .addColor(settings, "color")
    .onChange((val) => (settings.fluidColor = val.map((v: number) => v / 255)));
  gui
    .add(settings, "blur", 0, 20, 1)
    .onChange((val) =>
      document.documentElement.style.setProperty("--canvas-blur", `${val}px`)
    );
  document.documentElement.style.setProperty(
    "--canvas-blur",
    `${settings.blur}px`
  );
  return gui;
}

function onResize() {
  const size = Math.min(window.innerWidth, window.innerHeight);
  settings.gridSize = Math.ceil(size / settings.cellSize);
  canvas.width = size;
  canvas.height = size;
}

function reload() {
  onResize();
  fluid = new Fluid();
}

function render(t: number) {
  requestAnimationFrame(render);
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
  gl.useProgram(drawProgram.program);
  fluid.step();
  twgl.setUniforms(drawProgram, {
    fluidColor: settings.fluidColor,
  });
  repulsers.forEach((r) => r.applyForce(fluid.Vx, fluid.Vy));
  attractors.forEach((a) => a.applyForce(fluid.Vx, fluid.Vy));
  fluid.renderDensity();
  fluid.dissipate();
}

requestAnimationFrame(render);
