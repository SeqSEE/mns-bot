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
import {RecordType} from './enum/RecordType';
import {APIProvider, Provider, Transaction} from '@metrixcoin/metrilib';

const network = 'MainNet';

export async function cmdDNS(
  discord: DiscordHandler,
  messageObj: MessageObject
): Promise<void> {
  let user = await discord.getClient().users.fetch(`${messageObj.author}`);
  let c = await discord.getClient().channels.fetch(messageObj.channel);
  let chan: TextChannel | null =
    c instanceof TextChannel ? (c as TextChannel) : null;
  let m = messageObj.content.split(/\s+/);
  if (m.length < 4) {
    if (chan) chan.send(`<@${messageObj.author}> Error: Invalid parameters`);
    else if (user)
      user.send(`<@${messageObj.author}> Error: Invalid parameters`);
    return;
  }
  if (!Object.values(RecordType).includes(Number(m[3]))) {
    if (chan)
      chan.send(`<@${messageObj.author}> Error: Invalid record type ${m[3]}`);
    else if (user)
      user.send(`<@${messageObj.author}>  Error: Invalid record type ${m[3]}`);
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
    const resolver: profiles.DNSResolver = new (class
      extends BaseResolver
      implements profiles.DNSResolver
    {
      constructor(provider: Provider) {
        super(resolverAddr, provider, ABI.PublicResolver);
      }

      async setDNSRecords(node: string, data: string): Promise<Transaction> {
        const tx = await this.send('setDNSRecords(bytes32,bytes)', [
          node,
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
      async dnsRecord(
        node: string,
        name: string,
        resource: bigint
      ): Promise<string> {
        const result = await this.call('dnsRecord(bytes32,bytes32,uint16)', [
          node,
          name,
          `0x${resource.toString(16)}`,
        ]);
        if (result) {
          return result.toString();
        }
        return '';
      }

      async hasDNSRecords(node: string, name: string): Promise<boolean> {
        const result = await this.call('hasDNSRecords(bytes32,bytes32)', [
          node,
          name,
        ]);
        if (result) {
          return result.toString() == 'true';
        }
        return false;
      }

      async clearDNSZone(node: string): Promise<Transaction> {
        const tx = await this.send('clearDNSZone(bytes32)', [node]);
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

      async setZoneHash(node: string, hash: string): Promise<Transaction> {
        const tx = await this.send('setZoneHash(bytes32,bytes)', [node, hash]);
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

      async zoneHash(node: string): Promise<string> {
        const result = await this.call('zonehash(bytes32)', [node]);
        if (result) {
          return result.toString();
        }
        return '';
      }
    })(provider);
    const supportsInterface = await resolver.supportsInterface('0xa8fa5682');
    if (!supportsInterface) {
      if (chan)
        chan.send(
          `<@${messageObj.author}> Error: Resolver is not an DNS resolver`
        );
      else if (user)
        user.send(
          `<@${messageObj.author}> Error: Resolver is not an DNS resolver`
        );
      return;
    }
    const hasRecord = await resolver.hasDNSRecords(name.hash, m[2]);
    if (!hasRecord) {
      if (chan)
        chan.send(
          `<@${messageObj.author}> Error: ${m[2]} DNS record not set for ${m[1]}`
        );
      else if (user)
        user.send(
          `<@${messageObj.author}> Error: ${m[2]} DNS record not set for ${m[1]}`
        );
      return;
    }
    const record = await resolver.dnsRecord(name.hash, m[2], BigInt(m[3]));
    if (record.length === 0) {
      if (chan)
        chan.send(
          `<@${messageObj.author}> Error: ${m[2]} DNS record not set for ${m[1]}`
        );
      else if (user)
        user.send(
          `<@${messageObj.author}> Error: ${m[2]} DNS record not set for ${m[1]}`
        );
      return;
    }

    if (chan)
      chan.send(
        `<@${messageObj.author}> The ${m[2]} DNS record for **${m[1]}** is \`\`${record}\`\``
      );
    else if (user)
      user.send(
        `<@${messageObj.author}> The ${m[2]} DNS record for **${m[1]}** is \`\`${record}\`\``
      );
  } catch (e) {
    console.log(e);
    if (chan)
      chan.send(`<@${messageObj.author}> Error: An internal error occurred`);
    else if (user)
      user.send(`<@${messageObj.author}> Error: An internal error occurred`);
  }
}
