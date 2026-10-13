const QUIZ_LENGTH = 5; // 設定每次測驗抽出的題目數量
const QUESTION_BANK_SIZE = 15; // 設定題庫必須提供的題目數量
const FONT_STACK = '"Chiron Hei HK", "Chiron Sung HK", sans-serif'; // 設定 p5.js 的預設混合字型堆疊
const CJK_FONT = "Chiron Hei HK"; // 設定中文與中文標點使用的字型
const LATIN_FONT = "Chiron Sung HK"; // 設定英文與數字使用的字型
const BACKGROUND_COLOR = "#f4f1ea"; // 設定畫布背景顏色
const OPTION_COLOR = "#ffffff"; // 設定一般選項背景顏色
const CORRECT_COLOR = "#d88180"; // 設定答錯時正確選項的背景顏色
const WRONG_COLOR = "#f2c6c2"; // 設定使用者選錯選項的背景顏色
const SUCCESS_COLOR = "#4f927b"; // 設定答對提示文字顏色
const BUTTON_COLOR = "#527a8c"; // 設定按鈕背景顏色
const INPUT_LOCK_TIME = 350; // 設定觸控與滑鼠重複事件的鎖定時間

let questionTable = null; // 儲存從 CSV 載入的 p5.Table 物件
let questionBank = []; // 儲存從 CSV 解析出的 15 題題庫
let selectedQuestions = []; // 儲存本次隨機抽出的 5 題
let quizState = "loading"; // 儲存題庫載入狀態
let loadErrorMessage = ""; // 儲存題庫載入失敗或格式錯誤訊息
let currentQuestion = 0; // 儲存目前顯示的題目索引
let score = 0; // 儲存本次測驗答對題數
let answered = false; // 記錄目前題目是否已作答
let selectedOption = -1; // 儲存使用者選擇的選項索引
let quizFinished = false; // 記錄本次測驗是否已完成
let layout = {}; // 儲存目前畫面的響應式版面資料
let nextButton = {}; // 儲存下一題按鈕的點擊範圍
let restartButton = {}; // 儲存重新開始按鈕的點擊範圍
let lastInputTime = -INPUT_LOCK_TIME; // 儲存上一次輸入事件時間
let canvasElement = null; // 儲存 p5.js 畫布物件

function setup() { // 建立畫布並開始載入 CSV 題庫
  canvasElement = createCanvas(windowWidth, windowHeight); // 建立符合視窗大小的全螢幕畫布
  canvasElement.parent("app"); // 將畫布放入 index.html 的 app 容器
  canvasElement.elt.style.fontFamily = FONT_STACK; // 設定畫布元素的混合字型堆疊
  canvasElement.elt.style.touchAction = "none"; // 停用畫布的瀏覽器預設觸控行為
  textAlign(CENTER, CENTER); // 設定 p5.js 文字預設水平與垂直置中
  textFont(FONT_STACK); // 設定 p5.js 預設文字字型
  smooth(); // 啟用平滑繪圖效果
  calculateStatusLayout(); // 計算載入與錯誤畫面的基本版面
  loadQuestionTable(); // 使用 p5.js loadTable 載入外部 CSV 題庫
} // 結束 setup 函式

function loadQuestionTable() { // 使用指定格式開始載入 questions.csv
  try { // 嘗試執行 CSV 載入工作
    questionTable = loadTable("questions.csv", "csv", "header", handleTableLoaded, handleTableLoadError); // 使用 p5.js loadTable 讀取含標題列的 CSV
  } catch (error) { // 捕捉瀏覽器或載入方法立即拋出的錯誤
    handleTableLoadError(error); // 將立即錯誤交給統一錯誤處理函式
  } // 結束錯誤捕捉處理
} // 結束題庫載入函式

