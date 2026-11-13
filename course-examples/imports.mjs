// Question 26: ES6 and ES5 Imports
import { basename } from 'node:path';
export const lesson = basename(import.meta.url);
