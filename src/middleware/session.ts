import jwt from 'jsonwebtoken';
import { NextFunction, Request, Response } from 'express';

export default async function session(req: Request, res: Response, next: NextFunction) {
  let token;
  let id;
  if(!req.headers['authorization']) {
    return res.status(401).send({ error: 'Invalid authorization data was given.' });
  }
  if(!req.headers['authorization'].startsWith('Bearer ')) {
    return res.status(401).send({ error: 'Invalid authorization data was given.' });
  }
  if(req.headers['authorization'].includes('Bearer ')) {
    token = req.headers['authorization'].split('Bearer ')[1];
  }
  await jwt.verify(token, process.env.jwt_secret as string, async (err, data) => {
    // @ts-ignore
    // TODO: make this more efficient. This currently slows down API requests by 30 ms
    let finduser = await db.users.findOne({ id: data.id });
    if(!finduser) return res.status(401).send({ error: 'Something went wrong when trying to authorize.' });
    if(err) return res.status(401).send({ error: 'Invalid authorization data was given.' });
    // @ts-ignore
    req.user = data as any;
    next();
  });
};
