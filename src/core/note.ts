import { PitchClass } from "./types/types.js";
import { clamp } from "../utils/math.js";
// follows midi convention (middle c is 60)
export default class Note {
    private noteNumber: number;

    constructor(noteNumber: number) {
        this.noteNumber = clamp(noteNumber, 0, 127);
    }
    public static fromComponents(pitch: PitchClass, octave: number): Note {
        const noteNumber = ((octave + 1) * 12) + pitch;
        return new Note(noteNumber);
    }
    public get midiNumber(): number {
        return this.noteNumber;
    }
    public get pitch(): PitchClass {
        return (this.noteNumber % 12);
    }
    public get octave(): number {
        return Math.floor(this.noteNumber / 12) - 1;
    }
}