export const brightnessContrastShader = {
    name: 'brightnessContrast',
    fs: `
    uniform float brightness;
    uniform float contrast;
    uniform float saturation;
    
    vec3 adjustSaturation(vec3 color, float saturation) {
      const vec3 lum = vec3(0.2125, 0.7154, 0.0721);
      vec3 gray = vec3(dot(lum, color));
      return mix(gray, color, 1.0 + saturation);
    }

    vec4 brightnessContrast(vec4 color, vec2 texSize, vec2 texCoord) {
      vec3 c = color.rgb;
      
      // Brightness (additive)
      c += brightness;
      
      // Contrast (multiplicative)
      c = (c - 0.5) * (1.0 + contrast) + 0.5;
      
      // Saturation
      c = adjustSaturation(c, saturation);
      
      return vec4(c, color.a);
    }
  `,
    inject: {
        'fs:DECKGL_FILTER_COLOR': 'color = brightnessContrast(color, texSize, texCoord);'
    },
    uniforms: {
        brightness: { value: 0, min: -1, max: 1 },
        contrast: { value: 0, min: -1, max: 1 },
        saturation: { value: 0, min: -1, max: 1 }
    }
};