function handleTableLoaded(table) { // 處理 questions.csv 成功載入的回呼
  questionTable = table; // 保存成功載入的 p5.Table 物件
  const rows = questionTable.getRows(); // 取得 CSV 中的所有資料列
  if (rows.length < QUESTION_BANK_SIZE) { // 判斷題庫是否少於要求的 15 題
    handleTableLoadError(new Error("題庫題數不足 15 題。")); // 顯示題數不足錯誤訊息
    return; // 結束不足題數的處理流程
  } // 結束題數不足判斷
  const parsedQuestions = []; // 建立解析後的題目陣列
  for (let i = 0; i < QUESTION_BANK_SIZE; i += 1) { // 只解析題庫前 15 題以固定抽題範圍
    const row = rows[i]; // 取得目前 CSV 資料列
    const questionText = row.getString("question").trim(); // 讀取 question 欄位並移除前後空白
    const options = [row.getString("option1").trim(), row.getString("option2").trim(), row.getString("option3").trim(), row.getString("option4").trim()]; // 依欄位名稱讀取四個選項
    const answerNumber = Number.parseInt(row.getString("answer").trim(), 10); // 讀取 1 到 4 的答案編號
    if (!questionText || options.some((option) => option.length === 0) || answerNumber < 1 || answerNumber > 4) { // 檢查題目、選項與答案格式是否有效
      handleTableLoadError(new Error(`第 ${i + 2} 列的題目資料格式不正確。`)); // 顯示資料格式錯誤訊息
      return; // 結束無效題目資料的處理流程
    } // 結束題目資料格式判斷
    parsedQuestions.push({ question: questionText, options: options, answer: answerNumber - 1 }); // 將答案由 CSV 的 1 到 4 轉成程式的 0 到 3
  } // 結束 15 題解析迴圈
  questionBank = parsedQuestions; // 將解析後的 15 題保存為正式題庫
  quizState = "ready"; // 將題庫狀態更新為準備完成
  hideLoadingOverlay(); // 隱藏 index.html 的初始載入覆蓋層
  startNewQuiz(); // 載入成功後立即洗牌並開始新測驗
} // 結束 CSV 成功回呼

function handleTableLoadError(error) { // 處理 CSV 載入失敗或資料錯誤
  const detail = error && error.message ? error.message : "找不到 questions.csv 或無法讀取題庫。"; // 取得可供使用者理解的錯誤內容
  loadErrorMessage = `題庫載入失敗：${detail}`; // 組合題庫錯誤訊息
  quizState = "error"; // 將畫面狀態切換為錯誤畫面
  hideLoadingOverlay(); // 隱藏 HTML 初始覆蓋層以顯示畫布錯誤訊息
} // 結束 CSV 錯誤回呼

function hideLoadingOverlay() { // 隱藏 index.html 中的初始載入提示
  const overlay = document.getElementById("loading-overlay"); // 取得 HTML 載入提示元素
  if (overlay) { overlay.style.display = "none"; } // 在元素存在時隱藏載入提示
} // 結束隱藏載入提示函式

function draw() { // 每一幀重新繪製目前畫面
  background(BACKGROUND_COLOR); // 填滿畫布背景顏色
  if (quizState === "loading") { // 判斷題庫是否仍在載入中
    drawLoadingScreen(); // 顯示題庫載入畫面
    return; // 結束本幀繪製
  } // 結束載入狀態判斷
  if (quizState === "error") { // 判斷題庫是否載入失敗
    drawErrorScreen(); // 顯示題庫錯誤畫面
    return; // 結束本幀繪製
  } // 結束錯誤狀態判斷
  if (quizFinished) { // 判斷測驗是否已完成
    drawResultScreen(); // 繪製測驗結果畫面
  } else { // 處理測驗尚未完成的狀態
    drawQuizScreen(); // 繪製題目與選項畫面
  } // 結束測驗完成狀態判斷
} // 結束 draw 函式

function calculateStatusLayout() { // 計算載入與錯誤畫面的響應式版面
  layout.statusSize = constrain(min(width * 0.05, height * 0.07), 18, 34); // 設定狀態標題文字大小
  layout.statusDetailSize = constrain(min(width * 0.035, height * 0.05), 14, 22); // 設定狀態詳細文字大小
  layout.statusWidth = min(width * 0.84, 760); // 設定狀態文字最大寬度
} // 結束狀態版面計算

function drawLoadingScreen() { // 繪製題庫載入中的畫面
  calculateStatusLayout(); // 依目前視窗尺寸更新狀態版面
  noStroke(); // 移除圖形外框
  fill("#333333"); // 設定載入標題顏色
  drawMixedTextCentered("題庫載入中……", width / 2, height * 0.44, layout.statusSize); // 顯示題庫載入標題
  fill("#666666"); // 設定載入詳細文字顏色
  drawMixedTextCentered("請稍候，正在讀取 questions.csv", width / 2, height * 0.54, layout.statusDetailSize); // 顯示 CSV 載入詳細訊息
} // 結束載入畫面繪製

