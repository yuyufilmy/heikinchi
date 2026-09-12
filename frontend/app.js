const API_BASE = "http://127.0.0.1:8000";

let USER_ID = null;

const USER_ID_KEY = "heikinnchi_user_id";
const USER_NAME_KEY = "heikinnchi_username";

// ==================================================
// 状態
// ==================================================

let questions = [];
let currentQuestionIndex = 0;
let selectedOptionId = null;

let currentType = "extra";
let isOverallResultPage = false;

let currentFilter = "all";

let answeredQuestionIds = new Set();

let categories = [];

let authenticationSetupDone = false;


// ==================================================
// 認証画面
// ==================================================

function showLoginPage() {

    const loginSection =
        document.getElementById(
            "loginSection"
        );

    const registrationSection =
        document.getElementById(
            "registrationSection"
        );

    const appContainer =
        document.getElementById(
            "appContainer"
        );


    if (loginSection) {

        loginSection.style.display = "flex";
    }


    if (registrationSection) {

        registrationSection.style.display = "none";
    }


    if (appContainer) {

        appContainer.style.display = "none";
    }


    const usernameInput =
        document.getElementById(
            "loginUsernameInput"
        );


    if (usernameInput) {

        setTimeout(() => {

            usernameInput.focus();

        }, 100);
    }
}


// ==================================================
// 新規登録画面
// ==================================================

function showRegistrationPage() {

    const loginSection =
        document.getElementById(
            "loginSection"
        );

    const registrationSection =
        document.getElementById(
            "registrationSection"
        );

    const appContainer =
        document.getElementById(
            "appContainer"
        );


    if (loginSection) {

        loginSection.style.display = "none";
    }


    if (registrationSection) {

        registrationSection.style.display = "flex";
    }


    if (appContainer) {

        appContainer.style.display = "none";
    }


    clearAuthenticationErrors();


    const usernameInput =
        document.getElementById(
            "registerUsernameInput"
        );


    if (usernameInput) {

        setTimeout(() => {

            usernameInput.focus();

        }, 100);
    }
}


// ==================================================
// アプリ画面
// ==================================================

function showAppPage() {

    const loginSection =
        document.getElementById(
            "loginSection"
        );

    const registrationSection =
        document.getElementById(
            "registrationSection"
        );

    const appContainer =
        document.getElementById(
            "appContainer"
        );


    if (loginSection) {

        loginSection.style.display = "none";
    }


    if (registrationSection) {

        registrationSection.style.display = "none";
    }


    if (appContainer) {

        appContainer.style.display = "block";
    }
}


// ==================================================
// 認証イベント設定
// ==================================================

function setupAuthentication() {

    if (authenticationSetupDone) {

        return;
    }


    authenticationSetupDone = true;


    const loginButton =
        document.getElementById(
            "loginButton"
        );

    const loginUsernameInput =
        document.getElementById(
            "loginUsernameInput"
        );

    const loginPasswordInput =
        document.getElementById(
            "loginPasswordInput"
        );

    const showRegisterButton =
        document.getElementById(
            "showRegisterButton"
        );

    const registerButton =
        document.getElementById(
            "registerButton"
        );

    const registerUsernameInput =
        document.getElementById(
            "registerUsernameInput"
        );

    const registerPasswordInput =
        document.getElementById(
            "registerPasswordInput"
        );

    const registerPasswordConfirmInput =
        document.getElementById(
            "registerPasswordConfirmInput"
        );

    const showLoginButton =
        document.getElementById(
            "showLoginButton"
        );


    // ==================================================
    // ログイン
    // ==================================================

    if (loginButton) {

        loginButton.addEventListener(
            "click",
            loginUser
        );
    }


    if (loginUsernameInput) {

        loginUsernameInput.addEventListener(
            "keydown",
            event => {

                if (event.key === "Enter") {

                    event.preventDefault();

                    loginUser();
                }
            }
        );
    }


    if (loginPasswordInput) {

        loginPasswordInput.addEventListener(
            "keydown",
            event => {

                if (event.key === "Enter") {

                    event.preventDefault();

                    loginUser();
                }
            }
        );
    }


    // ==================================================
    // 新規登録画面へ
    // ==================================================

    if (showRegisterButton) {

        showRegisterButton.addEventListener(
            "click",
            () => {

                showRegistrationPage();
            }
        );
    }


    // ==================================================
    // 新規登録
    // ==================================================

    if (registerButton) {

        registerButton.addEventListener(
            "click",
            registerUser
        );
    }


    if (registerUsernameInput) {

        registerUsernameInput.addEventListener(
            "keydown",
            event => {

                if (event.key === "Enter") {

                    event.preventDefault();

                    registerUser();
                }
            }
        );
    }


    if (registerPasswordInput) {

        registerPasswordInput.addEventListener(
            "keydown",
            event => {

                if (event.key === "Enter") {

                    event.preventDefault();

                    registerUser();
                }
            }
        );
    }


    if (registerPasswordConfirmInput) {

        registerPasswordConfirmInput.addEventListener(
            "keydown",
            event => {

                if (event.key === "Enter") {

                    event.preventDefault();

                    registerUser();
                }
            }
        );
    }


    // ==================================================
    // ログイン画面へ
    // ==================================================

    if (showLoginButton) {

        showLoginButton.addEventListener(
            "click",
            () => {

                showLoginPage();
            }
        );
    }
}


// ==================================================
// 認証エラークリア
// ==================================================

function clearAuthenticationErrors() {

    const loginError =
        document.getElementById(
            "loginError"
        );

    const registrationError =
        document.getElementById(
            "registrationError"
        );


    if (loginError) {

        loginError.textContent = "";
    }


    if (registrationError) {

        registrationError.textContent = "";
    }
}


// ==================================================
// ログイン
// ==================================================

async function loginUser() {

    const usernameInput =
        document.getElementById(
            "loginUsernameInput"
        );

    const passwordInput =
        document.getElementById(
            "loginPasswordInput"
        );

    const button =
        document.getElementById(
            "loginButton"
        );

    const errorElement =
        document.getElementById(
            "loginError"
        );


    if (
        !usernameInput ||
        !passwordInput ||
        !button ||
        !errorElement
    ) {

        return;
    }


    const username =
        usernameInput.value.trim();

    const password =
        passwordInput.value;


    errorElement.textContent = "";


    if (!username) {

        errorElement.textContent =
            "ユーザー名を入力してください";

        usernameInput.focus();

        return;
    }


    if (!password) {

        errorElement.textContent =
            "パスワードを入力してください";

        passwordInput.focus();

        return;
    }


    if (button.disabled) {

        return;
    }


    button.disabled = true;

    button.textContent =
        "ログイン中...";


    try {

        const response =
            await fetch(
                `${API_BASE}/users/login`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({

                        username:
                            username,

                        password:
                            password

                    })
                }
            );


        let data = null;


        try {

            data =
                await response.json();

        } catch {

            data = null;
        }


        if (!response.ok) {

            throw new Error(
                data?.detail ||
                "ログインに失敗しました"
            );
        }


        if (!data || !data.id) {

            throw new Error(
                "ログイン情報が正しくありません"
            );
        }


        USER_ID =
            Number(data.id);


        localStorage.setItem(
            USER_ID_KEY,
            String(USER_ID)
        );


        localStorage.setItem(
            USER_NAME_KEY,
            data.username || username
        );


        passwordInput.value = "";


        showAppPage();

        await initialize();


    } catch (error) {

        console.error(
            "ログインエラー:",
            error
        );


        errorElement.textContent =
            error.message ||
            "ログインに失敗しました";


    } finally {

        button.disabled = false;

        button.textContent =
            "ログイン";
    }
}


// ==================================================
// 新規登録
// ==================================================

