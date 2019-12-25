/* global THREE URDFLoader expect */

// Using custom `looseEquals` instead of `toEqual` here because with `toEqual`, -0 does not equal 0,
// which can cause some of these cases to fail.
// Related discussion for jasmine expect is here: https://github.com/jasmine/jasmine/issues/579
expect.extend({
    looseEquals(recieved, argument) {

        const pass = recieved === argument;
        if (pass) {

            return {
                message: () => `expected ${ recieved } to not equal ${ argument }`,
                pass: true,
            };

        } else {

            return {
                message: () => `expected ${ recieved } to equal ${ argument }`,
                pass: false,
            };

        }

    },
});

function loadURDF(page, urdf, options = {}) {

    return page.evaluate(async(urdf2, options2) => {

        return new Promise(resolve => {

            const manager = new THREE.LoadingManager();
            manager.onLoad = () => resolve();

            const loader = new URDFLoader(manager);
            Object.assign(loader, options2);
            loader.load(urdf2, robot => window.robot = robot);

        });

    }, urdf, options);

}

function setAngle(page, jointName, angle) {

    return page.evaluate((jointName, angle) => {

        const joint = window.robot.joints[jointName];
        joint.setAngle(angle);
        return joint.angle;

    }, jointName, angle);

}

async function testJointAngles(page) {

    const joints = await page.evaluate(() => Object.keys(window.robot.joints));
    for (var key of joints) {

        const info = await page.evaluate(jointName => {

            const joint = window.robot.joints[jointName];
            return { jointType: joint.jointType, limit: joint.limit };

        }, key);

        if (info.jointType === 'continuous') {

            const angle = 10000 * Math.random();
            const res = await setAngle(page, key, angle);
            expect(res).looseEquals(angle);

        } else if (info.jointType === 'fixed') {

            const angle = Math.random() * 1000;
            const res = await setAngle(page, key, angle);
            expect(res).looseEquals(0);

        } else if (info.jointType === 'revolute' || info.jointType === 'prismatic') {

            const min = info.limit.lower - Math.random() * 1000 - 0.01;
            const minres = await setAngle(page, key, min);
            expect(minres).looseEquals(info.limit.lower);

            const max = info.limit.upper + Math.random() * 1000 + 0.01;
            const maxres = await setAngle(page, key, max);
            expect(maxres).looseEquals(info.limit.upper);

            const angle = info.limit.lower + (info.limit.upper - info.limit.lower) * Math.random();
            const res = await setAngle(page, key, angle);
            expect(res).looseEquals(angle);

        } else if (info.jointType === 'planar' || info.jointType === 'floating') {

            // TODO: these joints are not supported

        }

    }

}

module.exports = {

    loadURDF,
    setAngle,
    testJointAngles,

};
