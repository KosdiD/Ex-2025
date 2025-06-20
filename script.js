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

// --- ІНІЦІАЛІЗАЦІЯ ---
document.addEventListener('DOMContentLoaded', function() {
    console.log('✅ Smart Home XR Tour завантажено');
    
    // Ініціалізація UI
    const initialHeight = document.getElementById('height-input').value;
    document.getElementById('current-height').textContent = initialHeight;
    updateWallCreationUI();
    setInterval(updatePositionDisplay, 200);
    
    // Додавання обробників подій
    document.querySelector('a-scene').addEventListener('enter-vr', () => {
        document.querySelector('a-scene').canvas.requestPointerLock();
    });
     document.querySelector('a-scene').addEventListener('click', () => {
        document.querySelector('a-scene').canvas.requestPointerLock?.();
    });

    // Автоматичне завантаження сцени
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
            // Завантажуємо пристрої за замовчуванням, якщо файл не знайдено
            loadSceneFromData({ devices: defaultDevices });
        });
});


// --- ГОЛОСОВЕ КЕРУВАННЯ ---
function initVoiceRecognition() {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        console.error('❌ Web Speech API не підтримується в цьому браузері');
        document.getElementById('voice-status-text').textContent = 'Голосове керування не підтримується';
        return false;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    voiceRecognition = new SpeechRecognition();
    
    voiceRecognition.continuous = true;
    voiceRecognition.interimResults = true;
    voiceRecognition.lang = 'uk-UA';
    voiceRecognition.maxAlternatives = 3;

    voiceRecognition.onstart = () => {
        console.log('🎤 Розпізнавання розпочато');
        document.getElementById('voice-indicator').classList.add('active');
        document.getElementById('voice-status-text').textContent = 'Слухаю...';
    };

    voiceRecognition.onresult = (event) => {
        let finalTranscript = '';
        let interimTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript.toLowerCase().trim();
            if (event.results[i].isFinal) {
                finalTranscript += transcript;
            } else {
                interimTranscript += transcript;
            }
        }
        if (interimTranscript) {
            document.getElementById('voice-transcript').innerHTML = `<em style="opacity: 0.7">${interimTranscript}</em>`;
        }
        if (finalTranscript) {
            document.getElementById('voice-transcript').innerHTML = `<strong>"${finalTranscript}"</strong>`;
            processVoiceCommand(finalTranscript);
            setTimeout(() => { document.getElementById('voice-transcript').innerHTML = ''; }, 3000);
        }
    };

    voiceRecognition.onerror = (event) => {
        console.error('❌ Помилка розпізнавання:', event.error);
        document.getElementById('voice-status-text').textContent = `Помилка: ${event.error}`;
    };

    voiceRecognition.onend = () => {
        console.log('🎤 Розпізнавання завершено');
        document.getElementById('voice-indicator').classList.remove('active');
        if (isListening) { // Перезапуск, якщо не було команди "стоп"
             voiceRecognition.start();
        }
    };
    return true;
}

function processVoiceCommand(command) {
    console.log('🎯 Обробка команди:', command);
    
    const brightnessMatch = command.match(/яскравість\s*(\d+)/);
    if (brightnessMatch) {
        const brightness = Math.min(100, Math.max(0, parseInt(brightnessMatch[1])));
        updateBrightness(brightness);
        document.getElementById('voice-status-text').textContent = `Яскравість: ${brightness}%`;
        return;
    }
    
    for (const [colorName, colorValue] of Object.entries(voiceColorMap)) {
        if (command.includes(colorName)) {
            setAllLightsColor(colorValue);
            document.getElementById('voice-status-text').textContent = `Колір змінено на ${colorName}`;
            return;
        }
    }
    
    if (command.includes('стоп') || command.includes('зупини')) {
        stopVoiceRecognition();
        return;
    }

    for (const [key, action] of Object.entries(voiceCommands)) {
        if (command.includes(key)) {
            console.log('✅ Виконую команду:', key);
            action();
            document.getElementById('voice-status-text').textContent = `Виконано: ${key}`;
            return;
        }
    }
    
    document.getElementById('voice-status-text').textContent = 'Команда не розпізнана';
}

function toggleVoiceRecognition() {
    if (!voiceRecognition && !initVoiceRecognition()) return;
    if (isListening) {
        stopVoiceRecognition();
    } else {
        startVoiceRecognition();
    }
}

function startVoiceRecognition() {
    if (!voiceRecognition) return;
    isListening = true;
    voiceRecognition.start();
    updateVoiceButton();
}

function stopVoiceRecognition() {
    if (!voiceRecognition) return;
    isListening = false;
    voiceRecognition.stop();
    updateVoiceButton();
    document.getElementById('voice-status-text').textContent = 'Готово до роботи';
}

function updateVoiceButton() {
    const btn = document.getElementById('voice-btn');
    const btnText = document.getElementById('voice-btn-text');
    if (isListening) {
        btn.classList.add('active');
        btnText.textContent = 'Зупинити розпізнавання';
    } else {
        btn.classList.remove('active');
        btnText.textContent = 'Почати розпізнавання';
    }
}

function toggleMLMode() {
    useMLModel = !useMLModel;
    document.getElementById('ml-mode-text').textContent = useMLModel ? 'ML: Увімк' : 'ML: Вимк';
}

// --- КЕРУВАННЯ ГРАВЦЕМ ---

