const { readFile } = require('fs').promises;
const { join } = require('path');
const { Type, DEFAULT_SCHEMA, load } = require('js-yaml');
const tinycolor = require('tinycolor2');

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

// function to change the value/brightness of a hexcode
const withValueType = new Type('!value', {
    kind: 'sequence', // Expect a sequence of data
    construct: ([hexRGB, value]) => {
        // Convert the hexRGB to a tinycolor object
        const color = tinycolor(hexRGB);
        // Get the HSV representation of the color
        let hsvColor = color.toHsv();
        // Change the value/brightness to the provided value (range: 0-100)
        hsvColor.v = value / 100; // tinycolor works with a value between 0 and 1
        // Convert the modified HSV color back to hexcode
        const modifiedHex = tinycolor(hsvColor).toHexString();
        // Return the modified hexcode
        return modifiedHex;
    },
    represent: ([hexRGB, value]) => {
        // Convert the hexRGB to a tinycolor object
        const color = tinycolor(hexRGB);
        // Get the HSV representation of the color
        let hsvColor = color.toHsv();
        // Change the value/brightness to the provided value (range: 0-100)
        hsvColor.v = value / 100; // tinycolor works with a value between 0 and 1
        // Convert the modified HSV color back to hexcode
        const modifiedHex = tinycolor(hsvColor).toHexString();
        // Return the modified hexcode
        return modifiedHex;
    },
});

const schema = DEFAULT_SCHEMA.extend([withAlphaType, withValueType]);
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
    const base = load(yamlFile, { schema });

    // Get the main color
    const mainColor = tinycolor(base.MAINCOLOR);

    // Define the brightness values for your sub colors
    const brightnessValues = [0.8, 0.6, 0.4, 0.2];

    // Generate the sub colors
    const subColors = {};
    brightnessValues.forEach(brightness => {
        // Get the HSV representation of the main color
        let hsvColor = mainColor.toHsv();
        // Change the value/brightness
        hsvColor.v = brightness;
        // Convert the modified HSV color back to hexcode
        const modifiedHex = tinycolor(hsvColor).toHex();
        // Store the modified hexcode with the corresponding key
        subColors[`main${brightness * 100}`] = modifiedHex;
    });

    // Add the sub colors to the base object
    base.colors = { ...base.colors, ...subColors };

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
