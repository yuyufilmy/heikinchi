const API_BASE_URL = "http://127.0.0.1:8000";

let adminToken = localStorage.getItem("heikinnchi_admin_token") || "";

let questions = [];
let categories = [];

let currentFilter = "all";
let editingQuestionId = null;
let deletingQuestionId = null;


// ======================================================
// 初期化
// ======================================================

document.addEventListener("DOMContentLoaded", () => {

    setupEvents();

    if (adminToken) {
        showAdminScreen();
        loadAdminData();
    } else {
        showLoginScreen();
    }

});


// ======================================================
// イベント設定
// ======================================================

function setupEvents() {

    // ログイン
    document
        .getElementById("loginForm")
        .addEventListener("submit", handleLogin);


    // ログアウト
    document
        .getElementById("logoutButton")
        .addEventListener("click", handleLogout);


    // 更新
    document
        .getElementById("refreshButton")
        .addEventListener("click", loadAdminData);


    // 新しい問題
    document
        .getElementById("newQuestionButton")
        .addEventListener("click", openNewQuestionModal);


    // 問題保存
    document
        .getElementById("questionForm")
        .addEventListener("submit", handleQuestionSubmit);


    // モーダル閉じる
    document
        .getElementById("closeModalButton")
        .addEventListener("click", closeQuestionModal);


    document
        .getElementById("cancelQuestionButton")
        .addEventListener("click", closeQuestionModal);


    // 選択肢追加
    document
        .getElementById("addOptionButton")
        .addEventListener("click", () => {

            addOptionEditor();

        });


    // 回答形式変更
    document
        .getElementById("answerType")
        .addEventListener("change", updateOptionVisibility);


    // 削除キャンセル
    document
        .getElementById("cancelDeleteButton")
        .addEventListener("click", closeDeleteModal);


    // 削除確定
    document
        .getElementById("confirmDeleteButton")
        .addEventListener("click", confirmDeleteQuestion);


    // 検索
    document
        .getElementById("questionSearch")
        .addEventListener("input", renderQuestionList);


    // フィルター
    document
        .querySelectorAll(".filter-button")
        .forEach(button => {

            button.addEventListener("click", () => {

                document
                    .querySelectorAll(".filter-button")
                    .forEach(item => {
                        item.classList.remove("active");
                    });

                button.classList.add("active");

                currentFilter = button.dataset.filter;

                renderQuestionList();

            });

        });


    // モーダル外クリック
    document
        .getElementById("questionModal")
        .addEventListener("click", event => {

            if (event.target.id === "questionModal") {
                closeQuestionModal();
            }

        });


    // 削除モーダル外クリック
    document
        .getElementById("deleteModal")
        .addEventListener("click", event => {

            if (event.target.id === "deleteModal") {
                closeDeleteModal();
            }

        });

}


// ======================================================
// ログイン
// ======================================================

async function handleLogin(event) {

    event.preventDefault();

    const username =
        document
            .getElementById("adminUsername")
            .value
            .trim();

    const password =
        document
            .getElementById("adminPassword")
            .value;


    const errorElement =
        document.getElementById("loginError");

    const loginButton =
        document.getElementById("loginButton");


    errorElement.textContent = "";

    loginButton.disabled = true;
    loginButton.textContent = "ログイン中...";


    try {

        const response = await fetch(
            `${API_BASE_URL}/admin/login`,
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    username,
                    password
                })
            }
        );


        const data = await response.json();


        if (!response.ok) {

            throw new Error(
                data.detail ||
                "ログインに失敗しました"
            );

        }


        adminToken = data.token;

        localStorage.setItem(
            "heikinnchi_admin_token",
            adminToken
        );


        document.getElementById("adminUsername").value = "";
        document.getElementById("adminPassword").value = "";


        showAdminScreen();

        await loadAdminData();


        showToast("管理者としてログインしました");


    } catch (error) {

        console.error(error);

        errorElement.textContent =
            error.message ||
            "ログインに失敗しました";


    } finally {

        loginButton.disabled = false;
        loginButton.textContent = "ログイン";

    }

}


// ======================================================
// ログアウト
// ======================================================

async function handleLogout() {

    try {

        await fetch(
            `${API_BASE_URL}/admin/logout`,
            {
                method: "POST",

                headers: {
                    "Authorization":
                        `Bearer ${adminToken}`
                }
            }
        );

    } catch (error) {

        console.error(error);

    }


    adminToken = "";

    localStorage.removeItem(
        "heikinnchi_admin_token"
    );


    showLoginScreen();

    showToast("ログアウトしました");

}


