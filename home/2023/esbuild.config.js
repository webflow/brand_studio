import * as esbuild from "esbuild";
import { glsl } from "esbuild-plugin-glsl";

/* - Setup */
const env = process.env.NODE_ENV;
const production = env === "production";

const CONFIG = {
  PORT: 8000,
  ENTRY: ["src/app.js", "src/index.js"],
  SERVE_DIR: "dist",
  OUT_DIR: "dist/build",
};

/* -- Plugins */
const plugins = [
  glsl({
    minify: production,
  }),
];

const loader = {
  ".png": "dataurl",
  ".webp": "dataurl",
  ".glb": "dataurl",
};

const ctx = await esbuild.context({
  bundle: true,
  entryPoints: CONFIG.ENTRY,
  outdir: CONFIG.OUT_DIR,
  minify: production,
  sourcemap: !production,
  target: production ? "es2019" : "esnext",
  plugins,
  loader,
});

if (production) {
  await ctx.rebuild();
  ctx.dispose();
} else {
  await ctx.watch();
  await ctx
    .serve({
      servedir: CONFIG.SERVE_DIR,
      port: CONFIG.PORT,
    })
    .then(() => {
      console.log("http://localhost:8000/build/app.js");
      console.log("http://localhost:8000/build/index.js");
    });
}
