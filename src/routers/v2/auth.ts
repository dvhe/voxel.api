import { Router, Response, Request } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
// import short from 'short-uuid';
import { Token } from 'snowflakey'
const snowflakey = require('snowflakey');
const snowflake = new snowflakey.Worker({
  name: 'starling',
  epoch: 1420070400000,
  workerId: 31,
  processId: undefined,
  workerBits: 8,
  processBits: 0,
  incrementBits: 14
});

const router = Router();

router.post('/login', async (req: Request, res: Response) => {
  const { email, password, code } = req.body;
  if(!email || !password)
      return res.status(400).send({ message: 'Missing required information' });
  try {
    // @ts-ignore
    const user = await db.users.findOne({ email: email.toLowerCase() });
    if(!user) 
      return res.status(404).send({ error: 'Unable to find that account' });
    if(user.suspended)
      return res.status(401).send({ error: 'Unable to login due to your account being disabled. Please check your email for more information.' });
    if(user && user.mfa_enabled) {
      if(code != "1337") return res.status(401).send({ error: 'Invalid MFA code was provided.' });
      return res.status(200).send({ message: 'Success' });
    }
    if(user) {
      if(bcrypt.compareSync(password, user.password)) {
        await jwt.sign({ id: user.id, iat: Math.floor(new Date().setMinutes(new Date().getMinutes() + 10)/1000|0) }, process.env.jwt_secret as string,
        { algorithm: 'HS256' }, (err, token) => {
          if(err) return res.status(400).json({ err: err.stack });
          const account = {
            id: user.id,
            username: `${user.username}@${user.tag}`,
            email: user.email,
            avatar: user.avatar,
            rooms: user.rooms,
            access_token: token
            // refresh_token: refresh_token
          }
          return res.status(200).json(account);
         });
        }
    } else {
      return res.status(401).json({ error: 'Unable to login, passwords did not match' });
    }
      } catch(err) {
        return res.status(400).send({ error: 'Something went wrong'});
    }
});

router.post('/register', async (req: Request, res: Response) => {
  const { username, email, password } = req.body;

  if(!email || !password || !username)
    return res.status(400).send({ message: 'Missing required information' });

  switch(true) {
    case(!username.match(/^(.){1,26}/)): {
      return res.status(400).send({ error: 'Usernames cannot be shorter than 1 character and cannot be longer than 25 characters' });
    }
    case(!email.includes('@') || !email.includes('.')): {
      return res.status(400).send({ error: 'Invalid email was provided.' });
    }
    case(!password.match(/^.*(?=.{8,})(?=.*\d)((?=.*[a-z]){1})((?=.*[A-Z]){1}).*$/)): {
      return res.status(400).send({ error: 'Your password must be 8 characters or longer, and contain one uppercase character and a number' });
    }
  }

  // @ts-ignore
  // const checkUsername = await db.users.findOne({ username: username});
  // if(checkUsername) return res.status(400).send({ error: 'That username is already in use.' });
  // @ts-ignore
  const checkEmail = await db.users.findOne({ email: email.toLowerCase() });
  if(checkEmail) return res.status(400).send({ error: 'That email is already in use.' });

  let tag = Math.random().toString().slice(2,6);
  // @ts-ignore
  const checkTag = await db.users.findOne({ catenated: `${username}@${tag}` });
  if(checkTag) tag = Math.random().toString().slice(2,6);

  try {
    let encryptedPass = await bcrypt.hash(password, 10);
    // @ts-ignore
    await db.users.insertOne({ id: snowflake.generate(), username: username, email: email.toLowerCase(), avatar: '', password: encryptedPass, tag: tag, catenated: `${username}@${tag}`,
                            email_code: '', email_verified: false, rooms: ['712507822550007808'], room_position: ['712507822550007808'], theme: 'dark', friends: [], blocked: [],
                            suspended: false, staff: false, developer: false, verified: false, registered_at: new Date().toISOString(),
                            bot: false, mfa_enabled: false
    });
    return res.status(200).send({ message: 'Successfully registered' });
  } catch(err) {
    return res.status(400).send({ error: 'It seems something went wrong' });
  }
});

export default router;
