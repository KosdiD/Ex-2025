// Глобальні змінні
let markersVisible = true;
let tempMarkerPosition = null;
let markerCounter = 1;
let deviceData = {};
let voiceRecognition = null;
let isListening = false;
let useMLModel = false;
let speechModel = null;
let lightDevices = {};
let lightCounter = 1;
let globalBrightness = 50;
let currentLightDevice = null;
let wallStartPoint = null;
let isCreatingWall = false;
let wallCounter = 1;
let wallData = [];

// Карта кольорів для голосових команд
const voiceColorMap = {
    'червоний': '#ff4d4d',
    'зелений': '#52ff65',
    'синій': '#4d94ff',
    'білий': '#ffffff',
    'жовтий': '#ffeb3b',
    'оранжевий': '#ffab4d',
    'фіолетовий': '#a45eff',
    'бірюзовий': '#4ecdc4'
};

const voiceCommands = {
    'створити маркер': () => createMarkerAtCurrentPosition(),
    'показати маркери': () => { markersVisible = true; toggleMarkers(); },
    'сховати маркери': () => { markersVisible = false; toggleMarkers(); },
    'на початок': () => resetPosition(),
    'експорт': () => exportData(),
    'створити світло': () => createLight(),
    'увімкнути світло': () => setAllLights(true),
    'вимкнути світло': () => setAllLights(false),
};

const defaultDevices = {
    'marker-0-0-0': { name: 'Розумний хаб', type: 'Центральний контролер', description: 'Основний хаб для керування всіма IoT пристроями в квартирі', position: {x: 0, y: 6, z: 0}, mlFeatures: ['Центральна обробка ML моделей', 'Координація Edge пристроїв'] }
};

const edgeMLTypes = {
    vision: { name: 'Камера з Computer Vision', color: '#ff6b6b', mlModels: ['MobileNet', 'TinyYOLO', 'FaceNet'], features: ['Розпізнавання людей', 'Детекція жестів', 'Ідентифікація об\'єктів'] },
    audio: { name: 'Аудіо процесор', color: '#4ecdc4', mlModels: ['TensorFlow Lite Audio', 'YAMNet'], features: ['Голосові команди', 'Детекція аномальних звуків', 'Розпізнавання мови'] },
    sensor: { name: 'Сенсорний аналізатор', color: '#45b7d1', mlModels: ['LSTM', 'Autoencoder'], features: ['Прогнозування споживання', 'Детекція аномалій', 'Оптимізація'] },
    motion: { name: 'Детектор руху з ML', color: '#96ceb4', mlModels: ['Pose Detection', 'Activity Recognition'], features: ['Розпізнавання активності', 'Детекція падіння', 'Аналіз поведінки'] },
    climate: { name: 'Клімат контролер з ML', color: '#dda0dd', mlModels: ['Time Series Forecasting', 'Regression Models'], features: ['Прогноз температури', 'Оптимізація енергії', 'Адаптивне навчання'] },
    light: { name: 'Розумне світло', color: '#ffeb3b', mlModels: ['Ambient Light Prediction', 'Presence Detection'], features: ['Автоматичне регулювання', 'Адаптивна яскравість', 'Економія енергії'] }
};


// --- ІНІЦІАЛІЗАЦІЯ ---
document.addEventListener('DOMContentLoaded', function() {
    console.log('✅ Smart Home XR Tour завантажено');
    
    setHeight();
    updateWallCreationUI();
    setInterval(updatePositionDisplay, 200);
    
    document.querySelector('a-scene').addEventListener('click', () => {
        document.querySelector('a-scene').canvas.requestPointerLock?.();
    });

    fetch('marker-light.json')
        .then(response => {
            if (response.ok) {
                console.log('🗂️ Знайдено файл marker-light.json. Завантажую сцену...');
                return response.json();
            } else {
                throw new Error('Файл не знайдено, буде використано сцену за замовчуванням.');
            }
        })
        .then(data => {
            loadSceneFromData(data);
        })
        .catch(error => {
            console.warn(error.message);
            loadSceneFromData({ devices: defaultDevices });
        });
});

