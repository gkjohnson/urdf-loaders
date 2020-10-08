import { Color } from 'three';
import { JSDOM } from 'jsdom';
import URDFLoader from '../src/URDFLoader.js';

const jsdom = new JSDOM();
const window = jsdom.window;
global.DOMParser = window.DOMParser;
global.XMLSerializer = window.XMLSerializer;

describe('URDFLoader', () => {
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
});
