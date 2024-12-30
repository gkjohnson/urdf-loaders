(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory(require('three'), require('three/examples/jsm/controls/OrbitControls.js'), require('./URDFLoader.js')) :
    typeof define === 'function' && define.amd ? define(['three', 'three/examples/jsm/controls/OrbitControls.js', './URDFLoader'], factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, global.URDFViewer = factory(global.THREE, global.THREE, global.URDFLoader));
})(this, (function (THREE, OrbitControls_js, URDFLoader) { 'use strict';

    function _interopDefaultLegacy (e) { return e && typeof e === 'object' && 'default' in e ? e : { 'default': e }; }

    function _interopNamespace(e) {
        if (e && e.__esModule) return e;
        var n = Object.create(null);
        if (e) {
            Object.keys(e).forEach(function (k) {
                if (k !== 'default') {
                    var d = Object.getOwnPropertyDescriptor(e, k);
                    Object.defineProperty(n, k, d.get ? d : {
                        enumerable: true,
                        get: function () { return e[k]; }
                    });
                }
            });
        }
        n["default"] = e;
        return Object.freeze(n);
    }

    var THREE__namespace = /*#__PURE__*/_interopNamespace(THREE);
    var URDFLoader__default = /*#__PURE__*/_interopDefaultLegacy(URDFLoader);

    const tempVec2 = new THREE__namespace.Vector2();
    const emptyRaycast = () => {};

    // urdf-viewer element
    // Loads and displays a 3D view of a URDF-formatted robot

    // Events
    // urdf-change: Fires when the URDF has finished loading and getting processed
    // urdf-processed: Fires when the URDF has finished loading and getting processed
    // geometry-loaded: Fires when all the geometry has been fully loaded
    // ignore-limits-change: Fires when the 'ignore-limits' attribute changes
    // angle-change: Fires when an angle changes
    class URDFViewer extends HTMLElement {

        static get observedAttributes() {

            return ['package', 'urdf', 'up', 'display-shadow', 'ambient-color', 'ignore-limits', 'show-collision'];

        }

        get package() { return this.getAttribute('package') || ''; }
        set package(val) { this.setAttribute('package', val); }

        get urdf() { return this.getAttribute('urdf') || ''; }
        set urdf(val) { this.setAttribute('urdf', val); }

        get ignoreLimits() { return this.hasAttribute('ignore-limits') || false; }
        set ignoreLimits(val) { val ? this.setAttribute('ignore-limits', val) : this.removeAttribute('ignore-limits'); }

        get up() { return this.getAttribute('up') || '+Z'; }
        set up(val) { this.setAttribute('up', val); }

        get displayShadow() { return this.hasAttribute('display-shadow') || false; }
        set displayShadow(val) { val ? this.setAttribute('display-shadow', '') : this.removeAttribute('display-shadow'); }

        get ambientColor() { return this.getAttribute('ambient-color') || '#8ea0a8'; }
        set ambientColor(val) { val ? this.setAttribute('ambient-color', val) : this.removeAttribute('ambient-color'); }

        get autoRedraw() { return this.hasAttribute('auto-redraw') || false; }
        set autoRedraw(val) { val ? this.setAttribute('auto-redraw', true) : this.removeAttribute('auto-redraw'); }

        get noAutoRecenter() { return this.hasAttribute('no-auto-recenter') || false; }
        set noAutoRecenter(val) { val ? this.setAttribute('no-auto-recenter', true) : this.removeAttribute('no-auto-recenter'); }

        get showCollision() { return this.hasAttribute('show-collision') || false; }
        set showCollision(val) { val ? this.setAttribute('show-collision', true) : this.removeAttribute('show-collision'); }

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
            const scene = new THREE__namespace.Scene();

            const ambientLight = new THREE__namespace.HemisphereLight(this.ambientColor, '#000');
            ambientLight.groundColor.lerp(ambientLight.color, 0.5 * Math.PI);
            ambientLight.intensity = 0.5;
            ambientLight.position.set(0, 1, 0);
            scene.add(ambientLight);

            // Light setup
            const dirLight = new THREE__namespace.DirectionalLight(0xffffff, Math.PI);
            dirLight.position.set(4, 10, 1);
            dirLight.shadow.mapSize.width = 2048;
            dirLight.shadow.mapSize.height = 2048;
            dirLight.shadow.normalBias = 0.001;
            dirLight.castShadow = true;
            scene.add(dirLight);
            scene.add(dirLight.target);

            // Renderer setup
            const renderer = new THREE__namespace.WebGLRenderer({ antialias: true, alpha: true });
            renderer.setClearColor(0xffffff);
            renderer.setClearAlpha(0);
            renderer.shadowMap.enabled = true;
            renderer.shadowMap.type = THREE__namespace.PCFSoftShadowMap;
            renderer.outputColorSpace = THREE__namespace.SRGBColorSpace;

            // Camera setup
            const camera = new THREE__namespace.PerspectiveCamera(75, 1, 0.1, 1000);
            camera.position.z = -10;

            // World setup
            const world = new THREE__namespace.Object3D();
            scene.add(world);

            const plane = new THREE__namespace.Mesh(
                new THREE__namespace.PlaneGeometry(40, 40),
                new THREE__namespace.ShadowMaterial({ side: THREE__namespace.DoubleSide, transparent: true, opacity: 0.25 }),
            );
            plane.rotation.x = -Math.PI / 2;
            plane.position.y = -0.5;
            plane.receiveShadow = true;
            plane.scale.set(10, 10, 10);
            scene.add(plane);

            // Controls setup
            const controls = new OrbitControls_js.OrbitControls(camera, renderer.domElement);
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

            this._collisionMaterial = new THREE.MeshPhongMaterial({
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

        redraw() {

            this._dirty = true;
        }

        recenter() {

            this._updateEnvironment();
            this.redraw();

        }

        // Set the joint with jointName to
        // angle in degrees
        setJointValue(jointName, ...values) {

            if (!this.robot) return;
            if (!this.robot.joints[jointName]) return;

            if (this.robot.joints[jointName].setJointValue(...values)) {

                this.redraw();
                this.dispatchEvent(new CustomEvent('angle-change', { bubbles: true, cancelable: true, detail: jointName }));

            }

        }

        setJointValues(values) {

            for (const name in values) this.setJointValue(name, values[name]);

        }

        /* Private Functions */
        // Updates the position of the plane to be at the
        // lowest point below the robot and focuses the
        // camera on the center of the scene
        _updateEnvironment() {

            const robot = this.robot;
            if (!robot) return;

            this.world.updateMatrixWorld();

            const bbox = new THREE__namespace.Box3();
            bbox.makeEmpty();
            robot.traverse(c => {
                if (c.isURDFVisual) {
                    bbox.expandByObject(c);
                }
            });

            const center = bbox.getCenter(new THREE__namespace.Vector3());
            this.controls.target.y = center.y;
            this.plane.position.y = bbox.min.y - 1e-3;

            const dirLight = this.directionalLight;
            dirLight.castShadow = this.displayShadow;

            if (this.displayShadow) {

                // Update the shadow camera rendering bounds to encapsulate the
                // model. We use the bounding sphere of the bounding box for
                // simplicity -- this could be a tighter fit.
                const sphere = bbox.getBoundingSphere(new THREE__namespace.Sphere());
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

                                            if (m instanceof THREE__namespace.MeshBasicMaterial) {

                                                m = new THREE__namespace.MeshPhongMaterial();

                                            }

                                            if (m.map) {

                                                m.map.colorSpace = THREE__namespace.SRGBColorSpace;

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
                const manager = new THREE__namespace.LoadingManager();
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

                const loader = new URDFLoader__default["default"](manager);
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

    };

    return URDFViewer;

}));
//# sourceMappingURL=urdf-viewer-element.js.map
