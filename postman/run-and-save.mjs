import newman from 'newman';
import { readFileSync } from 'node:fs';

// Do not persist responses, tokens or populated environments into public files.
const collection = JSON.parse(readFileSync(new URL('./SocialApp_Assignment.postman_collection.json', import.meta.url), 'utf8'));
const environment = JSON.parse(readFileSync(process.env.POSTMAN_ENVIRONMENT ?? new URL('./SocialApp_Local.postman_environment.json', import.meta.url), 'utf8'));
newman.run({ collection, environment, reporters: ['cli'],
  ...(process.env.POSTMAN_FOLDER ? { folder: process.env.POSTMAN_FOLDER } : {}),
}, (error, summary) => {
  if (error || summary.run.failures.length) process.exitCode = 1;
  if (error) console.error(error.message);
});
