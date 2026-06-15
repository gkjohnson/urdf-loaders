import * as THREE from 'three';
import { MeshPhongMaterial } from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import URDFLoader from './URDFLoader.js';

const tempVec2 = new THREE.Vector2();
const emptyRaycast = () => {};

// urdf-viewer element
// Loads and displays a 3D view of a URDF-formatted robot

/**
 * A custom HTML element that loads and displays a URDF robot model in a THREE.js scene.
 *
 * @fires URDFViewer#urdf-change
 * @fires URDFViewer#ignore-limits-change
 * @fires URDFViewer#urdf-processed
 * @fires URDFViewer#geometry-loaded
 */
class URDFViewer extends HTMLElement {

    /**
     * Fires when the URDF has changed and a new one is starting to load.
     * @event URDFViewer#urdf-change
     */

    /**
     * Fires when the `ignore-limits` attribute changes.
     * @event URDFViewer#ignore-limits-change
     */

    /**
     * Fires when the URDF has finished loading and getting processed.
     * @event URDFViewer#urdf-processed
     */

    /**
     * Fires when all the geometry has been fully loaded.
     * @event URDFViewer#geometry-loaded
     */

    static get observedAttributes() {

        return ['package', 'urdf', 'up', 'display-shadow', 'ambient-color', 'ignore-limits', 'show-collision'];

    }

    /**
     * Corresponds to the `package` parameter in `URDFLoader.load`.
     * @type {string}
     */
    get package() { return this.getAttribute('package') || ''; }
    set package(val) { this.setAttribute('package', val); }

    /**
     * Corresponds to the `urdfpath` parameter in `URDFLoader.load`.
     * @type {string}
     */
    get urdf() { return this.getAttribute('urdf') || ''; }
    set urdf(val) { this.setAttribute('urdf', val); }

    /**
     * Whether or not the display should ignore the joint limits specified in the model when updating angles.
     * @type {boolean}
     */
    get ignoreLimits() { return this.hasAttribute('ignore-limits') || false; }
    set ignoreLimits(val) { val ? this.setAttribute('ignore-limits', val) : this.removeAttribute('ignore-limits'); }

    /**
     * The axis to associate with "up" in THREE.js. Values can be [+-][XYZ].
     * @type {string}
     */
    get up() { return this.getAttribute('up') || '+Z'; }
    set up(val) { this.setAttribute('up', val); }

    /**
     * Whether or not to render the shadow under the robot.
     * @type {boolean}
     */
    get displayShadow() { return this.hasAttribute('display-shadow') || false; }
    set displayShadow(val) { val ? this.setAttribute('display-shadow', '') : this.removeAttribute('display-shadow'); }

    /**
     * The color of the ambient light specified with css colors.
     * @type {string}
     */
    get ambientColor() { return this.getAttribute('ambient-color') || '#8ea0a8'; }
    set ambientColor(val) { val ? this.setAttribute('ambient-color', val) : this.removeAttribute('ambient-color'); }

    /**
     * Automatically redraw the model every frame instead of waiting to be dirtied.
     * @type {boolean}
     */
    get autoRedraw() { return this.hasAttribute('auto-redraw') || false; }
    set autoRedraw(val) { val ? this.setAttribute('auto-redraw', true) : this.removeAttribute('auto-redraw'); }

    /**
     * Recenter the camera only after loading the model.
     * @type {boolean}
     */
    get noAutoRecenter() { return this.hasAttribute('no-auto-recenter') || false; }
    set noAutoRecenter(val) { val ? this.setAttribute('no-auto-recenter', true) : this.removeAttribute('no-auto-recenter'); }

    get showCollision() { return this.hasAttribute('show-collision') || false; }
    set showCollision(val) { val ? this.setAttribute('show-collision', true) : this.removeAttribute('show-collision'); }

    /**
     * Sets or gets the jointValues of the robot as a dictionary of `joint-name` to `radian` pairs.
     * @type {Object}
     */
    get jointValues() {

        const values = {};
        if (this.robot) {

            for (const name in this.robot.joints) {

                const joint = this.robot.joints[name];
                values[name] = joint.jointValue.length === 1 ? joint.angle : [...joint.jointValue];

            }

        }

        return values;

    }
    set jointValues(val) { this.setJointValues(val); }

    get angles() {

        return this.jointValues;

    }
    set angles(v) {

        this.jointValues = v;

    }

