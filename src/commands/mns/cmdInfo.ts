import DiscordHandler from '../../internal/DiscordHandler';
import MessageObject from '../../interface/MessageObject';
import {EmbedFieldData, MessageEmbed, TextChannel} from 'discord.js';
import {ethers} from 'ethers';
import {
  APIProvider,
  getMNSAddress,
  getMNSContract,
  MNS,
} from '@metrixnames/mnslib';

const network = 'MainNet';

export async function cmdInfo(
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
    if (owner === ethers.constants.AddressZero) {
      if (chan)
        chan.send(`<@${messageObj.author}> Error: Owner not set for ${m[1]}`);
      else if (user)
        user.send(`<@${messageObj.author}> Error: Owner not set for ${m[1]}`);
      return;
    }
    const resolver = await name.getResolver();
    if (resolver === ethers.constants.AddressZero) {
      if (chan)
        chan.send(
          `<@${messageObj.author}> Error: Resolver not set for ${m[1]}`
        );
      else if (user)
        user.send(
          `<@${messageObj.author}> Error: Resolver not set for ${m[1]}`
        );
      return;
    }
    const ttl = await name.getTTL();
    const split = m[1].split('.');
    const label = split[0];
    let node = '';
    for (let i = 1; i < split.length; i++) {
      node += i > 1 ? `.${split[i]}` : split[i];
    }
    const fields: EmbedFieldData[] = [
      {
        name: `Name`,
        value: `${m[1]}`,
        inline: false,
      },
      {
        name: `Label`,
        value: label,
        inline: false,
      },
      {
        name: `Parent`,
        value: node,
        inline: false,
      },
      {
        name: `Owner`,
        value: owner,
        inline: false,
      },
      {
        name: `Resolver`,
        value: `${resolver}`,
        inline: false,
      },
      {
        name: `TTL`,
        value: `${ttl}`,
        inline: false,
      },
    ];

    const embed = new MessageEmbed({
      color: 7537523,
      author: {
        name: process.env.BOT_NAME as string,
        icon_url: process.env.ICON_URL as string,
      },
      title: `**MNS Name Info**`,
      url: '',
      description: `** **`,
      fields,
      timestamp: new Date(),
      image: {
        url: '',
      },
      footer: {
        iconURL: process.env.ICON_URL as string,
        text: process.env.BOT_NAME as string,
      },
    });
    if (chan)
      chan.send({
        embeds: [embed],
        content: `<@${messageObj.author}> here is the info for **${m[1]}**`,
      });
    else if (user)
      user.send({
        embeds: [embed],
        content: `<@${messageObj.author}> here is the info for **${m[1]}**`,
      });
  } catch (e) {
    console.log(e);
    if (chan)
      chan.send(`<@${messageObj.author}> Error: An internal error occurred`);
    else if (user)
      user.send(`<@${messageObj.author}> Error: An internal error occurred`);
  }
}
