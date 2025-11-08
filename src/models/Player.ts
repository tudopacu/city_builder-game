import { PlayerService } from "../services/PlayerService";

export class Player {
    public id: number;
    public username: string;

    constructor(id: number, username: string) {
        this.id = id;
        this.username = username;
    }

    static async getPlayer(): Promise<Player> {
        const playerResponse = await PlayerService.getPlayer();

        if (!playerResponse || !playerResponse.player) {
            throw new Error("Player not found");
        }

        return playerResponse.player;
    }
}