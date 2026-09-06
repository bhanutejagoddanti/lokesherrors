// import { drizzle } from 'drizzle-orm/neon-http';

// const db = drizzle(process.env.DATABASE_URL);

// export { db }

import 'dotenv/config';
import dns from 'node:dns';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';

// Ensure IPv4 resolution in container environments without IPv6 routes
const origLookup = dns.lookup;
dns.lookup = function (hostname, options, callback) {
  if (typeof options === 'function') {
    callback = options;
    options = {};
  } else if (typeof options === 'number') {
    options = { family: options };
  } else {
    options = { ...options };
  }
  options.family = 4;
  return origLookup.call(this, hostname, options, callback);
};

const sql = neon(process.env.DATABASE_URL);
const db = drizzle({ client: sql });

export { db };
