/* global
    THREE URDFLoader
    jest
    describe it beforeAll afterAll beforeEach afterEach expect
*/
const puppeteer = require('puppeteer');
const pti = require('puppeteer-to-istanbul');
const path = require('path');
const { loadURDF, testJointAngles } = require('./utils.js');

// TODO: Add tests for multipackage loading, other files
// TODO: Don't load from the web
// TODO: Test that joint functions rotate the joints properly
// TODO: Verify joint limits, names, etc
// TODO: Verify that the workingPath option works
// TODO: Add r2d2 model test and ensure that the appropriate primitive geometry is loaded

// set the timeout to 30s because we download geometry from the web
// which could overrun the timer.
jest.setTimeout(30000);

let browser = null, page = null;
beforeAll(async() => {

    browser = await puppeteer.launch({
        headless: true,

        // --no-sandbox is required to run puppeteer in Travis.
        // https://github.com/GoogleChrome/puppeteer/blob/master/docs/troubleshooting.md#running-puppeteer-on-travis-ci
        args: ['--no-sandbox'],
    });
    page = await browser.newPage();
    await page.addScriptTag({ path: path.join(__dirname, '../node_modules/three/build/three.min.js') });
    await page.addScriptTag({ path: path.join(__dirname, '../node_modules/three/examples/js/loaders/GLTFLoader.js') });
    await page.addScriptTag({ path: path.join(__dirname, '../node_modules/three/examples/js/loaders/OBJLoader.js') });
    await page.addScriptTag({ path: path.join(__dirname, '../node_modules/three/examples/js/loaders/STLLoader.js') });
    await page.addScriptTag({ path: path.join(__dirname, '../node_modules/three/examples/js/loaders/ColladaLoader.js') });
    await page.addScriptTag({ path: path.join(__dirname, '../umd/URDFLoader.js') });
    await page.coverage.startJSCoverage();

    page.on('error', e => { throw new Error(e); });
    page.on('pageerror', e => { throw new Error(e); });

});

describe('File Argument', () => {

    it('should work if the file is already parsed', async() => {

        const linkCount = await page.evaluate(() => {

            return new Promise(async resolve => {

                const loader = new URDFLoader();
                loader.packages = 'https://raw.githubusercontent.com/gkjohnson/urdf-loaders/master/urdf/TriATHLETE_Climbing';
                loader.workingPath = 'https://raw.githubusercontent.com/gkjohnson/urdf-loaders/master/urdf/TriATHLETE_Climbing/urdf/';

                const req = await fetch('https://raw.githubusercontent.com/gkjohnson/urdf-loaders/master/urdf/TriATHLETE_Climbing/urdf/TriATHLETE.URDF');
                const xmlContent = await req.text();
                const parsedContent = new DOMParser().parseFromString(xmlContent, 'text/xml');

                const documentRobot = loader.parse(parsedContent);
                const rootRobot = loader.parse(parsedContent.children[0]);

                resolve({
                    documentLinkCount: Object.keys(documentRobot.links).length,
                    rootLinkCount: Object.keys(rootRobot.links).length,
                });

            });

        });

        expect(linkCount.documentLinkCount).toEqual(28);
        expect(linkCount.rootLinkCount).toEqual(28);

    });

});

