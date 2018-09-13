import {
  WebGLRenderer,
  Scene,
  PerspectiveCamera,
  Box3,
  Vector2,
  Vector3,
  AxesHelper,
  MeshStandardMaterial,
  MeshLambertMaterial,
  Mesh,
  SphereGeometry,
  LoopRepeat,
  sRGBEncoding,
  AnimationMixer,
  AnimationAction,
  HemisphereLight,
  AmbientLight,
  DirectionalLight,
  Raycaster,
} from 'three';
import * as THREE from 'three';
import EffectComposer, {
  RenderPass,
  ShaderPass,
  CopyShader
} from 'three-effectcomposer-es6';
import * as CANNON from 'cannon';
import loop from 'raf-loop';
import resize from 'brindille-resize';
import { TimelineMax, Sine } from 'gsap';
import { find, cloneDeep, map, filter, zipObject, shuffle } from "lodash";
import * as dat from 'dat-gui';
import Stats from 'stats-js';
import palette from 'google-palette';
import {h, render as preactRender} from 'preact';

const OrbitControls = require('three-orbit-controls')(THREE);
const SplitText = require( './gsap-bonus/umd/SplitText');

import './CheckInForm';
import FXAAShader from './PostProcessing/FXAAShader';
import PMREMGenerator from './Loaders/PMREMGenerator';
import PMREMCubeUVPacker from './Loaders/PMREMCubeUVPacker';
import UnrealBloomPass from './PostProcessing/UnrealBloomPass';
import BloomBlendPass from './PostProcessing/BloomBlendPass';
import preloader from './utils/preloader';
import manifest from './assets';
import CheckInForm from './CheckInForm';
import {CannonDebugRenderer} from './utils/CannonDebugRenderer';

const DEBUG = false;
const DEFAULT_CAMERA = '[default]';

const randomColor = () => {
  let r = randomIntVal(256);
  let g = randomIntVal(256);
  let b = randomIntVal(256);
  return `rgb(${r}, ${g}, ${b})`;
};

const mapRange = (num, in_min, in_max, out_min, out_max) => {
  return (num - in_min) * (out_max - out_min) / (in_max - in_min) + out_min;
};
const randomIntVal = (max) => {
  return Math.round((Math.random()*max) );
};

const traverseMaterials = (object, callback) => {
  object.traverse((node) => {
    if (!node.isMesh) return;
    const materials = Array.isArray(node.material)
      ? node.material
      : [node.material];
    materials.forEach(callback);
  });
};

let defaultEntries = [
  {id: 'Break dance', srcAvatar: './dist/img/alpha.png', image: null, selected: true, color: randomColor()},
  {id: 'Do the worm', srcAvatar: './dist/img/beta.png', image: null, selected: true, color: randomColor()},
  {id: 'New Haircut?', srcAvatar: './dist/img/gamma.png', image: null, selected: true, color: randomColor()},
  {id: 'Eat Raw', srcAvatar: './dist/img/delta.gif', image: null, selected: true, color: randomColor()},
  {id: 'Lick floor', srcAvatar: './dist/img/zeta.png', image: null, selected: true, color: randomColor()},
  {id: 'BeatBox', srcAvatar: './dist/img/zeta.png', image: null, selected: true, color: randomColor()},
  {id: 'Sing', srcAvatar: './dist/img/zeta.png', image: null, selected: true, color: randomColor()},
  {id: 'Tell a secret', srcAvatar: './dist/img/zeta.png', image: null, selected: true, color: randomColor()},
  {id: 'Kiss some1', srcAvatar: './dist/img/zeta.png', image: null, selected: true, color: randomColor()},
  {id: 'Tell a joke', srcAvatar: './dist/img/zeta.png', image: null, selected: true, color: randomColor()},
  {id: 'Tell a poem', srcAvatar: './dist/img/zeta.png', image: null, selected: true, color: randomColor()},
  {id: 'Limbo 1m', srcAvatar: './dist/img/zeta.png', image: null, selected: true, color: randomColor()},
  {id: 'Juggle 3 balls', srcAvatar: './dist/img/zeta.png', image: null, selected: true, color: randomColor()},
  {id: 'Be a statue', srcAvatar: './dist/img/zeta.png', image: null, selected: true, color: randomColor()},
  {id: '3 push-ups', srcAvatar: './dist/img/zeta.png', image: null, selected: true, color: randomColor()},
  {id: 'Chili Challenge', srcAvatar: './dist/img/zeta.png', image: null, selected: true, color: randomColor()},
  {id: 'JINX', srcAvatar: './dist/img/zeta.png', image: null, selected: true, color: randomColor()},
  {id: 'HandStand', srcAvatar: './dist/img/zeta.png', image: null, selected: true, color: randomColor()},
  {id: 'Offer Piggyback', srcAvatar: './dist/img/zeta.png', image: null, selected: true, color: randomColor()},
  {id: 'Give Thanks', srcAvatar: './dist/img/zeta.png', image: null, selected: true, color: randomColor()},
  {id: "Can't say no", srcAvatar: './dist/img/zeta.png', image: null, selected: true, color: randomColor()},
  {id: 'IceBucket', srcAvatar: './dist/img/zeta.png', image: null, selected: true, color: randomColor()},
  {id: 'New Name', srcAvatar: './dist/img/zeta.png', image: null, selected: true, color: randomColor()},
  {id: 'Dad Dance', srcAvatar: './dist/img/zeta.png', image: null, selected: true, color: randomColor()},
  {id: 'Harlem Shake', srcAvatar: './dist/img/zeta.png', image: null, selected: true, color: randomColor()},
  {id: 'New MakeUp', srcAvatar: './dist/img/zeta.png', image: null, selected: true, color: randomColor()},
  {id: 'Keep Talking', srcAvatar: './dist/img/zeta.png', image: null, selected: true, color: randomColor()},
  {id: 'Erotic eating', srcAvatar: './dist/img/zeta.png', image: null, selected: true, color: randomColor()},
  {id: 'Give lap dance', srcAvatar: './dist/img/zeta.png', image: null, selected: true, color: randomColor()},
  {id: 'Become Animal', srcAvatar: './dist/img/zeta.png', image: null, selected: true, color: randomColor()},
];

