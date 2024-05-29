import {
  ChatInputCommandInteraction,
  CacheType,
  SlashCommandBuilder,
  AttachmentBuilder
} from 'discord.js';
import {
  BaseResolver,
  getMNSAddress,
  getMNSContract,
  MNS,
  profiles
} from '@metrixnames/mnslib';
import { ethers } from 'ethers';
import ABI from '@metrixnames/mnslib/lib/abi';
import { EncodingType } from '../enum/EncodingType';
import {
  APIProvider,
  NetworkType,
  Provider,
  Transaction
} from '@metrixcoin/metrilib';

const data = new SlashCommandBuilder()
  .setName('abi')
  .setDescription('Get the ABI of an MNS name')
  .addStringOption((option) =>
    option
      .setName('name')
      .setDescription('The MNS name to get the ABI of')
      .setRequired(true)
  )
  .addIntegerOption((option) =>
    option
      .setName('type')
      .setDescription('A bitwise OR of the ABI formats accepted by the caller')
      .setRequired(true)
  );

const execute = async (interaction: ChatInputCommandInteraction<CacheType>) => {
  const n = interaction.options.getString('name');
  const c = interaction.options.getInteger('type');

  const message = await interaction.reply({
    ephemeral: true,
    content: `Fetching ABI data for ${n}...`
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
    const ct = c ? BigInt(c) : BigInt(0);
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
          data
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

      async ABI(
        node: string,
        contentType: bigint
      ): Promise<[contentType: bigint, data: string]> {
        const result = await this.call('ABI(bytes32,uint256)', [
          node,
          `0x${contentType.toString(16)}`
        ]);
        if (result && result.length >= 2) {
          const tup: [contentType: bigint, data: string] = [
            BigInt(result[0].toString()),
            result[1].toString()
          ];
          return tup;
        }
        return [BigInt(0), ''];
      }
    })(provider);
    const supportsInterface = await resolver.supportsInterface('0x2203ab56');
    if (!supportsInterface) {
      await message.edit({
        content: `Error: '${resolverAddr}' is not an ABI resolver.`
      });
      return;
    }
    const [contentType, data] = await resolver.ABI(name.hash, ct);
    if (Number(contentType) === 0) {
      await message.edit({
        content: `Error:  ABI Content not set for ${n}`
      });
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
        { name: `abi${extenstion}` }
      );
      await message.edit({
        content: `Here is the ABI you requested for ${n}. It should be in ${encoding} format.`,
        files: [attachment]
      });
    } else {
      await message.edit({
        content: `Error: Unable to find any ABI records for ${n} in ${encoding} format`
      });
      return;
    }
  } catch (e) {
    console.error('Error fetching data:', e);
    await message.edit({
      content: `An unexpected error occurred. Please try again later.`
    });
  }
};

export const abi = { data, execute };
