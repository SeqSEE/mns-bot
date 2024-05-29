import {
  ChatInputCommandInteraction,
  CacheType,
  SlashCommandBuilder
} from 'discord.js';
import {
  MetrixAddressRegex,
  toHexAddress
} from '@metrixcoin/metrilib/lib/utils/AddressUtils';

const data = new SlashCommandBuilder()
  .setName('tohexaddress')
  .setDescription('Gets the hex address for an MRX address')
  .addStringOption((option) =>
    option
      .setName('address')
      .setDescription('The MRX address to get the hex address of')
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
    if (!a.match(MetrixAddressRegex)) {
      await message.edit({
        content: `Error: The address \`${a}\` is invalid.`
      });
      return;
    }
    const hexAddress = toHexAddress(a);
    await message.edit({
      content: `The hex address for \`${a}\` is \`${hexAddress}\``
    });
  } catch (e) {
    console.error('Error fetching data:', e);
    await message.edit({
      content: `An unexpected error occurred. Please try again later.`
    });
  }
};

export const tohexaddress = { data, execute };
