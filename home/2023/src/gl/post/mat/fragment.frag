precision highp float;

uniform float u_time;
uniform sampler2D u_texture;
varying vec2 v_uv;

void main() {

    vec4 img = texture2D(u_texture, v_uv);

    gl_FragColor.rgb = img.rgb;
    gl_FragColor.a = 1.0;
}
