import {
  ChatInputCommandInteraction,
  CacheType,
  SlashCommandBuilder,
  EmbedData,
  EmbedAuthorData,
  EmbedBuilder,
  APIEmbedField
} from 'discord.js';
import { ethers } from 'ethers';
import { getMNSAddress, getMNSContract, MNS } from '@metrixnames/mnslib';
import { APIProvider, NetworkType } from '@metrixcoin/metrilib';
import {
  EthereumAddressRegex,
  HexAddressRegex,
  MetrixAddressRegex,
  toHexAddress
} from '@metrixcoin/metrilib/lib/utils/AddressUtils';

const data = new SlashCommandBuilder()
  .setName('info')
  .setDescription('Gets general information of an MNS name')
  .addStringOption((option) =>
    option
      .setName('name')
      .setDescription('The MNS name to get information of')
      .setRequired(true)
  );

const execute = async (interaction: ChatInputCommandInteraction<CacheType>) => {
  const n = interaction.options.getString('name');

  const message = await interaction.reply({
    ephemeral: true,
    content: `Fetching information for ${n}...`
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
    const owner = await name.getOwner();
    if (owner === ethers.ZeroAddress) {
      await message.edit({
        content: `Error: Owner not set for ${n}`
      });
      return;
    }
    const resolver = await name.getResolver();
    if (resolver === ethers.ZeroAddress) {
      await message.edit({
        content: `Error: Resolver not set for ${n}`
      });
      return;
    }
    const ttl = await name.getTTL();
    const split = name.name!.split('.');
    const label = split[0];
    let node = '';
    if (split.length > 1) {
      for (let i = 1; i < split.length; i++) {
        node += i > 1 ? `.${split[i]}` : split[i];
      }
    }
    const fields: APIEmbedField[] = [
      {
        name: `Name`,
        value: `${name.name}`,
        inline: false
      },
      {
        name: `Label`,
        value: label,
        inline: false
      },
      {
        name: `Parent`,
        value: !!node ? node : ethers.ZeroHash,
        inline: false
      },
      {
        name: `Owner`,
        value: owner,
        inline: false
      },
      {
        name: `Resolver`,
        value: `${resolver}`,
        inline: false
      },
      {
        name: `TTL`,
        value: `${ttl}`,
        inline: false
      },
      {
        name: `MNS App`,
        value: `https://metrix.domains/app/name/${name.name}`,
        inline: false
      }
    ];

    const embedData: EmbedData = {
      color: 7537523,
      author: {
        name: process.env.BOT_NAME as string,
        icon_url: process.env.ICON_URL as string
      } as EmbedAuthorData,
      title: `**MNS Name Info**`,
      url: '',
      description: `** **`,
      fields,
      timestamp: new Date(),
      image: {
        url: ''
      },
      footer: {
        iconURL: process.env.ICON_URL as string,
        text: process.env.BOT_NAME as string
      }
    };
    const embed = new EmbedBuilder(embedData);
    await message.edit({
      embeds: [embed],
      content: `Here is the info for **${n}**`
    });
  } catch (e) {
    console.error('Error fetching data:', e);
    await message.edit({
      content: `An unexpected error occurred. Please try again later.`
    });
  }
};

export const info = { data, execute };
