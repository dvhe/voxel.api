import { MongoClient, collection } from 'mongodb';
import Logger from '@pebblo/logger';

export default class Database {
  url: string;
  client: MongoClient;
  rooms: collection;
  users: collection;
  messages: collection;
  constructor(url: string) {
    this.url = url;
    this.client = new MongoClient(this.url, {
      useUnifiedTopology: true,
      useNewUrlParser: true,
    });
  }

  async connect() {
    if (this.client.isConnected()) {
      return Logger('DB', 'There is a connection already open to the database.', true, ['red', 'red']);
    }

    await this.client.connect();
    this.rooms = this.client.db('voxel').collection('rooms');
    this.users = this.client.db('voxel').collection('users');
    this.messages = this.client.db('voxel').collection('messages');
    return Logger('DB', `Connected to MongoDB\n`, false, ['green']);
  }
}

module.exports = Database;
