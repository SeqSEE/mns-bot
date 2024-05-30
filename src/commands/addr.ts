import {
  ChatInputCommandInteraction,
  CacheType,
  SlashCommandBuilder
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
import { fromHexAddress } from '@metrixnames/mnslib/lib/utils/AddressUtils';
import { formatsByCoinType, formatsByName } from '@ensdomains/address-encoder';
import {
  APIProvider,
  Provider,
  Transaction,
  NetworkType
} from '@metrixcoin/metrilib';

const data = new SlashCommandBuilder()
  .setName('addr')
  .setDescription('Gets the address of an MNS name')
  .addSubcommand((subcommand) =>
    subcommand
      .setName('coin')
      .setDescription('Gets the address of an MNS name by coin ticker')
      .addStringOption((option) =>
        option
          .setName('name')
          .setDescription('The MNS name to get the address of')
          .setRequired(true)
      )
      .addStringOption((option) =>
        option
          .setName('coin')
          .setDescription('The coin ticker to get the address of')
          .setRequired(true)
      )
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName('id')
      .setDescription('Gets the address of an MNS name by coin id')
      .addStringOption((option) =>
        option
          .setName('name')
          .setDescription('The MNS name to get the address of')
          .setRequired(true)
      )
      .addIntegerOption((option) =>
        option
          .setName('id')
          .setDescription('The coin id to get the address of')
          .setRequired(true)
      )
  );

const execute = async (interaction: ChatInputCommandInteraction<CacheType>) => {
  const n = interaction.options.getString('name');
  const message = await interaction.reply({
    ephemeral: true,
    content: `Fetching address data for ${n}...`
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
    const resolver: profiles.AddrResolver = new (class
      extends BaseResolver
      implements profiles.AddrResolver
    {
      constructor(provider: Provider) {
        super(resolverAddr, provider, ABI.PublicResolver);
      }
      async setAddr(node: string, a: string): Promise<Transaction> {
        const tx = await this.send('setAddr(bytes32,address)', [node, a]);
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

      async setAddrByType(
        node: string,
        coinType: bigint,
        a: string
      ): Promise<Transaction> {
        const tx = await this.send('setAddr(bytes32,uint256,bytes)', [
          node,
          `0x${coinType.toString(16)}`,
          a
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

      async addr(
        node: string,
        convert: undefined | boolean = false
      ): Promise<string> {
        const result = await this.call('addr(bytes32)', [node]);
        let mrxAddress: string | undefined = result
          ? result.toString()
          : ethers.ZeroAddress;
        if (convert === true) {
          mrxAddress = fromHexAddress(this.provider.network, mrxAddress);
        }
        return mrxAddress ? mrxAddress : ethers.ZeroAddress;
      }

      async addrByType(node: string, coinType: bigint): Promise<string> {
        const result = await this.call('addr(bytes32,uint256)', [
          node,
          `0x${coinType.toString(16)}`
        ]);
        if (result) {
          return result.toString();
        }
        return ethers.ZeroAddress;
      }
    })(provider);
    let supportsInterface = false;

    let coin: bigint | undefined;
    switch (interaction.options.getSubcommand()) {
      case 'coin':
        const c = interaction.options.getString('coin');
        coin = c
          ? formatsByName[c.toUpperCase()]
            ? BigInt(formatsByName[c.toUpperCase()].coinType)
            : undefined
          : undefined;
        break;
      case 'id':
        const i = interaction.options.getInteger('id');
        coin = i ? BigInt(i) : undefined;
        break;
      default:
        break;
    }
    let getAddr;
    let coinType = 'MRX';
    if (coin != undefined) {
      coinType = formatsByCoinType[Number(coin)]
        ? formatsByCoinType[Number(coin)].name
        : 'UNKNOWN';
      supportsInterface = await resolver.supportsInterface('0xf1cb7e06');
      getAddr = async () => {
        return await resolver.addrByType(name.hash, coin);
      };
    } else {
      supportsInterface = await resolver.supportsInterface('0x3b3b57de');
      getAddr = async () => {
        return await resolver.addr(name.hash);
      };
    }
    if (!supportsInterface) {
      await message.edit({
        content: `Error: Resolver is not an Addr resolver`
      });
      return;
    }
    const addr = await getAddr();
    if (addr === '0x') {
      await message.edit({
        content: `Error: **${coinType}** address not set for ${n}`
      });
      return;
    }
    let address;
    if (coin === BigInt(326) || coinType === 'MRX') {
      try {
        const response = await fetch(
          `https://explorer.metrixcoin.com/api/contract/${addr
            .toLowerCase()
            .replace('0x', '')}`
        );

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        address = addr.toLowerCase().replace('0x', '');
      } catch (e) {
        address = fromHexAddress(provider.network, addr.replace('0x', ''));
      }
    } else {
      const format = formatsByName[coinType];
      address = format
        ? format.encoder(Buffer.from(addr.replace('0x', ''), 'hex'))
        : addr;
    }

    await message.edit({
      content: `The **${coinType}** address for **${n}** is \`\`${
        coinType === 'MRX' ? `${address}` : `${address}`
      }\`\``
    });
  } catch (e) {
    console.log('Command `addr` Error:', e);
    await message.edit({
      content: `An unexpected error occurred. Please try again later.`
    });
  }
};

export const addr = { data, execute };
