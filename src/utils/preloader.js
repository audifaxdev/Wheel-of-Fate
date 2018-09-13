import {
  JSONLoader,
  TextureLoader,
  FontLoader,
  FloatType,
  HalfFloatType,
  ByteType,
  UnsignedByteType
} from 'three';
import GLTFLoader from 'three-gltf-loader';
import FBXLoader from '../loaders/FBXLoader';
import HDRCubeTextureLoader from '../Loaders/HDRCubeTextureLoader';
/**

 ```
 import preloader from './utils/preloader'
 var manifest = [
 {type: 'Texture', url: './assets/images/diffuse.jpg', id: 'diffuseTexture'},
 {type: 'Fbx', url: './assets/models/Samba Dancer.fbx', id: 'sambaDancer'},
 {type: 'JsonModel', url: './assets/models/spaceship.json', id: 'spaceshipModel'}
 {type: 'Font', url: 'https://s3-us-west-2.amazonaws.com/s.cdpn.io/175711/droid_sans_bold.typeface.js', id: 'myFont'}
 ]
 preloader.load(manifest, () => {
    const texture = preloader.getTexture('diffuseTexture')
    const geometry = preloader.getGeometry('spaceshipModel')
    const model = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({map: texture}))
  })
 ```

 */

// interface Asset {
//   type: string;
//   url: string;
//   id: string;
//   isLoaded?: boolean;
//   object3d?: THREE.Geometry;
//   texture?: THREE.Texture;
//   image?: HTMLImageElement;
//   font?: THREE.Font;
// }

class Preloader {

  // jsonLoader: JSONLoader;
  // textureLoader: TextureLoader;
  // fontLoader: FontLoader;
  // isLoaded: boolean;
  // manifest: Asset[];

  constructor () {
    this.hdrCubeLoader = new HDRCubeTextureLoader();
    this.gltfLoader = new GLTFLoader();
    this.fbxLoader = new FBXLoader();
    this.jsonLoader = new JSONLoader();
    this.textureLoader = new TextureLoader();
    this.fontLoader = new FontLoader();
    this.isLoaded = false;
  }

  load (manifest, onComplete) {
    if (!manifest || !manifest.length) return;
    this.manifest = manifest;
    this.start(onComplete);
  }

  start (onComplete) {
    this.getManifestByType('HDRCubeMap').forEach((value) => {
      value.isLoaded = false;
      this.hdrCubeLoader.load(
        UnsignedByteType, value.url, ( hdrCubeMap ) => {
        value.isLoaded = true;
        value.hdrCubeMap = hdrCubeMap;
        if (this.checkManifestCompletion()) {
          onComplete();
        }
      });
    });


    this.getManifestByType('JsonModel').forEach((value) => {
      value.isLoaded = false;
      this.jsonLoader.load(value.url, (object3d) => {
        value.isLoaded = true;
        value.object3d = object3d;
        if (this.checkManifestCompletion()) {
          onComplete();
        }
      });
    });

    this.getManifestByType('GLTF').forEach((value) => {
      value.isLoaded = false;
      this.gltfLoader.load(value.url, (object3d) => {
        value.isLoaded = true;
        value.object3d = object3d;
        if (this.checkManifestCompletion()) {
          onComplete();
        }
      });
    });

    this.getManifestByType('FBX').forEach((value) => {
      value.isLoaded = false;
      this.fbxLoader.load(value.url, (object3d) => {
        value.isLoaded = true;
        value.object3d = object3d;
        if (this.checkManifestCompletion()) {
          onComplete();
        }
      });
    });


    this.getManifestByType('Texture').forEach((value) => {
      value.isLoaded = false;
      this.textureLoader.load(value.url, (texture) => {
        value.isLoaded = true;
        value.texture = texture;
        if (this.checkManifestCompletion()) {
          onComplete();
        }
      });
    });

    this.getManifestByType('Font').forEach((value) => {
      value.isLoaded = false;
      this.fontLoader.load(value.url, (font) => {
        value.isLoaded = true;
        value.font = font;
        if (this.checkManifestCompletion()) {
          onComplete();
        }
      });
    });

    this.getManifestByType('Image').forEach((value) => {
      value.isLoaded = false;
      const img = new Image();
      img.addEventListener('load', () => {
        value.isLoaded = true;
        value.image = img;
        if (this.checkManifestCompletion()) {
          onComplete();
        }
      });
      img.src = value.url;
    });
  }

  getManifestByType (type) {
    return this.manifest.filter(value => value.type === type)
  }

  checkManifestCompletion () {
    for (let i = 0, l = this.manifest.length; i < l; i++) {
      if (!this.manifest[i].isLoaded) return false
    }
    return true
  }

  getHDRCubeMap (id) {
    let item = this.manifest.filter((value) => {
      return value.id === id
    })[0];

    if (item && item.hdrCubeMap) {
      return item.hdrCubeMap;
    }
    return null;
  }


  getObject3d (id) {
    let item = this.manifest.filter((value) => {
      return value.id === id
    })[0];

    if (item && item.object3d) {
      return item.object3d;
    }
    return null;
  }

  getTexture (id) {
    let item = this.manifest.filter((value) => {
      return value.id === id
    })[0];

    if (item && item.texture) {
      return item.texture;
    }
    return null;
  }

  getImage (id) {
    let item = this.manifest.filter((value) => {
      return value.id === id
    })[0];

    if (item && item.image) {
      return item.image;
    }
    return null;
  }

  getFont (id) {
    let item = this.manifest.filter((value) => {
      return value.id === id
    })[0];

    if (item && item.font) {
      return item.font;
    }
    return null;
  }
}

export default new Preloader()