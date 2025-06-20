// Глобальні змінні
let markersVisible = true;
let tempMarkerPosition = null;
let markerCounter = 1;
let deviceData = {};
let voiceRecognition = null;
let isListening = false;
let useMLModel = false;
let speechModel = null;
let lightDevices = {}; // Для збереження світлових пристроїв
let lightCounter = 1;
let globalBrightness = 50;

// Глобальні змінні для створення стін
let wallStartPoint = null;
let isCreatingWall = false;
let wallCounter = 1;
let wallData = []; // Для збереження даних про стіни

// НОВЕ: Карта кольорів для голосових команд
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

// Голосові команди
const voiceCommands = {
    'створити маркер': () => createMarkerAtCurrentPosition(),
    'створи маркер': () => createMarkerAtCurrentPosition(),
    'додати пристрій': () => createMarkerAtCurrentPosition(),
    'показати маркери': () => { markersVisible = true; toggleMarkers(); },
    'покажи маркери': () => { markersVisible = true; toggleMarkers(); },
    'сховати маркери': () => { markersVisible = false; toggleMarkers(); },
    'сховай маркери': () => { markersVisible = false; toggleMarkers(); },
    'на початок': () => resetPosition(),
    'додому': () => resetPosition(),
    'скинути позицію': () => resetPosition(),
    'експорт': () => exportData(),
    'експортувати': () => exportData(),
    'зберегти маркери': () => exportData(),
    'камера вгору': () => changeHeight(5),
    'камера вниз': () => changeHeight(-5),
    'вище': () => changeHeight(3),
    'нижче': () => changeHeight(-3),
    'стоп': () => stopVoiceRecognition(),
    'зупинити': () => stopVoiceRecognition(),
    'створити світло': () => createLight(),
    'додати світло': () => createLight(),
    'вимкнути світло': () => setAllLights(false),
    'вимкни світло': () => setAllLights(false),
    'увімкнути світло': () => setAllLights(true),
    'увімкни світло': () => setAllLights(true),
    'вимкнути все': () => setAllLights(false),
    'увімкнути все': () => setAllLights(true),
    'максимальна яскравість': () => updateBrightness(100),
    'мінімальна яскравість': () => updateBrightness(0),
    'середня яскравість': () => updateBrightness(50)
};

