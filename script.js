// --- DOM ELEMENTS AND CONSTANTS ---
const barContainer = document.getElementById('bar-container');
const resetButton = document.getElementById('resetButton');
const sortButton = document.getElementById('sortButton');
const completionMessage = document.getElementById('completionMessage');

const NUMBER_OF_COLOR_BARS = 100;
const ANIMATION_SPEED_MS = 20;

const BASE_COLORS = ['#10451d', '#155d27', '#1a7431', '#208b3a', '#25a244', '#2dc653', '#4ad66d', '#6ede8a', '#92e6a7', '#b7efc5'];
let colors = [];


// --- WEB AUDIO SETUP ---
let audioContext;
let audioBuffer; // This will hold our loaded sound file

// The range for the playback speed. 1.0 is normal pitch.
const MIN_PITCH = 0.5; // Half speed, one octave lower
const MAX_PITCH = 2.0; // Double speed, one octave higher

// --- CONSTANTS FOR FADE EFFECT ---
const FADE_IN_TIME = 0.05; // The duration of the fade-in in seconds (e.g., 0.05 is 50ms)
const PLAY_DURATION = 0.2; // How long each sound clip should play in seconds

// Loads your sound file
const loadSound = async (url) => {
    if (!audioContext) return;
    try {
        const response = await fetch(url);
        const arrayBuffer = await response.arrayBuffer();
        const decodedData = await audioContext.decodeAudioData(arrayBuffer);
        audioBuffer = decodedData; // Store the decoded sound
    } catch (error) {
        console.error('Error loading audio file:', error);
    }
};

// --- UPDATED playSound FUNCTION WITH FADE-IN ---
const playSound = (pitch) => {
    if (!audioContext || !audioBuffer) return;

    // 1. Create the necessary audio nodes
    const source = audioContext.createBufferSource();
    const gainNode = audioContext.createGain(); // This node controls the volume

    source.buffer = audioBuffer;
    source.playbackRate.setValueAtTime(pitch, audioContext.currentTime);

    // 2. Schedule the volume automation for the fade effect
    const now = audioContext.currentTime;
    gainNode.gain.setValueAtTime(0, now); // Start at volume 0 (silent)
    gainNode.gain.linearRampToValueAtTime(1, now + FADE_IN_TIME); // Fade in to full volume (1)
    gainNode.gain.linearRampToValueAtTime(0, now + PLAY_DURATION); // Fade out to 0 to prevent clicks

    // 3. Connect the audio path: source -> volume control -> speakers
    source.connect(gainNode);
    gainNode.connect(audioContext.destination);

    // 4. Start the sound and schedule it to stop
    source.start(now);
    source.stop(now + PLAY_DURATION + 0.01); // Stop the source just after it has faded out
};


// --- COLOR AND ARRAY GENERATION ---
const hexToRgb = (hex) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) } : null;
};

const rgbToHex = (r, g, b) => {
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).padStart(6, '0');
};

const generateGradientArray = (baseColors, totalBars) => {
    const gradientColors = [];
    for (let i = 0; i < totalBars; i++) {
        const position = i / (totalBars - 1);
        const colorPosition = position * (baseColors.length - 1);
        const startIndex = Math.floor(colorPosition);
        const endIndex = Math.min(startIndex + 1, baseColors.length - 1);
        
        const startColor = hexToRgb(baseColors[startIndex]);
        const endColor = hexToRgb(baseColors[endIndex]);

        const localPosition = colorPosition - startIndex;

        const r = Math.round(startColor.r + (endColor.r - startColor.r) * localPosition);
        const g = Math.round(startColor.g + (endColor.g - startColor.g) * localPosition);
        const b = Math.round(startColor.b + (endColor.b - startColor.b) * localPosition);

        gradientColors.push(rgbToHex(r, g, b));
    }
    return gradientColors;
};

const shuffleArray = (array) => {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
};

const resetArray = () => {
    completionMessage.classList.remove('visible');
    const sortedGradient = generateGradientArray(BASE_COLORS, NUMBER_OF_COLOR_BARS);
    colors = shuffleArray(sortedGradient);
    renderBars(colors);
    sortButton.disabled = false;
    resetButton.disabled = false;
};

const renderBars = (array) => {
    barContainer.innerHTML = ''; 
    for (const color of array) {
        const bar = document.createElement('div');
        bar.classList.add('color-bar');
        bar.style.backgroundColor = color;
        barContainer.appendChild(bar);
    }
};


// --- ANIMATION LOGIC ---
const animateSort = (animations) => {
    sortButton.disabled = true;
    resetButton.disabled = true;

    for (let i = 0; i < animations.length; i++) {
        const bars = document.getElementsByClassName('color-bar');
        const [barIndex, newColor] = animations[i];

        setTimeout(() => {
            bars[barIndex].style.backgroundColor = newColor;

            const brightness = getBrightness(newColor);
            const pitch = MIN_PITCH + (1 - (brightness / 255)) * (MAX_PITCH - MIN_PITCH);
            
            playSound(pitch);

            if (i === animations.length - 1) {
                sortButton.disabled = false;
                resetButton.disabled = false;
                completionMessage.classList.add('visible');
            }
        }, i * ANIMATION_SPEED_MS);
    }
};


// --- SORTING ALGORITHM ---
const getBrightness = (hex) => {
    const rgb = hexToRgb(hex);
    if (!rgb) return 0;
    return 0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b;
};

const mergeSort = (array) => {
    const animations = [];
    if (array.length <= 1) return array;
    const auxiliaryArray = array.slice();
    mergeSortHelper(array, 0, array.length - 1, auxiliaryArray, animations);
    return animations;
};

const mergeSortHelper = (mainArray, startIdx, endIdx, auxiliaryArray, animations) => {
    if (startIdx === endIdx) return;
    const middleIdx = Math.floor((startIdx + endIdx) / 2);
    mergeSortHelper(auxiliaryArray, startIdx, middleIdx, mainArray, animations);
    mergeSortHelper(auxiliaryArray, middleIdx + 1, endIdx, mainArray, animations);
    doMerge(mainArray, startIdx, middleIdx, endIdx, auxiliaryArray, animations);
};

const doMerge = (mainArray, startIdx, middleIdx, endIdx, auxiliaryArray, animations) => {
    let k = startIdx;
    let i = startIdx;
    let j = middleIdx + 1;
    while (i <= middleIdx && j <= endIdx) {
        if (getBrightness(auxiliaryArray[i]) <= getBrightness(auxiliaryArray[j])) {
            animations.push([k, auxiliaryArray[i]]);
            mainArray[k++] = auxiliaryArray[i++];
        } else {
            animations.push([k, auxiliaryArray[j]]);
            mainArray[k++] = auxiliaryArray[j++];
        }
    }
    while (i <= middleIdx) {
        animations.push([k, auxiliaryArray[i]]);
        mainArray[k++] = auxiliaryArray[i++];
    }
    while (j <= endIdx) {
        animations.push([k, auxiliaryArray[j]]);
        mainArray[k++] = auxiliaryArray[j++];
    }
};


// --- EVENT LISTENERS ---
const handleSort = () => {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        loadSound('sound.mp3'); 
    }
    const animations = mergeSort(colors);
    animateSort(animations);
};

resetButton.addEventListener('click', resetArray);
sortButton.addEventListener('click', handleSort);

resetArray();