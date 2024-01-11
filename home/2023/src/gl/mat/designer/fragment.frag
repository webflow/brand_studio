precision highp float;

varying vec3 v_normal;
varying vec2 v_uv;
uniform sampler2D u_t1;
uniform float u_a_in;



void main() {
  vec4 t1 = texture2D(u_t1, v_uv);

  gl_FragColor.rgb = t1.rgb * (1. - u_a_in * .5);
  // gl_FragColor.rgb = vec3(0., 0., 0.);

  gl_FragColor.a = t1.a;
  // gl_FragColor.a = t1.a;

}
