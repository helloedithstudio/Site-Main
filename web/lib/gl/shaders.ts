// GLSL of the original WebGL layer, extracted verbatim from the production bundle.

// postprocessing BlendFunction.COLOR (BlendMode#getShaderCode)
export const blendColorGlsl =
  "vec4 blend(const in vec4 dst,const in vec4 src,const in float opacity){vec3 a=RGBToHSL(dst.rgb);vec3 b=RGBToHSL(src.rgb);vec3 c=HSLToRGB(vec3(b.xy,a.z));return mix(dst,vec4(c,max(dst.a,src.a)),opacity);}";

export const mapGlsl = `float map(float value, float min1, float max1, float min2, float max2) {
  return min2 + (value - min1) * (max2 - min2) / (max1 - min1);
}`;

export const blendOverlayGlsl = `float blendOverlay(float base, float blend) {
  return base<0.5?(2.0*base*blend):(1.0-2.0*(1.0-base)*(1.0-blend));
}

vec3 blendOverlay(vec3 base, vec3 blend) {
  return vec3(blendOverlay(base.r,blend.r),blendOverlay(base.g,blend.g),blendOverlay(base.b,blend.b));
}

vec3 blendOverlay(vec3 base, vec3 blend, float opacity) {
  return (blendOverlay(base, blend) * opacity + base * (1.0 - opacity));
}`;

export const hslGlsl = `#ifndef EPSILON
  #define EPSILON 1e-10
#endif

vec3 RGBToHCV(const in vec3 RGB) {
	vec4 P = mix(vec4(RGB.bg, -1.0, 2.0 / 3.0), vec4(RGB.gb, 0.0, -1.0 / 3.0), step(RGB.b, RGB.g));
	vec4 Q = mix(vec4(P.xyw, RGB.r), vec4(RGB.r, P.yzx), step(P.x, RGB.r));
	float C = Q.x - min(Q.w, Q.y);
	float H = abs((Q.w - Q.y) / (6.0 * C + EPSILON) + Q.z);
	return vec3(H, C, Q.x);
}

vec3 RGBToHSL(const in vec3 RGB) {
	vec3 HCV = RGBToHCV(RGB);
	float L = HCV.z - HCV.y * 0.5;
	float S = HCV.y / (1.0 - abs(L * 2.0 - 1.0) + EPSILON);
	return vec3(HCV.x, S, L);
}

vec3 HueToRGB(const in float H) {
	float R = abs(H * 6.0 - 3.0) - 1.0;
	float G = 2.0 - abs(H * 6.0 - 2.0);
	float B = 2.0 - abs(H * 6.0 - 4.0);
	return clamp(vec3(R, G, B), 0.0, 1.0);
}

vec3 HSLToRGB(const in vec3 HSL) {
	vec3 RGB = HueToRGB(HSL.x);
	float C = (1.0 - abs(2.0 * HSL.z - 1.0)) * HSL.y;
	return (RGB - 0.5) * C + HSL.z;
}`;

export const coverUvGlsl = `vec2 coverUv(vec2 uv, vec2 size, vec2 resolution) {
    vec2 ratio = vec2(
        min((resolution.x / resolution.y) / (size.x / size.y), 1.0),
        min((resolution.y / resolution.x) / (size.y / size.x), 1.0)
    );

    return vec2(
        uv.x * ratio.x + (1.0 - ratio.x) * 0.5,
        uv.y * ratio.y + (1.0 - ratio.y) * 0.5
    );
}`;

export const scaleFromPointGlsl = `vec2 scaleFromPoint(vec2 uv, float scale, vec2 point) {
    vec2 scaledUV = (uv - point) * scale + point;
    return scaledUV;
}`;

export const saturationGlsl = `vec3 saturation(vec3 rgb, float adjustment) {
  const vec3 W = vec3(0.2125, 0.7154, 0.0721);
  vec3 intensity = vec3(dot(rgb, W));
  return mix(intensity, rgb, adjustment);
}`;

