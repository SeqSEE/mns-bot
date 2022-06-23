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
import {EncodingType} from './enum/EncodingType';

const network = 'MainNet';

export async function cmdABI(
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
  if (!Object.values(EncodingType).includes(Number(m[2]))) {
    // Invalid encoding
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
  const resolver: profiles.ABIResolver = new (class
    extends BaseResolver
    implements profiles.ABIResolver
  {
    constructor(provider: Provider) {
      super(resolverAddr, provider, ABI.PublicResolver);
    }

    async setABI(
      node: string,
      contentType: bigint,
      data: string
    ): Promise<Transaction> {
      const tx = await this.send('setABI(bytes32,uint256,bytes)', [
        node,
        `0x${contentType.toString(16)}`,
        data,
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

    async ABI(
      node: string,
      contentType: bigint
    ): Promise<[contentType: bigint, data: string]> {
      const result = await this.call('ABI(bytes32,uint256)', [
        node,
        `0x${contentType.toString(16)}`,
      ]);
      if (result && result.length >= 2) {
        const tup: [contentType: bigint, data: string] = [
          BigInt(result[0].toString()),
          result[1].toString(),
        ];
        return tup;
      }
      return [BigInt(0), ''];
    }
  })(provider);
  const supportsInterface = await resolver.supportsInterface('0x2203ab56');
  if (!supportsInterface) {
    // Not an ABI resolver
    return;
  }
  const abi = resolver.ABI(name.hash, BigInt(isNaN(Number())));
  //TODO: send the ABI as a file
  if (chan) chan.send('pong!');
  else if (user) user.send('pong!');
}
