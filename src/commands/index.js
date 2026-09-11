const commands = [
  require('./ping'),
  require('./status'),
  require('./help'),
  require('./setwelcome'),
  require('./sixseven'),
  require('./ship'),
  require('./daily'),
  require('./carteira'),
  require('./perfil'),
  require('./casamento'),
  require('./divorcio'),
  require('./ranking'),
  require('./economyconfig'),
  require('./setareconomia'),
  require('./resetareconomia'),
  require('./profissao'),
  require('./trabalho'),
  require('./pet'),
  require('./petexplorar'),
  require('./petduelo'),
  require('./loja'),
  require('./comprar'),
  require('./vender'),
  require('./inventario'),
  require('./usar'),
  require('./tarot'),
  require('./agenda'),
  require('./emojis'),
  require('./dex'),
  require('./convite'),
  require('./trocar'),
  require('./expedicao'),
  require('./boss'),
];

const { setLoadedCommands } = require('./commandHelpers');
setLoadedCommands(commands);

const commandsByName = new Map(
  commands.flatMap((command) => {
    const mainName = command.name || command.data?.name;
    const entries = [];
    if (mainName) {
      entries.push([mainName, command]);
      if (mainName.startsWith('py-')) {
        entries.push([mainName.slice(3), command]);
      }
    }
    (command.aliases || []).forEach((alias) => {
      entries.push([alias, command]);
      if (alias.startsWith('py-')) {
        entries.push([alias.slice(3), command]);
      } else {
        entries.push([`py-${alias}`, command]);
      }
    });
    return entries;
  })
);

module.exports = {
  commands,
  commandsByName,
  slashCommands: commands.map((command) => command.data.toJSON()),
};