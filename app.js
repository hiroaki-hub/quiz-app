document.addEventListener('DOMContentLoaded', () => {
    // ===================================
    // 1. DOM要素の取得
    // ===================================
    const mainContainer = document.querySelector('.main-container');
    const modeSelectionView = document.getElementById('mode-selection-view');
    const genreSelectionView = document.getElementById('genre-selection-view');
    const quizView = document.getElementById('quiz-view');
    const resultsView = document.getElementById('results-view');
    const analysisView = document.getElementById('analysis-view');
    const countdownOverlay = document.getElementById('countdown-overlay');
    const countdownNumber = document.getElementById('countdown-number');

    const practiceModeBtn = document.getElementById('practice-mode-btn');
    const examModeBtn = document.getElementById('exam-mode-btn');
    const analysisModeBtn = document.getElementById('analysis-mode-btn');
    const quitQuizBtn = document.getElementById('quit-quiz-btn');
    let nextQuestionBtn = document.getElementById('next-question-btn'); // constからletに変更
    const backToTopBtn = document.getElementById('back-to-top-btn');
    const backFromAnalysisBtn = document.getElementById('back-from-analysis-btn');
    const resetHistoryBtn = document.getElementById('reset-history-btn');
    const genreButtonsContainer = document.getElementById('genre-buttons-container');
    const backToModeSelectionBtn = document.getElementById('back-to-mode-selection-btn');
    
    const questionNumberEl = document.getElementById('question-number');
    const questionTextEl = document.getElementById('question-text');
    const answerOptionsEl = document.getElementById('answer-options');
    const feedbackContainerEl = document.getElementById('feedback-container');
    const timerDisplay = document.getElementById('timer-display');
    const scoreSummaryEl = document.getElementById('score-summary');
    const resultsListEl = document.getElementById('results-list');
    const paginationControlsEl = document.getElementById('pagination-controls');
    const analysisResultsEl = document.getElementById('analysis-results');
    
    // --- クイズの状態管理 ---
    let allQuestions = [];
    let currentQuestions = [];
    let currentQuestionIndex = 0;
    let timerInterval;
    let userAnswers = [];

    // --- 初期化処理 ---
    fetch('questions.json')
        .then(response => response.ok ? response.json() : Promise.reject(new Error('File not found')))
        .then(data => {
            allQuestions = data;
            console.log('クイズデータの読み込みが完了しました。');
        })
        .catch(error => {
            console.error('データの読み込み中にエラーが発生しました:', error);
            alert('クイズデータの読み込みに失敗しました。ページをリロードしてください。');
        });

    // ===================================
    // 2. イベントリスナーの設定
    // ===================================
    practiceModeBtn.addEventListener('click', showGenreSelection);
    examModeBtn.addEventListener('click', startExamCountdown);
    analysisModeBtn.addEventListener('click', showAnalysis);

    backToModeSelectionBtn.addEventListener('click', () => {
        genreSelectionView.style.display = 'none';
        modeSelectionView.style.display = 'block';
    });

    quitQuizBtn.addEventListener('click', () => {
        Swal.fire({
            title: 'テストを中断しますか？',
            text: "ここまでの進捗は保存されません。",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'はい、中断します',
            cancelButtonText: 'キャンセル'
        }).then((result) => {
            if (result.isConfirmed) {
                clearInterval(timerInterval);
                quizView.style.display = 'none';
                modeSelectionView.style.display = 'block';
            }
        });
    });

    backToTopBtn.addEventListener('click', () => {
        document.body.classList.remove('results-active');
        resultsView.style.display = 'none';
        modeSelectionView.style.display = 'block';
    });
    
    backFromAnalysisBtn.addEventListener('click', () => {
        analysisView.style.display = 'none';
        mainContainer.style.display = 'block';
        modeSelectionView.style.display = 'block';
    });

    resetHistoryBtn.addEventListener('click', () => {
    // SweetAlert2で確認メッセージを表示
    Swal.fire({
        title: '本当にリセットしますか？',
        text: "すべての学習履歴が完全に削除され、元に戻すことはできません。",
        icon: 'error', // 警告より強い「エラー」アイコン
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'はい、削除します',
        cancelButtonText: 'キャンセル'
    }).then((result) => {
        // ユーザーが「はい」を押した場合
        if (result.isConfirmed) {
            // localStorageから履歴を削除
            localStorage.removeItem('quizHistory');
            
            // 分析画面を更新して「データがありません」と表示させる
            showAnalysis(); 
            
            // 削除完了メッセージを表示
            Swal.fire(
                '削除しました',
                '学習履歴がリセットされました。',
                'success'
            )
        }
    });
});

    // ===================================
    // 3. 主要な関数
    // ===================================

function startExamCountdown() {
    modeSelectionView.style.display = 'none';
    countdownOverlay.style.display = 'flex';
    let count = 3;
    countdownNumber.textContent = count;

    const countdownInterval = setInterval(() => {
        count--;
        if (count > 0) {
            countdownNumber.textContent = count;
        } else if (count === 0) {
            countdownNumber.textContent = 'Go!';
        } else {
            clearInterval(countdownInterval);
            countdownOverlay.style.display = 'none';
            startQuiz('exam');
        }
    }, 1000);
}

function showGenreSelection() {
    modeSelectionView.style.display = 'none';
    genreSelectionView.style.display = 'block';

    const genres = [...new Set(allQuestions.map(q => q.ジャンル))];
    genreButtonsContainer.innerHTML = '';

    const randomBtn = document.createElement('button');
    randomBtn.className = 'mode-btn random-btn';
    randomBtn.textContent = '全ジャンルからランダム';
    randomBtn.addEventListener('click', () => startQuiz('practice', 'random'));
    genreButtonsContainer.appendChild(randomBtn);

    genres.forEach(genre => {
        const btn = document.createElement('button');
        btn.className = 'mode-btn';
        btn.textContent = genre;
        btn.addEventListener('click', () => startQuiz('practice', genre));
        genreButtonsContainer.appendChild(btn);
    });
}

function startQuiz(mode, genre = 'random') {
    modeSelectionView.style.display = 'none';
    genreSelectionView.style.display = 'none';
    quizView.style.display = 'block';
    resultsView.style.display = 'none';
    analysisView.style.display = 'none';
    document.body.classList.remove('results-active');

    currentQuestionIndex = 0;
    userAnswers = [];

    let questionsToUse = allQuestions;

    if (mode === 'practice') {
        if (genre !== 'random') {
            questionsToUse = allQuestions.filter(q => q.ジャンル === genre);
        }
        const practiceQuestionCount = Math.min(questionsToUse.length, 10);
        currentQuestions = shuffleAndPickQuestions(questionsToUse, practiceQuestionCount);
        timerDisplay.style.display = 'none';
    } else { // exam mode
        // 本番モード：60問をランダムに選ぶ
        const examQuestionCount = Math.min(allQuestions.length, 60);
        currentQuestions = shuffleAndPickQuestions(allQuestions, examQuestionCount);
        // 制限時間を60分に設定
        startTimer(3600);
    }

    if (currentQuestions.length > 0) {
        displayQuestion(currentQuestionIndex, mode);
    } else {
        alert('クイズを開始できません。選択されたジャンルの問題がありません。');
        genreSelectionView.style.display = 'none';
        modeSelectionView.style.display = 'block';
        quizView.style.display = 'none';
    }
}

function displayQuestion(index, mode) {
    feedbackContainerEl.innerHTML = '';
    nextQuestionBtn.style.display = 'none';
    const question = currentQuestions[index];
    const isMultipleChoice = Array.isArray(question.正解); // ★複数選択か判定

    questionNumberEl.textContent = `問題 ${index + 1}`;
    questionTextEl.textContent = question.問題文;
    answerOptionsEl.innerHTML = '';

    ['a', 'b', 'c', 'd'].forEach(choice => {
        const button = document.createElement('button');
        button.className = 'option-btn';
        button.dataset.choice = choice;
        button.innerHTML = `<span class="choice-prefix">${choice}.</span><span class="choice-text">${question[`選択肢${choice}`]}</span>`;
        
        if (isMultipleChoice) {
            // 複数選択の場合：クリックで選択/解除を切り替える
            button.addEventListener('click', () => {
                button.classList.toggle('selected');
            });
        } else {
            // 単一選択の場合：これまで通りの処理
            const action = mode === 'practice' ? () => checkAnswer(choice) : () => recordAnswerAndProceed(choice);
            button.addEventListener('click', action);
        }
        answerOptionsEl.appendChild(button);
    });

    // 複数選択問題の場合、「解答を確定」ボタンを常に表示
    if (isMultipleChoice) {
        nextQuestionBtn.textContent = '解答を確定';
        nextQuestionBtn.style.display = 'block';
        
        // 複数選択用のイベントリスナーを一度だけ設定
        const newNextBtn = nextQuestionBtn.cloneNode(true);
        nextQuestionBtn.parentNode.replaceChild(newNextBtn, nextQuestionBtn);
        nextQuestionBtn = newNextBtn; // グローバル変数を更新

        const action = mode === 'practice' ? () => checkAnswer(null, true) : () => recordAnswerAndProceed(null, true);
        nextQuestionBtn.addEventListener('click', action);
    } else {
        nextQuestionBtn.textContent = '次の問題へ'; // テキストを元に戻す
    }
}

    function startTimer(durationInSeconds) {
        let timer = durationInSeconds;
        timerDisplay.style.display = 'block';
        if (timerInterval) clearInterval(timerInterval);
        timerInterval = setInterval(() => {
            timerDisplay.textContent = `${String(Math.floor(timer / 60)).padStart(2, '0')}:${String(timer % 60).padStart(2, '0')}`;
            if (--timer < 0) {
                clearInterval(timerInterval);
                alert('時間切れです');
                showResults();
            }
        }, 1000);
    }

    // --- 解答処理 ---
function recordAnswerAndProceed(selectedChoice, isMultiple = false) {
    const currentQuestion = currentQuestions[currentQuestionIndex];
    let userAnswer;

    if (isMultiple) {
        const selectedNodes = answerOptionsEl.querySelectorAll('.option-btn.selected');
        userAnswer = Array.from(selectedNodes).map(node => node.dataset.choice).sort();
    } else {
        userAnswer = selectedChoice;
    }

    userAnswers.push({ questionId: currentQuestion.id, userAnswer: userAnswer });
    currentQuestionIndex++;

    if (currentQuestionIndex < currentQuestions.length) {
        displayQuestion(currentQuestionIndex, 'exam');
    } else {
        showResults();
    }
}

function checkAnswer(selectedChoice, isMultiple = false) {
    const currentQuestion = currentQuestions[currentQuestionIndex];
    const correctAnswer = currentQuestion.正解;
    let userAnswer;
    let isCorrect;

    answerOptionsEl.querySelectorAll('.option-btn').forEach(btn => btn.disabled = true);
    const feedbackEl = document.createElement('div');

    if (isMultiple) {
        const selectedNodes = answerOptionsEl.querySelectorAll('.option-btn.selected');
        userAnswer = Array.from(selectedNodes).map(node => node.dataset.choice).sort();
        // 配列を比較するために文字列に変換
        isCorrect = JSON.stringify(userAnswer) === JSON.stringify([...correctAnswer].sort());
    } else {
        userAnswer = selectedChoice;
        isCorrect = userAnswer === correctAnswer;
    }

    userAnswers.push({ questionId: currentQuestion.id, userAnswer: userAnswer });

    if (isCorrect) {
        feedbackEl.innerHTML = '<h3>正解！</h3>';
        // 正解した選択肢をハイライト
        const choices = Array.isArray(userAnswer) ? userAnswer : [userAnswer];
        choices.forEach(choice => {
            answerOptionsEl.querySelector(`[data-choice='${choice}']`).classList.add('correct');
        });
    } else {
        feedbackEl.innerHTML = '<h3>不正解…</h3>';
        // 不正解の選択肢と正解をハイライト
        const userChoices = Array.isArray(userAnswer) ? userAnswer : [userAnswer];
        const correctChoices = Array.isArray(correctAnswer) ? correctAnswer : [correctAnswer];
        
        userChoices.forEach(choice => {
            if (!correctChoices.includes(choice)) {
                answerOptionsEl.querySelector(`[data-choice='${choice}']`).classList.add('incorrect');
            }
        });
        correctChoices.forEach(choice => {
            answerOptionsEl.querySelector(`[data-choice='${choice}']`).classList.add('correct');
        });
    }

    feedbackEl.innerHTML += `<p><strong>解説：</strong> ${currentQuestion.解説}</p>`;
    feedbackContainerEl.appendChild(feedbackEl);
    nextQuestionBtn.textContent = '次の問題へ';
    nextQuestionBtn.style.display = 'block';

    // 練習モードの「次の問題へ」のイベントリスナーを再設定
    const newNextBtn = nextQuestionBtn.cloneNode(true);
    nextQuestionBtn.parentNode.replaceChild(newNextBtn, nextQuestionBtn);
    nextQuestionBtn = newNextBtn;
    newNextBtn.addEventListener('click', () => {
        currentQuestionIndex++;
        if (currentQuestionIndex < currentQuestions.length) {
            displayQuestion(currentQuestionIndex, 'practice');
        } else {
            showResults();
        }
    });
}

    // --- 結果と分析の表示 ---
    function showResults() {
        document.body.classList.add('results-active');
        clearInterval(timerInterval);
        quizView.style.display = 'none';
        resultsView.style.display = 'block';

        let correctCount = 0;
        const userAnswerMap = new Map(userAnswers.map(ans => [ans.questionId, ans.userAnswer]));
        currentQuestions.forEach(question => {
            const userAnswer = userAnswerMap.get(question.id);
            let isCorrect = false;
            if (Array.isArray(question.正解)) {
                // 複数選択の判定
                isCorrect = JSON.stringify(userAnswer) === JSON.stringify([...question.正解].sort());
            } else {
                // 単一選択の判定
                isCorrect = userAnswer === question.正解;
            }
            if (isCorrect) {
                correctCount++;
            }
        });

        const score = currentQuestions.length > 0 ? Math.round((correctCount / currentQuestions.length) * 100) : 0;
        scoreSummaryEl.innerHTML = `正解率: <span>${score}%</span> (${correctCount} / ${currentQuestions.length} 問)`;
        
        const history = JSON.parse(localStorage.getItem('quizHistory')) || [];
        const testResult = {
            date: new Date().toISOString(),
            score: score,
            answers: userAnswers
        };
        history.push(testResult);
        localStorage.setItem('quizHistory', JSON.stringify(history));

        setupPagination();
        displayResultsPage(1);
    }

    function displayResultsPage(pageNumber) {
        const itemsPerPage = 20;
        const startIndex = (pageNumber - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const pageQuestions = currentQuestions.slice(startIndex, endIndex);
        const userAnswerMap = new Map(userAnswers.map(ans => [ans.questionId, ans.userAnswer]));
        resultsListEl.innerHTML = '';

        const getAnswerText = (question, choice) => {
            if (!choice || (Array.isArray(choice) && choice.length === 0)) {
                return '無回答';
            }
            if (Array.isArray(choice)) {
                return choice.map(c => `${c}. ${question[`選択肢${c}`]}`).join('<br>');
            } else {
                return `${choice}. ${question[`選択肢${choice}`]}`;
            }
        };

        pageQuestions.forEach((question, index) => {
            const overallIndex = startIndex + index;
            const userAnswer = userAnswerMap.get(question.id);
            let isCorrect = false;

            if (Array.isArray(question.正解)) {
                // 複数選択の判定
                isCorrect = JSON.stringify(userAnswer) === JSON.stringify([...question.正解].sort());
            } else {
                // 単一選択の判定
                isCorrect = userAnswer === question.正解;
            }

            const userAnswerText = getAnswerText(question, userAnswer);
            const correctAnswerText = getAnswerText(question, question.正解);

            const resultItem = document.createElement('div');
            resultItem.className = `result-item ${isCorrect ? 'correct' : 'incorrect'}`;
            resultItem.innerHTML = `
                <div class="result-question">
                    <span class="result-q-number">問題 ${overallIndex + 1} (ID: ${question.id})</span>
                    <p class="result-q-text">${question.問題文}</p>
                </div>
                <div class="result-answers">
                    <p>あなたの解答: <span class="user-answer ${isCorrect ? '' : 'incorrect-choice'}">${userAnswerText}</span></p>
                    <p>正解: <span class="correct-answer">${correctAnswerText}</span></p>
                </div>
                <div class="result-explanation">
                    <p><strong>解説:</strong> ${question.解説}</p>
                </div>
            `;
            resultsListEl.appendChild(resultItem);
        });

        document.querySelectorAll('.page-btn').forEach(btn => {
            btn.classList.toggle('active', parseInt(btn.dataset.page) === pageNumber);
        });
        window.scrollTo(0, 0);
    }

    function setupPagination() {
        paginationControlsEl.innerHTML = '';
        const itemsPerPage = 20;
        const totalPages = Math.ceil(currentQuestions.length / itemsPerPage);

        for (let i = 1; i <= totalPages; i++) {
            const pageBtn = document.createElement('button');
            pageBtn.className = 'page-btn';
            pageBtn.textContent = i;
            pageBtn.dataset.page = i;
            pageBtn.addEventListener('click', () => displayResultsPage(i));
            paginationControlsEl.appendChild(pageBtn);
        }
    }

    function showAnalysis() {
        mainContainer.style.display = 'none';
        modeSelectionView.style.display = 'none';
        analysisView.style.display = 'block';
        
        const history = JSON.parse(localStorage.getItem('quizHistory')) || [];
        analysisResultsEl.innerHTML = '';

        if (history.length === 0) {
            analysisResultsEl.innerHTML = '<p>分析できるテスト結果がありません。</p>';
            return;
        }

        const genreStats = {}; 
        history.forEach(testResult => {
            testResult.answers.forEach(answer => {
                const question = allQuestions.find(q => q.id === answer.questionId);
                if (question) {
                    const genre = question.ジャンル;
                    if (!genreStats[genre]) {
                        genreStats[genre] = { correct: 0, total: 0 };
                    }
                    genreStats[genre].total++;
                    let isCorrect = false;
                    if (Array.isArray(question.正解)) {
                        // 複数選択の判定
                        isCorrect = JSON.stringify(answer.userAnswer) === JSON.stringify([...question.正解].sort());
                    } else {
                        // 単一選択の判定
                        isCorrect = answer.userAnswer === question.正解;
                    }

                    if (isCorrect) {
                        genreStats[genre].correct++;
                    }
                }
            });
        });

        let tableHTML = `
            <table>
                <thead>
                    <tr><th>ジャンル</th><th>正解率</th><th>正解数 / 解答数</th></tr>
                </thead>
                <tbody>`;

        const sortedGenres = Object.entries(genreStats).sort((a, b) => {
            const rateA = a[1].total > 0 ? (a[1].correct / a[1].total) : 0;
            const rateB = b[1].total > 0 ? (b[1].correct / b[1].total) : 0;
            return rateA - rateB;
        });

        sortedGenres.forEach(([genre, stats]) => {
            const percentage = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0;
            tableHTML += `
                <tr>
                    <td>${genre}</td>
                    <td>${percentage}%</td>
                    <td>${stats.correct} / ${stats.total}</td>
                </tr>`;
        });

        tableHTML += '</tbody></table>';
        analysisResultsEl.innerHTML = tableHTML;
    }

    // --- ユーティリティ関数 ---
    function shuffleAndPickQuestions(array, count) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled.slice(0, count);
    }

}); // DOMContentLoadedの最終的な閉じタグ