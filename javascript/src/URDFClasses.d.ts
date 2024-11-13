import { Object3D, Vector3 } from 'three';

export interface URDFCollider extends Object3D {

    isURDFCollider: true;
    urdfNode: Element | null;

}

export interface URDFVisual extends Object3D {

    isURDFVisual: true;
    urdfNode: Element | null;

}

interface URDFInertial {

    origin: { xyz: Vector3 | null, rpy: Vector3 | null } | null;
    mass: Number | null;
    inertia: { ixx: Number, ixy: Number, ixz: Number, iyy: Number, iyz: Number, izz: Number } | null;

}

export interface URDFLink extends Object3D {

    isURDFLink: true;
    urdfNode: Element | null;
    inertial: URDFInertial | null;

}

export interface URDFJoint extends Object3D {

    isURDFJoint: true;

    urdfNode: Element | null;
    axis: Vector3;
    jointType: 'fixed' | 'continuous' | 'revolute' | 'planar' | 'prismatic' | 'floating';
    angle: Number;
    jointValue: Number[];
    limit: { lower: Number, upper: Number, effort: Number | null, velocity: Number | null };
    ignoreLimits: Boolean;
    mimicJoints: URDFMimicJoint[];

    setJointValue(...values: (number | null)[]): boolean;

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

    setJointValue(jointName: String, ...values: number[]): boolean;
    setJointValues(values: { [ key: string ]: Number | Number[] }): boolean;
    getFrame(name: String): Object3D;

}
