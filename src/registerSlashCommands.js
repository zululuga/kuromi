const { REST, Routes } = require('discord.js');
const { DISCORD_TOKEN, DISCORD_CLIENT_ID } = require('./config');
const { slashCommands } = require('./commands');

const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);

(async () => {
  try {
    console.log('Registrando slash commands...');
    await rest.put(Routes.applicationCommands(DISCORD_CLIENT_ID), { body: slashCommands });
    console.log('Slash commands registrados com sucesso!');
  } catch (error) {
    console.error('Erro ao registrar slash commands:', error);
    process.exit(1);
  }
})();