export const blendScreenGlsl = `float blendScreen(float base, float blend) {
  return 1.0-((1.0-base)*(1.0-blend));
}

vec3 blendScreen(vec3 base, vec3 blend) {
  return vec3(blendScreen(base.r,blend.r),blendScreen(base.g,blend.g),blendScreen(base.b,blend.b));
}

vec3 blendScreen(vec3 base, vec3 blend, float opacity) {
  return (blendScreen(base, blend) * opacity + base * (1.0 - opacity));
}`;

export const hallwayVertex = `
  attribute float aProgress;

  uniform vec2 uMouse;
  uniform vec4 uWorldProps;

  varying float vProgress;
  varying vec2 vUv;
  varying vec2 vScreenPos;
  varying vec2 vScreenPosBound;

  void main(){
    vec3 np = position;
    np.x += uMouse.x * 0.07 * pow(aProgress, 2.0);
    np.y += uMouse.y * 0.04 * pow(aProgress, 2.0);

    vec4 wp = modelMatrix * instanceMatrix * vec4(np, 1.0);
    vec4 clip = projectionMatrix * viewMatrix * wp;

    vec4 clipBound = projectionMatrix * viewMatrix * vec4(vec3(0.0, uWorldProps.w * 0.5, 0.0), 1.0);

    gl_Position = clip;

    vScreenPos = clip.xy / clip.w;
    vScreenPosBound = clipBound.xy / clipBound.w;

    vUv = uv;
    vProgress = aProgress;
  }
`;

export const hallwayFragment = `
  uniform float uTime;
  uniform vec2 uMouse;
  uniform vec3 uColorA;
  uniform vec3 uColorB;
  uniform vec3 uColorC;
  uniform vec4 uWorldProps;
  uniform sampler2D uTxt;
  uniform sampler2D uTxtBlur;
  uniform sampler2D uBlueNoiseTxt;

  varying float vProgress;
  varying vec2 vUv;
  varying vec2 vScreenPos;
  varying vec2 vScreenPosBound;

  ${mapGlsl}
  ${blendOverlayGlsl}

  void main(){
    float noise = texture(uBlueNoiseTxt, gl_FragCoord.xy * 0.005).r;

    float enter = smoothstep(0.0, 0.1, vProgress);
    float enterAlpha = smoothstep(0.0, 0.03, vProgress);

    float exit = smoothstep(1.0, 0.9, vProgress);
    float exitAlpha = smoothstep(1.0, 0.97, vProgress);

    vec4 final = texture(uTxt, vUv);
    vec4 finalBlur = texture(uTxtBlur, vUv);
    final = mix(final, finalBlur, smoothstep(0.45, 0.0, vProgress));

    vec2 mouseShift = uMouse * vec2(0.3,0.6);
    float d1 = smoothstep(-0.3 + mouseShift.x, 0.3 + mouseShift.x, vScreenPos.x);
    float d2 = smoothstep(-0.4+ vScreenPosBound.y + mouseShift.y, 0.4+ vScreenPosBound.y + mouseShift.y, vScreenPos.y);

    float mixFactor = sin(d1 * 3.14);
    float mixFactor2 = sin(d2 * 3.14);

    float nf = 1.0 - noise * 0.7;
    vec3 color = mix(uColorA, uColorB, mixFactor) * 2.0 * (nf);
    vec3 color2 =  mix(uColorB, uColorC, mixFactor2) * 2.0 * (nf);

    final.rgb = blendOverlay(final.rgb, color);
    final.rgb *= (1.0 + color);
    final.rgb = blendOverlay(final.rgb, color2, mixFactor2 * 0.45);
    final.rgb *= 3.0;

    final.rgb *= enter;
    final.a *= enterAlpha;

    final.rgb *= exit;
    final.a *= exitAlpha;

    gl_FragColor = final;

    #include <tonemapping_fragment>
	  #include <colorspace_fragment>
  }
`;

