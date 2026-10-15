export const audioContext = new (window.AudioContext || window.webkitAudioContext)();

export function playBoostSound() {
    if (audioContext.state === 'suspended') {
        audioContext.resume();
    }
    const osc = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, audioContext.currentTime); // Low swoop
    osc.frequency.exponentialRampToValueAtTime(400, audioContext.currentTime + 0.1); 
    osc.frequency.exponentialRampToValueAtTime(100, audioContext.currentTime + 0.3); 

    gainNode.gain.setValueAtTime(0, audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.05); // Subtle
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

    osc.connect(gainNode);
    gainNode.connect(audioContext.destination);

    osc.start();
    osc.stop(audioContext.currentTime + 0.3);
}

export function playJumpSound() {
    if (audioContext.state === 'suspended') {
        audioContext.resume();
    }
    const osc = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(300, audioContext.currentTime);
    osc.frequency.exponentialRampToValueAtTime(600, audioContext.currentTime + 0.15);

    gainNode.gain.setValueAtTime(0, audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.2, audioContext.currentTime + 0.02); // Subtle
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);

    osc.connect(gainNode);
    gainNode.connect(audioContext.destination);

    osc.start();
    osc.stop(audioContext.currentTime + 0.15);
}

export function playDeathSound() {
    if (audioContext.state === 'suspended') {
        audioContext.resume();
    }
    const osc = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(200, audioContext.currentTime);
    osc.frequency.exponentialRampToValueAtTime(50, audioContext.currentTime + 0.4);

    gainNode.gain.setValueAtTime(0, audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.05);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.4);

    osc.connect(gainNode);
    gainNode.connect(audioContext.destination);

    osc.start();
    osc.stop(audioContext.currentTime + 0.4);
}

