import { AccessStateChangedListener, MIDIMessageData, MidiMessageListener, MIDIMessageType, MIDIPermissionState, RemoveFunction, StateChangedListener } from "./types.js";
// TODO: Maybe i should separate the midimessage class from this file that stores midiservice
export class MidiMessageMaker {
    public static fromRawData(rawData: Uint8Array, timeStamp: number): MidiMessage {
        let messageType = rawData[0] >> 4;
        let channelNumber = (rawData[0] & 0xF) + 1;
        let messageData: MIDIMessageData;
        const byte2 = rawData[1];
        const byte3 = rawData[2];
        if (messageType === MIDIMessageType.NOTE_ON && byte3 === 0)
            messageType = MIDIMessageType.NOTE_OFF;

        switch (messageType) {
            case MIDIMessageType.NOTE_OFF:
            case MIDIMessageType.NOTE_ON:
                messageData = {
                    messageType,
                    keyNumber: byte2,
                    velocity: byte3
                }
                break;
            case MIDIMessageType.AFTERTOUCH:
                messageData = {
                    messageType,
                    keyNumber: byte2,
                    pressureValue: byte3
                }
                break;
            case MIDIMessageType.CONTROL_CHANGE:
                messageData = {
                    messageType,
                    controllerNumber: byte2,
                    controllerValue: byte3
                }
                break;
            case MIDIMessageType.PROGRAM_CHANGE:
                messageData = {
                    messageType,
                    programNumber: byte2
                }
                break;
            case MIDIMessageType.CHANNEL_PRESSURE:
                messageData = {
                    messageType,
                    pressureValue: byte2
                }
                break;
            case MIDIMessageType.PITCH_BEND_CHANGE:
                messageData = {
                    messageType,
                    pitchLowerByte: byte2,
                    pitchHigherByte: byte3
                }
                break
            case MIDIMessageType.SYSTEM_MESSAGE:
            default:
                messageData = {
                    messageType
                }
                break;
        }
        return new MidiMessage(channelNumber, rawData, timeStamp, messageData);
    }
    public static createMessage(midiMessageData: MIDIMessageData, channelNumber = 1) {
        const status = (midiMessageData.messageType << 4) + ((channelNumber - 1) & 0xF);
        let rawData;
        switch (midiMessageData.messageType) {
            case MIDIMessageType.NOTE_OFF:
            case MIDIMessageType.NOTE_ON:
                rawData = new Uint8Array([status, midiMessageData.keyNumber, midiMessageData.velocity])
                break;
            case MIDIMessageType.AFTERTOUCH:
                rawData = new Uint8Array([status, midiMessageData.keyNumber, midiMessageData.pressureValue])
                break;
            case MIDIMessageType.CONTROL_CHANGE:
                rawData = new Uint8Array([status, midiMessageData.controllerNumber, midiMessageData.controllerValue])
                break;
            case MIDIMessageType.PROGRAM_CHANGE:
                rawData = new Uint8Array([status, midiMessageData.programNumber])
                break;
            case MIDIMessageType.CHANNEL_PRESSURE:
                rawData = new Uint8Array([status, midiMessageData.pressureValue])
                break;
            case MIDIMessageType.PITCH_BEND_CHANGE:
                rawData = new Uint8Array([status, midiMessageData.pitchLowerByte, midiMessageData.pitchHigherByte])
                break
            case MIDIMessageType.SYSTEM_MESSAGE: // TODO: this is guarenteed to break
            default:
                rawData = new Uint8Array([status])
                break;
        }
        return new MidiMessage(channelNumber, rawData, performance.now(), midiMessageData)
    }
}
export class MidiMessage {
    // Reference: https://midi.org/summary-of-midi-1-0-messages
    public readonly channelNumber: number;
    public readonly rawData: Uint8Array;
    public readonly timeStamp: number;
    public readonly data: MIDIMessageData;
    
    constructor(channelNumber: number, rawData: Uint8Array, timeStamp: number, data: MIDIMessageData) {
        this.channelNumber = channelNumber;
        this.rawData = rawData;
        this.timeStamp = timeStamp;
        this.data = data;
    }
}

export class MidiInputDevice {
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
    public get id(): string {
        return this.midiInput.id;
    }
    public get deviceType(): "input" {
        return "input";
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
        const message = MidiMessageMaker.fromRawData(event.data, event.timeStamp)
        for (const listener of this.midiMessageListeners)
            listener(message);
    }
}
export class MidiOutputDevice {
    private isInitialized: boolean = false;
    private midiOutput: MIDIOutput;
    private stateChangedListeners: StateChangedListener[];
    private boundStateChanged: (event: MIDIConnectionEvent) => void;

