// Глобальні змінні
let markersVisible = true;
let tempMarkerPosition = null;
let markerCounter = 1;
let deviceData = {};
let voiceRecognition = null;
let isListening = false;
let useMLModel = false;
let speechModel = null;
let currentTimeMinutes = 720; // 12:00
let lightingSystem = {
    autoMode: true,
    roomLights: {
        'room-light-1': { on: false, intensity: 1, color: '#ffd700' },
        'room-light-2': { on: false, intensity: 1, color: '#ffd700' },
        'room-light-3': { on: false, intensity: 1, color: '#ffd700' },
        'room-light-4': { on: false, intensity: 1, color: '#ffd700' }
    },
    customLights: {},
    zones: {},
    blindsOpen: true
};
let lightCounter = 5;
let zoneCounter = 1;

// Параметри освітлення для різного часу доби
const lightingPresets = {
    night: { // 0:00 - 5:00
        ambient: 0.1,
        sun: 0,
        skyColor: '#0a0a2e',
        fogColor: '#0a0a2e',
        roomLights: 0.8,
        lightColor: '#ff9f40',
        mode: 'Нічний'
    },
    dawn: { // 5:00 - 7:00
        ambient: 0.3,
        sun: 0.3,
        skyColor: '#ff6b6b',
        fogColor: '#ff6b6b',
        roomLights: 0.5,
        lightColor: '#ffd93d',
        mode: 'Світанок'
    },
    morning: { // 7:00 - 10:00
        ambient: 0.5,
        sun: 0.6,
        skyColor: '#87ceeb',
        fogColor: '#87ceeb',
        roomLights: 0.2,
        lightColor: '#ffffff',
        mode: 'Ранок'
    },
    day: { // 10:00 - 17:00
        ambient: 0.6,
        sun: 1.0,
        skyColor: '#87ceeb',
        fogColor: '#87ceeb',
        roomLights: 0,
        lightColor: '#ffffff',
        mode: 'День'
    },
    evening: { // 17:00 - 20:00
        ambient: 0.4,
        sun: 0.5,
        skyColor: '#ff7f50',
        fogColor: '#ff7f50',
        roomLights: 0.6,
        lightColor: '#ffb347',
        mode: 'Вечір'
    },
    dusk: { // 20:00 - 22:00
        ambient: 0.2,
        sun: 0.1,
        skyColor: '#4b0082',
        fogColor: '#4b0082',
        roomLights: 0.9,
        lightColor: '#ffa500',
        mode: 'Сутінки'
    },
    lateNight: { // 22:00 - 24:00
        ambient: 0.15,
        sun: 0,
        skyColor: '#191970',
        fogColor: '#191970',
        roomLights: 1.0,
        lightColor: '#ff8c00',
        mode: 'Пізня ніч'
    }
};

// Зареєструйте шрифти при завантаженні сцени
AFRAME.registerComponent('setup-fonts', {
    init: function() {
        // Шлях до вашої папки зі шрифтами
        const fontPath = 'fonts/';
        
        // Реєстрація шрифтів
        AFRAME.assets.loadAsset({
            src: `${fontPath}arial-msdf.json`,
            id: 'arialFont'
        });
        
        AFRAME.assets.loadAsset({
            src: `${fontPath}calibri-msdf.json`,
            id: 'calibriFont'
        });
    }
});

// Додайте компонент до сцени
document.querySelector('a-scene').setAttribute('setup-fonts', '');