export const gradientVertex = `
  varying vec2 vUv;

  void main(){
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);

    vUv = uv;
  }
`;

export const gradientFragment = `
  uniform float uAlpha;
  uniform vec3 uColor;
  uniform sampler2D uTxt;
  uniform sampler2D uBlueNoiseTxt;

  varying vec2 vUv;

  void main(){
    float noise = texture(uBlueNoiseTxt, gl_FragCoord.xy * 0.005).r;

    vec4 final = texture(uTxt, vUv);
    final.rgb *= uColor;
    final.rgb *= 1.0 - noise;

    final.a *= uAlpha;

    gl_FragColor = final;

    #include <tonemapping_fragment>
	  #include <colorspace_fragment>
  }
`;

export const floorVertex = `
  varying vec2 vUv;

  void main(){
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);

    vUv = uv;
  }
`;

export const floorFragment = `
  varying vec2 vUv;

  void main(){
    float alpha = smoothstep(0.0, 0.20, vUv.y);
    gl_FragColor = vec4(0.0, 0.0, 0.0, alpha);

    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

export const embersVertex = `
  attribute vec2 aRandom;
  attribute vec3 aDirection;

  uniform float uThreshold;
  uniform float uSpeed;
  uniform float uSpreadFactor;
  uniform float uSize;
  uniform float uScrollTime;
  uniform float uTime;
  uniform vec3 uResolution;

  varying float vTime;
  varying float vRandom;
  varying float vProgress;

  float fade(float _prog, float _thresholdIn, float _thresholdOut){
    float enter = smoothstep(0.0, _thresholdIn, _prog);
    float exit = smoothstep(1.0, 1.0 - _thresholdOut, _prog);
    return min(enter, exit);
  }

  void main(){
    float time = mod(uTime * (0.1 + 0.35 * aRandom.y) + aRandom.y + uScrollTime, 1.0);
    float timeNoise = time * 2.0;
    float timeFlicker = time * 4.5;

    float faded = fade(time, 0.35, aRandom.x * 0.4);
    float flicker = (sin(timeFlicker * 7.14 + cos(5.0 * timeFlicker) + cos(timeFlicker)) + 1.0) * 0.5;

    vec3 dir = aDirection;
    dir.x += (sin(timeNoise * 7.14 + cos(5.0 * timeNoise)) + cos(timeNoise)) * 0.04;
    dir.y += (sin(timeNoise * 6.14 + cos(10.0 * timeNoise)) + cos(timeNoise)) * 0.04 + 0.8;

    vec3 np = position;
    np += time * normalize(position+dir) * uSpreadFactor;
    np.x *= 0.7;
    np.y += time * 0.35;
    np.z *= 0.7;

    float visibleRandom = step(uThreshold, aRandom.y);

    float pointSize = (uSize * (1.0 + aRandom.x)) * faded * uResolution.z * (1.0 - flicker);
    gl_PointSize = pointSize * clamp(0.0, 1.0, uSpeed + visibleRandom * 0.6);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(np, 1.0);

    vProgress = faded;
    vRandom = aRandom.x;
    vTime = time;
  }
