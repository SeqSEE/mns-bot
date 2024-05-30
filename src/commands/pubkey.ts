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
  .setName('pubkey')
  .setDescription('Gets the pubkey of an MNS name')
  .addStringOption((option) =>
    option
      .setName('name')
      .setDescription('The MNS name to get the pubkey of')
      .setRequired(true)
  );

const execute = async (interaction: ChatInputCommandInteraction<CacheType>) => {
  const n = interaction.options.getString('name');

  const message = await interaction.reply({
    ephemeral: true,
    content: `Fetching pubkey data for ${n}...`
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
    const resolver: profiles.PubkeyResolver = new (class
      extends BaseResolver
      implements profiles.PubkeyResolver
    {
      constructor(provider: Provider) {
        super(resolverAddr, provider, ABI.PublicResolver);
      }

      async setPubkey(
        node: string,
        x: string,
        y: string
      ): Promise<Transaction> {
        const tx = await this.send('setPubkey(bytes32,bytes32,bytes32)', [
          node,
          x,
          y
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

      async pubkey(node: string): Promise<[x: string, y: string]> {
        const result = await this.call('pubkey(bytes32)', [node]);
        if (result && result.length >= 2) {
          const tup: [string, string] = [
            result[0].toString(),
            result[1].toString()
          ];
          return tup;
        }
        return [ethers.ZeroHash, ethers.ZeroHash];
      }
    })(provider);
    const supportsInterface = await resolver.supportsInterface('0xc8690233');
    if (!supportsInterface) {
      await message.edit({
        content: `Error: Resolver is not an Pubkey resolver`
      });
      return;
    }
    const [x, y] = await resolver.pubkey(name.hash);
    if (
      (x === '0x' || x === ethers.ZeroHash) &&
      (y === '0x' || y === ethers.ZeroHash)
    ) {
      await message.edit({
        content: `Error: Pubkey not set for ${n}`
      });
      return;
    }
    await message.edit({
      content: `The pubkey for **${n}** is \`\`\`\nx:${x}\ny:${y}\n\`\`\``
    });
  } catch (e) {
    console.log('Command `pubkey` Error:', e);
    await message.edit({
      content: `An unexpected error occurred. Please try again later.`
    });
  }
};

export const pubkey = { data, execute };