// ======================================================
// 画面切り替え
// ======================================================

function showLoginScreen() {

    document
        .getElementById("loginSection")
        .classList.remove("hidden");


    document
        .getElementById("adminSection")
        .classList.add("hidden");

}


function showAdminScreen() {

    document
        .getElementById("loginSection")
        .classList.add("hidden");


    document
        .getElementById("adminSection")
        .classList.remove("hidden");

}


// ======================================================
// データ読み込み
// ======================================================

async function loadAdminData() {

    try {

        await Promise.all([
            loadCategories(),
            loadQuestions()
        ]);


        renderQuestionList();
        updateStatistics();


    } catch (error) {

        console.error(error);

        if (
            error.message === "ADMIN_AUTH_ERROR"
        ) {

            adminToken = "";

            localStorage.removeItem(
                "heikinnchi_admin_token"
            );

            showLoginScreen();

            showToast(
                "管理者認証が切れています"
            );

        } else {

            showToast(
                error.message ||
                "データの読み込みに失敗しました"
            );

        }

    }

}


// ======================================================
// カテゴリ取得
// ======================================================

async function loadCategories() {

    const response = await fetch(
        `${API_BASE_URL}/categories`
    );


    if (!response.ok) {

        throw new Error(
            "カテゴリの取得に失敗しました"
        );

    }


    categories = await response.json();

}


// ======================================================
// 問題取得
// ======================================================

async function loadQuestions() {

    const response = await fetch(
        `${API_BASE_URL}/admin/questions`,
        {
            headers: {
                "Authorization":
                    `Bearer ${adminToken}`
            }
        }
    );


    if (
        response.status === 401 ||
        response.status === 403
    ) {

        throw new Error(
            "ADMIN_AUTH_ERROR"
        );

    }


    if (!response.ok) {

        throw new Error(
            "問題一覧の取得に失敗しました"
        );

    }


    questions = await response.json();

}


// ======================================================
// 統計表示
// ======================================================

function updateStatistics() {

    const total =
        questions.length;


    const published =
        questions.filter(
            question => question.is_published
        ).length;


    const draft =
        total - published;


    document
        .getElementById("totalQuestionCount")
        .textContent = total;


    document
        .getElementById("publishedQuestionCount")
        .textContent = published;


    document
        .getElementById("draftQuestionCount")
        .textContent = draft;

}


// ======================================================
// 問題一覧表示
// ======================================================

function renderQuestionList() {

    const list =
        document.getElementById("questionList");


    const empty =
        document.getElementById("questionListEmpty");


    const search =
        document
            .getElementById("questionSearch")
            .value
            .trim()
            .toLowerCase();


    let filteredQuestions =
        [...questions];


    // フィルター
    if (currentFilter === "published") {

        filteredQuestions =
            filteredQuestions.filter(
                question =>
                    question.is_published
            );

    }


    if (currentFilter === "draft") {

        filteredQuestions =
            filteredQuestions.filter(
                question =>
                    !question.is_published
            );

    }


    // 検索
    if (search) {

        filteredQuestions =
            filteredQuestions.filter(
                question => {

                    const title =
                        question.title ||
                        "";

                    const text =
                        question.question_text ||
                        "";

                    const questionType =
                        question.question_type ||
                        "ORDINARY";


                    return (
                        title
                            .toLowerCase()
                            .includes(search)
                        ||
                        text
                            .toLowerCase()
                            .includes(search)
                        ||
                        questionType
                            .toLowerCase()
                            .includes(search)
                    );

                }
            );

    }


    // 並び順
    filteredQuestions.sort(
        (a, b) => {

            const sortA =
                Number(a.sort_order || 0);

            const sortB =
                Number(b.sort_order || 0);

            if (sortA !== sortB) {
                return sortA - sortB;
            }

            return Number(a.id) - Number(b.id);

        }
    );


    document
        .getElementById("displayQuestionCount")
        .textContent =
            `${filteredQuestions.length}件`;


    if (filteredQuestions.length === 0) {

        list.innerHTML = "";

        empty.classList.remove("hidden");

        return;

    }


    empty.classList.add("hidden");


    list.innerHTML =
        filteredQuestions
            .map(createQuestionCard)
            .join("");


    // 編集
    list
        .querySelectorAll(
            "[data-action='edit']"
        )
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    const id =
                        Number(
                            button.dataset.id
                        );

                    openEditQuestionModal(id);

                }
            );

        });


    // 公開
    list
        .querySelectorAll(
            "[data-action='publish']"
        )
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    const id =
                        Number(
                            button.dataset.id
                        );

                    togglePublish(id);

                }
            );

        });


    // 削除
    list
        .querySelectorAll(
            "[data-action='delete']"
        )
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    const id =
                        Number(
                            button.dataset.id
                        );

                    openDeleteModal(id);

                }
            );

        });

}


