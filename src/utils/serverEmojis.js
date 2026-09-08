function getAnimatedEmoji(guild, preferredNames = [], fallback = '✨') {
  const emojis = guild?.emojis?.cache;
  if (!emojis) return fallback;
  const emojiList = typeof emojis.find === 'function' ? emojis : [...emojis.values()];

  const preferred = emojiList.find((emoji) =>
    emoji.animated && preferredNames.some((name) => emoji.name?.toLowerCase().includes(name.toLowerCase()))
  );
  const animated = preferred || emojiList.find((emoji) => emoji.animated);
  return animated ? animated.toString() : fallback;
}

function serializeGuildEmojis(guild) {
  return [...(guild?.emojis?.cache?.values() || [])]
    .sort((left, right) => left.name.localeCompare(right.name, 'pt-BR'))
    .map((emoji) => ({
      name: emoji.name,
      id: emoji.id,
      animated: emoji.animated,
      available: emoji.available,
      managed: emoji.managed,
      format: emoji.toString(),
      url: emoji.imageURL({ extension: emoji.animated ? 'gif' : 'png', size: 4096 }),
    }));
}

module.exports = { getAnimatedEmoji, serializeGuildEmojis };
