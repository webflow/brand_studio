precision highp float;

varying vec3 v_normal;
varying vec2 v_uv;

uniform sampler2D u_bg;

uniform float u_a_in;
// uniform float u_a_col;
uniform vec2 u_res;

uniform vec3 u_col1;
uniform vec3 u_col2;
uniform vec3 u_col_1a;
uniform vec3 u_col_2a;
uniform float u_a_col;
uniform float u_col_ctrl;

void main() {

  vec4 mask = texture2D(u_bg, v_uv);

  vec3 col1 = mix(u_col1, u_col_1a, u_col_ctrl);
  vec3 col2 = mix(u_col2, u_col_2a, u_col_ctrl);
  vec3 col = mix(col2, col1, mask.r);


  gl_FragColor.rgb = col.rgb;  
  // gl_FragColor.rgb = mask.rrr;  
  gl_FragColor.a = 1.;


}
