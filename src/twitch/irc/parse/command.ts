import {ParsedCommand} from '../types.js';
// Parses an IRC message and returns a JSON object with the message's
// component parts (tags, source (nick and host), command, parameters).
// Expects the caller to pass a single message. (Remember, the Twitch
// IRC server may send one or more IRC messages in a single message.)

export function parseCommand(rawCommandComponent: string) : ParsedCommand {
  // takes the component and parses it to different command components
  // rawCommandComponet = JOIN #bar
  let parsedCommand = null as ParsedCommand;
  let commandParts = rawCommandComponent.split(" "); // [JOIN, #bar]

  switch (commandParts[0]) {
    case "JOIN":
    case "PART":
    case "NOTICE":
    case "CLEARCHAT":
    case "HOSTTARGET":
    case "PRIVMSG":
      parsedCommand = {
        type: "generic",
        command: commandParts[0],
        channel: commandParts[1],
      }; // {command: JOIN, channel: #bar}
      break;
    case "PING":
      parsedCommand = {
        type: "generic",
        command: commandParts[0],
      };
      break;
    case "CAP":
      parsedCommand = {
        type: "generic",
        command: commandParts[0],
      };
      break;
    case "GLOBALUSERSTATE": // Included only if you request the /commands capability.
      // But it has no meaning without also including the /tags capability.
      parsedCommand = {
        type: "generic",
        command: commandParts[0],
      };
      break;
    case "USERSTATE": // Included only if you request the /commands capability.
    case "ROOMSTATE": // But it has no meaning without also including the /tags capabilities.
      parsedCommand = {
        type: "generic",
        command: commandParts[0],
        channel: commandParts[1],
      };
      break;
    case "RECONNECT":
      console.log(
        "The Twitch IRC server is about to terminate the connection for maintenance."
      );
      parsedCommand = {
        type: "generic",
        command: commandParts[0],
      };
      break;
    case "421":
      console.log(`Unsupported IRC command: ${commandParts[2]}`);
      return null;
    case "001": // Logged in (successfully authenticated).
      break;
    case "002": // Ignoring all other numeric messages.
    case "003":
    case "004":
    case "353": // Tells you who else is in the chat room you're joining.
    case "366":
    case "372":
    case "375":
    case "376":
      console.log(`numeric message: ${commandParts[0]}`);
      return null;
    default:
      console.log(`\nUnexpected command: ${commandParts[0]}\n`);
      return null;
  }

  return parsedCommand; //{command: JOIN, channel: #bar}
}
