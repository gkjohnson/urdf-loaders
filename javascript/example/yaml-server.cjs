const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = 3000;
const { exec } = require('child_process');

app.use(cors());

// Middleware do obsługi tekstu (YAML)
app.use(express.text({ type: 'text/yaml' }));

// Endpoint do zapisu pliku YAML
app.post('/save-yaml', (req, res) => {
    const yamlContent = req.body;
    const savePath = path.join(__dirname, 'husarion_ugv_componenets.yaml');

    // Zapisz otrzymaną treść YAML do pliku uploaded_content.yaml (dla debugowania)
    console.log('Otrzymana treść YAML:', yamlContent);

    fs.writeFile(savePath, yamlContent, (err) => {
        if (err) {
            console.error('Błąd zapisu pliku YAML:', err);
            return res.sendStatus(500);
        }

        fs.writeFileSync(path.join(__dirname, 'husarion_ugv_componenets.yaml'), yamlContent);
        console.log('Plik YAML zapisany pomyślnie.');
    });

    // Wywołanie xacro z odpowiednimi argumentami

    const xacroPath = path.resolve(
        '/ros2_ws/src/husarion_ugv_ros/husarion_ugv_description/urdf/panther.urdf.xacro'
    );
    const urdfOutput = path.join("/app/urdf/husarion_ugv/urdf/panther.urdf");

    const cmd = `xacro "${xacroPath}" components_config_path:="${savePath}" > "${urdfOutput}"`;

    exec(cmd, (error, stdout, stderr) => {
        if (error) {
            console.error(`Błąd wykonania xacro: ${error.message}`);
            return;
        }
        if (stderr) {
            console.error(`xacro stderr: ${stderr}`);
        }
        console.log('xacro wygenerował plik panther.urdf');

        fs.readFile(urdfOutput, 'utf8', (readErr, data) => {
            if (readErr) {
                console.error('Błąd odczytu pliku panther.urdf:', readErr);
                return;
            }
            const replaced = data
                .replace(/package:\/\/husarion_ugv_description/g, '/ros2_ws/src/husarion_ugv_ros/husarion_ugv_description/')
                .replace(/package:\/\/husarion_components_description/g, '/ros2_ws/src/husarion_components_description')
                .replace(/package:\/\//g, '/opt/ros/jazzy/share/');
            fs.writeFile(urdfOutput, replaced, 'utf8', (writeErr) => {
                if (writeErr) {
                    console.error('Błąd zapisu pliku panther.urdf:', writeErr);
                } else {
                    console.log('Podmieniono ścieżki mesh w panther.urdf');
                }
            });
        });
    });



    res.sendStatus(200);
});

// Serwowanie plików statycznych (np. index.html)
app.use(express.static(path.join(__dirname, 'example')));

app.listen(PORT, () => {
    console.log(`Serwer działa na http://localhost:${PORT}`);
});
