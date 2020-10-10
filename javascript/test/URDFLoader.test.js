import { JSDOM } from 'jsdom';
import { Mesh } from 'three';
import fetch from 'node-fetch';
import URDFLoader from '../src/URDFLoader.js';

const jsdom = new JSDOM();
const window = jsdom.window;
global.DOMParser = window.DOMParser;
global.XMLSerializer = window.XMLSerializer;
global.Document = window.Document;
global.Element = window.Element;
global.XMLHttpRequest = window.XMLHttpRequest;
global.fetch = fetch;

function emptyLoadMeshCallback(url, manager, done) {

    done(new Mesh());

}

function compareRobots(ra, rb) {

    expect(ra.name).toEqual(rb.name);
    expect(ra.type).toEqual(rb.type);
    expect(ra.geometry).toEqual(rb.geometry);
    expect(ra.material).toEqual(rb.material);
    expect(ra.urdfNode).toEqual(rb.urdfNode);

    expect(ra.isMesh).toEqual(rb.isMesh);
    expect(ra.isURDFLink).toEqual(rb.isURDFLink);
    expect(ra.isURDFRobot).toEqual(rb.isURDFRobot);
    expect(ra.isURDFJoint).toEqual(rb.isURDFJoint);
    expect(ra.isURDFCollider).toEqual(rb.isURDFCollider);

    switch (ra.type) {

        case 'URDFRobot':
            expect(Object.keys(ra.joints)).toEqual(Object.keys(rb.joints));
            expect(Object.keys(ra.links)).toEqual(Object.keys(rb.links));
            break;
        case 'URDFJoint':
            expect(ra.jointType).toEqual(rb.jointType);
            expect(ra.axis).toEqual(rb.axis);
            expect(ra.limit).toEqual(rb.limit);
            expect(ra.ignoreLimits).toEqual(rb.ignoreLimits);
            expect(ra.jointValue).toEqual(rb.jointValue);
            expect(ra.origPosition).toEqual(rb.origPosition);
            expect(ra.origQuaternion).toEqual(rb.origQuaternion);
            break;

    }

    for (let i = 0; i < ra.children.length; i++) {

        compareRobots(ra.children[i], rb.children[i]);

    }

}

describe('File Argument', () => {

    it('should work if the file is already parsed', async() => {

        const loader = new URDFLoader();
        loader.packages = 'https://raw.githubusercontent.com/gkjohnson/urdf-loaders/master/urdf/TriATHLETE_Climbing';
        loader.workingPath = 'https://raw.githubusercontent.com/gkjohnson/urdf-loaders/master/urdf/TriATHLETE_Climbing/urdf/';

        const req = await fetch('https://raw.githubusercontent.com/gkjohnson/urdf-loaders/master/urdf/TriATHLETE_Climbing/urdf/TriATHLETE.URDF');
        const xmlContent = await req.text();
        const parsedContent = new DOMParser().parseFromString(xmlContent, 'text/xml');

        const documentRobot = loader.parse(parsedContent);
        const rootRobot = loader.parse(parsedContent.children[0]);

        expect(Object.keys(documentRobot.links).length).toEqual(28);
        expect(Object.keys(rootRobot.links).length).toEqual(28);

    });

});

describe('Options', () => {

    describe('parseVisual, parseCollision', () => {

        it('should exclude the elements if false', async() => {

            const loader = new URDFLoader();
            loader.packages = 'https://raw.githubusercontent.com/gkjohnson/nasa-urdf-robots/master/';
            loader.loadMeshCb = emptyLoadMeshCallback;
            loader.parseVisual = false;
            loader.parseCollision = false;

            let visTotal = 0;
            let colTotal = 0;
            const robot = await loader.loadAsync('https://raw.githubusercontent.com/gkjohnson/nasa-urdf-robots/master/r2_description/robots/r2b.urdf');
            robot.traverse(c => {

                if (c.isURDFCollider) {

                    colTotal++;

                }

                if (c.isURDFVisual) {

                    visTotal++;

                }

            })

            expect(visTotal).toBe(0);
            expect(colTotal).toBe(0);

        });

        it('should include the elements if true', async() => {

            const loader = new URDFLoader();
            loader.packages = 'https://raw.githubusercontent.com/gkjohnson/nasa-urdf-robots/master/';
            loader.loadMeshCb = emptyLoadMeshCallback;
            loader.parseVisual = true;
            loader.parseCollision = true;

            let visTotal = 0;
            let colTotal = 0;
            const robot = await loader.loadAsync('https://raw.githubusercontent.com/gkjohnson/nasa-urdf-robots/master/r2_description/robots/r2b.urdf');
            robot.traverse(c => {

                if (c.isURDFCollider) {

                    colTotal++;

                }

                if (c.isURDFVisual) {

                    visTotal++;

                }

            })

            expect(visTotal).toBe(71);
            expect(colTotal).toBe(71);

        });

    });

    describe('loadMeshCb', () => {

        it('should get called to load all meshes', async() => {

            const loader = new URDFLoader();
            loader.packages = 'https://raw.githubusercontent.com/gkjohnson/urdf-loaders/master/urdf/TriATHLETE_Climbing';
            loader.loadMeshCb = (path, manager, done) => {

                const mesh = new Mesh();
                mesh.fromCallback = true;
                done(mesh);

            };

            let fromCallbackCount = 0;
            const robot = await loader.loadAsync('https://raw.githubusercontent.com/gkjohnson/urdf-loaders/master/urdf/TriATHLETE_Climbing/urdf/TriATHLETE.URDF');
            robot.traverse(c => {

                if (c.fromCallback) {

                    fromCallbackCount++;

                }

            });

            expect(fromCallbackCount).toEqual(28);

        });

    });

});

