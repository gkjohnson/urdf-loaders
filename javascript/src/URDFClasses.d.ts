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
    angle: number;
    jointValue: number[];
    limit: { lower: number, upper: number }; // TODO: add more
    ignoreLimits: boolean;
    mimicJoints: URDFMimicJoint[];

    setJointValue(...values: (number | null)[]): boolean;

}

export interface URDFMimicJoint extends URDFJoint {

    mimicJoint: string;
    offset: number;
    multiplier: number;

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

    setJointValue(jointName: string, ...values: number[]): boolean;
    setJointValues(values: { [ key: string ]: number | number[] }): boolean;
    getFrame(name: string): Object3D;

}
