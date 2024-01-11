#define MPI 3.1415926538
#define MTAU 6.28318530718

attribute vec3 position;
// attribute vec3 normal;
attribute vec2 uv;
attribute float a_offset;
attribute float a_rand;
attribute float a_rot;

uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
uniform mat3 normalMatrix;

uniform float u_time;

varying vec3 v_normal;
varying vec2 v_uv;
varying float v_offset;
varying float v_rand;

// mat4 rotationMatrix(vec3 axis, float angle) {
//     axis = normalize(axis);
//     float s = sin(angle);
//     float c = cos(angle);
//     float oc = 1.0 - c;
    
//     return mat4(oc * axis.x * axis.x + c,           oc * axis.x * axis.y - axis.z * s,  oc * axis.z * axis.x + axis.y * s,  0.0,
//                 oc * axis.x * axis.y + axis.z * s,  oc * axis.y * axis.y + c,           oc * axis.y * axis.z - axis.x * s,  0.0,
//                 oc * axis.z * axis.x - axis.y * s,  oc * axis.y * axis.z + axis.x * s,  oc * axis.z * axis.z + c,           0.0,
//                 0.0,                                0.0,                                0.0,                                1.0);
// }

// vec3 rotate(vec3 v, vec3 axis, float angle) {
// 	mat4 m = rotationMatrix(axis, angle);
// 	return (m * vec4(v, 1.0)).xyz;
// }


void main() {
  vec3 pos = position;
  pos.x += a_offset * .4 - .2;


  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);

  v_uv = uv;
  v_offset = a_offset;
  v_rand = a_rand;
}
