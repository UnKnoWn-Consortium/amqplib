#!/usr/bin/env node

const amqp = require('amqplib');
const basename = require('path').basename;
const uuid = require('node-uuid');

// I've departed from the form of the original RPC tutorial, which
// needlessly introduces a class definition, and doesn't even
// parameterise the request.

let n;
try {
  if (process.argv.length < 3) throw Error('Too few args');
  n = parseInt(process.argv[2]);
} catch (e) {
  console.error(e);
  console.warn('Usage: %s number', basename(process.argv[1]));
  process.exit(1);
}

try {
  const connection = await amqp.connect('amqp://localhost');
  const channel = await connection.createChannel();
  const { queue } = await channel.assertQueue('', { exclusive: true, }); 
  const fibN = await new Promise(
    resolve => {
      const corrId = uuid();
      channel.consume(
        queue, 
        msg => {
          if (msg.properties.correlationId === corrId) {
            resolve(msg.content.toString());
          }
        }, 
        { noAck: true, }
      ); 
      console.log(' [x] Requesting fib(%d)', n);
      channel.sendToQueue(
        "rpc_queue", 
        Buffer.from(n.toString()), 
        { correlationId: corrId, replyTo: queue, }
      );
    }
  ); 
  console.log(' [.] Got %d', fibN); 
  connection.close(); 
} catch (e) {
  console.error(e); 
}