// ВИПРАВЛЕНО: функція тепер коректно працює з NavMesh
function setHeight() {
    const height = parseFloat(document.getElementById('height-input').value);
    const rig = document.getElementById('rig');
    const camera = document.getElementById('camera');

    if (rig && camera && !isNaN(height)) {
        // 1. Оновлюємо параметр 'height' у компоненті navmesh.
        rig.setAttribute('simple-navmesh-constraint', 'height', height);
        // 2. Оновлюємо відносну позицію камери всередині 'rig'.
        camera.setAttribute('position', 'y', height);
        // 3. Оновлюємо текст в інтерфейсі.
        document.getElementById('current-height').textContent = height.toFixed(1);
        console.log(`Висоту гравця встановлено на ${height}м`);
    }
}

function changeHeight(direction) {
    const input = document.getElementById('height-input');
    let currentValue = parseFloat(input.value);
    input.value = (currentValue + direction).toFixed(1);
    setHeight();
}

// ВИПРАВЛЕНО: функція повертає на правильну висоту
function resetPosition() {
    const rig = document.getElementById('rig');
    rig.setAttribute('position', '0 6 10');
}


// --- КЕРУВАННЯ ОБ'ЄКТАМИ ---
const defaultDevices = {
    'marker-0-0-0': { name: 'Розумний хаб', type: 'Центральний контролер', description: 'Основний хаб для керування всіма IoT пристроями в квартирі', position: {x: 0, y: 0, z: 0}, mlFeatures: ['Центральна обробка ML моделей', 'Координація Edge пристроїв'] }
};

function createMarkerFromData(markerId, device) {
    if (document.getElementById(markerId)) return; 
    const container = document.createElement('a-entity');
    container.setAttribute('id', markerId);
    container.setAttribute('position', device.position);
    
    const marker = document.createElement('a-sphere');
    marker.setAttribute('class', 'iot-marker'); // Важливий клас для raycaster
    marker.setAttribute('radius', '0.5');
    marker.setAttribute('color', '#00ff88');
    marker.setAttribute('event-set__enter', '_event: mouseenter; scale: 1.2 1.2 1.2');
    marker.setAttribute('event-set__leave', '_event: mouseleave; scale: 1 1 1');
    marker.addEventListener('click', () => showIotInfo(markerId));
    
    const text = document.createElement('a-text');
    text.setAttribute('value', device.name);
    text.setAttribute('position', '0 1 0');
    text.setAttribute('width', '4');
    text.setAttribute('align', 'center');
    
    container.appendChild(marker);
    container.appendChild(text);
    document.querySelector('a-scene').appendChild(container);
}

function showIotInfo(markerId) {
    const device = deviceData[markerId];
    const panel = document.getElementById('iot-info-panel');
    if (device && panel) {
        document.getElementById('iot-title').textContent = device.name;
        document.getElementById('iot-type').textContent = device.type;
        document.getElementById('iot-description').textContent = device.description;
        document.getElementById('iot-coords').textContent = `X: ${device.position.x.toFixed(1)}, Y: ${device.position.y.toFixed(1)}, Z: ${device.position.z.toFixed(1)}`;
        document.getElementById('iot-ml-models').textContent = (device.mlModels && device.mlModels.length > 0) ? device.mlModels.join(', ') : 'Немає';
        document.getElementById('iot-ml-features').textContent = (device.mlFeatures && device.mlFeatures.length > 0) ? device.mlFeatures.join(', ') : 'Стандартні функції';
        panel.classList.add('active');
    }
}

function closeIotPanel() {
    document.getElementById('iot-info-panel').classList.remove('active');
}

function toggleMarkers() {
    markersVisible = !markersVisible;
    document.querySelectorAll('.iot-marker, a-text[value]').forEach(m => m.setAttribute('visible', markersVisible));
}


// --- ІМПОРТ/ЕКСПОРТ ---
function loadSceneFromData(importObject) {
    // Очищення сцени
    Object.keys(deviceData).forEach(id => { if (!defaultDevices[id]) document.getElementById(id)?.remove(); });
    Object.keys(lightDevices).forEach(id => document.getElementById(id)?.remove());
    
    deviceData = { ...defaultDevices, ...(importObject.devices || {}) };
    lightDevices = {};

    markerCounter = importObject.markerCounter || Object.keys(deviceData).length;
    lightCounter = importObject.lightCounter || 1;
    
    if (importObject.globalBrightness !== undefined) {
        updateBrightness(importObject.globalBrightness);
    }

    // Відновлення об'єктів
    Object.entries(deviceData).forEach(([id, data]) => {
        if (!defaultDevices[id]) createMarkerFromData(id, data);
    });
     Object.entries(importObject.lights || {}).forEach(([id, data]) => createLightFromData(id, data));

    console.log('✅ Сцену завантажено з даних!');
}

function importData(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const importObject = JSON.parse(e.target.result);
            loadSceneFromData(importObject);
            alert('Дані успішно імпортовано!');
        } catch (error) {
            console.error('❌ Помилка імпорту:', error);
            alert('Помилка при імпорті файлу.');
        }
    };
    reader.readAsText(file);
    event.target.value = '';
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
    changeHeight, setHeight, createMarkerAtCurrentPosition: () => {}, saveMarker: () => {}, cancelMarker: () => {},
    resetPosition, toggleMarkers, showIotInfo, closeIotPanel, exportData, importData,
    toggleVoiceRecognition, toggleMLMode, createLight: () => {}, toggleAllLights: () => {}, updateBrightness: () => {},
    toggleLightDevice: () => {}, startWallCreation: () => {}, createWall: () => {}, cancelWallCreation: () => {}, setAllLightsColor: () => {}
});
