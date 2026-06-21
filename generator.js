const fs = require("fs");
const https = require("https");

const GEMINI_KEYS = [
  process.env.GEMINI_KEY_1,
  process.env.GEMINI_KEY_2,
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

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 16);
  const generatedFiles = [];

  for (const theme of themes) {
    console.log(`生成中: ${theme}`);
    try {
      const html = await generateApp(theme);
      const safeName = theme.replace(/\s/g, "_");
      const filename = safeName + "_" + timestamp + ".html";
      fs.writeFileSync(filename, html, "utf8");
      console.log(`保存完了: ${filename}`);
      generatedFiles.push({ theme, filename });
      await new Promise(r => setTimeout(r, 3000));
    } catch (e) {
      console.log(`エラー: ${theme}`, e.message);
    }
  }

  // 既存のHTMLファイルを全部集める
  const allFiles = fs.readdirSync(".").filter(f => f.endsWith(".html") && f !== "index.html");

  // index.htmlを自動生成
  const links = allFiles.map(f => `<a href="${f}">${f.replace(/_/g, " ").replace(".html", "")}</a>`).join("\n");
  const indexHtml = `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>診断アプリ集</title>
<style>
  body { font-family: sans-serif; background: linear-gradient(135deg, #667eea, #764ba2); min-height: 100vh; display: flex; align-items: center; justify-content: center; }
  .card { background: white; border-radius: 20px; padding: 40px; max-width: 500px; width: 90%; text-align: center; max-height: 80vh; overflow-y: auto; }
  h1 { color: #333; margin-bottom: 30px; }
  a { display: block; padding: 12px; margin: 8px 0; background: #667eea; color: white; text-decoration: none; border-radius: 10px; font-size: 14px; }
  a:hover { background: #764ba2; }
</style>
</head>
<body>
<div class="card">
  <h1>🔮 診断アプリ集</h1>
  ${links}
</div>
</body>
</html>`;

  fs.writeFileSync("index.html", indexHtml, "utf8");
  console.log("index.html更新完了");
}

main();


