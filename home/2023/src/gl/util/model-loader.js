import { GLTFLoader } from "ogl";

export async function loadModel(gl, path) {
  const scene = GLTFLoader.load(gl, path);
  return scene;
}

export async function loadGeometry(gl, path) {
  return new Promise((resolve) => {
    GLTFLoader.load(gl, path).then((data) => {
      resolve(data.meshes[0].primitives[0].geometry);
    });
  });
}
