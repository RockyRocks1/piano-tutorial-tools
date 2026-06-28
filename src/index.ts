import "./components/piano-keyboard/piano-keyboard.js"; 
import { inputTracker } from "./core/midi-input-tracker.js";
import { MidiInputDevice, MidiMessage, MidiMessageMaker, MidiOutputDevice, midiService } from "./core/midi.js";
import Note from "./core/note.js";
import { MIDIMessageType, MIDIPermissionState, RemoveFunction } from "./core/types.js";
const keyboard = document.querySelector("#keyboard");
function addDeviceOption(displayText: string, value: string, parentDropdown: HTMLSelectElement) {
    let option = document.createElement("option");
    option.innerHTML = displayText;
    option.value = value;
    parentDropdown.appendChild(option);
}
function onDeviceAdded(device: MidiInputDevice | MidiOutputDevice) {
    let targetDropdown: HTMLSelectElement | null = null;
    if (device.deviceType === "input") {
        hookInput(device);
        targetDropdown = document.querySelector("#input-dropdown");
    } else if (device.deviceType === "output") {
        hookOutput(device);
        targetDropdown = document.querySelector("#output-dropdown");
    }
    if (targetDropdown === null)
        return;
    const displayName = device.name || device.id;
    addDeviceOption(displayName, device.id, targetDropdown);

}
function hookInput(inputDevice: MidiInputDevice) {
    let pianoWrapper = keyboard?.shadowRoot?.querySelector(".piano-wrapper");
    if (!pianoWrapper)
        return;
   
    inputDevice.onMidiMessageEvent((message: MidiMessage) => {
        console.log(message.data)
        if (message.data.messageType !== MIDIMessageType.NOTE_ON && message.data.messageType !== MIDIMessageType.NOTE_OFF)
            return;
        for (let keyElement of pianoWrapper.children) {
            const keyNumber = Number(keyElement.getAttribute("key-number"));
            if (keyNumber !== message.data.keyNumber)
                continue;
            
            if (message.data.messageType == MIDIMessageType.NOTE_ON)
                keyElement.classList.add("pressed");
            else
                keyElement.classList.remove("pressed");
        }
    })
}
function hookOutput(outputDevice: MidiOutputDevice) {
    let pianoWrapper = keyboard?.shadowRoot?.querySelector(".piano-wrapper");
    if (!pianoWrapper)
        return;
    for (let keyElement of pianoWrapper.children) {
        keyElement.addEventListener("mousedown", () => {
            outputDevice.sendMidiMessage(MidiMessageMaker.createMessage({messageType: MIDIMessageType.NOTE_ON, keyNumber: Number(keyElement.getAttribute("key-number")), velocity: 54}, 15))
        })
        keyElement.addEventListener("mouseup", () => {
            outputDevice.sendMidiMessage(MidiMessageMaker.createMessage({messageType: MIDIMessageType.NOTE_OFF, keyNumber: Number(keyElement.getAttribute("key-number")), velocity: 0}, 15))
        })
    }
   
}



async function load() {
    const permission = await midiService.initialize();
    if (permission !== MIDIPermissionState.GRANTED)
        return;
    
    for (let inputDevice of midiService.inputs) {
        onDeviceAdded(inputDevice);
        console.log("hi");
    }
    for (let outputDevice of midiService.outputs) {
        onDeviceAdded(outputDevice)
    }
    midiService.onAccessStateChangedEvent((state, device) => {
        if (state == "deviceadded") {
            console.log("hi");
            onDeviceAdded(device);
        }
    })

}
load();