async function registerUser() {

    const usernameInput =
        document.getElementById(
            "registerUsernameInput"
        );

    const passwordInput =
        document.getElementById(
            "registerPasswordInput"
        );

    const passwordConfirmInput =
        document.getElementById(
            "registerPasswordConfirmInput"
        );

    const button =
        document.getElementById(
            "registerButton"
        );

    const errorElement =
        document.getElementById(
            "registrationError"
        );


    if (
        !usernameInput ||
        !passwordInput ||
        !passwordConfirmInput ||
        !button ||
        !errorElement
    ) {

        return;
    }


    const username =
        usernameInput.value.trim();

    const password =
        passwordInput.value;

    const passwordConfirm =
        passwordConfirmInput.value;


    errorElement.textContent = "";


    if (!username) {

        errorElement.textContent =
            "ユーザー名を入力してください";

        usernameInput.focus();

        return;
    }


    if (username.length < 3) {

        errorElement.textContent =
            "ユーザー名は3文字以上で入力してください";

        usernameInput.focus();

        return;
    }


    if (username.length > 100) {

        errorElement.textContent =
            "ユーザー名は100文字以内で入力してください";

        usernameInput.focus();

        return;
    }


    if (!password) {

        errorElement.textContent =
            "パスワードを入力してください";

        passwordInput.focus();

        return;
    }


    if (password.length < 8) {

        errorElement.textContent =
            "パスワードは8文字以上で入力してください";

        passwordInput.focus();

        return;
    }


    if (password.length > 200) {

        errorElement.textContent =
            "パスワードは200文字以内で入力してください";

        passwordInput.focus();

        return;
    }


    if (!passwordConfirm) {

        errorElement.textContent =
            "確認用パスワードを入力してください";

        passwordConfirmInput.focus();

        return;
    }


    if (password !== passwordConfirm) {

        errorElement.textContent =
            "パスワードが一致していません";

        passwordConfirmInput.focus();

        return;
    }


    if (button.disabled) {

        return;
    }


    button.disabled = true;

    button.textContent =
        "登録中...";


    try {

        console.log(
            "ユーザー登録開始:",
            username
        );


        const response =
            await fetch(
                `${API_BASE}/users/register`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({

                        username:
                            username,

                        password:
                            password

                    })
                }
            );


        let data = null;


        try {

            data =
                await response.json();

        } catch {

            data = null;
        }


        console.log(
            "ユーザー登録レスポンス:",
            response.status,
            data
        );


        if (!response.ok) {

            throw new Error(
                data?.detail ||
                `ユーザー登録に失敗しました (HTTP ${response.status})`
            );
        }


        if (!data || !data.id) {

            throw new Error(
                "登録は成功しましたが、ユーザー情報を取得できませんでした"
            );
        }


        USER_ID =
            Number(data.id);


        localStorage.setItem(
            USER_ID_KEY,
            String(USER_ID)
        );


        localStorage.setItem(
            USER_NAME_KEY,
            data.username || username
        );


        passwordInput.value = "";

        passwordConfirmInput.value = "";


        showAppPage();

        await initialize();


    } catch (error) {

        console.error(
            "ユーザー登録エラー:",
            error
        );


        errorElement.textContent =
            error.message ||
            "ユーザー登録に失敗しました";


    } finally {

        button.disabled = false;

        button.textContent =
            "アカウントを作成";
    }
}


// ==================================================
// ログイン状態復元
// ==================================================

async function restoreUser() {

    const savedUserId =
        localStorage.getItem(
            USER_ID_KEY
        );


    if (!savedUserId) {

        showLoginPage();

        return false;
    }


    const userId =
        Number(savedUserId);


    if (
        !Number.isInteger(userId) ||
        userId <= 0
    ) {

        localStorage.removeItem(
            USER_ID_KEY
        );

        localStorage.removeItem(
            USER_NAME_KEY
        );


        showLoginPage();

        return false;
    }


    try {

        const response =
            await fetch(
                `${API_BASE}/users/${userId}`
            );


        if (!response.ok) {

            throw new Error(
                `HTTP ${response.status}`
            );
        }


        const user =
            await response.json();


        if (!user || !user.id) {

            throw new Error(
                "ユーザー情報がありません"
            );
        }


        USER_ID =
            Number(user.id);


        localStorage.setItem(
            USER_ID_KEY,
            String(USER_ID)
        );


        localStorage.setItem(
            USER_NAME_KEY,
            user.username || ""
        );


        showAppPage();


        return true;


    } catch (error) {

        console.error(
            "ユーザー情報の復元に失敗:",
            error
        );


        USER_ID = null;


        localStorage.removeItem(
            USER_ID_KEY
        );

        localStorage.removeItem(
            USER_NAME_KEY
        );


        showLoginPage();


        return false;
    }
}


// ==================================================
// アプリ開始
// ==================================================

async function startApp() {

    const restored =
        await restoreUser();


    if (!restored) {

        return;
    }


    await initialize();
}


// ==================================================
// DOMContentLoaded
// ==================================================

document.addEventListener(
    "DOMContentLoaded",
    async () => {

        setupAuthentication();

        await startApp();

    }
);


// ==================================================
// 初期化
// ==================================================

async function initialize() {

    if (!USER_ID) {

        return;
    }


    setupTypeNavigation();

    setupFilterNavigation();


    // 初期状態
    currentType = "extra";
    currentFilter = "all";


    const extraNav =
        document.getElementById(
            "extraNav"
        );

    const allNav =
        document.getElementById(
            "allNav"
        );


    setActiveTypeNavigation(
        extraNav
    );

    setActiveFilterNavigation(
        allNav
    );


    await loadCategories();

    await loadAnsweredQuestions();

    await loadQuestions();

    await loadUserAverage();
}

// ==================================================
// EXTRA / ORDINARY / RESULT
// ==================================================

function setupTypeNavigation() {

    const extraNav =
        document.getElementById(
            "extraNav"
        );

    const ordinaryNav =
        document.getElementById(
            "ordinaryNav"
        );

    const resultNav =
        document.getElementById(
            "resultNav"
        );


    if (extraNav) {

        extraNav.addEventListener(
            "click",
            async () => {

                currentType = "extra";

                isOverallResultPage = false;

                setActiveTypeNavigation(
                    extraNav
                );

                showQuestionPage();

                setCategoryTitle();

                await loadQuestions();

            }
        );
    }


    if (ordinaryNav) {

        ordinaryNav.addEventListener(
            "click",
            async () => {

                currentType = "ordinary";

                isOverallResultPage = false;

                setActiveTypeNavigation(
                    ordinaryNav
                );

                showQuestionPage();

                setCategoryTitle();

                await loadQuestions();

            }
        );
    }


    if (resultNav) {

        resultNav.addEventListener(
            "click",
            async () => {

                isOverallResultPage = true;

                setActiveTypeNavigation(
                    resultNav
                );

                await showOverallResult();

            }
        );
    }
}


// ==================================================
// 大分類 active
// ==================================================

function setActiveTypeNavigation(
    activeButton
) {

    document
        .querySelectorAll(
            ".type-nav-button"
        )
        .forEach(button => {

            button.classList.remove(
                "active"
            );

        });


    if (activeButton) {

        activeButton.classList.add(
            "active"
        );
    }
}


// ==================================================
// すべて / 未回答 / 回答済み
// ==================================================

function setupFilterNavigation() {

    const allNav =
        document.getElementById(
            "allNav"
        );

    const unansweredNav =
        document.getElementById(
            "unansweredNav"
        );

    const answeredNav =
        document.getElementById(
            "answeredNav"
        );


    if (allNav) {

        allNav.addEventListener(
            "click",
            async () => {

                currentFilter = "all";

                setActiveFilterNavigation(
                    allNav
                );

                showQuestionPage();

                setCategoryTitle();

                await loadQuestions();

            }
        );
    }


    if (unansweredNav) {

        unansweredNav.addEventListener(
            "click",
            async () => {

                currentFilter =
                    "unanswered";

                setActiveFilterNavigation(
                    unansweredNav
                );

                showQuestionPage();

                setCategoryTitle();

                await loadQuestions();

            }
        );
    }


    if (answeredNav) {

        answeredNav.addEventListener(
            "click",
            async () => {

                currentFilter =
                    "answered";

                setActiveFilterNavigation(
                    answeredNav
                );

                showQuestionPage();

                setCategoryTitle();

                await loadQuestions();

            }
        );
    }
}


// ==================================================
// フィルター active
// ==================================================

function setActiveFilterNavigation(
    activeButton
) {

    document
        .querySelectorAll(
            ".filter-nav-button"
        )
        .forEach(button => {

            button.classList.remove(
                "active"
            );

        });


    if (activeButton) {

        activeButton.classList.add(
            "active"
        );
    }
}


// ==================================================
// 問題画面
// ==================================================

function showQuestionPage() {

    isOverallResultPage = false;


    document
        .querySelector(".filter-nav")
        ?.classList.remove(
            "hidden"
        );


    document
        .querySelector(".category-section")
        ?.classList.remove(
            "hidden"
        );


    document
        .getElementById(
            "questionSection"
        )
        ?.classList.remove(
            "hidden"
        );


    document
        .getElementById(
            "resultSection"
        )
        ?.classList.add(
            "hidden"
        );


    document
        .getElementById(
            "overallResultSection"
        )
        ?.classList.add(
            "hidden"
        );
}


// ==================================================
// 総合 RESULT
// ==================================================

