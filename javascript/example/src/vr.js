import {
    WebGLRenderer,
    PerspectiveCamera,
    Scene,
    Mesh,
    PlaneGeometry,
    ShadowMaterial,
    DirectionalLight,
    PCFSoftShadowMap,
    sRGBEncoding,
    Color,
    AmbientLight,
    Box3,
    LoadingManager,
    MathUtils,
    Group,
    BufferGeometry,
    Float32BufferAttribute,
    AdditiveBlending,
    RingGeometry,
    MeshBasicMaterial,
    LineBasicMaterial,
    Line,
    Ray,
    TorusGeometry,
    SphereGeometry,
    MeshPhongMaterial,
} from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { VRButton } from 'three/examples/jsm/webxr/VRButton.js';
import { XRControllerModelFactory } from 'three/examples/jsm/webxr/XRControllerModelFactory.js';
import URDFLoader from '../../src/URDFLoader.js';
import { URDFDragControls } from '../../src/URDFDragControls.js';

let scene, camera, renderer, robot, workspace;
let controller, controllerGrip, ray, robotGroup;
let dragControls, ground, intersectRing, hitSphere;

init();

function init() {

    scene = new Scene();
    scene.background = new Color(0xffab40);

    robotGroup = new Group();
    scene.add(robotGroup);

    workspace = new Group();
    workspace.position.z = 3;
    scene.add(workspace);

    camera = new PerspectiveCamera();
    workspace.add(camera);

    renderer = new WebGLRenderer({ antialias: true });
    renderer.outputEncoding = sRGBEncoding;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = PCFSoftShadowMap;
    document.body.appendChild(renderer.domElement);

    ray = new Ray();

    const hoverMaterial = new MeshPhongMaterial({ emissive: 0xffab40, emissiveIntensity: 0.25 });
    dragControls = new URDFDragControls(robotGroup);
    dragControls.onHover = joint => {

        const traverse = c => {

            if (c !== joint && c.isURDFJoint && c.jointType !== 'fixed') {

                return;

            }

            if (c.isMesh) {

                c.__originalMaterial = c.material;
                c.material = hoverMaterial;

            }

            c.children.forEach(traverse);

        };
        traverse(joint);

    };
    dragControls.onUnhover = joint => {

        const traverse = c => {

            if (c !== joint && c.isURDFJoint && c.jointType !== 'fixed') {

                return;

            }

            if (c.isMesh) {

                c.material = c.__originalMaterial;

            }

            c.children.forEach(traverse);

        };
        traverse(joint);

    };

    // vr
    renderer.xr.enabled = true;
    renderer.setAnimationLoop(render);
    document.body.appendChild(VRButton.createButton(renderer));

    const directionalLight = new DirectionalLight(0xffffff, 1.0);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.setScalar(2048);
    directionalLight.position.set(5, 30, 5);
    scene.add(directionalLight);

    const ambientLight = new AmbientLight(0xffb74d, 0.5);
    scene.add(ambientLight);

    ground = new Mesh(new PlaneGeometry(), new ShadowMaterial({ opacity: 0.1 }));
    ground.rotation.x = -Math.PI / 2;
    ground.scale.setScalar(30);
    ground.receiveShadow = true;
    scene.add(ground);

    const manager = new LoadingManager();
    const loader = new URDFLoader(manager);
    loader.loadMeshCb = function(path, manager, onComplete) {
        const ext = path.split(/\./g).pop().toLowerCase();

        switch (ext) {

            case 'gltf':
                new GLTFLoader(manager).load(
                    path,
                    result => onComplete(result.scene),
                    null,
                    err => onComplete(null, err),
                );
                break;
            default:
                loader.defaultMeshLoader(path, manager, onComplete);

        }

    };
    loader.load('../../../urdf/T12/urdf/T12_flipped.URDF', result => {
        robot = result;
    });

    manager.onLoad = function() {

        robot.rotation.x = Math.PI / 2;
        robot.traverse(c => {
            c.castShadow = true;
            c.receiveShadow = true;
        });
        for (let i = 1; i <= 6; i++) {

            robot.joints[`HP${ i }`].setJointValue(MathUtils.degToRad(30));
            robot.joints[`KP${ i }`].setJointValue(MathUtils.degToRad(120));
            robot.joints[`AP${ i }`].setJointValue(MathUtils.degToRad(-60));

        }
        robot.updateMatrixWorld(true);

        const bb = new Box3();
        bb.setFromObject(robot);

        robot.position.y -= bb.min.y;

        robotGroup.add(robot);

    };

    const whiteMat = new MeshBasicMaterial({ color: 0xffffff });
    intersectRing = new Mesh(new TorusGeometry(0.25, 0.02, 16, 100), whiteMat);
    intersectRing.rotation.x = Math.PI / 2;
    intersectRing.visible = false;
    scene.add(intersectRing);

    hitSphere = new Mesh(new SphereGeometry(0.01, 50, 50), whiteMat);
    scene.add(hitSphere);

    // vr controllers
    controller = renderer.xr.getController(0);
    controller.addEventListener('selectstart', () => {

        dragControls.setGrabbed(true);
        if (!dragControls.hovered && !dragControls.manipulating && intersectRing.visible) {

            workspace.position.copy(intersectRing.position);

        }

    });
    controller.addEventListener('selectend', () => {

        dragControls.setGrabbed(false);

    });
    controller.addEventListener('connected', function(event) {

        this.controllerActive = true;
        this.add(buildController(event.data));

    });
    controller.addEventListener('disconnected', function() {

        this.controllerActive = false;
        this.remove(this.children[ 0 ]);

    });
    workspace.add(controller);

    // controller models
    const controllerModelFactory = new XRControllerModelFactory();
    controllerGrip = renderer.xr.getControllerGrip(0);
    controllerGrip.add(controllerModelFactory.createControllerModel(controllerGrip));
    workspace.add(controllerGrip);

    onResize();
    window.addEventListener('resize', onResize);

}

