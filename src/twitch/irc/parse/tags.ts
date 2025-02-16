import { DictParsedTags, Badges, Positions, DictEmotes } from "../types.js";
// Parses the tags component of the IRC message.
export function parseTags(tags:string) : DictParsedTags{
  // badge-info=;badges=broadcaster/1;color=#0000FF;...

  const tagsToIgnore = {
    // List of tags to ignore.
    "client-nonce": null,
    flags: null,
  };

  let dictParsedTags = {} as DictParsedTags; // Holds the parsed list of tags.
  // The key is the tag's name (e.g., color).
  let parsedTags = tags.split(";");

  parsedTags.forEach((tag) => {
    let parsedTag = tag.split("="); // Tags are key/value pairs.
    let tagValue = parsedTag[1] === "" ? null : parsedTag[1];

    switch (
      parsedTag[0] // Switch on tag name
    ) {
      case "badges":
      case "badge-info":
        // badges=staff/1,broadcaster/1,turbo/1;

        if (tagValue) {
          let dict = {} as Badges; // Holds the list of badge objects.
          // The key is the badge's name (e.g., subscriber).
          let badges = tagValue.split(",");
          badges.forEach((pair) => {
            let badgeParts = pair.split("/");
            dict[badgeParts[0]] = badgeParts[1];
          });
          dictParsedTags[parsedTag[0]] = dict;
        } else {
          dictParsedTags[parsedTag[0]] = null;
        }
        break;
      case "emotes":
        // emotes=25:0-4,12-16/1902:6-10

        if (tagValue) {
          let dictEmotes = {} as DictEmotes; // Holds a list of emote objects.
          // The key is the emote's ID.
          let emotes = tagValue.split("/");
          emotes.forEach((emote) => {
            let emoteParts = emote.split(":");

            let textPositions = [] as Positions; // The list of position objects that identify
            // the location of the emote in the chat message.
            let positions = emoteParts[1].split(",");
            positions.forEach((position) => {
              let positionParts = position.split("-");
              textPositions.push({
                startPosition: positionParts[0],
                endPosition: positionParts[1],
              });
            });

            dictEmotes[emoteParts[0]] = textPositions;
          });

          dictParsedTags[parsedTag[0]] = dictEmotes;
        } else {
          dictParsedTags[parsedTag[0]] = null;
        }

        break;
      case "emote-sets":
        // emote-sets=0,33,50,237
        if (tagValue) {
        let emoteSetIds = tagValue.split(","); // Array of emote set IDs.
        dictParsedTags[parsedTag[0]] = emoteSetIds;
        }
        break;
      default:
        // If the tag is in the list of tags to ignore, ignore
        // it; otherwise, add it.

        if (tagsToIgnore.hasOwnProperty(parsedTag[0])) {
        } else {
          dictParsedTags[parsedTag[0]] = tagValue;
        }
    }
  });

  return dictParsedTags;
}