    /* Lifecycle Functions */
    constructor() {

        super();

        this._requestId = 0;
        this._dirty = false;
        this._loadScheduled = false;
        this.robot = null;
        this.loadMeshFunc = null;
        this.urlModifierFunc = null;

        // Scene setup
        const scene = new THREE.Scene();

        const ambientLight = new THREE.HemisphereLight(this.ambientColor, '#000');
        ambientLight.groundColor.lerp(ambientLight.color, 0.5 * Math.PI);
        ambientLight.intensity = 0.5;
        ambientLight.position.set(0, 1, 0);
        scene.add(ambientLight);

        // Light setup
        const dirLight = new THREE.DirectionalLight(0xffffff, Math.PI);
        dirLight.position.set(4, 10, 1);
        dirLight.shadow.mapSize.width = 2048;
        dirLight.shadow.mapSize.height = 2048;
        dirLight.shadow.normalBias = 0.001;
        dirLight.castShadow = true;
        scene.add(dirLight);
        scene.add(dirLight.target);

        // Renderer setup
        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setClearColor(0xffffff);
        renderer.setClearAlpha(0);
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        renderer.outputColorSpace = THREE.SRGBColorSpace;

        // Camera setup
        const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
        camera.position.z = -10;

        // World setup
        const world = new THREE.Object3D();
        scene.add(world);

        const plane = new THREE.Mesh(
            new THREE.PlaneGeometry(40, 40),
            new THREE.ShadowMaterial({ side: THREE.DoubleSide, transparent: true, opacity: 0.25 }),
        );
        plane.rotation.x = -Math.PI / 2;
        plane.position.y = -0.5;
        plane.receiveShadow = true;
        plane.scale.set(10, 10, 10);
        scene.add(plane);

        // Controls setup
        const controls = new OrbitControls(camera, renderer.domElement);
        controls.rotateSpeed = 2.0;
        controls.zoomSpeed = 5;
        controls.panSpeed = 2;
        controls.enableZoom = true;
        controls.enableDamping = false;
        controls.maxDistance = 50;
        controls.minDistance = 0.25;
        controls.addEventListener('change', () => this.recenter());

        this.scene = scene;
        this.world = world;
        this.renderer = renderer;
        this.camera = camera;
        this.controls = controls;
        this.plane = plane;
        this.directionalLight = dirLight;
        this.ambientLight = ambientLight;

        this._setUp(this.up);

        this._collisionMaterial = new MeshPhongMaterial({
            transparent: true,
            opacity: 0.35,
            shininess: 2.5,
            premultipliedAlpha: true,
            color: 0xffbe38,
            polygonOffset: true,
            polygonOffsetFactor: -1,
            polygonOffsetUnits: -1,
        });

        const _renderLoop = () => {

            if (this.parentNode) {

                this.updateSize();

                if (this._dirty || this.autoRedraw) {

                    if (!this.noAutoRecenter) {

                        this._updateEnvironment();
                    }

                    this.renderer.render(scene, camera);
                    this._dirty = false;

                }

                // update controls after the environment in
                // case the controls are retargeted
                this.controls.update();

            }
            this._renderLoopId = requestAnimationFrame(_renderLoop);

        };
        _renderLoop();

    }

    connectedCallback() {

        // Add our initialize styles for the element if they haven't
        // been added yet
        if (!this.constructor._styletag) {

            const styletag = document.createElement('style');
            styletag.innerHTML =
            `
                ${ this.tagName } { display: block; }
                ${ this.tagName } canvas {
                    width: 100%;
                    height: 100%;
                }
            `;
            document.head.appendChild(styletag);
            this.constructor._styletag = styletag;

        }

        // add the renderer
        if (this.childElementCount === 0) {

            this.appendChild(this.renderer.domElement);

        }

        this.updateSize();
        requestAnimationFrame(() => this.updateSize());

    }

    disconnectedCallback() {

        cancelAnimationFrame(this._renderLoopId);

    }

    attributeChangedCallback(attr, oldval, newval) {

        this._updateCollisionVisibility();
        if (!this.noAutoRecenter) {
            this.recenter();
        }

        switch (attr) {

            case 'package':
            case 'urdf': {

                this._scheduleLoad();
                break;

            }

            case 'up': {

                this._setUp(this.up);
                break;

            }

            case 'ambient-color': {

                this.ambientLight.color.set(this.ambientColor);
                this.ambientLight.groundColor.set('#000').lerp(this.ambientLight.color, 0.5);
                break;

            }

            case 'ignore-limits': {

                this._setIgnoreLimits(this.ignoreLimits, true);
                break;

            }

        }

    }

