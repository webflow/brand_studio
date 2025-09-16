window.addEventListener("load", () => {
  const performanceDelay = navigator.hardwareConcurrency < 4 ? 800 : 500;
  setTimeout(initializeOptimizedShaders, performanceDelay);
});

function initializeOptimizedShaders() {
  if (typeof THREE === "undefined") {
    return;
  }

  // SAFARI DETECTION (iOS + macOS + Windows)
  const isIOS =
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

  const isSafari =
    /^((?!chrome|android|crios|fxios|edgios).)*safari/i.test(
      navigator.userAgent
    ) || isIOS;

  const isWebKitSafari =
    !!(window.safari && window.safari.pushNotification) ||
    /constructor/i.test(window.HTMLElement) ||
    isIOS;

  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  function parseColorValue(colorString, element) {
    if (!colorString) return null;

    if (colorString.startsWith("var(")) {
      const match = colorString.match(
        /var\(\s*(--[^,\)]+)\s*(?:,\s*([^)]+))?\s*\)/
      );
      if (match) {
        const originalVarName = match[1];
        const fallback = match[2];
        const rootStyle = getComputedStyle(document.documentElement);
        let resolvedValue = rootStyle.getPropertyValue(originalVarName).trim();

        if (!resolvedValue) {
          const baseName = originalVarName.replace("--", "");
          const variations = [
            `--${baseName}`,
            `--${baseName.replace(/--/g, "-")}`,
            `--${baseName.toLowerCase()}`,
            `--${baseName.replace(/([A-Z])/g, "-$1").toLowerCase()}`,
            `--${baseName.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase()}`,
            `--${baseName.replace(/-/g, "").toLowerCase()}`,
            `--${baseName.replace(/([A-Z])/g, (letter) =>
              letter.toLowerCase()
            )}`,
          ];

          for (const variation of variations) {
            resolvedValue = rootStyle.getPropertyValue(variation).trim();
            if (resolvedValue) break;
          }
        }

        if (resolvedValue) return resolvedValue;
        else if (fallback) return fallback.trim();
      }
      return null;
    }

    return colorString;
  }

  const perfConfig = {
    maxInstances: 8,
    isMobile: /Mobi/i.test(navigator.userAgent),
    resolutionScale: 0.75,
    renderBudget: 40,
    targetFPS: 30,
  };

  let instanceCount = 0;
  const activeInstances = new Set();
  let lastGlobalTime = 0;
  let frameStartTime = 0;
  let renderBudgetExceeded = false;

  function globalAnimate(currentTime) {
    requestAnimationFrame(globalAnimate);
    if (currentTime - lastGlobalTime < 33) return;
    frameStartTime = performance.now();
    renderBudgetExceeded = false;
    let renderedCount = 0;
    for (const instance of activeInstances) {
      if (renderBudgetExceeded) break;
      instance.update(currentTime);
      renderedCount++;
      if (performance.now() - frameStartTime > perfConfig.renderBudget) {
        renderBudgetExceeded = true;
        break;
      }
    }
    lastGlobalTime = currentTime;
  }
  requestAnimationFrame(globalAnimate);

  function generateColumnBoundaries(num, variation, seed) {
    const boundaries = [0.0];
    let totalWeight = 0;
    const weights = [];
    for (let i = 0; i < num; i++) {
      seed = (seed * 1664525 + 1013904223) % 4294967296;
      const random = seed / 4294967296;
      weights.push(Math.max(0.1, 1.0 + (random - 0.5) * variation));
      totalWeight += weights[i];
    }
    let pos = 0;
    for (let i = 0; i < weights.length - 1; i++) {
      pos += weights[i] / totalWeight;
      boundaries.push(pos);
    }
    boundaries.push(1.0);
    return boundaries;
  }

  function generateLookupTexture(boundaries, width = 512) {
    const data = new Uint8Array(width * 4);
    let boundaryIndex = 0;
    for (let i = 0; i < width; i++) {
      const u = i / (width - 1);
      while (
        boundaryIndex < boundaries.length - 2 &&
        u >= boundaries[boundaryIndex + 1]
      ) {
        boundaryIndex++;
      }
      data[i * 4] = boundaryIndex;
      data[i * 4 + 3] = 255;
    }
    const texture = new THREE.DataTexture(data, width, 1, THREE.RGBAFormat);
    texture.needsUpdate = true;
    return texture;
  }

  function createFallbackTexture() {
    const size = 256;
    const data = new Uint8Array(size * size * 3);
    for (let i = 0; i < size; i++) {
      for (let j = 0; j < size; j++) {
        const idx = (i * size + j) * 3;
        const x = i / size;
        const y = j / size;
        data[idx] = Math.sin(x * Math.PI) * 255;
        data[idx + 1] = Math.sin(y * Math.PI * 2) * 255;
        data[idx + 2] = Math.sin((x + y) * Math.PI) * 255;
      }
    }
    const texture = new THREE.DataTexture(data, size, size, THREE.RGBFormat);
    texture.needsUpdate = true;
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    return texture;
  }

  async function loadBackgroundTexture(imageUrl) {
    return new Promise((resolve) => {
      if (!imageUrl) {
        resolve({ texture: null, aspect: 1.0 });
        return;
      }
      const testImg = new Image();
      testImg.crossOrigin = "anonymous";
      testImg.onload = function () {
        const imageAspect = this.width / this.height;
        const loader = new THREE.TextureLoader();
        loader.setCrossOrigin("anonymous");
        loader.load(
          imageUrl,
          (texture) => {
            texture.wrapS = THREE.ClampToEdgeWrapping;
            texture.wrapT = THREE.ClampToEdgeWrapping;
            texture.minFilter = THREE.LinearFilter;
            texture.magFilter = THREE.LinearFilter;
            resolve({ texture, aspect: imageAspect });
          },
          undefined,
          () => resolve({ texture: createFallbackTexture(), aspect: 1.0 })
        );
      };
      testImg.onerror = () =>
        resolve({ texture: createFallbackTexture(), aspect: 1.0 });
      testImg.src = imageUrl;
    });
  }

  async function createHeavyBlurTexture(textureData) {
    return new Promise((resolve) => {
      if (!textureData || !textureData.texture) {
        resolve({ texture: null, aspect: 1.0 });
        return;
      }

      const originalTexture = textureData.texture;
      const originalAspect = textureData.aspect;

      // Use manual blur for ALL Safari browsers (iOS + macOS)
      if (!isSafari) {
        try {
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");
          canvas.width = 512;
          canvas.height = 512;

          const tempImg = new Image();
          tempImg.crossOrigin = "anonymous";

          tempImg.onload = function () {
            ctx.filter = "blur(15px)";
            ctx.drawImage(tempImg, 0, 0, canvas.width, canvas.height);

            const loader = new THREE.TextureLoader();
            loader.load(canvas.toDataURL(), (blurredTexture) => {
              blurredTexture.wrapS = THREE.ClampToEdgeWrapping;
              blurredTexture.wrapT = THREE.ClampToEdgeWrapping;
              blurredTexture.minFilter = THREE.LinearFilter;
              blurredTexture.magFilter = THREE.LinearFilter;
              resolve({ texture: blurredTexture, aspect: originalAspect });
            });
          };

          tempImg.onerror = () => {
            resolve({ texture: originalTexture, aspect: originalAspect });
          };

          if (originalTexture.image && originalTexture.image.src) {
            tempImg.src = originalTexture.image.src;
          } else {
            resolve({ texture: originalTexture, aspect: originalAspect });
          }
        } catch (error) {
          resolve({ texture: originalTexture, aspect: originalAspect });
        }
      } else {
        resolve({ texture: originalTexture, aspect: originalAspect });
      }
    });
  }

  async function initShader_StepByStep(container, onComplete) {
    const state = {};
    const runStep = async (step) => {
      try {
        switch (step) {
          case 0:
            instanceCount++;
            state.isLowQuality = perfConfig.isMobile || instanceCount > 2;
            const p = container.getAttribute("data-width-preset") || "minimal";
            const ps = {
              balanced: { c: 5, v: 1.0, d: 0.2 },
              extremes: { c: 4, v: 1.8, d: 0.15 },
              minimal: { c: 3, v: 1.5, d: 0.1 },
              dense: { c: 7, v: 0.8, d: 0.25 },
            };
            const c = ps[p] || ps["balanced"];

            let backgroundImageUrl = null;

            const hiddenImage = container.querySelector(".fluted-glass-image");
            if (
              hiddenImage &&
              hiddenImage.tagName === "IMG" &&
              hiddenImage.src &&
              !hiddenImage.src.includes("placeholder") &&
              !hiddenImage.src.includes("default") &&
              !hiddenImage.src.includes(".svg")
            ) {
              backgroundImageUrl = hiddenImage.src;
            } else {
              backgroundImageUrl =
                container.getAttribute("data-background-image") || null;
            }

            state.settings = {
              columns: parseInt(container.getAttribute("data-columns")) || c.c,
              noise:
                parseFloat(container.getAttribute("data-noise")) ||
                (state.isLowQuality ? 0.015 : 0.035),
              distortion:
                parseFloat(container.getAttribute("data-distortion")) ||
                c.d * 1.5,
              widthVariation:
                parseFloat(container.getAttribute("data-width-variation")) ||
                c.v,
              sensitivityOne:
                parseFloat(container.getAttribute("data-sensitivity-one")) ||
                0.08,
              sensitivityTwo:
                parseFloat(container.getAttribute("data-sensitivity-two")) ||
                0.05,
              sensitivityThree:
                parseFloat(container.getAttribute("data-sensitivity-three")) ||
                0.1,
              hoverIntensity:
                parseFloat(container.getAttribute("data-hover-intensity")) ||
                1.0,
              hoverEnabled: prefersReducedMotion
                ? false
                : container.getAttribute("data-hover") !== "false",
              backgroundImage: backgroundImageUrl,
              backgroundColor: container.getAttribute("data-bg-color") || null,
            };
            const boundaries = generateColumnBoundaries(
              state.settings.columns,
              state.settings.widthVariation,
              parseInt(container.getAttribute("data-seed")) || 1234
            );
            state.lookupTexture = generateLookupTexture(boundaries);

            state.backgroundTextureData = await loadBackgroundTexture(
              state.settings.backgroundImage
            );
            state.blurredBackgroundData = await createHeavyBlurTexture(
              state.backgroundTextureData
            );

            setTimeout(() => runStep(1), 20);
            break;

          case 1:
            state.scene = new THREE.Scene();
            state.camera = new THREE.OrthographicCamera(
              -0.5,
              0.5,
              0.5,
              -0.5,
              -1,
              1
            );
            state.renderer = new THREE.WebGLRenderer({
              alpha: true,
              antialias: false,
              powerPreference: "high-performance",
              precision: "lowp",
              stencil: false,
              depth: false,
              premultipliedAlpha: false,
            });
            state.renderer.setPixelRatio(
              Math.min(window.devicePixelRatio, 1.5)
            );
            const { clientWidth, clientHeight } = container;
            state.renderer.setSize(
              Math.floor(clientWidth * perfConfig.resolutionScale),
              Math.floor(clientHeight * perfConfig.resolutionScale)
            );
            state.renderer.domElement.style.width = "100%";
            state.renderer.domElement.style.height = "100%";
            container.appendChild(state.renderer.domElement);
            setTimeout(() => runStep(2), 20);
            break;

          case 2:
            state.uniforms = {
              u_time: { value: 0.0 },
              u_resolution: {
                value: new THREE.Vector2(
                  container.clientWidth,
                  container.clientHeight
                ),
              },
              u_aspect: {
                value: container.clientWidth / container.clientHeight,
              },
              u_blob1_pos: { value: new THREE.Vector2(0.15, 0.7) },
              u_blob2_pos: { value: new THREE.Vector2(0.5, 0.2) },
              u_blob3_pos: { value: new THREE.Vector2(0.85, 0.6) },
              u_column_lookup: { value: state.lookupTexture },
              u_noise: { value: state.settings.noise },
              u_distortion: { value: state.settings.distortion },
              u_color_one: {
                value: new THREE.Color(
                  parseColorValue(
                    container.getAttribute("data-color-one") || "#5983f8",
                    container
                  ) || "#5983f8"
                ),
              },
              u_size_one: {
                value:
                  parseFloat(container.getAttribute("data-size-one")) || 0.7,
              },
              u_color_two: {
                value: new THREE.Color(
                  parseColorValue(
                    container.getAttribute("data-color-two") || "#c1ff5b",
                    container
                  ) || "#c1ff5b"
                ),
              },
              u_size_two: {
                value:
                  parseFloat(container.getAttribute("data-size-two")) || 0.6,
              },
              u_use_blob_one: {
                value: container.getAttribute("data-use-blob-one") !== "false",
              },
              u_use_blob_two: {
                value: container.getAttribute("data-use-blob-two") !== "false",
              },
              u_use_three_color: {
                value:
                  container.getAttribute("data-use-three-color") === "true",
              },
              u_color_three: {
                value: new THREE.Color(
                  parseColorValue(
                    container.getAttribute("data-color-three") || "#ffff5b",
                    container
                  ) || "#ffff5b"
                ),
              },
              u_size_three: {
                value:
                  parseFloat(container.getAttribute("data-size-three")) || 0.65,
              },
              u_shape_type_one: {
                value:
                  parseInt(container.getAttribute("data-shape-type-one")) || 0,
              },
              u_shape_type_two: {
                value:
                  parseInt(container.getAttribute("data-shape-type-two")) || 0,
              },
              u_shape_type_three: {
                value:
                  parseInt(container.getAttribute("data-shape-type-three")) ||
                  0,
              },
              u_background_texture: {
                value: state.blurredBackgroundData.texture,
              },
              u_has_background: {
                value: state.blurredBackgroundData.texture !== null,
              },
              u_background_aspect: {
                value: state.blurredBackgroundData.aspect,
              },
              u_background_color: {
                value: state.settings.backgroundColor
                  ? new THREE.Color(
                      parseColorValue(
                        state.settings.backgroundColor,
                        container
                      ) || state.settings.backgroundColor
                    )
                  : new THREE.Color(0, 0, 0),
              },
              u_has_bg_color: {
                value:
                  state.settings.backgroundColor !== null &&
                  state.settings.backgroundColor !== "",
              },
              u_is_safari: { value: isSafari },
            };

            state.material = new THREE.ShaderMaterial({
              uniforms: state.uniforms,
              transparent: true,
              precision: "lowp",
              vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
              fragmentShader: `
                          #ifdef GL_ES
                          precision lowp float;
                          #endif

                          uniform vec2 u_resolution;
                          uniform float u_time;
                          uniform float u_aspect;
                          uniform vec2 u_blob1_pos;
                          uniform vec2 u_blob2_pos;
                          uniform vec2 u_blob3_pos;
                          uniform sampler2D u_column_lookup;
                          uniform float u_noise;
                          uniform float u_distortion;
                          uniform bool u_use_blob_one;
                          uniform bool u_use_blob_two;
                          uniform bool u_use_three_color;
                          uniform vec3 u_color_one;
                          uniform float u_size_one;
                          uniform vec3 u_color_two;
                          uniform float u_size_two;
                          uniform vec3 u_color_three;
                          uniform float u_size_three;
                          uniform int u_shape_type_one;
                          uniform int u_shape_type_two;
                          uniform int u_shape_type_three;
                          uniform sampler2D u_background_texture;
                          uniform bool u_has_background;
                          uniform float u_background_aspect;
                          uniform vec3 u_background_color;
                          uniform bool u_has_bg_color;
                          uniform bool u_is_safari;
                          varying vec2 vUv;

                          float random(vec2 st) { 
                              return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5); 
                          } 

                          vec2 random2(vec2 st) { 
                              st = vec2(dot(st,vec2(127.1,311.7)), dot(st,vec2(269.5,183.3))); 
                              return -1.0 + 2.0*fract(sin(st)*43758.5453123); 
                          }

                          float noise(vec2 st) {
                              vec2 i = floor(st);
                              vec2 f = fract(st);
                              vec2 u = f*f*(3.0-2.0*f);
                              return mix(mix(dot(random2(i + vec2(0.0,0.0)), f - vec2(0.0,0.0)),
                                          dot(random2(i + vec2(1.0,0.0)), f - vec2(1.0,0.0)), u.x),
                                      mix(dot(random2(i + vec2(0.0,1.0)), f - vec2(0.0,1.0)),
                                          dot(random2(i + vec2(1.0,1.0)), f - vec2(1.0,1.0)), u.x), u.y);
                          }

                          float noiseBlob(vec2 pos, vec2 center, float size, float time) {
                              vec2 offset = pos - center;
                              float dist = length(offset);
                              
                              float angle = atan(offset.y, offset.x);
                              float edgeNoise = sin(angle * 4.0 + time * 0.8) * 0.06 + 
                                              sin(angle * 7.0 - time * 0.6) * 0.03 +
                                              sin(angle * 11.0 + time * 0.4) * 0.015;
                              
                              float organicRadius = size * (1.0 + edgeNoise);
                              
                              float normalizedDist = dist / organicRadius;
                              if (normalizedDist >= 1.0) return 0.0;
                              
                              float intensity = 1.0 - (normalizedDist * normalizedDist);
                              return intensity * intensity;
                          }

                          float rectangleShape(vec2 pos, vec2 center, float size, float time) {
                              vec2 offset = pos - center;
                              
                              float rotation = time * -0.005; 
                              float cosR = cos(rotation);
                              float sinR = sin(rotation);
                              vec2 rotatedOffset = vec2(
                                  offset.x * cosR - offset.y * sinR,
                                  offset.x * sinR + offset.y * cosR
                              );
                              
                              float animScale = 1.0 + sin(time * 0.5) * 0.005;
                              vec2 rectSize = vec2(size * animScale * 0.7, size * animScale * 0.5);
                              
                              vec2 absOffset = abs(rotatedOffset);
                              vec2 edgeDistance = max(absOffset - rectSize, 0.0);
                              float dist = length(edgeDistance) + max(max(absOffset.x - rectSize.x, absOffset.y - rectSize.y), 0.0);
                              
                              float gradientWidth = size * 0.6;
                              float coreSize = size * 0.3;
                              
                              float intensity;
                              if (dist < coreSize) {
                                  intensity = 1.0;
                              } else {
                                  intensity = 1.0 - smoothstep(coreSize, coreSize + gradientWidth, dist);
                              }
                              
                              return max(0.0, intensity);
                          }

                          float starShape(vec2 pos, vec2 center, float size, float time) {
                              vec2 offset = pos - center;
                              
                              float rotation = time * 0.08;
                              float cosR = cos(rotation);
                              float sinR = sin(rotation);
                              vec2 q = vec2(
                                  offset.x * cosR - offset.y * sinR,
                                  offset.x * sinR + offset.y * cosR
                              );
                              
                              const float segments = 5.0;
                              const float indent = 0.05;
                              const float pi = 3.141592654;
                              
                              float angle = (atan(q.y, q.x) + pi) / (2.0 * pi);
                              float segment = angle * segments;
                              
                              float segmentI = floor(segment);
                              float segmentF = fract(segment);
                              
                              angle = (segmentI + 0.5) / segments;
                              
                              if (segmentF > 0.5) {
                                  angle -= indent;
                              } else {
                                  angle += indent;
                              }
                              
                              angle *= 2.0 * pi;
                              
                              vec2 outline = vec2(cos(angle), sin(angle));
                              float distance = abs(dot(outline, q)) / size;
                              
                              float cornerRadius = 0.35;
                              distance = distance - cornerRadius * (1.0 - distance);
                              
                              float gradientWidth = 0.6;
                              float coreSize = 0.05;
                              
                              float intensity;
                              if (distance < coreSize) {
                                  intensity = 1.0;
                              } else {
                                  intensity = 1.0 - smoothstep(coreSize, coreSize + gradientWidth, distance);
                              }
                              
                              return max(0.0, intensity);
                          }

                          float triangleShape(vec2 pos, vec2 center, float size, float time) {
                              vec2 offset = pos - center;
                              
                              float rotation = time * 0.03;
                              float cosR = cos(rotation);
                              float sinR = sin(rotation);
                              vec2 rotatedOffset = vec2(
                                  offset.x * cosR - offset.y * sinR,
                                  offset.x * sinR + offset.y * cosR
                              );
                              
                              float triangleSize = size;
                              vec2 p = rotatedOffset / triangleSize;
                              
                              const float k = sqrt(3.0);
                              p.x = abs(p.x) - 1.0;
                              p.y = p.y + 1.0/k;
                              if (p.x + k*p.y > 0.0) p = vec2(p.x - k*p.y, -k*p.x - p.y) / 2.0;
                              p.x -= clamp(p.x, -2.0, 0.0);
                              
                              float triangleDist = -length(p) * sign(p.y) * triangleSize;
                              
                              float gradientWidth = size * 0.35;
                              float intensity = 1.0 - smoothstep(-gradientWidth * 0.2, gradientWidth, triangleDist);
                              
                              return max(0.0, intensity * intensity);
                          }

                          float getShapeIntensity(vec2 pos, vec2 center, float size, float time, int shapeType) {
                              if (shapeType == 1) {
                                  return rectangleShape(pos, center, size, time);
                              } else if (shapeType == 2) {
                                  return starShape(pos, center, size, time);
                              } else if (shapeType == 3) {
                                  return triangleShape(pos, center, size, time);
                              } else {
                                  return noiseBlob(pos, center, size, time);
                              }
                          }           

                          void main() { 
                              vec4 d = texture2D(u_column_lookup, vec2(vUv.x, 0.0)); 
                              float i = d.r * 255.0; 
                              float s = sin(i * 12.99) * 43758.5; 
                              float o = (fract(s) - 0.5) * u_distortion; 
                              vec2 distortedUV = vec2(vUv.x + o, vUv.y); 
                              
                              vec3 backgroundColor = vec3(0.0);
                              bool hasAnyBackground = u_has_background || u_has_bg_color;
                              
                              if (u_has_background) {
                                  // Calculate cover-fit UV coordinates
                                  vec2 backgroundUV = vUv;
                                  backgroundUV.x += o * 0.1;
                                  
                                  float containerAspect = u_aspect;
                                  float imageAspect = u_background_aspect;
                                  
                                  vec2 scale = vec2(1.0);
                                  vec2 offset = vec2(0.0);
                                  
                                  if (containerAspect > imageAspect) {
                                      // Container is wider than image - scale by width
                                      scale.y = containerAspect / imageAspect;
                                      offset.y = (1.0 - scale.y) * 0.5;
                                  } else {
                                      // Container is taller than image - scale by height  
                                      scale.x = imageAspect / containerAspect;
                                      offset.x = (1.0 - scale.x) * 0.5;
                                  }
                                  
                                  vec2 coverUV = (backgroundUV - offset) / scale;
                                  vec2 clampedBackgroundUV = clamp(coverUV, vec2(0.0), vec2(1.0));
                                  
                                  if (u_is_safari) {
                                      vec3 blurResult = vec3(0.0);
                                      float blurTotal = 0.0;
                                      vec2 texelSize = vec2(1.0 / 512.0);
                                      
                                      for(float x = -6.0; x <= 6.0; x += 1.0) {
                                          for(float y = -6.0; y <= 6.0; y += 1.0) {
                                              vec2 offset = vec2(x, y) * texelSize * 3.0;
                                              vec2 sampleUV = clampedBackgroundUV + offset;
                                              if(sampleUV.x >= 0.0 && sampleUV.x <= 1.0 && sampleUV.y >= 0.0 && sampleUV.y <= 1.0) {
                                                  blurResult += texture2D(u_background_texture, sampleUV).rgb;
                                                  blurTotal += 1.0;
                                              }
                                          }
                                      }
                                      backgroundColor = (blurResult / blurTotal) * 0.85;
                                  } else {
                                      backgroundColor = texture2D(u_background_texture, clampedBackgroundUV).rgb * 0.85;
                                  }
                              } else if (u_has_bg_color) {
                                  backgroundColor = u_background_color;
                              }

                              vec2 aspectCorrected = vec2(distortedUV.x * u_aspect, distortedUV.y);
                              vec2 blob1Corrected = vec2(u_blob1_pos.x * u_aspect, u_blob1_pos.y);
                              vec2 blob2Corrected = vec2(u_blob2_pos.x * u_aspect, u_blob2_pos.y);
                              vec2 blob3Corrected = vec2(u_blob3_pos.x * u_aspect, u_blob3_pos.y);
                              
                              float mobileScale = u_aspect < 1.0 ? 0.8 : 1.0;

                              float intensity1 = 0.0;
                              if(u_use_blob_one) {
                                  intensity1 = getShapeIntensity(aspectCorrected, blob1Corrected, u_size_one * mobileScale, u_time, u_shape_type_one);
                              }

                              float intensity2 = 0.0;
                              if(u_use_blob_two) {
                                  intensity2 = getShapeIntensity(aspectCorrected, blob2Corrected, u_size_two * mobileScale, u_time + 100.0, u_shape_type_two);
                              }

                              float intensity3 = 0.0;
                              if(u_use_three_color) {
                                  intensity3 = getShapeIntensity(aspectCorrected, blob3Corrected, u_size_three * mobileScale, u_time + 200.0, u_shape_type_three);
                              }
                              
                              float maxIntensity = max(max(intensity1, intensity2), intensity3);
                              
                              if (maxIntensity <= 0.0) {
                                  if (hasAnyBackground) {
                                      vec3 c = backgroundColor; 
                                      float g = (random(vUv * 0.5) - 0.5) * u_noise * 0.08; 
                                      c += g;
                                      gl_FragColor = vec4(c, 1.0);
                                  } else {
                                      gl_FragColor = vec4(0.0, 0.0, 0.0, 0.0);
                                  }
                                  return;
                              }
                              
                              vec3 blendedColor = vec3(0.0);
                              float totalAlpha = 0.0;
                              
                              vec3 currentColor = vec3(0.0);
                              float currentAlpha = 0.0;
                              
                              if (intensity1 > 0.0) {
                                  currentColor = u_color_one;
                                  currentAlpha = intensity1;
                              }
                              
                              if (intensity2 > 0.0) {
                                  float srcAlpha = intensity2;
                                  float dstAlpha = currentAlpha;
                                  float outAlpha = srcAlpha + dstAlpha * (1.0 - srcAlpha);
                                  
                                  if (outAlpha > 0.0) {
                                      currentColor = (u_color_two * srcAlpha + currentColor * dstAlpha * (1.0 - srcAlpha)) / outAlpha;
                                      currentAlpha = outAlpha;
                                  }
                              }
                              
                              if (intensity3 > 0.0) {
                                  float srcAlpha = intensity3;
                                  float dstAlpha = currentAlpha;
                                  float outAlpha = srcAlpha + dstAlpha * (1.0 - srcAlpha);
                                  
                                  if (outAlpha > 0.0) {
                                      currentColor = (u_color_three * srcAlpha + currentColor * dstAlpha * (1.0 - srcAlpha)) / outAlpha;
                                      currentAlpha = outAlpha;
                                  }
                              }
                              
                              blendedColor = currentColor;
                              maxIntensity = currentAlpha;
                              
                              vec3 finalColor;
                              if (hasAnyBackground) {
                                  finalColor = mix(backgroundColor, blendedColor, maxIntensity);
                              } else {
                                  finalColor = blendedColor;
                              }
                              
                              vec3 c = finalColor; 
                              float g = (random(vUv * 0.5) - 0.5) * u_noise * 0.12; 
                              c += g; 
                              
                              float alpha = hasAnyBackground ? 1.0 : maxIntensity;
                              gl_FragColor = vec4(c, alpha);
                          }`,
            });
            state.plane = new THREE.Mesh(
              new THREE.PlaneGeometry(1, 1),
              state.material
            );
            state.scene.add(state.plane);
            setTimeout(() => runStep(3), 20);
            break;

          case 3:
            let resizeTimeout;
            const animState = {
              isVisible: false,
              lastRenderTime: 0,
              isHovering: false,
              timeOffset: Math.random() * Math.PI * 2,
              fadeProgress: 0.0,
            };
            const blobs = {
              b1: new THREE.Vector2(0.15, 0.7),
              b2: new THREE.Vector2(0.5, 0.2),
              b3: new THREE.Vector2(0.85, 0.6),
            };
            const mousePos = new THREE.Vector2(0.5, 0.5);
            const defaultTargets = {
              b1: new THREE.Vector2(0.25, 0.6),
              b2: new THREE.Vector2(0.45, 0.3),
              b3: new THREE.Vector2(0.75, 0.7),
            };

            const originalPositions = {
              b1: new THREE.Vector2(0.15, 0.7),
              b2: new THREE.Vector2(0.5, 0.2),
              b3: new THREE.Vector2(0.85, 0.6),
            };

            const instanceController = {
              update: (time) => {
                if (renderBudgetExceeded) return;
                if (time - animState.lastRenderTime < 33) return;

                if (animState.fadeProgress < 1.0 && animState.isVisible) {
                  animState.fadeProgress = Math.min(
                    1.0,
                    animState.fadeProgress + 0.05
                  );
                  state.renderer.domElement.style.opacity =
                    animState.fadeProgress;
                }

                const timeInSeconds = (time + animState.timeOffset) * 0.0008;

                if (prefersReducedMotion) {
                  defaultTargets.b1.set(0.25, 0.6);
                  defaultTargets.b2.set(0.45, 0.3);
                  defaultTargets.b3.set(0.75, 0.7);
                } else {
                  const slowTime = timeInSeconds * 0.4;
                  const mediumTime = timeInSeconds * 0.6;
                  const fastTime = timeInSeconds * 0.8;

                  defaultTargets.b1.x =
                    0.25 +
                    Math.sin(slowTime * 0.7) * 0.05 +
                    Math.cos(fastTime * 0.3) * 0.03;
                  defaultTargets.b1.y =
                    0.6 +
                    Math.cos(slowTime * 0.9) * 0.04 +
                    Math.sin(mediumTime * 0.5) * 0.02;

                  defaultTargets.b2.x =
                    0.45 +
                    Math.cos(mediumTime * 0.8) * 0.06 +
                    Math.sin(slowTime * 0.4) * 0.0025;
                  defaultTargets.b2.y =
                    0.3 +
                    Math.sin(mediumTime * 0.6) * 0.045 +
                    Math.cos(fastTime * 0.7) * 0.02;

                  defaultTargets.b3.x =
                    0.75 +
                    Math.sin(fastTime * 0.5) * 0.055 +
                    Math.cos(slowTime * 0.8) * 0.03;
                  defaultTargets.b3.y =
                    0.7 +
                    Math.cos(fastTime * 0.4) * 0.04 +
                    Math.sin(slowTime * 0.6) * 0.025;
                }

                if (state.settings.hoverEnabled && animState.isHovering) {
                  const offsetX = (mousePos.x - 0.5) * 2;
                  const offsetY = (mousePos.y - 0.5) * 2;

                  const parallax1X =
                    offsetX *
                    state.settings.sensitivityOne *
                    state.settings.hoverIntensity;
                  const parallax1Y =
                    offsetY *
                    state.settings.sensitivityOne *
                    state.settings.hoverIntensity;

                  const parallax2X =
                    offsetX *
                    -state.settings.sensitivityTwo *
                    state.settings.hoverIntensity;
                  const parallax2Y =
                    offsetY *
                    -state.settings.sensitivityTwo *
                    state.settings.hoverIntensity;

                  const parallax3X =
                    offsetX *
                    state.settings.sensitivityThree *
                    state.settings.hoverIntensity;
                  const parallax3Y =
                    offsetY *
                    state.settings.sensitivityThree *
                    state.settings.hoverIntensity;

                  const targetWithParallax1 = new THREE.Vector2(
                    defaultTargets.b1.x + parallax1X,
                    defaultTargets.b1.y + parallax1Y
                  );

                  const targetWithParallax2 = new THREE.Vector2(
                    defaultTargets.b2.x + parallax2X,
                    defaultTargets.b2.y + parallax2Y
                  );

                  const targetWithParallax3 = new THREE.Vector2(
                    defaultTargets.b3.x + parallax3X,
                    defaultTargets.b3.y + parallax3Y
                  );

                  blobs.b1.lerp(targetWithParallax1, 0.04);
                  blobs.b2.lerp(targetWithParallax2, 0.03);
                  blobs.b3.lerp(targetWithParallax3, 0.02);
                } else {
                  blobs.b1.lerp(defaultTargets.b1, 0.025);
                  blobs.b2.lerp(defaultTargets.b2, 0.022);
                  blobs.b3.lerp(defaultTargets.b3, 0.018);
                }

                state.uniforms.u_blob1_pos.value.copy(blobs.b1);
                state.uniforms.u_blob2_pos.value.copy(blobs.b2);
                state.uniforms.u_blob3_pos.value.copy(blobs.b3);
                state.uniforms.u_time.value = timeInSeconds;
                state.renderer.render(state.scene, state.camera);
                animState.lastRenderTime = time;
              },
              setVisible: (visible) => {
                if (visible && !animState.isVisible) {
                  activeInstances.add(instanceController);
                  animState.fadeProgress = 0.0;
                  state.renderer.domElement.style.opacity = "0";
                } else if (!visible && animState.isVisible) {
                  activeInstances.delete(instanceController);
                }
                animState.isVisible = visible;
              },
            };

            const onMouseMove = (e) => {
              const rect = container.getBoundingClientRect();
              mousePos.x = (e.clientX - rect.left) / rect.width;
              mousePos.y = 1.0 - (e.clientY - rect.top) / rect.height;
            };

            if (state.settings.hoverEnabled) {
              document.addEventListener("mousemove", (e) => {
                if (animState.isHovering) {
                  onMouseMove(e);
                }
              });
              container.addEventListener("mouseenter", () => {
                animState.isHovering = true;
              });
              container.addEventListener("mouseleave", () => {
                animState.isHovering = false;
                mousePos.set(0.5, 0.5);
              });

              setTimeout(() => {
                const rect = container.getBoundingClientRect();
                const detectInitialHover = (e) => {
                  if (
                    e.clientX >= rect.left &&
                    e.clientX <= rect.right &&
                    e.clientY >= rect.top &&
                    e.clientY <= rect.bottom
                  ) {
                    animState.isHovering = true;
                  }
                  document.removeEventListener("mousemove", detectInitialHover);
                };
                document.addEventListener("mousemove", detectInitialHover);
              }, 100);
            }

            window.addEventListener("resize", () => {
              clearTimeout(resizeTimeout);
              resizeTimeout = setTimeout(() => {
                const { clientWidth, clientHeight } = container;
                state.renderer.setSize(clientWidth, clientHeight);
                state.renderer.domElement.style.width = "100%";
                state.renderer.domElement.style.height = "100%";
                state.uniforms.u_resolution.value.set(
                  clientWidth,
                  clientHeight
                );
                state.uniforms.u_aspect.value = clientWidth / clientHeight;
                state.camera.updateProjectionMatrix();
              }, 100);
            });
            onComplete(instanceController);
            break;
        }
      } catch (e) {
        onComplete(null);
      }
    };
    runStep(0);
  }

  const containers = document.querySelectorAll("[data-fluted-glass]");
  if (containers.length === 0) return;
  let initQueue = [];
  let isInitializing = false;

  function processQueue() {
    if (initQueue.length === 0) {
      isInitializing = false;
      return;
    }
    isInitializing = true;
    const containerToInit = initQueue.shift();
    initShader_StepByStep(containerToInit, (controller) => {
      if (controller) {
        containerToInit.shaderController = controller;
        const rect = containerToInit.getBoundingClientRect();
        const isVisible =
          rect.top < window.innerHeight + 200 && rect.bottom >= -200;
        controller.setVisible(isVisible);
      }
      setTimeout(processQueue, 200);
    });
  }

  const masterObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        const container = entry.target;

        if (entry.isIntersecting && !container.shaderController) {
          if (!initQueue.includes(container)) {
            initQueue.push(container);
            if (!isInitializing) {
              setTimeout(processQueue, 100);
            }
          }
        }

        if (container.shaderController) {
          container.shaderController.setVisible(entry.isIntersecting);
        }
      });
    },
    { rootMargin: "200px" }
  );

  containers.forEach((container) => masterObserver.observe(container));
}
