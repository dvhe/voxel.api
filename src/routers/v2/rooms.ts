import { Router, Response, Request } from 'express';
import session from '../../middleware/session';
import { permissions } from '../../middleware/util';
import { customAlphabet } from 'nanoid'
// error TS2345: Argument of type 'RegExp' is not assignable to parameter of type 'string'. :(
const nanoid = customAlphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz1234567890', 10)
const router = Router();
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
import short from 'short-uuid';

const { messages } = require('../../utils.json');

// GET: ALL CURRENT CHANNELS ('/')
router.get('/', session, async (req, res) =>  {
  // const room = await db.rooms.find({ members: req.user.id }).toArray();
  // @ts-ignore
  const room = await db.users.findOne({ id: req.user.id });
  // @ts-ignore
  return res.json(room);
});

// --------------------- CHANNEL ROUTES ---------------------

// GET: ALL CURRENT INVIRES ('/server/invites')
router.get('/:id/invites', session, async (req, res) => {
  try {
    // @ts-ignore
    const room = await db.rooms.findOne({ id: req.params.id });
    if(!room) return res.status(404).send({ error: messages.room_error });
    // @ts-ignore
    if(!room.members.includes(req.user.id))
        return res.status(400).send({ error: 'Unauthorized' });
    res.status(200).send(room.invites);
  } catch(err) {
    return res.status(400).send({ error: 'Unable to retrieve invites' });
  }
});

router.get('/:id/channels', session, async (req, res) => {
  try {
    // @ts-ignore
    const room = await db.rooms.findOne({ id: req.params.id });
    if(!room) return res.status(404).send({ error: messages.room_error });
    if(room) {
      return res.status(200).json(room.channels);
    }
  } catch(err) {
    return res.status(404).send({ error: messages.fallback_error });
  }
});

router.post('/:id/create/channel', session, async (req, res) => {
  const { name } = req.body;
  if(!name) return res.status(400).send({ error: 'Invalid parameters were provided' });
  try {
    // @ts-ignore
    const room = await db.rooms.findOne({ id: req.params.id });
    if(!room) return res.status(404).send({ error: messages.room_error });
    const channel_id = snowflake.generate();
    //@ts-ignore
    await db.rooms.updateOne({ id: req.params.id }, { $push: { channels: { room_id: req.params.id, name: name, position: null, id: channel_id, parent: null, perms: [], overwrites: [], type: req.body.type } } } )
    const data = {
      room_id: req.params.id,
      id: channel_id,
      parent: null, 
      perms: [], 
      overwrites: [], 
      type: req.body.type
    }
    return res.status(200).json(data);
  } catch(err) {
    return res.status(404).send({ error: messages.room_error });
  }
});

router.delete('/:id/channels/:channel', session, async (req, res) => {
  try {
    // @ts-ignore
    const rooms = await db.rooms.findOne({ id: req.params.id });
    const channel = rooms.channels.filter(ch => ch.room_id == req.params.channel);
    const index = await rooms.channels.indexOf(channel[0]);
    rooms.channels.splice(index, 1);
    // @ts-ignore
    await db.rooms.updateOne({ id: req.params.id }, { $set: rooms });
    return res.status(200).send({ message: 'Successfully deleted channel' });
  } catch(err) {
    return res.status(404).send({ error: messages.fallback_error });
  }
});

// POST MESSAGE TO CHANNEL
router.post('/:id/channels/:channel/messages', session, async (req, res) => {
  const { content, attachments, embed } = req.body;
  if(!content) return res.status(400).send({ error: 'Cannot send an empty message' });
  // if(!channel) return res.status(400).send({ error: 'No channel was provided' });
  try {
    let everyone: boolean = false;
    const regex = new RegExp(`(<@!?((${req.params.id}))>)+`)
    if(content.match(/(@?((members)))+/) || content.match(regex)) everyone = true;
    
    // @ts-ignore
    const user = await db.users.findOne({ id: req.user.id });
    const data = {
      id: req.params.id,
      type: 0,
      content: content,
      channel_id: req.params.channel,
      author: {
        id: user.id,
        username: user.username,
        tag: user.tag,
        avatar: user.avatar
      },
      attachments: [],
      embed: [],
      mentions: [],
      mention_groups: [],
      mention_everyone: everyone,
      timestamp: new Date().toISOString(),
      edited_timestamp: null,
      // nonce: snowflake.generate()
    }
    // @ts-ignore
    await db.messages.insertOne({ id: snowflake.generate(), messages: data });
    return res.status(200).send(data);
  } catch(err) {
    return res.status(400).send({ error: 'Something went wrong when trying to post a message' });
  }
});