async function showOverallResult() {

    isOverallResultPage = true;


    document
        .querySelector(".filter-nav")
        ?.classList.add(
            "hidden"
        );


    document
        .querySelector(".category-section")
        ?.classList.add(
            "hidden"
        );


    document
        .getElementById(
            "questionSection"
        )
        ?.classList.add(
            "hidden"
        );


    document
        .getElementById(
            "resultSection"
        )
        ?.classList.add(
            "hidden"
        );


    document
        .getElementById(
            "overallResultSection"
        )
        ?.classList.remove(
            "hidden"
        );


    try {

        const response =
            await fetch(
                `${API_BASE}/users/${USER_ID}/average`
            );


        if (!response.ok) {

            throw new Error(
                `HTTP ${response.status}`
            );
        }


        const data =
            await response.json();


        console.log(
            "総合RESULT:",
            data
        );


        // ==================================================
        // 回答数
        // ==================================================

        const answeredQuestions =
            Number(
                data.answered_questions ?? 0
            );


        const answeredElement =
            document.getElementById(
                "overallAnsweredQuestions"
            );


        if (answeredElement) {

            answeredElement.textContent =
                `${answeredQuestions}問`;
        }



        // ==================================================
        // 多数派・少数派
        // ==================================================

        const choiceSummary =
            data.choice_summary || {};


        const majorityRate =
            Number(
                choiceSummary.majority_rate
                ?? data.overall_evaluation?.majority_rate
                ?? 0
            );


        const majorityCount =
            Number(
                choiceSummary.majority_count ?? 0
            );


        const minorityCount =
            Number(
                choiceSummary.minority_count ?? 0
            );


        const majorityAnsweredQuestions =
            Number(
                choiceSummary.answered_questions ?? 0
            );


        const majorityDegree =
            data.overall_evaluation?.majority_degree
            || getMajorityDegree(
                majorityRate
            );


        const majorityDegreeElement =
            document.getElementById(
                "majorityDegree"
            );


        if (majorityDegreeElement) {

            majorityDegreeElement.textContent =
                majorityDegree;
        }


        const majorityRateElement =
            document.getElementById(
                "majorityRate"
            );


        if (majorityRateElement) {

            majorityRateElement.textContent =
                `${majorityRate.toFixed(1)}%`;
        }


        const majorityCountElement =
            document.getElementById(
                "majorityCount"
            );


        if (majorityCountElement) {

            majorityCountElement.textContent =
                majorityCount;
        }


        const minorityCountElement =
            document.getElementById(
                "minorityCount"
            );


        if (minorityCountElement) {

            minorityCountElement.textContent =
                minorityCount;
        }


        const majorityAnsweredElement =
            document.getElementById(
                "majorityAnsweredQuestions"
            );


        if (majorityAnsweredElement) {

            majorityAnsweredElement.textContent =
                majorityAnsweredQuestions;
        }


        const majorityDescriptionElement =
            document.getElementById(
                "majorityDescription"
            );


        if (majorityDescriptionElement) {

            if (
                majorityAnsweredQuestions === 0
            ) {

                majorityDescriptionElement.textContent =
                    "選択式の問題に回答すると、あなたの多数派・少数派度合いが表示されます。";

            } else {

                majorityDescriptionElement.textContent =
                    getMajorityDescription(
                        majorityRate,
                        majorityDegree
                    );
            }
        }



        // ==================================================
        // 平均度合い
        // ==================================================

        const numericSummary =
            data.numeric_summary || {};


        const averageScore =
            Number(
                numericSummary.average_score
                ?? data.overall_evaluation?.average_score
                ?? 0
            );


        const averageDistance =
            Number(
                numericSummary.average_distance_percentage
                ?? 0
            );


        const numericAnsweredQuestions =
            Number(
                numericSummary.answered_questions ?? 0
            );


        const averageDegree =
            data.overall_evaluation?.average_degree
            || getAverageDegree(
                averageScore
            );


        const averageScoreElement =
            document.getElementById(
                "averageScore"
            );


        if (averageScoreElement) {

            if (
                numericAnsweredQuestions > 0 &&
                Number.isFinite(averageScore)
            ) {

                averageScoreElement.textContent =
                    `${averageScore.toFixed(1)}%`;

            } else {

                averageScoreElement.textContent =
                    "--%";
            }
        }


        const averageDegreeElement =
            document.getElementById(
                "averageDegree"
            );


        if (averageDegreeElement) {

            if (
                numericAnsweredQuestions > 0
            ) {

                averageDegreeElement.textContent =
                    averageDegree;

            } else {

                averageDegreeElement.textContent =
                    "まだ回答がありません";
            }
        }


        const averageDescriptionElement =
            document.getElementById(
                "averageDescription"
            );


        if (averageDescriptionElement) {

            if (
                numericAnsweredQuestions === 0
            ) {

                averageDescriptionElement.textContent =
                    "数値・時間の問題に回答すると、あなたの平均度合いが表示されます。";

            } else {

                averageDescriptionElement.textContent =
                    getAverageDescription(
                        averageScore,
                        averageDistance,
                        averageDegree
                    );
            }
        }


        const numericAnsweredElement =
            document.getElementById(
                "numericAnsweredQuestions"
            );


        if (numericAnsweredElement) {

            numericAnsweredElement.textContent =
                `${numericAnsweredQuestions}問`;
        }



        // ==================================================
        // 総合評価
        // ==================================================

        const overallEvaluation =
            data.overall_evaluation || {};


        const evaluationTitle =
            overallEvaluation.title
            || "まだ回答がありません";


        const evaluationDescription =
            overallEvaluation.description
            || "問題に回答すると、あなたの総合評価が表示されます。";


        const evaluationTitleElement =
            document.getElementById(
                "overallEvaluationTitle"
            );


        if (evaluationTitleElement) {

            evaluationTitleElement.textContent =
                evaluationTitle;
        }


        const evaluationDescriptionElement =
            document.getElementById(
                "overallEvaluationDescription"
            );


        if (evaluationDescriptionElement) {

            evaluationDescriptionElement.textContent =
                evaluationDescription;
        }



    } catch (error) {

        console.error(
            "総合RESULT取得エラー:",
            error
        );


        const titleElement =
            document.getElementById(
                "overallEvaluationTitle"
            );


        const descriptionElement =
            document.getElementById(
                "overallEvaluationDescription"
            );


        if (titleElement) {

            titleElement.textContent =
                "結果を取得できませんでした";
        }


        if (descriptionElement) {

            descriptionElement.textContent =
                "総合評価の取得に失敗しました。";
        }
    }


    // ==================================================
    // 問題に戻る
    // ==================================================

    const backButton =
        document.getElementById(
            "overallBackButton"
        );


    if (backButton) {

        backButton.onclick =
            async () => {

                isOverallResultPage =
                    false;


                const targetButton =
                    currentType === "extra"
                        ? document.getElementById(
                            "extraNav"
                        )
                        : document.getElementById(
                            "ordinaryNav"
                        );


                if (targetButton) {

                    setActiveTypeNavigation(
                        targetButton
                    );
                }


                showQuestionPage();

                setCategoryTitle();

                await loadQuestions();
            };
    }
}


// ==================================================
// タイトル
// ==================================================

function setCategoryTitle() {

    const title =
        document.getElementById(
            "categoryTitle"
        );


    if (!title) {

        return;
    }


    const typeName =
        currentType === "extra"
            ? "EXTRA"
            : "ORDINARY";


    let filterName =
        "すべて";


    if (
        currentFilter === "unanswered"
    ) {

        filterName =
            "未回答";

    } else if (
        currentFilter === "answered"
    ) {

        filterName =
            "回答済";
    }


    title.textContent =
        `${typeName} · ${filterName}`;
}


// ==================================================
// カテゴリー取得
// ==================================================

async function loadCategories() {

    try {

        const response =
            await fetch(
                `${API_BASE}/categories`
            );


        if (!response.ok) {

            categories = [];

            return;
        }


        const data =
            await response.json();


        categories =
            Array.isArray(data)
                ? data
                : data.categories || [];


    } catch (error) {

        console.error(
            "カテゴリー取得エラー:",
            error
        );


        categories = [];
    }
}


// ==================================================
// 回答履歴取得
// ==================================================

async function loadAnsweredQuestions() {

    if (!USER_ID) {

        answeredQuestionIds =
            new Set();

        return;
    }


    try {

        const response =
            await fetch(
                `${API_BASE}/users/${USER_ID}/answers`
            );


        if (!response.ok) {

            answeredQuestionIds =
                new Set();

            return;
        }


        const data =
            await response.json();


        const answers =
            Array.isArray(data)
                ? data
                : data.answers || [];


        answeredQuestionIds =
            new Set();


        answers.forEach(answer => {

            const questionId =
                Number(
                    answer.question_id
                );


            if (
                !Number.isNaN(questionId)
            ) {

                answeredQuestionIds.add(
                    questionId
                );
            }
        });


        console.log(
            "回答済み問題:",
            answeredQuestionIds
        );


    } catch (error) {

        console.error(
            "回答履歴取得エラー:",
            error
        );


        answeredQuestionIds =
            new Set();
    }
}


// ==================================================
// 問題タイプ判定
// ==================================================

function getQuestionType(question) {

    if (!question) {

        return null;
    }


    const rawType =
        question.question_type ??
        question.type ??
        "";


    const questionType =
        String(
            rawType
        )
            .trim()
            .toUpperCase();


    if (
        questionType === "EXTRA"
    ) {

        return "extra";
    }


    if (
        questionType === "ORDINARY"
    ) {

        return "ordinary";
    }


    return null;
}

// ==================================================
// 問題取得
// ==================================================