function buildController(data) {

    let geometry, material;

    switch (data.targetRayMode) {

        case 'tracked-pointer':

            geometry = new BufferGeometry();
            geometry.setAttribute('position', new Float32BufferAttribute([ 0, 0, 0, 0, 0, -1 ], 3));
            geometry.setAttribute('color', new Float32BufferAttribute([ 0.5, 0.5, 0.5, 0, 0, 0 ], 3));

            material = new LineBasicMaterial({
                vertexColors: true,
                blending: AdditiveBlending,
                depthWrite: false,
                transparent: true,
            });

            return new Line(geometry, material);

        case 'gaze':

            geometry = new RingGeometry(0.02, 0.04, 32).translate(0, 0, -1);
            material = new MeshBasicMaterial({ opacity: 0.5, transparent: true });
            return new Mesh(geometry, material);

    }

}

function onResize() {

    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

}

function render() {

    ray.origin.set(0, 0, 0).applyMatrix4(controller.matrixWorld);
    ray.direction.set(0, 0, -1).transformDirection(controller.matrixWorld);
    dragControls.moveRay(ray);

    if (!dragControls.hovered && !dragControls.manipulating) {

        const hit = dragControls.raycaster.intersectObject(ground)[0];
        hitSphere.visible = false;
        if (hit) {

            intersectRing.position.copy(hit.point);
            intersectRing.visible = true;

        } else {

            intersectRing.visible = false;

        }

        if (controller.children[0]) {

            controller.children[0].scale.setScalar(1);

        }

    } else {

        if (controller.children[0]) {

            controller.children[0].scale.setScalar(dragControls.hitDistance);

        }

        ray.at(dragControls.hitDistance, hitSphere.position);
        hitSphere.visible = true;
        intersectRing.visible = false;

    }

    renderer.render(scene, camera);

}