// Функція оновлення часу доби
function updateTimeOfDay(minutes) {
    currentTimeMinutes = parseInt(minutes);
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    // Оновлюємо відображення часу
    document.getElementById('time-display').textContent = 
        `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
    
    // Визначаємо пресет освітлення
    let preset;
    if (hours >= 0 && hours < 5) preset = lightingPresets.night;
    else if (hours >= 5 && hours < 7) preset = lightingPresets.dawn;
    else if (hours >= 7 && hours < 10) preset = lightingPresets.morning;
    else if (hours >= 10 && hours < 17) preset = lightingPresets.day;
    else if (hours >= 17 && hours < 20) preset = lightingPresets.evening;
    else if (hours >= 20 && hours < 22) preset = lightingPresets.dusk;
    else preset = lightingPresets.lateNight;
    
    // Застосовуємо освітлення
    applyLighting(preset);
    
    // Оновлюємо позицію сонця
    updateSunPosition(hours);
}

// Застосування параметрів освітлення
function applyLighting(preset) {
    // Ambient світло
    const ambientLight = document.getElementById('ambient-light');
    ambientLight.setAttribute('intensity', preset.ambient);
    ambientLight.setAttribute('color', preset.lightColor);
    
    // Сонячне світло
    const sunLight = document.getElementById('sun-light');
    sunLight.setAttribute('intensity', preset.sun);
    sunLight.setAttribute('color', preset.lightColor);
    
    // Небо та туман
    const sky = document.getElementById('sky');
    sky.setAttribute('color', preset.skyColor);
    
    const scene = document.getElementById('main-scene');
    scene.setAttribute('fog', `type: linear; color: ${preset.fogColor}; near: 10; far: 100`);
    
    // Кімнатні світла
    if (lightingSystem.autoMode) {
        Object.keys(lightingSystem.roomLights).forEach(lightId => {
            const light = document.getElementById(lightId);
            light.setAttribute('intensity', preset.roomLights);
            light.setAttribute('color', preset.lightColor);
        });
    }
    
    // Оновлюємо інформацію
    document.getElementById('light-intensity').textContent = 
        Math.round(preset.roomLights * 100) + '%';
    document.getElementById('light-color').textContent = preset.lightColor;
    document.getElementById('light-mode').textContent = preset.mode;
    
    // Оновлюємо індикатор
    const indicator = document.getElementById('light-indicator');
    indicator.style.background = preset.lightColor;
    indicator.style.boxShadow = `0 0 ${preset.roomLights * 20}px ${preset.lightColor}`;
}

// Оновлення позиції сонця
function updateSunPosition(hours) {
    const sunLight = document.getElementById('sun-light');
    const angle = (hours / 24) * Math.PI * 2 - Math.PI / 2;
    const distance = 40;
    
    const x = Math.cos(angle) * distance;
    const y = Math.sin(angle) * distance + 20;
    const z = 20;
    
    sunLight.setAttribute('position', `${x} ${Math.max(5, y)} ${z}`);
}

// Встановлення пресету часу
function setTimePreset(minutes) {
    document.getElementById('time-slider').value = minutes;
    updateTimeOfDay(minutes);
}

// Створення світла в поточній позиції
function createLightAtCurrentPosition() {
    const camera = document.getElementById('camera');
    const pos = camera.object3D.getWorldPosition(new THREE.Vector3());
    
    const lightId = `custom-light-${lightCounter}`;
    const lightPos = `${pos.x} ${pos.y + 2} ${pos.z}`;
    
    // Створюємо світло
    const light = document.createElement('a-light');
    light.setAttribute('id', lightId);
    light.setAttribute('type', 'point');
    light.setAttribute('position', lightPos);
    light.setAttribute('intensity', '0.8');
    light.setAttribute('color', '#ffd700');
    light.setAttribute('distance', '15');
    light.setAttribute('decay', '2');
    
    document.getElementById('room-lights').appendChild(light);
    
    // Створюємо маркер для світла
    createLightMarker(lightPos, lightCounter);
    
    // Додаємо до системи освітлення
    lightingSystem.customLights[lightId] = {
        on: true,
        intensity: 0.8,
        color: '#ffd700'
    };
    
    lightCounter++;
    console.log(`💡 Створено нове світло на позиції: ${lightPos}`);
}

// Створення зони з автоматичним освітленням
function createZoneAtCurrentPosition() {
    const camera = document.getElementById('camera');
    const pos = camera.object3D.getWorldPosition(new THREE.Vector3());
    
    const zoneId = `zone-${zoneCounter}`;
    const zonePos = `${pos.x} ${pos.y} ${pos.z}`;
    
    // Створюємо візуалізацію зони
    const zone = document.createElement('a-entity');
    zone.setAttribute('id', zoneId);
    zone.setAttribute('position', zonePos);
    
    // Підлога зони
    const floor = document.createElement('a-cylinder');
    floor.setAttribute('radius', '3');
    floor.setAttribute('height', '0.1');
    floor.setAttribute('color', '#00ff88');
    floor.setAttribute('opacity', '0.3');
    floor.setAttribute('position', '0 0 0');
    
    // Межі зони (невидимий циліндр для детекції)
    const detector = document.createElement('a-cylinder');
    detector.setAttribute('radius', '3');
    detector.setAttribute('height', '10');
    detector.setAttribute('opacity', '0');
    detector.setAttribute('position', '0 5 0');
    detector.setAttribute('class', 'zone-detector');
    
    // Текст зони
    const text = document.createElement('a-text');
    text.setAttribute('value', 'Зона ' + zoneCounter);
    text.setAttribute('position', '0 0.5 0');
    text.setAttribute('align', 'center');
    text.setAttribute('color', '#fff');
    text.setAttribute('font', 'arialFont');
    
    zone.appendChild(floor);
    zone.appendChild(detector);
    zone.appendChild(text);
    document.querySelector('a-scene').appendChild(zone);
    
    // Додаємо зону до системи
    lightingSystem.zones[zoneId] = {
        position: {x: pos.x, y: pos.y, z: pos.z},
        radius: 3,
        lights: [`zone-light-${zoneCounter}`],
        active: false,
        enabled: true
    };
    
    // Створюємо світло для зони
    const zoneLight = document.createElement('a-light');
    zoneLight.setAttribute('id', `zone-light-${zoneCounter}`);
    zoneLight.setAttribute('type', 'point');
    zoneLight.setAttribute('position', `${pos.x} ${pos.y + 5} ${pos.z}`);
    zoneLight.setAttribute('intensity', '0');
    zoneLight.setAttribute('color', '#ffffff');
    zoneLight.setAttribute('distance', '10');
    
    document.getElementById('room-lights').appendChild(zoneLight);
    
    zoneCounter++;
    console.log(`🚶 Створено автоматичну зону на позиції: ${zonePos}`);
}

// Перевірка позиції гравця в зонах
function checkPlayerInZones() {
    const camera = document.getElementById('camera');
    const playerPos = camera.object3D.getWorldPosition(new THREE.Vector3());
    
    Object.entries(lightingSystem.zones).forEach(([zoneId, zone]) => {
        if (!zone.enabled) return;
        
        const distance = Math.sqrt(
            Math.pow(playerPos.x - zone.position.x, 2) +
            Math.pow(playerPos.z - zone.position.z, 2)
        );
        
        const inZone = distance <= zone.radius;
        
        if (inZone && !zone.active) {
            // Увійшли в зону
            zone.active = true;
            zone.lights.forEach(lightId => {
                const light = document.getElementById(lightId);
                if (light) {
                    light.setAttribute('intensity', '1');
                    console.log(`💡 Світло в ${zoneId} увімкнено автоматично`);
                }
            });
        } else if (!inZone && zone.active) {
            // Вийшли з зони
            zone.active = false;
            zone.lights.forEach(lightId => {
                const light = document.getElementById(lightId);
                if (light) {
                    light.setAttribute('intensity', '0');
                    console.log(`💡 Світло в ${zoneId} вимкнено автоматично`);
                }
            });
        }
    });
}

// Керування ролетами
function toggleBlinds() {
    lightingSystem.blindsOpen = !lightingSystem.blindsOpen;
    const blinds = document.querySelectorAll('.blind');
    
    blinds.forEach(blind => {
        if (lightingSystem.blindsOpen) {
            blind.emit('open-blind');
        } else {
            blind.emit('close-blind');
        }
    });
    
    console.log(`🪟 Ролети ${lightingSystem.blindsOpen ? 'відкрито' : 'закрито'}`);
}

// Вимкнення світла в зоні за ID
function disableZone(zoneNumber) {
    const zoneId = `zone-${zoneNumber}`;
    if (lightingSystem.zones[zoneId]) {
        lightingSystem.zones[zoneId].enabled = false;
        lightingSystem.zones[zoneId].lights.forEach(lightId => {
            const light = document.getElementById(lightId);
            if (light) {
                light.setAttribute('intensity', '0');
            }
        });
        console.log(`🚶 Зона ${zoneNumber} вимкнена`);
    }
}

// Увімкнення зони
function enableZone(zoneNumber) {
    const zoneId = `zone-${zoneNumber}`;
    if (lightingSystem.zones[zoneId]) {
        lightingSystem.zones[zoneId].enabled = true;
        console.log(`🚶 Зона ${zoneNumber} увімкнена`);
    }
}

// Створення світлового маркера
function createLightMarker(position, roomId) {
    const markerId = `light-marker-${roomId}`;
    const container = document.createElement('a-entity');
    container.setAttribute('id', markerId);
    container.setAttribute('position', position);
    
    // Лампочка
    const bulb = document.createElement('a-sphere');
    bulb.setAttribute('class', 'iot-marker light-control');
    bulb.setAttribute('radius', '0.3');
    bulb.setAttribute('color', '#ffd700');
    bulb.setAttribute('opacity', '0.8');
    bulb.setAttribute('emissive', '#ffd700');
    bulb.setAttribute('emissiveIntensity', '0.5');
    
    // Текст
    const text = document.createElement('a-text');
    text.setAttribute('value', 'Світло ' + roomId);
    text.setAttribute('position', '0 0.7 0');
    text.setAttribute('width', '3');
    text.setAttribute('align', 'center');
    text.setAttribute('color', '#fff');
    text.setAttribute('font', 'arialFont');
    
    container.appendChild(bulb);
    container.appendChild(text);
    document.querySelector('a-scene').appendChild(container);
    
    // Обробник кліку для перемикання світла
    bulb.addEventListener('click', function() {
        toggleRoomLight(roomId);
    });
    
    return container;
}

// Перемикання світла в кімнаті
function toggleRoomLight(roomId) {
    const lightId = `room-light-${roomId}`;
    const customLightId = `custom-light-${roomId}`;
    
    let light, lightData;
    
    // Перевіряємо чи це стандартне чи кастомне світло
    if (document.getElementById(lightId)) {
        light = document.getElementById(lightId);
        lightData = lightingSystem.roomLights[lightId];
    } else if (document.getElementById(customLightId)) {
        light = document.getElementById(customLightId);
        lightData = lightingSystem.customLights[customLightId];
    }
    
    if (light && lightData) {
        lightData.on = !lightData.on;
        
        if (lightData.on) {
            light.setAttribute('intensity', lightData.intensity);
            console.log(`💡 Світло ${roomId} увімкнено`);
        } else {
            light.setAttribute('intensity', 0);
            console.log(`💡 Світло ${roomId} вимкнено`);
        }
    }
}

// Голосові команди оголошені наново 1337
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
    'зупинити': () => stopVoiceRecognition()
};

// Додаємо голосові команди для світла
const lightVoiceCommands = {
    'увімкни світло': () => {
        Object.keys(lightingSystem.roomLights).forEach(lightId => {
            const light = document.getElementById(lightId);
            light.setAttribute('intensity', 1);
            lightingSystem.roomLights[lightId].on = true;
        });
        console.log('💡 Все світло увімкнено');
    },
    'вимкни світло': () => {
        Object.keys(lightingSystem.roomLights).forEach(lightId => {
            const light = document.getElementById(lightId);
            light.setAttribute('intensity', 0);
            lightingSystem.roomLights[lightId].on = false;
        });
        console.log('💡 Все світло вимкнено');
    },
    'ранок': () => setTimePreset(360),
    'день': () => setTimePreset(720),
    'вечір': () => setTimePreset(1080),
    'ніч': () => setTimePreset(1320),
    'закрий ролети': () => {
        if (lightingSystem.blindsOpen) toggleBlinds();
    },
    'відкрий ролети': () => {
        if (!lightingSystem.blindsOpen) toggleBlinds();
    },
    'вимкни зону': () => {
        // Вимикаємо активну зону
        Object.entries(lightingSystem.zones).forEach(([zoneId, zone]) => {
            if (zone.active) {
                const zoneNum = zoneId.split('-')[1];
                disableZone(zoneNum);
            }
        });
    }
};

// Додаємо нові команди до існуючих
Object.assign(voiceCommands, lightVoiceCommands);

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

        // Показуємо проміжний результат
        if (interimTranscript) {
            document.getElementById('voice-transcript').innerHTML = 
                `<em style="opacity: 0.7">${interimTranscript}</em>`;
        }

        // Обробляємо фінальний результат
        if (finalTranscript) {
            document.getElementById('voice-transcript').innerHTML = 
                `<strong>"${finalTranscript}"</strong>`;
            
            processVoiceCommand(finalTranscript);
            
            // Очищаємо через 3 секунди
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
    
    // Шукаємо відповідну команду
    for (const [key, action] of Object.entries(voiceCommands)) {
        if (command.includes(key)) {
            console.log('✅ Виконую команду:', key);
            action();
            
            // Візуальний фідбек
            document.getElementById('voice-status-text').textContent = `Виконано: ${key}`;
            return;
        }
    }
    
    // Якщо команда не розпізнана
    document.getElementById('voice-status-text').textContent = 'Команда не розпізнана';
    console.log('❓ Невідома команда:', command);
}

// Перемикання голосового керування
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

// ML режим з TensorFlow.js
async function initMLModel() {
    try {
        const recognizer = speechCommands.create('BROWSER_FFT');
        await recognizer.ensureModelLoaded();
        
        // Налаштування власних команд
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

// Edge ML обробка аудіо
async function processAudioWithML(audioData) {
    if (!speechModel || !useMLModel) return;
    
    try {
        const scores = await speechModel.recognize(audioData);
        const labels = speechModel.wordLabels();
        
        // Знаходимо команду з найвищим скором
        const maxScore = Math.max(...scores);
        const maxIndex = scores.indexOf(maxScore);
        const command = labels[maxIndex];
        
        if (maxScore > 0.75) { // Поріг впевненості
            console.log('🤖 ML розпізнано:', command, 'впевненість:', maxScore);
            processVoiceCommand(command);
        }
    } catch (error) {
        console.error('❌ Помилка ML обробки:', error);
    }
}

// IoT пристрої за замовчуванням
const defaultDevices = {
    'marker-0-0-0': {
        name: 'Розумний хаб',
        type: 'Центральний контролер',
        description: 'Основний хаб для керування всіма IoT пристроями в квартирі',
        position: {x: 0, y: 0, z: 0},
        mlFeatures: ['Центральна обробка ML моделей', 'Координація Edge пристроїв']
    }
};

// Типи Edge ML пристроїв
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
    smart: {
        name: 'Розумне світло',
        color: '#ffd700',
        mlModels: ['Circadian Rhythm AI', 'Presence Detection'],
        features: ['Автоматична адаптація', 'Циркадні ритми', 'Енергозбереження']
    }
};

// Копіюємо дефолтні пристрої в робочі дані
deviceData = {...defaultDevices};

// Функції керування висотою
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

// Створення маркера
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
    
    // Визначаємо колір та тип на основі ML типу
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
    
    // Сфера маркера
    const marker = document.createElement('a-sphere');
    marker.setAttribute('class', 'iot-marker');
    marker.setAttribute('radius', '0.5');
    marker.setAttribute('color', markerColor);
    marker.setAttribute('opacity', '0.7');
    marker.setAttribute('event-set__enter', '_event: mouseenter; scale: 1.2 1.2 1.2; opacity: 0.9');
    marker.setAttribute('event-set__leave', '_event: mouseleave; scale: 1 1 1; opacity: 0.7');
    marker.setAttribute('animation', 'property: rotation; to: 0 360 0; loop: true; dur: 15000');
    
    // Додаємо ефект пульсації для ML пристроїв
    if (mlType) {
        marker.setAttribute('animation__pulse', 'property: scale; from: 1 1 1; to: 1.1 1.1 1.1; loop: true; dir: alternate; dur: 2000');
    }
    
    // Текст над маркером
    const text = document.createElement('a-text');
    text.setAttribute('value', name);
    text.setAttribute('position', '0 1 0');
    text.setAttribute('width', '4');
    text.setAttribute('align', 'center');
    text.setAttribute('color', '#fff');
    text.setAttribute('font', 'arialFont');
    
    // Додаємо іконку ML якщо це ML пристрій
    if (mlType) {
        const mlIcon = document.createElement('a-text');
        mlIcon.setAttribute('value', '🤖');
        mlIcon.setAttribute('position', '0 1.5 0');
        mlIcon.setAttribute('width', '6');
        mlIcon.setAttribute('align', 'center');
        container.appendChild(mlIcon);
    }
    
    container.appendChild(marker);
    container.appendChild(text);
    document.querySelector('a-scene').appendChild(container);
    
    // Зберігаємо дані про пристрій
    deviceData[markerId] = {
        name: name,
        type: deviceType,
        description: description,
        position: tempMarkerPosition,
        mlType: mlType,
        mlModels: mlModels,
        mlFeatures: mlFeatures
    };
    
    // Додаємо обробник кліку
    marker.addEventListener('click', function() {
        showIotInfo(markerId);
    });
    
    markerCounter++;
    cancelMarker();
    
    console.log(`✅ ${mlType ? 'ML ' : ''}Маркер "${name}" створено на позиції:`, tempMarkerPosition);
}

function cancelMarker() {
    document.getElementById('marker-form').style.display = 'none';
    document.getElementById('marker-name').value = '';
    document.getElementById('marker-description').value = '';
    document.getElementById('ml-device-type').value = '';
    tempMarkerPosition = null;
}

// Відображення інформації про IoT
function showIotInfo(markerId) {
    const device = deviceData[markerId];
    if (device) {
        document.getElementById('iot-title').textContent = device.name;
        document.getElementById('iot-type').textContent = device.type;
        document.getElementById('iot-description').textContent = device.description;
        document.getElementById('iot-coords').textContent = `X: ${device.position.x}, Y: ${device.position.y}, Z: ${device.position.z}`;
        
        // ML інформація
        if (device.mlModels && device.mlModels.length > 0) {
            document.getElementById('iot-ml-models').textContent = device.mlModels.join(', ');
            document.getElementById('iot-ml-features').textContent = device.mlFeatures.join(', ');
        } else {
            document.getElementById('iot-ml-models').textContent = 'Немає';
            document.getElementById('iot-ml-features').textContent = 'Стандартні функції';
        }
        
        document.getElementById('iot-info-panel').classList.add('active');
    }
}

function closeIotPanel() {
    document.getElementById('iot-info-panel').classList.remove('active');
}

// Функція для випадаючих секцій
function toggleSection(sectionId) {
    const section = document.getElementById(sectionId);
    const collapsible = section.previousElementSibling;
    
    section.classList.toggle('show');
    collapsible.classList.toggle('active');
}

// Створення вікна з ролетою
function createWindowWithBlind() {
    const camera = document.getElementById('camera');
    const pos = camera.object3D.getWorldPosition(new THREE.Vector3());
    
    const windowId = `window-${windowCounter}`;
    const blindId = `blind-${windowCounter}`;
    
    const windowEntity = document.createElement('a-entity');
    windowEntity.setAttribute('id', windowId);
    windowEntity.setAttribute('position', `${pos.x} ${pos.y + 2} ${pos.z}`);
    
    // Вікно
    const window = document.createElement('a-box');
    window.setAttribute('width', '3');
    window.setAttribute('height', '4');
    window.setAttribute('depth', '0.1');
    window.setAttribute('color', '#87ceeb');
    window.setAttribute('opacity', '0.3');
    
    // Ролета
    const blind = document.createElement('a-box');
    blind.setAttribute('id', blindId);
    blind.setAttribute('class', 'blind');
    blind.setAttribute('width', '3');
    blind.setAttribute('height', '4');
    blind.setAttribute('depth', '0.2');
    blind.setAttribute('position', '0 2 0.2');
    blind.setAttribute('color', '#8b4513');
    blind.setAttribute('opacity', '0.9');
    blind.setAttribute('animation__close', 'property: position; to: 0 0 0.2; dur: 2000; startEvents: close-blind');
    blind.setAttribute('animation__open', 'property: position; to: 0 2 0.2; dur: 2000; startEvents: open-blind');
    
    windowEntity.appendChild(window);
    windowEntity.appendChild(blind);
    document.getElementById('windows-blinds').appendChild(windowEntity);
    
    windowCounter++;
    console.log(`🪟 Створено вікно з ролетою на позиції: ${pos.x}, ${pos.y + 2}, ${pos.z}`);
}

// Перемикання всього світла
function toggleAllLights() {
    const allLights = {...lightingSystem.roomLights, ...lightingSystem.customLights};
    const anyOn = Object.values(allLights).some(l => l.on);
    
    Object.entries(allLights).forEach(([lightId, lightData]) => {
        const light = document.getElementById(lightId);
        if (light) {
            if (anyOn) {
                light.setAttribute('intensity', 0);
                lightData.on = false;
            } else {
                light.setAttribute('intensity', lightData.intensity);
                lightData.on = true;
            }
        }
    });
    
    console.log(`💡 Все світло ${anyOn ? 'вимкнено' : 'увімкнено'}`);
}

// Експорт всього
function exportAll() {
    const exportData = {
        version: '2.0',
        exportDate: new Date().toISOString(),
        devices: deviceData,
        markerCounter: markerCounter,
        lights: {
            system: lightingSystem,
            counter: lightCounter
        },
        zones: {
            data: lightingSystem.zones,
            counter: zoneCounter
        },
        windows: {
            counter: windowCounter,
            blindsOpen: lightingSystem.blindsOpen
        },
        timeSettings: {
            currentTime: currentTimeMinutes
        }
    };
    
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], {type: 'application/json'});
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `smart-home-complete-${Date.now()}.json`;
    link.click();
    
    console.log('✅ Експортовано всю конфігурацію');
}

// Імпорт всього
function importAll(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const importData = JSON.parse(e.target.result);
            
            // Очищаємо існуючі елементи
            clearAllElements();
            
            // Імпортуємо маркери
            if (importData.devices) {
                deviceData = {...importData.devices};
                markerCounter = importData.markerCounter || Object.keys(deviceData).length;
                
                Object.entries(deviceData).forEach(([markerId, device]) => {
                    if (!defaultDevices[markerId]) {
                        createMarkerFromData(markerId, device);
                    }
                });
            }
            
            // Імпортуємо світло
            if (importData.lights) {
                lightingSystem = {...lightingSystem, ...importData.lights.system};
                lightCounter = importData.lights.counter || 5;
                
                // Створюємо кастомні світла
                Object.entries(importData.lights.system.customLights || {}).forEach(([lightId, lightData]) => {
                    const lightNum = lightId.split('-')[2];
                    createImportedLight(lightNum, lightData);
                });
            }
            
            // Імпортуємо зони
            if (importData.zones) {
                zoneCounter = importData.zones.counter || 1;
                
                Object.entries(importData.zones.data || {}).forEach(([zoneId, zoneData]) => {
                    createImportedZone(zoneId, zoneData);
                });
            }
            
            // Імпортуємо налаштування часу
            if (importData.timeSettings) {
                setTimePreset(importData.timeSettings.currentTime);
            }
            
            console.log('✅ Імпортовано всю конфігурацію');
            alert('Конфігурація успішно імпортована!');
            
        } catch (error) {
            console.error('❌ Помилка імпорту:', error);
            alert('Помилка при імпорті файлу');
        }
    };
    reader.readAsText(file);
    event.target.value = '';
}

// Очищення всіх елементів
function clearAllElements() {
    // Видаляємо маркери
    Object.keys(deviceData).forEach(markerId => {
        if (!defaultDevices[markerId]) {
            const element = document.getElementById(markerId);
            if (element) element.remove();
        }
    });
    
    // Видаляємо кастомні світла
    Object.keys(lightingSystem.customLights).forEach(lightId => {
        const element = document.getElementById(lightId);
        if (element) element.remove();
        const markerId = `light-marker-${lightId.split('-')[2]}`;
        const marker = document.getElementById(markerId);
        if (marker) marker.remove();
    });
    
    // Видаляємо зони
    Object.keys(lightingSystem.zones).forEach(zoneId => {
        const element = document.getElementById(zoneId);
        if (element) element.remove();
        const lightId = `zone-light-${zoneId.split('-')[1]}`;
        const light = document.getElementById(lightId);
        if (light) light.remove();
    });
}

// Створення імпортованого світла
function createImportedLight(lightNum, lightData) {
    // Створюємо світло
    const lightId = `custom-light-${lightNum}`;
    const light = document.createElement('a-light');
    light.setAttribute('id', lightId);
    light.setAttribute('type', 'point');
    light.setAttribute('position', `0 7 0`); // Дефолтна позиція
    light.setAttribute('intensity', lightData.on ? lightData.intensity : 0);
    light.setAttribute('color', lightData.color);
    light.setAttribute('distance', '15');
    light.setAttribute('decay', '2');
    
    document.getElementById('room-lights').appendChild(light);
    
    // Створюємо маркер
    createLightMarker('0 5 0', lightNum);
}

// Створення імпортованої зони
function createImportedZone(zoneId, zoneData) {
    const zone = document.createElement('a-entity');
    zone.setAttribute('id', zoneId);
    zone.setAttribute('position', `${zoneData.position.x} ${zoneData.position.y} ${zoneData.position.z}`);
    
    // Візуалізація зони
    const floor = document.createElement('a-cylinder');
    floor.setAttribute('radius', zoneData.radius);
    floor.setAttribute('height', '0.1');
    floor.setAttribute('color', '#00ff88');
    floor.setAttribute('opacity', '0.3');
    
    const text = document.createElement('a-text');
    text.setAttribute('value', 'Зона ' + zoneId.split('-')[1]);
    text.setAttribute('position', '0 0.5 0');
    text.setAttribute('align', 'center');
    text.setAttribute('font', 'arialFont');
    
    zone.appendChild(floor);
    zone.appendChild(text);
    document.querySelector('a-scene').appendChild(zone);
    
    // Створюємо світло для зони
    zoneData.lights.forEach(lightId => {
        const light = document.createElement('a-light');
        light.setAttribute('id', lightId);
        light.setAttribute('type', 'point');
        light.setAttribute('position', `${zoneData.position.x} ${zoneData.position.y + 5} ${zoneData.position.z}`);
        light.setAttribute('intensity', '0');
        light.setAttribute('color', '#ffffff');
        
        document.getElementById('room-lights').appendChild(light);
    });
}

// Експорт окремих елементів
function exportLights() {
    const data = {
        lights: lightingSystem.customLights,
        counter: lightCounter
    };
    downloadJSON(data, 'lights-export');
}

function exportZones() {
    const data = {
        zones: lightingSystem.zones,
        counter: zoneCounter
    };
    downloadJSON(data, 'zones-export');
}

function downloadJSON(data, prefix) {
    const dataStr = JSON.stringify(data, null, 2);
    const dataBlob = new Blob([dataStr], {type: 'application/json'});
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `${prefix}-${Date.now()}.json`;
    link.click();
}

// Створення маркера з даних
function createMarkerFromData(markerId, device) {
    const container = document.createElement('a-entity');
    container.setAttribute('id', markerId);
    container.setAttribute('position', `${device.position.x} ${device.position.y} ${device.position.z}`);
    
    // Визначаємо колір на основі ML типу
    let markerColor = '#00ff88';
    if (device.mlType && edgeMLTypes[device.mlType]) {
        markerColor = edgeMLTypes[device.mlType].color;
    }
    
    // Сфера маркера
    const marker = document.createElement('a-sphere');
    marker.setAttribute('class', 'iot-marker');
    marker.setAttribute('radius', '0.5');
    marker.setAttribute('color', markerColor);
    marker.setAttribute('opacity', '0.7');
    marker.setAttribute('event-set__enter', '_event: mouseenter; scale: 1.2 1.2 1.2; opacity: 0.9');
    marker.setAttribute('event-set__leave', '_event: mouseleave; scale: 1 1 1; opacity: 0.7');
    marker.setAttribute('animation', 'property: rotation; to: 0 360 0; loop: true; dur: 15000');
    
    // Додаємо ефект пульсації для ML пристроїв
    if (device.mlType) {
        marker.setAttribute('animation__pulse', 'property: scale; from: 1 1 1; to: 1.1 1.1 1.1; loop: true; dir: alternate; dur: 2000');
    }
    
    // Текст над маркером
    const text = document.createElement('a-text');
    text.setAttribute('value', device.name);
    text.setAttribute('position', '0 1 0');
    text.setAttribute('width', '4');
    text.setAttribute('align', 'center');
    text.setAttribute('color', '#fff');
    text.setAttribute('font', 'arialFont');
    
    // Додаємо іконку ML якщо це ML пристрій
    if (device.mlType) {
        const mlIcon = document.createElement('a-text');
        mlIcon.setAttribute('value', '🤖');
        mlIcon.setAttribute('position', '0 1.5 0');
        mlIcon.setAttribute('width', '6');
        mlIcon.setAttribute('align', 'center');
        container.appendChild(mlIcon);
    }
    
    container.appendChild(marker);
    container.appendChild(text);
    document.querySelector('a-scene').appendChild(container);
    
    // Додаємо обробник кліку
    marker.addEventListener('click', function() {
        showIotInfo(markerId);
    });
}

// Швидкі дії
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

// Оновлення позиції
function updatePositionDisplay() {
    const camera = document.getElementById('camera');
    const pos = camera.object3D.getWorldPosition(new THREE.Vector3());
    document.getElementById('pos-x').textContent = pos.x.toFixed(1);
    document.getElementById('pos-y').textContent = pos.y.toFixed(1);
    document.getElementById('pos-z').textContent = pos.z.toFixed(1);
}

// Ініціалізація
document.addEventListener('DOMContentLoaded', function() {
    console.log('✅ Smart Home XR Tour завантажено');
    setHeight();
    
    // Ініціалізація освітлення
    updateTimeOfDay(currentTimeMinutes);
    
    // Створюємо маркери світла для кімнат
    setTimeout(() => {
        createLightMarker('5 5 5', '1');
        createLightMarker('-5 5 5', '2');
        createLightMarker('5 5 -5', '3');
        createLightMarker('-5 5 -5', '4');
    }, 1000);
    
    // Оновлення позиції кожні 100мс
    setInterval(updatePositionDisplay, 100);
    
    // Перевірка зон кожні 200мс
    setInterval(checkPlayerInZones, 200);
    
    // Обробник для початкового маркера
    const initialMarker = document.querySelector('#marker-0-0-0 .iot-marker');
    if (initialMarker) {
        initialMarker.addEventListener('click', function() {
            showIotInfo('marker-0-0-0');
        });
    }
    
    // Обробка клавіш
    document.addEventListener('keydown', (e) => {
        if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;
        
        e.stopPropagation();
        
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
                const allOn = Object.values(lightingSystem.roomLights).some(l => l.on);
                if (allOn) {
                    voiceCommands['вимкни світло']();
                } else {
                    voiceCommands['увімкни світло']();
                }
                break;
            case 'b':
                toggleBlinds();
                break;
            case 'tab':
                e.preventDefault();
                toggleAllPanels();
                break;
        }
    });
    
    // Pointer lock
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
window.updateTimeOfDay = updateTimeOfDay;
window.setTimePreset = setTimePreset;
window.toggleRoomLight = toggleRoomLight;
window.createLightAtCurrentPosition = createLightAtCurrentPosition;
window.createZoneAtCurrentPosition = createZoneAtCurrentPosition;
window.toggleBlinds = toggleBlinds;
window.toggleSection = toggleSection;
window.createWindowWithBlind = createWindowWithBlind;
window.toggleAllLights = toggleAllLights;
window.exportAll = exportAll;
window.importAll = importAll;
window.exportLights = exportLights;
window.exportZones = exportZones;
window.toggleAllPanels = toggleAllPanels;
