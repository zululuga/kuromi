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
  require('./petexplorar'),
  require('./tarot'),
  require('./agenda'),
  require('./emojis'),
];

const commandsByName = new Map(
  commands.flatMap((command) => [
    [command.name, command],
    ...(command.aliases || []).map((alias) => [alias, command]),
  ])
);

module.exports = {
  commands,
  commandsByName,
  slashCommands: commands.map((command) => command.data.toJSON()),
};