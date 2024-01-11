precision highp float;

varying vec3 v_normal;
varying vec2 v_uv;

uniform sampler2D u_bg;
uniform sampler2D u_bg2;

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

  vec4 bg = texture2D(u_bg, v_uv);
  vec4 mask = texture2D(u_bg2, v_uv);

  
  
  vec3 col = mix(u_col1, bg.rgb, mask.r);


  gl_FragColor.rgb = col.rgb;  
  // gl_FragColor.rgb = mask.rrr;  
  gl_FragColor.a = 1.;


}
