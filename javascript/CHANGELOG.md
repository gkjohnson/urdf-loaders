# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/en/1.0.0/)
and this project adheres to [Semantic Versioning](http://semver.org/spec/v2.0.0.html).

## [0.12.4] - 2025.01.01
### Fixed
- The loader will use the correct working path if used multiple times.

## [0.12.3] - 2024.09.02
### Added
- d.ts definition for `loadAsync`.

## [0.12.2] - 2024.08.28
### Added
- Support for "planar" and "floating" joint types.

### Changed
- setJointValues function can now take "null" vaues.

## [0.12.1] - 2023-10-07
### Fixed
- Prismatic joints not moving as expected when there is a non-zero rotation.

## [0.12.0] - 2023-05-12
### Changed
- Bump three.js version to 0.152.2.

## [0.11.0] - 2023-05-02
### Fixed
- Add correct return type definitions for some functions.

### Changed
- Change use of \*BufferGeometry classes to be \*Geometry variants.
- Bumped three.js peer dependency version requirement.

## [0.10.5] - 2023-03-28
### Changed
- Removed log when modifying "mimic" joints.

## [0.10.4] - 2021-05-18
### Fixed
- Internal URDF material colors are implicitly converted to Linear colors.

## [0.10.3] - 2021-04-29
### Fixed
- Types for the loadMeshCb function.

## [0.10.2] - 2021-04-22
### Fixed
- Typescript definition for "packages" field to include function.

## [0.10.1] - 2021-04-16
### Added
- Reexport URDF Class types from the root file.

## [0.10.0] - 2021-04-16
### Fixed
- `URDFJoint.axis` not correctly defaulting to `1, 0, 0`.

### Changed
- Added `"type": "module"` to the package.json and made the main entry file point to the es6 module.
- Export URDF Class types as `interafaces` rather than `classes`.
- Changed URDF Class type definitions to be exported as `interface` rather than `class`.
 
## [0.9.5] - 2021-01-26
### Added
- Support for "mimic" joints.

### Fixed
- Incorrect mouseover and mouseout event firing with the manipulation element.

## [0.9.3] - 2021-01-19
### Fixed
- Unnecessary creation of a new quaternion when setting a joint angle.
- Throw a human readable error when fetch fails.
- The model failing to clone if the object names were changed.

### Added
- Ability to set the `packages` option to a function.

## [0.9.2] - 2020-10-23
### Added
- Normal bias to shadows in URDFViewerElement.

### Fixed
- Apply the mesh node scale to the parent visual node rather than the loaded mesh.
- URDFViewerElement incorrectly calling setJointValue.
- Incorrectly preserving rotation from loaded meshes.

## [0.9.1] - 2020-10-13
### Fixed
- Fix `URDFRobot.setJointValues` not always setting all joint values.

## [0.9.0] - 2020-10-09
### Added
- `URDFRobot.frames` map.
- `URDFRobot.visual` map.
- `URDFRobot.colliders` map.
- Visual and collider nodes now get the name of the associated urdf node.
- Typescript definitions for URDFVisual and URDFCollider objects.
- `setJointValue` function to `URDFJoint` and `URDFRobot`.
- `getFrame` function to `URDFRobot`.

### Changed
- Transparent materials now set `depthWrite` to false.
- Removed `setOffset`, `setAngles`, and `setAngle` functions from `URDFJoint` and `URDFRobot`.

### Fixed
- Incorrect use of `worldMatrixNeedsUpdate` to `matrixWorldNeedsUpdate`.

## [0.8.2] - 2020-06-08
### Changed
- License text in README to remove unnecessary copy.

## [0.8.1] - 2020-03-12
### Added
- Support for processing pre-parsed XML documents to the `parse` function. A `Document` or `Element` object as returned from `DOMParser` may be passed in place of the xml string.

## [0.8.0] - 2020-01-03
### Changed
- Moved the URDFLoader options to member variables instead of an object paramter to `parse` and `load` functions.
- Added `onError` and `onProgress` callbacks to `load` function.

## [0.7.3] - 2019-11-08
### Fixed
- Incorrect handling of empty "texture" tags that caused materials to display improperly.

## [0.7.2] - 2019-09-29
### Changed
- Caltech license copy.

## [0.7.1] - 2019-06-29
### Fixed
- Typescript definition file for URDFLoader.

## [0.7.0] - 2019-06-28
### Changed
- Use the jsm versions of the loader modules from three.js.
- Bump three.js peer dependency to 0.105.0.

## [0.6.3] - 2019-06-28
### Added
- Support for parsing collision nodes.

## [0.6.2] - 2019-04-18
### Added
- Typescript definition files

## [0.6.1] - 2019-03-06
### Fixed
- Continuous joints not being able to rotate.
- Always parse joint angles to numbers.

## [0.6.0] - 2019-02-23
### Added
- Added `setAngle` and `setAngles` function to the Robot node
- Added `meshLoadFunc` and `urlModifierFunc` functions to `URDFViewer` component.

### Changed
- Changed `loadMeshCb` function API to take `url`, `manager`, and `done`.
- Materials defined as "shared" by name in the URDF are shared among meshes, now.
- The root link is now the same as the URDF Robot object.
- Moved the `packages` parameter to the options object.

### Removed
- Removed `urdfLoader` and `loadingManager` fields from `URDFViewer` component.

## [0.5.3] - 2018-12-17
### Added
- `matrixWorldNeedsUpdate` is set to true when the URDFJoints are set.

### Fixed
- Scale being overwritten on models that are loaded with pre-set scale values.
- Loader not completing if a mesh could not be loaded.

## [0.5.2] - 2018-12-5
### Added
- URDF XML Node to URDF Joint, Link, and Robot objects
- Add clone functionality

### Changed
- OnComplete callback now fires once all meshes have loaded
- Removed unnecessary parent when creating a cylinder visual node

## [0.5.1] - 2018-11-14
### Fixed
- Use buffer variants of Box and Sphere geometry.
- Fix the way that roll, pitch, yaw rotations are applied.

## [0.5.0] - 2018-11-01
### Changed
- The root scripts are now es6 import compatible and require a build process to use

### Added
- Backward compatible umd versions of the scripts in `/umd`
- Support for shared, named materials in the URDF

## [0.4.3] - 2018-10-10
### Added
- Add `no-auto-recenter` field to the `urdf-viewer` web component.

## [0.4.2] - 2018-08-19
### Added
- Include `example/styles.css`

## [0.4.1] - 2018-08-19
### Changed
- README update

## [0.4.0] - 2018-08-19
### Changed
- Add "path" variable to parse function signature
- URDF paths are no longer resolved relative to the package path
- `parse` function signature changed
- `parse` returns the robot now
- `meshLoadCb` and `fetchOptions` have been moved into an `options` argument object
- Moved all fields from `Object3D.urdf` to the object itself
- Changed `type` to `jointType`

### Added
- Add `isURDFRobot`, `isURDFJoint`, `isURDFLink` fields to the robot, joints, and links
- Set the `type` field of the `Object3D` to `URDFRobot`, `URDFJoint`, and `URDFLink`

### Removed
- `node` field from the urdf info on joints, links, and the robot

## [0.3.5] - 2018-08-07
### Added
- Add support for providing multiple package paths

### Fixed
- Debounce urdf load so errors are not printed when changing models
- Create mesh primitives immediately instead of waiting a frame

## [0.3.4] - 2018-07-31
### Fixed
- Fixed sphere primitives not being added to the model
- Fixed cylinder primitive rotation

## [0.3.3] - 2018-07-28
### Changed
- Make element auto redraw whenever a texture loads

### Fixed
- Fix drag and drop file path cleansing in example files
- Fix console error on drag manipulation in manipulation element

## [0.3.2] - 2018-07-03
### Changed
- Add urdf-manipulator element for demo

## [0.3.1] - 2018-07-01
### Fixed
- Fix the example input fields not converting to radians

## [0.3.0] - 2018-06-30
### Changed
- Model bounding box is used to make better use of shadow map resolution.
- Fix joint controls still being clickable when hidden
- Rename `joint.urdf.limits` to `joint.urdf.limit` so it lines up with the URDF definition
- Full `http://` or `file://` uris are supported (package path is not prepended in this case)

## [0.2.6] - 2018-06-28
### Fixed
- Render meshes double sided in shadows
- Disable shadows casting on model when the shadow display is disabled

## [0.2.5] - 2018-06-28
### Changed
- Do not change the material type provided by the mesh loader to MeshLambertMaterial when setting the colors from the URDF.
- Use a hemisphere light and linear rendering in the element and example
- Enable better shadow rendering

## [0.2.4] - 2018-06-22
### Changed
- Change `urdf-viewer` element `up` attribute to default to +Z so it lines up with the default ROS coordinate frame

### Fixed
- Fix the default mesh loader throwing an error because `this` was undefined.

## [0.2.3] - 2018-06-22
### Added
- Add the `auto-redraw` attribute to the urdf-viewer element

## [0.2.2] - 2018-06-14
### Added
- Add `redraw()` function to the viewer element
- Add flipped variants of the ATHLETE URDF models

### Changed
- Update example to start at a nicer viewing angle
- Update some underlying example code

## [0.2.1] - 2018-06-13
### Changed
- Optimize rendering in `<urdf-viewer>`
- Keep the robot in the middle of the screen in `<urdf-viewer>`
- Adjust the the `<urdf-viewer>` up attribute to line up with the default ROS coordinate frame

### Fixed
- Meshes not scaling the by mesh tags `scale` attribute
- Revolute joints rotating the wrong direction

## [0.1.2] - 2018-05-28
### Added
- Support for prismatic joints

### Fixed
- Fix not defaulting revolute joint limits to 0
