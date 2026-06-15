import { Euler, Object3D, Vector3, Quaternion, Matrix4 } from 'three';

const _tempAxis = new Vector3();
const _tempEuler = new Euler();
const _tempTransform = new Matrix4();
const _tempOrigTransform = new Matrix4();
const _tempQuat = new Quaternion();
const _tempScale = new Vector3(1.0, 1.0, 1.0);
const _tempPosition = new Vector3();

class URDFBase extends Object3D {

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
                this.axis = new Vector3(0, 0, 1);
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
        this.axis = new Vector3(1, 0, 0);

        /**
         * An object containing the lower and upper position constraints, as well as the effort and velocity limits for the joint. All fields default to zero if not specified in the URDF.
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
     * Sets the joint value of the joint with the given name.
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
     * Sets the joint values for all the joints in the dictionary indexed by joint name.
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

export { URDFRobot, URDFLink, URDFJoint, URDFMimicJoint, URDFVisual, URDFCollider };