// ======================================================
// 問題カード
// ======================================================

function createQuestionCard(question) {

    const category =
        categories.find(
            category =>
                Number(category.id) ===
                Number(question.category_id)
        );


    const categoryName =
        category
            ? category.name
            : `カテゴリID: ${question.category_id}`;


    const published =
        Boolean(question.is_published);


    const answerType =
        getAnswerTypeLabel(
            question.answer_type
        );


    const aggregationType =
        getAggregationTypeLabel(
            question.aggregation_type
        );


    const questionType =
        question.question_type ||
        "ORDINARY";


    const questionTypeLabel =
        getQuestionTypeLabel(
            questionType
        );


    return `
        <article
            class="admin-question-card
                ${published ? "published" : "draft"}"
        >

            <div class="question-card-top">

                <div class="question-card-number">
                    #${escapeHtml(question.id)}
                </div>

                <div class="question-card-status
                    ${published ? "published" : "draft"}">

                    ${
                        published
                            ? "公開中"
                            : "非公開"
                    }

                </div>

            </div>


            <div class="question-card-content">

                <div class="question-card-meta">

                    <span>
                        ${escapeHtml(categoryName)}
                    </span>

                    <span>
                        ${escapeHtml(questionTypeLabel)}
                    </span>

                    <span>
                        ${escapeHtml(answerType)}
                    </span>

                    <span>
                        ${escapeHtml(aggregationType)}
                    </span>

                    <span>
                        並び順 ${escapeHtml(
                            question.sort_order ?? 0
                        )}
                    </span>

                </div>


                <h3>
                    ${escapeHtml(
                        question.title || "無題"
                    )}
                </h3>


                <p>
                    ${escapeHtml(
                        question.question_text || ""
                    )}
                </p>

            </div>


            <div class="question-card-actions">

                <button
                    type="button"
                    class="card-action-button"
                    data-action="edit"
                    data-id="${question.id}"
                >
                    編集
                </button>


                <button
                    type="button"
                    class="card-action-button"
                    data-action="publish"
                    data-id="${question.id}"
                >
                    ${
                        published
                            ? "非公開にする"
                            : "公開する"
                    }
                </button>


                <button
                    type="button"
                    class="card-action-button danger"
                    data-action="delete"
                    data-id="${question.id}"
                >
                    削除
                </button>

            </div>

        </article>
    `;

}


// ======================================================
// 質問タイプラベル
// ======================================================

function getQuestionTypeLabel(type) {

    switch (type) {

        case "EXTRA":
            return "EXTRA（特別）";

        case "ORDINARY":
            return "ORDINARY（通常）";

        default:
            return "ORDINARY（通常）";

    }

}


// ======================================================
// 新規問題
// ======================================================

function openNewQuestionModal() {

    editingQuestionId = null;


    document
        .getElementById("modalEyebrow")
        .textContent = "NEW QUESTION";


    document
        .getElementById("modalTitle")
        .textContent = "新しい問題";


    document
        .getElementById("editingQuestionId")
        .value = "";


    document
        .getElementById("questionTitle")
        .value = "";


    document
        .getElementById("questionText")
        .value = "";


    document
        .getElementById("questionSortOrder")
        .value = "0";


    // 質問タイプ
    document
        .getElementById("questionType")
        .value = "ORDINARY";


    document
        .getElementById("answerType")
        .value = "choice";


    document
        .getElementById("aggregationType")
        .value =
            "choice_percentage";


    document
        .getElementById("questionPublished")
        .checked = false;


    populateCategorySelect();


    const optionList =
        document.getElementById(
            "optionEditorList"
        );


    optionList.innerHTML = "";


    addOptionEditor();
    addOptionEditor();


    updateOptionVisibility();


    clearFormError();


    document
        .getElementById("questionModal")
        .classList.remove("hidden");

}


