# 2D Smoke Simulation

An interactive playground, demonstrating the basic concepts behind a Jos Stam Fluid simulation. Users can generate and swirl smoke manually or place attractors and repulsers to move the fluid automatically. Adding pillars will block the flow of smoke and produce some interesting interactions.

## Setup:

0. If you don't have [Node.js](https://nodejs.org/en/), install it.
1. Clone this repository.
2. Install dependencies: `npm install`.
3. Start up a local dev server: `npm start`.
4. Open up `localhost:1234` in your favorite browser.

## Controls:

- Add smoke: Click and drag
- Add Attractor: Press A then click
- Add Repulser: Press R then click

## How it works:

The fluid sim calculates the interaction between pixel cells, tracking the density changes from frame to frame. The density of each cell is used to determine its alpha value. Four processes affect how the density evolves:

- Advection: How densities in one cell push densities in another, which is what makes the liquid flow. This is modeled with a velocity vector field, where each cell has its x and y velocity component updated every frame.
- Diffusion: When given space, liquids spread out over time. Every frame, a fraction of every cell’s density is exchanged with its neighbors.
- Dissipation: Over time, the smoke disappears. Otherwise you would be stuck with a screenful of smoke. A small amount of density is subtracted from each cell at each time step.
- Outside forces: Moving your mouse and adding objects alters the vector field. These updates are applied last, and have the largest influence on the material flow of the simulation.

There are a few tricky details about keep density constant, tracing back velocity and ensuring stability over time, for which I will direct you to Jos Stam’s paper in the resources.

## Why so pixelated?

All of the simulation updates are taking place on the CPU, which means the simulation has to iterate over every pixel multiple times to generate a frame. My original attempt parallelized these operations to GLSL shaders that would generate a 3D texture representing the updated forces. Each force has have a corresponding shader that calculates a new state for a single time step. The shader output gets captured in a frame-buffer and passed to the next calculation as a texture. The final density texture is rendered to the screen using the same shader implemented in this CPU simulation. Sadly I couldn’t get this working in time for the presentation, which led to the dimensionality and image quality reduction. Definitely look at the resources section if you are interested in examples of porting this logic to shader code.

## Technologies used:

- WebGL: For rendering the fluid sim
- TWGL: utility functions for WebGL
- dat.GUI: for the simulation settings panel

## Resources

- [NVIDIA article about GPU accelerated fluid simulations](http://developer.download.nvidia.com/books/HTML/gpugems/gpugems_ch38.html)
- [A simpler WebGL implementation](http://jamie-wong.com/2016/08/05/webgl-fluid-simulation/#implementation)
- [Mike Ash - Fluid Simulation for Dummies](https://mikeash.com/pyblog/fluid-simulation-for-dummies.html)
- [Pavel Dobryakov Fluid Sim](https://codepen.io/PavelDoGreat/pen/zdWzEL)
- [Blog post with good resources](https://softologyblog.wordpress.com/2019/02/28/jos-stams-fluid-simulations-in-3d/)
- [Daniel Shiffman Fluid Sim video](https://www.youtube.com/watch?v=alhpH6ECFvQ&feature=emb_title)
- [Jos Stam Paper](http://graphics.cs.cmu.edu/nsp/course/15-464/Fall09/papers/StamFluidforGames.pdf)
