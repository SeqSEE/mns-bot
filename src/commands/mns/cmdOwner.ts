import DiscordHandler from '../../internal/DiscordHandler';
import MessageObject from '../../interface/MessageObject';
import {TextChannel} from 'discord.js';
import {ethers} from 'ethers';
import {getMNSAddress, getMNSContract, MNS} from '@metrixnames/mnslib';
import {APIProvider} from '@metrixcoin/metrilib';

const network = 'MainNet';

export async function cmdOwner(
  discord: DiscordHandler,
  messageObj: MessageObject
): Promise<void> {
  let user = await discord.getClient().users.fetch(`${messageObj.author}`);
  let c = await discord.getClient().channels.fetch(messageObj.channel);
  let chan: TextChannel | null =
    c instanceof TextChannel ? (c as TextChannel) : null;
  let m = messageObj.content.split(/\s+/);
  if (m.length < 2) {
    if (chan) chan.send(`<@${messageObj.author}> Error: Invalid parameters`);
    else if (user)
      user.send(`<@${messageObj.author}> Error: Invalid parameters`);
    return;
  }
  try {
    const provider = new APIProvider(network);
    const mns = new MNS(network, provider, getMNSAddress(network));
    const mnsContract = getMNSContract(getMNSAddress(network), provider);

    const name = mns.name(m[1]);
    const recordExists = await mnsContract.call('recordExists(bytes32)', [
      name.hash,
    ]);
    const exists = recordExists ? recordExists.toString() === 'true' : false;
    if (!exists) {
      if (chan)
        chan.send(`<@${messageObj.author}> Error: Record does not exist`);
      else if (user)
        user.send(`<@${messageObj.author}> Error: Record does not exist`);
      return;
    }
    const owner = await name.getOwner();
    if (owner === ethers.ZeroAddress) {
      if (chan)
        chan.send(`<@${messageObj.author}> Error: Owner not set for ${m[1]}`);
      else if (user)
        user.send(`<@${messageObj.author}> Error: Owner not set for ${m[1]}`);
      return;
    }
    if (chan)
      chan.send(
        `<@${messageObj.author}> The owner of **${m[1]}** is \`\`${owner}\`\``
      );
    else if (user)
      user.send(
        `<@${messageObj.author}> The owner of **${m[1]}** is \`\`${owner}\`\``
      );
  } catch (e) {
    console.log(e);
    if (chan)
      chan.send(`<@${messageObj.author}> Error: An internal error occurred`);
    else if (user)
      user.send(`<@${messageObj.author}> Error: An internal error occurred`);
  }
}
