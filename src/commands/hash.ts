import { NetworkType } from '@metrixcoin/metrilib';
import { namehash } from '@metrixnames/mnslib';
import {
  ChatInputCommandInteraction,
  CacheType,
  SlashCommandBuilder
} from 'discord.js';
import { keccak256, sha256, sha512, ripemd160 } from 'ethers';

const data = new SlashCommandBuilder()
  .setName('hash')
  .setDescription('Gets the network of the MNS bot')
  .addStringOption((option) =>
    option
      .setName('algorithm')
      .setDescription('The algorithm to use')
      .setRequired(true)
      .addChoices(
        { name: 'namehash', value: 'namehash' },
        { name: 'keccak256', value: 'keccak256' },
        { name: 'sha256', value: 'sha256' },
        { name: 'sha512', value: 'sha512' },
        { name: 'ripemd160', value: 'ripemd160' }
      )
  )
  .addStringOption((option) =>
    option.setName('data').setDescription('The data to hash').setRequired(true)
  )
  .addStringOption((option) =>
    option
      .setName('encoding')
      .setDescription('The encoding of the data')
      .setRequired(true)
      .addChoices(
        { name: 'utf8', value: 'utf8' },
        { name: 'hex', value: 'hex' }
      )
  );

const execute = async (interaction: ChatInputCommandInteraction<CacheType>) => {
  const message = await interaction.reply({
    content: `Attempting to hash data...`,
    ephemeral: true
  });
  try {
    const algorithm = interaction.options.getString('algorithm');
    let data: string | Buffer | null = interaction.options.getString('data');
    const encoding = interaction.options.getString('encoding');
    if (!algorithm || !data || !encoding) {
      await message.edit({
        content: `Error: Missing required options.`
      });
      return;
    }
    if (encoding === 'hex') {
      if (data.startsWith('0x')) {
        data = data.slice(2);
      }
      if (data.length % 2 !== 0) {
        await message.edit({
          content: `Error: Invalid hex data.`
        });
        return;
      }
      if (!/^[0-9a-fA-F]+$/.test(data)) {
        await message.edit({
          content: `Error: Invalid hex data.`
        });
        return;
      }
      data = Buffer.from(data, 'hex');
    } else if (encoding === 'utf8') {
      data = Buffer.from(data, 'utf8');
    } else {
      await interaction.reply({
        ephemeral: true,
        content: `Error: Invalid encoding.`
      });
      return;
    }
    let result: string;
    switch (algorithm) {
      case 'keccak256':
        result = keccak256(data).toString();
        break;
      case 'sha256':
        result = sha256(data).toString();
        break;
      case 'sha512':
        result = sha512(data).toString();
        break;
      case 'ripemd160':
        result = ripemd160(data).toString();
        break;
      case 'namehash':
        result = namehash(data).toString();
      default:
        await interaction.reply({
          ephemeral: true,
          content: `Error: Invalid algorithm.`
        });
        return;
    }
    await message.edit({
      content: `The ${algorithm} hash of the data is \`${result}\``
    });
  } catch (e) {
    console.log('Command `hash` Error:', e);
    await message.edit({
      content: `An unexpected error occurred. Please try again later.`
    });
  }
};

export const hash = { data, execute };
