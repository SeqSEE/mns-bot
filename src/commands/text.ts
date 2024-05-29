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
  .setName('text')
  .setDescription('Gets a text record of an MNS name')
  .addStringOption((option) =>
    option
      .setName('name')
      .setDescription('The MNS name to get the text record of')
      .setRequired(true)
  )
  .addStringOption((option) =>
    option
      .setName('key')
      .setDescription('The key of the text record to get')
      .setRequired(true)
  );

const execute = async (interaction: ChatInputCommandInteraction<CacheType>) => {
  const n = interaction.options.getString('name');
  const key = interaction.options.getString('key');
  if (!key || key.length === 0) {
    await interaction.reply({
      ephemeral: true,
      content: `Error: No key provided.`
    });
    return;
  }
  const message = await interaction.reply({
    ephemeral: true,
    content: `Fetching text data for ${n}...`
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
        content: `Error: The MNS name \`${n}\` does not have a resolver set.`
      });
      return;
    }
    const resolver: profiles.TextResolver = new (class
      extends BaseResolver
      implements profiles.TextResolver
    {
      constructor(provider: Provider) {
        super(resolverAddr, provider, ABI.PublicResolver);
      }

      async setText(
        node: string,
        key: string,
        value: string
      ): Promise<Transaction> {
        const tx = await this.send('setText(bytes32,string,string)', [
          node,
          key,
          value
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

      async text(node: string, key: string): Promise<string> {
        const result = await this.call('text(bytes32,string)', [node, key]);
        if (result) {
          return result.toString();
        }
        return '';
      }
    })(provider);
    const supportsInterface = await resolver.supportsInterface('0x59d1d43c');
    if (!supportsInterface) {
      await message.edit({
        content: `Error: Resolver is not an Text resolver`
      });
      return;
    }
    const record = await resolver.text(name.hash, key);
    if (record.length === 0) {
      await message.edit({
        content: `Error: \`${key}\` text record not set for ${n}`
      });
      return;
    }
    await message.edit({
      content: `The **${key}** text record for **${n}** is \`\`${record}\`\``
    });
  } catch (e) {
    console.error('Error fetching data:', e);
    await message.edit({
      content: `An unexpected error occurred. Please try again later.`
    });
  }
};

export const text = { data, execute };
