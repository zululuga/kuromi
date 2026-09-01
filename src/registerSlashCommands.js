const { REST, Routes, SlashCommandBuilder } = require('discord.js');
const { DISCORD_TOKEN, DISCORD_CLIENT_ID } = require('./config');

const commands = [
  new SlashCommandBuilder().setName('ping').setDescription('Responde com pong para confirmar que o bot está vivo.').toJSON(),
  new SlashCommandBuilder().setName('status').setDescription('Mostra o status do bot e informações do servidor.').toJSON(),
  new SlashCommandBuilder().setName('help').setDescription('Mostra a lista de comandos e funções do bot.').toJSON(),
  new SlashCommandBuilder()
    .setName('prefix')
    .setDescription('Altera o prefixo do bot para outro valor.')
    .addStringOption((option) =>
      option
        .setName('valor')
        .setDescription('Novo prefixo do bot')
        .setRequired(false)
    )
    .toJSON(),
  new SlashCommandBuilder()
    .setName('setwelcome')
    .setDescription('Define o canal onde a mensagem de boas-vindas será enviada.')
    .addChannelOption((option) =>
      option
        .setName('canal')
        .setDescription('Canal de texto para as boas-vindas')
        .addChannelTypes([0])
        .setRequired(true)
    )
    .toJSON(),
];

const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);

(async () => {
  try {
    console.log('Registrando slash commands...');
    await rest.put(Routes.applicationCommands(DISCORD_CLIENT_ID), { body: commands });
    console.log('Slash commands registrados com sucesso!');
  } catch (error) {
    console.error('Erro ao registrar slash commands:', error);
    process.exit(1);
  }
})();
