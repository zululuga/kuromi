const { SlashCommandBuilder } = require('discord.js');

const SIXSEVEN_IMAGE_URL = 'https://cdn.discordapp.com/attachments/1457245624792780883/1528147588686020781/1499544593182490777.webp?ex=6a973fd8&is=6a95ee58&hm=25123c3facc397d18cccb75418decb8d17a7b0b1bdeb8f9e8decd57b74fca6d4&';

module.exports = {
  name: 'sixseven',
  data: new SlashCommandBuilder()
    .setName('sixseven')
    .setDescription('Envia a imagem do sixseven no chat.'),
  async executePrefix({ message }) {
    await message.channel.send(SIXSEVEN_IMAGE_URL);
  },
  async executeSlash({ interaction }) {
    await interaction.editReply(SIXSEVEN_IMAGE_URL);
  },
};