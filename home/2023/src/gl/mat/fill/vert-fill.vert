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
uniform vec2 a_ctrl;

varying vec2 v_uv;


void main() {
  vec3 pos = position;

  // animation
  if (a_ctrl.x > .5) {
    pos.y -= .5;
    pos.y *= u_a_in;
    pos.y += .5;
  } else {
    // pos.y += .5;
    pos.y *= u_a_in;
    // pos.y -= .5;
  }

  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);

  // v_normal = normalize(normalMatrix * normal);
  v_uv = uv;
}
