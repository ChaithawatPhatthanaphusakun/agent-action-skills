import { createApp } from './index.js';
import { getServerEnv } from './config/env.js';

console.log('Starting server initialization...');
const serverEnv = getServerEnv();
console.log('Environment loaded:', serverEnv.PORT);

const app = createApp();
console.log('App created, starting to listen...');

app.listen(serverEnv.PORT, '0.0.0.0', () => {
  console.log(`FixBill API listening on http://localhost:${serverEnv.PORT}`);
});