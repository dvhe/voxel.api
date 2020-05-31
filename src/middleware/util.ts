import { Request } from 'express'
async function bitwise(num: number) {
  return (num >>> 0).toString(16)
}

export async function permissions(req: Request) {
  const list = {
    modify_groups: bitwise(8),
    // @ts-ignore
    manage_groups: bitwise(0110),
    manage_channels: bitwise(88),
    invite: bitwise(098),
    // @ts-ignore
    kick: bitwise(0200),
    // @ts-ignore
    ban: bitwise(0230),
    manage_server: bitwise(0800),
    admin: bitwise(1337)
  }
  return list;
}