// ... (Весь код для Voice Recognition, ML, IoT пристроїв залишається тут без змін) ...
// Ініціалізація Web Speech API
function initVoiceRecognition() {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        console.error('❌ Web Speech API не підтримується в цьому браузері');
        document.getElementById('voice-status-text').textContent = 'Голосове керування не підтримується';
        return false;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    voiceRecognition = new SpeechRecognition();
    
    // Налаштування
    voiceRecognition.continuous = true;
    voiceRecognition.interimResults = true;
    voiceRecognition.lang = 'uk-UA'; // Українська мова
    voiceRecognition.maxAlternatives = 3;

    // Обробники подій
    voiceRecognition.onstart = () => {
        console.log('🎤 Розпізнавання розпочато');
        document.getElementById('voice-indicator').classList.add('active');
        document.getElementById('voice-status-text').textContent = 'Слухаю...';
    };

    voiceRecognition.onresult = (event) => {
        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript.toLowerCase();
            
            if (event.results[i].isFinal) {
                finalTranscript += transcript;
            } else {
                interimTranscript += transcript;
            }
        }

        if (interimTranscript) {
            document.getElementById('voice-transcript').innerHTML = 
                `<em style="opacity: 0.7">${interimTranscript}</em>`;
        }

        if (finalTranscript) {
            document.getElementById('voice-transcript').innerHTML = 
                `<strong>"${finalTranscript}"</strong>`;
            
            processVoiceCommand(finalTranscript);
            
            setTimeout(() => {
                document.getElementById('voice-transcript').innerHTML = '';
            }, 3000);
        }
    };

    voiceRecognition.onerror = (event) => {
        console.error('❌ Помилка розпізнавання:', event.error);
        document.getElementById('voice-status-text').textContent = `Помилка: ${event.error}`;
        
        if (event.error === 'no-speech') {
            document.getElementById('voice-status-text').textContent = 'Не чую мови, спробуйте ще раз';
        }
    };

    voiceRecognition.onend = () => {
        console.log('🎤 Розпізнавання завершено');
        document.getElementById('voice-indicator').classList.remove('active');
        isListening = false;
        updateVoiceButton();
    };

    return true;
}
// ОНОВЛЕНО: Обробник команд для розпізнавання кольору
function processVoiceCommand(command) {
    console.log('🎯 Обробка команди:', command);

    // 1. Перевірка на зміну яскравості
    const brightnessMatch = command.match(/яскравість\s*(\d+)/);
    if (brightnessMatch) {
        const brightness = Math.min(100, Math.max(0, parseInt(brightnessMatch[1])));
        updateBrightness(brightness);
        document.getElementById('voice-status-text').textContent = `Яскравість встановлено: ${brightness}%`;
        return;
    }
    
    // 2. НОВЕ: Перевірка на зміну кольору
    for (const [colorName, colorValue] of Object.entries(voiceColorMap)) {
        if (command.includes(colorName)) {
            setAllLightsColor(colorValue);
            document.getElementById('voice-status-text').textContent = `Колір змінено на ${colorName}`;
            return;
        }
    }

    // 3. Перевірка на інші команди
    for (const [key, action] of Object.entries(voiceCommands)) {
        if (command.includes(key)) {
            console.log('✅ Виконую команду:', key);
            action();
            
            document.getElementById('voice-status-text').textContent = `Виконано: ${key}`;
            return;
        }
    }
    
    document.getElementById('voice-status-text').textContent = 'Команда не розпізнана';
    console.log('❓ Невідома команда:', command);
}
function toggleVoiceRecognition() {
    if (!voiceRecognition && !initVoiceRecognition()) {
        return;
    }

    if (isListening) {
        stopVoiceRecognition();
    } else {
        startVoiceRecognition();
    }
}
function startVoiceRecognition() {
    if (!voiceRecognition) return;
    voiceRecognition.start();
    isListening = true;
    updateVoiceButton();
}
function stopVoiceRecognition() {
    if (!voiceRecognition) return;
    voiceRecognition.stop();
    isListening = false;
    updateVoiceButton();
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
async function initMLModel() {
    try {
        const recognizer = speechCommands.create('BROWSER_FFT');
        await recognizer.ensureModelLoaded();
        speechModel = recognizer;
        document.getElementById('voice-status-text').textContent = 'ML модель завантажена';
        return true;
    } catch (error) {
        console.error('❌ Помилка завантаження ML моделі:', error);
        return false;
    }
}
function toggleMLMode() {
    useMLModel = !useMLModel;
    document.getElementById('ml-mode-text').textContent = useMLModel ? 'ML: Увімк' : 'ML: Вимк';
    if (useMLModel && !speechModel) initMLModel();
}
const defaultDevices = {
    'marker-0-0-0': { name: 'Розумний хаб', type: 'Центральний контролер', description: 'Основний хаб для керування всіма IoT пристроями в квартирі', position: {x: -34.7, y: 6.6, z: -16.90}, mlFeatures: ['Центральна обробка ML моделей', 'Координація Edge пристроїв'] }
};
const edgeMLTypes = {
    vision: { name: 'Камера з Computer Vision', color: '#ff6b6b', mlModels: ['MobileNet', 'TinyYOLO', 'FaceNet'], features: ['Розпізнавання людей', 'Детекція жестів', 'Ідентифікація об\'єктів'] },
    audio: { name: 'Аудіо процесор', color: '#4ecdc4', mlModels: ['TensorFlow Lite Audio', 'YAMNet'], features: ['Голосові команди', 'Детекція аномальних звуків', 'Розпізнавання мови'] },
    sensor: { name: 'Сенсорний аналізатор', color: '#45b7d1', mlModels: ['LSTM', 'Autoencoder'], features: ['Прогнозування споживання', 'Детекція аномалій', 'Оптимізація'] },
    motion: { name: 'Детектор руху з ML', color: '#96ceb4', mlModels: ['Pose Detection', 'Activity Recognition'], features: ['Розпізнавання активності', 'Детекція падіння', 'Аналіз поведінки'] },
    climate: { name: 'Клімат контролер з ML', color: '#dda0dd', mlModels: ['Time Series Forecasting', 'Regression Models'], features: ['Прогноз температури', 'Оптимізація енергії', 'Адаптивне навчання'] },
    light: { name: 'Розумне світло', color: '#ffeb3b', mlModels: ['Ambient Light Prediction', 'Presence Detection'], features: ['Автоматичне регулювання', 'Адаптивна яскравість', 'Економія енергії'] }
};
deviceData = {...defaultDevices};

// ВИПРАВЛЕНО: Функції для створення стін
function updateWallCreationUI() {
    document.getElementById('start-wall-btn').disabled = isCreatingWall;
    document.getElementById('create-wall-btn').disabled = !isCreatingWall;
    document.getElementById('cancel-wall-btn').disabled = !isCreatingWall;
    document.getElementById('wall-status').textContent = isCreatingWall 
        ? 'Перемістіться до кінцевої точки.' 
        : 'Встановіть початкову точку.';
}

function startWallCreation() {
    const camera = document.getElementById('camera');
    wallStartPoint = camera.object3D.getWorldPosition(new THREE.Vector3());
    isCreatingWall = true;
    updateWallCreationUI();
    console.log('🧱 Початок створення стіни в точці:', wallStartPoint);
}

function cancelWallCreation() {
    wallStartPoint = null;
    isCreatingWall = false;
    updateWallCreationUI();
    console.log('🧱 Створення стіни скасовано.');
}

function createWall() {
    if (!isCreatingWall || !wallStartPoint) return;

    const camera = document.getElementById('camera');
    const endPoint = camera.object3D.getWorldPosition(new THREE.Vector3());

    const wallHeight = 3; 
    const wallDepth = 0.2; // Зробимо трохи товщою для надійності колізії

    const startVec = new THREE.Vector3(wallStartPoint.x, 0, wallStartPoint.z);
    const endVec = new THREE.Vector3(endPoint.x, 0, endPoint.z);

    const length = startVec.distanceTo(endVec);
    if (length < 0.1) { // Не створювати занадто короткі стіни
        console.warn("Стіна занадто коротка, створення скасовано.");
        cancelWallCreation();
        return;
    }
    const center = new THREE.Vector3().addVectors(startVec, endVec).multiplyScalar(0.5);
    
    // ВИПРАВЛЕНО: Правильний розрахунок кута
    const angle = Math.atan2(endVec.x - startVec.x, endVec.z - startVec.z);
    const rotationY = THREE.MathUtils.radToDeg(angle);

    const wallProperties = {
        id: `wall-${wallCounter}`,
        position: { x: center.x, y: wallHeight / 2, z: center.z },
        rotation: { x: 0, y: rotationY, z: 0 },
        width: wallDepth, // Ширина і глибина міняються місцями з поворотом
        height: wallHeight,
        depth: length,
    };

    createWallFromData(wallProperties);
    wallData.push(wallProperties);
    wallCounter++;

    console.log(`🧱 Створено стіну #${wallProperties.id}`);
    cancelWallCreation();
}

function createWallFromData(data) {
    const wall = document.createElement('a-box');
    wall.setAttribute('id', data.id);
    wall.setAttribute('class', 'dynamic-wall');
    wall.setAttribute('position', `${data.position.x} ${data.position.y} ${data.position.z}`);
    wall.setAttribute('rotation', `${data.rotation.x} ${data.rotation.y} ${data.rotation.z}`);
    wall.setAttribute('width', data.width);
    wall.setAttribute('height', data.height);
    wall.setAttribute('depth', data.depth);
    wall.setAttribute('color', '#a0a0a0');
    wall.setAttribute('material', 'color: #BBB; roughness: 0.8');
    wall.setAttribute('shadow', 'cast: true; receive: true');
    
    // ВИПРАВЛЕНО: Явно вказуємо тип тіла для надійності
    wall.setAttribute('static-body', 'shape: box;');

    document.querySelector('a-scene').appendChild(wall);
}

// Функції керування світлом
function createLight() {
    const camera = document.getElementById('camera');
    const pos = camera.object3D.getWorldPosition(new THREE.Vector3());
    const lightId = `light-${lightCounter++}`;
    const lightPosition = {
        x: Math.round(pos.x * 100) / 100,
        y: Math.round(pos.y * 100) / 100 + 5,
        z: Math.round(pos.z * 100) / 100
    };
    const lightEntity = document.createElement('a-entity');
    lightEntity.setAttribute('id', lightId);
    lightEntity.setAttribute('position', `${lightPosition.x} ${lightPosition.y} ${lightPosition.z}`);
    const pointLight = document.createElement('a-light');
    pointLight.setAttribute('type', 'point');
    pointLight.setAttribute('color', '#ffeb3b');
    pointLight.setAttribute('intensity', globalBrightness / 100);
    pointLight.setAttribute('distance', '20');
    pointLight.setAttribute('decay', '2');
    const bulb = document.createElement('a-sphere');
    bulb.setAttribute('radius', '0.3');
    bulb.setAttribute('color', '#ffeb3b');
    bulb.setAttribute('emissive', '#ffeb3b');
    bulb.setAttribute('emissiveIntensity', globalBrightness / 100);
    bulb.setAttribute('opacity', '0.8');
    const text = document.createElement('a-text');
    text.setAttribute('value', `Світло ${lightCounter - 1}`);
    text.setAttribute('position', '0 0.8 0');
    text.setAttribute('width', '3');
    text.setAttribute('align', 'center');
    text.setAttribute('color', '#fff');
    text.setAttribute('font', '../fonts/calibri-msdf.json');
    lightEntity.appendChild(pointLight);
    lightEntity.appendChild(bulb);
    lightEntity.appendChild(text);
    document.querySelector('a-scene').appendChild(lightEntity);
    lightDevices[lightId] = { id: lightId, name: `Світло ${lightCounter - 1}`, position: lightPosition, isOn: true, brightness: globalBrightness, element: lightEntity };
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
    globalBrightness = value;
    document.getElementById('brightness-slider').value = value;
    document.getElementById('brightness-value').textContent = `${value}%`;
    Object.values(lightDevices).forEach(light => {
        light.brightness = value;
        if (light.isOn) updateLightState(light);
    });
    document.getElementById('ambient-light').setAttribute('intensity', 0.3 + (value / 100) * 0.4);
}
function updateLightState(light) {
    const pointLight = light.element.querySelector('a-light');
    const bulb = light.element.querySelector('a-sphere');
    pointLight.setAttribute('intensity', light.isOn ? light.brightness / 100 : '0');
    bulb.setAttribute('emissiveIntensity', light.isOn ? light.brightness / 100 : '0');
    bulb.setAttribute('opacity', light.isOn ? '0.8' : '0.3');
}

// НОВА ФУНКЦІЯ
function setAllLightsColor(color) {
    console.log(`🎨 Зміна кольору всіх джерел світла на: ${color}`);
    Object.values(lightDevices).forEach(light => {
        const pointLight = light.element.querySelector('a-light');
        const bulb = light.element.querySelector('a-sphere');

        if (pointLight) {
            pointLight.setAttribute('color', color);
        }
        if (bulb) {
            bulb.setAttribute('color', color);
            bulb.setAttribute('emissive', color); // Важливо для візуального ефекту "світіння"
        }
        // Опціонально: зберегти колір у стані, якщо потрібно для експорту
        light.color = color;
    });
}

let currentLightDevice = null;
function toggleLightDevice() {
    if (currentLightDevice) {
        currentLightDevice.isOn = !currentLightDevice.isOn;
        updateLightState(currentLightDevice);
        document.getElementById('light-state').textContent = currentLightDevice.isOn ? 'Увімкнено' : 'Вимкнено';
    }
}

// Функції керування висотою, маркерами, інфо-панеллю
function changeHeight(direction) {
    const input = document.getElementById('height-input');
    input.value = Math.max(0, Math.min(50, parseInt(input.value) + direction));
    setHeight();
}
function setHeight() {
    const height = document.getElementById('height-input').value;
    const rig = document.getElementById('rig');
    const currentPos = rig.getAttribute('position');
    rig.setAttribute('position', `${currentPos.x} ${height} ${currentPos.z}`);
    document.getElementById('current-height').textContent = height;
}
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
    const container = document.createElement('a-entity');
    container.setAttribute('id', markerId);
    container.setAttribute('position', `${tempMarkerPosition.x} ${tempMarkerPosition.y} ${tempMarkerPosition.z}`);
    let markerColor = '#00ff88', deviceType = 'IoT Пристрій', mlModels = [], mlFeatures = [];
    if (mlType && edgeMLTypes[mlType]) {
        const mlDevice = edgeMLTypes[mlType];
        markerColor = mlDevice.color;
        deviceType = mlDevice.name;
        mlModels = mlDevice.mlModels;
        mlFeatures = mlDevice.features;
    }
    const marker = document.createElement('a-sphere');
    marker.setAttribute('class', 'iot-marker');
    marker.setAttribute('radius', '0.5');
    marker.setAttribute('color', markerColor);
    marker.setAttribute('event-set__enter', '_event: mouseenter; scale: 1.2 1.2 1.2');
    marker.setAttribute('event-set__leave', '_event: mouseleave; scale: 1 1 1');
    container.appendChild(marker);
    const text = document.createElement('a-text');
    text.setAttribute('value', name);
    text.setAttribute('position', '0 1 0');
    text.setAttribute('width', '4');
    text.setAttribute('align', 'center');
    container.appendChild(text);
    document.querySelector('a-scene').appendChild(container);
    deviceData[markerId] = { name, type: deviceType, description, position: tempMarkerPosition, mlType, mlModels, mlFeatures, isLight: mlType === 'light' };
    marker.addEventListener('click', () => showIotInfo(markerId));
    markerCounter++;
    cancelMarker();
}
function cancelMarker() {
    document.getElementById('marker-form').style.display = 'none';
    document.getElementById('marker-name').value = '';
    document.getElementById('marker-description').value = '';
    tempMarkerPosition = null;
}
function showIotInfo(markerId) {
    const device = deviceData[markerId];
    if (device) {
        document.getElementById('iot-title').textContent = device.name;
        document.getElementById('iot-type').textContent = device.type;
        document.getElementById('iot-description').textContent = device.description;
        document.getElementById('iot-coords').textContent = `X: ${device.position.x.toFixed(1)}, Y: ${device.position.y.toFixed(1)}, Z: ${device.position.z.toFixed(1)}`;
        document.getElementById('iot-ml-models').textContent = (device.mlModels && device.mlModels.length > 0) ? device.mlModels.join(', ') : 'Немає';
        document.getElementById('iot-ml-features').textContent = (device.mlFeatures && device.mlFeatures.length > 0) ? device.mlFeatures.join(', ') : 'Стандартні функції';
        document.getElementById('iot-info-panel').classList.add('active');
    }
}
function closeIotPanel() {
    document.getElementById('iot-info-panel').classList.remove('active');
}

