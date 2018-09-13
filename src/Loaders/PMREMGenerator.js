/**
 * @author Prashant Sharma / spidersharma03
 * @author Ben Houston / bhouston, https://clara.io
 *
 * To avoid cube map seams, I create an extra pixel around each face. This way when the cube map is
 * sampled by an application later(with a little care by sampling the centre of the texel), the extra 1 border
 *	of pixels makes sure that there is no seams artifacts present. This works perfectly for cubeUV format as
 *	well where the 6 faces can be arranged in any manner whatsoever.
 * Code in the beginning of fragment shader's main function does this job for a given resolution.
 *	Run Scene_PMREM_Test.html in the examples directory to see the sampling from the cube lods generated
 *	by this class.
 */

import * as THREE from 'three';

class PMREMGenerator {

  // sourceTexture:any;
  // resolution: any;
  // samplesPerLevel: any;
  // cubeLods: any;
  // numLods: any;
  // defaultCamera: any;
  // shader: any;
  // planeMesh: any;
  // scene: any;

  constructor(sourceTexture, samplesPerLevel = undefined, resolution = undefined) {

    this.sourceTexture = sourceTexture;
    this.resolution = ( resolution !== undefined ) ? resolution : 256; // NODE: 256 is currently hard coded in the glsl code for performance reasons
    this.samplesPerLevel = ( samplesPerLevel !== undefined ) ? samplesPerLevel : 16;

    let monotonicEncoding = ( sourceTexture.encoding === THREE.LinearEncoding ) ||
      ( sourceTexture.encoding === THREE.GammaEncoding ) || ( sourceTexture.encoding === THREE.sRGBEncoding );

    this.sourceTexture.minFilter = ( monotonicEncoding ) ? THREE.LinearFilter : THREE.NearestFilter;
    this.sourceTexture.magFilter = ( monotonicEncoding ) ? THREE.LinearFilter : THREE.NearestFilter;
    this.sourceTexture.generateMipmaps = this.sourceTexture.generateMipmaps && monotonicEncoding;

    this.cubeLods = [];

    let size = this.resolution;
    let params = {
      format: this.sourceTexture.format,
      magFilter: this.sourceTexture.magFilter,
      minFilter: this.sourceTexture.minFilter,
      type: this.sourceTexture.type,
      generateMipmaps: this.sourceTexture.generateMipmaps,
      anisotropy: this.sourceTexture.anisotropy,
      encoding: this.sourceTexture.encoding
    };

    // how many LODs fit in the given CubeUV Texture.
    this.numLods = Math.log( size ) / Math.log( 2 ) - 2;  // IE11 doesn't support Math.log2

    for ( let i = 0; i < this.numLods; i ++ ) {

      let renderTarget = new THREE.WebGLRenderTargetCube( size, size, params );
      renderTarget.texture.name = "PMREMGenerator.cube" + i;
      this.cubeLods.push( renderTarget );
      size = Math.max( 16, size / 2 );

    }

    this.camera = new THREE.OrthographicCamera( - 1, 1, 1, - 1, 0.0, 1000 );

    this.shader = this.getShader();
    this.shader.defines['SAMPLES_PER_LEVEL'] = this.samplesPerLevel;
    this.planeMesh = new THREE.Mesh( new THREE.PlaneGeometry( 2, 2, 0 ), this.shader );
    this.planeMesh.material.side = THREE.DoubleSide;
    this.scene = new THREE.Scene();
    this.scene.add( this.planeMesh );
    this.scene.add( this.camera );

    this.shader.uniforms[ 'envMap' ].value = this.sourceTexture;
    this.shader.envMap = this.sourceTexture;

  }