function drawErrorScreen() { // 繪製題庫錯誤畫面
  calculateStatusLayout(); // 依目前視窗尺寸更新錯誤版面
  const lines = wrapTextLines(loadErrorMessage, layout.statusWidth, layout.statusDetailSize); // 將錯誤訊息依寬度自動換行
  noStroke(); // 移除圖形外框
  fill("#b54d4d"); // 設定錯誤標題顏色
  drawMixedTextCentered("無法開始測驗", width / 2, height * 0.38, layout.statusSize); // 顯示錯誤標題
  fill("#555555"); // 設定錯誤詳細文字顏色
  drawMultilineText(lines, width / 2, height * 0.54, layout.statusDetailSize * 1.35, layout.statusDetailSize); // 顯示錯誤詳細訊息
} // 結束錯誤畫面繪製

function startNewQuiz() { // 洗牌並建立一場新的五題測驗
  selectedQuestions = shuffleArray(questionBank).slice(0, QUIZ_LENGTH); // 從 15 題題庫重新洗牌並抽出 5 題
  currentQuestion = 0; // 將目前題目重設為第一題
  score = 0; // 將本次測驗分數歸零
  answered = false; // 清除目前題目的作答狀態
  selectedOption = -1; // 清除使用者上一題的選項紀錄
  quizFinished = false; // 將測驗狀態設定為尚未完成
  calculateLayout(); // 依第一題重新計算響應式版面
} // 結束新測驗函式

function shuffleArray(sourceArray) { // 使用 Fisher-Yates 演算法複製並洗牌陣列
  const result = sourceArray.slice(); // 複製來源陣列避免改變原始題庫順序
  for (let i = result.length - 1; i > 0; i -= 1) { // 從陣列最後一項往前進行洗牌
    const randomIndex = Math.floor(Math.random() * (i + 1)); // 產生目前範圍內的隨機索引
    const temporary = result[i]; // 暫存目前索引的題目
    result[i] = result[randomIndex]; // 將隨機索引題目移到目前位置
    result[randomIndex] = temporary; // 將暫存題目移到隨機索引位置
  } // 結束洗牌迴圈
  return result; // 回傳洗牌後的新陣列
} // 結束洗牌函式