async function loadQuestions() {

    if (!USER_ID) {

        return;
    }


    try {

        // ------------------------------------------
        // 画面を問題ページに戻す
        // ------------------------------------------

        document
            .getElementById("resultSection")
            ?.classList.add("hidden");

        document
            .getElementById("overallResultSection")
            ?.classList.add("hidden");

        document
            .getElementById("questionSection")
            ?.classList.remove("hidden");

        document
            .querySelector(".category-section")
            ?.classList.remove("hidden");

        document
            .querySelector(".filter-nav")
            ?.classList.remove("hidden");


        // ------------------------------------------
        // 現在のフィルター状態を表示
        // ------------------------------------------

        setCategoryTitle();


        // ------------------------------------------
        // APIから全問題取得
        // ------------------------------------------

        const response =
            await fetch(
                `${API_BASE}/questions`
            );


        if (!response.ok) {

            throw new Error(
                `HTTP ${response.status}`
            );
        }


        const data =
            await response.json();


        let list =
            Array.isArray(data)
                ? data
                : data.questions || [];


        // ------------------------------------------
        // 公開済みのみ
        // ------------------------------------------

        list =
            list.filter(
                question =>
                    question.is_published !== false
            );


        // ------------------------------------------
        // EXTRA / ORDINARY
        // ------------------------------------------

        list =
            list.filter(
                question => {

                    const type =
                        getQuestionType(
                            question
                        );


                    return type === currentType;
                }
            );


        // ------------------------------------------
        // フィルター
        // ------------------------------------------

        if (
            currentFilter === "unanswered"
        ) {

            list =
                list.filter(
                    question => {

                        const questionId =
                            Number(
                                question.id
                            );


                        return (
                            !answeredQuestionIds.has(
                                questionId
                            )
                        );
                    }
                );
        }


        if (
            currentFilter === "answered"
        ) {

            list =
                list.filter(
                    question => {

                        const questionId =
                            Number(
                                question.id
                            );


                        return (
                            answeredQuestionIds.has(
                                questionId
                            )
                        );
                    }
                );
        }


        // ------------------------------------------
        // デバッグ
        // ------------------------------------------

        console.log(
            "=============================="
        );

        console.log(
            "現在のタイプ:",
            currentType
        );

        console.log(
            "現在のフィルター:",
            currentFilter
        );

        console.log(
            "回答済みID:",
            [...answeredQuestionIds]
        );

        console.log(
            "表示対象:",
            list.map(
                question => ({
                    id: question.id,
                    title: question.title,
                    type: getQuestionType(
                        question
                    ),
                    answered:
                        answeredQuestionIds.has(
                            Number(
                                question.id
                            )
                        )
                })
            )
        );

        console.log(
            "=============================="
        );


        // ------------------------------------------
        // 現在の問題を保存
        // ------------------------------------------

        questions =
            list;


        // ------------------------------------------
        // 0件
        // ------------------------------------------

        if (
            questions.length === 0
        ) {

            showNoQuestions();

            return;
        }


        // ------------------------------------------
        // 問題一覧を再描画
        // ------------------------------------------

        await renderAllQuestions();


    } catch (error) {

        console.error(
            "問題取得エラー:",
            error
        );


        showQuestionError();
    }
}


// ==================================================
// 全問題表示
// ==================================================

async function renderAllQuestions() {

    const questionSection =
        document.getElementById(
            "questionSection"
        );


    if (!questionSection) {

        return;
    }


    questionSection.classList.remove(
        "hidden"
    );


    document
        .getElementById(
            "resultSection"
        )
        ?.classList.add(
            "hidden"
        );


    document
        .getElementById(
            "overallResultSection"
        )
        ?.classList.add(
            "hidden"
        );


    // ==================================================
    // 一覧用HTMLを作成
    // ==================================================

    questionSection.innerHTML = `
        <div
            id="questionList"
            class="question-list"
        ></div>
    `;


    const questionList =
        document.getElementById(
            "questionList"
        );


    if (!questionList) {

        return;
    }


    // ==================================================
    // 各問題を順番に生成
    // ==================================================

    for (
        let index = 0;
        index < questions.length;
        index++
    ) {

        const question =
            questions[index];


        const card =
            await createQuestionCard(
                question,
                index
            );


        questionList.appendChild(
            card
        );
    }
}


// ==================================================
// 問題カード作成
// ==================================================

async function createQuestionCard(
    question,
    index
) {

    const card =
        document.createElement(
            "article"
        );


    card.className =
        "question-card";


    card.dataset.questionId =
        String(question.id);


    // ==================================================
    // 回答済み判定
    // ==================================================

    const isAnswered =
        answeredQuestionIds.has(
            Number(question.id)
        );


    if (isAnswered) {

        card.classList.add(
            "answered"
        );
    }


    // ==================================================
    // 詳細取得
    // ==================================================

    let detail = null;


    try {

        const response =
            await fetch(
                `${API_BASE}/questions/${question.id}`
            );


        if (response.ok) {

            detail =
                await response.json();
        }

    } catch (error) {

        console.error(
            "問題詳細取得エラー:",
            error
        );
    }


    if (!detail) {

        card.innerHTML = `
            <div class="question-number">
                QUESTION ${String(
                    index + 1
                ).padStart(2, "0")}
            </div>

            <h2 class="question-title">
                ${escapeHtml(
                    question.title || ""
                )}
            </h2>

            <p class="question-text">
                ${escapeHtml(
                    question.question_text || ""
                )}
            </p>

            <p class="error-message">
                問題の読み込みに失敗しました
            </p>
        `;

        return card;
    }


    const answerType =
        detail.answer_type ||
        question.answer_type ||
        "choice";


    // ==================================================
    // タグ
    // ==================================================

    const tagsHtml =
        createQuestionTagsHtml(
            question
        );


    // ==================================================
    // カード基本部分
    // ==================================================

    card.innerHTML = `
        <div class="question-card-header">

            <div class="question-number">
                QUESTION ${String(
                    index + 1
                ).padStart(2, "0")}
            </div>

            ${
                isAnswered
                    ? `
                    <span class="question-answered-badge">
                        回答済み
                    </span>
                    `
                    : ""
            }

        </div>

        <h2 class="question-title">
            ${escapeHtml(
                question.title || ""
            )}
        </h2>

        <p class="question-text">
            ${escapeHtml(
                question.question_text || ""
            )}
        </p>

        <div class="question-tags">
            ${tagsHtml}
        </div>

        <div
            class="question-answer-area"
            id="answerArea-${question.id}"
        ></div>

        <div
            class="question-result-area hidden"
            id="inlineResult-${question.id}"
        ></div>
    `;


    const answerArea =
        card.querySelector(
            `#answerArea-${question.id}`
        );


    if (!answerArea) {

        return card;
    }


    // ==================================================
    // 回答済みなら結果を表示
    // ==================================================

    if (isAnswered) {

        await renderAnsweredQuestion(
            question,
            detail,
            answerArea,
            card
        );

        return card;
    }


    // ==================================================
    // 未回答なら回答UI
    // ==================================================

    renderAnswerInput(
        question,
        detail,
        answerArea,
        card
    );


    return card;
}


// ==================================================
// タグHTML
// ==================================================

function createQuestionTagsHtml(
    question
) {

    let html = `
        <span class="question-tag">
            ${
                currentType === "extra"
                    ? "EXTRA"
                    : "ORDINARY"
            }
        </span>
    `;


    const tags =
        Array.isArray(
            question.tags
        )
            ? question.tags
            : [];


    tags.forEach(tag => {

        const tagName =
            typeof tag === "object"
                ? (
                    tag.name ||
                    tag.tag_name ||
                    ""
                )
                : String(tag);


        if (!tagName) {

            return;
        }


        html += `
            <span class="question-tag">
                #${escapeHtml(tagName)}
            </span>
        `;
    });


    return html;
}


// ==================================================
// 回答UI
// ==================================================

