precision highp float;

varying vec3 v_normal;
varying vec2 v_uv;

uniform vec3 u_col1;
uniform vec3 u_col2;
uniform vec3 u_col_1a;
uniform vec3 u_col_2a;
uniform float u_col_ctrl;
uniform vec2 u_colg;
// uniform vec3 u_col2;

// uniform sampler2D u_mask;

uniform float u_a_in;
uniform float u_a_col;


void main() {
  
  float dist = distance(v_uv, u_colg);
  vec3 col = mix(
    mix(u_col1, u_col_1a, u_col_ctrl), 
    mix(u_col2, u_col_2a, u_col_ctrl), 
    dist
  );

  gl_FragColor.rgb = col;
  gl_FragColor.a = 1.0;
}
