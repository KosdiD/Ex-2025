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
let wallCounter = 1;
let wallData = {};
let isPlacingWall = false;
let wallStartPoint = null;
let wallPreview = null;
let currentLightDevice = null;

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
    'експорт': () => exportMarkers(),
    'експортувати': () => exportMarkers(),
    'зберегти маркери': () => exportMarkers(),
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
    'середня яскравість': () => updateBrightness(50),
    'створити стіну': () => startWallPlacement(),
    'створи стіну': () => startWallPlacement(),
    'додати стіну': () => startWallPlacement(),
    'скасувати стіну': () => cancelWallPlacement(),
};

// Ініціалізація Web Speech API
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

// Обробка голосової команди
function processVoiceCommand(command) {
    console.log('🎯 Обробка команди:', command);
    
    const brightnessMatch = command.match(/яскравість\s*(\d+)/);
    if (brightnessMatch) {
        const brightness = Math.min(100, Math.max(0, parseInt(brightnessMatch[1])));
        updateBrightness(brightness);
        document.getElementById('voice-status-text').textContent = `Яскравість встановлено: ${brightness}%`;
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
    console.log('❓ Невідома команда:', command);
}

// Голосове керування
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
    console.log('🎤 Початок розпізнавання мови');
}

function stopVoiceRecognition() {
    if (!voiceRecognition) return;
    
    voiceRecognition.stop();
    isListening = false;
    updateVoiceButton();
    document.getElementById('voice-transcript').innerHTML = '';
    document.getElementById('voice-status-text').textContent = 'Розпізнавання зупинено';
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

// ML режим
async function initMLModel() {
    try {
        const recognizer = speechCommands.create('BROWSER_FFT');
        await recognizer.ensureModelLoaded();
        
        const words = recognizer.wordLabels();
        console.log('📚 Доступні ML команди:', words);
        
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
    
    if (useMLModel && !speechModel) {
        initMLModel();
    }
    
    console.log('🤖 ML режим:', useMLModel ? 'увімкнено' : 'вимкнено');
}

// IoT пристрої
const defaultDevices = {
    'marker-0-0-0': {
        name: 'Розумний хаб',
        type: 'Центральний контролер',
        description: 'Основний хаб для керування всіма IoT пристроями в квартирі',
        position: {x: 0, y: 0, z: 0},
        mlFeatures: ['Центральна обробка ML моделей', 'Координація Edge пристроїв']
    }
};

const edgeMLTypes = {
    vision: {
        name: 'Камера з Computer Vision',
        color: '#ff6b6b',
        mlModels: ['MobileNet', 'TinyYOLO', 'FaceNet'],
        features: ['Розпізнавання людей', 'Детекція жестів', 'Ідентифікація об\'єктів']
    },
    audio: {
        name: 'Аудіо процесор',
        color: '#4ecdc4',
        mlModels: ['TensorFlow Lite Audio', 'YAMNet'],
        features: ['Голосові команди', 'Детекція аномальних звуків', 'Розпізнавання мови']
    },
    sensor: {
        name: 'Сенсорний аналізатор',
        color: '#45b7d1',
        mlModels: ['LSTM', 'Autoencoder'],
        features: ['Прогнозування споживання', 'Детекція аномалій', 'Оптимізація']
    },
    motion: {
        name: 'Детектор руху з ML',
        color: '#96ceb4',
        mlModels: ['Pose Detection', 'Activity Recognition'],
        features: ['Розпізнавання активності', 'Детекція падіння', 'Аналіз поведінки']
    },
    climate: {
        name: 'Клімат контролер з ML',
        color: '#dda0dd',
        mlModels: ['Time Series Forecasting', 'Regression Models'],
        features: ['Прогноз температури', 'Оптимізація енергії', 'Адаптивне навчання']
    },
    light: {
        name: 'Розумне світло',
        color: '#ffeb3b',
        mlModels: ['Ambient Light Prediction', 'Presence Detection'],
        features: ['Автоматичне регулювання', 'Адаптивна яскравість', 'Економія енергії']
    }
};

deviceData = {...defaultDevices};

// Функції стін
function startWallPlacement() {
    if (isPlacingWall) {
        completeWallPlacement();
    } else {
        isPlacingWall = true;
        const camera = document.getElementById('camera');
        const pos = camera.object3D.getWorldPosition(new THREE.Vector3());
        
        wallStartPoint = {
            x: Math.round(pos.x * 100) / 100,
            z: Math.round(pos.z * 100) / 100
        };
        
        wallPreview = document.createElement('a-box');
        wallPreview.setAttribute('position', `${wallStartPoint.x} 5 ${wallStartPoint.z}`);
        wallPreview.setAttribute('width', '0.2');
        wallPreview.setAttribute('height', '10');
        wallPreview.setAttribute('depth', '0.2');
        wallPreview.setAttribute('material', 'color: #ff9800; opacity: 0.5');
        document.querySelector('a-scene').appendChild(wallPreview);
        
        document.getElementById('wall-status').textContent = 'Клікніть ще раз для завершення стіни';
        console.log('🏗️ Початок створення стіни');
    }
}

function updateWallPreview() {
    if (!isPlacingWall || !wallPreview) return;
    
    const camera = document.getElementById('camera');
    const pos = camera.object3D.getWorldPosition(new THREE.Vector3());
    
    const endX = Math.round(pos.x * 100) / 100;
    const endZ = Math.round(pos.z * 100) / 100;
    
    const centerX = (wallStartPoint.x + endX) / 2;
    const centerZ = (wallStartPoint.z + endZ) / 2;
    const length = Math.sqrt(
        Math.pow(endX - wallStartPoint.x, 2) + 
        Math.pow(endZ - wallStartPoint.z, 2)
    );
    
    if (length > 0.5) {
        const angle = Math.atan2(endZ - wallStartPoint.z, endX - wallStartPoint.x) * 180 / Math.PI;
        
        wallPreview.setAttribute('position', `${centerX} 5 ${centerZ}`);
        wallPreview.setAttribute('width', `${length}`);
        wallPreview.setAttribute('rotation', `0 ${-angle} 0`);
    }
}

function completeWallPlacement() {
    if (!isPlacingWall || !wallPreview) return;
    
    const camera = document.getElementById('camera');
    const pos = camera.object3D.getWorldPosition(new THREE.Vector3());
    
    const endX = Math.round(pos.x * 100) / 100;
    const endZ = Math.round(pos.z * 100) / 100;
    
    const centerX = (wallStartPoint.x + endX) / 2;
    const centerZ = (wallStartPoint.z + endZ) / 2;
    const length = Math.sqrt(
        Math.pow(endX - wallStartPoint.x, 2) + 
        Math.pow(endZ - wallStartPoint.z, 2)
    );
    
    if (length > 0.5) {
        const angle = Math.atan2(endZ - wallStartPoint.z, endX - wallStartPoint.x) * 180 / Math.PI;
        
        createWall({
            position: { x: centerX, y: 5, z: centerZ },
            width: length,
            height: 10,
            rotation: -angle,
            startPoint: wallStartPoint,
            endPoint: { x: endX, z: endZ }
        });
    }
    
    if (wallPreview) {
        wallPreview.remove();
        wallPreview = null;
    }
    
    isPlacingWall = false;
    wallStartPoint = null;
    document.getElementById('wall-status').textContent = '';
    updateStats();
}

function cancelWallPlacement() {
    if (wallPreview) {
        wallPreview.remove();
        wallPreview = null;
    }
    isPlacingWall = false;
    wallStartPoint = null;
    document.getElementById('wall-status').textContent = '';
}

function createWall(params) {
    const wallId = `wall-${wallCounter++}`;
    
    const wall = document.createElement('a-box');
    wall.setAttribute('id', wallId);
    wall.setAttribute('position', `${params.position.x} ${params.position.y} ${params.position.z}`);
    wall.setAttribute('width', params.width);
    wall.setAttribute('height', params.height);
    wall.setAttribute('depth', '0.3');
    wall.setAttribute('rotation', `0 ${params.rotation} 0`);
    wall.setAttribute('material', 'color: #8B4513; opacity: 0.8');
    wall.setAttribute('static-body', '');
    wall.setAttribute('class', 'collision-wall');
    
    document.querySelector('a-scene').appendChild(wall);
    
    wallData[wallId] = {
        id: wallId,
        position: params.position,
        width: params.width,
        height: params.height,
        rotation: params.rotation,
        startPoint: params.startPoint,
        endPoint: params.endPoint
    };
    
    console.log(`🧱 Створено стіну ${wallId}`);
}

function createWallFromData(wallData) {
    const wall = document.createElement('a-box');
    wall.setAttribute('id', wallData.id);
    wall.setAttribute('position', `${wallData.position.x} ${wallData.position.y} ${wallData.position.z}`);
    wall.setAttribute('width', wallData.width);
    wall.setAttribute('height', wallData.height);
    wall.setAttribute('depth', '0.3');
    wall.setAttribute('rotation', `0 ${wallData.rotation} 0`);
    wall.setAttribute('material', 'color: #8B4513; opacity: 0.8');
    wall.setAttribute('static-body', '');
    wall.setAttribute('class', 'collision-wall');
    
    document.querySelector('a-scene').appendChild(wall);
}

function toggleWallVisibility() {
    const walls = document.querySelectorAll('.collision-wall');
    walls.forEach(wall => {
        const opacity = wall.getAttribute('material').opacity;
        wall.setAttribute('material', `opacity: ${opacity === '0.8' ? '0.2' : '0.8'}`);
    });
}

// Функції світла
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
    
    lightEntity.appendChild(pointLight);
    lightEntity.appendChild(bulb);
    lightEntity.appendChild(text);
    
    document.querySelector('a-scene').appendChild(lightEntity);
    
    lightDevices[lightId] = {
        id: lightId,
        name: `Світло ${lightCounter - 1}`,
        position: lightPosition,
        isOn: true,
        brightness: globalBrightness,
        element: lightEntity
    };
    
    updateStats();
    console.log(`💡 Створено світло на позиції:`, lightPosition);
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
    
    console.log(`💡 Всі світла ${state ? 'увімкнено' : 'вимкнено'}`);
}

function updateBrightness(value) {
    globalBrightness = value;
    document.getElementById('brightness-slider').value = value;
    document.getElementById('brightness-value').textContent = `${value}%`;
    
    Object.values(lightDevices).forEach(light => {
        light.brightness = value;
        if (light.isOn) {
            updateLightState(light);
        }
    });
    
    const ambientLight = document.getElementById('ambient-light');
    ambientLight.setAttribute('intensity', 0.3 + (value / 100) * 0.4);
}

function updateLightState(light) {
    const pointLight = light.element.querySelector('a-light');
    const bulb = light.element.querySelector('a-sphere');
    
    if (light.isOn) {
        pointLight.setAttribute('intensity', light.brightness / 100);
        bulb.setAttribute('emissiveIntensity', light.brightness / 100);
        bulb.setAttribute('opacity', '0.8');
    } else {
        pointLight.setAttribute('intensity', '0');
        bulb.setAttribute('emissiveIntensity', '0');
        bulb.setAttribute('opacity', '0.3');
    }
}

function toggleLightDevice() {
    if (currentLightDevice) {
        currentLightDevice.isOn = !currentLightDevice.isOn;
        updateLightState(currentLightDevice);
        document.getElementById('light-state').textContent = currentLightDevice.isOn ? 'Увімкнено' : 'Вимкнено';
    }
}

function createLightFromData(lightId, lightData) {
    const lightEntity = document.createElement('a-entity');
    lightEntity.setAttribute('id', lightId);
    lightEntity.setAttribute('position', `${lightData.position.x} ${lightData.position.y} ${lightData.position.z}`);
    
    const pointLight = document.createElement('a-light');
    pointLight.setAttribute('type', 'point');
    pointLight.setAttribute('color', '#ffeb3b');
    pointLight.setAttribute('intensity', lightData.isOn ? lightData.brightness / 100 : 0);
    pointLight.setAttribute('distance', '20');
    pointLight.setAttribute('decay', '2');
    
    const bulb = document.createElement('a-sphere');
    bulb.setAttribute('radius', '0.3');
    bulb.setAttribute('color', '#ffeb3b');
    bulb.setAttribute('emissive', '#ffeb3b');
    bulb.setAttribute('emissiveIntensity', lightData.isOn ? lightData.brightness / 100 : 0);
    bulb.setAttribute('opacity', lightData.isOn ? '0.8' : '0.3');
    
    const text = document.createElement('a-text');
    text.setAttribute('value', lightData.name);
    text.setAttribute('position', '0 0.8 0');
    text.setAttribute('width', '3');
    text.setAttribute('align', 'center');
    text.setAttribute('color', '#fff');
    
    lightEntity.appendChild(pointLight);
    lightEntity.appendChild(bulb);
    lightEntity.appendChild(text);
    
    document.querySelector('a-scene').appendChild(lightEntity);
    
    lightDevices[lightId] = {
        ...lightData,
        element: lightEntity
    };
}

// Функції маркерів
function changeHeight(direction) {
    const input = document.getElementById('height-input');
    const currentValue = parseInt(input.value);
    const newValue = Math.max(0, Math.min(50, currentValue + direction));
    input.value = newValue;
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
    const pos = camera.object3D.getWorldPosition(new THREE.Vector3());
    
    tempMarkerPosition = {
        x: Math.round(pos.x * 100) / 100,
        y: Math.round(pos.y * 100) / 100,
        z: Math.round(pos.z * 100) / 100
    };
    
    document.getElementById('marker-form').style.display = 'block';
    console.log(`📍 Створення маркера на позиції: x=${tempMarkerPosition.x}, y=${tempMarkerPosition.y}, z=${tempMarkerPosition.z}`);
}

function saveMarker() {
    const name = document.getElementById('marker-name').value || `IoT Пристрій ${markerCounter}`;
    const description = document.getElementById('marker-description').value || 'Розумний пристрій';
    const mlType = document.getElementById('ml-device-type').value;
    
    const markerId = `marker-${markerCounter}`;
    const container = document.createElement('a-entity');
    container.setAttribute('id', markerId);
    container.setAttribute('position', `${tempMarkerPosition.x} ${tempMarkerPosition.y} ${tempMarkerPosition.z}`);
    
    let markerColor = '#00ff88';
    let deviceType = 'IoT Пристрій';
    let mlModels = [];
    let mlFeatures = [];
    
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
    marker.setAttribute('opacity', '0.7');
    marker.setAttribute('event-set__enter', '_event: mouseenter; scale: 1.2 1.2 1.2; opacity: 0.9');
    marker.setAttribute('event-set__leave', '_event: mouseleave; scale: 1 1 1; opacity: 0.7');
    marker.setAttribute('animation', 'property: rotation; to: 0 360 0; loop: true; dur: 15000');
    
    if (mlType) {
        marker.setAttribute('animation__pulse', 'property: scale; from: 1 1 1; to: 1.1 1.1 1.1; loop: true; dir: alternate; dur: 2000');
    }
    
    const text = document.createElement('a-text');
    text.setAttribute('value', name);
    text.setAttribute('position', '0 1 0');
    text.setAttribute('width', '4');
    text.setAttribute('align', 'center');
    text.setAttribute('color', '#fff');
    
    if (mlType) {
        const mlIcon = document.createElement('a-text');
        mlIcon.setAttribute('value', '🤖');
        mlIcon.setAttribute('position', '0 1.5 0');
        mlIcon.setAttribute('width', '6');
        mlIcon.setAttribute('align', 'center');
        container.appendChild(mlIcon);
    }
    
    if (mlType === 'light') {
        const lightId = `device-light-${markerCounter}`;
        const pointLight = document.createElement('a-light');
        pointLight.setAttribute('type', 'point');
        pointLight.setAttribute('color', '#ffeb3b');
        pointLight.setAttribute('intensity', '0.5');
        pointLight.setAttribute('distance', '15');
        pointLight.setAttribute('decay', '2');
        container.appendChild(pointLight);
        
        lightDevices[lightId] = {
            id: lightId,
            name: name,
            position: tempMarkerPosition,
            isOn: true,
            brightness: 50,
            element: container,
            isMarker: true
        };
    }
    
    container.appendChild(marker);
    container.appendChild(text);
    document.querySelector('a-scene').appendChild(container);
    
    deviceData[markerId] = {
        name: name,
        type: deviceType,
        description: description,
        position: tempMarkerPosition,
        mlType: mlType,
        mlModels: mlModels,
        mlFeatures: mlFeatures,
        isLight: mlType === 'light'
    };
    
    marker.addEventListener('click', function() {
        showIotInfo(markerId);
    });
    
    markerCounter++;
    cancelMarker();
    updateStats();
    
    console.log(`✅ ${mlType ? 'ML ' : ''}Маркер "${name}" створено на позиції:`, tempMarkerPosition);
}

function cancelMarker() {
    document.getElementById('marker-form').style.display = 'none';
    document.getElementById('marker-name').value = '';
    document.getElementById('marker-description').value = '';
    document.getElementById('ml-device-type').value = '';
    tempMarkerPosition = null;
}

function createMarkerFromData(markerId, device) {
    const container = document.createElement('a-entity');
    container.setAttribute('id', markerId);
    container.setAttribute('position', `${device.position.x} ${device.position.y} ${device.position.z}`);
    
    let markerColor = '#00ff88';
    if (device.mlType && edgeMLTypes[device.mlType]) {
        markerColor = edgeMLTypes[device.mlType].color;
    }
    
    const marker = document.createElement('a-sphere');
    marker.setAttribute('class', 'iot-marker');
    marker.setAttribute('radius', '0.5');
    marker.setAttribute('color', markerColor);
    marker.setAttribute('opacity', '0.7');
    marker.setAttribute('event-set__enter', '_event: mouseenter; scale: 1.2 1.2 1.2; opacity: 0.9');
    marker.setAttribute('event-set__leave', '_event: mouseleave; scale: 1 1 1; opacity: 0.7');
    marker.setAttribute('animation', 'property: rotation; to: 0 360 0; loop: true; dur: 15000');
    
    if (device.mlType) {
        marker.setAttribute('animation__pulse', 'property: scale; from: 1 1 1; to: 1.1 1.1 1.1; loop: true; dir: alternate; dur: 2000');
    }
    
    const text = document.createElement('a-text');
    text.setAttribute('value', device.name);
    text.setAttribute('position', '0 1 0');
    text.setAttribute('width', '4');
    text.setAttribute('align', 'center');
    text.setAttribute('color', '#fff');
    
    if (device.mlType) {
        const mlIcon = document.createElement('a-text');
        mlIcon.setAttribute('value', '🤖');
        mlIcon.setAttribute('position', '0 1.5 0');
        mlIcon.setAttribute('width', '6');
        mlIcon.setAttribute('align', 'center');
        container.appendChild(mlIcon);
    }
    
    if (device.mlType === 'light') {
        const lightId = `device-light-${markerId.split('-')[1]}`;
        const pointLight = document.createElement('a-light');
        pointLight.setAttribute('type', 'point');
        pointLight.setAttribute('color', '#ffeb3b');
        pointLight.setAttribute('intensity', '0.5');
        pointLight.setAttribute('distance', '15');
        pointLight.setAttribute('decay', '2');
        container.appendChild(pointLight);
        
        const existingLight = Object.values(lightDevices).find(l => l.name === device.name && l.isMarker);
        if (!existingLight) {
            lightDevices[lightId] = {
                id: lightId,
                name: device.name,
                position: device.position,
                isOn: true,
                brightness: 50,
                element: container,
                isMarker: true
            };
        }
    }
    
    container.appendChild(marker);
    container.appendChild(text);
    document.querySelector('a-scene').appendChild(container);
    
    marker.addEventListener('click', function() {
        showIotInfo(markerId);
    });
}

// UI функції
function showIotInfo(markerId) {
    const device = deviceData[markerId];
    if (device) {
        document.getElementById('iot-title').textContent = device.name;
        document.getElementById('iot-type').textContent = device.type;
        document.getElementById('iot-description').textContent = device.description;
        document.getElementById('iot-coords').textContent = `X: ${device.position.x}, Y: ${device.position.y}, Z: ${device.position.z}`);
        
        if (device.mlModels && device.mlModels.length > 0) {
            document.getElementById('iot-ml-models').textContent = device.mlModels.join(', ');
            document.getElementById('iot-ml-features').textContent = device.mlFeatures.join(', ');
        } else {
            document.getElementById('iot-ml-models').textContent = 'Немає';
            document.getElementById('iot-ml-features').textContent = 'Стандартні функції';
        }
        
        if (device.isLight) {
            document.getElementById('light-controls').style.display = 'block';
            const lightDevice = Object.values(lightDevices).find(l => l.name === device.name);
            if (lightDevice) {
                currentLightDevice = lightDevice;
                document.getElementById('light-state').textContent = lightDevice.isOn ? 'Увімкнено' : 'Вимкнено';
                document.getElementById('light-brightness').textContent = `${lightDevice.brightness}%`;
            }
        } else {
            document.getElementById('light-controls').style.display = 'none';
            currentLightDevice = null;
        }
        
        document.getElementById('iot-info-panel').classList.add('active');
    }
}

