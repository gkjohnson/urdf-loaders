import { Object3D, Vector3, Quaternion  } from 'three';

const _tempAxis = new Vector3();

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
        // console.log('Accessing jointType:', this._jointType);
        return this._jointType;
    }

    set jointType(v) {
        // console.log('Setting jointType from', this.jointType, 'to', v);
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
                this.jointValue = new Array(2).fill(0);
                break;
            case 'floating':
                this.jointValue = new Array(6).fill(0);
                break;
        }
    }

    get angle() {
        // console.log('Getting angle:', this.jointValue[0]);
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
        this.dependentMimicJoints = [];
    }

    copy(source, recursive) {
        super.copy(source, recursive);
        // console.log('Copying properties from source', source);
        this.jointType = source.jointType;
        this.axis = source.axis.clone();
        this.limit.lower = source.limit.lower;
        this.limit.upper = source.limit.upper;
        this.ignoreLimits = source.ignoreLimits;
        this.jointValue = [...source.jointValue];
        this.origPosition = source.origPosition ? source.origPosition.clone() : null;
        this.origQuaternion = source.origQuaternion ? source.origQuaternion.clone() : null;
        this.mimicJoints = [...source.mimicJoints];
        this.dependentMimicJoints = source.dependentMimicJoints.map(joint => joint.clone());
    }

    setJointValue(...values) {
        // console.log('Initial values received:', values);
        values = values.map(v => v === null ? null : parseFloat(v));
        // console.log('Parsed values:', values);
        if (!this.origPosition || !this.origQuaternion) {
            //console.log('Initializing original position and quaternion');
            this.origPosition = this.position.clone();
            this.origQuaternion = this.quaternion.clone();
        }

        // console.log(this.dependentMimicJoints[0]);
        let didUpdate = false;
        this.dependentMimicJoints.forEach(mimicJoint => {
            const mimicValues = values.map(value => value * mimicJoint.multiplier + mimicJoint.offset);

            const angle = mimicValues[0]; // the angle in radians
        
            // Determine which axis is dominant for the rotation
            const axis = mimicJoint.axis;
            let axisVector = new Vector3();
            if (axis.x !== 0) axisVector.set(1, 0, 0);
            else if (axis.y !== 0) axisVector.set(0, 1, 0);
            else if (axis.z !== 0) axisVector.set(0, 0, 1);
        
            // Convert the angle to a quaternion based on the dominant axis
            const quaternion = new Quaternion().setFromAxisAngle(axisVector, angle);
        
            // Assign the computed quaternion to the mimic joint
            mimicJoint.quaternion.copy(quaternion);
        
            // console.log('Updated Quaternion:', mimicJoint.quaternion);
        
            // Assuming setJointValue should now simply accept the quaternion for direct manipulation
            didUpdate = mimicJoint.setJointValue(mimicJoint.quaternion) || didUpdate;
        });
        

        switch (this.jointType) {
            case 'fixed':
                break;
            case 'continuous':
            case 'revolute':
                let angle = values[0];
                // console.log('Current angle:', angle);
                if (!this.ignoreLimits && this.jointType === 'revolute') {
                    angle = Math.min(this.limit.upper, angle);
                    angle = Math.max(this.limit.lower, angle);
                    // console.log('Angle adjusted within limits:', angle);
                }
                this.quaternion.setFromAxisAngle(this.axis, angle).premultiply(this.origQuaternion);
                if (this.jointValue[0] !== angle) {
                    this.jointValue[0] = angle;
                    this.matrixWorldNeedsUpdate = true;
                    didUpdate = true;
                    // console.log('Angle updated to:', angle);
                }
                break;
            case 'prismatic':
                let pos = values[0];
                console.log('Current position:', pos);
                if (!this.ignoreLimits) {
                    pos = Math.min(this.limit.upper, pos);
                    pos = Math.max(this.limit.lower, pos);
                    // console.log('Position adjusted within limits:', pos);
                }
                this.position.copy(this.origPosition);
                _tempAxis.copy(this.axis).applyEuler(this.rotation);
                this.position.addScaledVector(_tempAxis, pos);
                if (this.jointValue[0] !== pos) {
                    this.jointValue[0] = pos;
                    this.matrixWorldNeedsUpdate = true;
                    didUpdate = true;
                    // console.log('Position updated to:', pos);
                }
                break;
            case 'floating':
            case 'planar':
                console.warn(`'${this.jointType}' joint not yet supported`);
        }

        // console.log('Did update:', didUpdate);

        // console.log(this.urdfName);
        // console.log(this.rotation);

        return didUpdate;
    }

    addDependentMimicJoint(mimicJoint) {
        //console.log('Adding dependent mimic joint:', mimicJoint);
        if (!this.dependentMimicJoints.includes(mimicJoint)) {
            this.dependentMimicJoints.push(mimicJoint);
        }
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