let defaultCfg = {
  physicWorld: {
    step: 1/600,
    subStep: 10,
    gravity: 9.82,
    solverIteration: 10,
    contactEquationRelaxation: 1,
    frictionEquationRelaxation: 1
  },
  container: {
    radius: 20,
    height: 10,
    nbBars: 30,
    barSize: {
      x: .5, y: 1, z: 4
    },
    markBarHeight: 1.02,
    currentRotation: 0
  },
  ball: {
    radius: 3,
    mass: 5,
    sleepTimeLimit: .5,
    sleepSpeedLimit: .1,
    linearDamping: .01
  }
};

let bloomParams = {
  strength: .5,
  // strength: .5,
  radius: .4,
  // radius: .25,
  threshold: .85
  // threshold: .85
};

class Application {
  constructor() {
    this.free();
    this.init();
  }

  free(){
    this.scene = null;
    this.renderer = null;
    this.camera = null;
    this.composer = null;
  }

  refresh () {

  }

  init() {
    this.playing = false;
    this.standBy = true;
    this.entries = defaultEntries;
    this.gameStats = {
      players: {},
      total: 0
    };
    this.lightsMode = 2;
    this.polarCoord = 0.0;
    this.palette = palette('tol-rainbow', 30);
    this.barGlowOffset = 0;
    this.cfg = defaultCfg;
    this.hdrMaterials = [];
    this.materials = {};
    this.currentWinner = null;
    this.mouse = new Vector2();
    this.raycaster = new Raycaster();
    this.scene = new Scene();
    this.fbo1 = document.createElement('canvas');
    this.fbo1.width = 512;
    this.fbo1.height = 512;
    this.fbo2 = document.createElement('canvas');
    this.fbo2.width = 512;
    this.fbo2.height = 512;
    this.renderFns = [];

    this.container = document.body;
    this.renderer = new WebGLRenderer({
      antialias: true,
    });
    this.renderer.setClearColor(0x000000);
    this.renderer.gammaInput = true;
    this.renderer.gammaOutput = true;
    // this.renderer.toneMappingExposure = Uncharted2ToneMapping;-
    this.renderer.exposure = 1;
    this.container.style.overflow = 'hidden';
    this.container.style.margin = 0;
    this.container.appendChild(this.renderer.domElement);

    this.composer = null;
    this.defaultCamera = new PerspectiveCamera(50, resize.width / resize.height, 0.01, 10000);
    let distance = window.isMobile ? 70:50;
    this.defaultCamera.position.set(0, 0, -distance);

    this.defaultCamera.lookAt(new THREE.Vector3(0,0,0));
    this.scene.add(this.defaultCamera);
    this.activeCamera = this.defaultCamera;

    this.controls = new OrbitControls(this.defaultCamera, this.renderer.domElement);

    this.introAnimation = new TimelineMax({ repeat:-1, paused: false});
    this.introAnimation
      .to(this.defaultCamera.position, 5, {x: distance/2, y: 0, z: -distance, ease: Sine.easeInOut})
      .to(this.defaultCamera.position, 5, {x: 0, y: 0, z: -distance,  ease: Sine.easeInOut})
      .to(this.defaultCamera.position, 5, {x: -distance/2, y: 0, z: -distance,  ease: Sine.easeInOut})
      .to(this.defaultCamera.position, 5, {x: 0, y: 0, z: -distance, ease: Sine.easeInOut});

    this.renderFns.push(() => {
      this.defaultCamera.lookAt(0, 0, 0);
    });

    // this.controls.enablePan = false;
    // this.controls.enableZoom = false;
    // this.controls.enableDamping = true;
    // this.controls.minAzimuthAngle = Math.PI - Math.PI/8;
    // this.controls.maxAzimuthAngle = Math.PI + Math.PI/8;
    // this.controls.dampingFactor = 0.07;
    // this.controls.rotateSpeed = 0.07;
    // this.controls = new OrbitControls(this.defaultCamera, {
    //   element: this.renderer.domElement,
    //   parent: this.renderer.domElement,
    //   zoomSpeed: 0.01,
      // phi: 0,
      // theta: Math.PI,
      // damping: 0.25,
      // distance: 50
    // });

    this.renderer.shadowMap.enabled = true;

    if (DEBUG) {
      this.stats = new Stats();
      // this.stats.showPanel( 0 ); // 0: fps, 1: ms, 2: mb, 3+: custom
      this.stats.setMode(0);
      if (this.stats.domElement) {
        this.stats.domElement.className = 'stats';
        document.body.appendChild( this.stats.domElement );
      }
      this.scene.add(new AxesHelper(5000));
      let ball = new Mesh( new SphereGeometry( this.cfg.ball.radius, 32, 32 ), new MeshStandardMaterial({
        map: null,
        color: 0xffffff,
        metalness: 1,
        roughness: .2,
        bumpScale: -1,
        // flatShading: true
      }) );
      ball.name = 'DaBall';
      ball.position.set(0, 100, 0);
      this.scene.add( ball );
    }

    window.addEventListener("resize", this.resize);
    window.addEventListener("mousemove", this.mouseMove);
    window.addEventListener("click", this.mouseClick);
    this.resize();

    this.setupMeshes();
    this.setupPhysicalWorld();

    preloader.load(manifest, () => {

      this.renderFns.push(this.updateTexture, this.computeCurrentWinner, this.updatePhysicalWorld);
      loop(this.render).start();

      preactRender(<CheckInForm app={this} />, document.body);

      this.setupHdrCubeRenderTarget(preloader.getHDRCubeMap('hdrCube'));
      this.updateHdrMaterialEnvMap();

      if (DEBUG) {
        this.gui = new dat.GUI();
        this.gui.add(this.cfg.container, 'currentRotation', -4*Math.PI, 4*Math.PI).onChange(this.tweenWheel);
        this.gui.add({startGame: this.startGame}, 'startGame');
        this.gui.add(this.materials.diskmaterial.uniforms.blending, 'value', 0, 1);
        TweenLite.set('.login-wrapper', {display: 'none'});
        TweenLite.set('#ui-msg-overlay-c', {display: 'none'});
        this.initGame(null);
      }
    });

    setInterval(() => {
      if (this.barGlowOffset === this.cfg.container.nbBars - 1) {
        this.barGlowOffset = 0;
      } else {
        this.barGlowOffset++;
      }
    }, 1000/24);

  }

