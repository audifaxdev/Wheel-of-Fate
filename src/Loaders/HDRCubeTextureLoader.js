/**
 * @author Prashant Sharma / spidersharma03
 * @author Ben Houston / http://clara.io / bhouston
 */

import * as THREE from 'three';
import RGBELoader from './RGBELoader';

class HDRCubeTextureLoader {
  // manager: any;
  // hdrLoader: RGBELoader;

  constructor(manager = undefined) {
    this.manager = THREE.DefaultLoadingManager;
    // override in sub classes
    this.hdrLoader = new RGBELoader();
  }

  load( type, urls, onLoad, onProgress = undefined, onError = undefined) {

    let RGBEByteToRGBFloat = function ( sourceArray, sourceOffset, destArray, destOffset ) {

      let e = sourceArray[ sourceOffset + 3 ];
      let scale = Math.pow( 2.0, e - 128.0 ) / 255.0;

      console.log('RGBEByteToRGBFloat', {e, scale});

      destArray[ destOffset + 0 ] = sourceArray[ sourceOffset + 0 ] * scale;
      destArray[ destOffset + 1 ] = sourceArray[ sourceOffset + 1 ] * scale;
      destArray[ destOffset + 2 ] = sourceArray[ sourceOffset + 2 ] * scale;

    };

    let RGBEByteToRGBHalf = ( function () {

      // Source: http://gamedev.stackexchange.com/questions/17326/conversion-of-a-number-from-single-precision-floating-point-representation-to-a/17410#17410

      let floatView = new Float32Array( 1 );
      let int32View = new Int32Array( floatView.buffer );

      /* This method is faster than the OpenEXR implementation (very often
       * used, eg. in Ogre), with the additional benefit of rounding, inspired
       * by James Tursa?s half-precision code. */
      function toHalf( val ) {

        floatView[ 0 ] = val;
        let x = int32View[ 0 ];

        let bits = ( x >> 16 ) & 0x8000; /* Get the sign */
        let m = ( x >> 12 ) & 0x07ff; /* Keep one extra bit for rounding */
        let e = ( x >> 23 ) & 0xff; /* Using int is faster here */

        /* If zero, or denormal, or exponent underflows too much for a denormal
         * half, return signed zero. */
        if ( e < 103 ) return bits;

        /* If NaN, return NaN. If Inf or exponent overflow, return Inf. */
        if ( e > 142 ) {

          bits |= 0x7c00;
          /* If exponent was 0xff and one mantissa bit was set, it means NaN,
               * not Inf, so make sure we set one mantissa bit too. */
          bits |= ( ( e == 255 ) ? 0 : 1 ) && ( x & 0x007fffff );
          return bits;

        }

        /* If exponent underflows but not too much, return a denormal */
        if ( e < 113 ) {

          m |= 0x0800;
          /* Extra rounding may overflow and set mantissa to 0 and exponent
           * to 1, which is OK. */
          bits |= ( m >> ( 114 - e ) ) + ( ( m >> ( 113 - e ) ) & 1 );
          return bits;

        }

        bits |= ( ( e - 112 ) << 10 ) | ( m >> 1 );
        /* Extra rounding. An overflow will set mantissa to 0 and increment
         * the exponent, which is OK. */
        bits += m & 1;
        return bits;

      }

      return function ( sourceArray, sourceOffset, destArray, destOffset ) {

        let e = sourceArray[ sourceOffset + 3 ];
        let scale = Math.pow( 2.0, e - 128.0 ) / 255.0;

        console.log('RGBEByteToRGBHalf', {e, scale});

        destArray[ destOffset + 0 ] = toHalf( sourceArray[ sourceOffset + 0 ] * scale );
        destArray[ destOffset + 1 ] = toHalf( sourceArray[ sourceOffset + 1 ] * scale );
        destArray[ destOffset + 2 ] = toHalf( sourceArray[ sourceOffset + 2 ] * scale );

      };

    } )();

    let texture = new THREE.CubeTexture();

    texture.type = type;
    texture.encoding = ( type === THREE.UnsignedByteType ) ? THREE.RGBEEncoding : THREE.LinearEncoding;
    texture.format = ( type === THREE.UnsignedByteType ) ? THREE.RGBAFormat : THREE.RGBFormat;
    texture.minFilter = ( texture.encoding === THREE.RGBEEncoding ) ? THREE.NearestFilter : THREE.LinearFilter;
    texture.magFilter = ( texture.encoding === THREE.RGBEEncoding ) ? THREE.NearestFilter : THREE.LinearFilter;
    texture.generateMipmaps = ( texture.encoding !== THREE.RGBEEncoding );
    texture.anisotropy = 0;

    console.log('texture', texture);

    let scope = this.hdrLoader;

    let loaded = 0;

    let loadHDRData = ( i, onLoad, onProgress, onError ) => {

      let loader = new THREE.FileLoader( this.manager );
      loader.setResponseType( 'arraybuffer' );
      loader.load( urls[ i ],  ( buffer ) => {

        loaded ++;

        let texData = this.hdrLoader._parser( buffer );

        if ( ! texData ) return;

        if ( type === THREE.FloatType ) {

          console.log('Type', THREE.FloatType);

          let numElements = ( texData.data.length / 4 ) * 3;
          let floatdata = new Float32Array( numElements );

          for ( let j = 0; j < numElements; j ++ ) {

            RGBEByteToRGBFloat( texData.data, j * 4, floatdata, j * 3 );

          }

          texData.data = floatdata;

        } else if ( type === THREE.HalfFloatType ) {

          console.log('Type', THREE.HalfFloatType);

          let numElements = ( texData.data.length / 4 ) * 3;
          let halfdata = new Uint16Array( numElements );

          for ( let j = 0; j < numElements; j ++ ) {

            RGBEByteToRGBHalf( texData.data, j * 4, halfdata, j * 3 );

          }

          texData.data = halfdata;

        }

        if ( undefined !== texData.image ) {

          console.log('Texture.image');

          texture[ i ].images = texData.image;

        } else if ( undefined !== texData.data ) {

          console.log('Texture.image');

          console.log('Texture.data');

          let dataTexture = new THREE.DataTexture( texData.data, texData.width, texData.height );
          dataTexture.format = texture.format;
          dataTexture.type = texture.type;
          dataTexture.encoding = texture.encoding;
          dataTexture.minFilter = texture.minFilter;
          dataTexture.magFilter = texture.magFilter;
          // dataTexture.generateMipmaps = texture.generateMipmaps;

          texture.images[ i ] = dataTexture;

        }

        if ( loaded === 6 ) {

          texture.needsUpdate = true;
          if ( onLoad ) onLoad( texture );

        }

      }, onProgress, onError );

    }

    for ( let i = 0; i < urls.length; i ++ ) {

      loadHDRData( i, onLoad, onProgress, onError );

    }
    return texture;
  };
}

export default HDRCubeTextureLoader;