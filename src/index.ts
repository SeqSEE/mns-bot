import dotenv from 'dotenv';
import {
  REST,
  Routes,
  Client,
  GatewayIntentBits,
  ActivityType,
  Collection
} from 'discord.js';
import { abi } from './commands/abi';
import { addr } from './commands/addr';
import { contenthash } from './commands/contenthash';
import { dns } from './commands/dns';
import { fromhexaddress } from './commands/fromhexaddress';
import { info } from './commands/info';
import { contractInterface } from './commands/contractInterface';
import { name } from './commands/name';
import { network } from './commands/network';
import { owner } from './commands/owner';
import { pubkey } from './commands/pubkey';
import { resolver } from './commands/resolver';
import { text } from './commands/text';
import { tohexaddress } from './commands/tohexaddress';
import { hash } from './commands/hash';

dotenv.config();

const commands = [
  abi.data.toJSON(),
  addr.data.toJSON(),
  contenthash.data.toJSON(),
  dns.data.toJSON(),
  info.data.toJSON(),
  contractInterface.data.toJSON(),
  name.data.toJSON(),
  network.data.toJSON(),
  owner.data.toJSON(),
  pubkey.data.toJSON(),
  resolver.data.toJSON(),
  text.data.toJSON(),
  fromhexaddress.data.toJSON(),
  tohexaddress.data.toJSON(),
  hash.data.toJSON()
];

const cooldowns = new Collection<string, Collection<string, number>>();
for (const command of commands) {
  if (!cooldowns.has(command.name)) {
    cooldowns.set(command.name, new Collection<string, number>());
  }
}

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN as string);

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

const start = async () => {
  try {
    console.log('Started refreshing application (/) commands.');

    await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID as string),
      { body: commands }
    );

    console.log('Successfully reloaded application (/) commands.');
  } catch (error) {
    console.error(error);
  }

  client.on('ready', () => {
    console.log(`Logged in as ${client.user?.tag}!`);
    try {
      client.user?.setStatus('online');
      if ((process.env.DEBUG as unknown as number) === 1) console.log;
      client.user?.setAvatar('./defaultIcon.png');
      client.user?.setPresence({
        activities: [{ name: 'with the MNS' }],
        status: 'online'
      });
    } catch (e) {
      console.log;
    }
  });

  client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;
    const defaultCooldownDuration = 10;
    const cooldownAmount = defaultCooldownDuration * 1000;
    const now = Date.now();
    const timestamps =
      cooldowns.get(interaction.commandName) ||
      new Collection<string, number>();
    if (timestamps.has(interaction.user.id)) {
      const expirationTime =
        timestamps.get(interaction.user.id)! + cooldownAmount;
      if (now < expirationTime) {
        const expiredTimestamp = Math.round(expirationTime / 1000);
        await interaction.reply({
          content: `Please wait, you are on a cooldown for \`${interaction.commandName}\`. You can use it again <t:${expiredTimestamp}:R>.`,
          ephemeral: true
        });
        return;
      }
    }
    timestamps.set(interaction.user.id, now);
    switch (interaction.commandName) {
      case 'abi':
        await abi.execute(interaction);
        break;
      case 'addr':
        await addr.execute(interaction);
        break;
      case 'contenthash':
        await contenthash.execute(interaction);
        break;
      case 'dns':
        await dns.execute(interaction);
        break;
      case 'info':
        await info.execute(interaction);
        break;
      case 'interface':
        await contractInterface.execute(interaction);
        break;
      case 'name':
        await name.execute(interaction);
        break;
      case 'network':
        await network.execute(interaction);
        break;
      case 'owner':
        await owner.execute(interaction);
        break;
      case 'pubkey':
        await pubkey.execute(interaction);
        break;
      case 'resolver':
        await resolver.execute(interaction);
        break;
      case 'text':
        await text.execute(interaction);
        break;
      case 'fromhexaddress':
        await fromhexaddress.execute(interaction);
        break;
      case 'tohexaddress':
        await tohexaddress.execute(interaction);
        break;
      case 'hash':
        await hash.execute(interaction);
        break;
      default:
        break;
    }
  });

  await client.login(process.env.TOKEN as string);
  client.user?.setActivity(`${process.env.NETWORK} Metrix LGP`, {
    type: ActivityType.Watching
  });

  const handleShutdown = async (signal: string) => {
    console.log(`Received ${signal}. Logging out...`);
    await client.destroy();
    process.exit(0);
  };

  process.on('SIGINT', () => handleShutdown('SIGINT'));
  process.on('SIGTERM', () => handleShutdown('SIGTERM'));
  process.on('SIGUSR1', () => handleShutdown('SIGUSR1'));
};

start();
