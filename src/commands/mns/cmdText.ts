import DiscordHandler from '../../internal/DiscordHandler';
import MessageObject from '../../interface/MessageObject';
import {TextChannel} from 'discord.js';
import {
  BaseResolver,
  getMNSAddress,
  getMNSContract,
  MNS,
  profiles,
} from '@metrixnames/mnslib';
import {ethers} from 'ethers';
import ABI from '@metrixnames/mnslib/lib/abi';
import {APIProvider, Provider, Transaction} from '@metrixcoin/metrilib';

const network = 'MainNet';

export async function cmdText(
  discord: DiscordHandler,
  messageObj: MessageObject
): Promise<void> {
  let user = await discord.getClient().users.fetch(`${messageObj.author}`);
  let c = await discord.getClient().channels.fetch(messageObj.channel);
  let chan: TextChannel | null =
    c instanceof TextChannel ? (c as TextChannel) : null;
  let m = messageObj.content.split(/\s+/);
  if (m.length < 3) {
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
    const resolverAddr = await name.getResolverAddr();
    if (resolverAddr === ethers.constants.AddressZero) {
      if (chan) chan.send(`<@${messageObj.author}> Error: No resolver`);
      else if (user) user.send(`<@${messageObj.author}> Error: No resolver`);
      return;
    }
    const resolver: profiles.TextResolver = new (class
      extends BaseResolver
      implements profiles.TextResolver
    {
      constructor(provider: Provider) {
        super(resolverAddr, provider, ABI.PublicResolver);
      }

      async setText(
        node: string,
        key: string,
        value: string
      ): Promise<Transaction> {
        const tx = await this.send('setText(bytes32,string,string)', [
          node,
          key,
          value,
        ]);
        const getReceipts = this.provider.getTxReceipts(
          tx,
          this.abi,
          this.address
        );
        return {
          txid: tx.txid,
          getReceipts,
        };
      }

      async text(node: string, key: string): Promise<string> {
        const result = await this.call(' text(bytes32,string)', [node, key]);
        if (result) {
          return result.toString();
        }
        return '';
      }
    })(provider);
    const supportsInterface = await resolver.supportsInterface('0x59d1d43c');
    if (!supportsInterface) {
      if (chan)
        chan.send(
          `<@${messageObj.author}> Error: Resolver is not an Text resolver`
        );
      else if (user)
        user.send(
          `<@${messageObj.author}> Error: Resolver is not an Text resolver`
        );
      return;
    }
    const record = await resolver.text(name.hash, m[2]);
    if (record.length === 0) {
      if (chan)
        chan.send(
          `<@${messageObj.author}> Error: ${m[2]} text record not set for ${m[1]}`
        );
      else if (user)
        user.send(
          `<@${messageObj.author}> Error: ${m[2]} text record not set for ${m[1]}`
        );
      return;
    }
    if (chan)
      chan.send(
        `<@${messageObj.author}> The **${m[2]}** text record for **${m[1]}** is \`\`${record}\`\``
      );
    else if (user)
      user.send(
        `<@${messageObj.author}> The **${m[2]}** text record for **${m[1]}** is \`\`${record}\`\``
      );
  } catch (e) {
    console.log(e);
    if (chan)
      chan.send(`<@${messageObj.author}> Error: An internal error occurred`);
    else if (user)
      user.send(`<@${messageObj.author}> Error: An internal error occurred`);
  }
}
