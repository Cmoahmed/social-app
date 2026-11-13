// Question 26: ES6 and ES5 Imports
const { basename } = require('node:path');
module.exports = { lesson: basename(__filename) };