function calculateLayout() { // 計算測驗頁面的響應式版面
  if (selectedQuestions.length === 0) { return; } // 沒有題目時不進行測驗版面計算
  const narrow = width < 600; // 判斷目前是否為窄螢幕
  const landscape = width > height; // 判斷目前是否為橫向畫面
  const compact = height < 520; // 判斷目前是否為高度較小的畫面
  const padding = constrain(width * 0.055, 14, 64); // 依畫面寬度計算左右內距
  const contentWidth = min(width - padding * 2, 920); // 設定內容區域最大寬度
  const titleSize = constrain(min(width * 0.055, height * 0.075), compact ? 20 : 23, 42); // 計算測驗標題大小
  const counterSize = constrain(min(width * 0.033, height * 0.045), 13, 21); // 計算題數標示大小
  const questionSize = constrain(min(width * 0.043, height * 0.062), compact ? 16 : narrow ? 18 : 20, 30); // 計算題目文字大小
  const optionTextSize = constrain(min(width * 0.036, height * 0.05), compact ? 14 : narrow ? 16 : 24, 24); // 計算選項文字大小
  const messageSize = constrain(min(width * 0.032, height * 0.042), 13, 21); // 計算答題提示文字大小
  const buttonTextSize = constrain(min(width * 0.038, height * 0.05), 15, 23); // 計算按鈕文字大小
  const baseOptionHeight = constrain(min(height * (compact ? 0.105 : 0.095), width * 0.12), compact ? 36 : 42, 72); // 計算選項基本高度
  const baseOptionGap = constrain(min(height * 0.018, width * 0.025), 5, 14); // 計算選項基本間距
  const buttonHeight = constrain(min(height * 0.095, width * 0.13), 42, 62); // 計算按鈕高度
  const buttonWidth = constrain(min(contentWidth * 0.48, width * 0.58), 145, 240); // 計算按鈕寬度
  const topY = constrain(height * (landscape ? 0.025 : 0.035), 10, 30); // 計算標題區域上方位置
  const titleY = topY + titleSize * 0.55; // 計算標題中心位置
  const counterY = titleY + titleSize * 0.84; // 計算題數標示中心位置
  const questionWidth = contentWidth * 0.96; // 設定題目可用寬度
  const questionLines = wrapTextLines(selectedQuestions[currentQuestion].question, questionWidth, questionSize); // 計算題目自動換行內容
  const questionLineHeight = questionSize * 1.28; // 設定題目行距
  const questionHeight = questionLines.length * questionLineHeight; // 計算題目總高度
  const questionTop = counterY + counterSize * 0.72 + (compact ? 5 : 10); // 計算題目頂端位置
  const questionY = questionTop + questionHeight / 2; // 計算題目中心位置
  const optionsStartY = questionTop + questionHeight + (compact ? 8 : 14); // 計算選項區域起始位置
  const answerLines = wrapTextLines(getAnswerMessage(), contentWidth, messageSize); // 計算答題提示的換行內容
  const messageLineHeight = messageSize * 1.28; // 設定答題提示行距
  const messageHeight = answered ? answerLines.length * messageLineHeight : 0; // 計算作答後提示區域高度
  const extraHeight = answered ? messageHeight + buttonHeight + (compact ? 22 : 34) : 12; // 計算作答後提示與按鈕所需高度
  const availableOptionHeight = max(height - optionsStartY - extraHeight - 10, 1); // 計算選項可使用的垂直空間
  const baseOptionsTotalHeight = baseOptionHeight * 4 + baseOptionGap * 3; // 計算四個選項的基本總高度
  const fitRatio = constrain(availableOptionHeight / baseOptionsTotalHeight, 0.62, 1); // 計算選項是否需要縮小以符合畫面
  const optionHeight = baseOptionHeight * fitRatio; // 套用畫面適配後的選項高度
  const optionGap = baseOptionGap * fitRatio; // 套用畫面適配後的選項間距
  const optionsTotalHeight = optionHeight * 4 + optionGap * 3; // 計算適配後的選項總高度
  const optionsEndY = optionsStartY + optionsTotalHeight; // 計算選項區域結束位置
  const messageY = optionsEndY + (compact ? 7 : 14) + messageHeight / 2; // 計算答題提示中心位置
  const nextButtonY = min(messageY + messageHeight / 2 + (compact ? 7 : 12), height - buttonHeight - 10); // 計算下一題按鈕頂端位置
  layout = { narrow, landscape, compact, contentWidth, topY, titleSize, counterSize, questionSize, optionTextSize, messageSize, buttonTextSize, buttonHeight, buttonWidth, titleY, counterY, questionLines, questionLineHeight, questionY, optionsStartY, optionHeight, optionGap, optionsTotalHeight, messageLines: answerLines, messageLineHeight, messageY, nextButtonY }; // 集中保存所有測驗版面資料
  nextButton = { x: width / 2 - buttonWidth / 2, y: nextButtonY, w: buttonWidth, h: buttonHeight }; // 更新下一題按鈕點擊範圍
} // 結束測驗版面計算

function calculateResultLayout() { // 計算結果頁面的響應式版面
  const resultTitleSize = constrain(min(width * 0.075, height * 0.1), 27, 58); // 計算結果標題大小
  const resultScoreSize = constrain(min(width * 0.06, height * 0.08), 22, 45); // 計算結果分數大小
  const resultMessageSize = constrain(min(width * 0.038, height * 0.05), 15, 25); // 計算結果鼓勵文字大小
  const buttonWidth = constrain(min(width * 0.6, 260), 160, 260); // 計算重新開始按鈕寬度
  const buttonHeight = constrain(min(height * 0.1, 64), 44, 64); // 計算重新開始按鈕高度
  const resultLines = wrapTextLines(getResultMessage(), width * 0.84, resultMessageSize); // 計算結果鼓勵文字換行內容
  const resultLineHeight = resultMessageSize * 1.32; // 設定結果鼓勵文字行距
  const restartY = min(height * 0.7, height - buttonHeight - 16); // 計算重新開始按鈕垂直位置
  restartButton = { x: width / 2 - buttonWidth / 2, y: restartY, w: buttonWidth, h: buttonHeight }; // 更新重新開始按鈕點擊範圍
  layout.resultTitleSize = resultTitleSize; // 儲存結果標題大小
  layout.resultScoreSize = resultScoreSize; // 儲存結果分數大小
  layout.resultMessageSize = resultMessageSize; // 儲存結果鼓勵文字大小
  layout.resultLines = resultLines; // 儲存結果鼓勵文字換行內容
  layout.resultLineHeight = resultLineHeight; // 儲存結果鼓勵文字行距
} // 結束結果頁版面計算