// НОВА ФУНКЦІЯ: Завантаження сцени з об'єкта
function loadSceneFromData(importObject) {
    // Повне очищення сцени перед імпортом
    Object.keys(deviceData).forEach(id => { if (!defaultDevices[id]) document.getElementById(id)?.remove(); });
    Object.keys(lightDevices).forEach(id => document.getElementById(id)?.remove());
    document.querySelectorAll('.dynamic-wall').forEach(wall => wall.remove());

    deviceData = { ...defaultDevices, ...importObject.devices };
    lightDevices = {};
    wallData = [];

    markerCounter = importObject.markerCounter || 1;
    lightCounter = importObject.lightCounter || 1;
    wallCounter = importObject.wallCounter || 1;

    if (importObject.globalBrightness !== undefined) {
        updateBrightness(importObject.globalBrightness);
    }

    // Відновлення об'єктів
    Object.entries(importObject.devices || {}).forEach(([id, data]) => {
        if (!defaultDevices[id]) createMarkerFromData(id, data);
    });
    Object.entries(importObject.lights || {}).forEach(([id, data]) => createLightFromData(id, data));
    (importObject.walls || []).forEach(data => createWallFromData(data));

    // Оновлення масивів даних
    wallData = importObject.walls || [];

    console.log('✅ Сцену завантажено з даних!');
}

