const fs = require("fs");
const https = require("https");

const GEMINI_KEYS = [
  process.env.AQ.Ab8RN6J05uV6SeK7gwy6mVLN-ZePACPbZSNtEOhGjnluTJeYbQ,
  process.env.AQ.Ab8RN6Lmn6-JXQPQdHF_N2POANZ8a9KUll28fuC2lx9L3shJKA,
];

let keyIndex = 0;

function getKey() {
  const key = GEMINI_KEYS[keyIndex % GEMINI_KEYS.length];
  keyIndex++;
  return key;
}

async function generateApp(theme) {
  const key = getKey();
  const prompt = `以下のテーマで診断アプリのHTMLを作ってください。
テーマ: ${theme}
条件:
- 5つの質問、各4択
- 結果は4種類
- デザインはグラデーション背景、白いカード
- Xシェアボタンあり
- 日本語
- HTML/CSS/JSを一つのファイルに
- HTMLのみ返してください、説明文不要`;

  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }]
    });

    const options = {
      hostname: "generativelanguage.googleapis.com",
      path: `/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(body)
      }
    };

    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => data += chunk);
      res.on("end", () => {
        try {
          const json = JSON.parse(data);
          console.log(JSON.stringify(json, null, 2));
          const html = json.candidates[0].content.parts[0].text;
          resolve(html.replace(/```html|```/g, "").trim());
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

async function main() {
  const themes = [
    "あなたの前世職業診断",
    "あなたに合う猫の種類診断",
    "あなたの恋愛タイプ診断",
  ];

  for (const theme of themes) {
    console.log(`生成中: ${theme}`);
    try {
      const html = await generateApp(theme);
      const filename = theme.replace(/\s/g, "_") + ".html";
      fs.writeFileSync(filename, html, "utf8");
      console.log(`保存完了: ${filename}`);
      await new Promise(r => setTimeout(r, 3000));
    } catch (e) {
      console.log(`エラー: ${theme}`, e.message);
    }
  }
}

main();
