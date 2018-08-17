/* global URDFLoader expect */
function loadURDF(page, urdf, pkg, options = {}) {

    return page.evaluate(async(urdf2, pkg2, options2) => {

        return new Promise(resolve => {

            let meshesLoading = 0;
            const loader = new URDFLoader();
            loader.load(

                urdf2,
                pkg2,

                robot => {

                    window.robot = robot;
                    if (meshesLoading === 0) {

                        resolve();

                    }

                },

                {
                    ...options2,

                    loadMeshCb: (path, ext, done) => {

                        meshesLoading++;
                        loader.defaultMeshLoader(path, ext, model => {

                            done(model);
                            meshesLoading--;
                            if (meshesLoading === 0) {

                                resolve();

                            }

                        });

                    },

                }

            );

        });

    }, urdf, pkg, options);

}

function setAngle(page, jointName, angle) {

    return page.evaluate((jointName, angle) => {

        const joint = window.robot.urdf.joints[jointName];
        joint.urdf.set(angle);
        return joint.urdf.angle;

    }, jointName, angle);

}

async function testJointAngles(page) {

    const joints = await page.evaluate(() => Object.keys(window.robot.urdf.joints));
    for (var key of joints) {

        const info = await page.evaluate(`window.robot.urdf.joints['${ key }'].urdf`);

        if (info.type === 'continuous') {

            const angle = 10000 * Math.random();
            const res = await setAngle(page, key, angle);
            expect(res).toEqual(angle);

        } else if (info.type === 'fixed') {

            const angle = Math.random() * 1000;
            const res = await setAngle(page, key, angle);
            expect(res).toEqual(0);

        } else if (info.type === 'revolute' || info.type === 'prismatic') {

            const min = info.limit.lower - Math.random() * 1000 - 0.01;
            const minres = await setAngle(page, key, min);
            expect(minres).toEqual(info.limit.lower);

            const max = info.limit.upper + Math.random() * 1000 + 0.01;
            const maxres = await setAngle(page, key, max);
            expect(maxres).toEqual(info.limit.upper);

            const angle = info.limit.lower + (info.limit.upper - info.limit.lower) * Math.random();
            const res = await setAngle(page, key, angle);
            expect(res).toEqual(angle);

        } else if (info.type === 'planar' || info.type === 'floating') {

            // TODO: these joints are not supported

        }

    }

}

module.exports = {

    loadURDF,
    setAngle,
    testJointAngles,

};
