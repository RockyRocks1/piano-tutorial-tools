import type { MidiMessage, MidiInputDevice, MidiOutputDevice } from "./midi.js"
export enum MIDIPermissionState {
    GRANTED = "granted",
    DENIED = "denied",
    NOT_SUPPORTED = "not_supported",
    ERROR = "error"
}
export enum MIDIMessageType {
    NOTE_OFF = 0b1000,
    NOTE_ON = 0b1001,
    AFTERTOUCH = 0b1010,
    CONTROL_CHANGE = 0b1011,
    PROGRAM_CHANGE = 0b1100,
    CHANNEL_PRESSURE = 0b1101,
    PITCH_BEND_CHANGE = 0b1110,
    SYSTEM_MESSAGE = 0b1111,
}
export type MIDIMessageData = 
    {messageType: MIDIMessageType.NOTE_OFF, keyNumber: number, velocity: number} |
    {messageType: MIDIMessageType.NOTE_ON, keyNumber: number, velocity: number} |
    // these ones below wont probably be used
    {messageType: MIDIMessageType.AFTERTOUCH, keyNumber: number, pressureValue: number} |
    {messageType: MIDIMessageType.CONTROL_CHANGE, controllerNumber: number, controllerValue: number} |
    {messageType: MIDIMessageType.PROGRAM_CHANGE, programNumber: number} |
    {messageType: MIDIMessageType.CHANNEL_PRESSURE, pressureValue: number} |
    {messageType: MIDIMessageType.PITCH_BEND_CHANGE, pitchLowerByte: number, pitchHigherByte: number} |
    {messageType: MIDIMessageType.SYSTEM_MESSAGE};

export type StateChangedListener = (state: MIDIPortDeviceState, connection: MIDIPortConnectionState) => void;
export type MidiMessageListener = (message: MidiMessage) => void;
export type AccessStateChangedListener = (state: "deviceadded" | "deviceremoved", device: MidiInputDevice | MidiOutputDevice) => void;
export type RemoveFunction = () => void;

export enum PitchClass {
    C = 0,
    C_SHARP = 1,
    D = 2,
    D_SHARP = 3,
    E = 4,
    F = 5,
    F_SHARP = 6,
    G = 7,
    G_SHARP = 8,
    A = 9,
    A_SHARP = 10,
    B = 11,
}
export type ActiveKeyInfo =  {
    velocity: number
    startTime: number // a timestamp
}