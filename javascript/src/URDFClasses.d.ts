import { Object3D, Vector3 } from 'three';

declare class URDFBase extends Object3D {

    urdfNode: Element | null;
    urdfName: string;

}

export class URDFCollider extends URDFBase {

    isURDFCollider: true;

}

export class URDFVisual extends URDFBase {

    isURDFVisual: true;

}

export class URDFLink extends URDFBase {

    isURDFLink: true;

}

export class URDFJoint extends URDFBase {

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

export class URDFMimicJoint extends URDFJoint {

    mimicJoint: string;
    offset: number;
    multiplier: number;

}

export class URDFRobot extends URDFLink {

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
