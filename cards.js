// 〈綻放 BLOOM：產後 180 天〉劇情與卡片資料
//
// 組員改文字只要改這個檔案，不用動 game.js。
//
// 每張卡：
//   who    誰說話（對應 characters）
//   day    產後第幾天
//   text   卡片內容
//   left / right   左滑（拒絕）和右滑（接受）
//     label    選項文字
//     effects  數值變化：mood 精神、baby 寶寶、family 家人關係、bmi BMI（正數＝上升）
//     hours    這個選擇花掉誰的照顧時數：me 你、partner 伴侶、mil 婆婆（可省略）
//     flags    選了之後記下的事，例如 { diet1200: 1 }（可省略）
//     reply    選完後跳出的回應（可省略）
//   when   支線卡：要記下這些事才會出現，例如 { diet1200: 1 }
//   unless 支線卡：記下這些事就「不」出現
//   theory 這張卡對應的理論（之後做理論卡圖鑑用，遊戲中暫時不顯示）
//   extra  true＝只在完整版出現（網址加 ?full）。同學玩的精簡版會跳過，讓整場控制在 8 分鐘左右
//
// App 推薦文章（台灣案例）：卡片加上 type: 'article'，不用 text，改填
//   article  { title 標題, source 來源與日期, summary 摘要, cite 轉引出處（可省略） }
//   quip     最後一行角色的吐槽 { who, text }
//   出處和原文整理在「性別」資料夾的〈台灣案例查證.md〉，改數字前先對那份。
//
// 遊戲會自動記錄「拒絕／接受了誰幾次」，可以直接拿來當條件：
//   'left:mil' 拒絕婆婆的次數、'right:mascot' 接受 App 的次數……
//
// 數值都是 0–100。歸零或到 100 會「崩潰」，但遊戲不會結束（媽媽不能 Game Over）。
// 台灣案例要先查證（記在〈台灣案例查證.md〉），查證前不要寫進卡片。