`;

export const embersFragment = `
  uniform float uTime;
  uniform vec3 uColorA;
  uniform vec3 uColorB;
  uniform vec3 uColorC;
  uniform sampler2D uBlueNoiseTxt;

  varying float vTime;
  varying float vRandom;
  varying float vProgress;

  void main(){
    vec2 uv = gl_PointCoord.xy;
    uv.y += vTime * 2.0;
    uv.y = fract(uv.y);
    uv.x = (uv.x - 0.5) * (1.0 + 5.0 * vRandom) + 0.5;
    uv.x += sin(uv.y * 3.14 * (1.2 + 2.0 * vRandom) + 8.0 * vRandom) * 0.2;

    // uv.x *= (1.0 + 5.0 * vRandom);

    float dist = distance(vec2(0.5), uv);
    float d = dist / 0.70;
    float g = smoothstep(1.0, 0.0, d);

    float outer = pow(g, 0.7);
    float mid = pow(g, 1.2);
    float inner = pow(g, 2.0);

    float flicker = sin(uTime * 10.0 + vRandom* 30.0) * 0.5 + 1.0;

    vec3 color;
    if(vRandom < 0.33){
      color = mix(uColorA, uColorB, smoothstep(0.0, 0.33, vRandom));
    } else if(vRandom < 0.66){
      color = mix(uColorB, uColorC, smoothstep(0.33, 0.66, vRandom));
    } else {
      color = mix(uColorC, uColorA, smoothstep(0.66, 1.0, vRandom));
    }

    vec3 edgeCol = color * vec3(0.22, 0.10, 0.04);
    vec3 midCol = color * vec3(1.00, 0.60, 0.22);
    vec3 innerCol = color * vec3(1.35, 1.05, 0.55);

    vec3 col = mix(edgeCol, midCol, mid);
    col = mix(edgeCol, innerCol, inner);
    col *= 1.0 + flicker;
    col *= 0.24;

    float bn = texture(uBlueNoiseTxt, gl_FragCoord.xy * 0.005).r;
    col *= 1.0 - bn * 0.6;

    float alpha = vProgress * (0.06 + 0.40 * outer + 0.70 * inner) * 0.8;
    alpha = clamp(alpha, 0.0, 1.0);
    gl_FragColor = vec4(col, alpha);

    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

export const fullscreenVertex = `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

export const planeVertex = `
  varying vec2 vUv;

  void main(){
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);

    vUv = uv;
  }
