
type IrcCommand = { chatter: null | string, setChatter(chatter: string): void, getChatter(): null | string }

export const ircCommand: IrcCommand = {
    chatter: null,
    setChatter(chatter: string) {
        this.chatter = chatter
    },
    getChatter() {
        return this.chatter;
    }
}