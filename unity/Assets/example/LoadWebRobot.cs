using UnityEngine;
using UnityEngine.Networking;
using System.IO;
using System.Collections;
using System;

public class LoadWebRobot : LoadRobot {

    override protected URDFJointList CreateRobot(string urdfPath, string package) {

        URDFJointList ujl = new GameObject("Pending Robot").AddComponent<URDFJointList>();
        StartCoroutine(DownloadRobot(urdfPath, package, ujl));

        return ujl;

    }

    IEnumerator DownloadRobot(string urdfPath, string package, URDFJointList ujl) {

        using (UnityWebRequest www = UnityWebRequest.Get(urdfPath)) {

            yield return www.SendWebRequest();

            if (www.isNetworkError || www.isHttpError) {

                Debug.LogError(www.error);

            } else {

                Uri uri = new Uri(urdfPath);
                string workingPath = uri.Host + Path.GetDirectoryName(uri.PathAndQuery);

                URDFParser.BuildRobot(www.downloadHandler.text, package, workingPath, (path, ext, done) => StartCoroutine(DownloadModel(path, ext, done)), ujl);

            }

        }
        
    }

    IEnumerator DownloadModel(string path, string ext, Action<GameObject[]> done) {

        using (UnityWebRequest www = UnityWebRequest.Get(path)) {

            yield return www.SendWebRequest();

            if (www.isNetworkError || www.isHttpError) {

                Debug.LogError(www.error);

            } else {

                if (ext == "stl") {

                    Mesh[] meshes = StlLoader.Load(www.downloadHandler.data);

                    GameObject[] res = new GameObject[meshes.Length];
                    for (int i = 0; i < meshes.Length; i++) {
                        var mesh = meshes[i];
                        Renderer r = GameObject
                            .CreatePrimitive(PrimitiveType.Cube)
                            .GetComponent<Renderer>();
                        r.GetComponent<MeshFilter>().mesh = mesh;

                        res[i] = r.gameObject;
                    }
                    done(res);

                }

            }

        }

    }

    override protected void Update() {
        if (robot) {

            base.Update();

        }
    }

}