  initGame(data) {
    if (this.standBy) {
      if (!Array.isArray(data) || !data.length) {
        data = shuffle(defaultEntries);
      }
      this.standBy = false;
      this.entries = data;

      let tl = new TimelineMax();
      tl.to(this.defaultCamera, 5, {})

      this.introSentence = `${window.isMobile ? "Tap": "Press Space"} to Start!`;

      window.addEventListener('keydown', this.keyPressed);
      window.addEventListener('touchstart', this.touchStart);
      this.showText(this.introSentence, null);

      this.gameStats.players = zipObject(map(data, entry => entry.id), map(data, () => 0));
    }
  }

  createMaterials() {

    this.texture = new THREE.CanvasTexture(this.fbo1, THREE.UVMapping, THREE.RepeatWrapping, THREE.RepeatWrapping);
    this.texture.minFilter = THREE.LinearFilter;
    this.texture.magFilter = THREE.LinearFilter;
    this.texture.format = THREE.RGBFormat;

    this.emissiveTexture = new THREE.CanvasTexture(this.fbo2, THREE.UVMapping, THREE.RepeatWrapping, THREE.RepeatWrapping);
    this.emissiveTexture.minFilter = THREE.LinearFilter;
    this.emissiveTexture.magFilter = THREE.LinearFilter;
    this.emissiveTexture.format = THREE.RGBFormat;
    // let material = new THREE.MeshBasicMaterial({ map: texture });

    let cylMaterial = new THREE.MeshStandardMaterial({
      color: '#'+this.palette[randomIntVal(this.palette.length)], side: THREE.DoubleSide, metalness: .5, roughness: .7
    });

    // let diskmaterial = new THREE.MeshBasicMaterial({
    //   // metalness: .5, roughness: .7, roughnessMap: null, metalnessMap: null,
    //    color: 0xffffff,  map: this.texture,
    //   side: THREE.DoubleSide,
    //   emissiveMap: this.texture, emissiveIntensity: .5, emissive: 'white'
    // });

    let resolution = this.renderer.getSize();


    let glslPalette = new Float32Array(30*3);
    this.palette.forEach((col, index) => {
      let colObj = new THREE.Color(`#${col}`);
      glslPalette[index*3] = colObj.r;
      glslPalette[index*3 + 1] = colObj.g;
      glslPalette[index*3 + 2] = colObj.b;
    });

    var diskmaterial = new THREE.ShaderMaterial( {
      side: THREE.DoubleSide,
      uniforms: {
        time: {value: 1.0},
        palette: new THREE.Uniform(glslPalette),
        blending: {value: .39},
        resolution: new THREE.Uniform(new THREE.Vector2(resolution.width, resolution.height)),
        texture: new THREE.Uniform(this.texture)
      },
      vertexShader: `
      varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
        }
      `,
      fragmentShader: `
      #define M_PI 3.1415926535897932384626433832795
      uniform vec3 palette[30];
      uniform float blending;
      uniform float time;
      uniform vec2 resolution;
      uniform sampler2D texture;
      varying vec2 vUv;
      
      float speed = 0.035;
      vec2 center = vec2(.5, .5);
      float slice = 2.0*M_PI / 30.0;
      
      vec3 getColor(int id) {
          // if (id >= 30) {
          //   id = 59 - id;
          // }
          for (int i=0; i<30; i++) {
              if (i == id) return palette[i];
          }
      }
      
      vec4 blendColors(vec4 col1, float weight1, vec4 col2, float weight2) {
        return ((weight1*col1) + (weight2*col2)) / (weight1 + weight2);
      }
      
      void main() {
        // Normalized pixel coordinates (from 0 to 1)
        vec2 uv = gl_FragCoord.xy/resolution.xy;
        float invFac = resolution.y / resolution.x;
        
        float sinTime = 0.5+0.25*sin(time);        
                
        float angle = atan(.5-vUv.y, .5-vUv.x) - M_PI;
        if (angle < 0.0) {
          angle = angle + 2.0*M_PI;
        }
        float fract = angle / slice;
        int sliceIndex = int(fract);
        float remain = fract - float(sliceIndex);
        
        vec3 col1 = getColor(sliceIndex);
        vec3 col2 = getColor(sliceIndex+1);
        vec3 col = blendColors(vec4(col1.xyz, 1.0), (1.0-remain), vec4(col2.xyz, 1.0), remain).xyz;
        
        float x = (center.x-vUv.x);
        float y = (center.y-vUv.y);
        
        float rippleOffset = speed * time;
        
        float r = -sqrt(x*x + y*y);
        // float r = -(x*x + y*y);
        float z = 1.0 + .5 * sin((r + rippleOffset)/ 0.013);
        
        vec4 ripples =  vec4(col*vec3(z,z,z), 1.0);
        vec4 labels =  texture2D(texture, vUv.xy);
        gl_FragColor = blendColors(ripples, blending*10.0, labels, ((1.0 - blending)*10.0));
      }
      `
    });

    diskmaterial.transparent = true;

    let sMaterial = new THREE.MeshStandardMaterial({
      name: 'sMaterial',
      map: null,
      color: 0xffffff,
      metalness: 1,
      roughness: .61,
      bumpScale: -1,
    });

    let barMaterials = [];
    for (let i = 0; i < this.cfg.container.nbBars; i++) {
      barMaterials.push(new THREE.MeshStandardMaterial({
        name: `barMaterial-${i}`,
        emissive: `#${this.palette[i]}`,
        // emissive: new THREE.Color(randomColor()),
        emissiveIntensity: 0,
        // emissive: new THREE.Color('rgb(256, 0 , 0)'),
        map: null,
        color: 0xffffff,
        metalness: 1,
        roughness: .61,
        bumpScale: -1,
      }));
    }

    this.hdrMaterials = [
      sMaterial, ...barMaterials, cylMaterial
    ];

    this.materials = {
      sMaterial, cylMaterial, barMaterials, diskmaterial
    };

    this.renderFns.push((dt) => {
      this.materials.diskmaterial.uniforms.time.value += .05;
      if (this.lightsMode === 0) return;
      if (this.lightsMode === 1) {
        let slice = 2*Math.PI/this.cfg.container.nbBars;
        this.materials.barMaterials.forEach((barMat, index) => {
          // let ratio = this.barGlowOffset + index+1 / this.cfg.container.nbBars;
          // barMat.emissiveIntensity = Math.sin( (ratio*Math.PI/4)) * .5 + .5;
          let ballIndex = Math.floor(this.polarCoord / slice);
          if (ballIndex === index || ballIndex+1 === index) {
            barMat.emissiveIntensity = 1;
          } else if (index === ballIndex-1 || index === ballIndex+2) {
            barMat.emissiveIntensity = .2;
          } else if (index === ballIndex-1 || index === ballIndex+2) {
            barMat.emissiveIntensity = .1;
          }  else {
            barMat.emissiveIntensity = 0;
          }
          barMat.needsUpdate = true;
        });
      } else if (this.lightsMode === 2) {
        this.materials.barMaterials.forEach((barMat, index) => {
          let ratio = this.barGlowOffset + index+1 / this.cfg.container.nbBars;
          barMat.emissiveIntensity = Math.sin( (ratio*Math.PI/4)) * .5 + .5;
          barMat.needsUpdate = true;
        });
      }
    })
  }

