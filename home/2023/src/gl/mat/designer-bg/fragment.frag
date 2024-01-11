precision highp float;

varying vec3 v_normal;
varying vec2 v_uv;

const vec3 COLOR = vec3(0.06274509803921569, 0.3215686274509804, 0.7098039215686275);

void main() {
  vec3 col = COLOR;

  float center_grad = 1. - distance(v_uv, vec2(0.5, 0.5));
  center_grad = smoothstep(0.5, 1., center_grad);


  gl_FragColor.rgb = col;
  gl_FragColor.a = center_grad;

}