`;

export const marbleFragment = `
  uniform float uScrollProgress;
  uniform float uAlpha;
  uniform float uExpand;
  uniform float uDim;
  uniform float vUvScale;
  uniform float uBoostFactor;
  uniform float uBoostReveal;
  uniform float uSaturation;
  uniform vec2 uMouse;
  uniform vec2 uPlane;
  uniform vec3 uTime; // [reveal, boost, elapsed]
  uniform vec3 uResolution;
  uniform vec3 uMouseProps; // [radius, strength, boostFactor]
  uniform sampler2D uTxt;
  uniform sampler2D uTxtLoop;
  uniform sampler2D uGradientTxt;
  uniform sampler2D uTxtMask;
  uniform sampler2D uMaskSelection;
  uniform sampler2D uMaskTime;
  uniform sampler2D uNoiseTxt;

  varying vec2 vUv;

  ${hslGlsl}
  ${blendColorGlsl}
  ${coverUvGlsl}
  ${scaleFromPointGlsl}
  ${saturationGlsl}
  ${blendScreenGlsl}

  float vignette(vec2 _uv, float _threshold){
    float h = min(smoothstep(0.0, _threshold, _uv.x), smoothstep(1.0, 1.0 - _threshold, _uv.x));
    float v = min(smoothstep(0.0, _threshold, _uv.y), smoothstep(1.0, 1.0 - _threshold, _uv.y));
    return pow(min(h,v), 2.0);
  }

  float fadeEdge(float _prog){
    float enter = smoothstep(0.0, 0.1, _prog);
    float exit = smoothstep(1.0, 0.9, _prog);
    return min(enter, exit);
  }

  void main(){
    vec2 nUv = scaleFromPoint(vUv, vUvScale, vec2(0.5));
    vec2 st = gl_FragCoord.xy / (uResolution.xy * uResolution.z);

    nUv = coverUv(nUv, vec2(textureSize(uTxt, 0).xy), uPlane);

    float noise1 = texture(uNoiseTxt, (nUv * 1.4) + vec2(uTime.z * 0.2 * 0.1, 0.0)).r;
    float noise2 = texture(uNoiseTxt, (nUv * 2.4) + vec2(-uTime.z * 0.2 * 0.1, 0.0 )).r;
    float noise = (noise1 + noise2) * 0.5;

    // GRADIENT
    vec3 gradientColor = texture(uGradientTxt, nUv + vec2(-uTime.z* 0.1, -uTime.z* 0.1)).rgb;

    //LOOP
    vec4 loopTexture = texture(uTxtLoop, nUv);
    loopTexture = blend(loopTexture, vec4(gradientColor, 1.0), 1.0);
    loopTexture *= noise;

    // MOUSE
    vec2 fragUv = st;
    vec2 mouseUv = uMouse * 0.5 + 0.5;
    vec2 d = (fragUv - mouseUv);
    d.x *= uResolution.x / uResolution.y;
    // d += vec2(noise * 0.1);
    float mouseDist = length(d) - pow(noise, 3.0) * 0.2;
    float mouseRadius = uMouseProps.x;
    float mouseHardness = 0.00;
    float dd = smoothstep(mouseRadius * mouseHardness, mouseRadius, mouseDist);
    dd = pow(dd, 0.85);
    float mouseCircle = (1.0 - dd) * 2.0 - 1.0;
    mouseCircle = smoothstep(0.0, 1.0, noise + mouseCircle);
    mouseCircle = pow(mouseCircle, 4.0);

    // MARBLE
    vec4 final = texture(uTxt, nUv);
    final = blend(final, vec4(gradientColor, 1.0), 1.0);
    vec4 colorTxt = final;

    float cut = pow(final.r, 0.5);

    float mask = texture(uTxtMask, nUv).r;
    float selection = texture(uMaskSelection, nUv).g;
    float timeShift = texture(uMaskTime, nUv).b;

    float shiftedTimeIntro = uTime.x * 0.3;
    shiftedTimeIntro = clamp(shiftedTimeIntro - timeShift * 1.0 - 0.05, 0.0, 100000.0);

    float mtReveal = mod(shiftedTimeIntro, 1.0);
    float mtBoost = mod(uTime.y * 0.3 + timeShift * 5.0, 1.0);

    // MAIN REVEAL
    float fadeBoost = fadeEdge(mtBoost);
    float fadeReveal = fadeEdge(mtReveal);
    float edge = 0.04;

    float phase = step(0.5, mtReveal); // 0: reveal, 1: hide
    float t = fract(mtReveal * 2.0);   // 0..1 within each phase

    float th = t - edge;
    float reveal = 1.0 - smoothstep(th, th + edge, mask); // 0->1 (L->R)
    float hide = smoothstep(th, th + edge, mask);         // 1->0 (L->R)

    float maskReveal = mix(reveal, hide, phase) * smoothstep(0.0, 0.1, mask);
    float revealEdge = 1.0 - smoothstep(0.0 + mtReveal, 0.03 + mtReveal, mask);
    maskReveal += sin(revealEdge * 3.14) * uBoostReveal * cut * fadeReveal;

    // COLOR BOOST
    float maskBoost = 1.0 - smoothstep(0.0 + mtBoost, 0.03 + mtBoost, mask);
    maskBoost *= selection;
    maskBoost = clamp(maskBoost, 0.0, 1.0);

    float boost = sin(maskBoost * 3.14) * uBoostFactor * cut * fadeBoost;
    final.rgb *= (1.0 + boost);
    final.rgb *= maskReveal;

    // final.rgb = mix(final.rgb, colorTxt.rgb * (1.0 + uMouseProps.z * cut), mouseCircle * uMouseProps.y * clamp(shiftedTimeIntro, 0.0, 1.0));
    final.rgb *= vignette(vUv, 0.1 * (1.0 - uScrollProgress));

    final.rgb = blendScreen(saturation(loopTexture.rgb, uSaturation), final.rgb, 1.0);
    // The blackout is what turns the landed marble into the carousel's box. Grown
    // back out to the section it is a background again, so the texture returns.
    final.rgb = mix(final.rgb, vec3(0.0), uScrollProgress * (1.0 - uExpand));

    final.rgb *= uDim;

    final.a *= uAlpha;

    gl_FragColor = final;

    // DEBUG
    // gl_FragColor = texture(uTxtLoop, nUv);;
    // gl_FragColor = vec4(vec3(1.0, 0.0, 1.0), 1.0);

    #include <tonemapping_fragment>
	  #include <colorspace_fragment>
  }
