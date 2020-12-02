#version 300 es

uniform Texture;


in vec2 vUv;

out vec4 outColor;
void main () {
    outColor = texture(Texture, vUv);
}