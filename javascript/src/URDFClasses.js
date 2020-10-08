import { Object3D, Quaternion } from 'three';

class URDFCollider extends Object3D {

    constructor(...args) {

        super(...args);
        this.isURDFCollider = true;
        this.type = 'URDFCollider';
        this.urdfNode = null;

    }

    copy(source, recursive) {

        super.copy(source, recursive);
        this.urdfNode = source.urdfNode;

        return this;

    }

}

class URDFVisual extends Object3D {

    constructor(...args) {

        super(...args);
        this.isURDFVisual = true;
        this.type = 'URDFVisual';
        this.urdfNode = null;

    }

    copy(source, recursive) {

        super.copy(source, recursive);
        this.urdfNode = source.urdfNode;

        return this;

    }

}

class URDFLink extends Object3D {

    constructor(...args) {

        super(...args);
        this.isURDFLink = true;
        this.type = 'URDFLink';
        this.urdfNode = null;

    }

    copy(source, recursive) {

        super.copy(source, recursive);
        this.urdfNode = source.urdfNode;

        return this;

    }

}

class URDFJoint extends Object3D {

    get jointType() {

        return this._jointType;

    }
    set jointType(v) {

        if (this.jointType === v) return;
        this._jointType = v;

        switch (v) {

            case 'fixed':
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

        return this.jointValue[0];

    }

    constructor(...args) {
        super(...args);

        this.isURDFJoint = true;
        this.type = 'URDFJoint';

        this.urdfNode = null;
        this.jointValue = null;
        this.jointType = 'fixed';
        this.axis = null;
        this.limit = { lower: 0, upper: 0 };
        this.ignoreLimits = false;

        this.origPosition = null;
        this.origQuaternion = null;
    }

    /* Overrides */
    copy(source, recursive) {

        super.copy(source, recursive);

        this.urdfNode = source.urdfNode;
        this.jointType = source.jointType;
        this.axis = source.axis ? source.axis.clone() : null;
        this.limit.lower = source.limit.lower;
        this.limit.upper = source.limit.upper;
        this.ignoreLimits = false;

        this.jointValue = [...source.jointValue];

        this.origPosition = source.origPosition ? source.origPosition.clone() : null;
        this.origQuaternion = source.origQuaternion ? source.origQuaternion.clone() : null;

        return this;
    }

    /* Public Functions */
    setJointValue(...values) {

        values = values.map(v => parseFloat(v));

        if (!this.origPosition || !this.origQuaternion) {

            this.origPosition = this.position.clone();
            this.origQuaternion = this.quaternion.clone();

        }

        switch (this.jointType) {

            case 'fixed': {
                break;
            }
            case 'continuous':
            case 'revolute': {

                let angle = values[0];
                if (angle == null) break;
                if (angle === this.jointValue) break;

                if (!this.ignoreLimits && this.jointType === 'revolute') {

                    angle = Math.min(this.limit.upper, angle);
                    angle = Math.max(this.limit.lower, angle);

                }

                // FromAxisAngle seems to rotate the opposite of the
                // expected angle for URDF, so negate it here
                const delta = new Quaternion().setFromAxisAngle(this.axis, angle);
                this.quaternion.multiplyQuaternions(this.origQuaternion, delta);

                this.jointValue[0] = angle;
                this.matrixWorldNeedsUpdate = true;

                break;
            }

            case 'prismatic': {

                let pos = values[0];
                if (pos == null) break;
                if (pos === this.jointValue) break;

                if (!this.ignoreLimits) {

                    pos = Math.min(this.limit.upper, pos);
                    pos = Math.max(this.limit.lower, pos);

                }

                this.position.copy(this.origPosition);
                this.position.addScaledVector(this.axis, pos);

                this.jointValue[0] = pos;
                this.matrixWorldNeedsUpdate = true;
                break;

            }

            case 'floating':
            case 'planar':
                // TODO: Support these joint types
                console.warn(`'${ this.jointType }' joint not yet supported`);

        }

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

            if (c.isURDFJoint && c.name in source.joints) {

                this.joints[c.name] = c;

            }

            if (c.isURDFLink && c.name in source.links) {

                this.links[c.name] = c;

            }

            if (c.isURDFCollider && c.name in source.colliders) {

                this.colliders[c.name] = c;

            }

            if (c.isURDFVisual && c.name in source.visual) {

                this.visual[c.name] = c;

            }

        });

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

            joint.setJointValue(...angle);
            return true

        }

        return false;
    }

    setJointValues(values) {

        for (const name in values) {

            const value = values[name];
            if (Array.isArray(value)) {

                this.setJointValue(name, ...value);

            } else {

                this.setJointValue(name, value);

            }

        }

    }

}

export { URDFRobot, URDFLink, URDFJoint, URDFVisual, URDFCollider };