describe('Options', () => {

    describe('parseVisual, parseCollision', () => {

        it('should exclude the elements if false', async() => {

            await loadURDF(
                page,
                'https://raw.githubusercontent.com/gkjohnson/nasa-urdf-robots/master/r2_description/robots/r2b.urdf',
                {
                    packages: 'https://raw.githubusercontent.com/gkjohnson/nasa-urdf-robots/master/',
                    parseVisual: false,
                    parseCollision: false,
                },
            );

            const counts = await page.evaluate(async() => {

                let totalVisual = 0;
                let totalCollision = 0;
                window.robot.traverse(c => {

                    if (c.isURDFLink) {

                        const children = c.children;
                        const joints = children.filter(c2 => c2.isURDFJoint).length;
                        const collision = children.filter(c2 => c2.isURDFCollider).length;
                        const visual = children.length - joints - collision;

                        totalVisual += visual;
                        totalCollision += collision;

                    }

                });

                return { visual: totalVisual, collision: totalCollision };

            });

            expect(counts.visual).toBe(0);
            expect(counts.collision).toBe(0);

        });

        it('should include the elements if true', async() => {

            await loadURDF(
                page,
                'https://raw.githubusercontent.com/gkjohnson/nasa-urdf-robots/master/r2_description/robots/r2b.urdf',
                {
                    packages: 'https://raw.githubusercontent.com/gkjohnson/nasa-urdf-robots/master/',
                    parseVisual: true,
                    parseCollision: true,
                },
            );

            const counts = await page.evaluate(async() => {

                let totalVisual = 0;
                let totalCollision = 0;
                window.robot.traverse(c => {

                    if (c.isURDFLink) {

                        const children = c.children;
                        const joints = children.filter(c2 => c2.isURDFJoint).length;
                        const collision = children.filter(c2 => c2.isURDFCollider).length;
                        const visual = children.length - joints - collision;

                        totalVisual += visual;
                        totalCollision += collision;

                    }

                });

                return { visual: totalVisual, collision: totalCollision };

            });

            expect(counts.visual).toBe(71);
            expect(counts.collision).toBe(71);

        });

    });

    describe('loadMeshCb', () => {

        it('should get called to load all meshes', async() => {

            const meshesLoaded = await page.evaluate(() => {

                return new Promise(resolve => {

                    const loader = new URDFLoader();
                    loader.packages = 'https://raw.githubusercontent.com/gkjohnson/urdf-loaders/master/urdf/TriATHLETE_Climbing';
                    loader.loadMeshCb = (path, manager, done) => {

                        const mesh = new THREE.Mesh();
                        mesh.fromCallback = true;
                        done(mesh);

                    };

                    loader.load(
                        'https://raw.githubusercontent.com/gkjohnson/urdf-loaders/master/urdf/TriATHLETE_Climbing/urdf/TriATHLETE.URDF',
                        robot => {
                            let ct = 0;
                            robot.traverse(c => {

                                if (c.fromCallback) {

                                    ct++;

                                }

                            });

                            resolve(ct);

                        }
                    );

                });
            });

            expect(meshesLoaded).toEqual(28);

        });

    });

});

describe('Clone', () => {

    it('should clone the robot exactly', async() => {

        await loadURDF(
            page,
            'https://raw.githubusercontent.com/gkjohnson/nasa-urdf-robots/master/r2_description/robots/r2b.urdf',
            {
                packages: 'https://raw.githubusercontent.com/gkjohnson/nasa-urdf-robots/master/',
                parseCollision: true,
            },
        );

        const robotsAreEqual = await page.evaluate(async() => {

            let areEqual = true;
            function compareRobots(ra, rb) {

                areEqual = areEqual && ra.name === rb.name;
                areEqual = areEqual && ra.type === rb.type;
                areEqual = areEqual && ra.geometry === rb.geometry;
                areEqual = areEqual && ra.material === rb.material;
                areEqual = areEqual && ra.urdfNode === rb.urdfNode;

                areEqual = areEqual && ra.isMesh === rb.isMesh;
                areEqual = areEqual && ra.isURDFLink === rb.isURDFLink;
                areEqual = areEqual && ra.isURDFRobot === rb.isURDFRobot;
                areEqual = areEqual && ra.isURDFJoint === rb.isURDFJoint;
                areEqual = areEqual && ra.isURDFCollider === rb.isURDFCollider;

                switch (ra.type) {

                    case 'URDFRobot':
                        areEqual = areEqual && Object.keys(ra.joints).join() === Object.keys(rb.joints).join();
                        areEqual = areEqual && Object.keys(ra.links).join() === Object.keys(rb.links).join();
                        break;
                    case 'URDFJoint':
                        areEqual = areEqual && ra.jointType === rb.jointType;
                        if (ra.axis) areEqual = areEqual && ra.axis.toArray().join() === rb.axis.toArray().join();
                        areEqual = areEqual && ra.limit.lower === rb.limit.lower;
                        areEqual = areEqual && ra.limit.upper === rb.limit.upper;
                        areEqual = areEqual && ra.ignoreLimits === rb.ignoreLimits;
                        areEqual = areEqual && ra.jointValue === rb.jointValue;
                        areEqual = areEqual && ra.origPosition === rb.origPosition;
                        areEqual = areEqual && ra.origQuaternion === rb.origQuaternion;
                        break;

                }

                for (let i = 0; i < ra.children.length; i++) {

                    areEqual = areEqual && compareRobots(ra.children[i], rb.children[i]);

                }

                return areEqual;

            }

            const robotA = window.robot;
            const robotB = robotA.clone();

            return compareRobots(robotA, robotB);

        });

        expect(robotsAreEqual).toBeTruthy();

    });

});