// --- ГОЛОСОВЕ КЕРУВАННЯ ---
function initVoiceRecognition() {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        console.error('❌ Web Speech API не підтримується');
        return false;
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    voiceRecognition = new SpeechRecognition();
    voiceRecognition.continuous = true;
    voiceRecognition.interimResults = true;
    voiceRecognition.lang = 'uk-UA';
    voiceRecognition.onstart = () => {
        document.getElementById('voice-indicator').classList.add('active');
        document.getElementById('voice-status-text').textContent = 'Слухаю...';
    };
    voiceRecognition.onresult = (event) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
            if (event.results[i].isFinal) {
                finalTranscript += event.results[i][0].transcript;
            }
        }
        if (finalTranscript) {
             document.getElementById('voice-transcript').innerHTML = `<strong>"${finalTranscript}"</strong>`;
            processVoiceCommand(finalTranscript.toLowerCase().trim());
        }
    };
    voiceRecognition.onerror = (event) => console.error('Помилка розпізнавання:', event.error);
    voiceRecognition.onend = () => {
        document.getElementById('voice-indicator').classList.remove('active');
        if (isListening) voiceRecognition.start(); // Автоматичний перезапуск
    };
    return true;
}

function processVoiceCommand(command) {
    console.log('🎯 Обробка команди:', command);
    const statusText = document.getElementById('voice-status-text');
    const brightnessMatch = command.match(/яскравість\s*(\d+)/);
    if (brightnessMatch) {
        updateBrightness(parseInt(brightnessMatch[1], 10));
        statusText.textContent = `Яскравість: ${brightnessMatch[1]}%`;
        return;
    }
    for (const [colorName, colorValue] of Object.entries(voiceColorMap)) {
        if (command.includes(colorName)) {
            setAllLightsColor(colorValue);
            statusText.textContent = `Колір змінено на ${colorName}`;
            return;
        }
    }
    if (command.includes('стоп') || command.includes('зупини')) {
        stopVoiceRecognition();
        return;
    }
    for (const [key, action] of Object.entries(voiceCommands)) {
        if (command.includes(key)) {
            action();
            statusText.textContent = `Виконано: ${key}`;
            return;
        }
    }
    statusText.textContent = 'Команда не розпізнана';
}

function toggleVoiceRecognition() {
    if (!voiceRecognition && !initVoiceRecognition()) return;
    isListening ? stopVoiceRecognition() : startVoiceRecognition();
}

function startVoiceRecognition() {
    isListening = true;
    voiceRecognition.start();
    updateVoiceButton();
}

function stopVoiceRecognition() {
    isListening = false;
    voiceRecognition.stop();
    updateVoiceButton();
    document.getElementById('voice-status-text').textContent = 'Готово до роботи';
}

function updateVoiceButton() {
    const btn = document.getElementById('voice-btn'), btnText = document.getElementById('voice-btn-text');
    if (isListening) {
        btn.classList.add('active');
        btnText.textContent = 'Зупинити';
    } else {
        btn.classList.remove('active');
        btnText.textContent = 'Почати';
    }
}

// --- КЕРУВАННЯ ГРАВЦЕМ ---
function setHeight() {
    const height = parseFloat(document.getElementById('height-input').value);
    const rig = document.getElementById('rig');
    const camera = document.getElementById('camera');
    if (rig && camera && !isNaN(height)) {
        rig.setAttribute('simple-navmesh-constraint', 'height', height);
        camera.setAttribute('position', 'y', height);
        document.getElementById('current-height').textContent = height.toFixed(1);
    }
}

function changeHeight(direction) {
    const input = document.getElementById('height-input');
    input.value = (parseFloat(input.value) + direction).toFixed(1);
    setHeight();
}

function resetPosition() {
    const rig = document.getElementById('rig');
    rig.setAttribute('position', '0 6 10');
}

// --- КЕРУВАННЯ ОБ'ЄКТАМИ (МАРКЕРИ, СВІТЛО, СТІНИ) ---
function createMarkerAtCurrentPosition() {
    const camera = document.getElementById('camera');
    tempMarkerPosition = camera.object3D.getWorldPosition(new THREE.Vector3());
    document.getElementById('marker-form').style.display = 'block';
}

