// 全班數據設定。步驟見「性別」資料夾的〈全班數據與發布步驟.md〉。
//
// 兩個網址都留空時：遊戲不會送出任何資料，「全班結果」畫面顯示示範資料。
// 試算表裡「結局」欄寫「測試」的那幾列，全班結果會自動略過（設定時送了一列測試資料）。

window.BLOOM_CONFIG = {
  // 1. Google 表單的「預先填入的連結」（每一題都填那一題的英文代號）
  formPrefillUrl: 'https://docs.google.com/forms/d/e/1FAIpQLSeU1G_a1-euiwgHZcnscLpt1gPF6TmMuggoB5vFRrKAlMyivg/viewform?usp=pp_url&entry.507107653=ending&entry.391233713=crashes&entry.760379004=hoursMe&entry.958329738=hoursPartner&entry.515669008=diet1200&entry.1958233420=negotiate&entry.1818206549=covered&entry.9212547=leave&entry.551281924=metrics',

  // 2. 表單回覆的試算表網址（要設成「知道連結的任何人」都能檢視）
  sheetUrl: 'https://docs.google.com/spreadsheets/d/1BQSkGWL5a0G9gQEEqV4Ev0Y7zaIttFKTioNjGHxnnPI/edit',

  // 「全班結果」畫面幾秒更新一次
  refreshSeconds: 10,
};