function drawQuizScreen() { // 繪製測驗題目與選項畫面
  if (!layout.contentWidth) { calculateLayout(); } // 在版面尚未建立時先計算版面
  const questionData = selectedQuestions[currentQuestion]; // 取得目前抽中的題目資料
  noStroke(); // 移除圖形外框
  fill("#333333"); // 設定標題文字顏色
  drawMixedTextCentered("p5.js 簡易指令測驗", width / 2, layout.titleY, layout.titleSize); // 繪製中英數混合標題
  fill("#555555"); // 設定題數文字顏色
  drawMixedTextCentered(`第 ${currentQuestion + 1} 題／共 ${selectedQuestions.length} 題`, width / 2, layout.counterY, layout.counterSize); // 繪製目前題數
  fill("#222222"); // 設定題目文字顏色
  drawMultilineText(layout.questionLines, width / 2, layout.questionY, layout.questionLineHeight, layout.questionSize); // 繪製自動換行題目
  for (let i = 0; i < questionData.options.length; i += 1) { // 逐一繪製四個選項
    let optionY = layout.optionsStartY + i * (layout.optionHeight + layout.optionGap); // 計算目前選項垂直位置
    if (answered && selectedOption !== questionData.answer && i === questionData.answer) { optionY += sin(frameCount * 0.12) * min(10, height * 0.018); } // 答錯時讓正確選項上下跳動
    drawOption(questionData.options[i], width / 2 - layout.contentWidth / 2, optionY, layout.contentWidth, layout.optionHeight, i); // 繪製目前選項按鈕
  } // 結束選項繪製迴圈
  if (answered) { // 判斷目前題目是否已作答
    drawAnswerMessage(); // 繪製答對或答錯提示
    drawButton("下一題", nextButton.x, nextButton.y, nextButton.w, nextButton.h, BUTTON_COLOR, layout.buttonTextSize); // 繪製下一題按鈕
  } // 結束已作答畫面處理
} // 結束測驗畫面繪製

function drawOption(label, x, y, w, h, optionIndex) { // 繪製單一選項按鈕
  const correctIndex = selectedQuestions[currentQuestion].answer; // 取得目前題目的正確答案索引
  let currentColor = OPTION_COLOR; // 設定選項預設背景顏色
  if (answered && selectedOption !== correctIndex && optionIndex === correctIndex) { currentColor = CORRECT_COLOR; } // 答錯時將正確選項設為 #d88180
  if (answered && selectedOption === optionIndex && selectedOption !== correctIndex) { currentColor = WRONG_COLOR; } // 將使用者選錯的選項設為淡紅色
  fill(currentColor); // 填入選項背景顏色
  stroke("#555555"); // 設定選項外框顏色
  strokeWeight(2); // 設定選項外框粗細
  rect(x, y, w, h, min(12, h * 0.2)); // 繪製響應式圓角選項
  noStroke(); // 移除文字外框
  fill("#222222"); // 設定選項文字顏色
  drawMixedTextCentered(label, x + w / 2, y + h / 2, layout.optionTextSize); // 繪製中英數混合選項文字
} // 結束單一選項繪製

function drawAnswerMessage() { // 繪製作答結果提示文字
  const messageColor = selectedOption === selectedQuestions[currentQuestion].answer ? SUCCESS_COLOR : "#b54d4d"; // 依答題結果決定提示顏色
  fill(messageColor); // 設定提示文字顏色
  drawMultilineText(layout.messageLines, width / 2, layout.messageY, layout.messageLineHeight, layout.messageSize); // 繪製自動換行提示文字
} // 結束作答結果繪製