function saveMarker() {
    const name = document.getElementById('marker-name').value || `IoT Пристрій ${markerCounter}`;
    const description = document.getElementById('marker-description').value || 'Розумний пристрій';
    const mlType = document.getElementById('ml-device-type').value;
    const markerId = `marker-${markerCounter}`;
    const mlDevice = edgeMLTypes[mlType] || {};
    const device = {
        name,
        description,
        type: mlDevice.name || 'IoT Пристрій',
        position: tempMarkerPosition,
        mlType,
        mlModels: mlDevice.mlModels || [],
        mlFeatures: mlDevice.features || [],
    };
    deviceData[markerId] = device;
    createMarkerFromData(markerId, device);
    markerCounter++;
    cancelMarker();
}

function cancelMarker() {
    document.getElementById('marker-form').style.display = 'none';
    document.getElementById('marker-name').value = '';
    document.getElementById('marker-description').value = '';
}

function createMarkerFromData(markerId, device) {
    if (document.getElementById(markerId)) return;
    const container = document.createElement('a-entity');
    container.setAttribute('id', markerId);
    container.setAttribute('position', device.position);
    const marker = document.createElement('a-sphere');
    marker.setAttribute('class', 'iot-marker');
    marker.setAttribute('radius', 0.5);
    marker.setAttribute('color', (edgeMLTypes[device.mlType] || {}).color || '#00ff88');
    marker.addEventListener('click', () => showIotInfo(markerId));
    container.appendChild(marker);
    const text = document.createElement('a-text');
    text.setAttribute('value', device.name);
    text.setAttribute('position', '0 1 0');
    text.setAttribute('width', 4);
    text.setAttribute('align', 'center');
    container.appendChild(text);
    document.querySelector('a-scene').appendChild(container);
}

function showIotInfo(markerId) {
    const device = deviceData[markerId];
    const panel = document.getElementById('iot-info-panel');
    if (device && panel) {
        panel.querySelector('#iot-title').textContent = device.name;
        panel.querySelector('#iot-type').textContent = device.type;
        panel.querySelector('#iot-description').textContent = device.description;
        panel.classList.add('active');
    }
}

function closeIotPanel() {
    document.getElementById('iot-info-panel').classList.remove('active');
}

function toggleMarkers() {
    markersVisible = !markersVisible;
    document.querySelectorAll('.iot-marker, a-text[value]').forEach(el => el.setAttribute('visible', markersVisible));
}

function createLight() {
    const camera = document.getElementById('camera');
    const pos = camera.object3D.getWorldPosition(new THREE.Vector3());
    const lightId = `light-${lightCounter++}`;
    const lightData = {
        id: lightId,
        name: `Світло ${lightCounter - 1}`,
        position: { x: pos.x, y: pos.y, z: pos.z },
        isOn: true,
        brightness: globalBrightness,
        color: '#ffeb3b'
    };
    lightDevices[lightId] = lightData;
    createLightFromData(lightId, lightData);
}

function createLightFromData(lightId, lightData) {
    if (document.getElementById(lightId)) return;
    const lightEntity = document.createElement('a-entity');
    lightEntity.setAttribute('id', lightId);
    lightEntity.setAttribute('position', lightData.position);
    const pointLight = document.createElement('a-light');
    pointLight.setAttribute('type', 'point');
    pointLight.setAttribute('distance', 20);
    pointLight.setAttribute('decay', 2);
    const bulb = document.createElement('a-sphere');
    bulb.setAttribute('radius', 0.3);
    lightEntity.appendChild(pointLight);
    lightEntity.appendChild(bulb);
    document.querySelector('a-scene').appendChild(lightEntity);
    lightDevices[lightId].element = lightEntity; // Зберігаємо посилання
    updateLightState(lightDevices[lightId]);
}


function toggleAllLights() {
    const anyOn = Object.values(lightDevices).some(light => light.isOn);
    setAllLights(!anyOn);
}

function setAllLights(state) {
    Object.values(lightDevices).forEach(light => {
        light.isOn = state;
        updateLightState(light);
    });
}

function updateBrightness(value) {
    globalBrightness = Math.max(0, Math.min(100, value));
    document.getElementById('brightness-slider').value = globalBrightness;
    document.getElementById('brightness-value').textContent = `${globalBrightness}%`;
    Object.values(lightDevices).forEach(light => {
        light.brightness = globalBrightness;
        updateLightState(light);
    });
}

