using System;
using System.IO;
using UnityEngine;

public class DAELoader
{
  /// <summary>
  /// loads all meshes associated with the dae file
  /// </summary>
  /// <param name="data">should be the string contents of the dae file or the path to the dae file</param>
  /// <param name="textures">a collection of the names of the textures associated with the meshes, if there are no texture or you do not care about them pass string[0]</param>
  /// <param name="isContent">flag to say if the data argument is the contents of the dae file or a path to the dae file</param>
  /// <returns></returns>
  public static Mesh[] Load(string data, ref string[] textures, bool isContent = false)
  {
    var Meshes = new Mesh[0];
    ColladaLite cLite = null;
    if (isContent)
    {
      cLite = new ColladaLite(data);
    }
    else
    {
      if (File.Exists(data))
      {
        cLite = new ColladaLite(File.ReadAllText(data));
      }
      throw new Exception("File not found at " + data);
    }
    Meshes = cLite.meshes.ToArray();
    if (textures.Length > 0)
      textures = cLite.textureNames.ToArray();
    return Meshes;
  }
}
