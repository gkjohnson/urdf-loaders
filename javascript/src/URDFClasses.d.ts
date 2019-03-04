import { Object3D, Vector3 } from 'three';

export class URDFLink extends Object3D {

    isURDFLink: true;
    urdfNode: Element | null;
    
}

export class URDFJoint extends Object3D {

    isURDFJoint: true;
    
    urdfNode: Element | null;
    axis: Vector3 | null;
    jointType: string;
    angle: Number | Number[] | null;
    limit: { lower: Number, upper: Number }; // TODO: add more
    ignoreLimits: Boolean;
    
    setAngle(value0: Number, value1?: Number, value2?: Number): Number | Number[];
    setOffset(value0: Number, value1?: Number, value2?: Number): Number | Number[];
    
}

export class URDFRobot extends URDFLink {

    isURDFRobot: true;
    
    urdfRobotNode: Element | null;
    robotName: string;
    
    links: { [ key: string ]: URDFLink };
    joints: { [ key: string ]: URDFJoint };
    
    setAngle(value0: Number, value1?: Number, value2?: Number): Number | Number[] | null;
    setAngles({ [ key: string ]: Number | Number[] }): void;
 
}
