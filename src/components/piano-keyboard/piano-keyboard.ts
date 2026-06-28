import Note from "../../core/note.js";

const DEFAULT_KEY_COUNT = "49";
const DEFAULT_START_MIDI = "36";
export class PianoKeyboard extends HTMLElement {
    static observedAttributes = ["keys", "start-note"]

    private shadow: ShadowRoot;
    constructor() {
        super();
        this.shadow = this.attachShadow({mode: "open"});

        const stylesheet = document.createElement("link");
        stylesheet.rel = "stylesheet";
        stylesheet.href = "/src/components/piano-keyboard/piano-keyboard.css";
        
        const pianoWrapper = document.createElement("div");
        pianoWrapper.classList.add("piano-wrapper");

        this.shadow.appendChild(stylesheet);
        this.shadow.appendChild(pianoWrapper);
    }
    renderKeys() {
        const wrapper = this.shadow.querySelector(".piano-wrapper");
        if (!wrapper)
            return;
        wrapper.innerHTML = "";

        const totalKeys = parseInt(this.getAttribute("keys") || DEFAULT_KEY_COUNT);
        const startMidi = parseInt(this.getAttribute("start-note") || DEFAULT_START_MIDI);
        const endMidi = startMidi + totalKeys - 1;

        const notes: Note[] = [];
        let whiteKeyCount = 0;
        for (let midi = startMidi; midi <= endMidi; midi++) {
            const note = new Note(midi);
            if (!note.isAccidental)
                whiteKeyCount++;
            notes.push(note);
        }
        const blackKeyWidthPercent = (100 / whiteKeyCount) * 0.55;
        let whiteKeyIndex = 0;
        for (const note of notes) {
            const keyButton = document.createElement("button");
            keyButton.classList.add("piano-key");
            if (note.isAccidental) {
                keyButton.classList.add("black-key");
                const leftPercent = (whiteKeyIndex / whiteKeyCount) * 100;
                keyButton.style.left = `${leftPercent}%`;
                keyButton.style.width = `${blackKeyWidthPercent}%`
            } else {
                keyButton.classList.add("white-key");
                whiteKeyIndex++;
            }
            wrapper.appendChild(keyButton);
        }
        
    }
    connectedCallback() {
        this.renderKeys();
    }
    attributeChangedCallback(attributeName: string, oldValue: any, newValue: any) {
        switch (attributeName) {
            case "keys":
            case "start-note":
                if (oldValue !== newValue)
                    this.renderKeys();
                break;
            default:
                break;
        }
    }
    
}
customElements.define("piano-keyboard", PianoKeyboard)