  setupMeshes() {
    this.createMaterials();

    let cfgBall = this.cfg.ball;

    let geometry = new THREE.CircleGeometry( this.cfg.container.radius, 32, 0, 2*Math.PI );

    let cylinderGeometry = new THREE.CylinderGeometry(
      this.cfg.container.radius, this.cfg.container.radius, this.cfg.container.height, 32, 4, true
    );

    let cylinder = new THREE.Mesh(cylinderGeometry, this.materials.cylMaterial);
    cylinder.position.set(0, 0, 0);
    cylinder.rotateX(Math.PI/2);

    this.wheel = new THREE.Object3D();
    this.wheel.add(cylinder);
    this.scene.add(this.wheel);

    this.circle = new THREE.Mesh( geometry, this.materials.diskmaterial );
    this.circle.position.set(0, 0, this.cfg.container.height/2);
    this.circle.rotation.set(Math.PI, 0, 0);
    this.wheel.add(this.circle);

    let sGeometry = new THREE.SphereGeometry( this.cfg.ball.radius, 32, 32 );

    this.ball = new THREE.Mesh( sGeometry, this.materials.sMaterial );
    this.scene.add( this.ball );
  }

  setupPhysicalWorld() {
    let cfgContainer = this.cfg.container;
    let cfgBall = this.cfg.ball;

    this.cannonWorld = new CANNON.World();
    this.cannonWorld.allowSleep = true;
    this.cannonWorld.quatNormalizeSkip = 0;
    this.cannonWorld.quatNormalizeFast = false;

    let solver = new CANNON.GSSolver();
    solver.iterations = 10;
    solver.tolerance = 0.2;
    this.cannonWorld.solver = solver;
    this.cannonWorld.gravity.set(0,-25,0);
    this.cannonWorld.broadphase = new CANNON.NaiveBroadphase();

    this.cannonWorld.defaultContactMaterial.contactEquationStiffness = 1e5;
    this.cannonWorld.defaultContactMaterial.contactEquationRegularizationTime = 4;

    let physicsMaterial = new CANNON.Material("slipperyMaterial");
    let boxPhysicsMaterial = new CANNON.Material("boxMaterial");
    let boxContactMaterial = new CANNON.ContactMaterial(physicsMaterial,
      boxPhysicsMaterial,
      {friction: 0, restitution: 0.9}
    );
    let bumpy_ground = new CANNON.ContactMaterial(physicsMaterial,
      physicsMaterial,
      {friction: 0.4, restitution: 0.9}
    );

    this.cannonWorld.addContactMaterial(boxContactMaterial);
    this.cannonWorld.addContactMaterial(bumpy_ground);

    let sphereShape = new CANNON.Sphere(cfgBall.radius);
    this.sphereBody = new CANNON.Body({mass: cfgBall.mass, shape: sphereShape, material: boxPhysicsMaterial.id});
    this.sphereBody.allowSleep = false;
    this.sphereBody.sleepSpeedLimit = .005; // Body will feel sleepy if speed<1 (speed == norm of velocity)
    this.sphereBody.sleepTimeLimit = 1; // Body falls asleep after 1s of sleepiness
    this.sphereBody.addEventListener("sleep", this.onBallAsleep);
    // this.sphereBody.sleepTimeLimit = cfgBall.sleepTimeLimit;
    // this.sphereBody.sleepSpeedLimit = cfgBall.sleepSpeedLimit;
    // this.sphereBody.linearDamping = cfgBall.linearDamping;


    this.cannonWorld.addBody(this.sphereBody);

    //build container
    let planeShapeMinZ = new CANNON.Plane();
    let planeShapeMaxZ = new CANNON.Plane();
    let planeZMin = new CANNON.Body({mass: 0, material: physicsMaterial.id});
    let planeZMax = new CANNON.Body({mass: 0, material: physicsMaterial.id});

    planeZMin.allowSleep = true;
    planeZMin.sleepTimeLimit = 1;
    planeZMin.sleepSpeedLimit = .5;
    planeZMin.linearDamping = .01;
    planeZMax.allowSleep = true;
    planeZMax.sleepTimeLimit = 1;
    planeZMax.sleepSpeedLimit = .5;
    planeZMax.linearDamping = .01;

    // planeZMin.quaternion.setFromAxisAngle(new CANNON.Vec3(1,0,0), Math.PI);
    planeZMax.quaternion.setFromAxisAngle(new CANNON.Vec3(1,0,0), Math.PI);
    planeZMin.position.set(0, 0 , -this.cfg.container.height/2);
    planeZMax.position.set(0, 0, this.cfg.container.height/2);

    planeZMin.addShape(planeShapeMinZ);
    planeZMax.addShape(planeShapeMaxZ);
    this.cannonWorld.addBody(planeZMin);
    this.cannonWorld.addBody(planeZMax);

    this.bars = [];

    let angleFraction = 2*Math.PI / this.cfg.container.nbBars;

    for (let i=0; i< this.cfg.container.nbBars; i++) {
      let barRadius = i%2 ? cfgContainer.radius*cfgContainer.markBarHeight:cfgContainer.radius;
      let angularPos = i * angleFraction;
      let radius = cfgContainer.radius;

      let boxShape = new CANNON.Box(new CANNON.Vec3(cfgContainer.barSize.y, cfgContainer.barSize.x, cfgContainer.barSize.z));
      let cylinderBody = new CANNON.Body({mass: 0, material: physicsMaterial.id});
      cylinderBody.allowSleep = true;
      cylinderBody.addShape(boxShape);
      cylinderBody.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 0, 1), angularPos);
      cylinderBody.position.set((barRadius)*Math.cos(angularPos), (barRadius)*Math.sin(angularPos), 0);