    constructor(midiOutput: MIDIOutput) {
        this.midiOutput = midiOutput;
        this.stateChangedListeners = [];
        this.boundStateChanged = this.handleStateChangedEvent.bind(this)
        this.initHandlers();
    }
    public get name(): string | null {
        return this.midiOutput.name;
    }
    public get id(): string {
        return this.midiOutput.id;
    }
    public get deviceType(): "output" {
        return "output";
    }
    public sendMidiMessage(midiMessage: MidiMessage) {
        this.midiOutput.send(midiMessage.rawData)
    }
    public cleanup() {
        this.midiOutput.removeEventListener("statechange", this.boundStateChanged);
        this.stateChangedListeners = [];
    }
    private initHandlers() {
        this.midiOutput.addEventListener("statechange", this.boundStateChanged);
    }
    public onStateChangeEvent(listener: StateChangedListener): RemoveFunction {
        this.stateChangedListeners.push(listener);
        return () => {
            this.stateChangedListeners = this.stateChangedListeners.filter((listenerElement: StateChangedListener) => listenerElement !== listener);
        }
    }
    private handleStateChangedEvent(event: MIDIConnectionEvent) {
        const port = event.port;
        if (!port || port.id !== this.midiOutput.id)
            return;
        
        for (const listener of this.stateChangedListeners)
            listener(port.state, port.connection);
    }
}

class MidiService {
    private isInitialized: boolean = false;
    private midiAccess?: MIDIAccess;
    private midiInputs: Map<string, MidiInputDevice>;
    private midiOutputs: Map<string, MidiOutputDevice>;
    private accessStateChangedListeners: AccessStateChangedListener[];
    private boundStateChanged: (event: MIDIConnectionEvent) => void;

    constructor() {
        this.midiInputs = new Map<string, MidiInputDevice>();
        this.midiOutputs = new Map<string, MidiOutputDevice>();
        this.accessStateChangedListeners = [];
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
            switch (error.name) {
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
    public onAccessStateChangedEvent(listener: AccessStateChangedListener): RemoveFunction {
        this.accessStateChangedListeners.push(listener);
        return () => {
            this.accessStateChangedListeners = this.accessStateChangedListeners.filter((listenerElement: AccessStateChangedListener) => listenerElement !== listener);
        }
    }
    private initializePorts(): boolean {
        if (!this.midiAccess)
            return false;
        for (const [id, inputPort] of this.midiAccess.inputs) {
            if (this.midiInputs.has(id) || inputPort.state !== "connected")
                continue;
            const midiInputDevice = new MidiInputDevice(inputPort);
            this.midiInputs.set(id, midiInputDevice);
        }
        for (const [id, outputPort] of this.midiAccess.outputs) {
            if (this.midiOutputs.has(id) || outputPort.state !== "connected")
                continue;
            const midiOutputDevice = new MidiOutputDevice(outputPort);
            this.midiOutputs.set(id, midiOutputDevice);
        }
        return true;
    }
    private initializeListeners() {
        if (!this.midiAccess)
            return;
        this.midiAccess.addEventListener("statechange", this.boundStateChanged);
    }
    private handleAccessStateChangeEvent(event: MIDIConnectionEvent) {
        const port = event.port;
        if (!port) 
            return; 
        const portType = port.type;
        const midiMap = (portType === "input") ? this.midiInputs : this.midiOutputs;
        const portInitialized = midiMap.has(port.id);

        if (port.state === "connected" && !portInitialized) {
            const midiDevice = (portType === "input") ? new MidiInputDevice(port as MIDIInput) : new MidiOutputDevice(port as MIDIOutput);
            midiMap.set(port.id, midiDevice as any);
            for (const listener of this.accessStateChangedListeners)
                listener("deviceadded", midiDevice);
            
        } else if (port.state === "disconnected" && portInitialized) {
            const midiDevice = midiMap.get(port.id) as MidiInputDevice | MidiOutputDevice;
            midiDevice.cleanup();
            midiMap.delete(port.id);
           for (const listener of this.accessStateChangedListeners)
                listener("deviceremoved", midiDevice);
        }
    }
    public get inputs(): MidiInputDevice[] {
        return Array.from(this.midiInputs.values());
    }
    public get outputs(): MidiOutputDevice[] {
        return Array.from(this.midiOutputs.values());
    }
}

export const midiService = new MidiService()