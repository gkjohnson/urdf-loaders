import { Color } from 'three';
import { JSDOM } from 'jsdom';
import URDFLoader from '../src/URDFLoader.js';

const jsdom = new JSDOM();
const window = jsdom.window;
global.DOMParser = window.DOMParser;
global.XMLSerializer = window.XMLSerializer;
global.fetch = function(url) {
    url = url.replace(/^(\.\/)+/, './');
    return Promise.resolve({
        text() {
            if (url in files) {
                return Promise.resolve(files[url]);
            } else {
                return Promise.reject(new Error());
            }
        },
    });
};

describe('URDFLoader', () => {
    it('should parse material colors and name.', () => {
        const loader = new URDFLoader();
        const res = loader.parse(`
            <robot name="TEST">
                <material name="Cyan">
                    <color rgba="0 1.0 1.0 1.0"/>
                </material>
                <link name="LINK">
                    <visual>
                        <geometry>
                            <box size="1 1 1"/>
                        </geometry>
                        <material name="Cyan"/>
                    </visual>
                </link>
            </robot>
        `);

        const material = res.children[0].material;
        expect(material.name).toEqual('Cyan');
        expect(material.color).toEqual(new Color(0, 1, 1));
        expect(material.transparent).toEqual(false);
        expect(material.depthWrite).toEqual(true);
        expect(material.opacity).toEqual(1.0);
    });

    it('should parse transparent materials correctly.', () => {
        const loader = new URDFLoader();
        const res = loader.parse(`
            <robot name="TEST">
                <material name="Cyan">
                    <color rgba="0 1.0 1.0 0.5"/>
                </material>
                <link name="LINK">
                    <visual>
                        <geometry>
                            <box size="1 1 1"/>
                        </geometry>
                        <material name="Cyan"/>
                    </visual>
                </link>
            </robot>
        `);

        const material = res.children[0].material;
        expect(material.name).toEqual('Cyan');
        expect(material.color).toEqual(new Color(0, 1, 1));
        expect(material.transparent).toEqual(true);
        expect(material.depthWrite).toEqual(false);
        expect(material.opacity).toEqual(0.5);
    });
});
