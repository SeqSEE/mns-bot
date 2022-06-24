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
const idRegex = /(^0x([A-Fa-f0-9]{8})$|([A-Fa-f0-9]{8}))/;

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
    if (chan) chan.send(`<@${messageObj.author}> Error: Invalid parameters`);
    else if (user)
      user.send(`<@${messageObj.author}> Error: Invalid parameters`);
    return;
  }
  if (!m[2].match(idRegex)) {
    if (chan)
      chan.send(
        `<@${messageObj.author}> Error: Invalid interface id. Should be a bytes4 interface id like: '0xdeadbeef'`
      );
    else if (user)
      user.send(
        `<@${messageObj.author}> Error: Invalid interface id. Should be a bytes4 interface id like: '0xdeadbeef'`
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
    if (resolverAddr === ethers.constants.AddressZero) {
      if (chan) chan.send(`<@${messageObj.author}> Error: No resolver`);
      else if (user) user.send(`<@${messageObj.author}> Error: No resolver`);
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
      if (chan)
        chan.send(
          `<@${messageObj.author}> Error: Resolver is not an Interface resolver`
        );
      else if (user)
        user.send(
          `<@${messageObj.author}> Error: Resolver is not an Interface resolver`
        );
      return;
    }
    const iface = await resolver.interfaceImplementer(
      name.hash,
      m[2].startsWith('0x') ? m[2] : `0x${m[2]}`
    );
    if (iface === ethers.constants.AddressZero) {
      if (chan)
        chan.send(
          `<@${messageObj.author}> Error: Interface **${m[2]}** not set for ${m[1]}`
        );
      else if (user)
        user.send(
          `<@${messageObj.author}> Error: Interface **${m[2]}** address not set for ${m[1]}`
        );
      return;
    }
    if (chan)
      chan.send(
        `<@${messageObj.author}> The interface for **${m[1]}** is \`\`${iface}\`\``
      );
    else if (user)
      user.send(
        `<@${messageObj.author}> The interface for **${m[1]}** is \`\`${iface}\`\``
      );
  } catch (e) {
    console.log(e);
    if (chan)
      chan.send(`<@${messageObj.author}> Error: An internal error occurred`);
    else if (user)
      user.send(`<@${messageObj.author}> Error: An internal error occurred`);
  }
}