  update( renderer ) {

    this.shader.uniforms[ 'envMap' ].value = this.sourceTexture;
    this.shader.envMap = this.sourceTexture;

    let gammaInput = renderer.gammaInput;
    let gammaOutput = renderer.gammaOutput;
    let toneMapping = renderer.toneMapping;
    let toneMappingExposure = renderer.toneMappingExposure;

    renderer.toneMapping = THREE.LinearToneMapping;
    renderer.toneMappingExposure = 1.0;
    renderer.gammaInput = false;
    renderer.gammaOutput = false;

    for ( let i = 0; i < this.numLods; i ++ ) {

      let r = i / ( this.numLods - 1 );
      this.shader.uniforms[ 'roughness' ].value = r * 0.9; // see comment above, pragmatic choice
      this.shader.uniforms[ 'queryScale' ].value.x = ( i == 0 ) ? -1 : 1;
      let size = this.cubeLods[ i ].width;
      this.shader.uniforms[ 'mapSize' ].value = size;
      this.renderToCubeMapTarget( renderer, this.cubeLods[ i ] );

      if ( i < 5 ) this.shader.uniforms[ 'envMap' ].value = this.cubeLods[ i ].texture;

    }

    renderer.toneMapping = toneMapping;
    renderer.toneMappingExposure = toneMappingExposure;
    renderer.gammaInput = gammaInput;
    renderer.gammaOutput = gammaOutput;

  }


  renderToCubeMapTargetFace( renderer, renderTarget, faceIndex ) {

    renderTarget.activeCubeFace = faceIndex;
    this.shader.uniforms[ 'faceIndex' ].value = faceIndex;
    renderer.render( this.scene, this.camera, renderTarget, true );

  }


  renderToCubeMapTarget( renderer, renderTarget ) {

    for ( let i = 0; i < 6; i ++ ) {

      this.renderToCubeMapTargetFace( renderer, renderTarget, i )

    }

  }

