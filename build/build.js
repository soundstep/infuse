#!/usr/bin/env node

const fs = require('fs');
const Terser = require("terser");
const packageJson = require('../package.json');

const date = new Date().toLocaleString('en-GB', { timeZone: 'UTC' }).split(',')[0];
const banner = `/* infuse - v${packageJson.version} - ${date} - https://github.com/soundstep/infuse */`;

const input = fs.readFileSync('lib/infuse.js', 'utf8');
const result = Terser.minify(input, {
    warnings: true,
    output: {
        preamble: banner
    }
});

if (result.error) {
    throw result.error;
}

fs.writeFileSync('dist/infuse.min.js', result.code, 'utf8');
