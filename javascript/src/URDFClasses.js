import { Euler, Object3D, Vector3 } from 'three';

const _tempAxis = new Vector3();
const _tempEuler = new Euler();

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

class URDFLink extends URDFBase {

    constructor(...args) {

        super(...args);
        this.isURDFLink = true;
        this.type = 'URDFLink';

    }

}

class URDFJoint extends URDFBase {

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

    get angle() {

        return this.jointValue[0];

    }

    constructor(...args) {

        super(...args);

        this.isURDFJoint = true;
        this.type = 'URDFJoint';

        this.jointValue = null;
        this.jointType = 'fixed';
        this.axis = new Vector3(1, 0, 0);
        this.limit = { lower: 0, upper: 0 };
        this.ignoreLimits = false;

        this.origPosition = null;
        this.origQuaternion = null;

        this.mimicJoints = [];

    }

    /* Overrides */
    copy(source, recursive) {

        super.copy(source, recursive);

        this.jointType = source.jointType;
        this.axis = source.axis.clone();
        this.limit.lower = source.limit.lower;
        this.limit.upper = source.limit.upper;
        this.ignoreLimits = false;

        this.jointValue = [...source.jointValue];

        this.origPosition = source.origPosition ? source.origPosition.clone() : null;
        this.origQuaternion = source.origQuaternion ? source.origQuaternion.clone() : null;

        this.mimicJoints = [...source.mimicJoints];

        return this;

    }

    /* Public Functions */
    /**
     * Set the value or values of this joint
     * @param {...number|null} values The joint value components to set, optionally null for no-op
     * @returns {boolean} Whether the invocation of this function resulted in an actual change to the joint value
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

            case 'floating':
                // no-op if all values are identical to existing value or are null
                if (this.jointValue.every((value, index) => values[index] === value || values[index] === null)) return didUpdate;
                // anonymous block scope to prevent variable name clobbering with other cases in the switch
                {
                    // Floating joints have six degrees of freedom: X, Y, Z, R, P, Y.
                    const [posX, posY, posZ, roll, pitch, yaw] = values;
                    this.position.copy(this.origPosition);
                    // Respect origin RPY when setting position
                    if (posX !== this.jointValue[0] && posX !== null) {
                        _tempAxis.set(1, 0, 0).applyEuler(this.rotation);
                        this.position.addScaledVector(_tempAxis, posX);
                        didUpdate = true;
                    }
                    if (posY !== this.jointValue[1] && posY !== null) {
                        _tempAxis.set(0, 1, 0).applyEuler(this.rotation);
                        this.position.addScaledVector(_tempAxis, posY);
                        didUpdate = true;
                    }
                    if (posZ !== this.jointValue[2] && posZ !== null) {
                        _tempAxis.set(0, 0, 1).applyEuler(this.rotation);
                        this.position.addScaledVector(_tempAxis, posZ);
                        didUpdate = true;
                    }

                    // Doing the math to set each individual Euler value seemed more awkward than just handling all this in the same case using ternaries.
                    if (roll !== this.jointValue[3] || pitch !== this.jointValue[4] || yaw !== this.jointValue[5]) {
                        this.jointValue[3] = roll !== null ? roll : this.jointValue[3];
                        this.jointValue[4] = pitch !== null ? pitch : this.jointValue[4];
                        this.jointValue[5] = yaw !== null ? yaw : this.jointValue[5];
                        this.quaternion.setFromEuler(
                            _tempEuler.set(
                                this.jointValue[3],
                                this.jointValue[4],
                                this.jointValue[5],
                                'XYZ',
                            ),
                        ).premultiply(this.origQuaternion);
                        didUpdate = true;
                    }
                }

                this.matrixWorldNeedsUpdate = didUpdate;
                return didUpdate;

            case 'planar':
                // no-op if all values are identical to existing value or are null
                if (this.jointValue.every((value, index) => values[index] === value || values[index] === null)) return didUpdate;

                // Planar joints have three degrees of freedom: X distance, Y distance, Z rotation.
                const [posX, posY, rotZ] = values;

                // Respect existing RPY when modifying the position of the X,Y axes
                this.position.copy(this.origPosition);
                if (posX !== null) {
                    _tempAxis.set(1, 0, 0).applyEuler(this.rotation);
                    this.position.addScaledVector(_tempAxis, posX);
                    this.jointValue[0] = posX;
                    didUpdate = true;
                }
                if (posY !== null) {
                    _tempAxis.set(0, 1, 0).applyEuler(this.rotation);
                    this.position.addScaledVector(_tempAxis, posY);
                    this.jointValue[1] = posY;
                    didUpdate = true;
                }
                if (rotZ !== null) {
                    this.quaternion
                        .setFromAxisAngle(this.axis, rotZ)
                        .premultiply(this.origQuaternion);
                    this.jointValue[2] = rotZ;
                    didUpdate = true;
                }

                this.matrixWorldNeedsUpdate = didUpdate;
                return didUpdate;

        }

        return didUpdate;

    }

}

class URDFMimicJoint extends URDFJoint {

    constructor(...args) {

        super(...args);
        this.type = 'URDFMimicJoint';
        this.mimicJoint = null;
        this.offset = 0;
        this.multiplier = 1;

    }

    updateFromMimickedJoint(...values) {

        const modifiedValues = values.map(x => x * this.multiplier + this.offset);
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

class URDFRobot extends URDFLink {

    constructor(...args) {

        super(...args);
        this.isURDFRobot = true;
        this.urdfNode = null;

        this.urdfRobotNode = null;
        this.robotName = null;

        this.links = null;
        this.joints = null;
        this.colliders = null;
        this.visual = null;
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

    setJointValue(jointName, ...angle) {

        const joint = this.joints[jointName];
        if (joint) {

            return joint.setJointValue(...angle);

        }

        return false;
    }

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
