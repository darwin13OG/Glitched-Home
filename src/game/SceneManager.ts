import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { BoundingBox3D, GamePhase } from '../types/game';

export class SceneManager {
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public renderer: THREE.WebGLRenderer;
  public composer: EffectComposer;
  public bloomPass: UnrealBloomPass;
  private container: HTMLDivElement;
  private onResizeHandler: () => void;
  private onContextLostHandler: (e: Event) => void;

  // Collision objects
  public boundingBoxes: BoundingBox3D[] = [];
  public houseBoundingBoxes: BoundingBox3D[] = [];
  public backroomsBoundingBoxes: BoundingBox3D[] = [];
  public doorBoundingBox: BoundingBox3D | null = null;

  // Portal & Glitch elements
  public woodenDoorMesh: THREE.Mesh | null = null;
  public portalDoorMesh: THREE.Mesh | null = null;
  public portalLight: THREE.PointLight | null = null;
  public portalParticles: THREE.Points | null = null;
  public houseGroup: THREE.Group = new THREE.Group();
  public backroomsGroup: THREE.Group = new THREE.Group();

  // House interactive elements
  public stoveLight: THREE.PointLight | null = null;
  public stoveMesh: THREE.Mesh | null = null;
  public trashMesh: THREE.Mesh | null = null;
  public radioMesh: THREE.Mesh | null = null;
  public faucetMesh: THREE.Mesh | null = null;
  public waterDripLight: THREE.PointLight | null = null;
  public bedroomWindowMesh: THREE.Group | THREE.Mesh | null = null;

  // Loot items in 3D world
  public lootMeshes: Map<string, THREE.Object3D> = new Map();

  // First person held weapon
  public heldWeaponGroup: THREE.Group = new THREE.Group();
  public muzzleFlashLight: THREE.PointLight | null = null;

  // Ceiling lights
  public houseLights: THREE.PointLight[] = [];
  public ambientLight: THREE.AmbientLight | null = null;

  constructor(container: HTMLDivElement) {
    this.container = container;

    // 1. Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0a0f); // Dark cozy atmosphere outside
    this.scene.fog = new THREE.FogExp2(0x0a0a0f, 0.02);

    // 2. Camera
    this.camera = new THREE.PerspectiveCamera(
      75,
      Math.max(container.clientWidth, 1) / Math.max(container.clientHeight, 1),
      0.1,
      100
    );
    this.camera.position.set(0, 1.7, 4); // Eye level at 1.7m

    // 3. Renderer with safe creation fallback
    this.renderer = this.createRenderer(container);
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;

    // Prevent uncaught context loss errors
    this.onContextLostHandler = (event: Event) => {
      event.preventDefault();
      console.warn('WebGL Context Lost gracefully captured in SceneManager.');
    };
    this.renderer.domElement.addEventListener('webglcontextlost', this.onContextLostHandler, false);

    container.appendChild(this.renderer.domElement);

    // 4. Post-processing (Unreal Bloom)
    const renderPass = new RenderPass(this.scene, this.camera);
    this.bloomPass = new UnrealBloomPass(
      new THREE.Vector2(container.clientWidth, container.clientHeight),
      0.4, // strength
      0.5, // radius
      0.85 // threshold
    );

    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(renderPass);
    this.composer.addPass(this.bloomPass);

    // Groups & Camera
    this.scene.add(this.camera);
    this.scene.add(this.houseGroup);
    this.scene.add(this.backroomsGroup);

    // Build house world & collisions
    this.buildHouse();
    this.buildProceduralBackrooms();
    this.buildFirstPersonWeapon();

    // Resize handler
    this.onResizeHandler = () => this.onWindowResize(container);
    window.addEventListener('resize', this.onResizeHandler);
  }

  private createRenderer(container: HTMLDivElement): THREE.WebGLRenderer {
    try {
      return new THREE.WebGLRenderer({
        antialias: true,
        alpha: false,
        powerPreference: 'high-performance',
        failIfMajorPerformanceCaveat: false,
      });
    } catch {
      console.warn('Standard WebGLRenderer failed, trying fallback options...');
      return new THREE.WebGLRenderer({
        antialias: false,
        alpha: false,
        powerPreference: 'default',
        failIfMajorPerformanceCaveat: false,
      });
    }
  }

  private textureCache: Map<string, THREE.CanvasTexture> = new Map();

