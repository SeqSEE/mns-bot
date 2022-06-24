import DiscordHandler from '../../internal/DiscordHandler';
import MessageObject from '../../interface/MessageObject';
import {TextChannel} from 'discord.js';
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
import {ethers} from 'ethers';
import ABI from '@metrixnames/mnslib/lib/abi';

const network = 'MainNet';

export async function cmdPubkey(
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
    const resolver: profiles.PubkeyResolver = new (class
      extends BaseResolver
      implements profiles.PubkeyResolver
    {
      constructor(provider: Provider) {
        super(resolverAddr, provider, ABI.PublicResolver);
      }

      async setPubkey(
        node: string,
        x: string,
        y: string
      ): Promise<Transaction> {
        const tx = await this.send('setPubkey(bytes32,bytes32,bytes32)', [
          node,
          x,
          y,
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

      async pubkey(node: string): Promise<[x: string, y: string]> {
        const result = await this.call('pubkey(bytes32)', [node]);
        if (result && result.length >= 2) {
          const tup: [string, string] = [
            result[0].toString(),
            result[1].toString(),
          ];
          return tup;
        }
        return [ethers.constants.HashZero, ethers.constants.HashZero];
      }
    })(provider);
    const supportsInterface = await resolver.supportsInterface('0xc8690233');
    if (!supportsInterface) {
      if (chan)
        chan.send(
          `<@${messageObj.author}> Error: Resolver is not an Pubkey resolver`
        );
      else if (user)
        user.send(
          `<@${messageObj.author}> Error: Resolver is not an Pubkey resolver`
        );
      return;
    }
    const [x, y] = await resolver.pubkey(name.hash);
    if (
      (x === '0x' || x === ethers.constants.HashZero) &&
      (y === '0x' || y === ethers.constants.HashZero)
    ) {
      if (chan)
        chan.send(`<@${messageObj.author}> Error: Pubkey not set for ${m[1]}`);
      else if (user)
        user.send(`<@${messageObj.author}> Error: Pubkey not set for ${m[1]}`);
      return;
    }
    if (chan)
      chan.send(
        `<@${messageObj.author}> The pubkey for **${m[1]}** is \`\`\`\nx:${x}\ny:${y}\n\`\`\``
      );
    else if (user)
      user.send(
        `<@${messageObj.author}> The pubkey for **${m[1]}** is \`\`\`\nx:${x}\ny:${y}\n\`\`\``
      );
  } catch (e) {
    console.log(e);
    if (chan)
      chan.send(`<@${messageObj.author}> Error: An internal error occurred`);
    else if (user)
      user.send(`<@${messageObj.author}> Error: An internal error occurred`);
  }
}
