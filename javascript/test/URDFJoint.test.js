import { Vector3 } from 'three';
import { URDFJoint, URDFMimicJoint } from '../src/URDFClasses.js';

describe('URDFJoint', () => {

    it('should set the jointValues array based on the joint type.', () => {

        const joint = new URDFJoint();

        joint.jointType = 'revolute';
        expect(joint.jointValue).toHaveLength(1);

        joint.jointType = 'prismatic';
        expect(joint.jointValue).toHaveLength(1);

        joint.jointType = 'continuous';
        expect(joint.jointValue).toHaveLength(1);

        joint.jointType = 'planar';
        expect(joint.jointValue).toHaveLength(2);

        joint.jointType = 'floating';
        expect(joint.jointValue).toHaveLength(6);

        joint.jointType = 'fixed';
        expect(joint.jointValue).toHaveLength(0);

    });

    it('should respect upper and lower joint limits.', () => {

        const joint = new URDFJoint();
        joint.limit.upper = 1;
        joint.limit.lower = -1;
        joint.axis = new Vector3(0, 0, 1);

        joint.jointType = 'revolute';
        joint.setJointValue(0.5);
        expect(joint.jointValue).toEqual([0.5]);

        joint.setJointValue(1.5);
        expect(joint.jointValue).toEqual([1]);

        joint.setJointValue(-1.5);
        expect(joint.jointValue).toEqual([-1]);

        joint.jointType = 'prismatic';
        joint.setJointValue(0.5);
        expect(joint.jointValue).toEqual([0.5]);

        joint.setJointValue(1.5);
        expect(joint.jointValue).toEqual([1]);

        joint.setJointValue(-1.5);
        expect(joint.jointValue).toEqual([-1]);

        // continuous does not use joint limits
        joint.jointType = 'continuous';
        joint.setJointValue(0.5);
        expect(joint.jointValue).toEqual([0.5]);

        joint.setJointValue(1.5);
        expect(joint.jointValue).toEqual([1.5]);

        joint.setJointValue(-1.5);
        expect(joint.jointValue).toEqual([-1.5]);

    });

    it('should ignore joint limits when "ignoreLimits" is true.', () => {

        const joint = new URDFJoint();
        joint.limit.upper = 1;
        joint.limit.lower = -1;
        joint.ignoreLimits = true;
        joint.axis = new Vector3(0, 0, 1);

        joint.jointType = 'revolute';
        joint.setJointValue(0.5);
        expect(joint.jointValue).toEqual([0.5]);

        joint.setJointValue(1.5);
        expect(joint.jointValue).toEqual([1.5]);

        joint.setJointValue(-1.5);
        expect(joint.jointValue).toEqual([-1.5]);

        joint.jointType = 'prismatic';
        joint.setJointValue(0.5);
        expect(joint.jointValue).toEqual([0.5]);

        joint.setJointValue(1.5);
        expect(joint.jointValue).toEqual([1.5]);

        joint.setJointValue(-1.5);
        expect(joint.jointValue).toEqual([-1.5]);

    });

    describe('setJointValue', () => {

        it('should return true only if the joint value changed.', () => {

            const joint = new URDFJoint();
            joint.limit.upper = 1;
            joint.limit.lower = -1;
            joint.axis = new Vector3(0, 0, 1);

            joint.jointType = 'revolute';
            joint.matrixWorldNeedsUpdate = false;
            expect(joint.setJointValue(0.5)).toBeTruthy();
            expect(joint.matrixWorldNeedsUpdate).toBeTruthy();

            joint.matrixWorldNeedsUpdate = false;
            expect(joint.setJointValue(0.5)).toBeFalsy();
            expect(joint.matrixWorldNeedsUpdate).toBeFalsy();

            joint.matrixWorldNeedsUpdate = false;
            expect(joint.setJointValue(1.5)).toBeTruthy();
            expect(joint.matrixWorldNeedsUpdate).toBeTruthy();

            joint.matrixWorldNeedsUpdate = false;
            expect(joint.setJointValue(1.5)).toBeFalsy();
            expect(joint.matrixWorldNeedsUpdate).toBeFalsy();

            joint.jointType = 'prismatic';
            joint.matrixWorldNeedsUpdate = false;
            expect(joint.setJointValue(0.5)).toBeTruthy();
            expect(joint.matrixWorldNeedsUpdate).toBeTruthy();

            joint.matrixWorldNeedsUpdate = false;
            expect(joint.setJointValue(0.5)).toBeFalsy();
            expect(joint.matrixWorldNeedsUpdate).toBeFalsy();

            joint.matrixWorldNeedsUpdate = false;
            expect(joint.setJointValue(1.5)).toBeTruthy();
            expect(joint.matrixWorldNeedsUpdate).toBeTruthy();

            joint.matrixWorldNeedsUpdate = false;
            expect(joint.setJointValue(1.5)).toBeFalsy();
            expect(joint.matrixWorldNeedsUpdate).toBeFalsy();

        });

    });

    describe('setJointValue', () => {

        const joint = new URDFJoint();
        joint.axis = new Vector3(0, 0, 1);
        joint.jointType = 'continuous';

        const mimicker = new URDFMimicJoint();
        mimicker.axis = new Vector3(0, 0, 1);
        mimicker.jointType = 'continuous';
        mimicker.multiplier = 2;
        mimicker.offset = 5;

        joint.mimicJoints = [mimicker];

        it('should propagage to mimic joints.', () => {

            joint.setJointValue(10);
            expect(mimicker.jointValue).toEqual([25]);

        });

        it('should return true when all joints are updated.', () => {
            
            joint.setJointValue(0);
            mimicker.setJointValue(0);
            expect(joint.setJointValue(10)).toBeTruthy();

        });

        it('should return false when no joints are updated.', () => {
            
            joint.setJointValue(10);
            mimicker.setJointValue(25);
            expect(joint.setJointValue(10)).toBeFalsy();

        });

        it('should return true when only the master joint is updated.', () => {
            
            joint.setJointValue(238429348);
            mimicker.setJointValue(25);
            expect(joint.setJointValue(10)).toBeTruthy();

        });

        it('should return true when only the mimic joint is updated.', () => {

            joint.setJointValue(10);
            mimicker.setJointValue(238429348);
            expect(joint.setJointValue(10)).toBeTruthy();
        });

    });

});
