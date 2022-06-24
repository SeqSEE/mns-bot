import DiscordHandler from '../../internal/DiscordHandler';
import MessageObject from '../../interface/MessageObject';
import {TextChannel} from 'discord.js';
import {ethers} from 'ethers';
import {
  APIProvider,
  BaseResolver,
  getMNSAddress,
  getMNSContract,
  MNS,
  profiles,
  Provider,
  Transaction,
} from '@metrixnames/mnslib';
import ABI from '@metrixnames/mnslib/lib/abi';

const network = 'MainNet';

export async function cmdContenthash(
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
    const resolverAddr = await name.getResolverAddr();
    if (resolverAddr === ethers.constants.AddressZero) {
      if (chan) chan.send(`<@${messageObj.author}> Error: No resolver`);
      else if (user) user.send(`<@${messageObj.author}> Error: No resolver`);
      return;
    }
    const resolver: profiles.ContentHashResolver = new (class
      extends BaseResolver
      implements profiles.ContentHashResolver
    {
      constructor(provider: Provider) {
        super(resolverAddr, provider, ABI.PublicResolver);
      }

      async setContenthash(node: string, hash: string): Promise<Transaction> {
        const tx = await this.send('setContenthash(bytes32,bytes)', [
          node,
          hash,
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

      async contenthash(node: string): Promise<string> {
        const result = await this.call('contenthash(bytes32)', [node]);
        if (result) {
          return result.toString();
        }
        return '';
      }
    })(provider);
    const supportsInterface = await resolver.supportsInterface('0xbc1c58d1');
    if (!supportsInterface) {
      if (chan)
        chan.send(
          `<@${messageObj.author}> Error: Resolver is not an Contenthash resolver`
        );
      else if (user)
        user.send(
          `<@${messageObj.author}> Error: Resolver is not an Contenthash resolver`
        );
      return;
    }
    const contenthash = await resolver.contenthash(name.hash);
    if (contenthash === '0x') {
      if (chan)
        chan.send(
          `<@${messageObj.author}> Error: Contenthash not set for ${m[1]}`
        );
      else if (user)
        user.send(
          `<@${messageObj.author}> Error: Contenthash not set for ${m[1]}`
        );
      return;
    }
    if (chan)
      chan.send(
        `<@${messageObj.author}> The contenthash for **${m[1]}** is \`\`${contenthash}\`\``
      );
    else if (user)
      user.send(
        `<@${messageObj.author}> The contenthash for **${m[1]}** is \`\`${contenthash}\`\``
      );
  } catch (e) {
    console.log(e);
    if (chan)
      chan.send(`<@${messageObj.author}> Error: An internal error occurred`);
    else if (user)
      user.send(`<@${messageObj.author}> Error: An internal error occurred`);
  }
}
