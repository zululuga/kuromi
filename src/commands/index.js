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
  require('./adocao'),
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
];

const commandsByName = new Map(
  commands.flatMap((command) => {
    const mainName = command.name || command.data?.name;
    const entries = [];
    if (mainName) entries.push([mainName, command]);
    (command.aliases || []).forEach((alias) => entries.push([alias, command]));
    return entries;
  })
);

module.exports = {
  commands,
  commandsByName,
  slashCommands: commands.map((command) => command.data.toJSON()),
};