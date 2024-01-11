import { Texture } from "ogl";

export async function loadTexture(gl, path, calc = false) {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = path;
    img.crossOrigin = "anonymous";

    img.onload = () => {
      const texture = new Texture(gl, {
        image: img,
        generateMipmaps: false,
      });
      // texture.premultiplyAlpha = true;

      if (calc) {
        // texture.s = [img.naturalWidth, img.naturalHeight];
        texture.r = [
          Math.min(img.naturalWidth / img.naturalHeight, 1),
          Math.min(img.naturalHeight / img.naturalWidth, 1),
        ];

        // console.log(texture.r);
      }

      resolve(texture);
    };
  });
}