// EDIT YOUR MESSAGE
router.patch('/:id/channels/:channel/messages/:message', session, async (req, res) => {
    const { content } = req.body;
    try {
      let everyone: boolean = false;
      const regex = new RegExp(`(<@!?((${req.params.id}))>)+`)
      if(content.match(/(@?((members)))+/) || content.match(regex)) everyone = true;
      else everyone = false;
      // @ts-ignore
      const message = await db.messages.findOne({ id: req.params.message })
      if(!message) return res.status(404).send({ error: messages.message_error });
      // @ts-ignore
      const room = await db.rooms.findOne({ id: req.params.id });
      if(!room) return res.status(404).send({ error: messages.room_error });
      // @ts-ignore
      const channel = await db.rooms.findOne({ id: req.params.id }, { "channels.id": req.params.channel });
      if(!channel) return res.status(404).send({ error: messages.channel_error });
      // @ts-ignore
      if(!room.members.includes(req.user.id)) return res.status(404).send({ error: 'You\'re not in that room' });
      // @ts-ignore
      if(req.user.id !== message.messages.author.id) return res.status(401).send({ error: 'Unable to edit that message' });
      if(message.messages.content === content) return res.status(304).end();
      // @ts-ignore
      await db.messages.updateOne( { id: message.id }, { $set: { "messages.content": content, "messages.edited_timestamp": new Date().toISOString(), "messages.mention_everyone": everyone } });
      // @ts-ignore
      const newData = await db.messages.findOne({ id: req.params.message })
      return res.status(200).json(newData.messages);
    } catch(err) {
      return res.status(400).send({ error: messages.fallback_error, err: err.stack });
    }
});

router.patch('/:id/channels/:channel', session, async (req, res) => {
  const { settings, value } = req.body;
  if(!settings || !value) return res.status(400).send({ error: messages.error_invalid_params });

  try {
     // @ts-ignore
    const server = await db.rooms.fineOne({ id: req.params.id });
    if(!server) return res.status(404).send({ error: messages.room_error });
    if(server) {
      // @ts-ignore
      await db.rooms.updateOne({ id: req.params.id }, { $set: { [`${settings}`]: value } })
      return res.status(200).send({
        id: server.channels[server.id].id,
        name: server.channels[server.id].name,
        parent: server.channels[server.id].parent,
        overwrites: server.channels[server.id].overwrites,
        permissions: server.channels[server.id].perms,
        position: server.channels[server.id].position,
        type: server.channels[server.id].type
      });
    }
  } catch(err) {
    return res.status(400).send({ error: 'Something went wrong unable to update channel' });
  }
});

// POST: CREATE AN INVITE TO THE CURRENT CHANNEL  ('/server/channels/channel_id/create/invites')
router.post('/:id/channels/:channel/create/invites', session, async (req, res) => {
  const { age, uses } = req.body;
  // @ts-ignore
  const inviter = await db.users.findOne({ id: req.user.id });

  try {
    // @ts-ignore
    const data = {
      id: nanoid(),
      channels: req.params.channel,
      expires_at: age,
      created_at: new Date().toISOString(),
      max_uses: uses,
      uses: 0,
      inviter: {
        id: inviter.id,
        username: inviter.username,
        tag: inviter.tag,
        avatar: inviter.avatar
      }
    }
    // @ts-ignore
    await db.rooms.updateOne({ id: req.params.id }, { $push: { invites: data } } )
    return res.status(200).json(data);
  } catch(err) {
    return res.status(400).send({ error: 'Unable to create channel invite' });
  }
});

// ---------------------------------------------------------------------------------------- DIVIDER

