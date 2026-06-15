(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory(require('three'), require('three/examples/jsm/loaders/STLLoader.js'), require('three/examples/jsm/loaders/ColladaLoader.js')) :
    typeof define === 'function' && define.amd ? define(['three', 'three/examples/jsm/loaders/STLLoader.js', 'three/examples/jsm/loaders/ColladaLoader.js'], factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, global.URDFLoader = factory(global.THREE, global.THREE, global.THREE));
})(this, (function (THREE, STLLoader_js, ColladaLoader_js) { 'use strict';

    function _interopNamespaceDefault(e) {
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
        n.default = e;
        return Object.freeze(n);
    }

    var THREE__namespace = /*#__PURE__*/_interopNamespaceDefault(THREE);

    const _tempAxis = new THREE.Vector3();
    const _tempEuler = new THREE.Euler();
    const _tempTransform = new THREE.Matrix4();
    const _tempOrigTransform = new THREE.Matrix4();
    const _tempQuat = new THREE.Quaternion();
    const _tempScale = new THREE.Vector3(1.0, 1.0, 1.0);
    const _tempPosition = new THREE.Vector3();

    class URDFBase extends THREE.Object3D {

        constructor(...args) {

            super(...args);
            this.urdfNode = null;
            this.urdfName = '';

        }

        copy(source, recursive) {

            super.copy(source, recursive);

            this.urdfNode = source.urdfNode;
            this.urdfName = source.urdfName;

            return this;

        }

    }

    class URDFCollider extends URDFBase {

        constructor(...args) {

            super(...args);
            this.isURDFCollider = true;
            this.type = 'URDFCollider';

        }

    }

    class URDFVisual extends URDFBase {

        constructor(...args) {

            super(...args);
            this.isURDFVisual = true;
            this.type = 'URDFVisual';

        }

    }

    /**
     * An object representing a robot link.
     * @extends Object3D
     */
    class URDFLink extends URDFBase {

        constructor(...args) {

            super(...args);
            this.isURDFLink = true;
            this.type = 'URDFLink';

            /**
             * The name of the link.
             * @type {string}
             */
            this.name = '';

            /**
             * The inertial properties of the link parsed from the `<inertial>` element. All fields default to zero if not specified in the URDF.
             * @type {Object}
             * @property {number} [mass=0]
             * @property {number[]} [origin.xyz]
             * @property {number[]} [origin.rpy]
             * @property {number} [inertia.ixx=0]
             * @property {number} [inertia.ixy=0]
             * @property {number} [inertia.ixz=0]
             * @property {number} [inertia.iyy=0]
             * @property {number} [inertia.iyz=0]
             * @property {number} [inertia.izz=0]
             */
            this.inertial = {
                mass: 0,
                origin: { xyz: [0, 0, 0], rpy: [0, 0, 0] },
                inertia: { ixx: 0, ixy: 0, ixz: 0, iyy: 0, iyz: 0, izz: 0 },
            };

        }

        copy(source, recursive) {

            super.copy(source, recursive);

            this.inertial = {
                mass: source.inertial.mass,
                origin: {
                    xyz: [...source.inertial.origin.xyz],
                    rpy: [...source.inertial.origin.rpy],
                },
                inertia: { ...source.inertial.inertia },
            };

            return this;

        }

    }

    /**
     * An object representing a robot joint.
     * @extends Object3D
     */
    class URDFJoint extends URDFBase {

        /**
         * The type of joint. Can only be the URDF types of joints.
         * @type {string}
         */
        get jointType() {

            return this._jointType;

        }

        set jointType(v) {

            if (this.jointType === v) return;
            this._jointType = v;
            this.matrixWorldNeedsUpdate = true;
            switch (v) {

                case 'fixed':
                    this.jointValue = [];
                    break;

                case 'continuous':
                case 'revolute':
                case 'prismatic':
                    this.jointValue = new Array(1).fill(0);
                    break;

                case 'planar':
                    // Planar joints are, 3dof: position XY and rotation Z.
                    this.jointValue = new Array(3).fill(0);
                    this.axis = new THREE.Vector3(0, 0, 1);
                    break;

                case 'floating':
                    this.jointValue = new Array(6).fill(0);
                    break;

            }

        }

        /**
         * The current position or angle for joint.
         * @type {number}
         * @readonly
         */
        get angle() {

            return this.jointValue[0];

        }

        constructor(...args) {

            super(...args);

            this.isURDFJoint = true;
            this.type = 'URDFJoint';

            /**
             * The name of the joint.
             * @type {string}
             */
            this.name = '';

            this.jointValue = null;
            this.jointType = 'fixed';

            /**
             * The axis described for the joint.
             * @type {Vector3}
             */
            this.axis = new THREE.Vector3(1, 0, 0);

            /**
             * An object containing the `lower` and `upper` position constraints, as well as the `effort` and `velocity` limits for the joint. All fields default to zero if not specified in the URDF.
             * @type {Object}
             * @property {number} [lower=0]
             * @property {number} [upper=0]
             * @property {number} [effort=0]
             * @property {number} [velocity=0]
             */
            this.limit = { lower: 0, upper: 0, effort: 0, velocity: 0 };

            /**
             * Whether or not to ignore the joint limits when setting a the joint position.
             * @type {boolean}
             */
            this.ignoreLimits = false;

            this.origPosition = null;
            this.origQuaternion = null;

            /**
             * A list of joints which mimic this joint. These joints are updated whenever this joint is.
             * @type {URDFMimicJoint[]}
             */
            this.mimicJoints = [];

        }

        /* Overrides */
        copy(source, recursive) {

            super.copy(source, recursive);

            this.jointType = source.jointType;
            this.axis = source.axis.clone();
            this.limit.lower = source.limit.lower;
            this.limit.upper = source.limit.upper;
            this.limit.effort = source.limit.effort;
            this.limit.velocity = source.limit.velocity;
            this.ignoreLimits = false;

            this.jointValue = [...source.jointValue];

            this.origPosition = source.origPosition ? source.origPosition.clone() : null;
            this.origQuaternion = source.origQuaternion ? source.origQuaternion.clone() : null;

            this.mimicJoints = [...source.mimicJoints];

            return this;

        }

        /* Public Functions */
        /**
         * Sets the joint value(s) for the given joint. The interpretation of the value depends on the
         * joint type. If the joint value specifies an angle it must be in radians. If the value
         * specifies a distance, it must be in meters. Passing null for any component of the value will
         * skip updating that particular component.
         *
         * Returns true if the joint or any of its mimicking joints changed.
         * @param {...number|null} values The joint value components to set, optionally null for no-op
         * @returns {boolean} Returns true if the joint or any of its mimicking joints changed.
         */
        setJointValue(...values) {

            // Parse all incoming values into numbers except null, which we treat as a no-op for that value component.
            values = values.map(v => v === null ? null : parseFloat(v));

            if (!this.origPosition || !this.origQuaternion) {

                this.origPosition = this.position.clone();
                this.origQuaternion = this.quaternion.clone();

            }

            let didUpdate = false;

            this.mimicJoints.forEach(joint => {

                didUpdate = joint.updateFromMimickedJoint(...values) || didUpdate;

            });

            switch (this.jointType) {

                case 'fixed': {

                    return didUpdate;

                }
                case 'continuous':
                case 'revolute': {

                    let angle = values[0];
                    if (angle == null) return didUpdate;
                    if (angle === this.jointValue[0]) return didUpdate;

                    if (!this.ignoreLimits && this.jointType === 'revolute') {

                        angle = Math.min(this.limit.upper, angle);
                        angle = Math.max(this.limit.lower, angle);

                    }

                    this.quaternion
                        .setFromAxisAngle(this.axis, angle)
                        .premultiply(this.origQuaternion);

                    if (this.jointValue[0] !== angle) {

                        this.jointValue[0] = angle;
                        this.matrixWorldNeedsUpdate = true;
                        return true;

                    } else {

                        return didUpdate;

                    }

                }

                case 'prismatic': {

                    let pos = values[0];
                    if (pos == null) return didUpdate;
                    if (pos === this.jointValue[0]) return didUpdate;

                    if (!this.ignoreLimits) {

                        pos = Math.min(this.limit.upper, pos);
                        pos = Math.max(this.limit.lower, pos);

                    }

                    this.position.copy(this.origPosition);
                    _tempAxis.copy(this.axis).applyEuler(this.rotation);
                    this.position.addScaledVector(_tempAxis, pos);

                    if (this.jointValue[0] !== pos) {

                        this.jointValue[0] = pos;
                        this.matrixWorldNeedsUpdate = true;
                        return true;

                    } else {

                        return didUpdate;

                    }

                }

                case 'floating': {

                    // no-op if all values are identical to existing value or are null
                    if (this.jointValue.every((value, index) => values[index] === value || values[index] === null)) return didUpdate;
                    // Floating joints have six degrees of freedom: X, Y, Z, R, P, Y.
                    this.jointValue[0] = values[0] !== null ? values[0] : this.jointValue[0];
                    this.jointValue[1] = values[1] !== null ? values[1] : this.jointValue[1];
                    this.jointValue[2] = values[2] !== null ? values[2] : this.jointValue[2];
                    this.jointValue[3] = values[3] !== null ? values[3] : this.jointValue[3];
                    this.jointValue[4] = values[4] !== null ? values[4] : this.jointValue[4];
                    this.jointValue[5] = values[5] !== null ? values[5] : this.jointValue[5];

                    // Compose transform of joint origin and transform due to joint values
                    _tempOrigTransform.compose(this.origPosition, this.origQuaternion, _tempScale);
                    _tempQuat.setFromEuler(
                        _tempEuler.set(
                            this.jointValue[3],
                            this.jointValue[4],
                            this.jointValue[5],
                            'XYZ',
                        ),
                    );
                    _tempPosition.set(this.jointValue[0], this.jointValue[1], this.jointValue[2]);
                    _tempTransform.compose(_tempPosition, _tempQuat, _tempScale);

                    // Calcualte new transform
                    _tempOrigTransform.premultiply(_tempTransform);
                    this.position.setFromMatrixPosition(_tempOrigTransform);
                    this.rotation.setFromRotationMatrix(_tempOrigTransform);

                    this.matrixWorldNeedsUpdate = true;
                    return true;
                }

                case 'planar': {

                    // no-op if all values are identical to existing value or are null
                    if (this.jointValue.every((value, index) => values[index] === value || values[index] === null)) return didUpdate;

                    this.jointValue[0] = values[0] !== null ? values[0] : this.jointValue[0];
                    this.jointValue[1] = values[1] !== null ? values[1] : this.jointValue[1];
                    this.jointValue[2] = values[2] !== null ? values[2] : this.jointValue[2];

                    // Compose transform of joint origin and transform due to joint values
                    _tempOrigTransform.compose(this.origPosition, this.origQuaternion, _tempScale);
                    _tempQuat.setFromAxisAngle(this.axis, this.jointValue[2]);
                    _tempPosition.set(this.jointValue[0], this.jointValue[1], 0.0);
                    _tempTransform.compose(_tempPosition, _tempQuat, _tempScale);

                    // Calculate new transform
                    _tempOrigTransform.premultiply(_tempTransform);
                    this.position.setFromMatrixPosition(_tempOrigTransform);
                    this.rotation.setFromRotationMatrix(_tempOrigTransform);

                    this.matrixWorldNeedsUpdate = true;
                    return true;
                }

            }

            return didUpdate;

        }

    }

    /**
     * An object representing a robot joint which mimics another existing joint. The value of this
     * joint can be computed as `value = multiplier * other_joint_value + offset`.
     * @extends URDFJoint
     */
    class URDFMimicJoint extends URDFJoint {

        constructor(...args) {

            super(...args);
            this.type = 'URDFMimicJoint';

            /**
             * The name of the joint which this joint mimics.
             * @type {string}
             */
            this.mimicJoint = null;

            /**
             * Specifies the offset to add in the formula above. Defaults to 0 (radians for revolute joints, meters for prismatic joints).
             * @type {number}
             * @default 0
             */
            this.offset = 0;

            /**
             * Specifies the multiplicative factor in the formula above. Defaults to 1.0.
             * @type {number}
             * @default 1
             */
            this.multiplier = 1;

        }

        updateFromMimickedJoint(...values) {

            const modifiedValues = values.map(x => {

                if (x === null) {

                    return null;

                } else {

                    return x * this.multiplier + this.offset;

                }

            });

            return super.setJointValue(...modifiedValues);

        }

        /* Overrides */
        copy(source, recursive) {

            super.copy(source, recursive);

            this.mimicJoint = source.mimicJoint;
            this.offset = source.offset;
            this.multiplier = source.multiplier;

            return this;

        }

    }

    /**
     * Object that describes the URDF Robot.
     * @extends URDFLink
     */
    class URDFRobot extends URDFLink {

        constructor(...args) {

            super(...args);
            this.isURDFRobot = true;
            this.urdfNode = null;

            this.urdfRobotNode = null;

            /**
             * The name of the robot described in the `<robot>` tag.
             * @type {string}
             */
            this.robotName = null;

            /**
             * A dictionary of `linkName : URDFLink` with all links in the robot.
             * @type {Object.<string, URDFLink>}
             */
            this.links = null;

            /**
             * A dictionary of `jointName : URDFJoint` with all joints in the robot.
             * @type {Object.<string, URDFJoint>}
             */
            this.joints = null;

            /**
             * A dictionary of `colliderName : Object3D` with all collision nodes in the robot.
             * @type {Object.<string, Object3D>}
             */
            this.colliders = null;

            /**
             * A dictionary of `visualName : Object3D` with all visual nodes in the robot.
             * @type {Object.<string, Object3D>}
             */
            this.visual = null;

            /**
             * A dictionary of all the named frames in the robot including links, joints, colliders, and visual.
             * @type {Object.<string, Object3D>}
             */
            this.frames = null;

        }

        copy(source, recursive) {

            super.copy(source, recursive);

            this.urdfRobotNode = source.urdfRobotNode;
            this.robotName = source.robotName;

            this.links = {};
            this.joints = {};
            this.colliders = {};
            this.visual = {};

            this.traverse(c => {

                if (c.isURDFJoint && c.urdfName in source.joints) {

                    this.joints[c.urdfName] = c;

                }

                if (c.isURDFLink && c.urdfName in source.links) {

                    this.links[c.urdfName] = c;

                }

                if (c.isURDFCollider && c.urdfName in source.colliders) {

                    this.colliders[c.urdfName] = c;

                }

                if (c.isURDFVisual && c.urdfName in source.visual) {

                    this.visual[c.urdfName] = c;

                }

            });

            // Repair mimic joint references once we've re-accumulated all our joint data
            for (const joint in this.joints) {
                this.joints[joint].mimicJoints = this.joints[joint].mimicJoints.map((mimicJoint) => this.joints[mimicJoint.name]);
            }

            this.frames = {
                ...this.colliders,
                ...this.visual,
                ...this.links,
                ...this.joints,
            };

            return this;

        }

        getFrame(name) {

            return this.frames[name];

        }

        /**
         * Sets the joint value of the joint with the given name. Returns true if the joint changed.
         * @param {string} name The name of the joint to set
         * @param {...number} angle The value(s) to set
         * @returns {boolean} Returns true if the joint changed.
         */
        setJointValue(jointName, ...angle) {

            const joint = this.joints[jointName];
            if (joint) {

                return joint.setJointValue(...angle);

            }

            return false;
        }

        /**
         * Sets the joint values for all the joints in the dictionary indexed by joint name. Returns true if a joint changed.
         * @param {Object} jointValueDictionary A dictionary of joint names to values
         * @returns {boolean} Returns true if a joint changed.
         */
        setJointValues(values) {

            let didChange = false;
            for (const name in values) {

                const value = values[name];
                if (Array.isArray(value)) {

                    didChange = this.setJointValue(name, ...value) || didChange;

                } else {

                    didChange = this.setJointValue(name, value) || didChange;

                }

            }

            return didChange;

        }

    }

    /** @import { Object3D, LoadingManager, Material } from 'three' */

    /*
    Reference coordinate frames for THREE.js and ROS.
    Both coordinate systems are right handed so the URDF is instantiated without
    frame transforms. The resulting model can be rotated to rectify the proper up,
    right, and forward directions

    THREE.js
       Y
       |
       |
       .-----X
     ／
    Z

    ROS URDF
           Z
           |   X
           | ／
     Y-----.

    */

    const tempQuaternion = new THREE__namespace.Quaternion();
    const tempEuler = new THREE__namespace.Euler();

    // take a vector "x y z" and process it into
    // an array [x, y, z]
    function processTuple(val) {

        if (!val) return [0, 0, 0];
        return val.trim().split(/\s+/g).map(num => parseFloat(num));

    }

    // applies a rotation a threejs object in URDF order
    function applyRotation(obj, rpy, additive = false) {

        // if additive is true the rotation is applied in
        // addition to the existing rotation
        if (!additive) obj.rotation.set(0, 0, 0);

        tempEuler.set(rpy[0], rpy[1], rpy[2], 'ZYX');
        tempQuaternion.setFromEuler(tempEuler);
        tempQuaternion.multiply(obj.quaternion);
        obj.quaternion.copy(tempQuaternion);

    }

    /**
     * Function that returns a resolved path given a ROS package name.
     * @callback PackageResolver
     * @param {string} pkg The package name
     * @returns {string} The resolved package directory path
     */

    /**
     * Called when a mesh has finished loading.
     * @callback OnMeshLoadComplete
     * @param {Object3D} obj The loaded mesh object, or null if an error occurred
     * @param {Error} [err] Error if loading failed
     */

    /**
     * Function for loading mesh files referenced by the URDF.
     * @callback MeshLoadFunc
     * @param {string} pathToModel The url to load the model from
     * @param {LoadingManager} manager The THREE.js LoadingManager used by the URDFLoader
     * @param {Material} material The material derived from the URDF `<material>` tag for this visual element, or a default material if none was specified
     * @param {OnMeshLoadComplete} onComplete Called with the mesh once the geometry has been loaded
     */

    /**
     * @callback OnURDFLoad
     * @param {URDFRobot} robot The loaded robot model
     */

    /**
     * @callback OnURDFProgress
     */

    /**
     * @callback OnURDFError
     * @param {Error} error The error that occurred
     */

    /**
     * List of options available on the URDFLoader class.
     * @typedef {Object} URDFOptions
     * @property {string|Object|PackageResolver} [packages=''] The path representing the `package://` directory(s) to load `package://` relative files. If the argument is a string it is used to replace the `package://` prefix. To specify multiple packages use an object mapping package names to paths. If set to a function it takes the package name and returns the package path.
     * @property {MeshLoadFunc} [loadMeshCb=null] An optional function that can be used to override the default mesh loading functionality. The default loader is specified at `URDFLoader.defaultMeshLoader`. `pathToModel` is the url to load the model from. `manager` is the THREE.js `LoadingManager` used by the `URDFLoader`. `material` is the material derived from the URDF `<material>` tag and should be applied to meshes that have no internally declared material. `onComplete` is called with the mesh once the geometry has been loaded.
     * @property {Object} [fetchOptions=null] An optional object with the set of options to pass to the `fetch` function call used to load the URDF file.
     * @property {string} [workingPath=''] The path to load geometry relative to. Defaults to the path relative to the loaded URDF file.
     * @property {boolean} [parseVisual=true] An optional value that can be used to enable / disable loading meshes for links from the `visual` nodes. Defaults to true.
     * @property {boolean} [parseCollision=false] An optional value that can be used to enable / disable loading meshes for links from the `collision` nodes. Defaults to false.
     */

    /**
     * Loads and builds the specified URDF robot in THREE.js.
     */
    class URDFLoader {

        /**
         * Constructor. Manager is used for transforming load URLs and tracking downloads.
         * @param {LoadingManager} [manager] The THREE.js LoadingManager.
         */
        constructor(manager) {

            this.manager = manager || THREE__namespace.DefaultLoadingManager;
            this.loadMeshCb = this.defaultMeshLoader.bind(this);
            this.parseVisual = true;
            this.parseCollision = false;
            this.packages = '';
            this.workingPath = '';
            this.fetchOptions = {};

        }

        /* Public API */
        /**
         * Promise-wrapped version of `load`.
         * @param {string} urdfpath The path to the URDF within the package OR absolute
         * @returns {Promise<URDFRobot>}
         */
        loadAsync(urdf) {

            return new Promise((resolve, reject) => {

                this.load(urdf, resolve, null, reject);

            });

        }

        /**
         * Loads and builds the specified URDF robot in THREE.js. Takes a path to load the urdf file
         * from, a func to call when the robot has loaded, and a set of options.
         * @param {string} urdfpath The path to the URDF within the package OR absolute
         * @param {OnURDFLoad} onComplete Callback that is passed the model once loaded
         * @param {OnURDFProgress} [onProgress] Called during loading
         * @param {OnURDFError} [onError] Called if an error occurs
         * @returns {void}
         */
        load(urdf, onComplete, onProgress, onError) {

            // Check if a full URI is specified before
            // prepending the package info
            const manager = this.manager;
            const workingPath = THREE__namespace.LoaderUtils.extractUrlBase(urdf);
            const urdfPath = this.manager.resolveURL(urdf);

            manager.itemStart(urdfPath);

            fetch(urdfPath, this.fetchOptions)
                .then(res => {

                    if (res.ok) {

                        if (onProgress) {

                            onProgress(null);

                        }
                        return res.text();

                    } else {

                        throw new Error(`URDFLoader: Failed to load url '${ urdfPath }' with error code ${ res.status } : ${ res.statusText }.`);

                    }

                })
                .then(data => {

                    const model = this.parse(data, this.workingPath || workingPath);
                    onComplete(model);
                    manager.itemEnd(urdfPath);

                })
                .catch(e => {

                    if (onError) {

                        onError(e);

                    } else {

                        console.error('URDFLoader: Error loading file.', e);

                    }
                    manager.itemError(urdfPath);
                    manager.itemEnd(urdfPath);

                });

        }

        /**
         * Parses URDF content and returns the robot model. Takes an XML string to parse and a set of
         * options. If the XML document has already been parsed using `DOMParser` then either the
         * returned `Document` or root `Element` can be passed into this function in place of the
         * string, as well.
         *
         * Note that geometry will not necessarily be loaded when the robot is returned.
         * @param {string|Document|Element} urdfContent The URDF content to parse
         * @returns {URDFRobot}
         */
        parse(content, workingPath = this.workingPath) {

            const packages = this.packages;
            const loadMeshCb = this.loadMeshCb;
            const parseVisual = this.parseVisual;
            const parseCollision = this.parseCollision;
            const manager = this.manager;
            const linkMap = {};
            const jointMap = {};
            const materialMap = {};

            // Resolves the path of mesh files
            function resolvePath(path) {

                if (!/^package:\/\//.test(path)) {

                    return workingPath ? workingPath + path : path;

                }

                // Remove "package://" keyword and split meshPath at the first slash
                const [targetPkg, relPath] = path.replace(/^package:\/\//, '').split(/\/(.+)/);

                if (typeof packages === 'string') {

                    // "pkg" is one single package
                    if (packages.endsWith(targetPkg)) {

                        // "pkg" is the target package
                        return packages + '/' + relPath;

                    } else {

                        // Assume "pkg" is the target package's parent directory
                        return packages + '/' + targetPkg + '/' + relPath;

                    }

                } else if (typeof packages === 'function') {

                    return packages(targetPkg) + '/' + relPath;

                } else if (typeof packages === 'object') {

                    // "pkg" is a map of packages
                    if (targetPkg in packages) {

                        return packages[targetPkg] + '/' + relPath;

                    } else {

                        console.error(`URDFLoader : ${ targetPkg } not found in provided package list.`);
                        return null;

                    }

                }

            }

            // Process the URDF text format
            function processUrdf(data) {

                let children;
                if (data instanceof Document) {

                    children = [ ...data.children ];

                } else if (data instanceof Element) {

                    children = [ data ];

                } else {

                    const parser = new DOMParser();
                    const urdf = parser.parseFromString(data, 'text/xml');
                    children = [ ...urdf.children ];

                }

                const robotNode = children.filter(c => c.nodeName === 'robot').pop();
                return processRobot(robotNode);

            }

            // Process the <robot> node
            function processRobot(robot) {

                const robotNodes = [ ...robot.children ];
                const links = robotNodes.filter(c => c.nodeName.toLowerCase() === 'link');
                const joints = robotNodes.filter(c => c.nodeName.toLowerCase() === 'joint');
                const materials = robotNodes.filter(c => c.nodeName.toLowerCase() === 'material');
                const obj = new URDFRobot();

                obj.robotName = robot.getAttribute('name');
                obj.urdfRobotNode = robot;

                // Create the <material> map
                materials.forEach(m => {

                    const name = m.getAttribute('name');
                    materialMap[name] = processMaterial(m);

                });

                // Create the <link> map
                const visualMap = {};
                const colliderMap = {};
                links.forEach(l => {

                    const name = l.getAttribute('name');
                    const isRoot = robot.querySelector(`child[link="${ name }"]`) === null;
                    linkMap[name] = processLink(l, visualMap, colliderMap, isRoot ? obj : null);

                });

                // Create the <joint> map
                joints.forEach(j => {

                    const name = j.getAttribute('name');
                    jointMap[name] = processJoint(j);

                });

                obj.joints = jointMap;
                obj.links = linkMap;
                obj.colliders = colliderMap;
                obj.visual = visualMap;

                // Link up mimic joints
                const jointList = Object.values(jointMap);
                jointList.forEach(j => {

                    if (j instanceof URDFMimicJoint) {

                        jointMap[j.mimicJoint].mimicJoints.push(j);

                    }

                });

                // Detect infinite loops of mimic joints
                jointList.forEach(j => {

                    const uniqueJoints = new Set();
                    const iterFunction = joint => {

                        if (uniqueJoints.has(joint)) {

                            throw new Error('URDFLoader: Detected an infinite loop of mimic joints.');

                        }

                        uniqueJoints.add(joint);
                        joint.mimicJoints.forEach(j => {

                            iterFunction(j);

                        });

                    };

                    iterFunction(j);
                });

                obj.frames = {
                    ...colliderMap,
                    ...visualMap,
                    ...linkMap,
                    ...jointMap,
                };

                return obj;

            }

            // Process joint nodes and parent them
            function processJoint(joint) {

                const children = [ ...joint.children ];
                const jointType = joint.getAttribute('type');

                let obj;

                const mimicTag = children.find(n => n.nodeName.toLowerCase() === 'mimic');
                if (mimicTag) {

                    obj = new URDFMimicJoint();
                    obj.mimicJoint = mimicTag.getAttribute('joint');
                    obj.multiplier = parseFloat(mimicTag.getAttribute('multiplier') || 1.0);
                    obj.offset = parseFloat(mimicTag.getAttribute('offset') || 0.0);

                } else {

                    obj = new URDFJoint();

                }

                obj.urdfNode = joint;
                obj.name = joint.getAttribute('name');
                obj.urdfName = obj.name;
                obj.jointType = jointType;

                let parent = null;
                let child = null;
                let xyz = [0, 0, 0];
                let rpy = [0, 0, 0];

                // Extract the attributes
                children.forEach(n => {

                    const type = n.nodeName.toLowerCase();
                    if (type === 'origin') {

                        xyz = processTuple(n.getAttribute('xyz'));
                        rpy = processTuple(n.getAttribute('rpy'));

                    } else if (type === 'child') {

                        child = linkMap[n.getAttribute('link')];

                    } else if (type === 'parent') {

                        parent = linkMap[n.getAttribute('link')];

                    } else if (type === 'limit') {

                        obj.limit.lower = parseFloat(n.getAttribute('lower') || obj.limit.lower);
                        obj.limit.upper = parseFloat(n.getAttribute('upper') || obj.limit.upper);
                        obj.limit.effort = parseFloat(n.getAttribute('effort') || obj.limit.effort);
                        obj.limit.velocity = parseFloat(n.getAttribute('velocity') || obj.limit.velocity);

                    }
                });

                // Join the links
                parent.add(obj);
                obj.add(child);
                applyRotation(obj, rpy);
                obj.position.set(xyz[0], xyz[1], xyz[2]);

                // Set up the rotate function
                const axisNode = children.filter(n => n.nodeName.toLowerCase() === 'axis')[0];

                if (axisNode) {

                    const axisXYZ = axisNode.getAttribute('xyz').split(/\s+/g).map(num => parseFloat(num));
                    obj.axis = new THREE__namespace.Vector3(axisXYZ[0], axisXYZ[1], axisXYZ[2]);
                    obj.axis.normalize();

                }

                return obj;

            }

            // Process the <link> nodes
            function processLink(link, visualMap, colliderMap, target = null) {

                if (target === null) {

                    target = new URDFLink();

                }

                const children = [ ...link.children ];
                target.name = link.getAttribute('name');
                target.urdfName = target.name;
                target.urdfNode = link;

                // Parse inertial properties
                const inertialNode = children.find(n => n.nodeName.toLowerCase() === 'inertial');
                if (inertialNode) {

                    [ ...inertialNode.children ].forEach(n => {

                        const type = n.nodeName.toLowerCase();
                        if (type === 'origin') {

                            target.inertial.origin.xyz = processTuple(n.getAttribute('xyz'));
                            target.inertial.origin.rpy = processTuple(n.getAttribute('rpy'));

                        } else if (type === 'mass') {

                            target.inertial.mass = parseFloat(n.getAttribute('value')) || 0;

                        } else if (type === 'inertia') {

                            target.inertial.inertia.ixx = parseFloat(n.getAttribute('ixx')) || 0;
                            target.inertial.inertia.ixy = parseFloat(n.getAttribute('ixy')) || 0;
                            target.inertial.inertia.ixz = parseFloat(n.getAttribute('ixz')) || 0;
                            target.inertial.inertia.iyy = parseFloat(n.getAttribute('iyy')) || 0;
                            target.inertial.inertia.iyz = parseFloat(n.getAttribute('iyz')) || 0;
                            target.inertial.inertia.izz = parseFloat(n.getAttribute('izz')) || 0;

                        }

                    });

                }

                if (parseVisual) {

                    const visualNodes = children.filter(n => n.nodeName.toLowerCase() === 'visual');
                    visualNodes.forEach(vn => {

                        const v = processLinkElement(vn, materialMap);
                        target.add(v);

                        if (vn.hasAttribute('name')) {

                            const name = vn.getAttribute('name');
                            v.name = name;
                            v.urdfName = name;
                            visualMap[name] = v;

                        }

                    });

                }

                if (parseCollision) {

                    const collisionNodes = children.filter(n => n.nodeName.toLowerCase() === 'collision');
                    collisionNodes.forEach(cn => {

                        const c = processLinkElement(cn);
                        target.add(c);

                        if (cn.hasAttribute('name')) {

                            const name = cn.getAttribute('name');
                            c.name = name;
                            c.urdfName = name;
                            colliderMap[name] = c;

                        }

                    });

                }

                return target;

            }

            function processMaterial(node) {

                const matNodes = [ ...node.children ];
                const material = new THREE__namespace.MeshPhongMaterial();

                material.name = node.getAttribute('name') || '';
                matNodes.forEach(n => {

                    const type = n.nodeName.toLowerCase();
                    if (type === 'color') {

                        const rgba =
                            n
                                .getAttribute('rgba')
                                .split(/\s/g)
                                .map(v => parseFloat(v));

                        material.color.setRGB(rgba[0], rgba[1], rgba[2]);
                        material.opacity = rgba[3];
                        material.transparent = rgba[3] < 1;
                        material.depthWrite = !material.transparent;

                    } else if (type === 'texture') {

                        // The URDF spec does not require that the <texture/> tag include
                        // a filename attribute so skip loading the texture if not provided.
                        const filename = n.getAttribute('filename');
                        if (filename) {

                            const loader = new THREE__namespace.TextureLoader(manager);
                            const filePath = resolvePath(filename);
                            material.map = loader.load(filePath);
                            material.map.colorSpace = THREE__namespace.SRGBColorSpace;

                        }

                    }
                });

                return material;

            }

            // Process the visual and collision nodes into meshes
            function processLinkElement(vn, materialMap = {}) {

                const isCollisionNode = vn.nodeName.toLowerCase() === 'collision';
                const children = [ ...vn.children ];
                let material = null;

                // get the material first
                const materialNode = children.filter(n => n.nodeName.toLowerCase() === 'material')[0];
                if (materialNode) {

                    const name = materialNode.getAttribute('name');
                    if (name && name in materialMap) {

                        material = materialMap[name];

                    } else {

                        material = processMaterial(materialNode);

                    }

                } else {

                    material = new THREE__namespace.MeshPhongMaterial();

                }

                const group = isCollisionNode ? new URDFCollider() : new URDFVisual();
                group.urdfNode = vn;

                children.forEach(n => {

                    const type = n.nodeName.toLowerCase();
                    if (type === 'geometry') {

                        const geoType = n.children[0].nodeName.toLowerCase();
                        if (geoType === 'mesh') {

                            const filename = n.children[0].getAttribute('filename');
                            const filePath = resolvePath(filename);

                            // file path is null if a package directory is not provided.
                            if (filePath !== null) {

                                const scaleAttr = n.children[0].getAttribute('scale');
                                if (scaleAttr) {

                                    const scale = processTuple(scaleAttr);
                                    group.scale.set(scale[0], scale[1], scale[2]);

                                }

                                loadMeshCb(filePath, manager, material, (obj, err) => {

                                    if (err) {

                                        console.error('URDFLoader: Error loading mesh.', err);

                                    } else if (obj) {

                                        // We don't expect non identity rotations or positions. In the case of
                                        // COLLADA files the model might come in with a custom scale for unit
                                        // conversion.
                                        obj.position.set(0, 0, 0);
                                        obj.quaternion.identity();
                                        group.add(obj);

                                    }

                                });

                            }

                        } else if (geoType === 'box') {

                            const primitiveModel = new THREE__namespace.Mesh();
                            primitiveModel.geometry = new THREE__namespace.BoxGeometry(1, 1, 1);
                            primitiveModel.material = material;

                            const size = processTuple(n.children[0].getAttribute('size'));
                            primitiveModel.scale.set(size[0], size[1], size[2]);

                            group.add(primitiveModel);

                        } else if (geoType === 'sphere') {

                            const primitiveModel = new THREE__namespace.Mesh();
                            primitiveModel.geometry = new THREE__namespace.SphereGeometry(1, 30, 30);
                            primitiveModel.material = material;

                            const radius = parseFloat(n.children[0].getAttribute('radius')) || 0;
                            primitiveModel.scale.set(radius, radius, radius);

                            group.add(primitiveModel);

                        } else if (geoType === 'cylinder') {

                            const primitiveModel = new THREE__namespace.Mesh();
                            primitiveModel.geometry = new THREE__namespace.CylinderGeometry(1, 1, 1, 30);
                            primitiveModel.material = material;

                            const radius = parseFloat(n.children[0].getAttribute('radius')) || 0;
                            const length = parseFloat(n.children[0].getAttribute('length')) || 0;
                            primitiveModel.scale.set(radius, length, radius);
                            primitiveModel.rotation.set(Math.PI / 2, 0, 0);

                            group.add(primitiveModel);

                        }

                    } else if (type === 'origin') {

                        const xyz = processTuple(n.getAttribute('xyz'));
                        const rpy = processTuple(n.getAttribute('rpy'));

                        group.position.set(xyz[0], xyz[1], xyz[2]);
                        group.rotation.set(0, 0, 0);
                        applyRotation(group, rpy);

                    }

                });

                return group;

            }

            return processUrdf(content);

        }

        // Default mesh loading function
        defaultMeshLoader(path, manager, material, done) {

            if (/\.stl$/i.test(path)) {

                const loader = new STLLoader_js.STLLoader(manager);
                loader.load(path, geom => {
                    const mesh = new THREE__namespace.Mesh(geom, material || new THREE__namespace.MeshPhongMaterial());
                    done(mesh);
                }, null, err => done(null, err));

            } else if (/\.dae$/i.test(path)) {

                const loader = new ColladaLoader_js.ColladaLoader(manager);
                loader.load(path, dae => done(dae.scene), null, err => done(null, err));

            } else {

                console.warn(`URDFLoader: Could not load model at ${ path }.\nNo loader available`);

            }

        }

    }

    return URDFLoader;

}));
//# sourceMappingURL=URDFLoader.js.map