// ======================================================
// 編集
// ======================================================

async function openEditQuestionModal(
    questionId
) {

    try {

        const question =
            questions.find(
                item =>
                    Number(item.id) ===
                    Number(questionId)
            );


        if (!question) {

            showToast(
                "問題が見つかりません"
            );

            return;

        }


        editingQuestionId =
            Number(question.id);


        document
            .getElementById("modalEyebrow")
            .textContent = "EDIT QUESTION";


        document
            .getElementById("modalTitle")
            .textContent = "問題を編集";


        document
            .getElementById("editingQuestionId")
            .value = question.id;


        populateCategorySelect(
            question.category_id
        );


        document
            .getElementById("questionTitle")
            .value =
                question.title || "";


        document
            .getElementById("questionText")
            .value =
                question.question_text || "";


        document
            .getElementById("questionSortOrder")
            .value =
                question.sort_order ?? 0;


        // 質問タイプ
        document
            .getElementById("questionType")
            .value =
                question.question_type ||
                "ORDINARY";


        document
            .getElementById("answerType")
            .value =
                question.answer_type || "choice";


        document
            .getElementById("aggregationType")
            .value =
                question.aggregation_type ||
                "choice_percentage";


        document
            .getElementById("questionPublished")
            .checked =
                Boolean(question.is_published);


        clearFormError();


        // 選択肢
        const optionList =
            document.getElementById(
                "optionEditorList"
            );


        optionList.innerHTML = "";


        if (
            question.answer_type ===
            "choice"
        ) {

            let options = [];


            try {

                const response =
                    await fetch(
                        `${API_BASE_URL}/questions/${question.id}/options`
                    );


                if (response.ok) {

                    options =
                        await response.json();

                }

            } catch (error) {

                console.error(error);

            }


            if (options.length === 0) {

                addOptionEditor();
                addOptionEditor();

            } else {

                options
                    .sort(
                        (a, b) =>
                            Number(
                                a.sort_order || 0
                            )
                            -
                            Number(
                                b.sort_order || 0
                            )
                    )
                    .forEach(option => {

                        addOptionEditor(option);

                    });

            }

        }


        updateOptionVisibility();


        document
            .getElementById("questionModal")
            .classList.remove("hidden");


    } catch (error) {

        console.error(error);

        showToast(
            "問題の読み込みに失敗しました"
        );

    }

}


// ======================================================
// カテゴリセレクト
// ======================================================

function populateCategorySelect(
    selectedId = null
) {

    const select =
        document.getElementById(
            "questionCategory"
        );


    const activeCategories =
        categories.filter(
            category =>
                category.is_active !== false
        );


    select.innerHTML =
        `<option value="">
            カテゴリを選択
        </option>`;


    activeCategories
        .sort(
            (a, b) =>
                Number(a.id) - Number(b.id)
        )
        .forEach(category => {

            const option =
                document.createElement(
                    "option"
                );


            option.value =
                category.id;


            option.textContent =
                category.name;


            if (
                selectedId !== null &&
                Number(selectedId) ===
                Number(category.id)
            ) {

                option.selected = true;

            }


            select.appendChild(option);

        });

}


// ======================================================
// 選択肢エディタ
// ======================================================

function addOptionEditor(
    option = null
) {

    const list =
        document.getElementById(
            "optionEditorList"
        );


    const index =
        list.children.length;


    const optionKey =
        option?.option_key ||
        String.fromCharCode(
            65 + index
        );


    const optionText =
        option?.option_text ||
        "";


    const sortOrder =
        option?.sort_order ??
        index;


    const wrapper =
        document.createElement("div");


    wrapper.className =
        "option-editor";


    wrapper.innerHTML = `

        <div class="option-editor-number">
            ${index + 1}
        </div>


        <input
            type="text"
            class="option-key-input"
            placeholder="キー"
            value="${escapeAttribute(
                optionKey
            )}"
            maxlength="20"
        >


        <input
            type="text"
            class="option-text-input"
            placeholder="選択肢の内容"
            value="${escapeAttribute(
                optionText
            )}"
        >


        <input
            type="number"
            class="option-sort-input"
            placeholder="順番"
            value="${escapeAttribute(
                sortOrder
            )}"
            min="0"
        >


        <button
            type="button"
            class="option-remove-button"
        >
            ×
        </button>

    `;


    wrapper
        .querySelector(
            ".option-remove-button"
        )
        .addEventListener(
            "click",
            () => {

                wrapper.remove();

                renumberOptionEditors();

            }
        );


    list.appendChild(wrapper);

}


