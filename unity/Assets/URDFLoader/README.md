# unity urdf-loader

Utilities for loading URDF files and STL geometry into Unity

![Example](../docs/unity-example.gif)

# Use

## Basic Use

```cs
Dictionary packages = new Dictionary<string, string>();
packages["r2_description"] = "./path/to/r2_description";
packages["val_description"] = "./path/to/val_description";

// using .Load
URDFRobot robot = URDFLoader.Load(".../path/to/urdf", packages);

// using .Parse
StreamReader reader = new StreamReader(".../path/to/urdf");
URDFRobot robot = URDFLoader.Parse(reader.ReadToEnd(), packages);
```

## Loading Custom Models

If needed the geometry loader can be overriden to support extra file formats including GLTF using the [UnityGLTF](https://github.com/KhronosGroup/UnityGLTF) package.

```cs
URDFLoader.Options options = new URDFLoader.Options();
options.loadMeshCb = (string path, string ext, Action<GameObject[]> done) => {

    if (ext == "glb" || ext == "gltf") {

        FileLoader loader = new FileLoader(URIHelper.GetDirectoryName(path));
        GLTFSceneImporter sceneImporter = new GLTFSceneImporter(Path.GetFileName(path), loader);
        StartCoroutine(sceneImporter.LoadScene(onLoadComplete: gameObject => {

            // Apply a transformation to the GLTF to correct the rotation for the URDF frame.
            gameObject.transform.localRotation = Quaternion.Euler(270, 90, 0);
            done(new GameObject[] { gameObject });

        }));

    } else {

        URDFLoader.LoadMesh(path, ext, done);

    }

};

URDFRobot robot = URDFLoader.Load(".../path/to/urdf", packages, options);
```

## Limitations
- The Collada model loader currently does not support textures or materials and loads the models with an offset rotation ([Issue #52](https://github.com/gkjohnson/urdf-loaders/issues/52)).
- Only `continuous`, `revolute`, and `fixed` joints are supported.

# API

## URDFLoader

### .Load

```js
static Load(
    urdfPath : string,
    package : string | Dictionary< string, string >,
    options? : URDFLoader.Options
) : URDFRobot
```

Reads and processes the urdf at the given path, returning a `URDFRobot` that describes the whole robot.

`urdfPath` is the path to the URDF file.

`package` is either a string or a dictionary defining package names to package paths. If the package is just a string then it replaces the `package://` portion of the path. If it is a dictionary then it represents a list of packages by `packageName : packagePath` so that multiple packages can be specified.

`options` specifies a set of options for the loader. See more options below.

### .Parse

```js
static Parse(
    urdfContent : string,
    package : string | Dictionary< string, string >,
    options : URDFLoader.Options
) : URDFRobot
```

Same  as [Load](#.Load), but the raw contents of the urdf file in the `urdfContent` parameter rather than a path.

## URDFLoader.Options

Struct with a set of optional fields to augment the behavior of the loader.

### .loadMeshCb

```js
loadMeshCb : System.Action< string, string, System.Action< GameObject[] > >
```

A function for loading geometry in a custom way or in unsupported formats. `URDFLoader.LoadMesh` loads STL files and is used by default.

The function is passed a path to the model, the models file extension and a callback to pass an array of game objects when finished.

### .target

```js
target : URDFRobot
```

An existing URDFRobot to build the robot in to.

### workingPath

```
workingPath : String
```

The directory to use to resolve relative file paths in the URDF. Defaults to the URDF directory when using `LoadRobot`.

## URDFRobot

### .SetAngle
```js
SetAngle( name : String, radians : Number ) : Number
```

Sets the angle (in radians) of the joint with the given name. Throws an error if the joint does not exist.

### .TrySetAngle

```js
TrySetAngle( name : String, radians : Number) : Boolean
```

Same as [SetAngle](#.SetAngle), but does not throw an error. Returns `true` if it was able to set the angle.

### .GetAnglesAsDictionary

```js
getAnglesAsDictionary() : Dictionary< string, float >
```

Returns a new dictionary with the current angle of all the joints on the robot.

### .SetAnglesFromDictionary

```js
SetAnglesFromDictionary( angles : Dictionary< string, float > ) : void
```

Takes a dictionary and sets all the angles on the robot that are listed in the dictionary.

# LICENSE

The software is available under the [Apache V2.0 license](../../../LICENSE).

Copyright © 2020 California Institute of Technology. ALL RIGHTS
RESERVED. United States Government Sponsorship Acknowledged.
Neither the name of Caltech nor its operating division, the
Jet Propulsion Laboratory, nor the names of its contributors may be
used to endorse or promote products derived from this software
without specific prior written permission.
