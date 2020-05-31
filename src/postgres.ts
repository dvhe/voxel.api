import { Client } from 'pg';

class Database {
    public client: Client;
    constructor() {
        this.client = new Client({
            user: process.env.db_user,
            host: process.env.db_host,
            database: process.env.db_name,
            password: process.env.db_pass,
            port: 5432
        });
    }

    connect() {
        try {
            // @ts-ignore
            this.client.connect();
            return console.log('Connected to the database');
        } catch(err) {
            return console.log(`Unable to connect to the databse ${err}`);
        }
    }

    query<T = any>(sql: string, values?: any[]) {
        return this.client.query<T>(sql, values);
    }
}

export default Database;
module.exports = Database;