// ОНОВЛЕНО: Експорт та Імпорт
function exportData() {
    // Створюємо "чисту" копію даних про світло без посилань на DOM елементи
    const cleanLightDevices = {};
    for (const key in lightDevices) {
        const { element, ...rest } = lightDevices[key]; // Виключаємо 'element'
        cleanLightDevices[key] = rest;
    }

    const exportObject = {
        version: '1.2',
        exportDate: new Date().toISOString(),
        devices: deviceData,
        lights: cleanLightDevices, // Використовуємо чисту копію
        walls: wallData,
        markerCounter,
        lightCounter,
        wallCounter,
        globalBrightness
    };
    
    try {
        const dataStr = JSON.stringify(exportObject, null, 2);
        const dataBlob = new Blob([dataStr], {type: 'application/json'});
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `smart-home-scene-${Date.now()}.json`;
        link.click();
        console.log('✅ Експорт успішний!');
    } catch (error) {
        console.error("❌ Помилка експорту:", error);
        alert("Не вдалося експортувати дані. Перевірте консоль.");
    }
}

function importData(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const importObject = JSON.parse(e.target.result);
            loadSceneFromData(importObject); // Використовуємо нову функцію
            alert('Дані успішно імпортовано!');
        } catch (error) {
            console.error('❌ Помилка імпорту:', error);
            alert('Помилка при імпорті файлу.');
        }
    };
    reader.readAsText(file);
    event.target.value = '';
}

