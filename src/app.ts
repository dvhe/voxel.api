import express from 'express';
import { json, urlencoded } from 'body-parser';
import cors from 'cors';
import { resolve } from 'path';
import Logger from '@pebblo/logger'
import Database from './database';

if (process.env.NODE_ENV !== 'production') {
  const { config } = require('dotenv')
  config({ path: resolve(__dirname, '../.env') });
}

import v2 from './routers/v2';

const app = express();

const port: number = 3000;

/**
 * Middlewares
 */
app.use(cors());
app.use(json());
app.use(urlencoded({ extended: true }));
// app.use(minio);

const main = async () => {

  // @ts-ignore
  global.db = new Database(process.env.db_url);
  // @ts-ignore
  await db.connect();

  app.use('/v2', v2);

  app.listen(port, () => {
    Logger('APP', `API Running on port ${port}`, false, ['cyan'])
  });
}

main();
