#version 300 es
precision highp float;

uniform sampler2D pillarTexture;

out vec4 outColor;

void main() {
    float alpha = texture(pillarTexture, gl_PointCoord).r;
    outColor = vec4(alpha);
}