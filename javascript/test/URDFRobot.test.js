import { JSDOM } from 'jsdom';
import { Vector3 } from 'three';
import URDFLoader from '../src/URDFLoader.js';

const jsdom = new JSDOM();
const window = jsdom.window;
global.DOMParser = window.DOMParser;
global.XMLSerializer = window.XMLSerializer;
global.Document = window.Document;
global.Element = window.Element;
global.XMLHttpRequest = window.XMLHttpRequest;

describe('URDFRobot', () => {
    it('should correctly set all joint angles when using setJointValues.', () => {
        const loader = new URDFLoader();
        const robot = loader.parse(`
            <robot name="TEST">
                <link name="LINK1"/>
                <link name="LINK2"/>
                <link name="LINK3"/>
                <joint name="JOINT1" type="continuous">
                    <axis xyz="0 0 -1" />
                    <parent link="LINK1"/>
                    <child link="LINK2"/>
                </joint>
                <joint name="JOINT2" type="continuous">
                    <axis xyz="0 0 -1" />
                    <parent link="LINK2"/>
                    <child link="LINK3"/>
                </joint>
            </robot>
        `);

        expect(robot.setJointValues({ JOINT1: 1, JOINT2: 2 })).toBeTruthy();
        expect(robot.joints.JOINT1.angle).toEqual(1);
        expect(robot.joints.JOINT2.angle).toEqual(2);
    });

    it('should correctly parse joint efforts and velocities.', () => {
        const loader = new URDFLoader();
        const robot = loader.parse(`
            <robot name="TEST">
                <link name="LINK1"/>
                <link name="LINK2"/>
                <link name="LINK3"/>
                <joint name="JOINT1" type="continuous">
                    <axis xyz="0 0 -1" />
                    <parent link="LINK1"/>
                    <child link="LINK2"/>
                    <limit effort="150" lower="-3.14" upper="3.14" velocity="5.20" />
                </joint>
                <joint name="JOINT2" type="continuous">
                    <axis xyz="0 0 -1" />
                    <parent link="LINK2"/>
                    <child link="LINK3"/>
                </joint>
            </robot>
        `);

        expect(robot.joints.JOINT1.limit.effort).toEqual(150);
        expect(robot.joints.JOINT1.limit.lower).toEqual(-3.14);
        expect(robot.joints.JOINT1.limit.upper).toEqual(3.14);
        expect(robot.joints.JOINT1.limit.velocity).toEqual(5.20);

        expect(robot.joints.JOINT2.limit.effort).toEqual(null);
        expect(robot.joints.JOINT2.limit.lower).toEqual(0);
        expect(robot.joints.JOINT2.limit.upper).toEqual(0);
        expect(robot.joints.JOINT2.limit.velocity).toEqual(null);
    });

    it('should correctly parse joint inertial data.', () => {
        const loader = new URDFLoader();
        const robot = loader.parse(`
            <robot name="TEST">
                <link name="LINK1">
                    <inertial>
                        <origin rpy="0 0 -1.5707963267948966" xyz="0.14635000035763 0 0"/>
                        <mass value="2.5076"/>
                        <inertia ixx="0.00443333156" ixy="0.0" ixz="0.0" iyy="0.00443333156" iyz="0.0" izz="0.0072" />
                    </inertial>
                </link>
                <link name="LINK2"/>
                <link name="LINK3"/>
                <joint name="JOINT1" type="continuous">
                    <axis xyz="0 0 -1" />
                    <parent link="LINK1"/>
                    <child link="LINK2"/>
                </joint>
                <joint name="JOINT2" type="continuous">
                    <axis xyz="0 0 -1" />
                    <parent link="LINK2"/>
                    <child link="LINK3"/>
                </joint>
            </robot>
        `);

        expect(robot.links.LINK1.inertial.origin.rpy).toEqual(new Vector3(0, 0, -1.5707963267948966));
        expect(robot.links.LINK1.inertial.origin.xyz).toEqual(new Vector3(0.14635000035763, 0, 0));
        expect(robot.links.LINK1.inertial.mass).toEqual(2.5076);
        expect(robot.links.LINK1.inertial.inertia.ixx).toEqual(0.00443333156);
        expect(robot.links.LINK1.inertial.inertia.iyy).toEqual(0.00443333156);
        expect(robot.links.LINK1.inertial.inertia.izz).toEqual(0.0072);
        expect(robot.links.LINK1.inertial.inertia.ixy).toEqual(0);
        expect(robot.links.LINK1.inertial.inertia.ixz).toEqual(0);
        expect(robot.links.LINK1.inertial.inertia.iyz).toEqual(0);

        expect(robot.links.LINK2.inertial).toEqual(null);
    });

    it('should parse material colors and name.', () => {
        const loader = new URDFLoader();
        const res = loader.parse(`
            <robot name="TEST">
                <link name="LINK1"/>
                <link name="LINK2"/>
                <joint name="JOINT">
                    <parent link="LINK1"/>
                    <child link="LINK2"/>
                </joint>
            </robot>
        `);

        const names = [];
        res.traverse(c => names.push(c.name));

        expect(names).toEqual(['LINK1', 'JOINT', 'LINK2']);

        expect(Object.keys(res.links)).toEqual(['LINK1', 'LINK2']);
        expect(Object.keys(res.joints)).toEqual(['JOINT']);
        expect(Object.keys(res.frames)).toEqual(['LINK1', 'LINK2', 'JOINT']);
    });

    it('should clone the links and joints dictionaries correctly.', () => {
        const loader = new URDFLoader();
        const res = loader.parse(`
            <robot name="TEST">
                <link name="LINK1"/>
                <link name="LINK2"/>
                <joint name="JOINT">
                    <parent link="LINK1"/>
                    <child link="LINK2"/>
                </joint>
            </robot>
        `).clone();

        const names = [];
        res.traverse(c => names.push(c.name));

        expect(names).toEqual(['LINK1', 'JOINT', 'LINK2']);

        expect(Object.keys(res.links)).toEqual(['LINK1', 'LINK2']);
        expect(Object.keys(res.joints)).toEqual(['JOINT']);
        expect(Object.keys(res.frames)).toEqual(['LINK1', 'LINK2', 'JOINT']);
    });

    it('should include visual and collision names in the name map.', () => {
        const loader = new URDFLoader();
        loader.parseCollision = true;
        const res = loader.parse(`
            <robot name="TEST">
                <link name="LINK1">
                    <visual name="BOX1_VISUAL">
                        <box size="1 1 1"/>
                    </visual>
                    <collision name="BOX1_COLLISION">
                        <box size="1 1 1"/>
                    </collision>
                </link>
                <link name="LINK2">
                    <visual name="BOX2_VISUAL">
                        <box size="1 1 1"/>
                    </visual>
                    <collision name="BOX2_COLLISION">
                        <box size="1 1 1"/>
                    </collision>
                </link>
                <joint name="JOINT">
                    <parent link="LINK1"/>
                    <child link="LINK2"/>
                </joint>
            </robot>
        `).clone();

        expect(Object.keys(res.links)).toEqual(['LINK1', 'LINK2']);
        expect(Object.keys(res.joints)).toEqual(['JOINT']);
        expect(Object.keys(res.visual)).toEqual(['BOX1_VISUAL', 'BOX2_VISUAL']);
        expect(Object.keys(res.colliders)).toEqual(['BOX1_COLLISION', 'BOX2_COLLISION']);
        expect(Object.keys(res.frames)).toEqual([
            'BOX1_COLLISION', 'BOX2_COLLISION',
            'BOX1_VISUAL', 'BOX2_VISUAL',
            'LINK1', 'LINK2', 'JOINT',
        ]);
    });

    it('should clone mimic data.', () => {
        const loader = new URDFLoader();
        const res = loader.parse(`
            <robot name="TEST">
                <link name="LINK1"/>
                <joint name="A" type="continuous">
                    <origin xyz="0 0 0" rpy="0 0 0"/>
                    <axis xyz="1 0 0"/>
                    <parent link="LINK1"/>
                    <child link="LINK2"/>
                </joint>
                <link name="LINK2"/>
                <joint name="B" type="continuous">
                    <origin xyz="0 0 0" rpy="0 0 0"/>
                    <axis xyz="1 0 0"/>
                    <parent link="LINK2"/>
                    <child link="LINK3"/>
                    <mimic joint="A" offset="-5" multiplier="23"/>
                </joint>
                <link name="LINK3"/>
            </robot>
        `);

        const cloned = res.clone();

        const jointB = cloned.joints['B'];
        expect(jointB.mimicJoint).toEqual('A');
        expect(jointB.multiplier).toEqual(23);
        expect(jointB.offset).toEqual(-5);

        const jointA = cloned.joints['A'];
        expect(jointA.mimicJoints.length).toEqual(1);
        expect(jointA.mimicJoints[0].name).toEqual('B');

        // Expect the cloned joint not to be a reference to the joint on the robot that was cloned
        expect(jointA.mimicJoints[0]).not.toBe(res.joints['A'].mimicJoints[0]);
    });
});
