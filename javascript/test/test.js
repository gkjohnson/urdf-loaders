/* global
    describe it beforeAll afterAll beforeEach afterEach expect
*/
const puppeteer = require('puppeteer');
const path = require('path');
const { loadURDF, testJointAngles } = require('./utils.js');

let browser = null, page = null;

beforeAll(async() => {

    browser = await puppeteer.launch({ headless: true });
    page = await browser.newPage();
    await page.goto(path.join(__dirname, './test-setup.html'));

    page.on('error', e => { throw new Error(e); });
    page.on('pageerror', e => { throw new Error(e); });
    page.on('console', e => {

        if (e.type() === 'error') {

            throw new Error(e.text());

        }

    });

});

// TODO: Add tests for multipackage loading, other files
// TODO: Don't load from the web?
// TODO: Test model with fixed joints
// TODO: Test that joint functions rotate the joints properly

describe('TriATHLETE Climbing', async() => {

    beforeEach(async() => {

        // Model loads STL files and has continuous, prismatic, and revolute joints
        await loadURDF(
            page,
            'https://rawgit.com/gkjohnson/urdf-loaders/master/urdf/TriATHLETE_Climbing/urdf/TriATHLETE.URDF',
            'https://rawgit.com/gkjohnson/urdf-loaders/master/urdf/TriATHLETE_Climbing'
        );

    });

    it('should have the correct number of links', async() => {

        const jointCt = await page.evaluate(() => Object.keys(window.robot.urdf.joints).length);
        const linkCt = await page.evaluate(() => Object.keys(window.robot.urdf.links).length);

        expect(jointCt).toEqual(27);
        expect(linkCt).toEqual(28);

    });

    it('should load the correct joint types', async() => {

        const joints = await page.evaluate(() => Object.keys(window.robot.urdf.joints));
        for (var key of joints) {

            const info = await page.evaluate(`window.robot.urdf.joints['${ key }'].urdf`);

            if (/^W/.test(key)) expect(info.type).toEqual('continuous');
            else if (/^TC\d/.test(key)) expect(info.type).toEqual('prismatic');
            else expect(info.type).toEqual('revolute');

        }

    });

    it('should respect joint limits for different joint types', async() => {

        await testJointAngles(page);

    });

    afterEach(async() => {

        await page.evaluate(() => window.robot = null);

    });

});

afterAll(() => {

    browser.close();

});