`;

export const raysFragment = `
  uniform sampler2D uTxt;
  uniform sampler2D uNoise;
  uniform vec2 uMouse;
  uniform float uIntensity;
  uniform float uTime;
  uniform float uOffsetScale;
  uniform float uDecayRate;
  uniform float uMixFactor;
  uniform float uClampMax;

  varying vec2 vUv;

  float screenNoise(vec2 pixCoord){
    const vec3 magic = vec3(0.06711056f, 0.00583715f, 52.9829189f);

    vec2 frameMagicScale = vec2(2.083f, 4.867f);
    pixCoord += float(0.0) * frameMagicScale;

    return fract(magic.z * fract(dot(pixCoord, magic.xy)));
}

  void main(){
      float intensity = uIntensity;
      float offsetScale = uOffsetScale;
      float decayRate = uDecayRate;
      float mixFactor = uMixFactor;
      float clampMax = uClampMax;

      float noise = texture2D(uNoise, (vUv * 0.2) + vec2(uTime * 0.2 * 0.02, 0.0)).r;
      float bn = noise;
      noise = noise * 2.0 - 1.0;

      vec2 mCoord = uMouse * 0.5 + 0.5;
      vec2 centerCoord = mCoord;

      vec2 fragUv = vUv;
      vec2 mouseUv = mCoord;
      vec2 d = (fragUv - mouseUv);
      d.x *= float(textureSize(uTxt, 0).x) / float(textureSize(uTxt, 0).y);
      // d += vec2(noise * 0.1);
      float mouseDist = length(d - noise * 0.1);
      float mouseRadius = 0.35;
      float mouseHardness = 0.2;
      float dd = smoothstep(mouseRadius * mouseHardness, mouseRadius, mouseDist);
      dd = pow(dd, 0.85);
      float mouseCircle = (1.0 - dd) * 2.0 - 1.0;
      mouseCircle = smoothstep(0.0, 1.0, mouseCircle);
      mouseCircle = pow(mouseCircle, 4.0);

      // Initialize variables
      vec4 accumulatedColor = vec4(0.0, 0.0, 0.0, 1.0);
      float currentIntensity = 1.0;
      vec2 currentCoord = vUv;
      vec2 offset = (vUv - centerCoord) * (0.05 * offsetScale);
      vec4 first = texture2D(uTxt, vUv);

      // Perform iterative sampling
      for (int i = 0; i < 20; i++) {
          float stNoise = screenNoise(gl_FragCoord.xy * 3.0);
          currentCoord -= offset + stNoise * 0.00001 + noise * 0.0005;
          vec4 txt = texture2D(uTxt, currentCoord);
          txt.rgb = pow(txt.rgb, vec3(1.45)) * (1.2 - bn * 0.5);
          accumulatedColor += txt * (currentIntensity * mixFactor * mouseCircle);
          currentIntensity *= decayRate;
      }

      accumulatedColor *= intensity;

      // Clamp the final color
      vec4 clampedColor = clamp(accumulatedColor, 0.0, clampMax);
      clampedColor.rgb = mix(clampedColor.rgb, clampedColor.rgb * 0.15, smoothstep(0.0, 0.1, (first.r + first.g + first.b) / 3.0));

      // Set the final fragment color
      gl_FragColor = clampedColor;
  }
`;