window.BLOOM_DATA = {
  settings: {
    start: { mood: 60, baby: 50, family: 50, bmi: 60 },
    // BMI 顯示值＝bmiMin～bmiMax 對應內部數值 0～100
    bmiMin: 16,
    bmiMax: 30,
    bmiGoal: 22,
    // 每滑一張卡，精神自動扣這麼多（疲勞）
    fatiguePerCard: 1,
    // 每張卡默默累積的日常照顧時數（沒有協商分工時）
    baseHours: { me: 3, partner: 0.5 },
    // 協商過分工（negotiate）之後的日常照顧時數
    baseHoursShared: { me: 2, partner: 1.5 },
    // 崩潰後數值回到多少
    crashReset: { low: 20, high: 80 },
    totalDays: 180,
    // 最後一章結束時顯示（之後做好結局就會換掉）
    comingSoon: '結局、App 當機後露出的「後台」和「重寫 App」，製作第 6 次加入',
  },

  // 推播干擾：有設定 pushes 的章節，滑卡時偶爾會跳出這些推播蓋住卡片
  pushes: [
    '⏰ 你今天還沒量體重喔！',
    '🔥 限時 8 折：產後代餐 30 天份',
    '💬 3 位媽媽剛剛打卡運動了',
    '🏥 減重門診線上掛號，今天還有名額',
    '📉 你的進度落後 72% 的用戶',
    '✨ 產後瘦回孕前！把握黃金期',
    '🛍️ 你收藏的塑身衣快賣完了',
  ],
  pushOpened: '已為你加入購物車 🛒',

  characters: {
    mascot:   { name: '小綻',     role: 'BLOOM 吉祥物', avatar: 'flower', color: '#ff8fb8' },
    mil:      { name: '婆婆',     role: '來幫忙坐月子', avatar: '👵', color: '#d4a373' },
    partner:  { name: '伴侶',     role: '白天要上班',   avatar: '🧑', color: '#7fb3e6' },
    nurse:    { name: '護理師',   role: '產後衛教',     avatar: '👩‍⚕️', color: '#5cc8a8' },
    coworker: { name: '同事小芸', role: 'LINE 訊息',    avatar: '💼', color: '#b8a1e8' },
    manager:  { name: '陳經理',   role: '你的主管',     avatar: '👔', color: '#8fa3b8' },
    pediatrician: { name: '兒科醫師', role: '滿月健檢', avatar: '🩺', color: '#6ec6d9' },
  },

  intro: {
    appSlogan: '產後身材管理 No.1 App',
    contentNote: '內容提醒：這款遊戲談到產後的身心壓力、身材焦慮與產後憂鬱。如果你或身邊的人需要聊聊，可以撥打衛福部安心專線 1925（24 小時免付費）。',
    greeting: '恭喜成為媽媽！🎉 我是小綻，你的專屬產後教練。',
    ask: '你準備好在 180 天內找回自己了嗎？',
    yes: '準備好了！💪',
    no: '我還沒……',
    noReply: '沒關係，小綻陪你一起準備！倒數已經開始囉 ⏳',
    question: '誰訂的 180 天？',
    // 有設定全班數據（config.js）時才會顯示
    privacyNote: '玩完時，遊戲會匿名送出你的幾個選擇（不含姓名、帳號），報告時用來呈現全班結果。',
    sentNote: '已匿名送出你的選擇，報告時會看到全班結果。',
  },

  chapters: [
    {
      no: '第 1 章',
      title: '第 1 週・坐月子',
      background: [
        '台灣習俗「坐月子」：產後大約一個月，在家或在月子中心休養、進補。',
        '這段時間的照顧，大多落在婆婆、娘家媽媽，或付費的月子中心身上。',
        '同一時間，你手機裡的身材管理 App 已經開始倒數。',
      ],
      boss: 'nightFeed',
      cards: [
        {
          who: 'mascot', day: 1,
          text: '恭喜卸貨🎉！從今天開始，每天早上量一次體重吧，小綻會幫你畫成漂亮的曲線！',
          left:  { label: '先不要', effects: { bmi: 2 },
                   reply: { who: 'mascot', text: '沒關係～但數字不會說謊喔 😊' } },
          right: { label: '好啊', effects: { mood: -4, bmi: -1 } },
          theory: '鄭斐文：BMI 是人口治理技術',
        },
        {
          who: 'mil', day: 2,
          text: '麻油雞煮好了。坐月子就是要補，這一碗全部喝完！',
          left:  { label: '我喝不下', effects: { family: -10, bmi: -2 },
                   reply: { who: 'mil', text: '我當年坐月子，一天吃五餐欸。' } },
          right: { label: '好，我喝', effects: { family: 6, bmi: 8, baby: 4 } },
          theory: '醫學要求互相矛盾',
        },
        {
          who: 'nurse', day: 3,
          text: '親餵的話，大約兩到三小時要餵一次，半夜也是喔。湯湯水水多喝一點，奶才會多。',
          left:  { label: '我想改喝配方奶', effects: { mood: 6, baby: -6, family: -6 },
                   hours: { me: 4, mil: 2 },
                   reply: { who: 'mil', text: '母奶最好啦！外面的奶粉哪有自己的好。' } },
          right: { label: '我會努力', effects: { mood: -10, baby: 10, bmi: 3 },
                   hours: { me: 8 } },
          theory: '鄭斐文：科學母職',
        },
        // 台灣案例：「誰訂的 180 天？」的答案之一（查證見〈台灣案例查證.md〉第 1 項）
        {
          type: 'article', who: 'mascot', day: 4,
          article: {
            title: '產後甩肉 把握黃金六個月',
            source: '《中國時報》2008 年 11 月 16 日 B3 版',
            summary: '文章強調「產後肥胖盛行率 台灣高達93％」，鼓勵「做完月子 每周減半公斤為目標」。',
            cite: '轉引自鄭斐文（2012），頁 61，註 56',
          },
          quip: { who: 'nurse', text: '可是台灣肥胖醫學會理事長在 2025 年的報導裡說，產後一年內減回孕前體重就可以了耶。' },
          left:  { label: '略過', effects: { bmi: 1 } },
          right: { label: '收藏文章', effects: { mood: -3, bmi: -1 },
                   reply: { who: 'mascot', text: '已收藏！距離黃金期結束還有 176 天 ⏳' } },
          theory: '台灣案例：中國時報 2008（鄭斐文 p.61，註 56）',
        },
        {
          who: 'mascot', day: 5,
          text: '偷偷告訴你：產後 6 個月是「黃金減重期」，錯過就很難瘦囉！要開啟每日熱量上限 1200 大卡嗎？',
          left:  { label: '現在先不要', effects: { bmi: 3 },
                   reply: { who: 'mascot', text: '時間不等人喔 ⏳' } },
          right: { label: '開啟', effects: { bmi: -8, mood: -8, baby: -8 },
                   flags: { diet1200: 1 } },
          theory: '鄭斐文：產後「六個月黃金期之內要減重」（p.61）',
        },
        {
          who: 'partner', day: 7,
          text: '陪產檢加陪產假一共只有 7 天，我明天就要回去上班了。晚上我先睡客房好不好？這樣白天才有精神。',
          left:  { label: '不行，夜奶輪流', effects: { family: -8, mood: 8 },
                   hours: { me: 4, partner: 4 }, flags: { negotiate: 1 },
                   reply: { who: 'partner', text: '……好啦，那兩點那一餐我來。' } },
          right: { label: '好吧', effects: { family: 5, mood: -12 },
                   hours: { me: 8 } },
          theory: '上野：無償的再生產勞動',
        },
        // 支線：開了 1200 大卡
        {
          who: 'nurse', day: 8, when: { diet1200: 1 },
          text: '寶寶這兩天尿布比較少。你是不是吃太少了？哺乳期要多吃一點喔。',
          left:  { label: 'App 說要控制熱量', effects: { baby: -8, bmi: -2 },
                   reply: { who: 'nurse', text: 'App 又不會幫你餵奶……' } },
          right: { label: '好，我多吃一點', effects: { baby: 6, bmi: 4 },
                   reply: { who: 'mascot', text: '⚠️ 今日熱量已超標 320 大卡' } },
          theory: '醫學要求互相矛盾',
        },
        {
          who: 'mil', day: 9, extra: true,
          text: '月子裡不能洗頭、不能碰冷水，手機也不要一直滑，對眼睛不好。',
          left:  { label: '我想洗頭', effects: { mood: 8, family: -8 },
                   reply: { who: 'mil', text: '以後老了頭痛不要怪我喔。' } },
          right: { label: '好……', effects: { mood: -6, family: 5 } },
        },
        {
          who: 'coworker', day: 12, extra: true,
          text: '月子還好嗎？產假只有 8 週，大家都在問你什麼時候回來～ ps. 主管說你的專案先交給 Amy 接喔',
          left:  { label: '先已讀', effects: { mood: -4 } },
          right: { label: '回：我會盡快回去', effects: { mood: -8, family: -3 },
                   reply: { who: 'coworker', text: '不急啦～身體顧好！（主管說下個月要開會）' } },
          theory: '上野：雙重負擔',
        },
        {
          who: 'mascot', day: 15, extra: true,
          text: '看看這位網紅媽媽，產後 30 天就穿回孕前牛仔褲！👖 要不要訂購同款「產後束腹帶」？',
          left:  { label: '不用', effects: { bmi: 2 } },
          right: { label: '訂購', effects: { bmi: -4, mood: -4 }, flags: { binder: 1 },
                   reply: { who: 'mascot', text: '已扣款 NT$1,280 💳 穿上就是辣媽！' } },
          theory: '鄭斐文：健康工業集團',
        },
        {
          who: 'mil', day: 18,
          text: '親戚下午要來看寶寶。你換件好看一點的衣服，肚子遮一下。',
          left:  { label: '我想休息，不見客', effects: { mood: 6, family: -10 },
                   reply: { who: 'mil', text: '人家大老遠來欸，你這樣我很難做人。' } },
          right: { label: '好，我去換', effects: { mood: -8, family: 8 },
                   hours: { me: 2, mil: 1 }, flags: { covered: 1 } },
          theory: '高夫曼：掩飾（covering）',
        },
        // 支線：拒絕婆婆兩次以上
        {
          who: 'partner', day: 19, when: { 'left:mil': 2 },
          text: '我媽打給我，說你都不聽她的……她在電話裡哭了。',
          left:  { label: '她說的不一定對', effects: { family: -10, mood: 2 },
                   reply: { who: 'partner', text: '你就不能讓一下嗎？' } },
          right: { label: '我會跟她道歉', effects: { family: 8, mood: -8 } },
        },
        // 支線：買了束腹帶
        {
          who: 'nurse', day: 20, when: { binder: 1 },
          text: '你的傷口有點紅腫。束腹帶綁太緊會壓迫傷口，先拿掉吧。',
          left:  { label: 'App 說要綁滿 8 小時', effects: { mood: -6, bmi: -2 } },
          right: { label: '好，先拿掉', effects: { mood: 4, bmi: 2 },
                   reply: { who: 'mascot', text: '束腹帶已閒置 3 天 😢 要不要試試更強效的塑身衣？' } },
          theory: '鄭斐文：健康工業集團',
        },
        {
          who: 'nurse', day: 21, extra: true,
          text: '寶寶體重增加得有點慢。白天多餵幾次，晚上也要叫醒他喝喔。',
          left:  { label: '我真的好累', effects: { mood: 4, baby: -10 } },
          right: { label: '我再撐一下', effects: { mood: -10, baby: 10 },
                   hours: { me: 6 } },
          theory: '鄭斐文：科學母職',
        },
        {
          who: 'partner', day: 24, extra: true, unless: { 'left:mil': 2 },
          text: '我媽說你最近臉色很臭……你可以對她好一點嗎？',
          left:  { label: '是你媽一直管我', effects: { family: -10, mood: 4 },
                   reply: { who: 'partner', text: '她也是好意啊……' } },
          right: { label: '我知道了', effects: { family: 6, mood: -8 } },
        },
        {
          who: 'mascot', day: 28,
          text: '坐月子報告：你的體重只下降了 1.2 公斤，落後 68% 的媽媽。明天要更努力喔 💪',
          left:  { label: '關掉通知', effects: { mood: 4, bmi: 2 },
                   reply: { who: 'mascot', text: '小綻會在你需要的時候再提醒你 🌸' } },
          right: { label: '我會更努力', effects: { mood: -6, bmi: -4 } },
          theory: '把問題個人化成意志力',
        },
      ],
    },
    {
      no: '第 2 章',
      title: '第 2 個月・產假倒數',
      background: [
        '滿月了。坐月子結束，婆婆準備回南部。',
        '台灣的產假是 8 週。第 57 天，你要決定：回去上班、請育嬰留停，還是離職。',
        '在台灣，已婚婦女有 22.7% 曾因生育離職；離職的人平均隔了 4 年 5 個月才回到職場（衛福部調查，2019）。',
      ],
      boss: 'tetris',
      cards: [
        {
          who: 'mil', day: 30, extra: true,
          text: '滿月了，我明天就回南部喔。你一個人可以吧？有事再打給我。',
          left:  { label: '可以再留一週嗎？', effects: { mood: 6, family: -4 }, hours: { mil: 6 },
                   reply: { who: 'mil', text: '我家裡也有事啊……好啦，再留三天。' } },
          right: { label: '可以，我自己來', effects: { mood: -8, family: 4 } },
          theory: '上野：家庭是市場的「外部」（1.2）',
        },
        {
          who: 'mascot', day: 31, extra: true,
          text: '滿月快樂🎉！「黃金減重期」已經過了 31 天，你的進度落後囉。要不要試用「產後體態私人教練」方案？',
          left:  { label: '不用', effects: { bmi: 2 },
                   reply: { who: 'mascot', text: '沒關係～但其他媽媽都開始了喔 👀' } },
          right: { label: '試用 7 天', effects: { bmi: -3, mood: -4 }, flags: { coach: 1 },
                   reply: { who: 'mascot', text: '試用結束後將自動續訂，每月 NT$2,990 💳' } },
          theory: '鄭斐文：健康工業集團（p.39）',
        },
        {
          who: 'pediatrician', day: 33,
          text: '寶寶的體重曲線往下掉了一點。媽媽要多注意奶量，每一餐都記錄下來喔。',
          left:  { label: '我沒時間記', effects: { baby: -6, mood: 3 },
                   reply: { who: 'pediatrician', text: '媽媽的責任很重要喔，再努力一下。' } },
          right: { label: '好，每餐都記', effects: { baby: 6, mood: -8 }, hours: { me: 4 } },
          theory: '鄭斐文：科學母職（p.61）',
        },
        // 支線：開了 1200 大卡
        {
          who: 'mascot', day: 34, when: { diet1200: 1 },
          text: '1200 大卡挑戰第 30 天 🏆 你瘦了 2.1 公斤！要分享到社群，讓大家看看你的努力嗎？',
          left:  { label: '不要', effects: { mood: 2 } },
          right: { label: '分享', effects: { mood: -2, family: 2 },
                   reply: { who: 'coworker', text: '哇好厲害！（我生完半年才瘦回來欸……）' } },
          theory: '高夫曼：聲望象徵（p.53–58）',
        },
        {
          who: 'partner', day: 35, extra: true,
          text: '我同事說他老婆生完一個月就恢復身材了耶。你要不要也試試 App 的課程？',
          left:  { label: '你可以不要比較嗎', effects: { family: -8, mood: 2 },
                   reply: { who: 'partner', text: '我只是隨口說說啊……' } },
          right: { label: '……好，我試試', effects: { mood: -8, bmi: -2 } },
          theory: '鄭斐文：女性被不成比例地「警告」（p.45–47）',
        },
        // 台灣案例：育嬰留停的性別比例（查證見〈台灣案例查證.md〉第 4 項）
        {
          type: 'article', who: 'mascot', day: 37,
          article: {
            title: '申請單日育嬰留停男性比例陡升至44.3%',
            source: '勞動部新聞稿，2026 年 3 月 9 日',
            summary: '2025 年申請育嬰留停的人，男性只占 27.8%。2026 年起可以「按日」申請，1、2 月按日申請的人裡，男性升到 44.3%。',
          },
          quip: { who: 'partner', text: '那我也來請……三天好了？' },
          left:  { label: '略過' },
          right: { label: '收藏文章', effects: { mood: -2 } },
          theory: '台灣案例：育嬰留停性別比例（勞動部 2026）',
        },
        // 支線：第 1 章要求過夜奶輪流
        {
          who: 'partner', day: 38, when: { negotiate: 1 },
          text: '我上週負責兩點那餐，結果白天開會一直打瞌睡……夜奶可不可以先暫停？',
          left:  { label: '不行，我們說好的', effects: { family: -6, mood: 4 }, hours: { partner: 4 },
                   flags: { negotiate: 1 }, reply: { who: 'partner', text: '……好，我撐。' } },
          right: { label: '好吧，你先休息', effects: { mood: -8, family: 4 }, hours: { me: 4 },
                   flags: { negotiateStop: 1 } },
          theory: '上野：第二次妥協（10.5）',
        },
        {
          who: 'partner', day: 40,
          text: '我也可以請育嬰留停，可是我薪水比較高……還是你請？',
          left:  { label: '我們一人請一半', effects: { family: -6, mood: 4 }, flags: { shareLeave: 1 },
                   reply: { who: 'partner', text: '好……我去問問看主管。' } },
          right: { label: '好吧，我請', effects: { family: 4, mood: -6 }, flags: { myLeave: 1 } },
          theory: '上野：勞動力邊緣化、雙重限制（10.7）',
        },
        {
          who: 'mascot', day: 42,
          text: '小祕訣：餵母奶也能幫助瘦身喔！再忙也要堅持親餵 🍼',
          left:  { label: '我想改成瓶餵', effects: { mood: 6, baby: -4, family: -4 },
                   reply: { who: 'mascot', text: '那記得每天量體重喔 😊' } },
          right: { label: '堅持親餵', effects: { mood: -8, baby: 8 }, hours: { me: 6 } },
          theory: '鄭斐文：科學母職，哺乳也被肥胖科學指導（p.61）',
        },
        {
          who: 'coworker', day: 44, extra: true,
          text: '主管說下個月的專案要開會，問你要不要先遠端參加一下？',
          left:  { label: '我還在產假', effects: { mood: 2 },
                   reply: { who: 'coworker', text: '好喔～我幫你跟他說（他臉色不太好看）' } },
          right: { label: '好，我遠端參加', effects: { mood: -8, baby: -4 }, flags: { workedOnLeave: 1 } },
          theory: '上野：雙重負擔（10.5–10.6）',
        },
        // 支線：試用了私人教練
        {
          who: 'mascot', day: 45, when: { coach: 1 },
          text: '試用期結束囉！「產後體態私人教練」已自動續訂 NT$2,990 💳',
          left:  { label: '取消訂閱', effects: { mood: -3 },
                   reply: { who: 'mascot', text: '取消前，先看看其他媽媽的成功故事吧！（共 3 頁）' } },
          right: { label: '好吧，繼續', effects: { mood: -4, bmi: -2 } },
          theory: '上野：市場吃掉自己的外部（10.2）',
        },
        {
          who: 'mascot', day: 47,
          text: '今日運動目標：60 分鐘 🏃‍♀️ 你已經連續 14 天沒達標了。',
          left:  { label: '我連睡覺的時間都沒有', effects: { mood: 2, bmi: 2 },
                   reply: { who: 'mascot', text: '時間是擠出來的喔！成功的媽媽都 5 點起床 ☀️' } },
          right: { label: '我晚上擠一點時間', effects: { mood: -10, bmi: -3 } },
          theory: '鄭斐文：把問題個人化成意志力（p.61）',
        },
        {
          who: 'manager', day: 53,
          text: '產假快結束了吧？我們很需要你回來。不過你也可以先請育嬰留停，部門會先找人頂。',
          left:  { label: '我第 57 天就回去', effects: { mood: -6, baby: -4, family: -2 }, flags: { backToWork: 1 },
                   reply: { who: 'mil', text: '孩子那麼小，媽媽怎麼捨得……' } },
          right: { label: '我想請育嬰留停', effects: { mood: 2, family: 2 }, flags: { leave: 1 },
                   reply: { who: 'manager', text: '了解……那你的位置，我們再看看。' } },
          theory: '上野：中斷再就業的代價（11.5）',
        },
        {
          // {bmiStatus}、{left} 會自動換成玩家當下的數字
          who: 'mascot', day: 56, extra: true,
          text: '產假最後一天！🎉 你的 {bmiStatus}，距離黃金期結束還有 {left} 天。明天開始，忙也別忘了運動喔！',
          left:  { label: '關掉通知', effects: { mood: 3, bmi: 1 } },
          right: { label: '我會更努力', effects: { mood: -6, bmi: -3 } },
          theory: '把問題個人化成意志力',
        },
      ],
    },
    {
      no: '第 3 章',
      title: '第 3 個月・回到人群',
      background: [
        '第 3 個月。你要回到人群裡了：同事、親戚、鄰居。',
        '產後的身體很難藏：肚子、哺乳、黑眼圈，都會被看見。',
        '法律保障你在公共場所哺乳，但飯桌上的眼光，沒有法律管。',
      ],
      boss: 'gaze',
      // 第 2 章選「回去上班」（backToWork）走職場線，其他人走家族線
      cards: [
        // App 自動更新：之後精神條被藏起來（單一指標治理）
        {
          who: 'mascot', day: 60,
          text: 'BLOOM 3.0 更新 ✨ 為了讓你專注在最重要的目標，我們將隱藏「次要指標」。',
          left:  { label: '稍後提醒我', flags: { hideMood: 1 },
                   reply: { who: 'mascot', text: '已為你自動更新 ✨ 現在只要看 BMI 就好囉！' } },
          right: { label: '立即更新', flags: { hideMood: 1 },
                   reply: { who: 'mascot', text: '更新完成！精神什麼的，就交給小綻吧 🌸' } },
          theory: '鄭斐文：BMI 的單一指標治理（p.40）',
        },
        {
          who: 'manager', day: 61, when: { backToWork: 1 },
          text: '歡迎回來！下週部門聚餐，大家都很想見你喔。',
          left:  { label: '我要早點回家顧寶寶', effects: { family: 2, mood: -2 },
                   reply: { who: 'coworker', text: '（群組裡有人開始叫你「準時下班媽媽」）' } },
          right: { label: '好，我參加', effects: { mood: -4, family: -4 } },
          theory: '上野：雙重負擔（10.5–10.6）',
        },
        {
          who: 'mil', day: 61, unless: { backToWork: 1 },
          text: '下週阿嬤八十大壽，全家族都會來，你帶寶寶回來給大家看看喔。',
          left:  { label: '我想在家休息', effects: { family: -10, mood: 4 },
                   reply: { who: 'mil', text: '大家都在問你，你不來我很難交代欸。' } },
          right: { label: '好，我們回去', effects: { family: 6, mood: -4 } },
          theory: '高夫曼：混類接觸（p.14–22）',
        },
        // 台灣案例：公共場所母乳哺育條例（查證見〈台灣案例查證.md〉第 6 項）
        {
          type: 'article', who: 'mascot', day: 63,
          article: {
            title: '公共場所母乳哺育條例：哺乳，任何人不得驅離',
            source: '衛福部國民健康署；2019 年修法',
            summary: '婦女在公共場所哺乳時，任何人不得禁止、驅離或妨礙，違者罰 6,000 到 30,000 元。2019 年修法，該設哺集乳室卻沒設的場所，罰鍰提高到 2 萬到 10 萬元。',
          },
          quip: { who: 'mil', text: '法律是法律啦，在外面還是要遮一下。' },
          left:  { label: '略過' },
          right: { label: '收藏文章', effects: { mood: 2 } },
          theory: '高夫曼：可見性與掩飾（p.58、121）',
        },
        {
          who: 'coworker', day: 65, when: { backToWork: 1 },
          text: '你要去擠奶喔？會議室可以借你……不過 11 點有人要用。',
          left:  { label: '我去廁所擠就好', effects: { mood: -6, baby: 2 } },
          right: { label: '公司應該要有哺集乳室', effects: { mood: 2, family: -2 }, flags: { speakUp: 1 },
                   reply: { who: 'coworker', text: '說得也是……我幫你問問總務。' } },
          theory: '高夫曼：蹤混通關，把污名藏起來（p.86）',
        },
        {
          who: 'mascot', day: 65, extra: true, unless: { backToWork: 1 },
          text: '媽媽社群熱門話題 🔥「產後 3 個月，你瘦了幾公斤？」要分享你的數字嗎？',
          left:  { label: '不分享', effects: { mood: 2 } },
          right: { label: '分享', effects: { mood: -5 },
                   reply: { who: 'mascot', text: '有 128 位媽媽比你瘦得多，一起加油 💪' } },
          theory: '高夫曼：聲望象徵與污名象徵（p.53–58）',
        },
        {
          who: 'mascot', day: 68,
          text: '出門小提醒 👗 深色衣服、高腰褲最顯瘦！要不要看「產後遮肚穿搭」？',
          left:  { label: '穿我想穿的', effects: { mood: 3 } },
          right: { label: '看看', effects: { mood: -3 }, flags: { covered: 1 },
                   reply: { who: 'mascot', text: '本週熱銷：產後塑身衣 NT$1,680 🛍️' } },
          theory: '高夫曼：掩飾（p.121）',
        },
        {
          who: 'partner', day: 70, extra: true,
          text: '你穿那件洋裝好像有點緊……要不要換一件？',
          left:  { label: '我覺得很好看', effects: { family: -6, mood: 3 },
                   reply: { who: 'partner', text: '好啦好啦，你開心就好。' } },
          right: { label: '……好，我去換', effects: { mood: -6, family: 3 } },
          theory: '高夫曼：虛擬與真實的社會身分（p.2–22）',
        },
        {
          who: 'mascot', day: 76, extra: true,
          text: '新功能上線 📸「身材 AI 評分」：上傳全身照，看看你離「辣媽」還差多少！',
          left:  { label: '不要', effects: { mood: 1 } },
          right: { label: '上傳', effects: { mood: -6, bmi: -1 },
                   reply: { who: 'mascot', text: '你的辣媽指數：62 分，打敗了 41% 的媽媽 🌸' } },
          theory: '鄭斐文：醫學與男性凝視下的「最有吸引力」（p.42）',
        },
        {
          who: 'mil', day: 80,
          text: '親戚都說你胖了，我都幫你說是剛生完啦。',
          left:  { label: '我本來就剛生完啊', effects: { family: -6, mood: 2 } },
          right: { label: '……謝謝媽', effects: { mood: -6, family: 4 } },
          theory: '高夫曼：連帶污名，家人也一起覺得丟臉（p.30）',
        },
        {
          who: 'manager', day: 85, when: { backToWork: 1 },
          text: '這次的升遷名單……我們想說你家裡比較忙，就先不放你了，你應該能理解吧？',
          left:  { label: '我可以勝任', effects: { mood: -2, family: -2 },
                   reply: { who: 'manager', text: '我也是為你好啊。' } },
          right: { label: '……我理解', effects: { mood: -8 } },
          theory: '上野：勞動力邊緣化、雙重限制（10.7）',
        },
        {
          who: 'coworker', day: 85, unless: { backToWork: 1 },
          text: '跟你說一下，你的位置先找了約聘的人頂，主管說等你回來再看看～',
          left:  { label: '我想提早回去', effects: { mood: -4, baby: -4 }, flags: { backEarly: 1 } },
          right: { label: '……好，我知道了', effects: { mood: -6 } },
          theory: '上野：中斷再就業的代價（11.5）',
        },
        {
          who: 'mascot', day: 88,
          text: '第 3 個月報告 📊 你的 {bmiStatus}，距離黃金期結束還有 {left} 天。精神狀況？不用擔心，小綻都幫你藏好了 🌸',
          left:  { label: '把精神條還我', effects: { mood: 2 },
                   reply: { who: 'mascot', text: '這個功能需要升級到 BLOOM Premium 喔 💎' } },
          right: { label: '好……', effects: { mood: -4, bmi: -1 } },
          theory: '鄭斐文：BMI 的單一指標治理（p.40）',
        },
      ],
    },
    {
      no: '第 4 章',
      title: '第 5 個月・最後衝刺',
      background: [
        '距離 App 的「180 天」只剩兩個月，推播越來越多。',
        '2023 年的健康媒體還在說：產後「應好好把握產後6個月的黃金期」。',
        '照顧、瘦身、休息，每一件事都有人想賣你一個方案。',
      ],
      boss: 'whack',
      pushes: { chance: 0.35, max: 3 }, // 推播干擾：每張卡之後有多少機率跳出推播、這章最多幾次
      cards: [
        {
          who: 'mascot', day: 120,
          text: '倒數 60 天 ⏳ 小綻為你準備了「最後衝刺方案」：代餐＋減重門診＋私人教練，每月只要 NT$6,990！',
          left:  { label: '不需要', effects: { bmi: 2 },
                   reply: { who: 'mascot', text: '真的嗎？其他媽媽都報名了喔 👀' } },
          right: { label: '報名', effects: { bmi: -5, mood: -4 }, flags: { sprint: 1 },
                   reply: { who: 'mascot', text: '已扣款 💳 你做了最正確的決定！' } },
          theory: '鄭斐文：健康工業集團（p.39）',
        },
        // 台灣案例：月子中心收費與塑身服務（查證見〈台灣案例查證.md〉第 7 項）
        {
          type: 'article', who: 'mascot', day: 122,
          article: {
            title: '加強產後護理機構管理，維護產婦及嬰兒權益',
            source: '衛生福利部，2013 年 8 月 11 日',
            summary: '衛福部指出，媒體報導部分產後護理機構「入住一個月，動輒50、60萬」，而且「標榜健康管理，卻提供美容、塑身、養生等服務內容」。',
          },
          quip: { who: 'mil', text: '我們那個年代，坐月子都是家裡的人在顧，哪要花錢？' },
          left:  { label: '略過' },
          right: { label: '收藏文章', effects: { mood: -1 } },
          theory: '上野：市場吃掉自己的外部（10.2）',
        },
        {
          who: 'partner', day: 125, extra: true,
          text: '我同事說代餐很有效耶，他老婆就是喝那個瘦的。',
          left:  { label: '我還在餵奶', effects: { family: -4, mood: 2 },
                   reply: { who: 'partner', text: '喔對……我忘了。' } },
          right: { label: '……我試試看', effects: { bmi: -3, baby: -4, mood: -3 } },
          theory: '鄭斐文：女性被不成比例地「警告」（p.45–47）',
        },
        {
          who: 'mil', day: 128, extra: true,
          text: '你還在餵奶，不要亂吃那些代餐，對寶寶不好！',
          left:  { label: 'App 說沒關係', effects: { family: -6, bmi: -1 } },
          right: { label: '好，我不吃了', effects: { family: 4, bmi: 2 },
                   reply: { who: 'mascot', text: '⚠️ 偵測到你暫停了代餐方案，進度可能會落後喔' } },
          theory: '醫學要求互相矛盾',
        },
        {
          who: 'mascot', day: 135,
          text: '⚠️ 你已經 3 天沒有記錄體重了。為了不讓努力白費，已為你開啟「每小時提醒」🔔',
          left:  { label: '關掉提醒', effects: { mood: -2 }, flags: { hourly: 1 },
                   reply: { who: 'mascot', text: '關閉前需要驗證身分……已先為你維持開啟 🔔' } },
          right: { label: '好吧', effects: { mood: -4 }, flags: { hourly: 1 } },
          theory: '鄭斐文：健康工業集團（p.39）',
        },
        {
          who: 'manager', day: 140, when: { backToWork: 1 },
          text: '下個月要去高雄出差三天，你應該可以吧？寶寶給家人顧就好。',
          left:  { label: '我沒辦法出差', effects: { mood: -2 },
                   reply: { who: 'manager', text: '那這個案子就先給別人了。' } },
          right: { label: '我想辦法', effects: { mood: -8, baby: -4 }, hours: { partner: 6, mil: 6 } },
          theory: '上野：勞動力邊緣化、雙重限制（10.7）',
        },
        {
          who: 'coworker', day: 140, unless: { backToWork: 1 },
          text: '主管問你育嬰留停結束後還會不會回來……他說「很多媽媽後來都沒回來」。',
          left:  { label: '我一定會回去', effects: { mood: -4 } },
          right: { label: '我還不知道', effects: { mood: -6 }, flags: { mayQuit: 1 } },
          theory: '台灣：已婚婦女 22.7% 曾因生育離職（衛福部 2019）',
        },
        // 支線：第 2 章要求過育嬰留停一人請一半
        {
          who: 'partner', day: 150, when: { shareLeave: 1 },
          text: '我跟主管說想請育嬰留停，他笑說「男人請什麼育嬰假」……',
          left:  { label: '我們一起想辦法', effects: { family: -2, mood: 4 }, flags: { fight: 1 },
                   reply: { who: 'partner', text: '好，我去問人資怎麼申請。' } },
          right: { label: '算了，我來就好', effects: { mood: -8 }, flags: { giveUp: 1 } },
          theory: '台灣：2025 年申請育嬰留停的男性只占 27.8%（勞動部）',
        },
        {
          who: 'mascot', day: 155, extra: true,
          text: 'BLOOM 獨家數據 📊 堅持到最後的媽媽，平均瘦了 8.2 公斤！你的 {bmiStatus}。',
          left:  { label: '這數據哪來的？', effects: { mood: 2 },
                   reply: { who: 'mascot', text: '數據來自 BLOOM 付費會員 🌸' } },
          right: { label: '我要更努力', effects: { mood: -6, bmi: -2 } },
          theory: '把問題個人化成意志力',
        },
        {
          who: 'mascot', day: 160,
          text: '最後 20 天！🔥 參加「斷食 3 天挑戰」，一口氣衝刺目標！',
          left:  { label: '我不要', effects: { mood: 2 },
                   reply: { who: 'mascot', text: '那就只能看你的意志力了 💪' } },
          right: { label: '參加', effects: { bmi: -6, mood: -10, baby: -6 } },
          theory: '鄭斐文：把問題個人化成意志力（p.61）',
        },
        {
          who: 'partner', day: 170,
          text: '我覺得你最近一直盯著那個 App……你還好嗎？要不要聊聊？',
          left:  { label: '我沒事', effects: { mood: -4 },
                   reply: { who: 'partner', text: '……好，你需要我就說。' } },
          right: { label: '其實我好累', effects: { mood: 6, family: 4 }, flags: { talk: 1 },
                   reply: { who: 'partner', text: '那我們一起想想，哪些事我可以接手。' } },
          theory: '上野：再生產勞動不是本能，要重新分配',
        },
        {
          who: 'mascot', day: 175,
          text: '倒數 5 天 ⏳ 你的 {bmiStatus}。最後的機會，千萬別放棄！',
          left:  { label: '我想先休息', effects: { mood: 3, bmi: 1 },
                   reply: { who: 'mascot', text: '休息是給有達標的人喔 🌸' } },
          right: { label: '我會撐到最後', effects: { mood: -6, bmi: -2 } },
          theory: '把問題個人化成意志力',
        },
      ],
    },
  ],

  bosses: {
    nightFeed: {
      no: 'BOSS',
      title: '夜奶節奏戰',
      theme: 'night',
      seconds: 22, // 22 秒＝晚上 11 點到早上 6 點
      rules: [
        '晚上 11 點到早上 6 點。',
        '寶寶一哭，就點寶寶。光圈縮到最小時點，是「完美安撫」，比較不傷睡眠。',
        '沒點到，寶寶會一直哭，你還是醒著。',
      ],
      partnerLine: '兩點那餐我來！',
      appPush: '🌸 凌晨也是燃脂好時機！要不要來 5 分鐘產後瑜珈？',
      result: '這一晚你起來 {me} 次{partnerPart}。睡眠剩下 {sleep}%。',
      resultPartner: '，伴侶起來 {partner} 次',
      theory: 'uenoInstinct',
    },
    // 24 小時俄羅斯方塊：一格是 1 小時。照顧的事一定要做，你的睡眠和運動可以略過。
    // 照顧＋睡眠＋運動加起來比 24 格多，只有伴侶分擔夜奶（第 1 章協商過）才可能全部塞進去。
    tetris: {
      no: 'BOSS',
      title: '24 小時俄羅斯方塊',
      theme: 'day',
      rules: [
        '一格是 1 小時，一天只有 24 格。🍼 是固定的餵奶時間。',
        '點格子把方塊放進去，⟳ 可以旋轉。',
        '照顧的事一定要做：時間到會自動塞進去，塞不下就變成「做不完」。你的睡眠和運動可以略過。',
      ],
      cols: 6,
      rows: 4,
      feedCells: [0, 3, 6, 9, 12, 15, 18, 21],
      partnerCells: [0, 3], // 協商過夜奶輪流：這兩餐伴侶負責，格子空出來
      partnerName: '伴侶接手的夜奶',
      pieceSeconds: 5,
      kinds: {
        feed:     { icon: '🍼', name: '餵奶' },
        care:     { icon: '🧺', name: '照顧與家事' },
        sleep:    { icon: '💤', name: '你的睡眠' },
        exercise: { icon: '🏃‍♀️', name: '運動' },
      },
      pieces: [
        { label: '哄睡', kind: 'care', shape: [[1, 1]] },
        { label: '你的睡眠', sub: '連續睡 3 小時', kind: 'sleep', optional: true, shape: [[1], [1], [1]] },
        { label: '洗澡、洗奶瓶', kind: 'care', shape: [[1], [1]] },
        { label: '家事、煮飯', kind: 'care', shape: [[1, 0], [1, 1]] },
        { label: '運動 60 分鐘', sub: '＋換衣服、洗澡、找人顧寶寶', kind: 'exercise', optional: true,
          shape: [[1, 1, 0], [0, 1, 1]] },
        { label: '兒科回診', kind: 'care', shape: [[1, 1]] },
        { label: '換尿布', kind: 'care', shape: [[1]] },
        { label: '擠奶', kind: 'care', shape: [[1]] },
      ],
      placed: { sleep: '睡了 3 小時 💤', exercise: '運動塞進去了！' },
      noFit: '塞不進去……轉轉看？',
      sleepMiss: '你又沒睡到。',
      exerciseMiss: '運動沒塞進去。',
      dayOver: '一天結束了。',
      result: '你的一天：照顧 {care} 小時、睡覺 {sleep} 小時{exPart}{overPart}。',
      resultExercise: '，運動 60 分鐘（實際花掉 4 小時）',
      resultNoExercise: '，運動 0 分鐘',
      resultOverflow: '，還有 {overflow} 件照顧的事做不完',
      partnerYes: '，伴侶接手了 {partner} 小時',
      partnerNo: '，伴侶的一天裡沒有這些方塊',
      appYes: '🏆 今日運動達標！明天也要繼續喔！',
      appNo: '今天又沒運動喔！時間是擠出來的 💪',
      theory: ['uenoDouble', 'zhengScience'],
    },
    // 聚餐視線閃躲：視線一來就選一種方式擋。擋越多呼吸越少，呼吸用完就擋不住了。
    gaze: {
      no: 'BOSS',
      title: '聚餐視線閃躲',
      theme: 'dusk',
      rules: [
        '飯桌上的人會輪流看向你，還會說一句話。',
        '視線一亮，就在 1.6 秒內選一種方式擋：外套、抱寶寶、縮小腹。',
        '每擋一次都會用掉呼吸，呼吸用完就再也擋不住了。不擋，就會被看見。',
      ],
      seconds: 20,
      window: 1600,
      covers: [
        { icon: '🧥', label: '外套遮住', cost: 8 },
        { icon: '👶', label: '抱寶寶擋', cost: 6 },
        { icon: '😮‍💨', label: '縮小腹', cost: 12 },
      ],
      work: {
        title: '部門聚餐',
        guests: ['👩‍💼', '👨‍💼', '👩‍💻', '🧑‍💼'],
        comments: ['你是不是還沒瘦回來？', '生完還好嗎？看起來好累', '你要吃那麼多喔？', '餵母奶不是會瘦很快？',
          '我老婆生完三個月就瘦回去了', '你現在還能加班嗎？'],
      },
      family: {
        title: '阿嬤八十大壽',
        guests: ['👵', '👴', '👩', '🧔'],
        comments: ['怎麼胖這麼多？', '還在餵奶喔？要遮一下', '趁年輕再生一個啦！', '寶寶好像有點瘦，奶夠嗎？',
          '要多吃一點才有奶啦', '你婆婆說你都不聽她的'],
      },
      blocked: '擋住了',
      seenMsg: '被看見了',
      breathOut: '喘不過氣，擋不住了……',
      result: '你擋掉了 {covered} 道視線，被看見 {seen} 次，呼吸剩下 {breath}%。',
      app: '下次穿上塑身衣，就不用一直躲了喔！限時 8 折 🛍️',
      theory: ['goffmanCovering', 'goffmanVisible'],
    },
    // 推播打地鼠：廣告要點右上角的小 ✕ 才關得掉，點到廣告本身就是「購買」；沒關掉也會自動扣款。
    // 中間會夾雜真正關心你的訊息（點一下就是回覆）。
    whack: {
      no: 'BOSS',
      title: '推播打地鼠',
      theme: 'neon',
      rules: [
        '小綻的推播會一直冒出來。點右上角的 ✕ 才能關掉，點到廣告本身就是「購買」。',
        '沒關掉的推播會自動扣款。',
        '仔細看：有些訊息不是廣告。',
      ],
      seconds: 20,
      slots: 9,
      life: [1600, 950], // 推播停留多久（毫秒）：從 1.6 秒越來越短
      gap: [650, 300],   // 多久冒出一個：越來越快
      ads: [
        { text: '產後代餐 30 天份', price: 1990 },
        { text: '減重門診 今日限定', price: 1500 },
        { text: '塑身衣 買一送一', price: 1680 },
        { text: '私人教練 年繳優惠', price: 2990 },
        { text: '斷食挑戰 報名費', price: 499 },
        { text: '產後體雕 體驗價', price: 3990 },
        { text: '瘦身茶 試喝組', price: 299 },
        { text: '產後瘦回孕前！黃金期課程', price: 990 },
      ],
      friends: [
        { who: 'partner', text: '今天我來顧寶寶，你去睡一下？' },
        { who: 'coworker', text: '好久不見，要不要出來喝杯咖啡？' },
      ],
      friendAt: [0.35, 0.7], // 朋友的訊息在第幾成的時間出現
      boughtMsg: '點到廣告了……已購買 💳',
      expiredMsg: '沒關掉，自動扣款 💳',
      friendYes: '你回覆了 💬',
      overload: '⚠️ 推播過多，BLOOM 好像有點卡卡的……',
      result: '你關掉了 {closed} 則推播，漏掉或點到 {charged} 則，被扣款 NT${money}。{helpPart}',
      helpYes: '你接住了 {help} 則真正關心你的訊息。',
      helpNo: '真正關心你的訊息，被淹沒在推播裡了。',
      app: '感謝支持 💳 你的「衝刺方案」已自動升級為年繳！',
      theory: ['zhengIndustry', 'uenoOutside'],
    },
  },

  // 理論卡（第 6 次製作會做成圖鑑）
  // 三層：概念＋出處／你剛剛經歷的／一句話白話
  theories: {
    uenoInstinct: {
      author: '上野千鶴子',
      source: '《父權體制與資本主義》第 2 章 2.1',
      concept: '再生產勞動被當成「本能」',
      quote: '馬克思說，資本家把勞動力的再生產「安然委諸於勞動者自我保存的本能與生殖本能」。',
      experienced: '你剛剛一個晚上起來 {me} 次。這些時間沒有薪水，不算「工作」，也沒有下班時間。',
      plain: '市場需要有人把孩子養大，卻假裝這件事會「自然」發生，不用付錢。',
      demo: { me: 8 }, // 從圖鑑直接打開（還沒玩過）時，用這個數字示範
    },
    uenoDouble: {
      author: '上野千鶴子',
      source: '《父權體制與資本主義》第 10 章 10.5',
      concept: '第二次妥協：女人多了工作，男人沒有多分家事',
      quote: '「女性的部分生產者化，一點也引不起男性方面的部分再生產者化。」',
      experienced: '你的一天裡，照顧占了 {care} 小時{partnerTxt}。就算第 57 天回去上班，這些方塊也不會消失。',
      plain: '女性被期待「工作也要顧家」，男性卻不必「顧家也要工作」，多出來的時間都從女性身上擠。',
      demo: { care: 14, partnerTxt: '，伴侶的一天裡沒有這些方塊' },
    },
    zhengScience: {
      author: '鄭斐文',
      source: '〈肥胖科學、醫療化與性別身體政治〉，2012，頁 61',
      concept: '科學母職：連餵奶都要照肥胖科學',
      quote: '女性從懷孕到生產、哺乳、坐月子、養育健康兒童等階段，「皆必須受到肥胖科學的指導」。',
      experienced: '這個月，App 說「餵母奶也能瘦」，兒科醫師要你「每一餐都記錄」。好媽媽的標準，都來自專家和數據。',
      plain: '照著專家和數據帶小孩，才算「正統」的好媽媽；做不到，就被說成不夠努力。',
    },
    // 高夫曼《污名》是掃描檔，下面兩張的 quote 是讀書筆記的整理，不是逐字引文
    goffmanCovering: {
      author: '高夫曼',
      source: '《污名》第二章〈掩飾〉，頁 121–124',
      concept: '掩飾：大家都知道了，還是要藏',
      quote: '已經被別人知道有污名的人，仍會花很多力氣讓污名「不要被放大」，好讓互動順利進行。',
      experienced: '你剛剛擋掉了 {covered} 道視線，呼吸只剩 {breath}%。大家都知道你剛生完，你還是得一直遮。',
      plain: '藏起來不是因為別人不知道，而是為了讓別人不尷尬。代價是你一直喘不過氣。',
      demo: { covered: 7, breath: 30 },
    },
    goffmanVisible: {
      author: '高夫曼',
      source: '《污名》第二章〈可見性〉，頁 58–61',
      concept: '可見性：產後的身體藏不住',
      quote: '污名能不能被察覺，取決於「可見性」；它干擾互動的程度，叫做「突兀性」。',
      experienced: '肚子、哺乳、黑眼圈，在飯桌上全都看得見。你被看見了 {seen} 次，每一次都有人說一句話。',
      plain: '看得見的身體沒辦法「假裝正常」，只能不停地掩飾，或者承受別人的評論。',
      demo: { seen: 4 },
    },
    zhengIndustry: {
      author: '鄭斐文',
      source: '〈肥胖科學、醫療化與性別身體政治〉，2012，頁 39',
      concept: '健康工業集團：藥廠、政府、專家說同一套話',
      quote: '減重藥物廠商、政府部門（如衛生署等機構）、以及相關的公共衛生學者，在肥胖論述上的一致性，可以看成是一龐大、具支配性的「健康工業集團」。',
      experienced: '你剛剛被扣了 NT${money}。代餐、門診、塑身衣、教練，全都在說同一句話：你還不夠瘦。',
      plain: '「你該瘦」不只是醫學建議，背後還有一整個靠你焦慮賺錢的產業。',
      demo: { money: '8,960' },
    },
    uenoOutside: {
      author: '上野千鶴子',
      source: '《父權體制與資本主義》第 10 章 10.2',
      concept: '市場吃掉自己的「外部」',
      quote: '市場「找到內在的『外部』，就是以位居市場之外的家庭作為內在的新開發地」。',
      experienced: '坐月子、哄睡、瘦身、休息，原本在家裡發生、沒有標價的事，一件一件被做成收費方案。',
      plain: '市場會把家庭裡沒有標價的事變成商品，再賣回給你。',
    },
    // 隱藏結局才拿得到
    uenoMaterial: {
      author: '上野千鶴子',
      source: '《父權體制與資本主義》第 4 章 4.1',
      concept: '改變態度不夠，要改變物質基礎',
      quote: '要廢棄父權體制，「是無法藉著改變個別男性的態度、意識而達到的。只有變更現實的物質基礎—制度與權力結構——才能完成」。',
      experienced: '你剛剛不是說服自己「更努力」，而是和伴侶重新分配了夜奶、家事和育嬰假。',
      plain: '要讓產後媽媽喘口氣，靠的不是她的意志力，而是把照顧重新分配，再加上制度撐腰。',
    },
    // 重寫 App 之後，每個人都拿得到
    zhengResist: {
      author: '鄭斐文',
      source: '〈肥胖科學、醫療化與性別身體政治〉，2012，頁 64–65',
      concept: '抵抗：從「個人化」的身體治理，轉向社會改革',
      quote: 'Murray 對醫生說：「我的身體沒有生病，也不是病態的，也沒有失去控制。」',
      experienced: '你剛剛把 App 的指標從 BMI 換成了：{metrics}。',
      plain: '鄭斐文主張把「個人化」的身體治理，轉化為「朝向更有意義的社會與文化的改革」。',
      demo: { metrics: '睡眠、伴侶分擔、支持網絡' },
    },
  },

  // 崩潰事件：某個數值歸零（low）或爆表（high）。遊戲不會結束，數值重設後繼續。
  crashes: {
    mood: {
      low:  { title: '精神歸零', text: '你已經好幾天沒有連續睡超過兩小時。某個凌晨，你抱著寶寶坐在客廳，忽然哭到停不下來。', app: '今天還沒記錄體重喔！',
              help: '如果你或身邊的人也有這種感覺：國健署孕產婦關懷專線 0800-870-870（週一至週五 8–18 時）、衛福部安心專線 1925（24 小時免付費）' },
      high: { title: '你把一切都交出去了', text: '寶寶交給婆婆，家事交給月子阿姨。你終於睡飽了，但婆婆逢人就說你「不像個媽媽」。', app: '好久不見！你的體重曲線斷掉了 😢' },
    },
    baby: {
      low:  { title: '寶寶的生長曲線掉到最下面', text: '回診時醫生皺起眉頭。每個人都在問同一句話：「媽媽是不是奶不夠？」', app: '餵奶期間也能瘦！點我看哺乳期代餐' },
      high: { title: '你的每一分鐘都給了寶寶', text: '吃飯是站著扒兩口，洗澡要算時間。寶寶長得很好，只是沒有人記得問你好不好。', app: '別忘了，你也要愛自己（的身材）💗' },
    },
    family: {
      low:  { title: '家裡吵翻了', text: '婆婆收拾行李回南部，伴侶開始晚歸。家裡安靜得只剩下寶寶的哭聲。', app: '一個人的時間，最適合運動了！' },
      high: { title: '最懂事的媳婦', text: '你答應了每一個要求，大家都說你好乖。只是你再也想不起來，自己想要什麼。', app: '你今天好棒！但體重還沒達標喔' },
    },
    bmi: {
      low:  { title: '達成「極速瘦身」成就', text: '數字很漂亮。但奶水變少了，頭髮大把大把地掉，生理期也一直沒有回來。', app: '🏆 恭喜！分享你的瘦身成果給朋友吧' },
      high: { title: '高風險用戶', text: 'App 把你標記為「高風險」，每天推播三次減重門診廣告。', app: '是你不夠努力喔。' },
    },
    goOn: '但是產後生活不會暫停。',
  },

  // ---------- 結局 ----------
  // 第 4 章打完 Boss 之後，每個人都會走過：App 當機 → 後台 → 結局 → 重寫 App → 結局分享卡
  finale: {
    crash: {
      title: 'BLOOM 已停止回應',
      text: '推播太多，記憶體不足。小綻的笑容卡住了。',
      buttons: ['強制關閉', '回報問題'],
    },
    backend: {
      title: 'BLOOM 後台｜投資人簡報（機密）',
      // {money} 會換成這位玩家在推播打地鼠被扣的錢
      lines: [
        '商業模式：讓用戶相信「180 天」是身體的期限',
        '核心指標：只給用戶看 BMI；精神、睡眠、照顧分工一律隱藏',
        '用戶焦慮 ↑ → 付費轉換率 ↑',
        '本用戶在最後衝刺被扣款：NT${money}',
        '成長策略：把「正常」的 BMI 再往下修，就會多出一批新客群',
        '成功案例：台灣曾把「正常」上限從 25 下修到 24，27 以上算肥胖（鄭斐文 2012：28–29）',
        '合作夥伴：減重藥廠、門診、代餐、塑身衣，也就是「健康工業集團」（鄭斐文 2012：39）',
        '不在我們指標裡的：睡眠、照顧分工、托育、哺集乳室、有沒有人可以說話',
      ],
      note: 'BLOOM 是虛構的 App；標了出處的才是真實資料。',
      button: '關掉後台',
    },
    hiddenRefuse: 5,   // 拒絕 App 幾次以上，才可能觸發隱藏結局
    crashThreshold: 3, // 崩潰幾次以上算「崩潰結局」
  },

  // 四種結局。判斷順序：隱藏 → 達標 → 崩潰 → 失敗
  // 隱藏結局的條件：第 4 章跟伴侶說「其實我好累」（talk）＋有在分擔夜奶或要求育嬰留停一人請一半＋拒絕 App 至少 hiddenRefuse 次
  endings: {
    hidden: {
      label: '隱藏結局',
      title: '解除安裝',
      text: '你拒絕了 App {refused} 次，也開口要伴侶一起分擔。最後，你把 BLOOM 刪掉了。',
      scene: [
        { who: 'partner', text: '那我們重新分一次吧：夜奶一人一半，週末的家事我來。' },
        { who: 'partner', text: '育嬰留停我也去申請，就算主管不高興。' },
        { who: 'mil', text: '……你們年輕人自己決定就好。' },
      ],
      app: '（App 已移除，沒有推播了）',
      theory: 'uenoMaterial',
    },
    reach: {
      label: '達標結局',
      title: 'BMI 達標了',
      text: '恭喜，你的 BMI 是 {bmi}，達到目標了。精神條這時才解鎖：🌙 {mood}。這 180 天，你照顧了 {hoursMe} 小時，崩潰了 {crashes} 次。',
      app: '🏆 恭喜達標！下一個目標：維持一輩子 🌸',
      screening: {
        title: '產後憂鬱篩檢',
        text: '國健署 2025 年起推動產後健康照護：產後媽媽可以用《孕媽咪健康手冊》裡的 QR code 做愛丁堡產後憂鬱量表自我評估，再由醫師提供諮詢或轉介。',
        help: '孕產婦關懷專線 0800-870-870（週一至週五 8–18 時）・衛福部安心專線 1925（24 小時免付費）',
      },
    },
    crash: {
      label: '崩潰結局',
      title: '你崩潰了 {crashes} 次',
      text: '每一次崩潰之後，日子都照樣繼續：寶寶要喝奶，婆婆要你遮肚子，App 要你量體重。媽媽沒有 Game Over，只有「繼續」。',
      app: '偵測到你常常中斷進度。建議升級 Premium，讓小綻更緊密地陪伴你 💎',
    },
    fail: {
      label: '失敗結局',
      title: '沒有達標',
      text: '180 天到了，你的 BMI 是 {bmi}，離目標還差 {gap}。這 180 天，你照顧了 {hoursMe} 小時，伴侶 {hoursPartner} 小時。',
      app: '是你不夠努力喔。下一個 180 天，從今天開始！💪',
    },
  },

  // 重寫 App：每個人都會玩到，這就是「我們的觀點」
  rewrite: {
    title: '重寫 BLOOM',
    oldLabel: 'App 原本只看',
    old: ['⚖️ BMI', '🔥 熱量', '🏃‍♀️ 運動分鐘', '📉 體重'],
    ask: '如果由我們來設計，該看什麼？選 3 個。',
    pick: 3,
    // value 裡的 {…} 會換成玩家自己的數字；basis 是這個指標的根據
    metrics: [
      { id: 'sleep', icon: '😴', label: '睡眠', value: '第 2 章那一天，你睡了 {sleep} 小時', basis: '上野：再生產勞動沒有下班時間' },
      { id: 'share', icon: '🤝', label: '伴侶分擔', value: '照顧時數：你 {hoursMe} 小時、伴侶 {hoursPartner} 小時', basis: '上野：第二次妥協；台灣 2025 年申請育嬰留停的男性只占 27.8%' },
      { id: 'childcare', icon: '🏫', label: '公共托育', value: '這 180 天裡，遊戲沒有出現過任何托育資源', basis: '上野：照顧被推給家庭這個市場的「外部」' },
      { id: 'support', icon: '💬', label: '支持網絡', value: '你接住了 {help} 則真正關心你的訊息', basis: '高夫曼：自己人與知情者（p.23–37）' },
      { id: 'lactation', icon: '🍼', label: '哺集乳室', value: '哺乳要找會議室、找廁所，還被說「遮一下」', basis: '公共場所母乳哺育條例（2019 修法）' },
      { id: 'leave', icon: '🗓️', label: '產假與育嬰假', value: '產假 8 週，陪產檢加陪產假只有 7 天', basis: '性別平等工作法第 15 條；行政院 2026 年提案延長，立法院審議中' },
      { id: 'mood', icon: '💗', label: '情緒狀態', value: '你的精神條被藏了整整 120 天', basis: '國健署：愛丁堡產後憂鬱量表自我評估' },
      { id: 'time', icon: '⏳', label: '自己的時間', value: '「運動 60 分鐘」其實要花掉 4 小時', basis: '上野：父權體制的物質基礎是支配女性的勞動（4.1）' },
    ],
    done: '發布 BLOOM 2.0',
    // 「我們的觀點」：這段是草稿，請小組改成自己的話
    viewpointTitle: '我們的觀點：誰訂的 180 天？',
    viewpoint: [
      '不是身體訂的。是 App、醫學標準和一整個健康工業一起訂的（鄭斐文）。',
      '瘦不下來不是意志力不夠，是照顧的時間被留在家裡，留給她一個人（上野）。',
      '她一直在遮，是因為產後的身體在人群裡被當成需要掩飾的污名（高夫曼）。',
      '所以要改的不是她，是指標、分工和制度。',
    ],
    quote: '「我的身體沒有生病，也不是病態的，也沒有失去控制。」',
    quoteSource: 'Murray（2003），轉引自鄭斐文（2012：64）',
    theory: 'zhengResist',
  },

  // 結局分享卡的稱號：由上往下，第一個符合的就是你的稱號
  //   when.ending 結局、when.flags 記下的事至少幾次、when.hoursRatio 你的照顧時數是伴侶的幾倍以上、when.crashes 崩潰幾次以上
  titles: [
    { title: '解除安裝者', desc: '你刪掉了 App，也把一部分照顧交還給伴侶。', when: { ending: 'hidden' } },
    { title: '最懂事的媳婦', desc: '婆婆的要求，你幾乎都答應了。', when: { flags: { 'right:mil': 3 } } },
    { title: 'App 模範生', desc: '小綻說什麼，你都照做。', when: { flags: { 'right:mascot': 7 } } },
    { title: '什麼都自己扛', desc: '你的照顧時數是伴侶的 5 倍以上。', when: { hoursRatio: 5 } },
    { title: '崩潰了也得繼續', desc: '你崩潰了好幾次，日子還是照樣過。', when: { crashes: 3 } },
    { title: '高風險用戶', desc: 'App 說你不夠努力。', when: { ending: 'fail' } },
    { title: '撐過 180 天的人', desc: '你撐過來了，但不應該只靠你一個人撐。', when: {} },
  ],

  share: {
    heading: '我的產後 180 天',
    note: '截圖分享給旁邊的同學，比比看誰的 180 天最難熬。',
    deck: '看我的理論卡圖鑑',
    again: '再玩一次',
  },
};
