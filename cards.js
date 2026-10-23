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
  },

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
          who: 'mil', day: 9,
          text: '月子裡不能洗頭、不能碰冷水，手機也不要一直滑，對眼睛不好。',
          left:  { label: '我想洗頭', effects: { mood: 8, family: -8 },
                   reply: { who: 'mil', text: '以後老了頭痛不要怪我喔。' } },
          right: { label: '好……', effects: { mood: -6, family: 5 } },
        },
        {
          who: 'coworker', day: 12,
          text: '月子還好嗎？產假只有 8 週，大家都在問你什麼時候回來～ ps. 主管說你的專案先交給 Amy 接喔',
          left:  { label: '先已讀', effects: { mood: -4 } },
          right: { label: '回：我會盡快回去', effects: { mood: -8, family: -3 },
                   reply: { who: 'coworker', text: '不急啦～身體顧好！（主管說下個月要開會）' } },
          theory: '上野：雙重負擔',
        },
        {
          who: 'mascot', day: 15,
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
          who: 'nurse', day: 21,
          text: '寶寶體重增加得有點慢。白天多餵幾次，晚上也要叫醒他喝喔。',
          left:  { label: '我真的好累', effects: { mood: 4, baby: -10 } },
          right: { label: '我再撐一下', effects: { mood: -10, baby: 10 },
                   hours: { me: 6 } },
          theory: '鄭斐文：科學母職',
        },
        {
          who: 'partner', day: 24, unless: { 'left:mil': 2 },
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
          who: 'mil', day: 30,
          text: '滿月了，我明天就回南部喔。你一個人可以吧？有事再打給我。',
          left:  { label: '可以再留一週嗎？', effects: { mood: 6, family: -4 }, hours: { mil: 6 },
                   reply: { who: 'mil', text: '我家裡也有事啊……好啦，再留三天。' } },
          right: { label: '可以，我自己來', effects: { mood: -8, family: 4 } },
          theory: '上野：家庭是市場的「外部」（1.2）',
        },
        {
          who: 'mascot', day: 31,
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
          who: 'partner', day: 35,
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
          who: 'coworker', day: 44,
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
          who: 'mascot', day: 56,
          text: '產假最後一天！🎉 你的 {bmiStatus}，距離黃金期結束還有 {left} 天。明天開始，忙也別忘了運動喔！',
          left:  { label: '關掉通知', effects: { mood: 3, bmi: 1 } },
          right: { label: '我會更努力', effects: { mood: -6, bmi: -3 } },
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
      pieceSeconds: 7,
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
};