function getAnswerMessage() { // 取得目前題目的作答提示文字
  if (!answered) { return ""; } // 尚未作答時回傳空字串
  const correctIndex = selectedQuestions[currentQuestion].answer; // 取得目前題目的正確答案索引
  if (selectedOption === correctIndex) { return "答對了！"; } // 答對時回傳成功提示
  return `答錯了！正確答案是：${selectedQuestions[currentQuestion].options[correctIndex]}`; // 答錯時回傳正確答案提示
} // 結束作答提示取得

function drawButton(label, x, y, w, h, colorValue, sizeValue) { // 繪製一般按鈕
  fill(colorValue); // 設定按鈕背景顏色
  noStroke(); // 移除按鈕外框
  rect(x, y, w, h, min(12, h * 0.2)); // 繪製響應式圓角按鈕
  fill("#ffffff"); // 設定按鈕文字顏色
  drawMixedTextCentered(label, x + w / 2, y + h / 2, sizeValue); // 繪製按鈕文字
} // 結束一般按鈕繪製

function drawResultScreen() { // 繪製測驗完成結果畫面
  calculateResultLayout(); // 依目前視窗尺寸更新結果頁版面
  noStroke(); // 移除圖形外框
  fill("#333333"); // 設定結果標題顏色
  drawMixedTextCentered("測驗完成！", width / 2, height * 0.24, layout.resultTitleSize); // 繪製結果標題
  fill(BUTTON_COLOR); // 設定成績文字顏色
  drawMixedTextCentered(`你答對了 ${score}／${selectedQuestions.length} 題`, width / 2, height * 0.42, layout.resultScoreSize); // 顯示答對題數
  fill("#555555"); // 設定鼓勵文字顏色
  drawMultilineText(layout.resultLines, width / 2, height * 0.55, layout.resultLineHeight, layout.resultMessageSize); // 繪製自動換行鼓勵文字
  drawButton("重新開始", restartButton.x, restartButton.y, restartButton.w, restartButton.h, BUTTON_COLOR, layout.resultMessageSize); // 繪製重新開始按鈕
} // 結束結果頁繪製

function getResultMessage() { // 依照本次分數取得鼓勵文字
  if (score === selectedQuestions.length) { return "太棒了！你完全掌握 p5.js 基礎指令！"; } // 回傳滿分鼓勵訊息
  if (score >= 3) { return "表現不錯！再練習一下就會更熟悉！"; } // 回傳中高分鼓勵訊息
  return "繼續加油，多練習就能掌握 p5.js！"; // 回傳持續練習鼓勵訊息
} // 結束鼓勵文字取得

function mousePressed() { // 處理滑鼠點擊事件
  if (millis() - lastInputTime < INPUT_LOCK_TIME) { return false; } // 忽略觸控後緊接發生的重複滑鼠事件
  lastInputTime = millis(); // 記錄本次滑鼠輸入時間
  handleInput(mouseX, mouseY); // 將滑鼠座標交給共用輸入函式
  return false; // 阻止瀏覽器預設滑鼠行為
} // 結束滑鼠事件處理

function touchStarted() { // 處理觸控開始事件
  if (touches.length > 0) { // 判斷目前是否有可用觸控座標
    lastInputTime = millis(); // 記錄本次觸控輸入時間
    handleInput(touches[0].x, touches[0].y); // 使用第一個觸控點交給共用輸入函式
  } // 結束觸控座標判斷
  return false; // 阻止瀏覽器預設觸控行為
} // 結束觸控事件處理

