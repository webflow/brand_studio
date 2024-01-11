precision highp float;

varying vec3 v_normal;
varying vec2 v_uv;
varying vec4 v_color;

uniform sampler2D u_t1;
uniform sampler2D u_mtc;

varying vec3 v_view;

uniform vec3 u_col;
uniform vec3 u_col2;
uniform float u_a_col;

void main() {
    vec4 t1 = texture2D(u_t1, v_uv);

    vec3 x = normalize( vec3(v_view.z, 0., -v_view.x));
    vec3 y = cross(v_view, x);
    vec2 fakeUv = vec2( dot(x, v_normal), dot(y, v_normal)) * .495 + .5;
    vec4 mtc = texture2D(u_mtc, fakeUv).rrra;

    float ptl = dot(normalize(vec3(1., 1., 1.)), v_normal);

    vec3 COLOR = mix(u_col, u_col2, u_a_col);
    
    // t1.rgb = (t1.rgb * 1.3) + (mtc.rgb * .2);
    // vec3 final = COLOR;
    vec3 final = mix(t1.rrr * t1.a, COLOR, t1.r * t1.a);
    final *= .3 + .7 * mtc.r;

    // final = mix(final, t1.rgb * t1.a, t1.r * t1.a);

    gl_FragColor.rgb = final.rgb;
    // gl_FragColor.rgb = mtc.rgb;
    gl_FragColor.a = 1.0;
}