function closeIotPanel() {
    document.getElementById('iot-info-panel').classList.remove('active');
    currentLightDevice = null;
}

function resetPosition() {
    document.getElementById('rig').setAttribute('position', '0 10 20');
    document.getElementById('height-input').value = 10;
    document.getElementById('current-height').textContent = 10;
}

function toggleMarkers() {
    markersVisible = !markersVisible;
    const markers = document.querySelectorAll('.iot-marker');
    markers.forEach(marker => {
        marker.setAttribute('visible', markersVisible);
    });
}

function updatePositionDisplay() {
    const camera = document.getElementById('camera');
    const pos = camera.object3D.getWorldPosition(new THREE.Vector3());
    document.getElementById('pos-x').textContent = pos.x.toFixed(1);
    document.getElementById('pos-y').textContent = pos.y.toFixed(1);
    document.getElementById('pos-z').textContent = pos.z.toFixed(1);
}

function updateStats() {
    const deviceCount = Object.keys(deviceData).length - Object.keys(defaultDevices).length;
    const lightCount = Object.keys(lightDevices).length;
    const wallCount = Object.keys(wallData).length;
    
    const deviceElement = document.getElementById('device-count');
    const lightElement = document.getElementById('light-count');
    const wallElement = document.getElementById('wall-count');
    
    if (deviceElement) deviceElement.textContent = deviceCount;
    if (lightElement) lightElement.textContent = lightCount;
    if (wallElement) wallElement.textContent = wallCount;
}

