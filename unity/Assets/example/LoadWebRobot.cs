using UnityEngine;
using UnityEngine.Networking;
using System.IO;
using System.Collections;
using System.Collections.Generic;
using System;

public class LoadWebRobot : LoadRobot {

    override protected URDFRobot CreateRobot(string urdfPath, Dictionary<string, string> packages) {

        URDFRobot ujl = new GameObject("Pending Robot").AddComponent<URDFRobot>();
        StartCoroutine(DownloadRobot(urdfPath, packages, ujl));

        return ujl;

    }

    IEnumerator DownloadRobot(string urdfPath, Dictionary<string, string> packages, URDFRobot ur) {

        using (UnityWebRequest www = UnityWebRequest.Get(urdfPath)) {

            yield return www.SendWebRequest();

            if (www.isNetworkError || www.isHttpError) {

                Debug.LogError(www.error);

            } else {

                Uri uri = new Uri(urdfPath);
                string workingPath = uri.Host + Path.GetDirectoryName(uri.PathAndQuery);

                URDFLoader.Options opt = new URDFLoader.Options() {
                    workingPath = workingPath,
                    loadMeshCb = (path, ext, done) => StartCoroutine(DownloadModel(path, ext, done)),
                    target = ur
                };

                URDFLoader.Parse(www.downloadHandler.text, packages, opt);

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

                    Mesh[] meshes = StlLoader.Parse(www.downloadHandler.data);

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
