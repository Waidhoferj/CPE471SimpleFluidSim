#version 300 es
precision highp float;

in vec2 vUv
uniform sampler2D uTexture;
uniform vec2 mousePos;

out vec4 outColor;

void main() {
    outColor = texture(uTexture, vUv) * vec4(1.0);
}