function handleInput(inputX, inputY) { // 統一處理滑鼠與觸控輸入
  if (quizState !== "ready") { return; } // 題庫未準備完成時忽略所有輸入
  if (quizFinished) { // 判斷目前是否處於測驗完成畫面
    if (isInsideButton(inputX, inputY, restartButton)) { startNewQuiz(); } // 點擊重新開始按鈕時重新洗牌抽題
    return; // 結束結果頁輸入處理
  } // 結束測驗完成判斷
  if (answered) { // 判斷目前題目是否已經作答
    if (isInsideButton(inputX, inputY, nextButton)) { goToNextQuestion(); } // 點擊下一題按鈕時前往下一題
    return; // 結束已作答狀態輸入處理
  } // 結束已作答判斷
  const optionX = width / 2 - layout.contentWidth / 2; // 計算選項區域左側位置
  for (let i = 0; i < selectedQuestions[currentQuestion].options.length; i += 1) { // 逐一檢查四個選項
    const optionY = layout.optionsStartY + i * (layout.optionHeight + layout.optionGap); // 計算目前選項垂直位置
    if (inputX >= optionX && inputX <= optionX + layout.contentWidth && inputY >= optionY && inputY <= optionY + layout.optionHeight) { // 判斷輸入是否落在選項範圍
      selectedOption = i; // 記錄使用者選擇的選項
      answered = true; // 將目前題目標記為已作答
      if (selectedOption === selectedQuestions[currentQuestion].answer) { score += 1; } // 答對時增加分數
      calculateLayout(); // 作答後重新計算提示與按鈕版面
      return; // 完成選項處理並離開函式
    } // 結束選項範圍判斷
  } // 結束選項檢查迴圈
} // 結束共用輸入處理

function isInsideButton(inputX, inputY, button) { // 判斷輸入座標是否位於按鈕內
  return inputX >= button.x && inputX <= button.x + button.w && inputY >= button.y && inputY <= button.y + button.h; // 回傳按鈕範圍判斷結果
} // 結束按鈕範圍判斷

function goToNextQuestion() { // 前往下一題或顯示測驗結果
  if (currentQuestion === selectedQuestions.length - 1) { // 判斷是否已完成第五題
    quizFinished = true; // 設定測驗完成狀態
    calculateResultLayout(); // 計算結果頁版面
    return; // 結束前往下一題處理
  } // 結束最後一題判斷
  currentQuestion += 1; // 將題目索引加一
  answered = false; // 清除新題目的作答狀態
  selectedOption = -1; // 清除上一題的選項紀錄
  calculateLayout(); // 重新計算新題目的響應式版面
} // 結束前往下一題函式

function restartQuiz() { // 重新開始整場測驗
  startNewQuiz(); // 重新洗牌並從 15 題抽出新的 5 題
} // 結束重新開始函式

function wrapTextLines(message, maxWidth, fontSizeValue) { // 將文字依可用寬度自動換行
  if (!message) { return [""]; } // 空訊息回傳一行以維持版面穩定
  textSize(fontSizeValue); // 設定量測文字寬度時的字體大小
  const tokens = message.match(/[\u3400-\u9fff\u3000-\u303f\uff00-\uffef]|[^\s\u3400-\u9fff\u3000-\u303f\uff00-\uffef]+|\s+/gu) || [message]; // 將中文單字、英文單字與空白切成換行單位
  const lines = []; // 建立換行後的文字陣列
  let currentLine = ""; // 建立正在組合的文字行
  for (const token of tokens) { // 逐一處理每個文字單位
    const candidate = currentLine + token; // 建立加入新文字後的候選行
    if (getMixedTextWidth(candidate, fontSizeValue) <= maxWidth || currentLine.length === 0) { // 判斷候選行是否仍在可用寬度內
      currentLine = candidate; // 將文字加入目前文字行
    } else { // 處理超出可用寬度的文字
      lines.push(currentLine.trim()); // 儲存目前文字行並移除多餘空白
      currentLine = token.trimStart(); // 將目前文字單位放到下一行
      if (getMixedTextWidth(currentLine, fontSizeValue) > maxWidth) { // 判斷單一文字單位是否本身過寬
        const pieces = Array.from(currentLine); // 將過寬文字拆成單一字元
        currentLine = ""; // 清空目前文字行以重新分割
        for (const piece of pieces) { // 逐字元建立可顯示行
          const pieceCandidate = currentLine + piece; // 建立加入字元後的候選行
          if (getMixedTextWidth(pieceCandidate, fontSizeValue) > maxWidth && currentLine.length > 0) { lines.push(currentLine); currentLine = piece; } else { currentLine = pieceCandidate; } // 超寬時換行，否則繼續累積
        } // 結束過寬文字拆分
      } // 結束單一文字過寬判斷
    } // 結束候選行寬度判斷
  } // 結束文字單位迴圈
  if (currentLine.length > 0 || lines.length === 0) { lines.push(currentLine.trim()); } // 儲存最後一行文字
  return lines; // 回傳自動換行後的文字陣列
} // 結束文字換行函式

