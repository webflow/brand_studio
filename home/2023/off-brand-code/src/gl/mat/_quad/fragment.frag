precision highp float;

varying vec3 v_normal;
varying vec2 v_uv;
uniform sampler2D u_t1;



void main() {
  vec4 t1 = texture2D(u_t1, v_uv);


  gl_FragColor.rgb = vec3(v_uv, 0.0);
  gl_FragColor.a = 1.0;

  // gl_FragColor.rgb = vec3(v_uv, 0.0);
  // gl_FragColor.a = 1.0;
}