  private createTextureCanvas(
    type: 'wood' | 'wall' | 'backrooms' | 'carpet' | 'tile'
  ): THREE.CanvasTexture {
    if (this.textureCache.has(type)) {
      return this.textureCache.get(type)!;
    }

    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    if (type === 'wood') {
      ctx.fillStyle = '#3a2518';
      ctx.fillRect(0, 0, 512, 512);
      ctx.strokeStyle = '#28190e';
      ctx.lineWidth = 4;
      for (let i = 0; i < 512; i += 64) {
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(512, i);
        ctx.stroke();
      }
      ctx.fillStyle = 'rgba(0,0,0,0.05)';
      for (let i = 0; i < 50; i++) {
        ctx.fillRect(Math.random() * 512, Math.random() * 512, Math.random() * 100, 2);
      }
    } else if (type === 'wall') {
      ctx.fillStyle = '#e5dfd5';
      ctx.fillRect(0, 0, 512, 512);
      ctx.fillStyle = '#d8d1c5';
      for (let i = 0; i < 1000; i++) {
        ctx.fillRect(Math.random() * 512, Math.random() * 512, 2, 2);
      }
    } else if (type === 'backrooms') {
      // Authentic Backrooms Damp Yellow Wallpaper
      ctx.fillStyle = '#c5b050';
      ctx.fillRect(0, 0, 512, 512);
      // Faint vertical wallpaper stripe pattern
      ctx.strokeStyle = '#b29e40';
      ctx.lineWidth = 3;
      for (let x = 0; x < 512; x += 16) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, 512);
        ctx.stroke();
      }
      // Damp aging spots & water stains
      ctx.fillStyle = 'rgba(100, 85, 25, 0.12)';
      for (let i = 0; i < 40; i++) {
        const rx = Math.random() * 512;
        const ry = Math.random() * 512;
        const rw = 20 + Math.random() * 50;
        ctx.beginPath();
        ctx.arc(rx, ry, rw, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (type === 'carpet') {
      // Damp dirty yellow carpet
      ctx.fillStyle = '#948850';
      ctx.fillRect(0, 0, 512, 512);
      ctx.fillStyle = '#7a703d';
      for (let i = 0; i < 4000; i++) {
        ctx.fillRect(Math.random() * 512, Math.random() * 512, 2, 2);
      }
      // Carpet seams & wear marks
      ctx.strokeStyle = '#685f32';
      ctx.lineWidth = 4;
      for (let i = 0; i < 512; i += 128) {
        ctx.strokeRect(i, 0, 128, 512);
      }
    } else if (type === 'tile') {
      ctx.fillStyle = '#dededa';
      ctx.fillRect(0, 0, 512, 512);
      ctx.strokeStyle = '#888880';
      ctx.lineWidth = 6;
      ctx.strokeRect(0, 0, 512, 512);
      ctx.strokeRect(0, 0, 256, 256);
      ctx.strokeRect(256, 0, 256, 256);
      ctx.strokeRect(0, 256, 256, 256);
      ctx.strokeRect(256, 256, 256, 256);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    this.textureCache.set(type, texture);
    return texture;
  }

  private buildHouse() {
    const woodTexture = this.createTextureCanvas('wood');
    woodTexture.repeat.set(6, 6);

    const wallTexture = this.createTextureCanvas('wall');
    wallTexture.repeat.set(4, 2);

    const tileTexture = this.createTextureCanvas('tile');
    tileTexture.repeat.set(4, 4);

    // Materials
    const floorMat = new THREE.MeshStandardMaterial({
      map: woodTexture,
      roughness: 0.4,
      metalness: 0.1,
    });
    const wallMat = new THREE.MeshStandardMaterial({
      map: wallTexture,
      roughness: 0.8,
    });
    const ceilingMat = new THREE.MeshStandardMaterial({
      color: 0xf5f0ea,
      roughness: 0.9,
    });

    // 1. FLOOR (Expanded House: 18m x 18m)
    const floorGeo = new THREE.PlaneGeometry(18, 18);
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, 0, -1);
    floor.receiveShadow = true;
    this.houseGroup.add(floor);

    // Individual Room Flooring Overlays (Bathroom Tile, Kitchen Tile, Bedroom Carpet)
    const bathTileGeo = new THREE.PlaneGeometry(6.5, 10);
    const bathTileMat = new THREE.MeshStandardMaterial({ map: tileTexture, roughness: 0.3 });
    const bathFloor = new THREE.Mesh(bathTileGeo, bathTileMat);
    bathFloor.rotation.x = -Math.PI / 2;
    bathFloor.position.set(-5.75, 0.005, -5.0);
    this.houseGroup.add(bathFloor);

    const kitTileGeo = new THREE.PlaneGeometry(8, 8);
    const kitFloor = new THREE.Mesh(kitTileGeo, bathTileMat);
    kitFloor.rotation.x = -Math.PI / 2;
    kitFloor.position.set(-5.0, 0.005, 4.0);
    this.houseGroup.add(kitFloor);

    const bedCarpetGeo = new THREE.PlaneGeometry(6.5, 10);
    const carpetTexture = this.createTextureCanvas('carpet');
    carpetTexture.repeat.set(4, 6);
    const bedCarpetMat = new THREE.MeshStandardMaterial({ map: carpetTexture, roughness: 0.9 });
    const bedFloor = new THREE.Mesh(bedCarpetGeo, bedCarpetMat);
    bedFloor.rotation.x = -Math.PI / 2;
    bedFloor.position.set(5.75, 0.005, -5.0);
    this.houseGroup.add(bedFloor);

    // 2. CEILING
    const ceiling = new THREE.Mesh(floorGeo, ceilingMat);
    ceiling.position.set(0, 3, -1);
    ceiling.rotation.x = Math.PI / 2;
    this.houseGroup.add(ceiling);

    // 3. WALLS & BOUNDING BOXES FOR COLLISION
    const wallThickness = 0.4;
    const wallHeight = 3;

    // Helper to add wall mesh + bounding box
    const addWall = (
      x: number,
      z: number,
      width: number,
      depth: number,
      name = 'Wall'
    ) => {
      const wallGeo = new THREE.BoxGeometry(width, wallHeight, depth);
      const wallMesh = new THREE.Mesh(wallGeo, wallMat);
      wallMesh.position.set(x, wallHeight / 2, z);
      wallMesh.castShadow = true;
      wallMesh.receiveShadow = true;
      this.houseGroup.add(wallMesh);

      this.houseBoundingBoxes.push({
        minX: x - width / 2,
        maxX: x + width / 2,
        minY: 0,
        maxY: wallHeight,
        minZ: z - depth / 2,
        maxZ: z + depth / 2,
        name,
      });
    };

    // Outdoor Night Sky Background and Green Lawn Plane
    const lawnGeo = new THREE.PlaneGeometry(80, 80);
    const lawnMat = new THREE.MeshStandardMaterial({ color: 0x284a2a, roughness: 0.8 });
    const lawn = new THREE.Mesh(lawnGeo, lawnMat);
    lawn.rotation.x = -Math.PI / 2;
    lawn.position.set(0, -0.01, -1);
    this.houseGroup.add(lawn);

    const skyGeo = new THREE.SphereGeometry(55, 16, 16);
    const skyMat = new THREE.MeshBasicMaterial({ color: 0x081426, side: THREE.BackSide });
    const sky = new THREE.Mesh(skyGeo, skyMat);
    this.houseGroup.add(sky);

    // Outdoor Garden & Lawn Lights outside windows
    const eastGardenLight = new THREE.PointLight(0x88bbff, 2.5, 20);
    eastGardenLight.position.set(11.5, 3, 0);
    this.houseGroup.add(eastGardenLight);

    const westGardenLight = new THREE.PointLight(0x88bbff, 2.5, 20);
    westGardenLight.position.set(-11.5, 3, 0);
    this.houseGroup.add(westGardenLight);

    // Outdoor Trees visible outside windows
    const treeMat = new THREE.MeshStandardMaterial({ color: 0x1a401c, roughness: 0.8 });
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x4a2e1b, roughness: 0.8 });
    const createOutdoorTree = (x: number, z: number) => {
      const treeGroup = new THREE.Group();
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.35, 2.2, 8), trunkMat);
      trunk.position.y = 1.1;
      const foliage = new THREE.Mesh(new THREE.ConeGeometry(1.4, 3.8, 8), treeMat);
      foliage.position.y = 3.5;
      treeGroup.add(trunk, foliage);
      treeGroup.position.set(x, 0, z);
      this.houseGroup.add(treeGroup);
    };

    // Trees outside East & West Windows
    createOutdoorTree(10.8, 3.5);
    createOutdoorTree(11.8, 5.2);
    createOutdoorTree(10.5, -4.5);
    createOutdoorTree(-10.8, 3.5);
    createOutdoorTree(-11.8, 1.8);
    createOutdoorTree(-10.5, -5.5);

    // --- OUTER BOUNDARY WALLS (Seamless perimeter from z = -10 to 8, x = -9 to 9) ---
    // South Wall (z = 8)
    addWall(0, 8, 18.8, wallThickness, 'South Wall');

    // North Wall (z = -10) with Backrooms Doorway at x = -0.9 to 0.9
    addWall(-4.95, -10, 8.1, wallThickness, 'North Wall Left');
    addWall(4.95, -10, 8.1, wallThickness, 'North Wall Right');
    const topBeam = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.8, wallThickness), wallMat);
    topBeam.position.set(0, 2.6, -10);
    topBeam.castShadow = true;
    topBeam.receiveShadow = true;
    this.houseGroup.add(topBeam);

    // West Wall (x = -9) from z = -10 to z = 8 (Total depth = 18m)
    // 1) South segment: z = 4.9 to 8.0
    addWall(-9, 6.45, wallThickness, 3.1, 'West Wall South');
    // 2) Kitchen Window under/above at z = 4.0 (Leaves open window aperture at y = 1.2 to 2.1)
    const westUnderK = new THREE.Mesh(new THREE.BoxGeometry(wallThickness, 1.2, 1.8), wallMat);
    westUnderK.position.set(-9, 0.6, 4.0);
    const westAboveK = new THREE.Mesh(new THREE.BoxGeometry(wallThickness, 0.9, 1.8), wallMat);
    westAboveK.position.set(-9, 2.55, 4.0);
    this.houseGroup.add(westUnderK, westAboveK);
    // Add collision barrier ONLY so player cannot walk through window opening
    this.houseBoundingBoxes.push({
      minX: -9 - wallThickness / 2,
      maxX: -9 + wallThickness / 2,
      minY: 0,
      maxY: wallHeight,
      minZ: 4.0 - 0.9,
      maxZ: 4.0 + 0.9,
      name: 'West Wall Kitchen Window Barrier',
    });

    // 3) Middle segment: z = -4.1 to 3.1
    addWall(-9, -0.5, wallThickness, 7.2, 'West Wall Middle');

    // 4) Bathroom Window under/above at z = -5.0 (Leaves open window aperture at y = 1.2 to 2.1)
    const westUnderB = new THREE.Mesh(new THREE.BoxGeometry(wallThickness, 1.2, 1.8), wallMat);
    westUnderB.position.set(-9, 0.6, -5.0);
    const westAboveB = new THREE.Mesh(new THREE.BoxGeometry(wallThickness, 0.9, 1.8), wallMat);
    westAboveB.position.set(-9, 2.55, -5.0);
    this.houseGroup.add(westUnderB, westAboveB);
    this.houseBoundingBoxes.push({
      minX: -9 - wallThickness / 2,
      maxX: -9 + wallThickness / 2,
      minY: 0,
      maxY: wallHeight,
      minZ: -5.0 - 0.9,
      maxZ: -5.0 + 0.9,
      name: 'West Wall Bathroom Window Barrier',
    });

    // 5) North segment: z = -10.0 to -5.9
    addWall(-9, -7.95, wallThickness, 4.1, 'West Wall North');

    // East Wall (x = 9) from z = -10 to z = 8 (Total depth = 18m)
    // 1) South segment: z = 4.9 to 8.0
    addWall(9, 6.45, wallThickness, 3.1, 'East Wall South');
    // 2) Living Room Window under/above at z = 4.0 (Leaves open window aperture at y = 1.2 to 2.1)
    const eastUnderL = new THREE.Mesh(new THREE.BoxGeometry(wallThickness, 1.2, 1.8), wallMat);
    eastUnderL.position.set(9, 0.6, 4.0);
    const eastAboveL = new THREE.Mesh(new THREE.BoxGeometry(wallThickness, 0.9, 1.8), wallMat);
    eastAboveL.position.set(9, 2.55, 4.0);
    this.houseGroup.add(eastUnderL, eastAboveL);
    this.houseBoundingBoxes.push({
      minX: 9 - wallThickness / 2,
      maxX: 9 + wallThickness / 2,
      minY: 0,
      maxY: wallHeight,
      minZ: 4.0 - 0.9,
      maxZ: 4.0 + 0.9,
      name: 'East Wall Living Window Barrier',
    });

    // 3) Middle segment: z = -4.1 to 3.1
    addWall(9, -0.5, wallThickness, 7.2, 'East Wall Middle');

    // 4) Bedroom Window under/above at z = -5.0 (Leaves open window aperture at y = 1.2 to 2.1)
    const eastUnderBed = new THREE.Mesh(new THREE.BoxGeometry(wallThickness, 1.2, 1.8), wallMat);
    eastUnderBed.position.set(9, 0.6, -5.0);
    const eastAboveBed = new THREE.Mesh(new THREE.BoxGeometry(wallThickness, 0.9, 1.8), wallMat);
    eastAboveBed.position.set(9, 2.55, -5.0);
    this.houseGroup.add(eastUnderBed, eastAboveBed);
    this.houseBoundingBoxes.push({
      minX: 9 - wallThickness / 2,
      maxX: 9 + wallThickness / 2,
      minY: 0,
      maxY: wallHeight,
      minZ: -5.0 - 0.9,
      maxZ: -5.0 + 0.9,
      name: 'East Wall Bedroom Window Barrier',
    });

    // 5) North segment: z = -10.0 to -5.9
    addWall(9, -7.95, wallThickness, 4.1, 'East Wall North');

    // Windows Framework
    const windowMat = new THREE.MeshStandardMaterial({
      color: 0xddf0ff,
      transparent: true,
      opacity: 0.12,
      roughness: 0.02,
      metalness: 0.05,
      side: THREE.DoubleSide,
    });
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x6e431f, roughness: 0.6 });

    const createWindow = (x: number, y: number, z: number, rotY: number) => {
      const winGroup = new THREE.Group();
      const glass = new THREE.Mesh(new THREE.PlaneGeometry(1.78, 0.88), windowMat);
      const frameTop = new THREE.Mesh(new THREE.BoxGeometry(1.82, 0.05, 0.12), frameMat);
      frameTop.position.set(0, 0.425, 0);
      const frameBottom = new THREE.Mesh(new THREE.BoxGeometry(1.82, 0.05, 0.12), frameMat);
      frameBottom.position.set(0, -0.425, 0);
      const frameLeft = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.85, 0.12), frameMat);
      frameLeft.position.set(-0.88, 0, 0);
      const frameRight = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.85, 0.12), frameMat);
      frameRight.position.set(0.88, 0, 0);
      const barV = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.85, 0.06), frameMat);
      const barH = new THREE.Mesh(new THREE.BoxGeometry(1.78, 0.03, 0.06), frameMat);
      const sill = new THREE.Mesh(new THREE.BoxGeometry(1.88, 0.05, 0.22), frameMat);
      sill.position.set(0, -0.45, 0);

      winGroup.add(glass, frameTop, frameBottom, frameLeft, frameRight, barV, barH, sill);
      winGroup.position.set(x, y, z);
      winGroup.rotation.y = rotY;
      this.houseGroup.add(winGroup);
      return winGroup;
    };

    createWindow(9, 1.65, 4.0, -Math.PI / 2); // Living room window
    createWindow(-9, 1.65, 4.0, Math.PI / 2); // Kitchen window
    createWindow(-9, 1.65, -5.0, Math.PI / 2); // Bathroom window
    this.bedroomWindowMesh = createWindow(9, 1.65, -5.0, -Math.PI / 2); // Bedroom window (Task 5)

    // --- INTERIOR ROOM PARTITION WALLS ---
    // 1. Front-to-Back Partition Wall at z = 0 (Separates Living/Kitchen from Hallway/Rooms)
    addWall(-5.1, 0, 7.8, wallThickness, 'Front Partition West');
    addWall(5.1, 0, 7.8, wallThickness, 'Front Partition East');
    const midBeam = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.8, wallThickness), wallMat);
    midBeam.position.set(0, 2.6, 0);
    this.houseGroup.add(midBeam);

    // 2. Kitchen vs Living Room Divider at x = -1 (z = 0 to 8)
    addWall(-1, 6.75, wallThickness, 2.5, 'Kitchen Wall South');
    addWall(-1, 1.25, wallThickness, 2.5, 'Kitchen Wall North');
    const kitBeam = new THREE.Mesh(new THREE.BoxGeometry(wallThickness, 0.8, 3.0), wallMat);
    kitBeam.position.set(-1, 2.6, 4.0);
    this.houseGroup.add(kitBeam);

    // 3. Central Hallway Side Walls (z = -10 to 0)
    // West Hallway Wall (x = -2.5) with Bathroom Doorway at z = -5
    addWall(-2.5, -2.0, wallThickness, 4.0, 'Hallway West Wall South');
    addWall(-2.5, -8.0, wallThickness, 4.0, 'Hallway West Wall North');
    const bathBeam = new THREE.Mesh(new THREE.BoxGeometry(wallThickness, 0.8, 2.0), wallMat);
    bathBeam.position.set(-2.5, 2.6, -5.0);
    this.houseGroup.add(bathBeam);

    // East Hallway Wall (x = 2.5) with Bedroom Doorway at z = -5
    addWall(2.5, -2.0, wallThickness, 4.0, 'Hallway East Wall South');
    addWall(2.5, -8.0, wallThickness, 4.0, 'Hallway East Wall North');
    const bedBeam = new THREE.Mesh(new THREE.BoxGeometry(wallThickness, 0.8, 2.0), wallMat);
    bedBeam.position.set(2.5, 2.6, -5.0);
    this.houseGroup.add(bedBeam);

    // 4. LIGHTING (Warm, well-lit interior across all rooms, eliminating dark burnt shadows)
    this.ambientLight = new THREE.AmbientLight(0xffeedd, 0.75);
    this.houseGroup.add(this.ambientLight);

    const hemiLight = new THREE.HemisphereLight(0xfff5ea, 0x554433, 0.55);
    this.houseGroup.add(hemiLight);

    const bulbGeo = new THREE.SphereGeometry(0.12, 16, 16);
    const bulbMat = new THREE.MeshBasicMaterial({ color: 0xffeaaf });

    const createCeilingLight = (x: number, y: number, z: number, intensity = 1.6, color = 0xffc488) => {
      const light = new THREE.PointLight(color, intensity, 14);
      light.position.set(x, y, z);
      light.castShadow = true;
      light.shadow.bias = -0.002;
      this.houseGroup.add(light);
      this.houseLights.push(light);

      const bulb = new THREE.Mesh(bulbGeo, bulbMat);
      bulb.position.copy(light.position);
      this.houseGroup.add(bulb);
    };

    createCeilingLight(4.5, 2.7, 4.0, 1.8, 0xffc488); // Living Room
    createCeilingLight(-5.5, 2.7, 4.0, 1.6, 0xffd5b8); // Kitchen
    createCeilingLight(0, 2.7, -2.5, 1.4, 0xffe1b8); // Hallway South
    createCeilingLight(0, 2.7, -7.5, 1.4, 0xffffd1); // Hallway North
    createCeilingLight(-5.5, 2.7, -5.0, 1.5, 0xcbe3ff); // Bathroom
    createCeilingLight(5.5, 2.7, -5.0, 1.6, 0xffd5b8); // Master Bedroom

    // 5. FURNITURE & DECORATIONS (With Bounding Boxes)
    this.buildFurniture();

    // 6. PORTAL DOORWAY & WOODEN HOUSE DOOR (At North Wall x = 0, z = -10)
    this.buildPortalDoorway();
  }

  private buildFurniture() {
    const addBoxCollision = (
      mesh: THREE.Mesh | THREE.Group,
      x: number,
      y: number,
      z: number,
      w: number,
      h: number,
      d: number,
      name: string
    ) => {
      mesh.position.set(x, y, z);
      this.houseGroup.add(mesh);

      this.houseBoundingBoxes.push({
        minX: x - w / 2,
        maxX: x + w / 2,
        minY: y - h / 2,
        maxY: y + h / 2,
        minZ: z - d / 2,
        maxZ: z + d / 2,
        name,
      });
    };

    // Shared rich material palettes (No dark burnt materials!)
    const woodOakMat = new THREE.MeshStandardMaterial({ color: 0x9a5c2d, roughness: 0.5 });
    const woodTeakMat = new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.4 });
    const chromeMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.9, roughness: 0.1 });
    const brassMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.85, roughness: 0.2 });
    const porcelainMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.1 });

    // COUCH (Living Room) - Elegant slate blue fabric with cyan pillows
    const couchGroup = new THREE.Group();
    const couchMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.7 });
    const cushionMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.6 });
    const seat = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.45, 0.9), couchMat);
    seat.position.y = 0.225;
    couchGroup.add(seat);

    const backrest = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.6, 0.25), couchMat);
    backrest.position.set(0, 0.6, 0.35);
    couchGroup.add(backrest);

    const armLeft = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.5, 0.9), couchMat);
    armLeft.position.set(-1.2, 0.4, 0);
    const armRight = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.5, 0.9), couchMat);
    armRight.position.set(1.2, 0.4, 0);
    couchGroup.add(armLeft, armRight);

    // Decorative throw pillows
    const cPillow1 = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.4, 0.18), cushionMat);
    cPillow1.position.set(-0.8, 0.6, 0.25);
    const cPillow2 = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.4, 0.18), cushionMat);
    cPillow2.position.set(0.8, 0.6, 0.25);
    couchGroup.add(cPillow1, cPillow2);

    addBoxCollision(couchGroup, 5.5, 0, 5.0, 2.6, 0.9, 0.95, 'Couch');

    // COFFEE TABLE - Golden Teak Wood
    const tableGroup = new THREE.Group();
    const top = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.08, 0.8), woodTeakMat);
    top.position.y = 0.45;
    tableGroup.add(top);

    for (const [lx, lz] of [[-0.6, -0.3], [0.6, -0.3], [-0.6, 0.3], [0.6, 0.3]]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.45, 0.08), woodOakMat);
      leg.position.set(lx, 0.225, lz);
      tableGroup.add(leg);
    }
    addBoxCollision(tableGroup, 5.5, 0, 3.2, 1.45, 0.5, 0.85, 'Coffee Table');

    // TV & CABINET - Polished wood & sleek screen
    const tvCabinet = new THREE.Group();
    const cab = new THREE.Mesh(new THREE.BoxGeometry(2, 0.5, 0.5), woodTeakMat);
    cab.position.y = 0.25;
    tvCabinet.add(cab);

    const tvMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.1, metalness: 0.8 });
    const tvFrame = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.9, 0.08), tvMat);
    tvFrame.position.set(0, 1.0, 0);
    tvCabinet.add(tvFrame);

    addBoxCollision(tvCabinet, 5.5, 0, 0.8, 2.1, 1.5, 0.55, 'TV Cabinet');

    // KITCHEN COUNTER & STOVE - White Quartz Counter & Charcoal Base
    const kitchenGroup = new THREE.Group();
    const kBaseMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.5 });
    const kTopMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.2 });

    const kBase = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.86, 0.8), kBaseMat);
    kBase.position.y = 0.43;
    const kTop = new THREE.Mesh(new THREE.BoxGeometry(3.54, 0.06, 0.84), kTopMat);
    kTop.position.y = 0.89;
    kitchenGroup.add(kBase, kTop);

    const stoveMat = new THREE.MeshBasicMaterial({ color: 0xff3300 });
    this.stoveMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.02, 16), stoveMat);
    this.stoveMesh.position.set(-0.8, 0.93, 0);
    kitchenGroup.add(this.stoveMesh);

    this.stoveLight = new THREE.PointLight(0xff5500, 0.8, 2);
    this.stoveLight.position.set(-0.8, 1.1, 0);
    kitchenGroup.add(this.stoveLight);

    addBoxCollision(kitchenGroup, -6.5, 0, 4.5, 3.6, 0.95, 0.85, 'Kitchen Counter');

    // TRASH CAN - Metallic Silver Stainless Steel
    const trashGroup = new THREE.Group();
    const trashMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.8, roughness: 0.2 });
    this.trashMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.18, 0.45, 16), trashMat);
    this.trashMesh.position.y = 0.225;
    trashGroup.add(this.trashMesh);
    addBoxCollision(trashGroup, -8.2, 0, 7.0, 0.45, 0.45, 0.45, 'Trash Can');

    // RADIO / BOOMBOX - Vibrant retro orange/red with chrome trim
    const radioMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.3 });
    this.radioMesh = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.22, 0.16), radioMat);
    this.radioMesh.position.set(-5.2, 0.92 + 0.11, 4.5);
    this.radioMesh.castShadow = true;
    this.houseGroup.add(this.radioMesh);

    // DINING TABLE & CHAIRS (Kitchen Area)
    const diningGroup = new THREE.Group();
    const dTop = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.08, 1.0), woodTeakMat);
    dTop.position.y = 0.75;
    diningGroup.add(dTop);
    for (const [lx, lz] of [[-0.8, -0.4], [0.8, -0.4], [-0.8, 0.4], [0.8, 0.4]]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.75, 0.08), woodOakMat);
      leg.position.set(lx, 0.375, lz);
      diningGroup.add(leg);
    }
    addBoxCollision(diningGroup, -5.0, 0, 1.8, 1.9, 0.8, 1.1, 'Dining Table');

    // BATHROOM FURNITURE & FIXTURES
    const bathSinkGroup = new THREE.Group();

    // Wooden Cabinet Base
    const vanityCabinet = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.82, 0.65), woodOakMat);
    vanityCabinet.position.set(0, 0.41, 0);
    bathSinkGroup.add(vanityCabinet);

    // Porcelain Countertop & Basin
    const counterTop = new THREE.Mesh(new THREE.BoxGeometry(1.86, 0.06, 0.68), porcelainMat);
    counterTop.position.set(0, 0.85, 0);
    bathSinkGroup.add(counterTop);

    const basin = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.1, 0.45), porcelainMat);
    basin.position.set(0, 0.87, -0.05);
    bathSinkGroup.add(basin);

    // Chrome Faucet
    this.faucetMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.18, 8), chromeMat);
    this.faucetMesh.position.set(0, 0.96, 0.1);
    bathSinkGroup.add(this.faucetMesh);

    // Water drip light
    this.waterDripLight = new THREE.PointLight(0x00aaff, 1.2, 2.5);
    this.waterDripLight.position.set(0, 0.98, 0.1);
    bathSinkGroup.add(this.waterDripLight);

    // Wall Mirror
    const mirrorMat = new THREE.MeshStandardMaterial({ color: 0xbae6fd, metalness: 0.95, roughness: 0.02 });
    const mirrorFrameMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.4 });
    const mirrorFrame = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.0, 0.04), mirrorFrameMat);
    mirrorFrame.position.set(0, 1.55, 0.31);
    const mirror = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.9, 0.02), mirrorMat);
    mirror.position.set(0, 1.55, 0.30);
    bathSinkGroup.add(mirrorFrame, mirror);

    addBoxCollision(bathSinkGroup, -6.0, 0, -0.525, 1.9, 1.8, 0.75, 'Bathroom Faucet');

    // Bathroom Rug & Trash Can
    const bathRug = new THREE.Mesh(
      new THREE.BoxGeometry(1.6, 0.015, 0.9),
      new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.9 })
    );
    bathRug.position.set(-6.0, 0.01, -2.0);
    this.houseGroup.add(bathRug);

    // TOILET against North Wall
    const toiletGroup = new THREE.Group();
    const toiletBase = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.42, 0.65), porcelainMat);
    toiletBase.position.y = 0.21;
    const toiletTank = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.52, 0.28), porcelainMat);
    toiletTank.position.set(0, 0.68, -0.22);
    const toiletLid = new THREE.Mesh(new THREE.BoxGeometry(0.43, 0.04, 0.45), porcelainMat);
    toiletLid.position.set(0, 0.44, 0.08);

    toiletGroup.add(toiletBase, toiletTank, toiletLid);
    addBoxCollision(toiletGroup, -4.2, 0, -8.8, 0.7, 0.9, 0.8, 'Toilet');

    // BATHTUB & SHOWER
    const tubGroup = new THREE.Group();
    const tubRim = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.62, 0.95), porcelainMat);
    tubRim.position.y = 0.31;

    const showerGlass = new THREE.Mesh(
      new THREE.BoxGeometry(0.04, 1.8, 0.95),
      new THREE.MeshStandardMaterial({ color: 0xe0f2fe, transparent: true, opacity: 0.4, roughness: 0.05 })
    );
    showerGlass.position.set(0.88, 1.2, 0);

    const showerPipe = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 1.4, 8), chromeMat);
    showerPipe.position.set(-0.8, 1.3, -0.38);
    const showerHead = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.03, 16), chromeMat);
    showerHead.position.set(-0.8, 1.95, -0.25);

    tubGroup.add(tubRim, showerGlass, showerPipe, showerHead);
    addBoxCollision(tubGroup, -7.2, 0, -8.2, 1.9, 2.0, 1.0, 'Bathtub');

    // MASTER BEDROOM (Harmonious Layout: Bed against North Wall z=-9.8, Wardrobe against South Partition z=-0.4)
    const bedGroup = new THREE.Group();
    const blanketMat = new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.6 }); // Royal Blue
    const sheetMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8 }); // Clean White Sheet

    // Bed Frame Base
    const bedBase = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.32, 2.1), woodOakMat);
    bedBase.position.y = 0.16;

    // Mattress (y from 0.32 to 0.56)
    const mattress = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.24, 2.0), sheetMat);
    mattress.position.y = 0.44;

    // Blanket (Proper thickness and positioning to ELIMINATE Z-FIGHTING!)
    // Bottom at y = 0.54 (buries cleanly into mattress top), top at y = 0.64
    const blanket = new THREE.Mesh(new THREE.BoxGeometry(2.14, 0.10, 1.3), blanketMat);
    blanket.position.set(0, 0.59, 0.32);

    // Folded white sheet accent at head of bed
    const foldedSheet = new THREE.Mesh(new THREE.BoxGeometry(2.12, 0.08, 0.3), sheetMat);
    foldedSheet.position.set(0, 0.58, -0.35);

    // High Headboard (against wall at z = -0.95 relative to bed center)
    const headboard = new THREE.Mesh(new THREE.BoxGeometry(2.3, 1.25, 0.2), woodOakMat);
    headboard.position.set(0, 0.625, -0.95);

    // Pillows
    const pillow1 = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.14, 0.4), sheetMat);
    pillow1.position.set(-0.55, 0.63, -0.65);
    const pillow2 = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.14, 0.4), sheetMat);
    pillow2.position.set(0.55, 0.63, -0.65);

    bedGroup.add(bedBase, mattress, blanket, foldedSheet, headboard, pillow1, pillow2);
    // Bed headboard placed flush against North wall (z = -9.8), center at z = -8.5, x = 5.75
    addBoxCollision(bedGroup, 5.75, 0, -8.5, 2.4, 1.25, 2.2, 'Master Bed');

    // TWO BEDSIDE NIGHTSTANDS with Warm Table Lamps
    const createNightstand = (x: number, z: number) => {
      const nsGroup = new THREE.Group();
      const nsBody = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.55, 0.55), woodOakMat);
      nsBody.position.y = 0.275;

      const nsHandle = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 8), brassMat);
      nsHandle.position.set(0, 0.3, 0.29);

      // Cozy Bedside Lamp
      const lampBase = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.15, 12), brassMat);
      lampBase.position.y = 0.625;
      const lampShade = new THREE.Mesh(
        new THREE.CylinderGeometry(0.12, 0.2, 0.25, 12),
        new THREE.MeshStandardMaterial({ color: 0xfef08a, roughness: 0.4 })
      );
      lampShade.position.y = 0.825;

      const lampLight = new THREE.PointLight(0xfef08a, 0.6, 3);
      lampLight.position.y = 0.8;

      nsGroup.add(nsBody, nsHandle, lampBase, lampShade, lampLight);
      nsGroup.position.set(x, 0, z);
      this.houseGroup.add(nsGroup);
    };

    createNightstand(4.1, -9.4);
    createNightstand(7.4, -9.4);

    // WARDROBE CLOSET (Armario) - Placed flush against South Wall (z = 0 partition)
    const closetGroup = new THREE.Group();
    const closetBody = new THREE.Mesh(new THREE.BoxGeometry(2.2, 2.3, 0.65), woodOakMat);
    closetBody.position.y = 1.15;

    // Wardrobe Door panels & Golden Brass Handles
    const closetDoorMat = new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.4 });
    const doorL = new THREE.Mesh(new THREE.BoxGeometry(1.04, 2.15, 0.04), closetDoorMat);
    doorL.position.set(-0.53, 1.15, 0.33);
    const doorR = new THREE.Mesh(new THREE.BoxGeometry(1.04, 2.15, 0.04), closetDoorMat);
    doorR.position.set(0.53, 1.15, 0.33);

    const handleL = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.3, 8), brassMat);
    handleL.position.set(-0.1, 1.15, 0.36);
    const handleR = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.3, 8), brassMat);
    handleR.position.set(0.1, 1.15, 0.36);

    closetGroup.add(closetBody, doorL, doorR, handleL, handleR);
    // Placed at x = 6.0, z = -0.4 (against partition wall z = 0)
    addBoxCollision(closetGroup, 6.0, 0, -0.4, 2.3, 2.3, 0.7, 'Wardrobe');

    // Soft Bedroom Area Rug in front of bed
    const bedRug = new THREE.Mesh(
      new THREE.BoxGeometry(2.8, 0.015, 2.2),
      new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.95 })
    );
    bedRug.position.set(5.75, 0.01, -6.0);
    this.houseGroup.add(bedRug);
  }

  private buildPortalDoorway() {
    // Portal Door Frame at x = 0, z = -9.85 (North wall of Central Hallway)
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x8b5a2b, roughness: 0.5 });
    const frameLeft = new THREE.Mesh(new THREE.BoxGeometry(0.15, 2.4, 0.25), frameMat);
    frameLeft.position.set(-0.95, 1.2, -9.85);

    const frameRight = new THREE.Mesh(new THREE.BoxGeometry(0.15, 2.4, 0.25), frameMat);
    frameRight.position.set(0.95, 1.2, -9.85);

    const frameTop = new THREE.Mesh(new THREE.BoxGeometry(2.05, 0.15, 0.25), frameMat);
    frameTop.position.set(0, 2.325, -9.85);

    this.houseGroup.add(frameLeft, frameRight, frameTop);

    // NORMAL WOODEN HOUSE DOOR PANEL
    const doorGroup = new THREE.Group();
    const doorMat = new THREE.MeshStandardMaterial({ color: 0x9b6136, roughness: 0.5 });
    const doorPanel = new THREE.Mesh(new THREE.BoxGeometry(1.75, 2.2, 0.08), doorMat);
    doorPanel.position.set(0.875, 1.1, 0);
    doorPanel.castShadow = true;

    const knobMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.8, roughness: 0.2 });
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 12), knobMat);
    knob.position.set(1.5, 1.1, 0.06);
    doorGroup.add(doorPanel, knob);
    doorGroup.position.set(-0.875, 0, -9.82); // Hinge at x = -0.875, z = -9.82
    this.houseGroup.add(doorGroup);
    this.woodenDoorMesh = doorPanel;

    // PORTAL DOOR MESH - Pure White Emissive Portal (behind wooden door, hidden initially)
    const portalGeo = new THREE.PlaneGeometry(1.72, 2.15);
    const portalMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      side: THREE.DoubleSide,
    });
    this.portalDoorMesh = new THREE.Mesh(portalGeo, portalMat);
    this.portalDoorMesh.position.set(0, 1.075, -9.86);
    this.portalDoorMesh.visible = false; // Hidden during CALM phase
    this.houseGroup.add(this.portalDoorMesh);

    // Intensive Portal PointLight (0 intensity in CALM phase)
    this.portalLight = new THREE.PointLight(0xffffff, 0, 12);
    this.portalLight.position.set(0, 1.2, -9.5);
    this.houseGroup.add(this.portalLight);

    // Bounding Box for Portal Door interaction
    this.doorBoundingBox = {
      minX: -0.9,
      maxX: 0.9,
      minY: 0,
      maxY: 2.3,
      minZ: -10.0,
      maxZ: -9.6,
      name: 'Backrooms Portal',
      isPortal: false, // Solid when door is closed
      isInteractable: true,
    };
    this.houseBoundingBoxes.push(this.doorBoundingBox);
    this.boundingBoxes = [...this.houseBoundingBoxes];
  }

  public removeLootMesh(lootId: string) {
    const mesh = this.lootMeshes.get(lootId);
    if (mesh) {
      this.scene.remove(mesh);
      this.lootMeshes.delete(lootId);
    }
  }

  public turnOffHouseLights() {
    this.houseLights.forEach((l) => (l.intensity = 0));
    if (this.ambientLight) {
      this.ambientLight.intensity = 0.02;
    }
    if (this.stoveLight) {
      this.stoveLight.intensity = 0;
    }
  }

  public turnOnHouseLights() {
    this.houseLights.forEach((l) => (l.intensity = 1.4));
    if (this.ambientLight) {
      this.ambientLight.intensity = 0.25;
    }
    if (this.stoveLight) {
      this.stoveLight.intensity = 0.8;
    }
    if (this.woodenDoorMesh && this.woodenDoorMesh.parent) {
      this.woodenDoorMesh.parent.rotation.y = 0;
    }
    if (this.portalDoorMesh) {
      this.portalDoorMesh.visible = false;
    }
    if (this.portalLight) {
      this.portalLight.intensity = 0;
    }
    this.setBackroomsDoorLocked(false);
  }

  public setBackroomsEnvironment(inBackrooms: boolean) {
    if (inBackrooms) {
      this.backroomsGroup.visible = true;
      // Authentic damp yellow Backrooms fog & background to prevent black voids
      this.scene.background = new THREE.Color(0xc5b050);
      this.scene.fog = new THREE.FogExp2(0xc5b050, 0.022);
    } else {
      this.backroomsGroup.visible = false;
      // House dark night atmosphere
      this.scene.background = new THREE.Color(0x0a0a0f);
      this.scene.fog = new THREE.FogExp2(0x0a0a0f, 0.02);
    }
  }

  public setBackroomsDoorLocked(locked: boolean) {
    if (locked) {
      if (this.woodenDoorMesh && this.woodenDoorMesh.parent) {
        this.woodenDoorMesh.parent.rotation.y = 0;
      }
      if (this.doorBoundingBox) {
        this.doorBoundingBox.isPortal = false;
      }
      // Filter out any previous blocker first
      this.backroomsBoundingBoxes = this.backroomsBoundingBoxes.filter(
        (b) => b.name !== 'Backrooms Solid Entrance Blocker'
      );
      // Push solid entrance wall so player cannot clip back into house
      this.backroomsBoundingBoxes.push({
        minX: -2.0,
        maxX: 2.0,
        minY: 0,
        maxY: 3.0,
        minZ: -10.4,
        maxZ: -9.6,
        name: 'Backrooms Solid Entrance Blocker',
      });
    } else {
      this.backroomsBoundingBoxes = this.backroomsBoundingBoxes.filter(
        (b) => b.name !== 'Backrooms Solid Entrance Blocker'
      );
      if (this.doorBoundingBox) {
        this.doorBoundingBox.isPortal = true;
      }
    }
    this.boundingBoxes = [...this.houseBoundingBoxes, ...this.backroomsBoundingBoxes];
  }

  public buildProceduralBackrooms() {
    // 1. Clear old Backrooms 3D group elements
    while (this.backroomsGroup.children.length > 0) {
      const child = this.backroomsGroup.children[0];
      this.backroomsGroup.remove(child);
    }

    // 2. Clear old Backrooms loot meshes from scene
    this.lootMeshes.forEach((mesh, id) => {
      if (id.startsWith('loot_')) {
        this.scene.remove(mesh);
      }
    });
    this.lootMeshes.clear();

    // 3. Clear Backrooms collision boxes
    this.backroomsBoundingBoxes = [];

    // Ambient Backrooms Lighting (prevents lag from 100s of dynamic point lights)
    const bAmbient = new THREE.AmbientLight(0xdcc874, 0.85);
    this.backroomsGroup.add(bAmbient);

    // Textures
    const backroomsTex = this.createTextureCanvas('backrooms');
    backroomsTex.repeat.set(16, 3);

    const carpetTex = this.createTextureCanvas('carpet');
    carpetTex.repeat.set(32, 32);

    const backWallMat = new THREE.MeshStandardMaterial({ map: backroomsTex, roughness: 0.85 });
    const backCarpetMat = new THREE.MeshStandardMaterial({ map: carpetTex, roughness: 0.95 });
    const backCeilingMat = new THREE.MeshStandardMaterial({ color: 0xd9c582, roughness: 0.8 });
    const columnMat = new THREE.MeshStandardMaterial({ map: backroomsTex, roughness: 0.85 });
    const baseboardMat = new THREE.MeshStandardMaterial({ color: 0x4a3b1a, roughness: 0.6 });

    // Grid Dimensions: 16x16 cells (Each cell size: 4m x 4m -> Total: 64m x 64m)
    // Grid extends from x = -32 to 32, z = -10 to -74
    const cellWidth = 4;
    const cellDepth = 4;
    const cols = 16;
    const rows = 16;
    const originX = -32;
    const originZ = -10; // entrance is at z = -10 (aligned with house North wall), x = 0

    // Floor (64m x 64m centered at z = -42)
    const bFloor = new THREE.Mesh(new THREE.PlaneGeometry(64, 64), backCarpetMat);
    bFloor.rotation.x = -Math.PI / 2;
    bFloor.position.set(0, 0, -42);
    this.backroomsGroup.add(bFloor);

    // Ceiling (64m x 64m centered at z = -42)
    const wallHeight = 3.5;
    const wallThickness = 0.2;

    const bCeiling = new THREE.Mesh(new THREE.PlaneGeometry(64, 64), backCeilingMat);
    bCeiling.rotation.x = Math.PI / 2;
    bCeiling.position.set(0, wallHeight, -42);
    this.backroomsGroup.add(bCeiling);

    // Outer Perimeter Walls & Inner Wall helper
    const addBWall = (x: number, z: number, w: number, d: number, name = 'Backrooms Wall') => {
      const geo = new THREE.BoxGeometry(w, wallHeight, d);
      const mesh = new THREE.Mesh(geo, backWallMat);
      mesh.position.set(x, wallHeight / 2, z);
      this.backroomsGroup.add(mesh);

      // Add dark wood baseboard trim along floor
      const bbGeo = new THREE.BoxGeometry(w + 0.02, 0.15, d + 0.02);
      const bbMesh = new THREE.Mesh(bbGeo, baseboardMat);
      bbMesh.position.set(x, 0.075, z);
      this.backroomsGroup.add(bbMesh);

      this.backroomsBoundingBoxes.push({
        minX: x - w / 2,
        maxX: x + w / 2,
        minY: 0,
        maxY: wallHeight,
        minZ: z - d / 2,
        maxZ: z + d / 2,
        name,
      });
    };

    // North Outer Wall (z = -74)
    addBWall(0, -74, 64, wallThickness, 'Backrooms North Outer Wall');
    // South Outer Wall (z = -10.5) with doorway gap at x = -1.2 to 1.2
    addBWall(-16.6, -10.5, 30.8, 0.4, 'Backrooms South Outer Wall Left');
    addBWall(16.6, -10.5, 30.8, 0.4, 'Backrooms South Outer Wall Right');
    // West Outer Wall (x = -32)
    addBWall(-32, -42, wallThickness, 64, 'Backrooms West Outer Wall');
    // East Outer Wall (x = 32)
    addBWall(32, -42, wallThickness, 64, 'Backrooms East Outer Wall');

    // Procedural Internal Maze Walls & Square Fluorescent Lighting
    const availableCells: { x: number; z: number }[] = [];

    // Square Fluorescent Ceiling Lamp Materials (Emissive bloom for high FPS)
    const lampEmissiveMat = new THREE.MeshBasicMaterial({ color: 0xffffc8 });
    const lampFrameMat = new THREE.MeshBasicMaterial({ color: 0x111111 });

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const cx = originX + (c + 0.5) * cellWidth;
        const cz = originZ - (r + 0.5) * cellDepth;

        // Reserve entrance path (c = 7, 8 and r = 0, 1)
        if ((c === 7 || c === 8) && (r === 0 || r === 1)) {
          continue;
        }

        availableCells.push({ x: cx, z: cz });

        // Place random vertical or horizontal wall panels (32% chance)
        if (Math.random() < 0.32) {
          if (Math.random() < 0.5) {
            addBWall(cx, cz + cellDepth / 2, cellWidth * 0.85, wallThickness, `Backrooms Inner Wall H (${c},${r})`);
          } else {
            addBWall(cx + cellWidth / 2, cz, wallThickness, cellDepth * 0.85, `Backrooms Inner Wall V (${c},${r})`);
          }
        }

        // Place columns at cell corners (20% chance)
        if (Math.random() < 0.20) {
          const colX = originX + c * cellWidth;
          const colZ = originZ - r * cellDepth;
          const colGeo = new THREE.BoxGeometry(0.8, wallHeight, 0.8);
          const colMesh = new THREE.Mesh(colGeo, columnMat);
          colMesh.position.set(colX, wallHeight / 2, colZ);
          this.backroomsGroup.add(colMesh);

          this.backroomsBoundingBoxes.push({
            minX: colX - 0.4,
            maxX: colX + 0.4,
            minY: 0,
            maxY: wallHeight,
            minZ: colZ - 0.4,
            maxZ: colZ + 0.4,
            name: 'Backrooms Column',
          });
        }

        // Add Square Fluorescent Ceiling Light Panel (45% chance per cell)
        if (Math.random() < 0.45) {
          // Dark outer frame
          const frameMesh = new THREE.Mesh(new THREE.BoxGeometry(1.28, 0.04, 1.28), lampFrameMat);
          frameMesh.position.set(cx, wallHeight - 0.01, cz);
          this.backroomsGroup.add(frameMesh);

          // Emissive white/yellow square light pane
          const lampMesh = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.06, 1.2), lampEmissiveMat);
          lampMesh.position.set(cx, wallHeight - 0.03, cz);
          this.backroomsGroup.add(lampMesh);
        }
      }
    }

    // Add 3 key point lights total across maze for depth without lag
    const pLight1 = new THREE.PointLight(0xfff5b0, 1.5, 20);
    pLight1.position.set(0, 2.8, -16);
    const pLight2 = new THREE.PointLight(0xfff5b0, 1.5, 25);
    pLight2.position.set(-15, 2.8, -42);
    const pLight3 = new THREE.PointLight(0xfff5b0, 1.5, 25);
    pLight3.position.set(15, 2.8, -42);
    this.backroomsGroup.add(pLight1, pLight2, pLight3);

    // Shuffle available cells to place loot
    for (let i = availableCells.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [availableCells[i], availableCells[j]] = [availableCells[j], availableCells[i]];
    }

    const createFlashlightMesh = () => {
      const flGroup = new THREE.Group();
      const flBody = new THREE.Mesh(
        new THREE.CylinderGeometry(0.04, 0.05, 0.25, 12),
        new THREE.MeshStandardMaterial({ color: 0xe6b800, roughness: 0.3, metalness: 0.7 })
      );
      flBody.rotation.z = Math.PI / 2;
      flGroup.add(flBody);
      return flGroup;
    };

    const createMedkitMesh = () => {
      const medkitGroup = new THREE.Group();
      const medkitBox = new THREE.Mesh(
        new THREE.BoxGeometry(0.35, 0.2, 0.25),
        new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 })
      );
      const crossVert = new THREE.Mesh(
        new THREE.BoxGeometry(0.07, 0.16, 0.255),
        new THREE.MeshBasicMaterial({ color: 0xef4444 })
      );
      const crossHoriz = new THREE.Mesh(
        new THREE.BoxGeometry(0.16, 0.07, 0.255),
        new THREE.MeshBasicMaterial({ color: 0xef4444 })
      );
      medkitGroup.add(medkitBox, crossVert, crossHoriz);
      return medkitGroup;
    };

    const createWeaponMesh = () => {
      const weaponGroup = new THREE.Group();
      const gunmetalMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.85, roughness: 0.25 });
      const darkMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.7 });
      const chromeMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.95, roughness: 0.1 });

      const slide = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.06, 0.24), gunmetalMat);
      slide.position.set(0, 0.08, 0);

      const frame = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.045, 0.22), darkMat);
      frame.position.set(0, 0.03, 0);

      const grip = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.14, 0.07), darkMat);
      grip.position.set(0, -0.04, 0.06);
      grip.rotation.x = -0.22;

      const barrelTip = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.07), chromeMat);
      barrelTip.rotation.x = Math.PI / 2;
      barrelTip.position.set(0, 0.08, -0.14);

      weaponGroup.add(slide, frame, grip, barrelTip);
      return weaponGroup;
    };

    const createAmmoMesh = () => {
      const ammoGroup = new THREE.Group();
      const ammoBox = new THREE.Mesh(
        new THREE.BoxGeometry(0.25, 0.14, 0.18),
        new THREE.MeshStandardMaterial({ color: 0x3f6212, roughness: 0.6 })
      );
      ammoGroup.add(ammoBox);
      return ammoGroup;
    };

    // Place Loot items across distinct randomized Backrooms cells
    if (availableCells.length >= 8) {
      // 1. Flashlight
      const fl = createFlashlightMesh();
      fl.position.set(availableCells[0].x, 0.2, availableCells[0].z);
      this.scene.add(fl);
      this.lootMeshes.set('loot_flashlight', fl);

      // 2. Weapon
      const wp = createWeaponMesh();
      wp.position.set(availableCells[1].x, 0.1, availableCells[1].z);
      this.scene.add(wp);
      this.lootMeshes.set('loot_weapon', wp);

      // 3. Medkits x3
      for (let i = 1; i <= 3; i++) {
        const mk = createMedkitMesh();
        const pos = availableCells[1 + i];
        mk.position.set(pos.x, 0.1, pos.z);
        this.scene.add(mk);
        this.lootMeshes.set(`loot_medkit_${i}`, mk);
      }

      // 4. Ammo Boxes x3
      for (let i = 1; i <= 3; i++) {
        const am = createAmmoMesh();
        const pos = availableCells[4 + i];
        am.position.set(pos.x, 0.1, pos.z);
        this.scene.add(am);
        this.lootMeshes.set(`loot_ammo_${i}`, am);
      }
    }

    // Hide Backrooms initially during CALM phase
    this.backroomsGroup.visible = false;
    this.scene.add(this.backroomsGroup);

    // Combine all collision bounding boxes
    this.boundingBoxes = [...this.houseBoundingBoxes, ...this.backroomsBoundingBoxes];
  }

  private buildFirstPersonWeapon() {
    this.heldWeaponGroup = new THREE.Group();

    // 9mm Semi-Automatic Pistol Mesh
    const gunmetalMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.85, roughness: 0.25 });
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.7 });
    const chromeMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.95, roughness: 0.1 });
    const sightMat = new THREE.MeshBasicMaterial({ color: 0xef4444 }); // Bright red sight dot

    // Slide (top barrel housing)
    const slide = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.052, 0.22), gunmetalMat);
    slide.position.set(0, 0.04, -0.02);

    // Frame (lower receiver)
    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.042, 0.042, 0.2), darkMat);
    frame.position.set(0, 0, 0);

    // Grip Handle (angled rubberized grip)
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.038, 0.12, 0.065), darkMat);
    grip.position.set(0, -0.06, 0.05);
    grip.rotation.x = -0.22;

    // Trigger Guard & Trigger
    const triggerGuard = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.04, 0.05), chromeMat);
    triggerGuard.position.set(0, -0.03, -0.01);

    // Barrel Tip
    const barrelTip = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.06), chromeMat);
    barrelTip.rotation.x = Math.PI / 2;
    barrelTip.position.set(0, 0.038, -0.14);

    // Front Red Dot Sight
    const frontSight = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.012, 0.015), sightMat);
    frontSight.position.set(0, 0.07, -0.12);

    this.heldWeaponGroup.add(slide, frame, grip, triggerGuard, barrelTip, frontSight);

    // Muzzle Flash Light
    this.muzzleFlashLight = new THREE.PointLight(0xffaa22, 0, 6);
    this.muzzleFlashLight.position.set(0, 0.04, -0.18);
    this.heldWeaponGroup.add(this.muzzleFlashLight);

    // Initial position in bottom right of camera view
    this.heldWeaponGroup.position.set(0.22, -0.2, -0.4);
    this.heldWeaponGroup.rotation.y = -0.08;
    this.heldWeaponGroup.visible = false;

    this.camera.add(this.heldWeaponGroup);
  }

  public updateHeldWeapon(hasWeapon: boolean) {
    if (this.heldWeaponGroup) {
      this.heldWeaponGroup.visible = hasWeapon;
    }
  }

  public triggerGunRecoil() {
    if (!this.heldWeaponGroup) return;

    // Instant backward kick & pitch recoil
    this.heldWeaponGroup.position.z = -0.32;
    this.heldWeaponGroup.rotation.x = 0.25;

    // Flash muzzle light
    if (this.muzzleFlashLight) {
      this.muzzleFlashLight.intensity = 5.0;
      setTimeout(() => {
        if (this.muzzleFlashLight) this.muzzleFlashLight.intensity = 0;
      }, 70);
    }
  }

  public updateGlitchEffects(phase: GamePhase, time: number) {
    if (phase === 'CALM') {
      this.backroomsGroup.visible = false;
      if (this.portalDoorMesh) this.portalDoorMesh.visible = false;
      if (this.doorBoundingBox) this.doorBoundingBox.isPortal = false; // Solid door
      if (this.portalLight) this.portalLight.intensity = 0;
      this.bloomPass.strength = 0.3;
      if (this.woodenDoorMesh && this.woodenDoorMesh.parent) {
        this.woodenDoorMesh.parent.rotation.y = THREE.MathUtils.lerp(this.woodenDoorMesh.parent.rotation.y, 0, 0.1);
      }
    } else if (phase === 'GLITCH') {
      this.backroomsGroup.visible = true;
      if (this.portalDoorMesh) this.portalDoorMesh.visible = true;
      if (this.doorBoundingBox) this.doorBoundingBox.isPortal = true; // Open portal passable
      // Swing door open to reveal Backrooms portal
      if (this.woodenDoorMesh && this.woodenDoorMesh.parent) {
        this.woodenDoorMesh.parent.rotation.y = THREE.MathUtils.lerp(this.woodenDoorMesh.parent.rotation.y, -Math.PI / 1.8, 0.1);
      }

      // Backrooms portal light kept off per request (no light over door)
      if (this.portalLight) this.portalLight.intensity = 0;
      this.bloomPass.strength = 0.8 + Math.sin(time * 4) * 0.2;

      // House ceiling lights flicker
      for (const light of this.houseLights) {
        light.intensity = Math.random() < 0.15 ? 0.1 : 0.8 + Math.sin(time * 12) * 0.3;
      }
    } else if (phase === 'DEFENSE') {
      this.backroomsGroup.visible = true;
      if (this.portalDoorMesh) this.portalDoorMesh.visible = true;
      if (this.doorBoundingBox) this.doorBoundingBox.isPortal = true;
      if (this.woodenDoorMesh && this.woodenDoorMesh.parent) {
        this.woodenDoorMesh.parent.rotation.y = -Math.PI / 1.8;
      }
      if (this.portalLight) this.portalLight.intensity = 0;
      this.bloomPass.strength = 1.4;

      for (const light of this.houseLights) {
        light.intensity = Math.random() < 0.3 ? 0 : 0.4;
      }
    }
  }

  public render() {
    // Smooth recoil recovery lerp for held weapon
    if (this.heldWeaponGroup && this.heldWeaponGroup.visible) {
      this.heldWeaponGroup.position.z = THREE.MathUtils.lerp(this.heldWeaponGroup.position.z, -0.4, 0.15);
      this.heldWeaponGroup.rotation.x = THREE.MathUtils.lerp(this.heldWeaponGroup.rotation.x, 0, 0.15);
    }

    try {
      this.composer.render();
    } catch {
      try {
        this.renderer.render(this.scene, this.camera);
      } catch {
        // Silently capture frame render errors during context loss
      }
    }
  }

  private onWindowResize(container: HTMLDivElement) {
    if (!container || container.clientWidth === 0 || container.clientHeight === 0) return;
    this.camera.aspect = container.clientWidth / container.clientHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.composer.setSize(container.clientWidth, container.clientHeight);
  }

  public setBrightness(exposure: number) {
    if (this.renderer) {
      this.renderer.toneMappingExposure = exposure;
    }
  }

  public dispose() {
    window.removeEventListener('resize', this.onResizeHandler);

    if (this.renderer) {
      if (this.onContextLostHandler && this.renderer.domElement) {
        this.renderer.domElement.removeEventListener('webglcontextlost', this.onContextLostHandler);
      }

      try {
        this.composer?.dispose();
      } catch {}

      try {
        this.renderer.dispose();
        this.renderer.forceContextLoss();
      } catch {}

      if (this.renderer.domElement && this.renderer.domElement.parentElement) {
        this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
      }
    }

    // Traverse and clean up scene objects
    try {
      this.scene.traverse((obj) => {
        if ((obj as THREE.Mesh).isMesh) {
          const mesh = obj as THREE.Mesh;
          mesh.geometry?.dispose();
          if (Array.isArray(mesh.material)) {
            mesh.material.forEach((m) => m.dispose());
          } else if (mesh.material) {
            mesh.material.dispose();
          }
        }
      });
    } catch {}
  }
}
