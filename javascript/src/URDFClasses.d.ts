import { Object3D, Vector3 } from 'three';

export interface URDFCollider extends Object3D {

    isURDFCollider: true;
    urdfNode: Element | null;

}

export interface URDFVisual extends Object3D {

    isURDFVisual: true;
    urdfNode: Element | null;

}

export interface URDFLink extends Object3D {

    isURDFLink: true;
    urdfNode: Element | null;

}

export interface URDFJoint extends Object3D {

    isURDFJoint: true;

    urdfNode: Element | null;
    axis: Vector3;
    jointType: 'fixed' | 'continuous' | 'revolute' | 'planar' | 'prismatic' | 'floating';
    angle: Number;
    jointValue: Number[];
    limit: { lower: Number, upper: Number }; // TODO: add more
    ignoreLimits: Boolean;
    mimicJoints: URDFMimicJoint[];

    setJointValue(value0: Number, value1?: Number, value2?: Number): void;

}

export interface URDFMimicJoint extends URDFJoint {

    mimicJoint : String;
    offset: Number;
    multiplier: Number;

}

export interface URDFRobot extends URDFLink {

    isURDFRobot: true;

    urdfRobotNode: Element | null;
    robotName: string;

    links: { [ key: string ]: URDFLink };
    joints: { [ key: string ]: URDFJoint };
    colliders: { [ key: string ]: URDFCollider };
    visual: { [ key: string ]: URDFVisual };
    frames: { [ key: string ]: Object3D };

    setJointValue(jointName: String, value0: Number, value1?: Number, value2?: Number): void;
    setJointValues(values: { [ key: string ]: Number | Number[] }): void;
    getFrame(name: String): Object3D;

}