function renderAnswerInput(
    question,
    detail,
    answerArea,
    card
) {

    const answerType =
        detail.answer_type ||
        question.answer_type ||
        "choice";


    // ==================================================
    // 選択式
    // ==================================================

    if (
        answerType === "choice"
    ) {

        const options =
            Array.isArray(
                detail.options
            )
                ? detail.options
                : [];


        if (
            options.length === 0
        ) {

            answerArea.innerHTML = `
                <p class="error-message">
                    選択肢がありません
                </p>
            `;

            return;
        }


        const optionsWrapper =
            document.createElement(
                "div"
            );


        optionsWrapper.className =
            "options";


        let selectedOptionId =
            null;


        options.forEach(option => {

            const button =
                document.createElement(
                    "button"
                );


            button.type =
                "button";


            button.className =
                "option-button";


            button.dataset.optionId =
                option.id;


            button.innerHTML = `
                <span class="option-key">
                    ${escapeHtml(
                        option.option_key
                    )}
                </span>

                <span class="option-text">
                    ${escapeHtml(
                        option.option_text
                    )}
                </span>
            `;


            button.addEventListener(
                "click",
                () => {

                    selectedOptionId =
                        Number(
                            option.id
                        );


                    optionsWrapper
                        .querySelectorAll(
                            ".option-button"
                        )
                        .forEach(
                            item => {

                                item.classList.remove(
                                    "selected"
                                );
                            }
                        );


                    button.classList.add(
                        "selected"
                    );
                }
            );


            optionsWrapper.appendChild(
                button
            );
        });


        answerArea.appendChild(
            optionsWrapper
        );


        const submitButton =
            createInlineAnswerButton();


        submitButton.addEventListener(
            "click",
            async () => {

                if (
                    selectedOptionId === null
                ) {

                    alert(
                        "選択肢を選んでください。"
                    );

                    return;
                }


                await submitInlineAnswer(
                    question,
                    detail,
                    {
                        selected_option_id:
                            selectedOptionId
                    },
                    submitButton,
                    card
                );
            }
        );


        answerArea.appendChild(
            submitButton
        );


        return;
    }


    // ==================================================
    // 数値式
    // ==================================================

    if (
        answerType === "numeric"
    ) {

        const wrapper =
            document.createElement(
                "div"
            );


        wrapper.className =
            "numeric-answer-wrapper";


        wrapper.innerHTML = `
            <label
                class="numeric-answer-label"
                for="numericAnswer-${question.id}"
            >
                数字を入力してください
            </label>

            <div class="numeric-input-row">

                <input
                    id="numericAnswer-${question.id}"
                    class="numeric-answer-input"
                    type="number"
                    inputmode="decimal"
                    step="any"
                    placeholder="例：30"
                    autocomplete="off"
                >

            </div>

            <p
                class="numeric-answer-error"
                id="numericAnswerError-${question.id}"
            ></p>
        `;


        answerArea.appendChild(
            wrapper
        );


        const input =
            wrapper.querySelector(
                "input"
            );


        const error =
            wrapper.querySelector(
                ".numeric-answer-error"
            );


        const submitButton =
            createInlineAnswerButton();


        submitButton.disabled =
            true;


        input.addEventListener(
            "input",
            () => {

                const value =
                    input.value.trim();


                if (error) {

                    error.textContent =
                        "";
                }


                submitButton.disabled =
                    !(
                        value !== "" &&
                        Number.isFinite(
                            Number(value)
                        )
                    );
            }
        );


        submitButton.addEventListener(
            "click",
            async () => {

                const value =
                    input.value.trim();


                const numericValue =
                    Number(value);


                if (
                    value === "" ||
                    !Number.isFinite(
                        numericValue
                    )
                ) {

                    if (error) {

                        error.textContent =
                            "正しい数字を入力してください";
                    }


                    input.focus();

                    return;
                }


                await submitInlineAnswer(
                    question,
                    detail,
                    {
                        numeric_value:
                            numericValue
                    },
                    submitButton,
                    card
                );
            }
        );


        answerArea.appendChild(
            submitButton
        );


        return;
    }


    // ==================================================
    // 時刻式
    // ==================================================

    if (
        answerType === "time"
    ) {

        const wrapper =
            document.createElement(
                "div"
            );


        wrapper.className =
            "numeric-answer-wrapper";


        wrapper.innerHTML = `
            <label
                class="numeric-answer-label"
                for="timeAnswer-${question.id}"
            >
                時刻を入力してください
            </label>

            <div class="numeric-input-row">

                <input
                    id="timeAnswer-${question.id}"
                    class="numeric-answer-input"
                    type="time"
                    autocomplete="off"
                >

            </div>

            <p
                class="numeric-answer-error"
                id="timeAnswerError-${question.id}"
            ></p>
        `;


        answerArea.appendChild(
            wrapper
        );


        const input =
            wrapper.querySelector(
                "input"
            );


        const error =
            wrapper.querySelector(
                ".numeric-answer-error"
            );


        const submitButton =
            createInlineAnswerButton();


        submitButton.disabled =
            true;


        input.addEventListener(
            "input",
            () => {

                submitButton.disabled =
                    input.value === "";
            }
        );


        submitButton.addEventListener(
            "click",
            async () => {

                const time =
                    input.value;


                if (!time) {

                    if (error) {

                        error.textContent =
                            "時刻を入力してください";
                    }


                    input.focus();

                    return;
                }


                const parts =
                    time.split(":");


                const hours =
                    Number(parts[0]);


                const minutes =
                    Number(parts[1]);


                if (
                    !Number.isInteger(hours) ||
                    !Number.isInteger(minutes) ||
                    hours < 0 ||
                    hours > 23 ||
                    minutes < 0 ||
                    minutes > 59
                ) {

                    if (error) {

                        error.textContent =
                            "正しい時刻を入力してください";
                    }


                    input.focus();

                    return;
                }


                await submitInlineAnswer(
                    question,
                    detail,
                    {
                        numeric_value:
                            hours * 60 + minutes
                    },
                    submitButton,
                    card
                );
            }
        );


        answerArea.appendChild(
            submitButton
        );


        return;
    }


    answerArea.innerHTML = `
        <p class="error-message">
            この質問の回答形式には対応していません
        </p>
    `;
}


// ==================================================
// 回答ボタン作成
// ==================================================

function createInlineAnswerButton() {

    const button =
        document.createElement(
            "button"
        );


    button.type =
        "button";


    button.className =
        "answer-button inline-answer-button";


    button.textContent =
        "回答する";


    return button;
}


// ==================================================
// 一覧画面から回答送信
// ==================================================

async function submitInlineAnswer(
    question,
    detail,
    answerData,
    submitButton,
    card
) {

    if (!USER_ID) {

        alert(
            "ログインしてください。"
        );

        showLoginPage();

        return;
    }


    if (submitButton) {

        submitButton.disabled =
            true;

        submitButton.textContent =
            "送信中...";
    }


    const requestBody = {

        user_id:
            Number(USER_ID),

        question_id:
            Number(question.id),

        selected_option_id:
            answerData.selected_option_id ??
            null,

        numeric_value:
            answerData.numeric_value ??
            null,

        text_value:
            null
    };


    try {

        console.log(
            "回答送信:",
            requestBody
        );


        const response =
            await fetch(
                `${API_BASE}/answers`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify(
                            requestBody
                        )
                }
            );


        const responseText =
            await response.text();


        if (!response.ok) {

            let message =
                `回答送信失敗: HTTP ${response.status}`;


            try {

                const errorData =
                    JSON.parse(
                        responseText
                    );


                if (
                    errorData.detail
                ) {

                    message =
                        errorData.detail;
                }

            } catch {

                // JSONでない場合
            }


            throw new Error(
                message
            );
        }


        let savedAnswer = null;


        try {

            savedAnswer =
                JSON.parse(
                    responseText
                );

        } catch {

            savedAnswer =
                null;
        }


        console.log(
            "回答保存成功:",
            savedAnswer
        );


        answeredQuestionIds.add(
            Number(question.id)
        );


        if (card) {

            card.classList.add(
                "answered"
            );
        }


        // 結果をその問題の直下に表示
        await showInlineResult(
            question,
            detail,
            card
        );


    } catch (error) {

        console.error(
            "回答送信エラー:",
            error
        );


        if (submitButton) {

            submitButton.disabled =
                false;

            submitButton.textContent =
                "回答する";
        }


        alert(
            "回答の送信に失敗しました。\n\n" +
            error.message
        );
    }
}


// ==================================================
// 回答済み問題の表示
// ==================================================

async function renderAnsweredQuestion(
    question,
    detail,
    answerArea,
    card
) {

    answerArea.innerHTML = `
        <div class="answered-state">
            <span>
                ✓ 回答済み
            </span>
        </div>
    `;


    await showInlineResult(
        question,
        detail,
        card
    );
}


// ==================================================
// 問題ごとの結果をカード内に表示
// ==================================================

async function showInlineResult(
    question,
    detail,
    card
) {

    if (!card) {

        return;
    }


    const resultArea =
        card.querySelector(
            `#inlineResult-${question.id}`
        );


    if (!resultArea) {

        return;
    }


    try {

        const response =
            await fetch(
                `${API_BASE}/questions/${question.id}/result?user_id=${USER_ID}`
            );


        if (!response.ok) {

            throw new Error(
                `HTTP ${response.status}`
            );
        }


        const result =
            await response.json();


        resultArea.classList.remove(
            "hidden"
        );


        resultArea.innerHTML =
            createInlineResultHtml(
                result
            );


        await loadUserAverage();


    } catch (error) {

        console.error(
            "結果取得エラー:",
            error
        );


        resultArea.classList.remove(
            "hidden"
        );


        resultArea.innerHTML = `
            <p class="error-message">
                結果の取得に失敗しました
            </p>
        `;
    }
}


// ==================================================
// 問題ごとの結果HTML
// ==================================================

