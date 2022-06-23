import DiscordHandler from '../../internal/DiscordHandler';
import MessageObject from '../../interface/MessageObject';
import {TextChannel} from 'discord.js';
import {
  APIProvider,
  BaseResolver,
  getMNSAddress,
  MNS,
  profiles,
  Provider,
  Transaction,
} from '@metrixnames/mnslib';
import {ethers} from 'ethers';
import ABI from '@metrixnames/mnslib/lib/abi';

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
    // Invalid parameters
    return;
  }
  const provider = new APIProvider(network);
  const mns = new MNS(network, provider, getMNSAddress(network));
  const name = mns.name(m[1]);
  const resolverAddr = await name.getResolverAddr();
  if (resolverAddr === ethers.constants.AddressZero) {
    // No resolver
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
    // Not a Text resolver
    return;
  }
  if (chan) chan.send('pong!');
  else if (user) user.send('pong!');
}