function splitTextRuns(value) { // 將混合文字依中文與非中文切分成字型片段
  const runs = []; // 建立字型片段陣列
  let currentFont = ""; // 記錄目前片段使用的字型
  let currentText = ""; // 記錄目前片段文字
  for (const character of Array.from(value)) { // 逐一讀取文字中的每個字元
    const font = isCjkCharacter(character) ? CJK_FONT : LATIN_FONT; // 依字元判斷中文或英文數字字型
    if (font !== currentFont && currentText.length > 0) { runs.push({ font: currentFont, text: currentText }); currentText = ""; } // 字型改變時先保存上一個片段
    currentFont = font; // 更新目前片段字型
    currentText += character; // 將字元加入目前片段
  } // 結束字元切分迴圈
  if (currentText.length > 0) { runs.push({ font: currentFont, text: currentText }); } // 保存最後一個文字片段
  return runs; // 回傳依字型分組的文字片段
} // 結束文字片段切分

function isCjkCharacter(character) { // 判斷字元是否應使用中文黑體
  return /[\u3400-\u9fff\u3000-\u303f\uff00-\uffef]/u.test(character); // 中文字與中文標點使用 Chiron Hei HK，其餘使用 Chiron Sung HK
} // 結束中文字元判斷

function getMixedTextWidth(value, fontSizeValue) { // 量測中英數混合文字的實際寬度
  textSize(fontSizeValue); // 設定目前量測使用的字體大小
  let totalWidth = 0; // 建立文字總寬度
  for (const run of splitTextRuns(value)) { // 逐一處理不同字型片段
    textFont(run.font); // 切換至目前片段指定的字型
    totalWidth += textWidth(run.text); // 累加目前片段寬度
  } // 結束文字片段量測
  textFont(FONT_STACK); // 還原 p5.js 預設混合字型
  return totalWidth; // 回傳混合文字總寬度
} // 結束混合文字寬度量測

function drawMixedTextCentered(value, centerX, centerY, fontSizeValue) { // 以字元分流字型並繪製置中文字串
  textSize(fontSizeValue); // 設定目前文字大小
  const runs = splitTextRuns(value); // 取得中英數字型片段
  const totalWidth = getMixedTextWidth(value, fontSizeValue); // 量測整串混合文字寬度
  let cursorX = centerX - totalWidth / 2; // 計算文字繪製起始位置
  textAlign(LEFT, CENTER); // 暫時改用靠左對齊以便逐段接續繪製
  for (const run of runs) { // 逐一繪製每個字型片段
    textFont(run.font); // 使用片段對應的字型
    text(run.text, cursorX, centerY); // 繪製目前文字片段
    cursorX += textWidth(run.text); // 將游標移動至下一片段位置
  } // 結束文字片段繪製
  textFont(FONT_STACK); // 還原 p5.js 預設混合字型
  textAlign(CENTER, CENTER); // 還原文字置中對齊設定
} // 結束混合文字繪製

function drawMultilineText(lines, centerX, centerY, lineHeight, fontSizeValue) { // 繪製多行中英數混合文字
  const totalHeight = lines.length * lineHeight; // 計算多行文字總高度
  const firstLineY = centerY - totalHeight / 2 + lineHeight / 2; // 計算第一行文字中心位置
  for (let i = 0; i < lines.length; i += 1) { // 逐一繪製每一行文字
    drawMixedTextCentered(lines[i], centerX, firstLineY + i * lineHeight, fontSizeValue); // 以字型分流方式繪製目前文字行
  } // 結束多行文字繪製
} // 結束多行文字函式

function windowResized() { // 處理瀏覽器視窗大小改變事件
  resizeCanvas(windowWidth, windowHeight); // 將畫布調整為最新視窗大小
  if (quizState === "loading" || quizState === "error") { calculateStatusLayout(); } // 載入或錯誤狀態時重新計算狀態版面
  if (quizState === "ready" && quizFinished) { calculateResultLayout(); } // 結果頁狀態時重新計算結果版面
  if (quizState === "ready" && !quizFinished) { calculateLayout(); } // 作答頁狀態時重新計算測驗版面
} // 結束視窗大小改變處理
