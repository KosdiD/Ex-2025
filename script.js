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

// Голосові команди з додаванням світлових команд
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
    // Нові команди для світла
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

// Обробка голосової команди з підтримкою яскравості
function processVoiceCommand(command) {
    console.log('🎯 Обробка команди:', command);
    
    // Перевірка команди яскравості з числом
    const brightnessMatch = command.match(/яскравість\s*(\d+)/);
    if (brightnessMatch) {
        const brightness = Math.min(100, Math.max(0, parseInt(brightnessMatch[1])));
        updateBrightness(brightness);
        document.getElementById('voice-status-text').textContent = `Яскравість встановлено: ${brightness}%`;
        return;
    }
    
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

// Типи Edge ML пристроїв з додаванням світла
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

// Копіюємо дефолтні пристрої в робочі дані
deviceData = {...defaultDevices};

// Функції керування світлом
function createLight() {
    const camera = document.getElementById('camera');
    const pos = camera.object3D.getWorldPosition(new THREE.Vector3());
    
    const lightId = `light-${lightCounter++}`;
    const lightPosition = {
        x: Math.round(pos.x * 100) / 100,
        y: Math.round(pos.y * 100) / 100 + 5, // Трохи вище від камери
        z: Math.round(pos.z * 100) / 100
    };
    
    // Створюємо A-Frame світло
    const lightEntity = document.createElement('a-entity');
    lightEntity.setAttribute('id', lightId);
    lightEntity.setAttribute('position', `${lightPosition.x} ${lightPosition.y} ${lightPosition.z}`);
    
    // Точкове світло
    const pointLight = document.createElement('a-light');
    pointLight.setAttribute('type', 'point');
    pointLight.setAttribute('color', '#ffeb3b');
    pointLight.setAttribute('intensity', globalBrightness / 100);
    pointLight.setAttribute('distance', '20');
    pointLight.setAttribute('decay', '2');
    
    // Візуальна лампочка
    const bulb = document.createElement('a-sphere');
    bulb.setAttribute('radius', '0.3');
    bulb.setAttribute('color', '#ffeb3b');
    bulb.setAttribute('emissive', '#ffeb3b');
    bulb.setAttribute('emissiveIntensity', globalBrightness / 100);
    bulb.setAttribute('opacity', '0.8');
    
    // Текст
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
    
    // Зберігаємо дані про світло
    lightDevices[lightId] = {
        id: lightId,
        name: `Світло ${lightCounter - 1}`,
        position: lightPosition,
        isOn: true,
        brightness: globalBrightness,
        element: lightEntity
    };
    
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
    
    // Оновлюємо всі світла
    Object.values(lightDevices).forEach(light => {
        light.brightness = value;
        if (light.isOn) {
            updateLightState(light);
        }
    });
    
    // Оновлюємо загальне освітлення
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

let currentLightDevice = null;

function toggleLightDevice() {
    if (currentLightDevice) {
        currentLightDevice.isOn = !currentLightDevice.isOn;
        updateLightState(currentLightDevice);
        document.getElementById('light-state').textContent = currentLightDevice.isOn ? 'Увімкнено' : 'Вимкнено';
    }
}

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
    text.setAttribute('font', '../fonts/calibri-msdf.json');
    
    // Додаємо іконку ML якщо це ML пристрій
    if (mlType) {
        const mlIcon = document.createElement('a-text');
        mlIcon.setAttribute('value', '🤖');
        mlIcon.setAttribute('position', '0 1.5 0');
        mlIcon.setAttribute('width', '6');
        mlIcon.setAttribute('align', 'center');
        container.appendChild(mlIcon);
    }
    
    // Якщо це світловий пристрій, додаємо світло
    if (mlType === 'light') {
        const lightId = `device-light-${markerCounter}`;
        const pointLight = document.createElement('a-light');
        pointLight.setAttribute('type', 'point');
        pointLight.setAttribute('color', '#ffeb3b');
        pointLight.setAttribute('intensity', '0.5');
        pointLight.setAttribute('distance', '15');
        pointLight.setAttribute('decay', '2');
        container.appendChild(pointLight);
        
        // Зберігаємо як світловий пристрій
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
    
    // Зберігаємо дані про пристрій
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
        
        // Показуємо контролі для світла
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

// Експорт маркерів
// Експорт маркерів
function exportMarkers() {
    // Підготовка даних для експорту без циклічних посилань
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
    
    const exportData = {
        version: '1.0',
        exportDate: new Date().toISOString(),
        devices: cleanDeviceData,
        lights: cleanLightDevices,
        markerCounter: markerCounter,
        lightCounter: lightCounter,
        globalBrightness: globalBrightness
    };
    
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], {type: 'application/json'});
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `smart-home-iot-markers-${Date.now()}.json`;
    link.click();
    
    console.log('✅ Експортовано', Object.keys(deviceData).length, 'маркерів та', Object.keys(lightDevices).length, 'світлових пристроїв');
}

// Імпорт маркерів
// Імпорт маркерів
function importMarkers(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const importData = JSON.parse(e.target.result);
            
            // Видаляємо всі існуючі маркери (крім дефолтних)
            Object.keys(deviceData).forEach(markerId => {
                if (!defaultDevices[markerId]) {
                    const element = document.getElementById(markerId);
                    if (element) element.remove();
                }
            });
            
            // Видаляємо всі світла
            Object.values(lightDevices).forEach(light => {
                if (light.element) {
                    light.element.remove();
                }
            });
            lightDevices = {};
            
            // Очищаємо deviceData
            deviceData = {...defaultDevices};
            
            // Завантажуємо нові дані
            if (importData.devices) {
                Object.entries(importData.devices).forEach(([markerId, device]) => {
                    deviceData[markerId] = device;
                });
            }
            
            markerCounter = importData.markerCounter || Object.keys(deviceData).length;
            lightCounter = importData.lightCounter || 1;
            
            if (importData.globalBrightness !== undefined) {
                updateBrightness(importData.globalBrightness);
            }
            
            // Створюємо маркери зі збережених даних
            Object.entries(deviceData).forEach(([markerId, device]) => {
                if (!defaultDevices[markerId]) {
                    createMarkerFromData(markerId, device);
                }
            });
            
            // Відновлюємо світла
            if (importData.lights) {
                Object.entries(importData.lights).forEach(([lightId, lightData]) => {
                    if (!lightData.isMarker) {
                        createLightFromData(lightId, lightData);
                    }
                });
            }
            
            console.log('✅ Імпортовано', Object.keys(deviceData).length, 'маркерів та', Object.keys(lightDevices).length, 'світлових пристроїв');
            alert('Дані успішно імпортовано!');
            
        } catch (error) {
            console.error('❌ Помилка імпорту:', error);
            alert('Помилка при імпорті файлу. Перевірте формат файлу.');
        }
    };
    reader.readAsText(file);
    
    // Очищаємо input для можливості повторного вибору того ж файлу
    event.target.value = '';
}

