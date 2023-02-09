import DiscordHandler from '../../internal/DiscordHandler';
import MessageObject from '../../interface/MessageObject';
import {AttachmentBuilder, TextChannel} from 'discord.js';
import {
  BaseResolver,
  getMNSAddress,
  getMNSContract,
  MNS,
  profiles,
} from '@metrixnames/mnslib';
import {ethers} from 'ethers';
import ABI from '@metrixnames/mnslib/lib/abi';
import {EncodingType} from './enum/EncodingType';
import {APIProvider, Provider, Transaction} from '@metrixcoin/metrilib';

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
    if (chan) chan.send(`<@${messageObj.author}> Error: Invalid parameters`);
    else if (user)
      user.send(`<@${messageObj.author}> Error: Invalid parameters`);
    return;
  }
  if (!Object.values(EncodingType).includes(Number(m[2]))) {
    if (chan)
      chan.send(
        `<@${messageObj.author}> Error: Invalid encoding type '${m[2]}'`
      );
    else if (user)
      user.send(
        `<@${messageObj.author}> Error: Invalid encoding type '${m[2]}'`
      );
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
    if (resolverAddr === ethers.ZeroAddress) {
      if (chan) chan.send(`<@${messageObj.author}> Error: No resolver`);
      else if (user) user.send(`<@${messageObj.author}> Error: No resolver`);
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
      if (chan)
        chan.send(
          `<@${messageObj.author}> Error: Resolver is not an ABI resolver`
        );
      else if (user)
        user.send(
          `<@${messageObj.author}> Error: Resolver is not an ABI resolver`
        );
      return;
    }
    const [contentType, data] = await resolver.ABI(
      name.hash,
      BigInt(isNaN(Number(m[2])) ? 0 : Number(m[2]))
    );
    if (Number(contentType) === 0) {
      if (chan)
        chan.send(
          `<@${messageObj.author}> Error: ABI Content not set for ${m[1]}`
        );
      else if (user)
        user.send(
          `<@${messageObj.author}> Error: ABI Content not set for ${m[1]}`
        );
      return;
    }
    let encoding;
    let extenstion = '.txt';
    switch (Number(contentType)) {
      case EncodingType.JSON:
        encoding = 'JSON';
        extenstion = '.json';
        break;
      case EncodingType.ZLIB_JSON:
        encoding = 'zlib-compressed JSON';
        break;
      case EncodingType.CBOR:
        encoding = 'CBOR';
        break;
      case EncodingType.URI:
        encoding = 'URI';
        break;
      default:
        encoding = 'unknown';
        break;
    }
    if (!!data && data != '0x') {
      const json = JSON.parse(
        Buffer.from(data.replace('0x', ''), 'hex').toString()
      );
      const attachment = new AttachmentBuilder(
        Buffer.from(JSON.stringify(json ? json : [], null, 2)),
        {name: `abi${extenstion}`}
      );

      if (chan)
        chan.send({
          content: `<@${messageObj.author}> here is the ABI you requested for ${name.name}. It should be in ${encoding} format.`,
          files: [attachment],
        });
      else if (user)
        user.send({
          content: `<@${messageObj.author}> here is the ABI you requested for ${name.name}. It should be in ${encoding} format.`,
          files: [attachment],
        });
    } else {
      if (chan)
        chan.send(
          `<@${messageObj.author}> Unable to find any ABI records for ${name.name} in ${encoding} format`
        );
      else if (user)
        user.send(
          `<@${messageObj.author}> Unable to find any ABI records for ${name.name} in ${encoding} format`
        );
    }
  } catch (e) {
    console.log(e);
    if (chan)
      chan.send(`<@${messageObj.author}> Error: An internal error occurred`);
    else if (user)
      user.send(`<@${messageObj.author}> Error: An internal error occurred`);
  }
}