function createLightFromData(lightId, lightData) {
    const lightEntity = document.createElement('a-entity');
    lightEntity.setAttribute('id', lightId);
    lightEntity.setAttribute('position', `${lightData.position.x} ${lightData.position.y} ${lightData.position.z}`);
    const pointLight = document.createElement('a-light');
    pointLight.setAttribute('type', 'point');
    // Встановлюємо колір з даних, або жовтий за замовчуванням
    const color = lightData.color || '#ffeb3b';
    pointLight.setAttribute('color', color);
    pointLight.setAttribute('intensity', lightData.isOn ? lightData.brightness / 100 : 0);
    const bulb = document.createElement('a-sphere');
    bulb.setAttribute('radius', '0.3');
    bulb.setAttribute('color', color);
    bulb.setAttribute('emissive', color);
    const text = document.createElement('a-text');
    text.setAttribute('value', lightData.name);
    text.setAttribute('position', '0 0.8 0');
    text.setAttribute('width', '3');
    text.setAttribute('align', 'center');
    text.setAttribute('color', '#fff');
    text.setAttribute('font', '../fonts/calibri-msdf.json');

    lightEntity.appendChild(pointLight);
    lightEntity.appendChild(bulb);
    lightEntity.appendChild(text);
    document.querySelector('a-scene').appendChild(lightEntity);
    lightDevices[lightId] = { ...lightData, element: lightEntity };
    updateLightState(lightDevices[lightId]);
}

