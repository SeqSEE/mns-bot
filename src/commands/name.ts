import {
  ChatInputCommandInteraction,
  CacheType,
  SlashCommandBuilder
} from 'discord.js';
import { ethers } from 'ethers';
import {
  BaseResolver,
  CONTRACTS,
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
import {
  HexAddressRegex,
  EthereumAddressRegex,
  MetrixAddressRegex
} from '@metrixcoin/metrilib/lib/utils/AddressUtils';
import { toHexAddress } from '@metrixcoin/metrilib/lib/utils/AddressUtils';

const data = new SlashCommandBuilder()
  .setName('name')
  .setDescription('Gets the name of an MNS name')
  .addStringOption((option) =>
    option
      .setName('name')
      .setDescription('The MNS name to get the name of')
      .setRequired(true)
  );

const execute = async (interaction: ChatInputCommandInteraction<CacheType>) => {
  const n = interaction.options.getString('name');

  const message = await interaction.reply({
    ephemeral: true,
    content: `Fetching name data for ${n}...`
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

    const name = n
      ? n.match(MetrixAddressRegex)
        ? mns.name(`${toHexAddress(n)}.addr.reverse`)
        : n.match(EthereumAddressRegex) || n.match(HexAddressRegex)
          ? mns.name(`${n.toLowerCase().replace('0x', '')}.addr.reverse`)
          : mns.name(n)
      : undefined;
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
    const resolver: profiles.NameResolver = new (class
      extends BaseResolver
      implements profiles.NameResolver
    {
      constructor(provider: Provider) {
        super(resolverAddr, provider, ABI.PublicResolver);
      }

      async setName(node: string, name: string): Promise<Transaction> {
        const tx = await this.send('setName(bytes32,string)', [node, name]);
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

      async name(node: string): Promise<string> {
        const result = await this.call('name(bytes32)', [node]);
        if (result) {
          return result.toString();
        }
        return '';
      }
    })(provider);
    if (
      resolverAddr.toLowerCase().replace('0x', '') ===
      CONTRACTS.MainNet.DefaultReverseResolver
    ) {
    } else {
      const supportsInterface = await resolver.supportsInterface('0x691f3431');
      if (!supportsInterface) {
        await message.edit({
          content: `Error: Resolver is not a name resolver`
        });
        return;
      }
    }
    const nn = await resolver.name(name.hash);
    if (nn === '') {
      await message.edit({
        content: `Error: Name not set for ${n}`
      });
      return;
    }
    await message.edit({
      content: `The name for **${n}** is \`\`${nn}\`\``
    });
  } catch (e) {
    console.log('Command `name` Error:', e);
    await message.edit({
      content: `An unexpected error occurred. Please try again later.`
    });
  }
};

export const name = { data, execute };