  getShader() {

    return new THREE.ShaderMaterial( {

      defines: {
        "SAMPLES_PER_LEVEL": 20,
      },

      uniforms: {
        "faceIndex": { value: 0 },
        "roughness": { value: 0.5 },
        "mapSize": { value: 0.5 },
        "envMap": { value: null },
        "queryScale": { value: new THREE.Vector3( 1, 1, 1 ) },
        "testColor": { value: new THREE.Vector3( 1, 1, 1 ) },
      },

      vertexShader:
        "varying vec2 vUv;\n\
        void main() {\n\
          vUv = uv;\n\
          gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );\n\
        }",

      fragmentShader:
        "#include <common>\n\
        varying vec2 vUv;\n\
        uniform int faceIndex;\n\
        uniform float roughness;\n\
        uniform samplerCube envMap;\n\
        uniform float mapSize;\n\
        uniform vec3 testColor;\n\
        uniform vec3 queryScale;\n\
        \n\
        float GGXRoughnessToBlinnExponent( const in float ggxRoughness ) {\n\
          float a = ggxRoughness + 0.0001;\n\
          a *= a;\n\
          return ( 2.0 / a - 2.0 );\n\
        }\n\
        vec3 ImportanceSamplePhong(vec2 uv, mat3 vecSpace, float specPow) {\n\
          float phi = uv.y * 2.0 * PI;\n\
          float cosTheta = pow(1.0 - uv.x, 1.0 / (specPow + 1.0));\n\
          float sinTheta = sqrt(1.0 - cosTheta * cosTheta);\n\
          vec3 sampleDir = vec3(cos(phi) * sinTheta, sin(phi) * sinTheta, cosTheta);\n\
          return vecSpace * sampleDir;\n\
        }\n\
        vec3 ImportanceSampleGGX( vec2 uv, mat3 vecSpace, float Roughness )\n\
        {\n\
          float a = Roughness * Roughness;\n\
          float Phi = 2.0 * PI * uv.x;\n\
          float CosTheta = sqrt( (1.0 - uv.y) / ( 1.0 + (a*a - 1.0) * uv.y ) );\n\
          float SinTheta = sqrt( 1.0 - CosTheta * CosTheta );\n\
          return vecSpace * vec3(SinTheta * cos( Phi ), SinTheta * sin( Phi ), CosTheta);\n\
        }\n\
        mat3 matrixFromVector(vec3 n) {\n\
          float a = 1.0 / (1.0 + n.z);\n\
          float b = -n.x * n.y * a;\n\
          vec3 b1 = vec3(1.0 - n.x * n.x * a, b, -n.x);\n\
          vec3 b2 = vec3(b, 1.0 - n.y * n.y * a, -n.y);\n\
          return mat3(b1, b2, n);\n\
        }\n\
        \n\
        vec4 testColorMap(float Roughness) {\n\
          vec4 color;\n\
          if(faceIndex == 0)\n\
            color = vec4(1.0,0.0,0.0,1.0);\n\
          else if(faceIndex == 1)\n\
            color = vec4(0.0,1.0,0.0,1.0);\n\
          else if(faceIndex == 2)\n\
            color = vec4(0.0,0.0,1.0,1.0);\n\
          else if(faceIndex == 3)\n\
            color = vec4(1.0,1.0,0.0,1.0);\n\
          else if(faceIndex == 4)\n\
            color = vec4(0.0,1.0,1.0,1.0);\n\
          else\n\
            color = vec4(1.0,0.0,1.0,1.0);\n\
          color *= ( 1.0 - Roughness );\n\
          return color;\n\
        }\n\
        void main() {\n\
          vec3 sampleDirection;\n\
          vec2 uv = vUv*2.0 - 1.0;\n\
          float offset = -1.0/mapSize;\n\
          const float a = -1.0;\n\
          const float b = 1.0;\n\
          float c = -1.0 + offset;\n\
          float d = 1.0 - offset;\n\
          float bminusa = b - a;\n\
          uv.x = (uv.x - a)/bminusa * d - (uv.x - b)/bminusa * c;\n\
          uv.y = (uv.y - a)/bminusa * d - (uv.y - b)/bminusa * c;\n\
          if (faceIndex==0) {\n\
            sampleDirection = vec3(1.0, -uv.y, -uv.x);\n\
          } else if (faceIndex==1) {\n\
            sampleDirection = vec3(-1.0, -uv.y, uv.x);\n\
          } else if (faceIndex==2) {\n\
            sampleDirection = vec3(uv.x, 1.0, uv.y);\n\
          } else if (faceIndex==3) {\n\
            sampleDirection = vec3(uv.x, -1.0, -uv.y);\n\
          } else if (faceIndex==4) {\n\
            sampleDirection = vec3(uv.x, -uv.y, 1.0);\n\
          } else {\n\
            sampleDirection = vec3(-uv.x, -uv.y, -1.0);\n\
          }\n\
          mat3 vecSpace = matrixFromVector(normalize(sampleDirection * queryScale));\n\
          vec3 rgbColor = vec3(0.0);\n\
          const int NumSamples = SAMPLES_PER_LEVEL;\n\
          vec3 vect;\n\
          float weight = 0.0;\n\
          for( int i = 0; i < NumSamples; i ++ ) {\n\
            float sini = sin(float(i));\n\
            float cosi = cos(float(i));\n\
            float r = rand(vec2(sini, cosi));\n\
            vect = ImportanceSampleGGX(vec2(float(i) / float(NumSamples), r), vecSpace, roughness);\n\
            float dotProd = dot(vect, normalize(sampleDirection));\n\
            weight += dotProd;\n\
            vec3 color = envMapTexelToLinear(textureCube(envMap,vect)).rgb;\n\
            rgbColor.rgb += color;\n\
          }\n\
          rgbColor /= float(NumSamples);\n\
          //rgbColor = testColorMap( roughness ).rgb;\n\
          gl_FragColor = linearToOutputTexel( vec4( rgbColor, 1.0 ) );\n\
        }",
      blending: THREE.CustomBlending,
      blendSrc: THREE.OneFactor,
      blendDst: THREE.ZeroFactor,
      blendSrcAlpha: THREE.OneFactor,
      blendDstAlpha: THREE.ZeroFactor,
      blendEquation: THREE.AddEquation
    } );

  }
}

export default PMREMGenerator;