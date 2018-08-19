using UnityEngine;
using UnityEngine.Networking;
using System.IO;
using System.Collections;
using System;

public class LoadWebRobot : LoadRobot {

    override protected URDFRobot CreateRobot(string urdfPath, string package) {

        URDFRobot ujl = new GameObject("Pending Robot").AddComponent<URDFRobot>();
        StartCoroutine(DownloadRobot(urdfPath, package, ujl));

        return ujl;

    }

    IEnumerator DownloadRobot(string urdfPath, string package, URDFRobot ur) {

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

                URDFLoader.BuildRobot(www.downloadHandler.text, package, opt);

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
