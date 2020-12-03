import { dist, dir } from "./utils";

export default class Repulser {
  settings: SimSettings;
  position: [number, number];
  constructor(x: number, y: number, settings: SimSettings) {
    this.position = [x, y];
    this.settings = settings;
  }

  applyForce(Vx: number[], Vy: number[], radius: number, force: number) {
    let xStart = Math.max(this.position[0] - radius, 0);
    let yStart = Math.max(this.position[1] - radius, 0);
    let xEnd = Math.min(this.position[0] + radius, this.settings.gridSize);
    let yEnd = Math.min(this.position[1] + radius, this.settings.gridSize);
    for (let y = yStart; y < yEnd; y++)
      for (let x = xStart; x < xEnd; x++) {
        let distance = dist(this.position[0], x, this.position[1], y);
        let direction = dir(this.position[0], x, this.position[1], y);
        if (distance < radius && distance > 0) {
          const mag = force / distance ** 2;
          let dx = Math.cos(direction) * mag;
          let dy = Math.sin(direction) * mag;
          let i = x + y * this.settings.gridSize;
          if (Math.abs(Vx[i]) < Math.abs(dx)) Vx[i] += dx;
          if (Math.abs(Vy[i]) < Math.abs(dy)) Vy[i] += dy;
        }
      }
  }
}
