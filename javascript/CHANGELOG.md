# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/en/1.0.0/)
and this project adheres to [Semantic Versioning](http://semver.org/spec/v2.0.0.html).

## [Unreleased]
### Added
- Add support for providing multiple package paths

### Fixed
- Debounce urdf load so errors are not printed when changing models
- Create mesh primitives immediately instead of waiting a frame

## [0.3.4] - 2018-08-31
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
