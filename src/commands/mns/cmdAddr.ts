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
import {fromHexAddress} from '@metrixnames/mnslib/lib/utils/AddressUtils';
import {formatsByCoinType, formatsByName} from '@ensdomains/address-encoder';

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
    const coin =
      m.length >= 3
        ? isNaN(Number(m[2]))
          ? formatsByName[m[2].toUpperCase()]
            ? BigInt(formatsByName[m[2].toUpperCase()].coinType)
            : undefined
          : BigInt(m[2])
        : undefined;
    if (m.length >= 3 && coin == undefined) {
      if (chan)
        chan.send(`<@${messageObj.author}> Error: Invalid Coin ID ${m[2]}`);
      else if (user)
        user.send(`<@${messageObj.author}> Error: Invalid Coin ID ${m[2]}`);
      return;
    }
    let getAddr;
    let coinType = 'MRX';
    if (coin != undefined) {
      coinType = formatsByCoinType[Number(coin)]
        ? formatsByCoinType[Number(coin)].name
        : 'UNKNOWN';
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
      if (chan)
        chan.send(
          `<@${messageObj.author}> Error: Resolver is not an Addr resolver`
        );
      else if (user)
        user.send(
          `<@${messageObj.author}> Error: Resolver is not an Addr resolver`
        );
      return;
    }
    const addr = await getAddr();
    if (addr === '0x') {
      if (chan)
        chan.send(
          `<@${messageObj.author}> Error: **${coinType}** address not set for ${m[1]}`
        );
      else if (user)
        user.send(
          `<@${messageObj.author}> Error: **${coinType}** address not set for ${m[1]}`
        );
      return;
    }
    const address = !coin
      ? fromHexAddress(network, addr.replace('0x', ''))
      : addr;
    if (chan)
      chan.send(
        `<@${messageObj.author}> The **${coinType}** address for **${m[1]}** is \`\`${address}\`\``
      );
    else if (user)
      user.send(
        `<@${messageObj.author}> The **${coinType}** address for **${m[1]}** is \`\`${address}\`\``
      );
  } catch (e) {
    console.log(e);
    if (chan)
      chan.send(`<@${messageObj.author}> Error: An internal error occurred`);
    else if (user)
      user.send(`<@${messageObj.author}> Error: An internal error occurred`);
  }
}
