import { Object3D, Vector3 } from 'three';

class URDFLink extends Object3D {

    isURDFLink: true;
    urdfNode: Element | null;
    
}

class URDFJoint extends Object3D {

    isURDFJoint: true;
    
    urdfNode: Element | null;
    axis: Vector3 | null;
    jointType: string;
    angle: Number | Number[] | null;
    limit: { lower: Number, upper: Number }; // TODO: add more
    ignoreLimits: Boolean;
    
    setAngle(Number, Number?, Number?): Number | Number[];
    setOffset(Number, Number?, Number?): Number | Number[];
    
}

class URDFRobot extends URDFLink {

    isURDFRobot: true;
    
    urdfRobotNode: Element | null;
    robotName: string;
    
    links: { [key: string]: URDFLink };
    joints: { [key: string]: URDFJoint };
    
    setAngle(Number, Number, Number? Number?): Number | Number[] | null;
    setAngles({ [key: string]: Number | Number[] }): void;
 
}
