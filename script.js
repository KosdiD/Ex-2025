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

function saveCurrentPosition() {
    const camera = document.getElementById('camera');
    const pos = camera.object3D.getWorldPosition(new THREE.Vector3());

    const marker = document.createElement('a-sphere');
    marker.setAttribute('position', `${pos.x} ${pos.y} ${pos.z}`);
    marker.setAttribute('radius', '0.2');
    marker.setAttribute('color', '#ff4444');
    marker.setAttribute('class', 'iot-marker');
    marker.setAttribute('onclick', `alert('IoT info here at ${pos.x.toFixed(2)}, ${pos.y.toFixed(2)}, ${pos.z.toFixed(2)}')`);

    document.querySelector('a-scene').appendChild(marker);

    console.log(`📍 Saved position: x=${pos.x.toFixed(2)}, y=${pos.y.toFixed(2)}, z=${pos.z.toFixed(2)}`);
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
            document.getElementById('rig').setAttribute('position', '0 10 20');
            document.getElementById('height-input').value = 10;
            document.getElementById('current-height').textContent = 10;
            break;
    }
});

document.addEventListener('click', () => {
    const canvas = document.querySelector('a-scene canvas');
    if (canvas && !document.pointerLockElement) {
        canvas.requestPointerLock();
    }
});

document.addEventListener('DOMContentLoaded', function () {
    console.log('✅ XR сцена завантажена');
    setHeight();

    const house = document.getElementById('house');
    if (house) {
        house.addEventListener('model-loaded', () => {
            console.log('🏠 Модель будинку завантажено');
        });

        house.addEventListener('model-error', () => {
            console.warn('⚠️ Не вдалося завантажити модель "box.glb"');
        });
    }
});
