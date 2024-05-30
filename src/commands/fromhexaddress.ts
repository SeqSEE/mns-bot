import {
  ChatInputCommandInteraction,
  CacheType,
  SlashCommandBuilder
} from 'discord.js';
import {
  EthereumAddressRegex,
  HexAddressRegex,
  fromHexAddress
} from '@metrixcoin/metrilib/lib/utils/AddressUtils';
import { NetworkType } from '@metrixcoin/metrilib';

const data = new SlashCommandBuilder()
  .setName('fromhexaddress')
  .setDescription('Gets the MRX address for a hex address')
  .addStringOption((option) =>
    option
      .setName('address')
      .setDescription('The hex address to get the MRX address of')
      .setRequired(true)
  );

const execute = async (interaction: ChatInputCommandInteraction<CacheType>) => {
  const a = interaction.options.getString('address');
  if (!a) {
    await interaction.reply({
      ephemeral: true,
      content: `Error: No address provided.`
    });
    return;
  }

  const message = await interaction.reply({
    ephemeral: true,
    content: `Attempting to covert ${a} to hex address...`
  });

  try {
    if (!a.match(EthereumAddressRegex) && !a.match(HexAddressRegex)) {
      await message.edit({
        content: `Error: The address \`${a}\` is invalid.`
      });
      return;
    }
    const address = fromHexAddress(
      process.env.NETWORK as NetworkType,
      a.toLowerCase().replace('0x', '')
    );
    await message.edit({
      content: `The MRX address for \`${a}\` is \`${address}\``
    });
  } catch (e) {
    console.log('Command `fromhexaddress` Error:', e);
    await message.edit({
      content: `An unexpected error occurred. Please try again later.`
    });
  }
};

export const fromhexaddress = { data, execute };
