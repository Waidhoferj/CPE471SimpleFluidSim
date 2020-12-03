#version 300 es

in vec2 position;


void main() {
    gl_Position = vec4(position.xy, 1.0, 1.0);
	gl_PointSize= 10.0;
}