// --------------------- ROOM ROUTES ---------------------

// POST: CREATE A NEW ROOM ('/')
router.post('/create', session, async (req, res) => {
  const name = req.body;
  if(!name) return res.status(400).send({ error: 'Missing room name' });
  /*if(!/^[A-Za-z][A-Za-z0-9_-]{1,33}/.test(name)) {*/
  if(!/(.){1,33}.test(name)/) {
    return res.status(400).send({ error: 'Room name must be between 2-32 characters.' });
  }
  try {
    const room_id = snowflake.generate();
    const channel_id = snowflake.generate();
    const channel = [{
      room_id: room_id,
      name: 'main',
      position: 0,
      id: channel_id,
      parent: null,
      perms: [],
      overwrites: [],
      type: 0,
    }];
    const groups = [{
      id: room_id,
      name: 'Members',
      perms: 0,
      position: 0,
      color: 0,
      manageable: false,
      hoist: false,
      mentionable: true
    }];
    const invites = [{
      id: short().new(),
      channel: channel_id,
      max_uses: null,
      uses: 0,
      // @ts-ignore
      //members: [req.user.id],
      created_at: new Date().toISOString(),
      expires_at: 86400
    }]
    // @ts-ignore
    await db.rooms.insertOne({ id: room_id, name: req.body.name, icon: '', owner: req.user.id, channels: channel,
                            // @ts-ignore
                            groups: groups, verified: false, invites: invites, vanity: '', created_at: Date.now(), members: [req.user.id] })
    return res.status(200).json({ channel, groups, invites });
  } catch(err) {
    return res.status(400).send({ error: 'Unable to create new room' });
  }
});

// GET: JOIN A SERVER WITH AN INVITE CODE ('/')
router.get('/join/:code', session, async (req, res) => {
  // if(!req.params.code) return;  
  try {
      // @ts-ignore
      const room = await db.rooms.findOne({ "invites.id": req.params.code });
      if(!room) res.status(400).send({ error: 'Invalid room code.' });
      if(room) {
        // @ts-ignore
        if(room.members.includes(req.user.id)) return res.status(400).send({ error: 'You\'re already in that room' });
        // @ts-ignore
        room.members.push(req.user.id)
        room.invites.filter(i => i.id == req.params.code)[0].uses += 1 
        // @ts-ignore
        await db.rooms.updateOne( { id: room.id }, { $set: room });
        // @ts-ignore
        await db.users.updateOne({ id: req.user.id }, { $push: [room.id] });
        // @ts-ignore
        // await db.users.updateOne( { id: req.user.id }, { $push: { rooms: server.id } });
        return res.status(200).send({ message: room });
      }
    } catch(err) {
      return res.status(404).send({ error: messages.fallback_error, err: err.stack });
    }
});

router.delete('/leave/:id', session, async (req, res) => {
  try {
    // @ts-ignore
    const room = await db.rooms.findOne({ id : req.params.id });
    if(!room) return res.status(404).send({ error: messages.room_error });
    // @ts-ignore
    if(!room.members.includes(req.user.id)) return res.status(404).send({ error: 'You\'re not in that room' });
    // @ts-ignore
    if(room.owner === req.user.id) return res.status(400).send({ error: 'You\'re not able to leave the server due to being the server owner' })
    // @ts-ignore
    await db.users.updateOne({ id: req.user.id }, { $pull: { rooms: req.params.id } });
    // @ts-ignore
    room.members.pop(req.user.id)
    // @ts-ignore
    await db.rooms.updateOne({ id: req.params.id }, { $set: room } );
    return res.status(204).end();
  } catch(err) {
    return res.status(404).send({ error: messages.fallback_error, err: err.stack });
  }
});

