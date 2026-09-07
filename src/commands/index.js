const commands = [
  require('./ping'),
  require('./status'),
  require('./help'),
  require('./prefix'),
  require('./setwelcome'),
  require('./sixseven'),
  require('./ship'),
];

const commandsByName = new Map(commands.map((command) => [command.name, command]));

module.exports = {
  commands,
  commandsByName,
  slashCommands: commands.map((command) => command.data.toJSON()),
};