function showNotification(message, type = 'info') {
    const oldNotification = document.getElementById('notification');
    if (oldNotification) {
        oldNotification.remove();
    }
    
    const notification = document.createElement('div');
    notification.id = 'notification';
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);
    
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Експорт/Імпорт
function exportMarkers() {
    const cleanDeviceData = {};
    Object.entries(deviceData).forEach(([id, device]) => {
        cleanDeviceData[id] = {
            name: device.name,
            type: device.type,
            description: device.description,
            position: device.position,
            mlType: device.mlType,
            mlModels: device.mlModels,
            mlFeatures: device.mlFeatures,
            isLight: device.isLight
        };
    });
    
    const cleanLightDevices = {};
    Object.entries(lightDevices).forEach(([id, light]) => {
        cleanLightDevices[id] = {
            id: light.id,
            name: light.name,
            position: light.position,
            isOn: light.isOn,
            brightness: light.brightness,
            isMarker: light.isMarker
        };
    });
    
    const cleanWallData = {};
    Object.entries(wallData).forEach(([id, wall]) => {
        cleanWallData[id] = {
            id: wall.id,
            position: wall.position,
            width: wall.width,
            height: wall.height,
            rotation: wall.rotation,
            startPoint: wall.startPoint,
            endPoint: wall.endPoint
        };
    });
    
    const exportData = {
        version: '1.1',
        exportDate: new Date().toISOString(),
        devices: cleanDeviceData,
        lights: cleanLightDevices,
        walls: cleanWallData,
        markerCounter: markerCounter,
        lightCounter: lightCounter,
        wallCounter: wallCounter,
        globalBrightness: globalBrightness
    };
    
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], {type: 'application/json'});
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `smart-home-xr-data-${Date.now()}.json`;
    link.click();
    
    setTimeout(() => URL.revokeObjectURL(link.href), 100);
    
    console.log('✅ Експортовано:', 
        Object.keys(deviceData).length, 'маркерів,',
        Object.keys(lightDevices).length, 'світлових пристроїв,',
        Object.keys(wallData).length, 'стін');
    
    showNotification('Дані успішно експортовано!', 'success');
}

