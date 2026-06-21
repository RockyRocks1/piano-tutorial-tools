import { MIDIMessageType, MIDIPermissionState } from "./types/types.js";
// Version 1 (almost done)
class MidiMessage {
    // Reference: https://midi.org/summary-of-midi-1-0-messages
    public readonly messageType: MIDIMessageType;
    public readonly channelNumber: number;
    public readonly rawData: Uint8Array;
    public readonly timeStamp: number;

    // specific message properties
    public readonly keyNumber?: number;
    public readonly velocity?: number;
    // i am confident that the below wont be used 
    public readonly controllerNumber?: number;
    public readonly controllerValue?: number;
    public readonly programNumber?: number;
    public readonly pressureValue?: number;
    public readonly pitchBendValue?: number;

    
    constructor(data: Uint8Array, timeStamp: number) {
        this.messageType = data[0] >> 4;
        this.channelNumber = (data[0] & 0xF) + 1;
        this.rawData = data;
        this.timeStamp = timeStamp;

        switch (this.messageType) {
            case MIDIMessageType.NOTE_OFF:
            case MIDIMessageType.NOTE_ON:
                this.keyNumber = this.rawData[1];
                this.velocity = this.rawData[2];
                if (this.messageType == MIDIMessageType.NOTE_ON && this.velocity === 0)
                    this.messageType = MIDIMessageType.NOTE_OFF;
                break;
            case MIDIMessageType.AFTERTOUCH:
                this.keyNumber = this.rawData[1];
                this.pressureValue = this.rawData[2];
                break;
            case MIDIMessageType.CONTROL_CHANGE:
                this.controllerNumber = this.rawData[1];
                this.controllerValue = this.rawData[2];
                break;
            case MIDIMessageType.PROGRAM_CHANGE:
                this.programNumber = this.rawData[1];
                break;
            case MIDIMessageType.CHANNEL_PRESSURE:
                this.pressureValue = this.rawData[1];
                break;
            case MIDIMessageType.PITCH_BEND_CHANGE:
                this.pitchBendValue = (this.rawData[2] << 7) + this.rawData[1];
                break
            case MIDIMessageType.SYSTEM_MESSAGE:
            default:
                break;
        }
    }
}

// these types cant be in types file because it would create a circular dependency
// TODO: I could create another types file?
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
            this.stateChangedListeners = this.stateChangedListeners.filter((listenerElement: StateChangedListener) => listenerElement !== listener);
        }
    }
    public onMidiMessageEvent(listener: MidiMessageListener): RemoveFunction {
        this.midiMessageListeners.push(listener);
        return () => {
            this.midiMessageListeners = this.midiMessageListeners.filter((listenerElement: MidiMessageListener) => listenerElement !== listener);
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
class MidiOutputDevice {
    // idk what will be here... not planning to add anything here for now
}

class MidiService {
    private isInitialized: boolean = false;
    private midiAccess?: MIDIAccess;
    private midiInputs: Map<string, MidiInputDevice>;
    private boundStateChanged: (event: MIDIConnectionEvent) => void;
    constructor() {
        this.midiInputs = new Map<string, MidiInputDevice>();
        this.boundStateChanged = this.handleAccessStateChangeEvent.bind(this);
    }
    
    public async initialize(): Promise<MIDIPermissionState> {
        if (this.isInitialized)
            return MIDIPermissionState.GRANTED;

        if (typeof navigator === "undefined" || !navigator.requestMIDIAccess)
            return MIDIPermissionState.NOT_SUPPORTED;

        if (navigator.permissions?.query) {
            try {
                let result = await navigator.permissions.query({ name: "midi"});
                switch (result.state) {
                    case "denied":
                        return MIDIPermissionState.DENIED;
                    default:
                        break;
                }
            } catch {
                // :3
            }
        }
        try {
            this.midiAccess = await navigator.requestMIDIAccess();
            this.isInitialized = true;
            this.initializeListeners();
            this.initializePorts();
            return MIDIPermissionState.GRANTED;
        } catch(error: unknown) {
            if (!(error instanceof DOMException)) 
                return MIDIPermissionState.ERROR;
            switch (error.name)
            {
                case "NotSupportedError":
                    return MIDIPermissionState.NOT_SUPPORTED;
                case "NotAllowedError":
                    return MIDIPermissionState.DENIED;
                case "AbortError":   
                case "InvalidStateError":    
                default:
                    return MIDIPermissionState.ERROR;
            }
        }
    }
    private initializePorts(): boolean {
        if (!this.midiAccess)
            return false;
        for (const [id, inputPort] of this.midiAccess.inputs) {
            if (this.midiInputs.has(id) || inputPort.state !== "connected")
                continue;
            const midiInputDevice = new MidiInputDevice(inputPort)
            this.midiInputs.set(id, midiInputDevice);
        }
        return true;
    }
    private initializeListeners(): boolean {
        if (!this.midiAccess)
            return false;
        this.midiAccess.addEventListener("statechange", this.boundStateChanged);
        return true;
    }
    private handleAccessStateChangeEvent(event: MIDIConnectionEvent) {
        // will cahnge this if and when midioutputdevice gets implemented
        const port = event.port;
        if (!port || port.type !== "input") 
            return; 
        const portInitialized = this.midiInputs.has(port.id);
        if (port.state === "connected" && !portInitialized) {
            const midiInputDevice = new MidiInputDevice(port as MIDIInput);
            this.midiInputs.set(event.port.id, midiInputDevice);
            if (port.connection !== "open")
                port.open();
        } else if (port.state === "disconnected" && portInitialized) {
            let midiInputDevice = this.midiInputs.get(port.id) as MidiInputDevice;
            midiInputDevice.cleanup();
            this.midiInputs.delete(port.id);
            if (port.connection !== "closed")
                port.close();
        }
    }
    public get inputs(): MidiInputDevice[] {
        return Array.from(this.midiInputs.values())
    }
}

export const midiService = new MidiService()