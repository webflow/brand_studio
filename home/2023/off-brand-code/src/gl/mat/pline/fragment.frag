precision highp float;

varying vec3 v_normal;
varying vec2 v_uv;
varying vec4 v_color;
varying float v_offset;
varying float v_rand;

uniform float u_time;

const float WIDTH = .02;
const vec3 COL_LIGHT = vec3(0.0784313725490196, 0.7411764705882353, 0.9607843137254902);
const vec3 COL_DARK = vec3(0.0784313725490196, 0.43137254901960786, 0.9607843137254902);

float circle(vec2 uv, vec2 center, float radius) {
    return smoothstep(radius + WIDTH, radius, length(uv - center));
}

void main() {

    float h_grad = 
        smoothstep(.1, .5, v_uv.y) -
        smoothstep(.7, .9, v_uv.y);

    float v_grad = 
        smoothstep(0.5 - WIDTH, .5, v_uv.x) - 
        smoothstep(.5, .5 + WIDTH, v_uv.x);

    float circ = circle(
        vec2(v_uv.x, v_uv.y * .3), 
        vec2(.5, mod(
            // .1,
            -u_time * 1.2 * (v_rand * 3. + 1.), 
            1.
        )), 
        WIDTH * .2
    );

    vec3 circ_col = mix(
        COL_LIGHT, COL_DARK,
        circ
    );


    vec3 final = mix(
        vec3(.2) * v_grad,
        circ_col,
        circ  
    );

    gl_FragColor.rgb = vec3(final) * h_grad;
    gl_FragColor.a = h_grad - (1. - v_grad);
    
    // gl_FragColor.rgb = vec3(1, 0, 0);
    // gl_FragColor.a = 1.;
}