function createInlineResultHtml(
    result
) {

    const yourAnswer =
        result.your_answer || null;


    const answerType =
        result.answer_type ||
        "choice";


    // ==================================================
    // 数値・時刻
    // ==================================================

    if (
        answerType === "numeric" ||
        answerType === "time" ||
        result.aggregation_type ===
            "numeric_average" ||
        result.aggregation_type ===
            "time_average"
    ) {

        const yourValue =
            yourAnswer &&
            yourAnswer.numeric_value !== null &&
            yourAnswer.numeric_value !== undefined
                ? Number(
                    yourAnswer.numeric_value
                )
                : null;


        const average =
            Number(
                result.numeric_average ??
                result.overall_average ??
                result.average ??
                result.global_average ??
                result.question_average
            );


        const isTime =
            answerType === "time" ||
            result.aggregation_type ===
                "time_average";


        const yourDisplay =
            Number.isFinite(yourValue)
                ? (
                    isTime
                        ? minutesToTime(
                            yourValue
                        )
                        : formatNumber(
                            yourValue
                        )
                )
                : "-";


        const averageDisplay =
            Number.isFinite(average)
                ? (
                    isTime
                        ? minutesToTime(
                            average
                        )
                        : formatNumber(
                            average
                        )
                )
                : "-";


        let comparisonText =
            "みんなの平均と比較しています。";


        if (
            Number.isFinite(yourValue) &&
            Number.isFinite(average)
        ) {

            const difference =
                yourValue -
                average;


            const absoluteDifference =
                Math.abs(
                    difference
                );


            if (
                absoluteDifference <
                0.000001
            ) {

                comparisonText =
                    "あなたの答えは、みんなの平均とほぼ同じです。";

            } else if (
                difference > 0
            ) {

                comparisonText =
                    `みんなの平均より ${isTime
                        ? minutesToDuration(
                            absoluteDifference
                        )
                        : formatNumber(
                            absoluteDifference
                        )
                    } 大きい答えです。`;

            } else {

                comparisonText =
                    `みんなの平均より ${isTime
                        ? minutesToDuration(
                            absoluteDifference
                        )
                        : formatNumber(
                            absoluteDifference
                        )
                    } 小さい答えです。`;
            }
        }


        return `
            <div class="inline-result">

                <div class="inline-result-title">
                    平均値
                </div>

                <p class="inline-result-description">
                    ${escapeHtml(
                        comparisonText
                    )}
                </p>

                <div class="inline-result-values">

                    <div class="inline-result-row">

                        <span>
                            あなたの答え
                        </span>

                        <strong>
                            ${escapeHtml(
                                yourDisplay
                            )}
                        </strong>

                    </div>

                    <div class="inline-result-row">

                        <span>
                            みんなの平均
                        </span>

                        <strong>
                            ${escapeHtml(
                                averageDisplay
                            )}
                        </strong>

                    </div>

                </div>

                <div class="inline-result-total">
                    ${Number(
                        result.total_answers ?? 0
                    )}人が回答
                </div>

            </div>
        `;
    }


    // ==================================================
    // 選択式
    // ==================================================

    const percentage =
        Number(
            result.same_answer_percentage ??
            result.selected_option_percentage ??
            result.percentage ??
            0
        );


    const options =
        Array.isArray(
            result.options
        )
            ? result.options
            : [];


    let optionsHtml = "";


    options.forEach(option => {

        const optionPercentage =
            Number(
                option.percentage ?? 0
            );


        const count =
            Number(
                option.count ?? 0
            );


        const isYourAnswer =
            yourAnswer &&
            Number(
                yourAnswer.option_id
            ) ===
            Number(
                option.option_id
            );


        optionsHtml += `
            <div
                class="
                    inline-result-option
                    ${
                        isYourAnswer
                            ? "your-choice"
                            : ""
                    }
                "
            >

                <div class="result-option-header">

                    <div class="result-option-name">

                        <span class="result-option-key">
                            ${escapeHtml(
                                option.option_key
                            )}
                        </span>

                        <span class="result-option-text">
                            ${escapeHtml(
                                option.option_text
                            )}
                        </span>

                        ${
                            isYourAnswer
                                ? `
                                <span class="your-choice-badge">
                                    あなた
                                </span>
                                `
                                : ""
                        }

                    </div>

                    <div class="result-option-percentage">
                        ${optionPercentage.toFixed(1)}%
                    </div>

                </div>

                <div class="result-bar">

                    <div
                        class="result-bar-fill"
                        style="width: ${Math.max(
                            0,
                            Math.min(
                                optionPercentage,
                                100
                            )
                        )}%"
                    ></div>

                </div>

                <div class="result-option-count">
                    ${count}人
                </div>

            </div>
        `;
    });


    const description =
        result.is_majority
            ? "あなたは多数派の回答を選びました。"
            : "あなたは少数派の回答を選びました。";


    return `
        <div class="inline-result">

            <div class="inline-result-title">
                ${percentage.toFixed(1)}%
            </div>

            <p class="inline-result-description">
                ${description}
            </p>

            <div class="inline-result-options">
                ${optionsHtml}
            </div>

            <div class="inline-result-total">
                ${Number(
                    result.total_answers ?? 0
                )}人が回答
            </div>

        </div>
    `;
}


// ==================================================
// 時刻差を「○時間○分」にする
// ==================================================

function minutesToDuration(
    minutes
) {

    const value =
        Math.round(
            Number(minutes)
        );


    if (
        !Number.isFinite(value)
    ) {

        return "-";
    }


    const hours =
        Math.floor(
            value / 60
        );


    const remaining =
        value % 60;


    if (
        hours > 0 &&
        remaining > 0
    ) {

        return `${hours}時間${remaining}分`;

    } else if (
        hours > 0
    ) {

        return `${hours}時間`;

    } else {

        return `${remaining}分`;
    }
}

// ==================================================
// タグ
// ==================================================

function renderQuestionTags(
    question
) {

    const container =
        document.getElementById(
            "questionTags"
        );


    if (!container) {

        return;
    }


    container.innerHTML =
        "";


    const typeTag =
        document.createElement(
            "span"
        );


    typeTag.className =
        "question-tag";


    typeTag.textContent =
        currentType === "extra"
            ? "EXTRA"
            : "ORDINARY";


    container.appendChild(
        typeTag
    );


    const tags =
        Array.isArray(
            question.tags
        )
            ? question.tags
            : [];


    tags.forEach(tag => {

        const tagName =
            typeof tag === "object"
                ? (
                    tag.name ||
                    tag.tag_name ||
                    ""
                )
                : String(tag);


        if (!tagName) {

            return;
        }


        const tagElement =
            document.createElement(
                "span"
            );


        tagElement.className =
            "question-tag";


        tagElement.textContent =
            `#${tagName}`;


        container.appendChild(
            tagElement
        );
    });
}


// ==================================================
// 選択肢選択
// ==================================================

function selectOption(
    optionId,
    button
) {

    selectedOptionId =
        Number(optionId);


    document
        .querySelectorAll(
            ".option-button"
        )
        .forEach(
            optionButton => {

                optionButton.classList.remove(
                    "selected"
                );
            }
        );


    button.classList.add(
        "selected"
    );


    const answerButton =
        document.getElementById(
            "answerButton"
        );


    if (answerButton) {

        answerButton.disabled =
            false;
    }
}


// ==================================================
// 回答送信
// ==================================================

async function submitAnswer(
    detail = null
) {

    if (!USER_ID) {

        alert(
            "ログインしてください。"
        );

        showLoginPage();

        return;
    }


    const question =
        questions[
            currentQuestionIndex
        ];


    if (!question) {

        return;
    }


    // ==================================================
    // detail がない場合は取得
    // ==================================================

    if (!detail) {

        try {

            const detailResponse =
                await fetch(
                    `${API_BASE}/questions/${question.id}`
                );


            if (!detailResponse.ok) {

                throw new Error(
                    `HTTP ${detailResponse.status}`
                );
            }


            detail =
                await detailResponse.json();


        } catch (error) {

            console.error(
                "問題詳細取得エラー:",
                error
            );


            alert(
                "問題情報の取得に失敗しました。"
            );

            return;
        }
    }


    const answerType =
        detail.answer_type ||
        question.answer_type ||
        "choice";


    // ==================================================
    // 送信データ
    // ==================================================

    const requestBody = {

        user_id:
            Number(USER_ID),

        question_id:
            Number(question.id),

        selected_option_id:
            null,

        numeric_value:
            null,

        text_value:
            null
    };


    // ==================================================
    // 選択式
    // ==================================================

    if (
        answerType === "choice"
    ) {

        if (
            selectedOptionId === null
        ) {

            return;
        }


        requestBody.selected_option_id =
            Number(
                selectedOptionId
            );
    }


    // ==================================================
    // 数値入力式
    // ==================================================

    else if (
        answerType === "numeric"
    ) {

        const numericInput =
            document.getElementById(
                "numericAnswer"
            );


        if (!numericInput) {

            return;
        }


        const rawValue =
            numericInput.value.trim();


        if (rawValue === "") {

            const error =
                document.getElementById(
                    "numericAnswerError"
                );


            if (error) {

                error.textContent =
                    "数字を入力してください";
            }


            numericInput.focus();

            return;
        }


        const numericValue =
            Number(rawValue);


        if (
            !Number.isFinite(
                numericValue
            )
        ) {

            const error =
                document.getElementById(
                    "numericAnswerError"
                );


            if (error) {

                error.textContent =
                    "正しい数字を入力してください";
            }


            numericInput.focus();

            return;
        }


        requestBody.numeric_value =
            numericValue;
    }


    // ==================================================
    // 時刻入力式
    // ==================================================

    else if (
        answerType === "time"
    ) {

        const timeInput =
            document.getElementById(
                "timeAnswer"
            );


        if (!timeInput) {

            return;
        }


        const timeValue =
            timeInput.value;


        if (!timeValue) {

            const error =
                document.getElementById(
                    "timeAnswerError"
                );


            if (error) {

                error.textContent =
                    "時刻を入力してください";
            }


            timeInput.focus();

            return;
        }


        const parts =
            timeValue.split(":");


        const hours =
            Number(parts[0]);

        const minutes =
            Number(parts[1]);


        if (
            !Number.isInteger(hours) ||
            !Number.isInteger(minutes) ||
            hours < 0 ||
            hours > 23 ||
            minutes < 0 ||
            minutes > 59
        ) {

            alert(
                "正しい時刻を入力してください。"
            );

            return;
        }


        requestBody.numeric_value =
            hours * 60 + minutes;
    }


    // ==================================================
    // 送信
    // ==================================================

    const answerButton =
        document.getElementById(
            "answerButton"
        );


    if (answerButton) {

        answerButton.disabled =
            true;

        answerButton.textContent =
            "送信中...";
    }


    try {

        console.log(
            "回答送信:",
            requestBody
        );


        const response =
            await fetch(
                `${API_BASE}/answers`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify(
                            requestBody
                        )
                }
            );


        if (!response.ok) {

            const errorText =
                await response.text();


            console.error(
                "回答APIエラー:",
                response.status,
                errorText
            );


            let message =
                `回答送信失敗: HTTP ${response.status}`;


            try {

                const errorData =
                    JSON.parse(
                        errorText
                    );


                if (errorData.detail) {

                    message =
                        errorData.detail;
                }

            } catch {

                // JSONでなければそのまま
            }


            throw new Error(
                message
            );
        }


        const savedAnswer =
            await response.json();


        console.log(
            "回答保存成功:",
            savedAnswer
        );


        answeredQuestionIds.add(
            Number(
                question.id
            )
        );


        await showResult(
            Number(
                question.id
            )
        );


    } catch (error) {

        console.error(
            "回答送信エラー:",
            error
        );


        if (answerButton) {

            answerButton.disabled =
                false;

            answerButton.textContent =
                "回答する";
        }


        alert(
            "回答の送信に失敗しました。\n\n" +
            error.message
        );
    }
}


