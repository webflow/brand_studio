#define MPI 3.1415926538
#define MTAU 6.28318530718

attribute vec2 uv;
attribute vec2 position;
varying vec2 v_uv;

void main() {
  vec2 pos = position;

  gl_Position = vec4(pos, 0, 1);
  v_uv = uv;
}
