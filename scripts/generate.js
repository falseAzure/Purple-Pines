const { readFile } = require('fs').promises;
const fs = require('fs');
const { join } = require('path');
const { Type, DEFAULT_SCHEMA, load } = require('js-yaml');
const tinycolor = require('tinycolor2');
const readline = require('readline');
const yaml = require('js-yaml');
const { stdout } = require('process');

const MAINCOLOR = tinycolor('#5bb37b')
const ACCENTCOLOR = tinycolor('#d333ff')

const readInterface = readline.createInterface({
    input: fs.createReadStream('./src/purplepines.yml'),
    output: process.stdout,
    console: false
});

let yamlString = '';
readInterface.on('line', function (line) {
    if (line.trim() === 'foreground:') {
        readInterface.close();
    } else {
        yamlString += line + '\n';
    }
});


// const colors = yaml.load(yamlString, { DEFAULT_SCHEMA });

const colors = yaml.load(yamlString, { DEFAULT_SCHEMA });

// Get the main color
// const mainColor = tinycolor(colors.MAIN);

// Get the main color
// const MAINCOLOR = tinycolor(colors.MAIN);
// const ACCENTCOLOR = tinycolor(colors.ACCENT);

// readInterface.on('close', function () {
// let data = yaml.load(yamlString, { DEFAULT_SCHEMA });
// const colors = yaml.load(yamlString, { DEFAULT_SCHEMA });

// Get the main color
// const MAINCOLOR = tinycolor(colors.MAIN);
// const ACCENTCOLOR = tinycolor(colors.ACCENT);

// const maincolor = data.purplepines.base.find((item) => item['&MAIN']);
// const accentcolor = data.purplepines.base.find((item) => item['&ACCENT']);

// console.log(maincolor['&MAIN']); // '#5bb37b'
// console.log(accentcolor['&ACCENT']); // 'd333ff'
// });
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


// function to add alpha channel to hexcode
const withAlphaType = new Type('!alpha', {
    kind: 'sequence',
    construct: ([hexRGB, alpha]) => hexRGB + alpha,
    represent: ([hexRGB, alpha]) => hexRGB + alpha,
});

const withHSVType = new Type('!hsv', {
    kind: 'sequence', // Expect a sequence of data
    construct: ([color_type, saturation, value]) => {
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
            hsvColor.v = value / 100; // tinycolor works with a value between 0 and 1
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
            hsvColor.v = value / 100; // tinycolor works with a value between 0 and 1
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
    const colors = yaml.load(yamlString, { DEFAULT_SCHEMA });
    const base = load(yamlFile, { schema });

    // Get the main color
    const mainColor = tinycolor(colors.MAIN);
    stdout.write(mainColor.toHexString());
    // print(mainColor);

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
