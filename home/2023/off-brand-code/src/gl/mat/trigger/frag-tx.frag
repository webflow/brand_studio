precision highp float;

varying vec3 v_normal;
varying vec2 v_uv;

uniform sampler2D u_t1;
uniform sampler2D u_mask;
uniform float u_a_op;
// uniform float alt;

uniform float u_a_in;
uniform float u_time;


varying vec4 v_ctrl;

float easeInCirc(float x) {
  return 1. - sqrt(1. - pow(x, 2.));
}

float easeOutSine(float x) {
  return sin((x * 3.14) / 2.);
}

float easeInQuart(float x) {
  return x * x * x * x;
}


const vec3 COL = vec3(0.08235294117647059, 0.43529411764705883, 0.9607843137254902);

void main() {
  
  float mask = texture2D(u_mask, v_uv).r;
  vec4 t1 = texture2D(u_t1, v_uv);
  t1.rgb *= t1.a;


  // float time = abs(mod((-u_time + v_ctrl.y) * .02, 1.));
  float time = mod(u_time * .04 + v_ctrl.y, 1.);
  // time = easeOutSine(time);
  time = easeInQuart(time);
  
  float bsize = .08;
  float boff = .05;
  
  vec2 bl = smoothstep(v_uv, v_uv - bsize, vec2(time));
  float pct = bl.x * bl.y;
  vec2 tr = smoothstep(1.0-v_uv, 1.0-v_uv - bsize, vec2(time));
  pct *= tr.x * tr.y;
  vec3 square = vec3(pct);

  bl = smoothstep(v_uv, v_uv - bsize, vec2(time + boff));
  pct = bl.x * bl.y;
  tr = smoothstep(1.0-v_uv, 1.0-v_uv - bsize, vec2(time + boff));
  pct *= tr.x * tr.y;

  square -= vec3(pct);
  square *= mask * (time * 8.);

  vec3 color = mix(vec3(0.), COL, square.r); 

  // time = smoothstep(0., .5, time);

  if (v_ctrl.x == 1.0) {
    gl_FragColor.rgb = color;
    gl_FragColor.a = square.r;
    // gl_FragColor.a *= smoothstep(.9, .5, time);
  } else {
    gl_FragColor.rgb = t1.rgb;
    // gl_FragColor.rgb = vec3(time);
    gl_FragColor.a = t1.a;
    gl_FragColor.a *= u_a_op;
  }


  // gl_FragColor.rgb = vec3(1., 0., 0.);
  // gl_FragColor.a = 1.0;
}