// ==================================================
// 1問ごとの結果
// ==================================================

async function showResult(
    questionId
) {

    try {

        console.log(
            "結果取得:",
            questionId
        );


        const response =
            await fetch(
                `${API_BASE}/questions/${questionId}/result?user_id=${USER_ID}`
            );


        if (!response.ok) {

            const errorText =
                await response.text();


            console.error(
                "結果APIエラー:",
                response.status,
                errorText
            );


            throw new Error(
                `結果取得失敗: HTTP ${response.status}`
            );
        }


        const result =
            await response.json();


        console.log(
            "結果:",
            result
        );


        // ==================================================
        // 画面切り替え
        // ==================================================

        document
            .getElementById(
                "questionSection"
            )
            ?.classList.add(
                "hidden"
            );


        document
            .getElementById(
                "overallResultSection"
            )
            ?.classList.add(
                "hidden"
            );


        document
            .getElementById(
                "resultSection"
            )
            ?.classList.remove(
                "hidden"
            );


        // ==================================================
        // 自分の回答
        // ==================================================

        const yourAnswer =
            result.your_answer;


        const yourAnswerKey =
            document.getElementById(
                "yourAnswerKey"
            );

        const yourAnswerText =
            document.getElementById(
                "yourAnswerText"
            );


        const numericYourAnswer =
            yourAnswer
                ? Number(
                    yourAnswer.numeric_value
                )
                : null;


        const hasNumericAnswer =
            yourAnswer &&
            yourAnswer.numeric_value !== null &&
            yourAnswer.numeric_value !== undefined &&
            Number.isFinite(
                numericYourAnswer
            );


        if (yourAnswer) {

            if (yourAnswerKey) {

                if (hasNumericAnswer) {

                    yourAnswerKey.textContent =
                        "";

                } else {

                    yourAnswerKey.textContent =
                        yourAnswer.key || "-";
                }
            }


            if (yourAnswerText) {

                if (hasNumericAnswer) {

                    if (
                        result.answer_type === "time" ||
                        result.aggregation_type === "time_average"
                    ) {

                        yourAnswerText.textContent =
                            minutesToTime(
                                numericYourAnswer
                            );

                    } else {

                        yourAnswerText.textContent =
                            formatNumber(
                                numericYourAnswer
                            );
                    }

                } else {

                    yourAnswerText.textContent =
                        yourAnswer.text || "-";
                }
            }

        } else {

            if (yourAnswerKey) {

                yourAnswerKey.textContent =
                    "-";
            }


            if (yourAnswerText) {

                yourAnswerText.textContent =
                    "-";
            }
        }


        // ==================================================
        // 数値式の結果
        // ==================================================

        const resultIsNumeric =
            result.answer_type === "numeric" ||
            result.answer_type === "time" ||
            result.aggregation_type === "numeric_average" ||
            result.aggregation_type === "time_average" ||
            hasNumericAnswer;


        const resultAverage =
            Number(
                result.numeric_average ??
                result.average ??
                result.global_average ??
                result.question_average
            );


        if (
            resultIsNumeric &&
            Number.isFinite(resultAverage)
        ) {

            showNumericResult(
                result,
                numericYourAnswer,
                resultAverage
            );

        } else {

            showChoiceResult(
                result,
                yourAnswer
            );
        }


        // ==================================================
        // 回答者数
        // ==================================================

        const totalAnswers =
            document.getElementById(
                "totalAnswers"
            );


        if (totalAnswers) {

            totalAnswers.textContent =
                `${result.total_answers ?? 0}人`;
        }


        // ==================================================
        // 次の問題
        // ==================================================

        const nextButton =
            document.getElementById(
                "nextButton"
            );


        if (nextButton) {

            nextButton.textContent =
                "次の問題";


            nextButton.onclick =
                nextQuestion;
        }


        // ==================================================
        // ユーザー平均更新
        // ==================================================

        await loadUserAverage();


    } catch (error) {

        console.error(
            "結果取得エラー:",
            error
        );


        alert(
            "結果の取得に失敗しました。\n\n" +
            error.message
        );
    }
}


// ==================================================
// 数値結果表示
// ==================================================

function showNumericResult(
    result,
    numericYourAnswer,
    average
) {

    const percentageElement =
        document.getElementById(
            "resultPercentage"
        );


    if (percentageElement) {

        percentageElement.textContent =
            "平均値";
    }


    const resultDescription =
        document.getElementById(
            "resultDescription"
        );


    if (resultDescription) {

        if (
            !Number.isFinite(
                numericYourAnswer
            )
        ) {

            resultDescription.textContent =
                `みんなの平均は ${formatNumber(
                    average
                )} です。`;

        } else {

            const difference =
                numericYourAnswer -
                average;


            const absoluteDifference =
                Math.abs(
                    difference
                );


            if (
                absoluteDifference <
                0.000001
            ) {

                resultDescription.textContent =
                    "あなたの答えは、みんなの平均とほぼ同じです。";

            } else if (
                difference > 0
            ) {

                resultDescription.textContent =
                    `みんなの平均より ${formatNumber(
                        absoluteDifference
                    )} 大きい答えです。`;

            } else {

                resultDescription.textContent =
                    `みんなの平均より ${formatNumber(
                        absoluteDifference
                    )} 小さい答えです。`;
            }
        }
    }


    const resultOptions =
        document.getElementById(
            "resultOptions"
        );


    if (resultOptions) {

        resultOptions.innerHTML = "";


        const averageCard =
            document.createElement(
                "div"
            );


        averageCard.className =
            "result-numeric-average";


        const isTime =
            result.answer_type === "time" ||
            result.aggregation_type === "time_average";


        const yourDisplay =
            Number.isFinite(
                numericYourAnswer
            )
                ? (
                    isTime
                        ? minutesToTime(
                            numericYourAnswer
                        )
                        : formatNumber(
                            numericYourAnswer
                        )
                )
                : "-";


        const averageDisplay =
            isTime
                ? minutesToTime(
                    average
                )
                : formatNumber(
                    average
                );


        averageCard.innerHTML = `
            <div class="numeric-result-row">

                <span>
                    あなたの答え
                </span>

                <strong>
                    ${escapeHtml(
                        yourDisplay
                    )}
                </strong>

            </div>

            <div class="numeric-result-row">

                <span>
                    みんなの平均
                </span>

                <strong>
                    ${escapeHtml(
                        averageDisplay
                    )}
                </strong>

            </div>
        `;


        resultOptions.appendChild(
            averageCard
        );
    }


    const majorityAnswer =
        document.getElementById(
            "majorityAnswer"
        );


    if (majorityAnswer) {

        majorityAnswer.textContent =
            Number.isFinite(
                average
            )
                ? `平均 · ${
                    result.answer_type === "time" ||
                    result.aggregation_type === "time_average"
                        ? minutesToTime(average)
                        : formatNumber(average)
                }`
                : "-";
    }
}


// ==================================================
// 選択式結果表示
// ==================================================

function showChoiceResult(
    result,
    yourAnswer
) {

    const percentage =
        Number(
            result.same_answer_percentage ??
            result.selected_option_percentage ??
            result.percentage ??
            0
        );


    const percentageElement =
        document.getElementById(
            "resultPercentage"
        );


    if (percentageElement) {

        percentageElement.textContent =
            `${percentage.toFixed(1)}%`;
    }


    const resultDescription =
        document.getElementById(
            "resultDescription"
        );


    if (resultDescription) {

        resultDescription.textContent =
            result.is_majority
                ? "あなたは多数派の回答を選びました。"
                : "あなたは少数派の回答を選びました。";
    }


    const resultOptions =
        document.getElementById(
            "resultOptions"
        );


    if (!resultOptions) {

        return;
    }


    resultOptions.innerHTML =
        "";


    const options =
        Array.isArray(
            result.options
        )
            ? result.options
            : [];


    options.forEach(
        option => {

            const optionPercentage =
                Number(
                    option.percentage ?? 0
                );


            const count =
                Number(
                    option.count ?? 0
                );


            const isYourAnswer =
                yourAnswer &&
                Number(
                    yourAnswer.option_id
                ) ===
                Number(
                    option.option_id
                );


            const optionItem =
                document.createElement(
                    "div"
                );


            optionItem.className =
                "result-option";


            if (isYourAnswer) {

                optionItem.classList.add(
                    "your-choice"
                );
            }


            optionItem.innerHTML =
                `
                <div class="result-option-header">

                    <div class="result-option-name">

                        <span class="result-option-key">
                            ${escapeHtml(
                                option.option_key
                            )}
                        </span>

                        <span class="result-option-text">
                            ${escapeHtml(
                                option.option_text
                            )}
                        </span>

                        ${
                            isYourAnswer
                                ? `
                                <span class="your-choice-badge">
                                    あなた
                                </span>
                                `
                                : ""
                        }

                    </div>

                    <div class="result-option-percentage">
                        ${optionPercentage.toFixed(1)}%
                    </div>

                </div>

                <div class="result-bar">

                    <div
                        class="result-bar-fill"
                        style="width: ${Math.max(
                            0,
                            Math.min(
                                optionPercentage,
                                100
                            )
                        )}%"
                    ></div>

                </div>

                <div class="result-option-count">
                    ${count}人
                </div>
                `;


            resultOptions.appendChild(
                optionItem
            );
        }
    );


    if (
        options.length === 0
    ) {

        resultOptions.innerHTML =
            `
            <p class="error-message">
                回答データがありません
            </p>
            `;
    }


    const majorityAnswer =
        document.getElementById(
            "majorityAnswer"
        );


    if (majorityAnswer) {

        if (result.majority) {

            const majorityPercentage =
                Number(
                    result.majority.percentage ?? 0
                );


            majorityAnswer.textContent =
                `${result.majority.key} · ${majorityPercentage.toFixed(1)}%`;

        } else {

            majorityAnswer.textContent =
                "-";
        }
    }
}

