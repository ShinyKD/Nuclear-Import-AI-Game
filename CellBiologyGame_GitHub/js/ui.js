export const uiState = {
    currentScreen: 'main-menu',
    volume: 50,
    showFps: false,
    skin: 'yellow'
};

let audioCtx;
const titleMusic = new Audio('assets/title_music.mp3');
titleMusic.loop = true;

export const levelMusic = {
    l1: new Audio('assets/level1_music.mp4'),
    l2: new Audio('assets/level2_music.mp4'),
    l3: new Audio('assets/level3_music.mp4'),
    cutscene: new Audio('assets/cutscene_music.mp4'),
    credits: new Audio('assets/credits_music.mp4')
};
levelMusic.l1.loop = true;
levelMusic.l2.loop = true;
levelMusic.l3.loop = true;
levelMusic.cutscene.loop = true;
levelMusic.credits.loop = true;

export function fadeAudio(audio, targetVolume, durationMs = 1000) {
    if (!audio) return;
    const steps = 20;
    const stepTime = durationMs / steps;
    const currentVolume = audio.volume;
    const volumeStep = (targetVolume - currentVolume) / steps;
    
    // Play if increasing volume
    if (targetVolume > 0 && audio.paused) {
        audio.play().catch(e => console.log('Audio autoplay prevented'));
    }

    clearInterval(audio.fadeInterval);
    audio.fadeInterval = setInterval(() => {
        let newVolume = audio.volume + volumeStep;
        if ((volumeStep > 0 && newVolume >= targetVolume) || (volumeStep < 0 && newVolume <= targetVolume)) {
            newVolume = targetVolume;
            clearInterval(audio.fadeInterval);
            if (targetVolume === 0) audio.pause();
        }
        audio.volume = Math.max(0, Math.min(1, newVolume));
    }, stepTime);
}

let activeGameplayMusic = null;

export function crossfadeMusic(targetAudio, isPause = false) {
    const allMusic = [titleMusic, levelMusic.l1, levelMusic.l2, levelMusic.l3, levelMusic.cutscene, levelMusic.credits];
    let maxVol = uiState.volume / 100;
    
    if (targetAudio === levelMusic.cutscene) {
        maxVol = maxVol * 0.4; // lower the volume for cutscene
    }
    
    if (!isPause) {
        if (targetAudio === levelMusic.l1 || targetAudio === levelMusic.l2 || targetAudio === levelMusic.l3 || targetAudio === null) {
            activeGameplayMusic = targetAudio;
        }
    }
    
    allMusic.forEach(audio => {
        if (!audio) return;
        if (audio === targetAudio) {
            fadeAudio(audio, maxVol, 1500);
        } else {
            fadeAudio(audio, 0, 1500);
        }
    });
}

function manageTitleMusic(screenId) {
    const titleScreens = ['main-menu', 'settings-menu', 'level-select-menu'];
    if (titleScreens.includes(screenId)) {
        crossfadeMusic(titleMusic);
    } else if (screenId === 'credits-menu') {
        crossfadeMusic(levelMusic.credits);
    } else if (screenId === 'gameplay') {
        crossfadeMusic(activeGameplayMusic);
    } else if (screenId === 'pause-screen') {
        crossfadeMusic(null, true);
    } else if (screenId !== 'cutscene-screen') {
        crossfadeMusic(null);
    }
}

