import { Router, Request, Response } from 'express';
import session from '../../middleware/session';
const router = Router();
const { messages } = require('../../utils.json');

router.get('/@me', session, async (req, res) => {
    try {
        // @ts-ignore
        const user = await db.users.findOne({ id: req.user.id });
        if(!user) return res.status(400).send({ error: "Unknown User" });
        return res.status(200).send({
            id: user.id,
            username: user.username,
            tag: user.tag,
            avatar: user.avatar,
            email: user.email,
            // rooms: user.rooms,
            created_at: user.registered_at
        });
    } catch(err) {
        return res.status(400).send({ error: `Value "${req.params.id}" is not a snowflake.` });
    }
});

router.get('/:id', session, async (req, res) => {
    try {
        // @ts-ignore
       const user = await db.users.findOne({ id: req.params.id });
       if(!req.params.id.match(/[0-9]/)) return res.status(400).send({ error: `Value "${req.params.id}" is not a snowflake.` });
       if(!user) return res.status(400).send({ error: `Unknown User` });
       if(user) {
         return res.status(200).send({
            username: user.username,
            tag: user.tag,
            avatar: user.avatar,
            bot: user.bot,
            created_at: user.registered_at,
            mfa_enabled: user.mfa_enabled
        });
      }
    } catch(err) {
        return res.status(400).send({ error: `Value "${req.params.id}" is not a snowflake.` });
    }
});

router.get('/@me/relationships', session, async (req, res) => {
    try {
        // @ts-ignore
        const data = await db.users.findOne({ id: req.user.id });
        return res.status(200).json({ friends: data.friends, blocked: data.blocked });
    } catch(err) {
        res.status(400).send({ error: messages.fallback_error });
    }
});

router.get('/@me/settings', session, async (req, res) => {
    try {
        // @ts-ignore
        const data = await db.users.findOne({ id: req.user.id });
        return res.status(200).json({ theme: data.theme, room_position: data.room_position });
    } catch(err) {
        res.status(400).send({ error: messages.fallback_error });
    }
});

export default router;