    /* Public API */
    updateSize() {

        const r = this.renderer;
        const w = this.clientWidth;
        const h = this.clientHeight;
        const currSize = r.getSize(tempVec2);

        if (currSize.width !== w || currSize.height !== h) {

            this.recenter();

        }

        r.setPixelRatio(window.devicePixelRatio);
        r.setSize(w, h, false);

        this.camera.aspect = w / h;
        this.camera.updateProjectionMatrix();

    }

    /**
     * Dirty the renderer so the element will redraw next frame.
     * @returns {void}
     */
    redraw() {

        this._dirty = true;
    }

    /**
     * Recenter the camera to the model and redraw.
     * @returns {void}
     */
    recenter() {

        this._updateEnvironment();
        this.redraw();

    }

    // Set the joint with jointName to
    // angle in degrees
    /**
     * Sets the given joint to the provided value(s). See URDFJoint.setJointValue.
     * @param {string} jointName The name of the joint to set
     * @param {...number|null} jointValues The value(s) to set
     * @returns {void}
     */
    setJointValue(jointName, ...jointValues) {

        if (!this.robot) return;
        if (!this.robot.joints[jointName]) return;

        if (this.robot.joints[jointName].setJointValue(...jointValues)) {

            this.redraw();
            this.dispatchEvent(new CustomEvent('angle-change', { bubbles: true, cancelable: true, detail: jointName }));

        }

    }

    /**
     * Sets all joint names specified as keys to radian angle value.
     * @param {Object} jointValueDictionary A dictionary of joint names to values
     * @returns {void}
     */
    setJointValues(values) {

        for (const name in values) {

            if (Array.isArray(values[name])) {

                this.setJointValue(name, ...values[name]);

            } else {

                this.setJointValue(name, values[name]);

            }

        }

    }

    /* Private Functions */
    // Updates the position of the plane to be at the
    // lowest point below the robot and focuses the
    // camera on the center of the scene
    _updateEnvironment() {

        const robot = this.robot;
        if (!robot) return;

        this.world.updateMatrixWorld();

        const bbox = new THREE.Box3();
        bbox.makeEmpty();
        robot.traverse(c => {
            if (c.isURDFVisual) {
                bbox.expandByObject(c);
            }
        });

        const center = bbox.getCenter(new THREE.Vector3());
        this.controls.target.y = center.y;
        this.plane.position.y = bbox.min.y - 1e-3;

        const dirLight = this.directionalLight;
        dirLight.castShadow = this.displayShadow;

        if (this.displayShadow) {

            // Update the shadow camera rendering bounds to encapsulate the
            // model. We use the bounding sphere of the bounding box for
            // simplicity -- this could be a tighter fit.
            const sphere = bbox.getBoundingSphere(new THREE.Sphere());
            const minmax = sphere.radius;
            const cam = dirLight.shadow.camera;
            cam.left = cam.bottom = -minmax;
            cam.right = cam.top = minmax;

            // Update the camera to focus on the center of the model so the
            // shadow can encapsulate it
            const offset = dirLight.position.clone().sub(dirLight.target.position);
            dirLight.target.position.copy(center);
            dirLight.position.copy(center).add(offset);

            cam.updateProjectionMatrix();

        }

    }

    _scheduleLoad() {

        // if our current model is already what's being requested
        // or has been loaded then early out
        if (this._prevload === `${ this.package }|${ this.urdf }`) return;
        this._prevload = `${ this.package }|${ this.urdf }`;

        // if we're already waiting on a load then early out
        if (this._loadScheduled) return;
        this._loadScheduled = true;

        if (this.robot) {

            this.robot.traverse(c => c.dispose && c.dispose());
            this.robot.parent.remove(this.robot);
            this.robot = null;

        }

        requestAnimationFrame(() => {

            this._loadUrdf(this.package, this.urdf);
            this._loadScheduled = false;

        });

    }

