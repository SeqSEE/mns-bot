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
import {fromHexAddress} from '@metrixnames/mnslib/lib/utils/AddressUtils';

const network = 'MainNet';

export async function cmdAddr(
  discord: DiscordHandler,
  messageObj: MessageObject
): Promise<void> {
  let user = await discord.getClient().users.fetch(`${messageObj.author}`);
  let c = await discord.getClient().channels.fetch(messageObj.channel);
  let chan: TextChannel | null =
    c instanceof TextChannel ? (c as TextChannel) : null;
  let m = messageObj.content.split(/\s+/);
  if (m.length < 2) {
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
  const resolver: profiles.AddrResolver = new (class
    extends BaseResolver
    implements profiles.AddrResolver
  {
    constructor(provider: Provider) {
      super(resolverAddr, provider, ABI.PublicResolver);
    }
    async setAddr(node: string, a: string): Promise<Transaction> {
      const tx = await this.send('setAddr(bytes32,address)', [node, a]);
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

    async setAddrByType(
      node: string,
      coinType: bigint,
      a: string
    ): Promise<Transaction> {
      const tx = await this.send('setAddr(bytes32,uint256,bytes)', [
        node,
        `0x${coinType.toString(16)}`,
        a,
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

    async addr(
      node: string,
      convert: undefined | boolean = false
    ): Promise<string> {
      const result = await this.call('addr(bytes32)', [node]);
      let mrxAddress: string | undefined = result
        ? result.toString()
        : ethers.constants.AddressZero;
      if (convert === true) {
        mrxAddress = fromHexAddress(this.provider.network, mrxAddress);
      }
      return mrxAddress ? mrxAddress : ethers.constants.AddressZero;
    }

    async addrByType(node: string, coinType: bigint): Promise<string> {
      const result = await this.call('addr(bytes32,uint256)', [
        node,
        `0x${coinType.toString(16)}`,
      ]);
      if (result) {
        return result.toString();
      }
      return ethers.constants.AddressZero;
    }
  })(provider);
  let supportsInterface = false;
  const coin = undefined;
  //TODO: get the coin from command parameters
  let getAddr;
  if (coin) {
    supportsInterface = await resolver.supportsInterface('0xf1cb7e06');
    getAddr = async () => {
      return await resolver.addrByType(name.hash, coin);
    };
  } else {
    supportsInterface = await resolver.supportsInterface('0x3b3b57de');
    getAddr = async () => {
      return await resolver.addr(name.hash);
    };
  }
  if (!supportsInterface) {
    // Not an addr resolver
    return;
  }
  const addr = await getAddr();
  //TODO: send the decoded address if any
  if (chan) chan.send('pong!');
  else if (user) user.send('pong!');
}
