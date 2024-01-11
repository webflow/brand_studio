#define MPI 3.1415926538
#define MTAU 6.28318530718

attribute vec3 position;
attribute vec3 normal;
attribute vec2 uv;

uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
uniform mat3 normalMatrix;

uniform float u_time;

varying vec3 v_normal;
varying vec2 v_uv;

// animations
uniform float u_a_publish;


void main() {
  vec3 pos = position;
  float loop = sin(MPI * u_a_publish);

  pos.xy *= 1. + loop * .01;
  pos.z -= u_a_publish * .2;

  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);

  v_normal = normalize(normalMatrix * normal);
  v_uv = uv;
}
