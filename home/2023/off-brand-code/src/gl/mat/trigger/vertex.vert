#define MPI 3.1415926538
#define MTAU 6.28318530718

attribute vec3 position;
attribute vec3 normal;
attribute vec2 uv;

attribute vec4 a_ctrl;
varying vec4 v_ctrl;

uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
uniform mat3 normalMatrix;

uniform float u_time;
uniform float u_a_in;

// varying vec3 v_normal;
varying vec2 v_uv;



void main() {
  v_ctrl = a_ctrl;

  vec3 pos = position;

  // animation
  pos.z -= a_ctrl.x * .01;
  pos.y -= (1. - u_a_in) *.2;
  pos.xy *= u_a_in;


  
  // pos.xy *= (sin(u_time) * .2 ) 1. * a_ctrl.x;




  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);

  // v_normal = normalize(normalMatrix * normal);
  v_uv = uv;
}
