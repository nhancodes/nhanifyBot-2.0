// Parsing the IRC parameters component if it contains a command (e.g., !dice).

import { ParsedCommand, ParsedParams} from "../types.js";

export function parseParameters(rawParametersComponent: string |null, command: ParsedCommand): ParsedParams | null {
    if (rawParametersComponent) {
        let idx = 0
        let commandParts = rawParametersComponent.slice(idx + 1).trim(); 
        let paramsIdx = commandParts.indexOf(' ');
        const parsedParams = {...command} as ParsedParams;
        if (-1 == paramsIdx) { // no parameters
            parsedParams.type = 'botCommand';
            parsedParams.botCommand = commandParts.slice(0); 
        }
        else {
            parsedParams.type = 'botCommand';
            parsedParams.botCommand = commandParts.slice(0, paramsIdx); 
            parsedParams.botCommandParams = commandParts.slice(paramsIdx).trim();
            // TODO: remove extra spaces in parameters string
        }
    return parsedParams;
    }
    return null;
}