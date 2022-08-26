/*
 * Copyright 2020-2021 Cryptech Services
 *
 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated documentation files (the "Software"), to deal
 in the Software without restriction, including without limitation the rights
 to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 copies of the Software, and to permit persons to whom the Software is
 furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in
 all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 THE SOFTWARE.
 */

import init from './internal/init';
import dotenv from 'dotenv';
import {
  Client,
  TextChannel,
  PresenceData,
  Message,
  IntentsBitField,
  ClientOptions,
  Partials,
} from 'discord.js';
import DiscordHandler from './internal/DiscordHandler';
import CommandHandler from './internal/CommandHandler';
import MessageHandler from './internal/MessageHandler';
import Commands from './Commands';

let start = async (disabled: string[], admins: string[]) => {
  const envConf = dotenv.config();
  const options: ClientOptions = {
    intents: [
      IntentsBitField.Flags.DirectMessages,
      IntentsBitField.Flags.Guilds,
      IntentsBitField.Flags.GuildMessages,
    ],
    partials: [Partials.Channel],
  };
  const client: Client = new Client(options);
  const discord: DiscordHandler = new DiscordHandler(client);
  const cmdHandler: CommandHandler = new CommandHandler(
    <string>process.env.CMD_PREFIX,
    admins
  );
  const msgHandler: MessageHandler = new MessageHandler(cmdHandler);
  const commands = new Commands(discord, cmdHandler, msgHandler);
  await commands.registerCommands();
  for (let d of disabled) {
    let cmd = cmdHandler.getCommandsMap().get(`${d as string}`);
    if (cmd) {
      cmd.setEnabled(false);
      if (Number(process.env.DEBUG as unknown) === 1)
        console.log(`Disabled ${cmd.getName()}`);
    }
  }

  client.on('ready', async () => {
    if ((process.env.DEBUG as unknown as number) === 1)
      console.log(`Logged in as ${client.user!.tag}!`);
    let chan: TextChannel | null =
      (await client.channels.fetch(
        process.env.DEFAULT_CHAN as string
      )) instanceof TextChannel
        ? ((await client.channels.fetch(
            process.env.DEFAULT_CHAN as string
          )) as TextChannel)
        : null;
    if (chan)
      await chan.send(
        `Have you heard of the Metrix Name Service?\nYou can do a query in discord, use the \`\`${process.env.CMD_PREFIX}help\`\` command to learn more.\nCheck out the MNS App at https://metrix.domains/app`
      );
    try {
      client.user?.setStatus('online');
      if ((process.env.DEBUG as unknown as number) === 1) console.log;
      await client.user?.setAvatar('./defaultIcon.png');
      client.user?.setPresence({
        activities: [{name: 'with the MNS'}],
        status: 'online',
      });
    } catch (e) {
      console.log;
    }
  });
  client.on('messageCreate', async (msg: Message) => {
    if (msg.author.id === client.user?.id) return;
    await msgHandler.handleMessage({
      channel: msg.channel.id,
      author: msg.author.id,
      content: msg.content,
    });
  });
  try {
    await client.login(process.env.API_KEY);
  } catch (e) {
    console.log(JSON.stringify(e));
    process.exit(1);
  }
};

init(start);
