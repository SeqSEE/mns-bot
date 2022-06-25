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

import InternalCommands from './internal/InternalCommands';
import DiscordHandler from './internal/DiscordHandler';
import CommandHandler from './internal/CommandHandler';
import MessageHandler from './internal/MessageHandler';
import MessageObject from './interface/MessageObject';
import {ping} from './commands/example/ping';
import {cmdText} from './commands/mns/cmdText';
import {cmdABI} from './commands/mns/cmdABI';
import {cmdAddr} from './commands/mns/cmdAddr';
import {cmdContenthash} from './commands/mns/cmdContenthash';
import {cmdDNS} from './commands/mns/cmdDNS';
import {cmdInterface} from './commands/mns/cmdInterface';
import {cmdName} from './commands/mns/cmdName';
import {cmdPubkey} from './commands/mns/cmdPubkey';
import {cmdResolver} from './commands/mns/cmdResolver';
import {cmdOwner} from './commands/mns/cmdOwner';

export default class Commands extends InternalCommands {
  constructor(
    discord: DiscordHandler,
    cmdHandler: CommandHandler,
    msgHandler: MessageHandler
  ) {
    super(discord, cmdHandler, msgHandler);
  }
  public async registerCommands(): Promise<void> {
    await super.registerCommands(); //register the internal commands first
    this.registerCommand(
      'ping',
      'ping',
      [],
      async (messageObj: MessageObject) => {
        if (Number(process.env.DEBUG) === 1)
          console.log(`${Date()} author: ${messageObj.author} command: ping`);
        return ping(this.getDiscord(), messageObj);
      }
    );
    this.registerCommand(
      'abi',
      'abi <name>',
      [],
      async (messageObj: MessageObject) => {
        if (Number(process.env.DEBUG) === 1)
          console.log(`${Date()} author: ${messageObj.author} command: abi`);
        return cmdABI(this.getDiscord(), messageObj);
      }
    );
    this.registerCommand(
      'addr',
      'addr <name> (coin)',
      [],
      async (messageObj: MessageObject) => {
        if (Number(process.env.DEBUG) === 1)
          console.log(`${Date()} author: ${messageObj.author} command: addr`);
        return cmdAddr(this.getDiscord(), messageObj);
      }
    );
    this.registerCommand(
      'contenthash',
      'contenthash <name>',
      ['cthash'],
      async (messageObj: MessageObject) => {
        if (Number(process.env.DEBUG) === 1)
          console.log(
            `${Date()} author: ${messageObj.author} command: contenthash`
          );
        return cmdContenthash(this.getDiscord(), messageObj);
      }
    );
    this.registerCommand(
      'dns',
      'dns <name> <resource>',
      [],
      async (messageObj: MessageObject) => {
        if (Number(process.env.DEBUG) === 1)
          console.log(`${Date()} author: ${messageObj.author} command: dns`);
        return cmdDNS(this.getDiscord(), messageObj);
      }
    );
    this.registerCommand(
      'interface',
      'interface <name> <iterface id>',
      ['iface'],
      async (messageObj: MessageObject) => {
        if (Number(process.env.DEBUG) === 1)
          console.log(
            `${Date()} author: ${messageObj.author} command: interface`
          );
        return cmdInterface(this.getDiscord(), messageObj);
      }
    );
    this.registerCommand(
      'name',
      'name <name>',
      [],
      async (messageObj: MessageObject) => {
        if (Number(process.env.DEBUG) === 1)
          console.log(`${Date()} author: ${messageObj.author} command: name`);
        return cmdName(this.getDiscord(), messageObj);
      }
    );
    this.registerCommand(
      'pubkey',
      'pubkey <name>',
      [],
      async (messageObj: MessageObject) => {
        if (Number(process.env.DEBUG) === 1)
          console.log(`${Date()} author: ${messageObj.author} command: pubkey`);
        return cmdPubkey(this.getDiscord(), messageObj);
      }
    );
    this.registerCommand(
      'text',
      'text <name> <key>',
      ['txt'],
      async (messageObj: MessageObject) => {
        if (Number(process.env.DEBUG) === 1)
          console.log(`${Date()} author: ${messageObj.author} command: text`);
        return cmdText(this.getDiscord(), messageObj);
      }
    );
    this.registerCommand(
      'owner',
      'owner <name>',
      [],
      async (messageObj: MessageObject) => {
        if (Number(process.env.DEBUG) === 1)
          console.log(`${Date()} author: ${messageObj.author} command: owner`);
        return cmdOwner(this.getDiscord(), messageObj);
      }
    );
    this.registerCommand(
      'resolver',
      'resolver <name>',
      [],
      async (messageObj: MessageObject) => {
        if (Number(process.env.DEBUG) === 1)
          console.log(`${Date()} author: ${messageObj.author} command: owner`);
        return cmdResolver(this.getDiscord(), messageObj);
      }
    );
  }
}