function createMarkerFromData(markerId, device) {
    const container = document.createElement('a-entity');
    container.setAttribute('id', markerId);
    container.setAttribute('position', `${device.position.x} ${device.position.y} ${device.position.z}`);
    const marker = document.createElement('a-sphere');
    marker.setAttribute('class', 'iot-marker');
    marker.setAttribute('radius', '0.5');
    marker.setAttribute('color', (device.mlType && edgeMLTypes[device.mlType]) ? edgeMLTypes[device.mlType].color : '#00ff88');
    marker.addEventListener('click', () => showIotInfo(markerId));
    container.appendChild(marker);
    const text = document.createElement('a-text');
    text.setAttribute('value', device.name);
    text.setAttribute('position', '0 1 0');
    text.setAttribute('width', '4');
    text.setAttribute('align', 'center');
    text.setAttribute('color', '#fff');
    text.setAttribute('font', '../fonts/calibri-msdf.json');
    container.appendChild(text);
    document.querySelector('a-scene').appendChild(container);
}

// Швидкі дії та ініціалізація
function resetPosition() {
    const rig = document.getElementById('rig');
    rig.setAttribute('position', '0 1.6 10'); // Виправлено стартову висоту
}
function toggleMarkers() {
    markersVisible = !markersVisible;
    document.querySelectorAll('.iot-marker, a-text').forEach(m => m.setAttribute('visible', markersVisible));
}
function updatePositionDisplay() {
    const pos = document.getElementById('camera').object3D.getWorldPosition(new THREE.Vector3());
    document.getElementById('pos-x').textContent = pos.x.toFixed(1);
    document.getElementById('pos-y').textContent = pos.y.toFixed(1);
    document.getElementById('pos-z').textContent = pos.z.toFixed(1);
}

// ОНОВЛЕНО: Ініціалізація при завантаженні сторінки
document.addEventListener('DOMContentLoaded', function() {
    console.log('✅ Smart Home XR Tour завантажено');
    setHeight();
    updateWallCreationUI();
    setInterval(updatePositionDisplay, 100);
    
    document.querySelector('#marker-0-0-0 .iot-marker')?.addEventListener('click', () => showIotInfo('marker-0-0-0'));
    
    document.addEventListener('keydown', (e) => {
        const keyMap = { 'q': () => changeHeight(1), 'e': () => changeHeight(-1), 'r': resetPosition, 'm': createMarkerAtCurrentPosition, 'h': toggleMarkers, 'v': toggleVoiceRecognition, 'l': createLight, 'b': toggleAllLights };
        keyMap[e.key.toLowerCase()]?.();
    });
    
    document.querySelector('a-scene').addEventListener('click', () => {
        document.querySelector('a-scene').canvas.requestPointerLock();
    });

    // НОВЕ: Автоматичне завантаження сцени
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
        });
});

// Глобальні функції
Object.assign(window, {
    changeHeight, setHeight, createMarkerAtCurrentPosition, saveMarker, cancelMarker,
    resetPosition, toggleMarkers, showIotInfo, closeIotPanel, exportData, importData,
    toggleVoiceRecognition, toggleMLMode, createLight, toggleAllLights, updateBrightness,
    toggleLightDevice, startWallCreation, createWall, cancelWallCreation, setAllLightsColor
});
