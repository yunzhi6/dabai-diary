// 大白日记 · 飞书桥梁：本机打开网页填写 → 一键直存飞书文档
// 跑这个后，浏览器打开 http://127.0.0.1:4190 ，填完点「一键保存到飞书」即可
const http = require("http");
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

const PORT = 4190;
const DIR = __dirname;
const LARK = "C:\\Users\\Administrator\\AppData\\Roaming\\npm\\lark-cli.cmd";

http.createServer(function (req, res) {
  if (req.method === "GET" && (req.url === "/" || req.url.indexOf("/?") === 0)) {
    fs.readFile(path.join(DIR, "index.html"), function (e, buf) {
      if (e) { res.writeHead(500); res.end("index.html 未找到"); return; }
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(buf);
    });
    return;
  }
  if (req.method === "POST" && req.url === "/save-to-feishu") {
    var body = "";
    req.on("data", function (c) { body += c; });
    req.on("end", function () {
      var xml = "";
      try { xml = String(JSON.parse(body).content || ""); } catch (e) {}
      if (!xml) { res.writeHead(400); res.end(JSON.stringify({ ok: false, raw: "内容为空" })); return; }
      var p = spawn("cmd.exe", ["/c", LARK, "docs", "+create", "--api-version", "v2", "--content", "-"], { cwd: DIR });
      var out = "", err = "";
      p.stdout.on("data", function (d) { out += d; });
      p.stderr.on("data", function (d) { err += d; });
      p.on("close", function () {
        var url = "";
        try {
          var j = JSON.parse(out.slice(out.indexOf("{")));
          url = (j && j.data && j.data.document && j.data.document.url) || "";
        } catch (e) {}
        res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ ok: !!url, url: url, raw: (err || out).slice(0, 300) }));
      });
      p.stdin.write(xml);
      p.stdin.end();
    });
    return;
  }
  res.writeHead(404);
  res.end("not found");
}).listen(PORT, function () {
  console.log("大白日记桥梁已启动：浏览器打开 http://127.0.0.1:" + PORT);
});