describe('Clone', () => {

    it('should clone the robot exactly', async() => {

        const loader = new URDFLoader();
        loader.packages = 'https://raw.githubusercontent.com/gkjohnson/nasa-urdf-robots/master/';
        loader.loadMeshCb = emptyLoadMeshCallback;
        loader.parseVisual = true;
        loader.parseCollision = true;

        const robot = await loader.loadAsync('https://raw.githubusercontent.com/gkjohnson/nasa-urdf-robots/master/r2_description/robots/r2b.urdf');

        compareRobots(robot, robot.clone());

    });

});

describe('Load', () => {

    it(`should call complete even if all meshes can't be loaded`, async() => {

        const loader = new URDFLoader();
        const urdf = `
            <robot>
                <link
                    name="Body">
                    <visual>
                        <origin xyz="0 0 0" rpy="0 0 0" />
                        <geometry>
                            <mesh filename="../file/does/not/exist.stl" />
                        </geometry>
                    </visual>
                </link>
            </robot>
        `;

        loader.loadMeshCb = (path, manager, done) => done(null, new Error());
        loader.parse(urdf);

    });

});

describe('TriATHLETE Climbing URDF', () => {

    let robot;
    beforeEach(async() => {

        const loader = new URDFLoader();
        loader.packages = 'https://raw.githubusercontent.com/gkjohnson/urdf-loaders/master/urdf/TriATHLETE_Climbing';
        robot = await loader.loadAsync('https://raw.githubusercontent.com/gkjohnson/urdf-loaders/master/urdf/TriATHLETE_Climbing/urdf/TriATHLETE.URDF');

    });

    it('should mark a joint as needing an update after setting the angle', async() => {

        expect(robot.joints.HY1.matrixWorldNeedsUpdate).toBeFalsy();

        robot.joints.HY1.setJointValue(10);

        expect(robot.joints.HY1.matrixWorldNeedsUpdate).toBeTruthy();

    });

    it('should have the correct number of links', async() => {

        expect(Object.keys(robot.joints)).toHaveLength(27);
        expect(Object.keys(robot.links)).toHaveLength(28);

    });

    it('should load the correct joint types', async() => {

        for (const key in robot.joints) {

            const joint = robot.joints[key];
            const jointType = joint.jointType;

            if (/^W/.test(key)) expect(jointType).toEqual('continuous');
            else if (/^TC\d/.test(key)) expect(jointType).toEqual('prismatic');
            else expect(jointType).toEqual('revolute');

        }

    });

    it.todo('should respect joint limits for different joint types');

    it('should load the robonaut model successfully.', async () => {

        const loader = new URDFLoader();
        loader.packages = 'https://raw.githubusercontent.com/gkjohnson/nasa-urdf-robots/master/';
        loader.loadMeshCb = emptyLoadMeshCallback;

        const robot = await loader.loadAsync('https://raw.githubusercontent.com/gkjohnson/nasa-urdf-robots/master/r2_description/robots/r2b.urdf');

        expect(Object.keys(robot.links)).toHaveLength(128);
        expect(Object.keys(robot.joints)).toHaveLength(127);

    });

    it('should load the valkyrie model successfully.', async () => {

        const loader = new URDFLoader();
        loader.packages = 'https://raw.githubusercontent.com/gkjohnson/nasa-urdf-robots/master/';
        loader.loadMeshCb = emptyLoadMeshCallback;

        const robot = await loader.loadAsync('https://raw.githubusercontent.com/gkjohnson/nasa-urdf-robots/master/val_description/model/robots/valkyrie_A.urdf');

        expect(Object.keys(robot.links)).toHaveLength(69);
        expect(Object.keys(robot.joints)).toHaveLength(68);

    });

    it('should load the a multipackage model successfully.', async () => {

        const loader = new URDFLoader();
        loader.packages = {
            blending_end_effector:
            'https://raw.githubusercontent.com/ros-industrial-consortium/godel/kinetic-devel/godel_robots/blending_end_effector',

            abb_irb1200_support:
            'https://raw.githubusercontent.com/ros-industrial/abb_experimental/kinetic-devel/abb_irb1200_support',

            godel_irb1200_support:
            'https://raw.githubusercontent.com/ros-industrial-consortium/godel/kinetic-devel/godel_robots/abb/godel_irb1200/godel_irb1200_support',
        };
        loader.loadMeshCb = emptyLoadMeshCallback;

        const robot = await loader.loadAsync('https://raw.githubusercontent.com/ipa-jfh/urdf-loaders/2170f75bacaec933c17aeb2ee59d73643a4bab3a/multipkg_test.urdf');

        expect(Object.keys(robot.links)).toHaveLength(30);
        expect(Object.keys(robot.joints)).toHaveLength(29);

    });

});