      let bumpBoxGeometry = new THREE.BoxGeometry(2*cfgContainer.barSize.y, 2*cfgContainer.barSize.x, 2*cfgContainer.barSize.z);
      let bumpBoxMesh = new THREE.Mesh(bumpBoxGeometry, this.materials.barMaterials[i]);

      this.syncMeshWithBody(bumpBoxMesh, cylinderBody);

      this.wheel.add(bumpBoxMesh);

      let wall = new CANNON.Plane();
      let wallBody = new CANNON.Body({mass: 0, material: physicsMaterial.id});
      wallBody.addShape(wall);
      wallBody.position.set((radius)*Math.cos(angularPos), (radius)*Math.sin(angularPos), 0);
      wallBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI/2);
      let rotation = new CANNON.Quaternion();
      rotation.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), +3*Math.PI/2 - angularPos);
      wallBody.quaternion.copy(wallBody.quaternion.mult(rotation));

      this.cannonWorld.addBody(cylinderBody);
      this.cannonWorld.addBody(wallBody);
      this.bars.push({wall: wallBody, cylinder: cylinderBody, mesh: bumpBoxMesh});
    }
    if (DEBUG)
      this.cannonDebugRenderer = new CannonDebugRenderer(this.scene, this.cannonWorld);
  }

  setupHdrCubeRenderTarget(hdrCubeMap) {
    let pmremGenerator = new PMREMGenerator( hdrCubeMap );
    pmremGenerator.update( this.renderer );
    let pmremCubeUVPacker = new PMREMCubeUVPacker( pmremGenerator.cubeLods );
    pmremCubeUVPacker.update( this.renderer );
    this.hdrCubeRenderTarget = pmremCubeUVPacker.CubeUVRenderTarget;
  }

  updateHdrMaterialEnvMap() {
    let newEnvMap = this.hdrCubeRenderTarget ? this.hdrCubeRenderTarget.texture : null;
    if (!newEnvMap) return;
    Object.entries(this.hdrMaterials).forEach((materialName) => {
      materialName[1].envMap = newEnvMap;
      materialName[1].needsUpdate = true;
    });
  };

  keyPressed = (keyDownEvent) => {
    if (keyDownEvent.keyCode === 32) {
      this.startGame();
    }
  };

  touchStart = () => {
    this.startGame();
  };

  startGame = () => {
    if (this.playing) return;
    this.playing = true;
    this.introAnimation.pause();
    let cfgContainer = this.cfg.container;
    this.lightsMode = 1;
    this.hideText();
    TweenLite.to(this.defaultCamera.position, .5, {x: 0, y: 0, z: window.isMobile ? -70:-50})
    TweenLite.set('#ui-msg-overlay-2', {display: 'table-cell', opacity: 1});

    let tl = new TimelineMax({onComplete: () => {
      this.sphereBody.allowSleep = true;
    }});
    tl
      .to(this.materials.diskmaterial.uniforms.blending, .1, {value: 0.1}, 0)
      .to(cfgContainer, 10 + 10 * (Math.random() * .5 + .5), {
      currentRotation: '+='+ Math.round((Math.random() * .5 + .5)*600*Math.PI/16),
      onUpdate: this.tweenWheel
      }, 0)
      .add(() => {
        this.moveBall(3, 3, 0, new CANNON.Vec3(999, 999, 0));
      }, 0);
  };

  onBallAsleep = (e) => {
    this.lightsMode = 2;
    let tl = new TimelineMax();
    tl.set('#ui-msg-overlay-2', {opacity:0, display: 'none'});
    tl.to(this.materials.diskmaterial.uniforms.blending, 1, {value: 0.39}, 0);

    this.gameStats.players[this.currentWinner.name]++;
    this.gameStats.total++;

    Object.entries(this.gameStats.players).forEach((entry) => {
      let avr = entry[1] / this.gameStats.total;
      console.log(`${entry[0]} ${avr*100}%`);
    });

    let audioAowm = document.querySelectorAll('#audioAowm')[0];
    audioAowm.play();
    this.showText(`${this.currentWinner.id}`, null);
    setTimeout(() => {
      this.playing = false;
      this.introAnimation.play();
      this.showText("Press Space to Start!", null);
    }, 10000)
  };

  showText(text, reverse = '+=5') {
    let h1 = document.querySelectorAll('#ui-msg-overlay')[0];
    h1.innerHTML = text;
    let splitText = new SplitText(h1, {type: "chars, words"});
    let tl = new TimelineMax();
    tl.set(h1, {display: 'table-cell'})
      .to(h1, .1, {opacity: 1})
      .staggerFrom(splitText.chars, 0.8, {opacity:0, rotation:90, scale:0, y:-60, ease:Back.easeOut}, 0.05, 0.1);
    if (!!reverse)
      tl.add(() => {tl.reverse(0)}, reverse);
  }

  hideText() {
    let h1 = document.querySelectorAll('#ui-msg-overlay')[0];
    let tl = new TimelineMax();
    tl.set(h1, {display: ''})
      .to(h1, .1, {opacity: 0});
  }

  tweenWheel = () => {
    let cfgContainer = this.cfg.container;
    let lastTweenTick = new Date().getTime();
    let angleFraction = 2*Math.PI / cfgContainer.nbBars;
    let lastAngle = 0;

    // this.circle.rotation.set(0, 0, cfgContainer.currentRotation);
    this.wheel.quaternion.setFromAxisAngle(new THREE.Vector3(0,0,1), -cfgContainer.currentRotation);
    this.bars.forEach((bar, i) => {

      let wall = bar.wall;
      let cylinder = bar.cylinder;

      let angularPos = i * angleFraction;
      let radius = i%2 ? cfgContainer.radius*cfgContainer.markBarHeight:cfgContainer.radius;

      // let radius = cfgContainer.radius;
      let newX = (cfgContainer.radius)*Math.cos(angularPos + -cfgContainer.currentRotation);
      let newY = (cfgContainer.radius)*Math.sin(angularPos + -cfgContainer.currentRotation);

      let now = new Date().getTime();
      // let dt = (lastTweenTick - now);
      // let angleDiff = cfgContainer.currentRotation - lastAngle;
      // let tanSpeed = cfgContainer.radius * angleDiff / dt;

      // let tanX = newX*Math.cos(Math.PI/2) - newY * Math.sin(Math.PI/2);
      // let tanY = newX*Math.sin(Math.PI/2) + newY * Math.cos(Math.PI/2);

      // let circularForce = new CANNON.Vec3( tanX, tanY, 0);
      // circularForce.normalize();
      // circularForce.scale(tanSpeed);

      let newX2 = (radius)*Math.cos(angularPos + -cfgContainer.currentRotation);
      let newY2 = (radius)*Math.sin(angularPos + -cfgContainer.currentRotation);

      // cylinder.velocity = circularForce;
      cylinder.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 0, 1), i*angleFraction + -cfgContainer.currentRotation);
      cylinder.position.set(newX2, newY2, 0);

      wall.position.set(newX, newY, 0);
      wall.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI/2);
      let rotation = new CANNON.Quaternion();
      rotation.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), +3*Math.PI/2 - (angularPos + -cfgContainer.currentRotation));
      wall.quaternion.copy(wall.quaternion.mult(rotation));

      lastTweenTick = now;
      lastAngle = cfgContainer.currentRotation;
    });
  };

  moveBall(x, y , z, vel = new CANNON.Vec3(999, 999, 999)) {
    this.sphereBody.position.set(x, y, z);
    this.sphereBody.velocity = vel;
    this.syncMeshWithBody(this.ball, this.sphereBody);
    this.sphereBody.wakeUp();
  }

  syncMeshWithBody(mesh, body) {
    mesh.position.copy(body.position);
    mesh.quaternion.copy(body.quaternion);
  }

  updateTexture = () => {
    let ctx1 = this.fbo1.getContext('2d');
    let xMax = Math.floor(this.fbo1.width);
    let yMax = Math.floor(this.fbo1.height);
    let centerX = xMax/2;
    let centerY = yMax/2;
    let border = 2;
    let angle = 2*Math.PI/this.entries.length;
    let i = 0;

    ctx1.clearRect(0, 0, xMax, yMax);
    ctx1.lineWidth = border;
    // ctx1.strokeStyle = '#003300';
    ctx1.strokeStyle = 'white';
    if (this.entries.length > 1) {
      this.entries.forEach((entry) => {
        let startAngle = i*angle;
        let endAngle = (i+1)*angle;
        let fillStyle = (this.currentWinner === entry) ?
          'red': i % 2 === 0 ? `#${this.palette[i]}` : 'black';
        // let fillStyle = (this.currentWinner === entry) ?
        //   'red':`#${this.palette[i]}`;
        ctx1.save();
        ctx1.fillStyle = fillStyle;
        ctx1.beginPath();
        ctx1.moveTo(centerX, centerY);
        ctx1.arc(centerX, centerY, -border + centerX, startAngle, endAngle);
        ctx1.lineTo(centerX, centerY);
        ctx1.closePath();
        ctx1.fill();
        ctx1.stroke();
        ctx1.restore();
        ctx1.save();
        ctx1.fillStyle = "#ffffff";
        ctx1.font = "20px 'Oswald', sans-serif";
        ctx1.translate(centerX, centerY);
        ctx1.rotate(startAngle + angle/2 );
        ctx1.fillText(entry.id, centerX - ctx1.measureText(entry.id).width - 10, 7);
        // ctx1.drawImage(entry.image, -35, -centerY + 15, 70, 70);
        ctx1.restore();
        i++;
      });
    }
    this.texture.needsUpdate = true;
    this.materials.diskmaterial.uniforms.texture = new THREE.Uniform(this.texture);
    this.materials.diskmaterial.needsUpdate = true;
  };

  computeCurrentWinner = () => {
    let angle = 2*Math.PI/this.entries.length;
    let i = 0;

    let rayCaster = new Raycaster(this.ball.position, new THREE.Vector3(0, 0, 1));
    let intersections = rayCaster.intersectObject(this.circle, true);

    if (intersections.length) {
      let intersect = intersections[0];
      if (intersect.uv) {
        let uv = intersect.uv;
        this.texture.transformUv(uv);
        this.polarCoord = Math.atan2(.5-uv.y, .5-uv.x) - Math.PI;
        if (this.polarCoord < 0) {
          this.polarCoord += 2*Math.PI;
        }
        this.entries.forEach((entry) => {
          let startAngle = (i*angle);
          let endAngle = ((i+1)*angle);
          if (((startAngle <= this.polarCoord) && (this.polarCoord <= endAngle))) {
            this.setCurrentWinner(entry);
          }
          i++;
        });
      }
    }
  };

  setCurrentWinner(entry) {
    if (entry !== this.currentWinner) {
      this.currentWinner = entry;
      let h2 = document.querySelectorAll('#ui-msg-overlay-2')[0];
      h2.innerHTML = entry.id;
    }
  }

  updatePhysicalWorld = () => {
    let phxCfg = this.cfg.physicWorld;
    let now = new Date().getTime();
    let dt = (now - this.lastTick) / 1000;
    this.cannonWorld.step(phxCfg.step, dt, phxCfg.subStep);
    this.lastTick = now;

    //Mesh update
    this.syncMeshWithBody(this.ball, this.sphereBody);
    if (this.cannonDebugRenderer) {
      this.cannonDebugRenderer.update();
    }
  };

  setupFXComposer() {
    this.composer = new EffectComposer(this.renderer);
    const copyShader = new ShaderPass(CopyShader);
    const fxaaPass = new ShaderPass(FXAAShader);

    copyShader.renderToScreen = true;
    fxaaPass.uniforms[ 'resolution' ].value.set( 1 / window.innerWidth, 1 / window.innerHeight );

    this.composer.addPass(new RenderPass(this.scene, this.activeCamera));
    this.composer.addPass(fxaaPass);
    // this.composer.addPass(new UnrealBloomPass(
    //   new Vector2(window.innerWidth, window.innerHeight),
    //   bloomParams.strength, bloomParams.radius, bloomParams.threshold
    // ));
    let bloomBlendPass = new BloomBlendPass(3.0, 1, new Vector2(window.innerWidth, window.innerHeight));
    this.composer.addPass(bloomBlendPass);
    this.composer.addPass(copyShader);
  }

  clear() {
    if ( !this.content ) return;
    this.scene.remove( this.content );
    this.scene.traverse((node) => {
      if ( !node.isMesh ) return;
      node.geometry.dispose();
    });
  }

  setContent ( object, clips, cameras ) {

    this.clear();

    object.updateMatrixWorld();
    const box = new Box3().setFromObject(object);
    const size = box.getSize(new Vector3()).length();
    const center = box.getCenter(new Vector3());

    this.controls.reset();
    object.position.x += (object.position.x - center.x);
    object.position.y += (object.position.y - center.y);
    object.position.z += (object.position.z - center.z);
    this.controls.maxDistance = size * 10;
    this.defaultCamera.near = size / 100;
    this.defaultCamera.far = size * 100;
    this.defaultCamera.updateProjectionMatrix();

    this.defaultCamera.position.copy(center);
    this.defaultCamera.position.x += size / 2.0;
    this.defaultCamera.position.y += size / 5.0;
    this.defaultCamera.position.z += size / 2.0;
    this.defaultCamera.lookAt(center);

    this.scene.add(object);
    this.content = object;

    // if (cameras.length) {
    //   this.setCamera(cameras[0].name);
    // } else {
    this.setCamera(DEFAULT_CAMERA);
    // }
    this.setClips(clips);
    this.addLights();
    this.updateHdrMaterialEnvMap();
    this.updateGeometries();
    // this.updateMaterials();

    this.addGUI();

    // this.playAllClips();
  }

  addLights () {
    const hemiLight = new HemisphereLight(0xFFFFFF, 0x000000, .1);
    hemiLight.name = 'hemi_light';
    // this.scene.add(hemiLight);

    const light1  = new AmbientLight(0xffffff, .1);
    light1.name = 'ambient_light';
    this.scene.add( light1 );

    const light2  = new DirectionalLight(0xffffff, .1);
    light2.position.set(0, 1, 0); // ~60º
    light2.name = 'main_light';
    this.scene.add( light2 );
  }

  addAnimation(name, actions, prepare) {
    this.animations[name] = new Animation({
      name, actions, prepare
    });
  }

  setClips ( clips ) {
    if (this.mixer) {
      this.mixer.stopAllAction();
      this.mixer.uncacheRoot(this.mixer.getRoot());
      this.mixer = null;
    }

    this.mixer = new AnimationMixer(this.content);

    this.clips = clips;
    if (!clips.length) return;

    let cornerAnimations = this.clips.filter((clip) =>
      clip.name.startsWith('3-Side_corner')||clip.name.startsWith('2-Side_corner'));

    let floatingAnimation = cornerAnimations.filter((clip) => clip.name.includes('float'));
    let mainAnimation = cornerAnimations.filter((clip) => clip.name.includes('main'));

    this.addAnimation(
      'float', map(floatingAnimation, (clip) => this.mixer.clipAction(clip)), (action) => {
        return action.reset().setEffectiveTimeScale(.2).setLoop(LoopRepeat);
    });

    this.addAnimation(
      'main', map(mainAnimation, (clip) => this.mixer.clipAction(clip)), (action) => {
        return action.reset().setEffectiveTimeScale(.5).setLoop(LoopRepeat);
    });
  }

  setCamera(name) {
    console.log(`Setting camera : ${name}`);
    if (name === DEFAULT_CAMERA) {
      this.controls.enabled = true;
      this.activeCamera = this.defaultCamera;
    } else {
      this.controls.enabled = false;
      let found = false;
      this.content.traverse((node) => {
        if (node.isCamera && node.name === name) {
          found = true;
          this.activeCamera = node;
        }
      });
      if (!found) {
        console.log(`Camera ${name} not found!`);
      }
    }
    this.activeCamera.aspect = window.innerWidth / window.innerHeight;
    this.activeCamera.fov = 50;
    this.activeCamera.far = 10000;
    this.activeCamera.updateProjectionMatrix();
    this.composer && this.composer.reset();
    this.setupFXComposer();
  }

  updateGeometries() {
    this.scene.traverse((node) => {
      if (!node.isMesh) return;
      node.geometry.computeVertexNormals();
    });
  }

  updateMaterials () {
    const encoding = sRGBEncoding;
    traverseMaterials(this.scene, (material) => {
      if (material.map) material.map.encoding = encoding;
      if (material.emissiveMap) material.emissiveMap.encoding = encoding;
      if (material.flatShading) material.shading = false;
      material.needsUpdate = true;
    });
  }

  addGUI() {
    // Object.entries(this.animations).forEach((action) => {
      // Gui.add(action[1], 'play', {label: `${action[0]}.play()`});
      // Gui.add(action[1], 'fadeIn', {label: `${action[0]}.fadeIn()`});
      // Gui.add(action[1], 'fadeOut', {label: `${action[0]}.fadeOut()`});
      // Gui.add(action[1], 'togglePause', {label: `${action[0]}.togglePause()`});
      // Gui.add(action[1], 'stop', {label: `${action[0]}.stop()`});
    // });
  }

  mouseMove = (event) => {
    if (!this.clips || !Array.isArray(this.clips)) return;
    this.mouse.x = ( event.clientX / window.innerWidth ) * 2 - 1;
    this.mouse.y = - ( event.clientY / window.innerHeight ) * 2 + 1;
  };

  resize = () => {
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.defaultCamera.aspect = window.innerWidth / window.innerHeight;
    this.defaultCamera.updateProjectionMatrix();
    if (this.activeCamera !== this.defaultCamera) {
      this.activeCamera.aspect = window.innerWidth / window.innerHeight;
      this.activeCamera.updateProjectionMatrix();
    }
    this.composer && this.composer.reset();
    this.setupFXComposer();
  };

  render = (dt) => {
    this.materials.cylMaterial.emissiveIntensity = Math.sin(dt) * .5 + .5;
    this.controls && this.controls.update();

    if (this.stats)
      this.stats.begin();
    // if (this.hdrMaterials.barMaterial) {
      // let redValue = Math.round((Math.cos(this.time)*128) + 128);
      // this.hdrMaterials.barMaterial.emissive = new THREE.Color(`rgb(${redValue}, 0, 0)`);
      // this.hdrMaterials.sMaterial.color = new THREE.Color(`rgb(${redValue}, 0, 0)`);
      // this.hdrMaterials.barMaterial.needsUpdate = true;
    // }
    this.renderFns.forEach((rdrFn) => rdrFn(dt));
    if (this.composer) {
      this.composer.render();
    } else {
      this.renderer.render(this.scene, this.activeCamera);
    }
    if (this.stats)
      this.stats.end();
  };

}

document.addEventListener("DOMContentLoaded", () =>  new Application());