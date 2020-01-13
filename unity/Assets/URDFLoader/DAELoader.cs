using System;
using System.IO;
using UnityEngine;

public class DAELoader {
    /// <summary>
    /// loads all meshes associated with the dae file
    /// </summary>
    /// <param name="data">should be the string contents of the dae file</param>
    /// <param name="textures">a collection of the names of the textures associated with the meshes, if there are no texture or you do not care about them pass string[0]</param>
    /// <returns></returns>
    public static Mesh[] Load(string data, ref string[] textures) {

        var Meshes = new Mesh[0];
        ColladaLite cLite = null;
        cLite = new ColladaLite(data);
        Meshes = cLite.meshes.ToArray();
        if (textures.Length > 0) {

            textures = cLite.textureNames.ToArray();

        }
        return Meshes;

    }

    /// <summary>
    /// loads all meshes associated with the dae file
    /// </summary>
    /// <param name="data">should be the path to the dae file</param>
    /// <param name="textures">a collection of the names of the textures associated with the meshes, if there are no texture or you do not care about them pass string[0]</param>
    /// <returns></returns>
    public static Mesh[] LoadFromPath(string data, ref string[] textures) {

        var Meshes = new Mesh[0];
        ColladaLite cLite = null;
        if (File.Exists(data)) {

            cLite = new ColladaLite(File.ReadAllText(data));

        } else {

            throw new Exception("File not found at " + data);

        }

        Meshes = cLite.meshes.ToArray();
        if (textures.Length > 0) {

            textures = cLite.textureNames.ToArray();

        }
        return Meshes;
    }
}
