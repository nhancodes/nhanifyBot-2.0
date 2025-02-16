import { ParsedSource } from "../types.js";
// Parses the source (nick and host) components of the IRC message.

export function parseSource(rawSourceComponent: string | null) : ParsedSource {
    if (null == rawSourceComponent) {  // Not all messages contain a source
        return null;
    }
    else {
        let sourceParts = rawSourceComponent.split('!');
        return {
            nick: (sourceParts.length == 2) ? sourceParts[0] : null,
            host: (sourceParts.length == 2) ? sourceParts[1] : sourceParts[0]
        }
    }
}
