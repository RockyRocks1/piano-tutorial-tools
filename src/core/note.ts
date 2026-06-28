import { PitchClass } from "./types.js";
import { clamp } from "../utils/math.js";

const ACCIDENTALS = [PitchClass.C_SHARP, PitchClass.D_SHARP, PitchClass.F_SHARP, PitchClass.G_SHARP, PitchClass.A_SHARP];
export default class Note {
    private static readonly MIN_MIDI = 0;
    private static readonly MAX_MIDI = 127;
    public static readonly MIDDLE_C = 60;

    private noteNumber: number;

    constructor(noteNumber: number) {
        this.noteNumber = clamp(noteNumber, Note.MIN_MIDI, Note.MAX_MIDI);
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
    public get isAccidental(): boolean {
        return ACCIDENTALS.includes(this.pitch)
    }
}