function updateLightState(light) {
    if (!light || !light.element) return;
    const pointLight = light.element.querySelector('a-light');
    const bulb = light.element.querySelector('a-sphere');
    const intensity = light.isOn ? light.brightness / 100 : 0;
    pointLight.setAttribute('intensity', intensity);
    pointLight.setAttribute('color', light.color || '#ffeb3b');
    bulb.setAttribute('color', light.color || '#ffeb3b');
    bulb.setAttribute('emissive', light.color || '#ffeb3b');
    bulb.setAttribute('emissiveIntensity', intensity);
}

function setAllLightsColor(color) {
    console.log(`🎨 Зміна кольору на: ${color}`);
    Object.values(lightDevices).forEach(light => {
        light.color = color;
        updateLightState(light);
    });
}

function toggleLightDevice() {
    if (currentLightDevice) {
        currentLightDevice.isOn = !currentLightDevice.isOn;
        updateLightState(currentLightDevice);
    }
}

function updateWallCreationUI() {
    document.getElementById('start-wall-btn').disabled = isCreatingWall;
    document.getElementById('create-wall-btn').disabled = !isCreatingWall;
    document.getElementById('cancel-wall-btn').disabled = !isCreatingWall;
}

function startWallCreation() {
    const camera = document.getElementById('camera');
    wallStartPoint = camera.object3D.getWorldPosition(new THREE.Vector3());
    isCreatingWall = true;
    updateWallCreationUI();
}

function cancelWallCreation() {
    isCreatingWall = false;
    wallStartPoint = null;
    updateWallCreationUI();
}

function createWall() { /* ... реалізація створення стін, якщо потрібна ... */ cancelWallCreation(); }


// --- ІМПОРТ/ЕКСПОРТ ---
function loadSceneFromData(importObject) {
    // Очищення
    Object.values(deviceData).forEach(d => document.getElementById(d.id)?.remove());
    Object.values(lightDevices).forEach(l => l.element?.remove());
    
    deviceData = { ...defaultDevices, ...(importObject.devices || {}) };
    lightDevices = {};
    markerCounter = importObject.markerCounter || Object.keys(deviceData).length;
    lightCounter = importObject.lightCounter || 1;
    
    if (importObject.globalBrightness !== undefined) {
        updateBrightness(importObject.globalBrightness);
    }

    // Відновлення
    Object.entries(deviceData).forEach(([id, data]) => {
        if (!defaultDevices[id]) createMarkerFromData(id, data);
    });
    Object.entries(importObject.lights || {}).forEach(([id, data]) => createLightFromData(id, data));
    console.log('✅ Сцену завантажено!');
}

function exportData() {
    const cleanLightDevices = {};
    for (const key in lightDevices) {
        const { element, ...rest } = lightDevices[key];
        cleanLightDevices[key] = rest;
    }
    const exportObject = {
        version: '1.3',
        exportDate: new Date().toISOString(),
        devices: deviceData,
        lights: cleanLightDevices,
        markerCounter,
        lightCounter,
        globalBrightness
    };
    const dataStr = JSON.stringify(exportObject, null, 2);
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([dataStr], { type: 'application/json' }));
    link.download = `smart-home-scene-${Date.now()}.json`;
    link.click();
}

function importData(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            loadSceneFromData(JSON.parse(e.target.result));
        } catch (error) {
            alert('Помилка при імпорті файлу.');
        }
    };
    reader.readAsText(file);
}

// --- УТИЛІТИ ---
function updatePositionDisplay() {
    const pos = document.getElementById('camera')?.object3D.getWorldPosition(new THREE.Vector3());
    if (pos) {
        document.getElementById('pos-x').textContent = pos.x.toFixed(1);
        document.getElementById('pos-y').textContent = pos.y.toFixed(1);
        document.getElementById('pos-z').textContent = pos.z.toFixed(1);
    }
}

// Глобальні функції для виклику з HTML
Object.assign(window, {
    changeHeight, setHeight, createMarkerAtCurrentPosition, saveMarker, cancelMarker,
    resetPosition, toggleMarkers, showIotInfo, closeIotPanel, exportData, importData,
    toggleVoiceRecognition, toggleMLMode, createLight, toggleAllLights, updateBrightness,
    toggleLightDevice, startWallCreation, createWall, cancelWallCreation, setAllLightsColor
});