function importMarkers(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const importData = JSON.parse(e.target.result);
            
            if (!importData.version) {
                throw new Error('Невірний формат файлу');
            }
            
            if (!confirm('Це видалить всі поточні маркери, світла та стіни. Продовжити?')) {
                event.target.value = '';
                return;
            }
            
            // Видалення існуючих елементів
            Object.keys(deviceData).forEach(markerId => {
                if (!defaultDevices[markerId]) {
                    const element = document.getElementById(markerId);
                    if (element) element.remove();
                }
            });
            
            Object.values(lightDevices).forEach(light => {
                if (light.element) {
                    light.element.remove();
                }
            });
            
            Object.keys(wallData).forEach(wallId => {
                const element = document.getElementById(wallId);
                if (element) element.remove();
            });
            
            // Очищення даних
            deviceData = {...defaultDevices};
            lightDevices = {};
            wallData = {};
            
            // Завантаження нових даних
            markerCounter = importData.markerCounter || 1;
            lightCounter = importData.lightCounter || 1;
            wallCounter = importData.wallCounter || 1;
            
            if (importData.globalBrightness !== undefined) {
                updateBrightness(importData.globalBrightness);
            }
            
            // Завантаження пристроїв
            if (importData.devices) {
                Object.entries(importData.devices).forEach(([markerId, device]) => {
                    if (!defaultDevices[markerId]) {
                        deviceData[markerId] = device;
                        createMarkerFromData(markerId, device);
                    }
                });
            }
            
            // Завантаження світла
            if (importData.lights) {
                Object.entries(importData.lights).forEach(([lightId, lightData]) => {
                    if (!lightData.isMarker) {
                        createLightFromData(lightId, lightData);
                    }
                });
            }
            
            // Завантаження стін
            if (importData.walls) {
                Object.entries(importData.walls).forEach(([wallId, wallDat]) => {
                    wallData[wallId] = wallDat;
                    createWallFromData(wallDat);
                });
            }
            
            updateStats();
            
            const summary = `✅ Імпортовано:\n` +
                `- ${Object.keys(deviceData).length - Object.keys(defaultDevices).length} маркерів\n` +
                `- ${Object.keys(lightDevices).length} світлових пристроїв\n` +
                `- ${Object.keys(wallData).length} стін`;
            
            console.log(summary);
            showNotification('Дані успішно імпортовано!', 'success');
            
        } catch (error) {
            console.error('❌ Помилка імпорту:', error);
            showNotification('Помилка при імпорті файлу: ' + error.message, 'error');
        }
    };
    
    reader.onerror = function() {
        showNotification('Помилка читання файлу', 'error');
    };
    
    reader.readAsText(file);
    event.target.value = '';
}

