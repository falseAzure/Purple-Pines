const fs = require('fs');
const yaml = require('js-yaml');
const tinycolor = require('tinycolor2');
const path = require('path');

function modifyColorBrightness(yamlFilePath) {
    // Load YAML file
    let file = fs.readFileSync(yamlFilePath, 'utf8');
    let yamlDoc = yaml.load(file);

    // Extract main color
    let mainColor = yamlDoc['purplepines:base:'];

    // Modify brightness using the color library
    let modifiedColor = tinycolor(mainColor).desaturate(20).toHexString(); // Adjust the value as needed

    // Add new anchor with modified color
    yamlDoc['purplepines:base:modified'] = modifiedColor;

    // Write back to a new YAML file with _mod appended to original filename
    let yamlString = yaml.dump(yamlDoc);
    let dir = path.dirname(yamlFilePath);
    let ext = path.extname(yamlFilePath);
    let baseName = path.basename(yamlFilePath, ext);
    let newFilePath = path.join(dir, `${baseName}_mod${ext}`);
    fs.writeFileSync(newFilePath, yamlString, 'utf8');
}

module.exports = modifyColorBrightness;