// ==================================================
// 多数派度合い
// ==================================================

function getMajorityDegree(
    majorityRate
) {

    const rate =
        Number(majorityRate);


    if (
        !Number.isFinite(rate)
    ) {

        return "どっちつかず";
    }


    const diff =
        Math.abs(
            rate - 50
        );


    if (
        diff <= 10
    ) {

        return "どっちつかず";

    } else if (
        diff <= 20
    ) {

        return "やや";

    } else if (
        diff <= 30
    ) {

        return "そこそこ";

    } else {

        return "THE";
    }
}


// ==================================================
// 平均度合い
// ==================================================

function getAverageDegree(
    averageScore
) {

    const score =
        Number(averageScore);


    if (
        !Number.isFinite(score)
    ) {

        return "まだ回答がありません";
    }


    if (
        score < 40
    ) {

        return "かなり";

    } else if (
        score < 50
    ) {

        return "だいぶ";

    } else if (
        score < 60
    ) {

        return "じゃっかん";

    } else if (
        score < 70
    ) {

        return "そこそこ";

    } else if (
        score < 80
    ) {

        return "ほぼ";

    } else if (
        score < 90
    ) {

        return "かなり";

    } else {

        return "THE";
    }
}


// ==================================================
// 多数派説明
// ==================================================

function getMajorityDescription(
    majorityRate,
    degree
) {

    const rate =
        Number(majorityRate);


    if (
        !Number.isFinite(rate)
    ) {

        return "-";
    }


    if (
        degree === "どっちつかず"
    ) {

        return "多数派と少数派のどちらにも大きく偏っていません。";

    } else if (
        degree === "やや"
    ) {

        return "少しだけ多数派・少数派のどちらかに寄っています。";

    } else if (
        degree === "そこそこ"
    ) {

        return "多数派・少数派の傾向がそこそこ出ています。";

    } else {

        return "かなりはっきりと多数派・少数派の傾向が出ています。";
    }
}


// ==================================================
// 平均説明
// ==================================================

function getAverageDescription(
    averageScore,
    averageDistance,
    degree
) {

    const score =
        Number(averageScore);


    if (
        !Number.isFinite(score)
    ) {

        return "-";
    }


    if (
        score >= 90
    ) {

        return "あなたの答えは、全体の平均とかなり近い傾向があります。";

    } else if (
        score >= 80
    ) {

        return "あなたの答えは、全体の平均とかなり近いです。";

    } else if (
        score >= 70
    ) {

        return "あなたの答えは、全体の平均とほぼ同じ傾向です。";

    } else if (
        score >= 60
    ) {

        return "あなたの答えは、全体の平均からそこそこ近い位置にあります。";

    } else if (
        score >= 50
    ) {

        return "あなたの答えは、全体の平均からじゃっかん離れています。";

    } else {

        return "あなたの答えは、全体の平均からかなり離れている傾向があります。";
    }
}

// ==================================================
// ユーザー平均
// ==================================================

async function loadUserAverage() {

    if (!USER_ID) {

        return;
    }


    try {

        const response =
            await fetch(
                `${API_BASE}/users/${USER_ID}/average`
            );


        if (!response.ok) {

            throw new Error(
                `HTTP ${response.status}`
            );
        }


        const data =
            await response.json();


        console.log(
            "ユーザー平均:",
            data
        );


        const numericSummary =
            data.numeric_summary || {};


        const averageScore =
            Number(
                numericSummary.average_score
                ?? data.overall_evaluation?.average_score
            );


        const averageElement =
            document.getElementById(
                "userAverage"
            );


        const levelElement =
            document.getElementById(
                "userLevel"
            );


        // ==================================================
        // 数値・時間問題がまだない
        // ==================================================

        if (
            numericSummary.answered_questions === 0 ||
            !Number.isFinite(
                averageScore
            )
        ) {

            if (averageElement) {

                averageElement.textContent =
                    "--%";
            }


            if (levelElement) {

                levelElement.textContent =
                    "まだ回答がありません";
            }


            return;
        }


        // ==================================================
        // 平均度合い表示
        // ==================================================

        if (averageElement) {

            averageElement.textContent =
                `${averageScore.toFixed(1)}%`;
        }


        const averageDegree =
            data.overall_evaluation?.average_degree
            || getAverageDegree(
                averageScore
            );


        if (levelElement) {

            levelElement.textContent =
                averageDegree;
        }


    } catch (error) {

        console.error(
            "平均値取得エラー:",
            error
        );
    }
}


// ==================================================
// 読み込み中
// ==================================================

function showQuestionLoading() {

    const title =
        document.getElementById(
            "questionTitle"
        );


    const text =
        document.getElementById(
            "questionText"
        );


    const options =
        document.getElementById(
            "options"
        );


    const answerButton =
        document.getElementById(
            "answerButton"
        );


    if (title) {

        title.textContent =
            "読み込み中...";
    }


    if (text) {

        text.textContent =
            "問題を読み込んでいます。";
    }


    if (options) {

        options.innerHTML =
            "";
    }


    if (answerButton) {

        answerButton.disabled =
            true;

        answerButton.textContent =
            "回答する";

        answerButton.onclick =
            null;
    }
}


// ==================================================
// 問題なし
// ==================================================

function showNoQuestions() {

    const questionSection =
        document.getElementById(
            "questionSection"
        );


    if (!questionSection) {

        return;
    }


    const typeName =
        currentType === "extra"
            ? "EXTRA"
            : "ORDINARY";


    let message = "";


    if (
        currentFilter === "unanswered"
    ) {

        message =
            `${typeName}に未回答の問題はありません。`;

    } else if (
        currentFilter === "answered"
    ) {

        message =
            `${typeName}には回答済みの問題がありません。`;

    } else {

        message =
            `${typeName}に公開されている問題がありません。`;
    }


    questionSection.classList.remove(
        "hidden"
    );


    questionSection.innerHTML = `
        <div class="question-empty">

            <h2 class="question-title">
                問題がありません
            </h2>

            <p class="question-text">
                ${escapeHtml(message)}
            </p>

        </div>
    `;
}

// ==================================================
// 問題取得エラー
// ==================================================

function showQuestionError() {

    const title =
        document.getElementById(
            "questionTitle"
        );


    const text =
        document.getElementById(
            "questionText"
        );


    const options =
        document.getElementById(
            "options"
        );


    const answerButton =
        document.getElementById(
            "answerButton"
        );


    if (title) {

        title.textContent =
            "問題の読み込みに失敗しました";
    }


    if (text) {

        text.textContent =
            "APIとの通信を確認してください。";
    }


    if (options) {

        options.innerHTML =
            "";
    }


    if (answerButton) {

        answerButton.disabled =
            true;

        answerButton.textContent =
            "回答する";

        answerButton.onclick =
            null;
    }
}


// ==================================================
// 数値フォーマット
// ==================================================

function formatNumber(
    value
) {

    const number =
        Number(value);


    if (
        !Number.isFinite(number)
    ) {

        return "-";
    }


    if (
        Number.isInteger(number)
    ) {

        return String(number);
    }


    return number
        .toFixed(1)
        .replace(
            /\.0$/,
            ""
        );
}


// ==================================================
// 分 → HH:MM
// ==================================================

function minutesToTime(
    totalMinutes
) {

    const value =
        Number(totalMinutes);


    if (
        !Number.isFinite(value)
    ) {

        return "-";
    }


    let minutes =
        Math.round(value);


    minutes =
        Math.max(
            0,
            Math.min(
                1439,
                minutes
            )
        );


    const hours =
        Math.floor(
            minutes / 60
        );


    const remainingMinutes =
        minutes % 60;


    return `${String(hours).padStart(
        2,
        "0"
    )}:${String(
        remainingMinutes
    ).padStart(
        2,
        "0"
    )}`;
}


// ==================================================
// HTMLエスケープ
// ==================================================

function escapeHtml(
    value
) {

    return String(
        value ?? ""
    )
        .replaceAll(
            "&",
            "&amp;"
        )
        .replaceAll(
            "<",
            "&lt;"
        )
        .replaceAll(
            ">",
            "&gt;"
        )
        .replaceAll(
            '"',
            "&quot;"
        )
        .replaceAll(
            "'",
            "&#039;"
        );
}