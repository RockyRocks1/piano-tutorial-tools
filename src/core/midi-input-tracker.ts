import { MidiMessage } from "./midi.js";
import { ActiveKeyInfo, MIDIMessageType } from "./types.js";

class MidiInputTracker {
    private activeKeys: Map<number, ActiveKeyInfo> = new Map();

    public handleMidiMessage(midiMessage: MidiMessage) {
        const messageData = midiMessage.data

        switch (messageData.messageType) {
            case MIDIMessageType.NOTE_ON:
                this.activeKeys.set(messageData.keyNumber, {
                    velocity: messageData.velocity,
                    startTime: performance.now()
                });
                break;
            case MIDIMessageType.NOTE_OFF:
                this.activeKeys.delete(messageData.keyNumber);
                break;
            default:
                break;
        }
    }
    public isNoteActive(keyNumber: number): boolean {
        return this.activeKeys.has(keyNumber);
    }
    public getActiveKeyInfo(keyNumber: number): ActiveKeyInfo | undefined {
        return this.activeKeys.get(keyNumber);
    }
    public takeSnapshot(): Map<number, ActiveKeyInfo> {
        return new Map(this.activeKeys);
    }
}

export const inputTracker = new MidiInputTracker();