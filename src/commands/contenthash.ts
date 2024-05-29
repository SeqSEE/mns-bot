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
  NetworkType,
  Provider,
  Transaction
} from '@metrixcoin/metrilib';

const data = new SlashCommandBuilder()
  .setName('contenthash')
  .setDescription('Gets the contenthash of an MNS name')
  .addStringOption((option) =>
    option
      .setName('name')
      .setDescription('The MNS name to get the content hash of')
      .setRequired(true)
  );

const execute = async (interaction: ChatInputCommandInteraction<CacheType>) => {
  const n = interaction.options.getString('name');

  const message = await interaction.reply({
    ephemeral: true,
    content: `Fetching content hash for ${n}...`
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
    const resolver: profiles.ContentHashResolver = new (class
      extends BaseResolver
      implements profiles.ContentHashResolver
    {
      constructor(provider: Provider) {
        super(resolverAddr, provider, ABI.PublicResolver);
      }

      async setContenthash(node: string, hash: string): Promise<Transaction> {
        const tx = await this.send('setContenthash(bytes32,bytes)', [
          node,
          hash
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

      async contenthash(node: string): Promise<string> {
        const result = await this.call('contenthash(bytes32)', [node]);
        if (result) {
          return result.toString();
        }
        return '';
      }
    })(provider);
    const supportsInterface = await resolver.supportsInterface('0xbc1c58d1');
    if (!supportsInterface) {
      await message.edit({
        content: `Error: Resolver is not a cntenthash resolver`
      });
      return;
    }
    const contenthash = await resolver.contenthash(name.hash);
    if (contenthash === '0x') {
      await message.edit({
        content: `Error: Contenthash not set for \`${n}\``
      });
      return;
    }
    await message.edit({
      content: `The contenthash for **${n}** is \`\`${contenthash}\`\``
    });
  } catch (e) {
    console.error('Error fetching data:', e);
    await message.edit({
      content: `An unexpected error occurred. Please try again later.`
    });
  }
};

export const contenthash = { data, execute };