describe('Load', () => {

    it(`should call complete even if all meshes can't be loaded`, async() => {

        await page.evaluate(() => {

            const loader = new window.URDFLoader();
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

});

describe('TriATHLETE Climbing URDF', () => {

    beforeEach(async() => {

        // Model loads STL files and has continuous, prismatic, and revolute joints
        await loadURDF(
            page,
            'https://raw.githubusercontent.com/gkjohnson/urdf-loaders/master/urdf/TriATHLETE_Climbing/urdf/TriATHLETE.URDF',
            {
                packages: 'https://raw.githubusercontent.com/gkjohnson/urdf-loaders/master/urdf/TriATHLETE_Climbing',
            }
        );

    });

    it('should mark a joint as needing an update after setting the angle', async() => {

        const needsUpdateBefore = await page.evaluate(() => window.robot.joints.HY1.matrixWorldNeedsUpdate);

        await page.evaluate(() => window.robot.joints.HY1.setAngle(10));

        const needsUpdateAfter = await page.evaluate(() => window.robot.joints.HY1.matrixWorldNeedsUpdate);

        expect(needsUpdateBefore).toBe(false);
        expect(needsUpdateAfter).toBe(true);

    });

    it('should have the correct number of links', async() => {

        const jointCt = await page.evaluate(() => Object.keys(window.robot.joints).length);
        const linkCt = await page.evaluate(() => Object.keys(window.robot.links).length);

        expect(jointCt).toEqual(27);
        expect(linkCt).toEqual(28);

    });

    it('should load the correct joint types', async() => {

        const joints = await page.evaluate(() => Object.keys(window.robot.joints));
        for (var key of joints) {

            const jointType = await page.evaluate(`window.robot.joints['${ key }'].jointType`);

            if (/^W/.test(key)) expect(jointType).toEqual('continuous');
            else if (/^TC\d/.test(key)) expect(jointType).toEqual('prismatic');
            else expect(jointType).toEqual('revolute');

        }

    });

    it('should respect joint limits for different joint types', async() => {

        await testJointAngles(page);

    });

    afterEach(async() => {

        await page.evaluate(() => window.robot = null);

    });

});

[
    {
        desc: 'Robonaut',
        urdf: 'https://raw.githubusercontent.com/gkjohnson/nasa-urdf-robots/master/r2_description/robots/r2b.urdf',
        pkg: 'https://raw.githubusercontent.com/gkjohnson/nasa-urdf-robots/master/',
    },
    {
        desc: 'Valkyrie',
        urdf: 'https://raw.githubusercontent.com/gkjohnson/nasa-urdf-robots/master/val_description/model/robots/valkyrie_A.urdf',
        pkg: 'https://raw.githubusercontent.com/gkjohnson/nasa-urdf-robots/master/',
    },
    {
        desc: 'Multipackage',
        urdf: 'https://raw.githubusercontent.com/ipa-jfh/urdf-loaders/2170f75bacaec933c17aeb2ee59d73643a4bab3a/multipkg_test.urdf',
        pkg: {
            blending_end_effector:
            'https://raw.githubusercontent.com/ros-industrial-consortium/godel/kinetic-devel/godel_robots/blending_end_effector',

            abb_irb1200_support:
            'https://raw.githubusercontent.com/ros-industrial/abb_experimental/kinetic-devel/abb_irb1200_support',

            godel_irb1200_support:
            'https://raw.githubusercontent.com/ros-industrial-consortium/godel/kinetic-devel/godel_robots/abb/godel_irb1200/godel_irb1200_support',
        },
    },
].forEach(data => {

    describe(`${ data.desc } URDF`, () => {

        beforeEach(async() => {

            // Model loads STL files and has continuous, prismatic, and revolute joints
            await loadURDF(page, data.urdf, { packages: data.pkg });

        });

        it('should respect joint limits for different joint types', async() => {

            await testJointAngles(page);

        });

        afterEach(async() => {

            await page.evaluate(() => window.robot = null);

        });

    });

});

afterAll(async() => {

    const coverage = await page.coverage.stopJSCoverage();
    const urdfLoaderCoverage = coverage.filter(o => /URDFLoader\.js$/.test(o.url));
    pti.write(urdfLoaderCoverage);

    browser.close();

});