// Створення світла з даних
function createLightFromData(lightId, lightData) {
    const lightEntity = document.createElement('a-entity');
    lightEntity.setAttribute('id', lightId);
    lightEntity.setAttribute('position', `${lightData.position.x} ${lightData.position.y} ${lightData.position.z}`);
    
    // Точкове світло
    const pointLight = document.createElement('a-light');
    pointLight.setAttribute('type', 'point');
    pointLight.setAttribute('color', '#ffeb3b');
    pointLight.setAttribute('intensity', lightData.isOn ? lightData.brightness / 100 : 0);
    pointLight.setAttribute('distance', '20');
    pointLight.setAttribute('decay', '2');
    
    // Візуальна лампочка
    const bulb = document.createElement('a-sphere');
    bulb.setAttribute('radius', '0.3');
    bulb.setAttribute('color', '#ffeb3b');
    bulb.setAttribute('emissive', '#ffeb3b');
    bulb.setAttribute('emissiveIntensity', lightData.isOn ? lightData.brightness / 100 : 0);
    bulb.setAttribute('opacity', lightData.isOn ? '0.8' : '0.3');
    
    // Текст
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
    
    // Зберігаємо дані
    lightDevices[lightId] = {
        ...lightData,
        element: lightEntity
    };
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
    text.setAttribute('font', '../fonts/calibri-msdf.json');
    
    // Додаємо іконку ML якщо це ML пристрій
    if (device.mlType) {
        const mlIcon = document.createElement('a-text');
        mlIcon.setAttribute('value', '🤖');
        mlIcon.setAttribute('position', '0 1.5 0');
        mlIcon.setAttribute('width', '6');
        mlIcon.setAttribute('align', 'center');
        container.appendChild(mlIcon);
    }
    
    // Якщо це світловий пристрій
    if (device.mlType === 'light') {
        const lightId = `device-light-${markerId.split('-')[1]}`;
        const pointLight = document.createElement('a-light');
        pointLight.setAttribute('type', 'point');
        pointLight.setAttribute('color', '#ffeb3b');
        pointLight.setAttribute('intensity', '0.5');
        pointLight.setAttribute('distance', '15');
        pointLight.setAttribute('decay', '2');
        container.appendChild(pointLight);
        
        // Відновлюємо світловий пристрій
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
    
    // Оновлення позиції кожні 100мс
    setInterval(updatePositionDisplay, 100);
    
    // Обробник для початкового маркера
    const initialMarker = document.querySelector('#marker-0-0-0 .iot-marker');
    if (initialMarker) {
        initialMarker.addEventListener('click', function() {
            showIotInfo('marker-0-0-0');
        });
    }
    
    // Обробка клавіш
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
window.createLight = createLight;
window.toggleAllLights = toggleAllLights;
window.updateBrightness = updateBrightness;
window.toggleLightDevice = toggleLightDevice;
