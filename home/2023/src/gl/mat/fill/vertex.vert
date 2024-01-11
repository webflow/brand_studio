#define MPI 3.1415926538
#define MTAU 6.28318530718

attribute vec3 position;
attribute vec3 normal;
attribute vec2 uv;

uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
uniform mat3 normalMatrix;

uniform float u_time;
uniform float u_a_in;

// varying vec3 v_normal;
varying vec2 v_uv;



void main() {
  vec3 pos = position;

  // animation
  pos.y -= (1. - u_a_in) *.2;
  pos.xy *= u_a_in;



  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);

  // v_normal = normalize(normalMatrix * normal);
  v_uv = uv;
}
