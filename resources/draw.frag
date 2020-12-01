#version 300 es
precision highp float;
precision highp sampler2D;

in vec2 vUv;
uniform sampler2D uDensity;

out vec4 outColor;

void main() {
    float density =texture(uDensity, vUv).r / 255.0;
    outColor = vec4(0.3,0.7,0.1, density);
}