    // Watch the package and urdf field and load the robot model.
    // This should _only_ be called from _scheduleLoad because that
    // ensures the that current robot has been removed
    _loadUrdf(pkg, urdf) {

        this.dispatchEvent(new CustomEvent('urdf-change', { bubbles: true, cancelable: true, composed: true }));

        if (urdf) {

            // Keep track of this request and make
            // sure it doesn't get overwritten by
            // a subsequent one
            this._requestId++;
            const requestId = this._requestId;

            const updateMaterials = mesh => {

                mesh.traverse(c => {

                    if (c.isMesh) {

                        c.castShadow = true;
                        c.receiveShadow = true;

                        if (c.material) {

                            const mats =
                                (Array.isArray(c.material) ? c.material : [c.material])
                                    .map(m => {

                                        if (m instanceof THREE.MeshBasicMaterial) {

                                            m = new THREE.MeshPhongMaterial();

                                        }

                                        if (m.map) {

                                            m.map.colorSpace = THREE.SRGBColorSpace;

                                        }

                                        return m;

                                    });
                            c.material = mats.length === 1 ? mats[0] : mats;

                        }

                    }

                });

            };

            if (pkg.includes(':') && (pkg.split(':')[1].substring(0, 2)) !== '//') {
                // E.g. pkg = "pkg_name: path/to/pkg_name, pk2: path2/to/pk2"}

                // Convert pkg(s) into a map. E.g.
                // { "pkg_name": "path/to/pkg_name",
                //   "pk2":      "path2/to/pk2"      }

                pkg = pkg.split(',').reduce((map, value) => {

                    const split = value.split(/:/).filter(x => !!x);
                    const pkgName = split.shift().trim();
                    const pkgPath = split.join(':').trim();
                    map[pkgName] = pkgPath;

                    return map;

                }, {});
            }

            let robot = null;
            const manager = new THREE.LoadingManager();
            manager.onLoad = () => {

                // If another request has come in to load a new
                // robot, then ignore this one
                if (this._requestId !== requestId) {

                    robot.traverse(c => c.dispose && c.dispose());
                    return;

                }

                this.robot = robot;
                this.world.add(robot);
                updateMaterials(robot);

                this._setIgnoreLimits(this.ignoreLimits);
                this._updateCollisionVisibility();

                this.dispatchEvent(new CustomEvent('urdf-processed', { bubbles: true, cancelable: true, composed: true }));
                this.dispatchEvent(new CustomEvent('geometry-loaded', { bubbles: true, cancelable: true, composed: true }));

                this.recenter();

            };

            if (this.urlModifierFunc) {

                manager.setURLModifier(this.urlModifierFunc);

            }

            const loader = new URDFLoader(manager);
            loader.packages = pkg;
            loader.loadMeshCb = this.loadMeshFunc;
            loader.fetchOptions = { mode: 'cors', credentials: 'same-origin' };
            loader.parseCollision = true;
            loader.load(urdf, model => robot = model);

        }

    }

    _updateCollisionVisibility() {

        const showCollision = this.showCollision;
        const collisionMaterial = this._collisionMaterial;
        const robot = this.robot;

        if (robot === null) return;

        const colliders = [];
        robot.traverse(c => {

            if (c.isURDFCollider) {

                c.visible = showCollision;
                colliders.push(c);

            }

        });

        colliders.forEach(coll => {

            coll.traverse(c => {

                if (c.isMesh) {

                    c.raycast = emptyRaycast;
                    c.material = collisionMaterial;
                    c.castShadow = false;

                }

            });

        });

    }

    // Watch the coordinate frame and update the
    // rotation of the scene to match
    _setUp(up) {

        if (!up) up = '+Z';
        up = up.toUpperCase();
        const sign = up.replace(/[^-+]/g, '')[0] || '+';
        const axis = up.replace(/[^XYZ]/gi, '')[0] || 'Z';

        const PI = Math.PI;
        const HALFPI = PI / 2;
        if (axis === 'X') this.world.rotation.set(0, 0, sign === '+' ? HALFPI : -HALFPI);
        if (axis === 'Z') this.world.rotation.set(sign === '+' ? -HALFPI : HALFPI, 0, 0);
        if (axis === 'Y') this.world.rotation.set(sign === '+' ? 0 : PI, 0, 0);

    }

    // Updates the current robot's angles to ignore
    // joint limits or not
    _setIgnoreLimits(ignore, dispatch = false) {

        if (this.robot) {

            Object
                .values(this.robot.joints)
                .forEach(joint => {

                    joint.ignoreLimits = ignore;
                    joint.setJointValue(...joint.jointValue);

                });

        }

        if (dispatch) {

            this.dispatchEvent(new CustomEvent('ignore-limits-change', { bubbles: true, cancelable: true, composed: true }));

        }

    }

}

export default URDFViewer;
