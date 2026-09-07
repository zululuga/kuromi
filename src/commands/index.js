const commands = [
  require('./ping'),
  require('./status'),
  require('./help'),
  require('./prefix'),
  require('./setwelcome'),
  require('./sixseven'),
  require('./ship'),
  require('./daily'),
  require('./carteira'),
  require('./perfil'),
  require('./casamento'),
  require('./ranking'),
  require('./economyconfig'),
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