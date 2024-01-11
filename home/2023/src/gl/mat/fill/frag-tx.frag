precision highp float;

varying vec3 v_normal;
varying vec2 v_uv;

uniform sampler2D u_t1;
uniform float u_a_op;
// uniform float alt;

uniform float u_a_in;




void main() {
  vec4 t1 = texture2D(u_t1, v_uv);
  t1.rgb *= t1.a;


  gl_FragColor.rgb = t1.rgb;
  gl_FragColor.a = t1.a;
  gl_FragColor.a *= u_a_op;


}
