import {
  ChatInputCommandInteraction,
  CacheType,
  SlashCommandBuilder
} from 'discord.js';
import { ethers } from 'ethers';
import { getMNSAddress, getMNSContract, MNS } from '@metrixnames/mnslib';
import { APIProvider, NetworkType } from '@metrixcoin/metrilib';

const data = new SlashCommandBuilder()
  .setName('owner')
  .setDescription('Gets the owner of an MNS name')
  .addStringOption((option) =>
    option
      .setName('name')
      .setDescription('The MNS name to get the owner of')
      .setRequired(true)
  );

const execute = async (interaction: ChatInputCommandInteraction<CacheType>) => {
  const n = interaction.options.getString('name');

  const message = await interaction.reply({
    ephemeral: true,
    content: `Fetching owner data for ${n}...`
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
    const owner = await name.getOwner();
    if (owner === ethers.ZeroAddress) {
      await message.edit({
        content: `Error: Owner not set for ${n}`
      });
      return;
    }
    await message.edit({
      content: `The owner of **${n}** is \`\`${owner}\`\``
    });
  } catch (e) {
    console.error('Error fetching data:', e);
    await message.edit({
      content: `An unexpected error occurred. Please try again later.`
    });
  }
};

export const owner = { data, execute };