// ======================================================
// 選択肢番号更新
// ======================================================

function renumberOptionEditors() {

    document
        .querySelectorAll(
            ".option-editor"
        )
        .forEach(
            (element, index) => {

                const number =
                    element.querySelector(
                        ".option-editor-number"
                    );

                if (number) {

                    number.textContent =
                        index + 1;

                }

            }
        );

}


// ======================================================
// 選択肢表示切替
// ======================================================

function updateOptionVisibility() {

    const answerType =
        document
            .getElementById("answerType")
            .value;


    const optionsSection =
        document.getElementById(
            "optionsSection"
        );


    if (answerType === "choice") {

        optionsSection.classList.remove(
            "disabled"
        );

    } else {

        optionsSection.classList.add(
            "disabled"
        );

    }

}


// ======================================================
// 問題保存
// ======================================================

async function handleQuestionSubmit(
    event
) {

    event.preventDefault();


    clearFormError();


    const categoryId =
        Number(
            document
                .getElementById(
                    "questionCategory"
                )
                .value
        );


    const title =
        document
            .getElementById(
                "questionTitle"
            )
            .value
            .trim();


    const questionText =
        document
            .getElementById(
                "questionText"
            )
            .value
            .trim();


    // 質問タイプ
    const questionType =
        document
            .getElementById(
                "questionType"
            )
            .value;


    const answerType =
        document
            .getElementById(
                "answerType"
            )
            .value;


    const aggregationType =
        document
            .getElementById(
                "aggregationType"
            )
            .value;


    const isPublished =
        document
            .getElementById(
                "questionPublished"
            )
            .checked;


    const sortOrder =
        Number(
            document
                .getElementById(
                    "questionSortOrder"
                )
                .value
        ) || 0;


    if (!categoryId) {

        showFormError(
            "カテゴリを選択してください"
        );

        return;

    }


    if (!title) {

        showFormError(
            "タイトルを入力してください"
        );

        return;

    }


    if (!questionText) {

        showFormError(
            "問題文を入力してください"
        );

        return;

    }


    if (
        questionType !== "ORDINARY" &&
        questionType !== "EXTRA"
    ) {

        showFormError(
            "質問タイプが不正です"
        );

        return;

    }


    let options = [];


    if (answerType === "choice") {

        options =
            collectOptions();


        if (options.length < 2) {

            showFormError(
                "選択肢を2つ以上設定してください"
            );

            return;

        }


        const keys =
            options.map(
                option =>
                    option.option_key
            );


        if (
            new Set(keys).size !==
            keys.length
        ) {

            showFormError(
                "選択肢キーが重複しています"
            );

            return;

        }

    }


    const saveButton =
        document.getElementById(
            "saveQuestionButton"
        );


    saveButton.disabled = true;
    saveButton.textContent = "保存中...";


    try {

        if (editingQuestionId) {

            await updateQuestion(
                editingQuestionId,
                {
                    category_id: categoryId,
                    title,
                    question_text: questionText,
                    question_type: questionType,
                    answer_type: answerType,
                    aggregation_type:
                        aggregationType,
                    is_published:
                        isPublished,
                    sort_order: sortOrder
                }
            );


            if (answerType === "choice") {

                await syncQuestionOptions(
                    editingQuestionId,
                    options
                );

            }


            showToast(
                "問題を更新しました"
            );


        } else {

            await createQuestion({
                category_id: categoryId,
                title,
                question_text:
                    questionText,
                question_type:
                    questionType,
                answer_type:
                    answerType,
                aggregation_type:
                    aggregationType,
                is_published:
                    isPublished,
                sort_order:
                    sortOrder,
                options
            });


            showToast(
                "問題を追加しました"
            );

        }


        closeQuestionModal();


        await loadAdminData();


    } catch (error) {

        console.error(error);

        showFormError(
            error.message ||
            "保存に失敗しました"
        );


    } finally {

        saveButton.disabled = false;
        saveButton.textContent = "保存する";

    }

}


// ======================================================
// 選択肢収集
// ======================================================

