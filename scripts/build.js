const fs = require('fs');
const path = require('path');
const generate = require('./generate');
const modify = require('./modify');
const yaml = require('js-yaml');

const THEME_DIR = path.join(__dirname, '..', 'theme');
const YAML_FILE = path.join(__dirname, '..', 'src', 'purplepines.yml');

if (!fs.existsSync(THEME_DIR)) {
    fs.mkdirSync(THEME_DIR);
}

// modifyColorBrightness(YAML_FILE);

module.exports = async () => {
    const { base, soft } = await generate();

    return Promise.all([
        fs.promises.writeFile(
            path.join(THEME_DIR, 'purplepines.json'),
            JSON.stringify(base, null, 4)
        ),
        // fs.promises.writeFile(
        //     path.join(THEME_DIR, 'purplepines.yml'),
        //     yaml.dump(base)
        // ),
        fs.promises.writeFile(
            path.join(THEME_DIR, 'purplepines-soft.json'),
            JSON.stringify(soft, null, 4)
        ),
    ]);
};

if (require.main === module) {
    module.exports();
}
