using System.IO;
using UnityEngine;
using System.Collections.Generic;
using System.Text;

// STL Format
// https://en.wikipedia.org/wiki/STL_(file_format)
// Loads the Binary STL format
public class StlLoader {

    const int MAX_VERTEX_COUNT = 65000;    
    
    // Returns an array of meshes used to build up
    // the given STL
    public static Mesh[] Load(string fileName) {

        return Load(File.ReadAllBytes(fileName));

    }

    public static Mesh[] Load(byte[] bytes) {

        BinaryReader reader = new BinaryReader(new MemoryStream(bytes));

        // Read and throw out the header
        byte[] fileTypeBytes = reader.ReadBytes(5);
        string fileType = Encoding.ASCII.GetString(fileTypeBytes);

        if (fileType == "solid") {

            Debug.LogWarning("ASCII STL files are not supported.");
            return null;

        } else {

            reader.ReadBytes(75);
            return LoadBinary(reader);

        }
        
    }

    static Mesh[] LoadBinary(BinaryReader reader) {

        uint trianglesCount = reader.ReadUInt32();
        Mesh[] meshes = new Mesh[Mathf.CeilToInt(trianglesCount * 3.0f / MAX_VERTEX_COUNT)];

        List<Vector3> vertices = new List<Vector3>();
        List<Vector3> normals = new List<Vector3>();
        List<int> triangles = new List<int>();
        int currTri = 0;
        int meshIndex = 0;

        for (int i = 0; i < trianglesCount; i++){
            Vector3 n = ReadBinaryVectory(reader);

            normals.Add(n);
            normals.Add(n);
            normals.Add(n);

            Vector3 v0 = ReadBinaryVectory(reader);
            Vector3 v1 = ReadBinaryVectory(reader);
            Vector3 v2 = ReadBinaryVectory(reader);

            vertices.Add(v0);
            vertices.Add(v1);
            vertices.Add(v2);

            // Add vertices in reverse order because of Unity frame conversion
            triangles.Add(currTri + 2);
            triangles.Add(currTri + 1);
            triangles.Add(currTri + 0);
            currTri += 3;

            // Attribute byte count
            // assume unused
            reader.ReadUInt16();
            
            if (vertices.Count <= MAX_VERTEX_COUNT - 1) continue;
                        
            meshes[meshIndex++] = ToMesh(vertices, normals, triangles);
            
            vertices.Clear();
            normals.Clear();
            triangles.Clear();
            currTri = 0;
        }

        if (vertices.Count > 0) meshes[meshIndex++] = ToMesh(vertices, normals, triangles);

        return meshes;

    }
    
    /* Utilities */
    // Read a vector from the binary reader
    static Vector3 ReadBinaryVectory(BinaryReader br) {

        Vector3 v = new Vector3(br.ReadSingle(), br.ReadSingle(), br.ReadSingle());

        // convert from STL to Unity frame
        return new Vector3(-v.y, v.z, v.x);

    }

    // Convert the verts, normals, and triangles
    // to a mesh
    static Mesh ToMesh(List<Vector3> vertices, List<Vector3> normals, List<int> triangles) {

        Mesh mesh = new Mesh {
            vertices = vertices.ToArray(),
            triangles = triangles.ToArray(),
            normals = normals.ToArray()
        };
        
        mesh.RecalculateBounds();

        return mesh;

    }
}
