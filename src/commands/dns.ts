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
  .setName('dns')
  .setDescription('Gets a DNS record of an MNS name')
  .addStringOption((option) =>
    option
      .setName('name')
      .setDescription('The MNS name to get the DNS record of')
      .setRequired(true)
  )
  .addStringOption((option) =>
    option
      .setName('hash')
      .setDescription(
        'The keccak-256 hash of the fully-qualified name for which to fetch the record'
      )
      .setRequired(true)
  )
  .addIntegerOption((option) =>
    option
      .setName('resource')
      .setDescription('The resource record type')
      .setRequired(true)
  );

const execute = async (interaction: ChatInputCommandInteraction<CacheType>) => {
  const n = interaction.options.getString('name');
  const resource = interaction.options.getString('hash');
  const recordType = interaction.options.getInteger('resource');
  if (!resource || resource.length === 0) {
    await interaction.reply({
      ephemeral: true,
      content: `Error: Invalid hash.`
    });
    return;
  }
  if (!recordType || recordType < 0 || recordType > 65535) {
    await interaction.reply({
      ephemeral: true,
      content: `Error: Invalid resource record type.`
    });
    return;
  }

  const message = await interaction.reply({
    ephemeral: true,
    content: `Fetching DNS data for ${n}...`
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
        content: `Error: Resolver not set for ${n}`
      });
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
      async dnsRecord(
        node: string,
        name: string,
        resource: bigint
      ): Promise<string> {
        const result = await this.call('dnsRecord(bytes32,bytes32,uint16)', [
          node,
          name,
          `0x${resource.toString(16)}`
        ]);
        if (result) {
          return result.toString();
        }
        return '';
      }

      async hasDNSRecords(node: string, name: string): Promise<boolean> {
        const result = await this.call('hasDNSRecords(bytes32,bytes32)', [
          node,
          name
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
          getReceipts
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
          getReceipts
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
      await message.edit({ content: `Error: Resolver is not an DNS resolver` });
      return;
    }
    const hasRecord = await resolver.hasDNSRecords(name.hash, resource);
    if (!hasRecord) {
      await message.edit({
        content: ` Error: ${recordType} DNS record not set for ${n}`
      });

      return;
    }
    const record = await resolver.dnsRecord(
      name.hash,
      resource ? resource : '',
      BigInt(recordType)
    );
    if (record.length === 0) {
      await message.edit({
        content: `Error: ${resource} DNS record not set for ${n}`
      });
      return;
    }
    await message.edit({
      content: `The ${resource} DNS record for **${n}** is \`\`${record}\`\``
    });
  } catch (e) {
    console.log('Command `dns` Error:', e);
    await message.edit({
      content: `An unexpected error occurred. Please try again later.`
    });
  }
};

export const dns = { data, execute };
