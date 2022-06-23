import DiscordHandler from '../../internal/DiscordHandler';
import MessageObject from '../../interface/MessageObject';
import {TextChannel} from 'discord.js';
import {ethers} from 'ethers';
import {
  APIProvider,
  BaseResolver,
  getMNSAddress,
  MNS,
  profiles,
  Provider,
  Transaction,
} from '@metrixnames/mnslib';
import ABI from '@metrixnames/mnslib/lib/abi';

const network = 'MainNet';

export async function cmdInterface(
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
  const resolver: profiles.InterfaceResolver = new (class
    extends BaseResolver
    implements profiles.InterfaceResolver
  {
    constructor(provider: Provider) {
      super(resolverAddr, provider, ABI.PublicResolver);
    }

    async setInterface(
      node: string,
      interfaceId: string,
      implementer: string
    ): Promise<Transaction> {
      const tx = await this.send('setInterface(bytes32,bytes4,address)', [
        node,
        interfaceId,
        implementer,
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

    async interfaceImplementer(
      node: string,
      interfaceId: string
    ): Promise<string> {
      const result = await this.call('interfaceImplementer(bytes32,bytes4)', [
        node,
        interfaceId,
      ]);
      if (result) {
        return result.toString();
      }
      return ethers.constants.AddressZero;
    }
  })(provider);
  const supportsInterface = await resolver.supportsInterface('0x01ffc9a7');
  if (!supportsInterface) {
    // Not an Interface resolver
    return;
  }

  if (chan) chan.send('pong!');
  else if (user) user.send('pong!');
}