router.patch('/:id', session, async(req, res) => {
  const { settings, value } = req.body;
  if(!settings || !value) return res.status(400).send({ error: messages.error_invalid_params });

  try {
     // @ts-ignore
    const server = await db.rooms.findOne({ id: req.params.id });
    if(!server) return res.status(404).send({ error: messages.room_error });
    //@ts-ignore
    if(req.user.id !== server.owner) return res.status(400).end({ error: 'Unauthorized' });
    //@ts-ignore
    if(req.user.id === server.owner) return res.status(400).end({ error: 'You can\'t transfer ownership to yourself' });
    if(server) {
      //if(!server.memers[req.user.id].roles) {

      //}
      // @ts-ignore
      await db.rooms.updateOne({ id: req.params.id }, { $set: { [`${settings}`]: value } })
      return res.status(200).send({
        id: server.channels[server.id].id,
        name: server.channels[server.id].name,
        parent: server.channels[server.id].parent,
        overwrites: server.channels[server.id].overwrites,
        permissions: server.channels[server.id].perms,
        position: server.channels[server.id].position,
        type: server.channels[server.id].type
      });
    }
  } catch(err) {
    return res.status(400).send({ error: 'Something went wrong when trying to update the server' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    // @ts-ignore
    let room = await db.rooms.findOne({ id: req.params.id });
    if(!room) return res.status(404).send({ error: messages.room_error });
    if(room) {
      return res.status(200).send({
          id: room.id,
          name: room.name.name,
          icon: room.icon,
          owner: room.owner,
          // groups: room.groups,
          members: room.members.length,
          verified: room.verified,
          vanity: room.vanity
      });
    }
  } catch(err) {
    return res.status(404).send({ error: messages.fallback_error });
  }
});

// ---------------------------------------------------------------------------------------- DIVIDER

// --------------------- GROUP ROUTES ---------------------

router.post('/:id/create/group', session, async (req, res) => {
  try {
    const data = {
      id: snowflake.generate(),
      name: 'new group',
      perms: 0,
      position: 1,
      color: 0,
      manageable: true,
      hoist: false,
      mentionable: false
    }
    // @ts-ignore
    await db.rooms.updateOne({ id: req.params.id }, { $push: { groups: data } });
    return res.status(200).json(data);
  } catch(err) {
    return res.status(400).send({ error: messages.fallback_error });
  }
});

// TODO: fix this
// router.patch('/:id/groups/:group', session, async (req, res) => {
//   const { name, perms, position, color, manageable, hoist, mentionable } = req.body;
//   try {
//     // @ts-ignore
//     await db.rooms.updateOne({ id: req.params.id }, { $set: group });
//     return res.status(200).json(data);
//   } catch(err) {
//     return res.status(400).send({ error: messages.fallback_error });
//   }
// });

router.delete('/:id/groups/:group', session, async (req, res) => {
  try {
    // @ts-ignore
    const rooms = await db.rooms.findOne({ id: req.params.id });
    const group = rooms.groups.filter(ch => ch.room_id == req.params.group);
    const index = await rooms.channels.indexOf(group[0]);
    rooms.channels.splice(index, 1);
    // @ts-ignore
    await db.rooms.updateOne({ id: req.params.id }, { $set: rooms });
    return res.status(200).send({ message: 'Successfully deleted group' });
  } catch(err) {
    return res.status(404).send({ error: messages.fallback_error });
  }
});

router.get('/:id/groups', session, async (req, res) => {
  try {
    // @ts-ignore
    const room = await db.rooms.findOne({ id: req.params.id });
    if(!room) return res.status(404).send({ error: messages.room_error });
    if(room) {
      return res.status(200).json(room.groups);
    }
  } catch(err) {
    return res.status(404).send({ error: messages.fallback_error });
  }
});

// ---------------------------------------------------------------------------------------- DIVIDER

// --------------------- MEMBER ROUTES ---------------------

router.get('/:id/members', session, async (req, res) => {
  try {
    // @ts-ignore
    const room = await db.rooms.findOne({ id: req.params.id });
    // @ts-ignore
    const user = await db.users.findOne({ id: room.members.forEach(i => i.id) });
    const data = {
      user: {
        id: user.id,
        username: user.username,
        tag: user.tag,
        avatar: user.avatar
      }
      // TODO: add more data like groups, nickname?, joined room date
    }
    return res.status(200).json(data);
  } catch(err) {
    return res.status(404).send({ error: messages.fallback_error });
  }
});

// ---------------------------------------------------------------------------------------- DIVIDER

export default router;
