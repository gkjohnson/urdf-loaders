# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/en/1.0.0/)
and this project adheres to [Semantic Versioning](http://semver.org/spec/v2.0.0.html).

## Unreleased
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
