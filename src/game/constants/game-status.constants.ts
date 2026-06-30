/**
 * High-level game lifecycle status.
 *
 * initialized: Blind is prepared, waiting for startGame
 * playing: player is currently playing a Blind
 * shopping: player is in shop phase after winning a Blind
 * finished: current run is over
 */
export enum GameStatus {
    INITIALIZED = "initialized", // enter Ante view
    PLAYING = "playing",
    SHOPPING = "shopping",
    FINISHED = "finished",
}
