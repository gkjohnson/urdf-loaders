import { Vector3 } from 'three';
import { URDFJoint, URDFMimicJoint } from '../src/URDFClasses.js';

describe('URDFJoint', () => {

    it('should have default value for joint axis', () => {

        const joint1 = new URDFJoint();
        expect(joint1.axis.equals(new Vector3(1, 0, 0))).toBeTruthy();

        joint1.axis.x = 2;
        const joint2 = new URDFJoint().copy(joint1);
        joint1.axis.x = 3;
        expect(joint1.axis.equals(new Vector3(3, 0, 0))).toBeTruthy();
        expect(joint2.axis.equals(new Vector3(2, 0, 0))).toBeTruthy();

    });

    it('should set the jointValues array based on the joint type.', () => {

        const joint = new URDFJoint();

        joint.jointType = 'revolute';
        expect(joint.jointValue).toHaveLength(1);

        joint.jointType = 'prismatic';
        expect(joint.jointValue).toHaveLength(1);

        joint.jointType = 'continuous';
        expect(joint.jointValue).toHaveLength(1);

        joint.jointType = 'planar';
        expect(joint.jointValue).toHaveLength(3);

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

    describe('setJointValue with mimic joints', () => {

        const joint = new URDFJoint();
        joint.axis = new Vector3(0, 0, 1);
        joint.jointType = 'continuous';

        const mimickerA = new URDFMimicJoint();
        mimickerA.axis = new Vector3(0, 0, 1);
        mimickerA.jointType = 'continuous';
        mimickerA.multiplier = 2;
        mimickerA.offset = 5;

        const mimickerB = new URDFMimicJoint();
        mimickerB.axis = new Vector3(0, 0, 1);
        mimickerB.jointType = 'continuous';
        mimickerB.multiplier = -4;
        mimickerB.offset = -16;

        joint.mimicJoints = [mimickerA, mimickerB];

        it('should propagate to mimic joints.', () => {

            joint.setJointValue(10);
            expect(mimickerA.jointValue).toEqual([25]);
            expect(mimickerB.jointValue).toEqual([-56]);

        });

        it('should return true when all joints are updated.', () => {

            joint.jointValue = [0];
            mimickerA.jointValue = [0];
            mimickerB.jointValue = [0];
            expect(joint.setJointValue(10)).toBeTruthy();

        });

        it('should return false when no joints are updated.', () => {

            joint.jointValue = [10];
            mimickerA.jointValue = [25];
            mimickerB.jointValue = [-56];
            expect(joint.setJointValue(10)).toBeFalsy();

        });

        it('should return true when only the master joint is updated.', () => {

            joint.jointValue = [0];
            mimickerA.jointValue = [25];
            mimickerB.jointValue = [-56];
            expect(joint.setJointValue(10)).toBeTruthy();

        });

        it('should return true when one mimic joint is updated.', () => {

            joint.jointValue = [10];
            mimickerA.jointValue = [0];
            mimickerB.jointValue = [-56];
            expect(joint.setJointValue(10)).toBeTruthy();

        });

        it('should return true when all mimic joints are updated.', () => {

            joint.jointValue = [10];
            mimickerA.jointValue = [0];
            mimickerB.jointValue = [0];
            expect(joint.setJointValue(10)).toBeTruthy();

        });

    });

});
