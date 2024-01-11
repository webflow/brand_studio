precision highp float;

varying vec3 v_normal;
varying vec2 v_uv;

uniform sampler2D u_bg;
uniform sampler2D u_bg2;
uniform float u_a_bgc;

uniform float u_a_in;
uniform float u_a_col;
uniform vec2 u_res;


void main() {

  vec4 bg1 = texture2D(u_bg, v_uv);
  vec4 bg2 = texture2D(u_bg2, v_uv);
  vec3 bg = mix(bg1.rgb, bg2.rgb, u_a_bgc);

  gl_FragColor.rgb = bg.rgb;  
  gl_FragColor.a = 1.;


}