function playHoverSound() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (uiState.volume === 0) return;
    
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(400, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(600, audioCtx.currentTime + 0.1);
    
    gainNode.gain.setValueAtTime((uiState.volume / 100) * 0.1, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
    
    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    osc.start();
    osc.stop(audioCtx.currentTime + 0.1);
}

function playClickSound() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (uiState.volume === 0) return;
    
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    
    osc.type = 'square';
    osc.frequency.setValueAtTime(300, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(150, audioCtx.currentTime + 0.15);
    
    gainNode.gain.setValueAtTime((uiState.volume / 100) * 0.2, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
    
    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    osc.start();
    osc.stop(audioCtx.currentTime + 0.15);
}

export function initUI() {
    const screens = {
        'main-menu': document.getElementById('main-menu'),
        'settings-menu': document.getElementById('settings-menu'),
        'credits-menu': document.getElementById('credits-menu'),
        'level-select-menu': document.getElementById('level-select-menu'),
        'tutorial-screen': document.getElementById('tutorial-screen'),
        'pause-screen': document.getElementById('pause-screen'),
        'next-level-popup': document.getElementById('next-level-popup'),
        'victory-screen': document.getElementById('victory-screen'),
        'cutscene-screen': document.getElementById('cutscene-screen')
    };

    function switchScreen(screenId) {
        Object.values(screens).forEach(s => {
            if (s) s.classList.remove('active');
        });
        if (screens[screenId]) screens[screenId].classList.add('active');
        uiState.currentScreen = screenId;
        manageTitleMusic(screenId);
        
        if (screenId !== 'gameplay') {
            document.body.style.cursor = 'default';
            try {
                if (document.exitPointerLock) document.exitPointerLock();
            } catch (e) {}
        }
    }
    
    // Start music on first interaction (browser autoplay policy)
    document.addEventListener('click', function firstClick() {
        manageTitleMusic(uiState.currentScreen);
        document.removeEventListener('click', firstClick);
    }, { once: true });
    
    window.showVictoryScreen = () => {
        switchScreen('credits-menu');
        // Restart credits animation
        const crawl = document.querySelector('.star-wars-content');
        if (crawl) {
            crawl.style.animation = 'none';
            void crawl.offsetWidth; // trigger reflow
            crawl.style.animation = 'crawl 40s linear forwards';
        }
    };
    
    // Flash Text Utility
    window.flashText = (msg, color = "white") => {
        const ft = document.getElementById('flash-text');
        ft.innerText = msg;
        ft.style.color = color;
        ft.style.display = 'block';
        ft.style.opacity = '0';
        ft.style.transform = 'translate(-50%, -50%) scale(0)';
        
        // Trigger reflow
        void ft.offsetWidth;
        
        ft.style.opacity = '1';
        ft.style.transform = 'translate(-50%, -50%) scale(1)';
        
        setTimeout(() => {
            ft.style.opacity = '0';
            ft.style.transform = 'translate(-50%, -50%) scale(1.5)';
            setTimeout(() => { ft.style.display = 'none'; }, 400);
        }, 1200);
    };

    // Add sound to all clickable elements
    document.querySelectorAll('li, button').forEach(el => {
        el.addEventListener('mouseenter', playHoverSound);
        el.addEventListener('click', () => {
            playClickSound();
        });
    });

    let pendingLevel = 1;

    function showTutorial(level) {
        pendingLevel = level;
        const title = document.getElementById('tutorial-title');
        const text = document.getElementById('tutorial-text');
        
        if (level === 1) {
            title.innerText = "Level 1: Cytoplasm Survival";
            text.innerHTML = `
                Navigate the crowded cytoplasm as <b>Importin</b> searching for its target.<br>
                Dodge yellow <b>non-NLS cargo</b> and avoid red-tailed <b>incorrect NLS cargo</b>.<br>
                Avoid <b>vacuoles</b> (speed debuff) and survive until the green <b>NLS-Cargo</b> appears!<br><br>
                <div style="font-size: 1.15rem; color: #00ffff; margin-top: 15px; border-top: 1px solid rgba(0,255,255,0.3); padding-top: 12px; line-height: 1.8;">
                    <b>Movement & Controls:</b><br>
                    • Use <b>W, A, S, D</b> or <b>Arrow Keys</b> to move<br>
                    • Press <b>SPACEBAR</b> to Dash (3s Cooldown)<br>
                    • Dodge non-target cargo and reach the glowing <b>NLS-Cargo</b> after 25s
                </div>
            `;
        } else if (level === 2) {
            title.innerText = "Level 2: Nuclear Pore Dash";
            text.innerHTML = `
                Escort the <b>Importin-Cargo Complex</b> through the Nuclear Pore Complex.<br>
                Traverse along the hydrogel mesh of hydrophobic <b>FG-repeat strands</b>.<br>
                Don't fall into the gaps between the strands to reach the nucleus safely!<br><br>
                <div style="font-size: 1.15rem; color: #00ffff; margin-top: 15px; border-top: 1px solid rgba(0,255,255,0.3); padding-top: 12px; line-height: 1.8;">
                    <b>Movement & Controls:</b><br>
                    • Press <b>SPACEBAR</b> to Jump over gaps and obstacles<br>
                    • Pass through floating rings to invert between floor and ceiling<br>
                    • Reach <b>100% Distance</b> to successfully enter the Nucleus
                </div>
            `;
        } else if (level === 'cutscene') {
            title.innerText = "Cutscene: Cargo Delivery & Ran Cycle";
            text.innerHTML = `
                Watch how <b>RanGDP</b> enters the nucleus escorted by <b>NTF2</b>.<br>
                Inside the nucleus, <b>RanGEF</b> exchanges GDP for GTP,<br>
                enabling <b>RanGTP</b> to bind Importin and release cargo!<br><br>
                <div style="font-size: 1.15rem; color: #00ffff; margin-top: 15px; border-top: 1px solid rgba(0,255,255,0.3); padding-top: 12px; line-height: 1.8;">
                    <b>Interactive Controls:</b><br>
                    • Press <b>SPACE</b> to Pause / Resume<br>
                    • Press <b>LEFT ARROW (&larr;)</b> for Previous Step<br>
                    • Press <b>RIGHT ARROW (&rarr;)</b> for Next Step
                </div>
            `;
        } else if (level === 3) {
            title.innerText = "Level 3: Cytoplasm-kart";
            text.innerHTML = `
                Back in the cytoplasm, <b>RanGTP</b> remains locked to <b>Importin</b>.<br>
                Chase down <b>RanGAP</b> (GTPase-Activating Protein) to stimulate hydrolysis.<br>
                Form the complex and hydrolyze GTP &rarr; GDP + Pi to reset Importin!<br><br>
                <div style="font-size: 1.15rem; color: #00ffff; margin-top: 15px; border-top: 1px solid rgba(0,255,255,0.3); padding-top: 12px; line-height: 1.8;">
                    <b>Flight & Action Controls:</b><br>
                    • Move <b>Mouse</b> to steer (Free-fly 3D camera)<br>
                    • Click <b>Left Mouse Button</b> to perform action<br>
                    • Catch <b>RanGAP</b> to hydrolyze and return to starting Importin
                </div>
            `;
        }
        
        switchScreen('tutorial-screen');
    }
    window.showTutorial = showTutorial;

    // Main Menu Buttons
    document.getElementById('btn-start').addEventListener('click', () => {
        showTutorial(1);
    });

    document.getElementById('btn-level-select').addEventListener('click', () => {
        switchScreen('level-select-menu');
    });

    document.getElementById('btn-play-l1').addEventListener('click', () => {
        if (window.quitLevel1) window.quitLevel1();
        if (window.quitLevel2) window.quitLevel2();
        if (window.quitLevel3) window.quitLevel3();
        showTutorial(1);
    });

    document.getElementById('btn-play-l2').addEventListener('click', () => {
        if (window.quitLevel1) window.quitLevel1();
        if (window.quitLevel2) window.quitLevel2();
        if (window.quitLevel3) window.quitLevel3();
        showTutorial(2);
    });

    const playCutsceneBtn = document.getElementById('btn-play-cutscene');
    if (playCutsceneBtn) {
        playCutsceneBtn.addEventListener('click', () => {
            if (window.quitLevel1) window.quitLevel1();
            if (window.quitLevel2) window.quitLevel2();
            if (window.quitLevel3) window.quitLevel3();
            showTutorial('cutscene');
        });
    }

    // Play Level 3
    const playL3Btn = document.getElementById('btn-play-l3');
    if (playL3Btn) {
        playL3Btn.addEventListener('click', () => {
            if (window.quitLevel1) window.quitLevel1();
            if (window.quitLevel2) window.quitLevel2();
            if (window.quitCutscene) window.quitCutscene();
            showTutorial(3);
        });
    }

    document.getElementById('btn-levels-back').addEventListener('click', () => {
        switchScreen('main-menu');
    });

    const proceedFromTutorial = () => {
        if (uiState.currentScreen === 'tutorial-screen') {
            if (pendingLevel === 'cutscene') {
                switchScreen('cutscene-screen'); 
                uiState.currentScreen = 'cutscene-screen';
                if (window.startCutscene1) window.startCutscene1();
            } else {
                switchScreen('gameplay'); 
                uiState.currentScreen = 'gameplay';
                if (pendingLevel === 1 && window.startGameLevel1) window.startGameLevel1();
                if (pendingLevel === 2 && window.startGameLevel2) window.startGameLevel2();
                if (pendingLevel === 3 && window.startGameLevel3) window.startGameLevel3();
            }
        }
    };

    const tutorialScreenEl = document.getElementById('tutorial-screen');
    if (tutorialScreenEl) {
        tutorialScreenEl.addEventListener('click', proceedFromTutorial);
    }

    // Tutorial & Pause Keydown
    document.addEventListener('keydown', (e) => {
        if (uiState.currentScreen === 'tutorial-screen' && e.code === 'Space') {
            proceedFromTutorial();
        }
        
        // Pause Game
        if (uiState.currentScreen === 'gameplay' && e.code === 'Escape') {
            switchScreen('pause-screen');
        } else if (uiState.currentScreen === 'pause-screen' && e.code === 'Escape') {
            switchScreen('gameplay'); 
            uiState.currentScreen = 'gameplay';
        }
    });

    // Pause Menu Buttons
    document.getElementById('btn-resume').addEventListener('click', () => {
        switchScreen('gameplay');
        uiState.currentScreen = 'gameplay';
    });

    document.getElementById('btn-title-return').addEventListener('click', () => {
        if (window.quitLevel1) window.quitLevel1();
        if (window.quitLevel2) window.quitLevel2();
        if (window.quitLevel3) window.quitLevel3();
        if (window.quitCutscene) window.quitCutscene();
        switchScreen('main-menu');
    });

    document.getElementById('btn-quit').addEventListener('click', () => {
        alert("Game Quit. You can close this tab.");
        if (window.quitLevel1) window.quitLevel1();
        if (window.quitLevel2) window.quitLevel2();
        if (window.quitLevel3) window.quitLevel3();
        if (window.quitCutscene) window.quitCutscene();
        document.body.innerHTML = "<h1 style='color:white; text-align:center; margin-top:20%'>Game Closed</h1>";
    });
    
    // Next Level Popup Buttons
    document.getElementById('btn-next-level').addEventListener('click', () => {
        document.getElementById('next-level-popup').style.display = 'none';
        if (window.quitLevel1) window.quitLevel1();
        if (window.quitLevel2) window.quitLevel2();
        if (window.quitLevel3) window.quitLevel3();
        if (window.quitCutscene) window.quitCutscene();
        
        showTutorial(2);
    });
    
    document.getElementById('btn-win-title').addEventListener('click', () => {
        document.getElementById('next-level-popup').style.display = 'none';
        if (window.quitLevel1) window.quitLevel1();
        if (window.quitLevel2) window.quitLevel2();
        if (window.quitLevel3) window.quitLevel3();
        if (window.quitCutscene) window.quitCutscene();
        switchScreen('main-menu');
    });

    document.getElementById('btn-settings').addEventListener('click', () => {
        switchScreen('settings-menu');
    });

    document.getElementById('btn-credits').addEventListener('click', () => {
        switchScreen('credits-menu');
        const crawl = document.querySelector('.star-wars-content');
        if (crawl) {
            crawl.style.animation = 'none';
            void crawl.offsetWidth; // trigger reflow
            crawl.style.animation = 'crawl 40s linear forwards';
        }
    });

    // Settings Menu
    document.getElementById('btn-settings-back').addEventListener('click', () => {
        switchScreen('main-menu');
    });

    const volSlider = document.getElementById('volume-slider');
    volSlider.addEventListener('input', (e) => {
        uiState.volume = e.target.value;
        const vol = uiState.volume / 100;
        titleMusic.volume = vol;
        levelMusic.l2.volume = vol;
        levelMusic.l3.volume = vol;
    });

    const fpsCheck = document.getElementById('fps-checkbox');
    fpsCheck.addEventListener('change', (e) => {
        uiState.showFps = e.target.checked;
        document.getElementById('fps-counter').style.display = uiState.showFps ? 'block' : 'none';
    });

    const btnFullscreen = document.getElementById('btn-fullscreen');
    btnFullscreen.addEventListener('click', () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(err => {
                console.log(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
            });
        } else {
            document.exitFullscreen();
        }
    });
    
    const skinSelect = document.getElementById('skin-select');
    skinSelect.addEventListener('change', (e) => {
        uiState.skin = e.target.value;
    });

    // Credits Menu
    document.getElementById('btn-credits-back').addEventListener('click', () => {
        switchScreen('main-menu');
    });

    const skipBtn = document.getElementById('btn-skip-cutscene');
    if (skipBtn) {
        skipBtn.addEventListener('click', () => {
            if (window.quitCutscene) window.quitCutscene();
        });
    }

    // Victory Screen Buttons
    document.getElementById('btn-victory-credits').addEventListener('click', () => {
        if (window.quitLevel1) window.quitLevel1();
        if (window.quitLevel2) window.quitLevel2();
        if (window.quitLevel3) window.quitLevel3();
        if (window.quitCutscene) window.quitCutscene();
        switchScreen('credits-menu');
    });

    document.getElementById('btn-victory-home').addEventListener('click', () => {
        if (window.quitLevel1) window.quitLevel1();
        if (window.quitLevel2) window.quitLevel2();
        if (window.quitLevel3) window.quitLevel3();
        if (window.quitCutscene) window.quitCutscene();
        switchScreen('main-menu');
    });

    const crawlElement = document.querySelector('.star-wars-content');
    if (crawlElement) {
        crawlElement.addEventListener('animationend', () => {
            if (uiState.currentScreen === 'credits-menu') {
                const overlay = document.getElementById('prompt-count-overlay');
                const pText = document.getElementById('prompt-count-text');
                
                // Show overlay (starts transparent black)
                overlay.style.display = 'flex';
                void overlay.offsetWidth;
                
                // 1. Fade overlay to solid black & fade out music
                overlay.style.opacity = '1';
                crossfadeMusic(null);
                
                setTimeout(() => {
                    // 2. Music and screen are now fully faded.
                    // Now gradually fade in the text.
                    pText.style.opacity = '1';
                    
                    setTimeout(() => {
                        // 3. Text has faded in. Let it sit for a bit.
                        
                        setTimeout(() => {
                            // 4. Gradually fade out the text.
                            pText.style.opacity = '0';
                            
                            setTimeout(() => {
                                // 5. Text is gone. Give a pause of 2 seconds (pure black).
                                
                                setTimeout(() => {
                                    // 6. Change to main menu (starts title music) and fade out black screen!
                                    switchScreen('main-menu');
                                    overlay.style.opacity = '0';
                                    
                                    setTimeout(() => {
                                        // 7. Done.
                                        overlay.style.display = 'none';
                                    }, 2000); // Wait for black screen to fade
                                }, 2000); // 2 second pause in pure black
                            }, 2000); // Wait for text to fade out
                        }, 3000); // Time text stays fully visible
                    }, 2000); // Wait for text to fade in
                }, 2000); // Wait for black fade and music fade
            }
        });
    }
}



