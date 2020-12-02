#version 300 es
precision highp float;
precision highp sampler2D;

in vec2 vUv;
uniform vec4 fluidColor;
uniform sampler2D uDensity;

out vec4 outColor;

void main() {
    float density = texture(uDensity, vUv).r;
    outColor = vec4(density) * fluidColor;
}