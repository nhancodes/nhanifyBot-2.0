export interface ParsedCommandBase {
  command: string;
  channel?: string;
};
export type ParsedCommand = ParsedCommandBase | null;
export interface ParsedParams extends ParsedCommandBase {
  botCommand: string; 
  botCommandParams?: string;
}

export type DictParsedTags = {
  [key: string]: Badges | DictEmotes | null | string [] | string;
};

export type Badges = {
  [key: string]: string;
};

export type Positions = Position [];
type Position = {startPosition: string, endPosition: string}
export type DictEmotes = {[key: string]: Positions};

export type ParsedSource = {nick: string | null; host: string} | null;

export type ParsedMessage = {
  tags: DictParsedTags;
  source: ParsedSource; // returns source {}
  command: ParsedCommand | null; // {command: JOIN, channel: #bar}
  parameters: ParsedParams | null | string;
} | null;