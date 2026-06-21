import { MIDIMessageType, MIDIPermissionState } from "./types/types";
// Version 1
class MidiMessage {
    // Reference: https://midi.org/summary-of-midi-1-0-messages
    private messageType: MIDIMessageType
    private rawData: Uint8Array;
    private timeStamp: number;
    
    constructor(data: Uint8Array, timeStamp: number) {
        this.rawData = data;
        this.timeStamp = timeStamp;
        this.parse();
    }
    parse() {
        this.messageType = 0b1101;
    }
}


type StateChangedListener = (state: MIDIPortDeviceState, connection: MIDIPortConnectionState) => void;
type MidiMessageListener = (message: MidiMessage) => void;
type RemoveFunction = () => void;
class MidiInputDevice {
    private midiInput: MIDIInput;
    private stateChangedListeners: StateChangedListener[];
    private midiMessageListeners: MidiMessageListener[];
    private boundStateChanged: (event: MIDIConnectionEvent) => void;
    private boundMidiMessage: (event: MIDIMessageEvent) => void;

    constructor(midiInput: MIDIInput) {
        this.midiInput = midiInput;
        this.stateChangedListeners = [];
        this.midiMessageListeners = [];
        this.boundStateChanged = this.handleStateChangedEvent.bind(this)
        this.boundMidiMessage = this.handleMidiMessageEvent.bind(this)
        this.initHandlers();
    }
    public get name(): string | null {
        return this.midiInput.name;
    }
    public get id(): string | null {
        return this.midiInput.id;
    }
    public cleanup() {
        this.midiInput.removeEventListener("statechange", this.boundStateChanged);
        this.midiInput.removeEventListener("midimessage", this.boundMidiMessage);
        this.stateChangedListeners = [];
        this.midiMessageListeners = [];
    }

    private initHandlers() {
        this.midiInput.addEventListener("statechange", this.boundStateChanged);
        this.midiInput.addEventListener("midimessage", this.boundMidiMessage);
    }

    public onStateChangeEvent(listener: StateChangedListener): RemoveFunction {
        this.stateChangedListeners.push(listener);
        return () => {
            this.stateChangedListeners = this.stateChangedListeners.filter((l) => l !== listener);
        }
    }
    public onMidiMessageEvent(listener: MidiMessageListener): RemoveFunction {
        this.midiMessageListeners.push(listener);
        return () => {
            this.midiMessageListeners = this.midiMessageListeners.filter((l) => l !== listener);
        }
    }

    private handleStateChangedEvent(event: MIDIConnectionEvent) {
        const port = event.port
        if (!port || port.id !== this.midiInput.id)
            return;
        
        for (const listener of this.stateChangedListeners)
            listener(port.state, port.connection);
        
    }
    private handleMidiMessageEvent(event: MIDIMessageEvent) {
        if (!event.data || event.timeStamp === undefined)
            return;
        const message = new MidiMessage(event.data, event.timeStamp)
        for (const listener of this.midiMessageListeners)
            listener(message);
    }
}

class MidiService {
    private permissionGranted: boolean = false;
    private midiAccess?: MIDIAccess;
    private midiInputs: Record<number, MIDIInput>
    constructor() {
        this.midiInputs = {}
    }
    
    public async requestPermission(): Promise<MIDIPermissionState> {
        if (this.permissionGranted)
            return MIDIPermissionState.GRANTED;

        if (typeof navigator === "undefined" || !navigator.requestMIDIAccess)
            return MIDIPermissionState.NOT_SUPPORTED;

        if (navigator.permissions?.query) {
            try {
                let result = await navigator.permissions.query({ name: "midi"});
                switch (result.state) {
                    case "granted":
                        this.permissionGranted = true;
                        return MIDIPermissionState.GRANTED;
                    case "prompt":
                        break;
                    case "denied":
                        return MIDIPermissionState.DENIED;
                }
            } catch {
                // :3
            }
        }
        try {
            await navigator.requestMIDIAccess();
            this.permissionGranted = true;
            return MIDIPermissionState.GRANTED;
        } catch(error: unknown) {
            if (!(error instanceof DOMException)) {
                console.error(`A strange error has occurred: ${error}`)
                return MIDIPermissionState.ERROR
            }
            switch (error.name)
            {
                case "NotSupportedError":
                    return MIDIPermissionState.NOT_SUPPORTED;
                case "NotAllowedError":
                    return MIDIPermissionState.DENIED;
                case "AbortError":   
                case "InvalidStateError":    
                default:
                    return MIDIPermissionState.ERROR
            }
        }
    }
    private initializeListeners(): boolean {
        if (!this.midiAccess)
            return false;
        this.midiAccess.addEventListener("statechange", this.handleAccessStateChangeEvent)

        return true;
    }
    private handleAccessStateChangeEvent(event: MIDIConnectionEvent) {
        throw new Error("Not Implemented")
    }
}

export const midiService = new MidiService()