function exportWallsOnly() {
    const cleanWallData = {};
    Object.entries(wallData).forEach(([id, wall]) => {
        cleanWallData[id] = {
            id: wall.id,
            position: wall.position,
            width: wall.width,
            height: wall.height,
            rotation: wall.rotation,
            startPoint: wall.startPoint,
            endPoint: wall.endPoint
        };
    });
    
    const exportData = {
        version: '1.1',
        type: 'walls-only',
        exportDate: new Date().toISOString(),
        walls: cleanWallData,
        wallCounter: wallCounter
    };
    
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], {type: 'application/json'});
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `smart-home-walls-${Date.now()}.json`;
    link.click();
    
    console.log('✅ Експортовано', Object.keys(wallData).length, 'стін');
    showNotification(`Експортовано ${Object.keys(wallData).length} стін`, 'success');
}

// Ініціалізація
document.addEventListener('DOMContentLoaded', function() {
    console.log('✅ Smart Home XR Tour завантажено');
    setHeight();
    
    setInterval(updatePositionDisplay, 100);
    setInterval(updateStats, 1000);
    
    setInterval(() => {
        if (isPlacingWall) {
            updateWallPreview();
        }
    }, 50);
    
    const initialMarker = document.querySelector('#marker-0-0-0 .iot-marker');
    if (initialMarker) {
        initialMarker.addEventListener('click', function() {
            showIotInfo('marker-0-0-0');
        });
    }
    
    document.addEventListener('keydown', (e) => {
        switch(e.key.toLowerCase()) {
            case 'q':
                changeHeight(1);
                break;
            case 'e':
                changeHeight(-1);
                break;
            case 'r':
                resetPosition();
                break;
            case 'm':
                createMarkerAtCurrentPosition();
                break;
            case 'h':
                toggleMarkers();
                break;
            case 'v':
                toggleVoiceRecognition();
                break;
            case 'l':
                createLight();
                break;
            case 'b':
                toggleAllLights();
                break;
            case 'w':
                if (e.shiftKey) {
                    startWallPlacement();
                }
                break;
            case 'escape':
                cancelWallPlacement();
                break;
            case 't':
                toggleWallVisibility();
                break;
        }
    });
    
    document.addEventListener('click', () => {
        const canvas = document.querySelector('a-scene canvas');
        if (canvas && !document.pointerLockElement) {
            canvas.requestPointerLock();
        }
    });
});

// Глобальні функції
window.changeHeight = changeHeight;
window.setHeight = setHeight;
window.createMarkerAtCurrentPosition = createMarkerAtCurrentPosition;
window.saveMarker = saveMarker;
window.cancelMarker = cancelMarker;
window.resetPosition = resetPosition;
window.toggleMarkers = toggleMarkers;
window.showIotInfo = showIotInfo;
window.closeIotPanel = closeIotPanel;
window.exportMarkers = exportMarkers;
window.importMarkers = importMarkers;
window.toggleVoiceRecognition = toggleVoiceRecognition;
window.toggleMLMode = toggleMLMode;
window.createLight = createLight;
window.toggleAllLights = toggleAllLights;
window.updateBrightness = updateBrightness;
window.toggleLightDevice = toggleLightDevice;
window.startWallPlacement = startWallPlacement;
window.toggleWallVisibility = toggleWallVisibility;
window.exportWallsOnly = exportWallsOnly;
window.showNotification = showNotification;
