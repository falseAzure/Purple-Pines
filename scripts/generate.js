const { readFile } = require('fs').promises;
const fs = require('fs');
const { join } = require('path');
const { Type, DEFAULT_SCHEMA, load } = require('js-yaml');
const tinycolor = require('tinycolor2');
const readline = require('readline');
const yaml = require('js-yaml');
const { stdout } = require('process');

//TODO: Add reversed color theme

/**
 * @typedef {Object} TokenColor - Textmate token color.
 * @prop {string} [name] - Optional name.
 * @prop {string[]} scope - Array of scopes.
 * @prop {Record<'foreground'|'background'|'fontStyle',string|undefined>} settings - Textmate token settings.
 *       Note: fontStyle is a space-separated list of any of `italic`, `bold`, `underline`.
 */

/**
 * @typedef {Object} Theme - Parsed theme object.
 * @prop {Record<'base'|'ansi'|'brightOther'|'other', string[]>} purplepines - purplepines color variables.
 * @prop {Record<string, string|null|undefined>} colors - VSCode color mapping.
 * @prop {TokenColor[]} tokenColors - Textmate token colors.
 */

/**
 * @typedef {(yamlObj: Theme) => Theme} ThemeTransform
 */


// Read the file line by line to get Base and Accent colors
let MAINCOLOR;
let ACCENTCOLOR;
let FACTOR;

function readYamlFile() {
    return new Promise((resolve, reject) => {
        const readInterface = readline.createInterface({
            input: fs.createReadStream('./src/purplepines.yml'),
            console: false
        });

        let yamlString = '';
        readInterface.on('line', function (line) {
            if (line.trim() === 'foreground:') {
                readInterface.close();
                resolve(yaml.load(yamlString));
            } else {
                yamlString += line + '\n';
            }
        });

        readInterface.on('error', reject);
    });
}

readYamlFile().then(colors => {
    MAINCOLOR = tinycolor(colors.purplepines.base[0]);
    ACCENTCOLOR = tinycolor(colors.purplepines.base[1]);
    FACTOR = parseFloat(colors.purplepines.base[2]);
    console.log(`MAINCOLOR: ${MAINCOLOR.toHexString()}`);
    console.log(`ACCENTCOLOR: ${ACCENTCOLOR.toHexString()}`);
    console.log(`FACTOR: ${FACTOR}`);
}).catch(console.error);


// function to add alpha channel to hexcode
const withAlphaType = new Type('!alpha', {
    kind: 'sequence',
    // construct: ([hexRGB, alpha]) => hexRGB + alpha,
    construct: ([hexRGB, alpha]) => {
        color = tinycolor(hexRGB);
        color.setAlpha(alpha / 100);
        return color.toHex8String();
    },
    // represent: ([hexRGB, alpha]) => hexRGB + alpha,
    represent: ([hexRGB, alpha]) => {
        color = tinycolor(hexRGB);
        color.setAlpha(alpha / 100);
        return color.toHex8String();
    },
});

// function to add saturation and value to hexcode
const withHSVType = new Type('!hsv', {
    kind: 'sequence', // Expect a sequence of data
    construct: ([color_type, saturation, value]) => {
        if (color_type == 'main') {
            hsvColor = MAINCOLOR.toHsv();
        } else if (color_type == 'accent') {
            hsvColor = ACCENTCOLOR.toHsv();
        }
        if (saturation != null) {
            hsvColor.s = saturation / 100; // tinycolor works with a value between 0 and 1
        }
        if (value != null) {
            hsvColor.v = Math.max(Math.min((value / 100) * FACTOR, 1), 0); // tinycolor works with a value between 0 and 1
        }
        const modifiedHex = tinycolor(hsvColor).toHexString();
        return modifiedHex;
    },
    represent: ([color_type, saturation, value]) => {
        if (color_type == 'main') {
            hsvColor = MAINCOLOR.toHsv();
        } else if (color_type == 'accent') {
            hsvColor = ACCENTCOLOR.toHsv();
        }
        // hsvColor = MAINCOLOR.toHsv();
        if (saturation != null) {
            hsvColor.s = saturation / 100; // tinycolor works with a value between 0 and 1
        }
        if (value != null) {
            hsvColor.v = Math.max(Math.min((value / 100) * FACTOR, 1), 0); // tinycolor works with a value between 0 and 1
        }
        const modifiedHex = tinycolor(hsvColor).toHexString();
        return modifiedHex;
    },
});

const schema = DEFAULT_SCHEMA.extend([withAlphaType, withHSVType]);


/**
 * Soft variant transform.
 * @type {ThemeTransform}
 */
const transformSoft = theme => {
    /** @type {Theme} */
    const soft = JSON.parse(JSON.stringify(theme));
    const brightColors = [...soft.purplepines.ansi, ...soft.purplepines.brightOther];
    for (const key of Object.keys(soft.colors)) {
        if (brightColors.includes(soft.colors[key])) {
            soft.colors[key] = tinycolor(soft.colors[key])
                .desaturate(20)
                .toHexString();
        }
    }
    soft.tokenColors = soft.tokenColors.map((value) => {
        if (brightColors.includes(value.settings.foreground)) {
            value.settings.foreground = tinycolor(value.settings.foreground).desaturate(20).toHexString();
        }
        return value;
    })
    return soft;
};



module.exports = async () => {
    const yamlFile = await readFile(
        join(__dirname, '..', 'src', 'purplepines.yml'),
        'utf-8'
    );

    /** @type {Theme} */
    // const colors = yaml.load(yamlString, { schema });
    const base = load(yamlFile, { schema });

    // Remove nulls and other falsey values from colors
    for (const key of Object.keys(base.colors)) {
        if (!base.colors[key]) {
            delete base.colors[key];
        }
    }

    return {
        base,
        soft: transformSoft(base),
    };
};