function collectOptions() {

    const editors =
        document.querySelectorAll(
            ".option-editor"
        );


    const options = [];


    editors.forEach(
        (editor, index) => {

            const key =
                editor
                    .querySelector(
                        ".option-key-input"
                    )
                    .value
                    .trim();


            const text =
                editor
                    .querySelector(
                        ".option-text-input"
                    )
                    .value
                    .trim();


            const sortOrder =
                Number(
                    editor
                        .querySelector(
                            ".option-sort-input"
                        )
                        .value
                ) || index;


            if (!key && !text) {
                return;
            }


            options.push({
                option_key: key,
                option_text: text,
                sort_order: sortOrder
            });

        }
    );


    return options;

}


// ======================================================
// 問題作成API
// ======================================================

async function createQuestion(
    questionData
) {

    const response =
        await fetch(
            `${API_BASE_URL}/questions`,
            {
                method: "POST",

                headers: {
                    "Content-Type":
                        "application/json",

                    "Authorization":
                        `Bearer ${adminToken}`
                },

                body:
                    JSON.stringify(
                        questionData
                    )
            }
        );


    if (
        response.status === 401 ||
        response.status === 403
    ) {

        throw new Error(
            "管理者権限がありません"
        );

    }


    const data =
        await response.json();


    if (!response.ok) {

        throw new Error(
            data.detail ||
            "問題の作成に失敗しました"
        );

    }


    return data;

}


// ======================================================
// 問題更新API
// ======================================================

async function updateQuestion(
    questionId,
    questionData
) {

    const response =
        await fetch(
            `${API_BASE_URL}/questions/${questionId}`,
            {
                method: "PUT",

                headers: {
                    "Content-Type":
                        "application/json",

                    "Authorization":
                        `Bearer ${adminToken}`
                },

                body:
                    JSON.stringify(
                        questionData
                    )
            }
        );


    if (
        response.status === 401 ||
        response.status === 403
    ) {

        throw new Error(
            "管理者権限がありません"
        );

    }


    const data =
        await response.json();


    if (!response.ok) {

        throw new Error(
            data.detail ||
            "問題の更新に失敗しました"
        );

    }


    return data;

}


// ======================================================
// 選択肢同期
// ======================================================

async function syncQuestionOptions(
    questionId,
    newOptions
) {

    const response =
        await fetch(
            `${API_BASE_URL}/questions/${questionId}/options`
        );


    if (!response.ok) {

        throw new Error(
            "既存の選択肢を取得できませんでした"
        );

    }


    const oldOptions =
        await response.json();


    // 既存選択肢を削除
    for (
        const oldOption of oldOptions
    ) {

        await deleteOption(
            questionId,
            oldOption.id
        );

    }


    // 新しい選択肢を追加
    for (
        const option of newOptions
    ) {

        await createOption(
            questionId,
            option
        );

    }

}


// ======================================================
// 選択肢作成
// ======================================================

async function createOption(
    questionId,
    option
) {

    const response =
        await fetch(
            `${API_BASE_URL}/questions/${questionId}/options`,
            {
                method: "POST",

                headers: {
                    "Content-Type":
                        "application/json",

                    "Authorization":
                        `Bearer ${adminToken}`
                },

                body:
                    JSON.stringify(option)
            }
        );


    if (
        response.status === 401 ||
        response.status === 403
    ) {

        throw new Error(
            "管理者権限がありません"
        );

    }


    const data =
        await response.json();


    if (!response.ok) {

        throw new Error(
            data.detail ||
            "選択肢の作成に失敗しました"
        );

    }


    return data;

}


// ======================================================
// 選択肢削除
// ======================================================

async function deleteOption(
    questionId,
    optionId
) {

    const response =
        await fetch(
            `${API_BASE_URL}/questions/${questionId}/options/${optionId}`,
            {
                method: "DELETE",

                headers: {
                    "Authorization":
                        `Bearer ${adminToken}`
                }
            }
        );


    if (
        response.status === 401 ||
        response.status === 403
    ) {

        throw new Error(
            "管理者権限がありません"
        );

    }


    if (!response.ok) {

        const data =
            await response.json();


        throw new Error(
            data.detail ||
            "選択肢の削除に失敗しました"
        );

    }

}


// ======================================================
// 公開 / 非公開
// ======================================================

