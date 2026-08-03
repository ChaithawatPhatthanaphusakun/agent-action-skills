import { createApp } from './index.js';
import { getServerEnv } from './config/env.js';

const serverEnv = getServerEnv();

createApp().listen(serverEnv.PORT, '0.0.0.0', () => {
  console.log(`FixBill API listening on port ${serverEnv.PORT}`);
});
