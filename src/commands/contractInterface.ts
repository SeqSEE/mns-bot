import {
  ChatInputCommandInteraction,
  CacheType,
  SlashCommandBuilder
} from 'discord.js';
import { ethers } from 'ethers';
import {
  BaseResolver,
  getMNSAddress,
  getMNSContract,
  MNS,
  profiles
} from '@metrixnames/mnslib';
import ABI from '@metrixnames/mnslib/lib/abi';
import {
  APIProvider,
  Provider,
  Transaction,
  NetworkType
} from '@metrixcoin/metrilib';

const data = new SlashCommandBuilder()
  .setName('interface')
  .setDescription('Gets an interface of an MNS name')
  .addStringOption((option) =>
    option
      .setName('name')
      .setDescription('The MNS name to get the interface of')
      .setRequired(true)
  )
  .addStringOption((option) =>
    option
      .setName('id')
      .setDescription(
        'The 4 byte hexadecimal interface id to get the interface of'
      )
      .setRequired(true)
  );

const execute = async (interaction: ChatInputCommandInteraction<CacheType>) => {
  const n = interaction.options.getString('name');
  const interfaceId = interaction.options.getString('id');
  if (!interfaceId || !interfaceId.match(/^(0x)?[0-9a-fA-F]{8}$/)) {
    await interaction.reply({
      ephemeral: true,
      content: 'Error: Invalid interface id'
    });
    return;
  }
  const message = await interaction.reply({
    ephemeral: true,
    content: `Fetching interface implementer for ${n}...`
  });
  try {
    const provider = new APIProvider(process.env.NETWORK as NetworkType);
    const mns = new MNS(
      process.env.NETWORK as NetworkType,
      provider,
      getMNSAddress(process.env.NETWORK as NetworkType)
    );
    const mnsContract = getMNSContract(
      getMNSAddress(process.env.NETWORK as NetworkType),
      provider
    );
    const name = n ? mns.name(n) : undefined;
    if (!name) {
      await message.edit({
        content: `Error: The MNS name \`${n}\` is invalid.`
      });
      return;
    }
    const recordExists = await mnsContract.call('recordExists(bytes32)', [
      name.hash
    ]);
    const exists = recordExists ? recordExists.toString() === 'true' : false;
    if (!exists) {
      await message.edit({
        content: `Error: The MNS name \`${n}\` does not exist.`
      });
      return;
    }
    const resolverAddr = await name.getResolverAddr();
    if (resolverAddr === ethers.ZeroAddress) {
      await message.edit({
        content: `Error: The MNS name \`${n}\` does not have a resolver.`
      });
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
          implementer
        ]);
        const getReceipts = this.provider.getTxReceipts(
          tx,
          this.abi,
          this.address
        );
        return {
          txid: tx.txid,
          getReceipts
        };
      }

      async interfaceImplementer(
        node: string,
        interfaceId: string
      ): Promise<string> {
        const result = await this.call('interfaceImplementer(bytes32,bytes4)', [
          node,
          interfaceId
        ]);
        if (result) {
          return result.toString();
        }
        return ethers.ZeroAddress;
      }
    })(provider);
    const supportsInterface = await resolver.supportsInterface('0x01ffc9a7');
    if (!supportsInterface) {
      await message.edit({
        content: `Error: Resolver is not a interface resolver`
      });
      return;
    }
    const iface = await resolver.interfaceImplementer(
      name.hash,
      interfaceId.startsWith('0x') ? interfaceId : `0x${interfaceId}`
    );
    if (iface === ethers.ZeroAddress) {
      await message.edit({
        content: `Error: Interface **${interfaceId}** not set for ${n}`
      });
      return;
    }
    await message.edit({
      content: `The interface implementer of \`\`${interfaceId}\`\` for **${n}** is \`\`${iface}\`\``
    });
  } catch (e) {
    console.log('Command `interface` Error:', e);
    await message.edit({
      content: `An unexpected error occurred. Please try again later.`
    });
  }
};

export const contractInterface = { data, execute };