async function togglePublish(
    questionId
) {

    try {

        const response =
            await fetch(
                `${API_BASE_URL}/questions/${questionId}/publish`,
                {
                    method: "PATCH",

                    headers: {
                        "Authorization":
                            `Bearer ${adminToken}`
                    }
                }
            );


        if (
            response.status === 401 ||
            response.status === 403
        ) {

            throw new Error(
                "管理者権限がありません"
            );

        }


        const data =
            await response.json();


        if (!response.ok) {

            throw new Error(
                data.detail ||
                "公開状態の変更に失敗しました"
            );

        }


        showToast(
            data.message ||
            "公開状態を変更しました"
        );


        await loadAdminData();


    } catch (error) {

        console.error(error);

        showToast(
            error.message ||
            "公開状態の変更に失敗しました"
        );

    }

}


// ======================================================
// 削除モーダル
// ======================================================

function openDeleteModal(
    questionId
) {

    const question =
        questions.find(
            item =>
                Number(item.id) ===
                Number(questionId)
        );


    if (!question) {
        return;
    }


    deletingQuestionId =
        Number(questionId);


    document
        .getElementById(
            "deleteQuestionName"
        )
        .textContent =
            `「${question.title || "無題"}」を削除します。`;


    document
        .getElementById("deleteModal")
        .classList.remove("hidden");

}


function closeDeleteModal() {

    deletingQuestionId = null;


    document
        .getElementById("deleteModal")
        .classList.add("hidden");

}


// ======================================================
// 削除実行
// ======================================================

async function confirmDeleteQuestion() {

    if (!deletingQuestionId) {
        return;
    }


    const button =
        document.getElementById(
            "confirmDeleteButton"
        );


    button.disabled = true;
    button.textContent = "削除中...";


    try {

        const response =
            await fetch(
                `${API_BASE_URL}/questions/${deletingQuestionId}`,
                {
                    method: "DELETE",

                    headers: {
                        "Authorization":
                            `Bearer ${adminToken}`
                    }
                }
            );


        if (
            response.status === 401 ||
            response.status === 403
        ) {

            throw new Error(
                "管理者権限がありません"
            );

        }


        const data =
            await response.json();


        if (!response.ok) {

            throw new Error(
                data.detail ||
                "問題の削除に失敗しました"
            );

        }


        closeDeleteModal();


        showToast(
            data.message ||
            "問題を削除しました"
        );


        await loadAdminData();


    } catch (error) {

        console.error(error);

        showToast(
            error.message ||
            "問題の削除に失敗しました"
        );


    } finally {

        button.disabled = false;
        button.textContent = "削除する";

    }

}


// ======================================================
// 問題モーダル閉じる
// ======================================================

function closeQuestionModal() {

    document
        .getElementById("questionModal")
        .classList.add("hidden");


    editingQuestionId = null;


    clearFormError();

}


// ======================================================
// 回答形式ラベル
// ======================================================

function getAnswerTypeLabel(
    type
) {

    switch (type) {

        case "choice":
            return "選択式";

        case "numeric":
            return "数値入力";

        case "time":
            return "時間入力";

        default:
            return type || "未設定";

    }

}


// ======================================================
// 集計方式ラベル
// ======================================================

function getAggregationTypeLabel(
    type
) {

    switch (type) {

        case "choice_percentage":
            return "選択肢別割合";

        case "numeric_average":
            return "数値平均";

        case "time_average":
            return "時間平均";

        default:
            return type || "未設定";

    }

}


// ======================================================
// フォームエラー
// ======================================================

function showFormError(
    message
) {

    const element =
        document.getElementById(
            "formError"
        );


    element.textContent = message;

    element.classList.remove(
        "hidden"
    );

}


function clearFormError() {

    const element =
        document.getElementById(
            "formError"
        );


    element.textContent = "";

    element.classList.add(
        "hidden"
    );

}


// ======================================================
// トースト
// ======================================================

let toastTimer = null;


function showToast(
    message
) {

    const toast =
        document.getElementById(
            "toast"
        );


    const messageElement =
        document.getElementById(
            "toastMessage"
        );


    messageElement.textContent =
        message;


    toast.classList.remove(
        "hidden"
    );


    clearTimeout(
        toastTimer
    );


    toastTimer =
        setTimeout(
            () => {

                toast.classList.add(
                    "hidden"
                );

            },
            3000
        );

}


// ======================================================
// HTMLエスケープ
// ======================================================

function escapeHtml(
    value
) {

    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");

}


function escapeAttribute(
    value
) {

    return escapeHtml(value);

}