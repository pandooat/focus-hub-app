 <script type="module">
        // Konfigurasi Firebase Anda (diambil dari environment)
        const firebaseConfig = typeof __firebase_config !== 'undefined' 
            ? JSON.parse(__firebase_config) 
            : { apiKey: "AIza...", authDomain: "...", projectId: "..." }; // Fallback jika tidak tersedia
        const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-focus-hub';

        // Impor fungsi yang diperlukan dari SDK
                 import { initializeApp } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-app.js";
           import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-analytics.js";
           // TODO: Add SDKs for Firebase products that you want to use
           // https://firebase.google.com/docs/web/setup#available-libraries
         
           // Your web app's Firebase configuration
           // For Firebase JS SDK v7.20.0 and later, measurementId is optional
           const firebaseConfig = {
             apiKey: "AIzaSyCpUbA7HQYKNxhCJm3cyBE7nB6GP9Xx-5w",
             authDomain: "focus-hub-app-705b8.firebaseapp.com",
             projectId: "focus-hub-app-705b8",
             storageBucket: "focus-hub-app-705b8.firebasestorage.app",
             messagingSenderId: "421397260571",
             appId: "1:421397260571:web:eed97cae13bc4706b98bbe",
             measurementId: "G-9WPKKHSSFN"
           };

  // Initialize Firebase
        const app = initializeApp(firebaseConfig);
        const analytics = getAnalytics(app);
        const auth = getAuth(app);
        const db = getFirestore(app);

        let userId = null;
        let tasksCollectionRef = null;
        let unsubscribeTasks = null;

        // --- Logika Timer ---
        const timerDisplay = document.getElementById('timer-display');
        const cycleDisplay = document.getElementById('cycle-display');
        const pauseBtn = document.getElementById('pause-btn');
        const resetBtn = document.getElementById('reset-btn');
        const skipBtn = document.getElementById('skip-btn');

        let timerInterval;
        let timeLeft = 1500; // 25 menit
        let isPaused = true;
        let currentCycle = 1;
        let isFocusTime = true;
        const focusDuration = 1500; // 25 menit
        const breakDuration = 300; // 5 menit

        function updateTimerDisplay() {
            const minutes = Math.floor(timeLeft / 60);
            const seconds = timeLeft % 60;
            timerDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }

        function startTimer() {
            isPaused = false;
            pauseBtn.textContent = 'Pause';
            timerInterval = setInterval(() => {
                timeLeft--;
                updateTimerDisplay();
                if (timeLeft <= 0) {
                    clearInterval(timerInterval);
                    switchCycle();
                }
            }, 1000);
        }
        
        function pauseTimer() {
            isPaused = true;
            pauseBtn.textContent = 'Resume';
            clearInterval(timerInterval);
        }

        function switchCycle() {
            isFocusTime = !isFocusTime;
            if (isFocusTime) {
                currentCycle++;
                timeLeft = focusDuration;
                cycleDisplay.textContent = `Cycle ${currentCycle} - Focus Time`;
            } else {
                timeLeft = breakDuration;
                cycleDisplay.textContent = `Cycle ${currentCycle} - Break Time`;
            }
            updateTimerDisplay();
            isPaused = true;
            pauseBtn.textContent = 'Start';
        }
        
        function resetTimer() {
            pauseTimer();
            isPaused = true;
            timeLeft = isFocusTime ? focusDuration : breakDuration;
            updateTimerDisplay();
            pauseBtn.textContent = 'Start';
        }

        pauseBtn.addEventListener('click', () => {
            if (isPaused) {
                startTimer();
            } else {
                pauseTimer();
            }
        });

        resetBtn.addEventListener('click', resetTimer);
        skipBtn.addEventListener('click', switchCycle);

        updateTimerDisplay(); // Inisialisasi tampilan awal

        // --- Logika Audio (Tone.js) ---
        let pannerL, pannerR, oscL, oscR, volumeNode;
        let isAudioPlaying = false;
        const baseFreqSlider = document.getElementById('base-freq');
        const beatFreqSlider = document.getElementById('beat-freq');
        const volumeSlider = document.getElementById('volume');
        const playStopBtn = document.getElementById('play-stop-audio-btn');
        const audioStatusType = document.getElementById('audio-status-type');
        const audioStatusPlaying = document.getElementById('audio-status-playing');

        function setupAudio() {
            pannerL = new Tone.Panner(-1).toDestination();
            pannerR = new Tone.Panner(1).toDestination();
            oscL = new Tone.Oscillator().connect(pannerL);
            oscR = new Tone.Oscillator().connect(pannerR);
            volumeNode = new Tone.Volume(-10).toDestination(); // Default volume
            oscL.connect(volumeNode);
            oscR.connect(volumeNode);
        }

        function playAudio() {
            if (Tone.context.state !== 'running') {
                Tone.context.resume();
            }
            if (!oscL) setupAudio(); // Inisialisasi jika belum ada
            
            updateFrequencies();
            updateVolume();

            oscL.start();
            oscR.start();
            isAudioPlaying = true;
            playStopBtn.textContent = 'Stop Audio';
            audioStatusPlaying.textContent = 'Playing binaural beats...';
            playStopBtn.classList.remove('btn-primary');
            playStopBtn.classList.add('bg-red-500', 'text-white', 'hover:bg-red-600');
        }

        function stopAudio() {
            if (oscL) {
                oscL.stop();
                oscR.stop();
                // Hancurkan osilator untuk memulai kembali dengan bersih
                oscL.dispose();
                oscR.dispose();
                pannerL.dispose();
                pannerR.dispose();
                oscL = null; // Set ke null
            }
            isAudioPlaying = false;
            playStopBtn.textContent = 'Play Audio';
            audioStatusPlaying.textContent = '';
            playStopBtn.classList.add('btn-primary');
            playStopBtn.classList.remove('bg-red-500', 'text-white', 'hover:bg-red-600');
        }
        
        function updateFrequencies() {
            const baseFreq = parseFloat(baseFreqSlider.value);
            const beatFreq = parseFloat(beatFreqSlider.value);
            if (oscL) {
                oscL.frequency.value = baseFreq - (beatFreq / 2);
                oscR.frequency.value = baseFreq + (beatFreq / 2);
            }
             document.getElementById('base-freq-value').textContent = baseFreq.toFixed(0);
             document.getElementById('beat-freq-value').textContent = beatFreq.toFixed(1);
        }

        function updateVolume() {
            const vol = volumeSlider.value;
            // Konversi 0-100 ke skala desibel (logaritmik) yang lebih alami
            // -40dB hampir senyap, 0dB adalah volume penuh
            const db = vol > 0 ? Tone.gainToDb(vol / 100) : -Infinity;
            if (volumeNode) {
                volumeNode.volume.value = db;
            }
            document.getElementById('volume-value').textContent = vol;
        }

        playStopBtn.addEventListener('click', () => {
             isAudioPlaying ? stopAudio() : playAudio();
        });

        baseFreqSlider.addEventListener('input', updateFrequencies);
        beatFreqSlider.addEventListener('input', updateFrequencies);
        volumeSlider.addEventListener('input', updateVolume);

        document.querySelectorAll('.audio-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const freq = btn.dataset.freq;
                const type = btn.dataset.type;
                beatFreqSlider.value = freq;
                audioStatusType.textContent = type;
                updateFrequencies();
            });
        });


        // --- Logika Pengelola Tugas (Firestore & Drag-and-Drop) ---
        const newTaskInput = document.getElementById('new-task-input');
        const addTaskBtn = document.getElementById('add-task-btn');
        const taskColumns = document.querySelectorAll('.task-column');
        const userIdDisplay = document.getElementById('user-id-display');

        function renderTasks(tasks) {
            // Bersihkan kolom
            taskColumns.forEach(col => col.innerHTML = '');

            // Tambahkan task ke kolom yang sesuai
            tasks.forEach(task => {
                const taskEl = document.createElement('div');
                taskEl.classList.add('task');
                taskEl.setAttribute('draggable', 'true');
                taskEl.dataset.id = task.id;
                taskEl.textContent = task.text;
                
                // Tambahkan tombol hapus
                const deleteBtn = document.createElement('button');
                deleteBtn.innerHTML = '&times;';
                deleteBtn.className = 'float-right text-gray-400 hover:text-white font-bold';
                deleteBtn.onclick = (e) => {
                    e.stopPropagation(); // Hindari memicu drag
                    deleteTask(task.id);
                };
                taskEl.appendChild(deleteBtn);
                
                document.getElementById(task.status).appendChild(taskEl);
            });
            addDragListeners();
        }

        async function addTask() {
            const taskText = newTaskInput.value.trim();
            if (taskText === '' || !tasksCollectionRef) return;
            try {
                await addDoc(tasksCollectionRef, {
                    text: taskText,
                    status: 'todo', // Status awal
                    createdAt: new Date()
                });
                newTaskInput.value = '';
            } catch (error) {
                console.error("Error adding document: ", error);
            }
        }
        
        async function updateTaskStatus(taskId, newStatus) {
            if (!userId) return;
            const taskDocRef = doc(db, `artifacts/${appId}/users/${userId}/tasks`, taskId);
            try {
                await updateDoc(taskDocRef, { status: newStatus });
            } catch (error) {
                console.error("Error updating document:", error);
            }
        }

        async function deleteTask(taskId) {
            if (!userId) return;
            const taskDocRef = doc(db, `artifacts/${appId}/users/${userId}/tasks`, taskId);
            try {
                await deleteDoc(taskDocRef);
            } catch (error) {
                console.error("Error deleting document:", error);
            }
        }

        addTaskBtn.addEventListener('click', addTask);
        newTaskInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') addTask();
        });

        // Logika Drag and Drop
        let draggedTaskId = null;

        function addDragListeners() {
            const tasks = document.querySelectorAll('.task');
            tasks.forEach(task => {
                task.addEventListener('dragstart', () => {
                    task.classList.add('dragging');
                    draggedTaskId = task.dataset.id;
                });
                task.addEventListener('dragend', () => {
                    task.classList.remove('dragging');
                    draggedTaskId = null;
                });
            });
        }
        
        taskColumns.forEach(column => {
            column.addEventListener('dragover', e => {
                e.preventDefault();
                column.classList.add('drag-over');
            });
             column.addEventListener('dragleave', () => {
                column.classList.remove('drag-over');
            });
            column.addEventListener('drop', e => {
                e.preventDefault();
                column.classList.remove('drag-over');
                const newStatus = column.id;
                if (draggedTaskId) {
                    updateTaskStatus(draggedTaskId, newStatus);
                }
            });
        });

        // Inisialisasi otentikasi dan data
        onAuthStateChanged(auth, (user) => {
            if (user) {
                userId = user.uid;
                userIdDisplay.textContent = userId;
                
                // Set referensi koleksi setelah mendapatkan userId
                tasksCollectionRef = collection(db, `artifacts/${appId}/users/${userId}/tasks`);

                // Hentikan listener lama jika ada
                if (unsubscribeTasks) unsubscribeTasks(); 
                
                // Mulai listener realtime
                const q = query(tasksCollectionRef);
                unsubscribeTasks = onSnapshot(q, (snapshot) => {
                    const tasks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                    renderTasks(tasks);
                });

            } else {
                console.log("User is signed out");
                userId = null;
                userIdDisplay.textContent = 'Not logged in.';
                if (unsubscribeTasks) unsubscribeTasks();
            }
        });

        // Coba login dengan token kustom jika ada, jika tidak, login secara anonim
        async function authenticateUser() {
            try {
                const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;
                if (initialAuthToken) {
                    await signInWithCustomToken(auth, initialAuthToken);
                } else {
                    await signInAnonymously(auth);
                }
            } catch (error) {
                console.error("Authentication failed:", error);
                // Coba lagi login anonim jika token kustom gagal
                try {
                    await signInAnonymously(auth);
                } catch (anonError) {
                     console.error("Anonymous sign-in also failed:", anonError);
                }
            }
        }
        
        authenticateUser();

    </script>

