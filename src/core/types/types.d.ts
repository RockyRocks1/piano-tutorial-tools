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
    PITCH_BEND_CHANGE = 0b1110
}