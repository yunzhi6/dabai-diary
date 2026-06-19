// 大白日记 · 飞书桥梁：本机打开网页填写 → 一键直存飞书文档
// 当天第一次保存=新建；之后保存=覆盖更新同一篇（不再生成重复文件）
// 跑这个后，浏览器打开 http://127.0.0.1:4190
const http = require("http");
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

const PORT = 4190;
const DIR = __dirname;
const LARK = "C:\\Users\\Administrator\\AppData\\Roaming\\npm\\lark-cli.cmd";

function runLark(args, stdinStr, cb) {
  var p = spawn("cmd.exe", ["/c", LARK].concat(args), { cwd: DIR });
  var out = "", err = "";
  p.stdout.on("data", function (d) { out += d; });
  p.stderr.on("data", function (d) { err += d; });
  p.on("close", function () {
    var url = "", ok = false;
    try {
      var j = JSON.parse(out.slice(out.indexOf("{")));
      ok = !!(j && j.ok);
      url = (j && j.data && j.data.document && j.data.document.url) || "";
    } catch (e) {}
    cb(ok, url, (err || out).slice(0, 300));
  });
  p.stdin.write(stdinStr);
  p.stdin.end();
}

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
    var raw = "";
    req.on("data", function (c) { raw += c; });
    req.on("end", function () {
      var content = "", body = "", doc = "";
      try { var pl = JSON.parse(raw); content = String(pl.content || ""); body = String(pl.body || ""); doc = String(pl.doc || ""); } catch (e) {}
      if (!content) { res.writeHead(400); res.end(JSON.stringify({ ok: false, raw: "内容为空" })); return; }
      function reply(ok, url, rawmsg) {
        res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ ok: ok, url: url, raw: rawmsg }));
      }
      function create() {
        runLark(["docs", "+create", "--api-version", "v2", "--content", "-"], content, function (ok, url, rm) { reply(!!url, url, rm); });
      }
      if (doc && body) {
        runLark(["docs", "+update", "--api-version", "v2", "--doc", doc, "--command", "overwrite", "--content", "-"], body, function (ok, url, rm) {
          if (ok) { reply(true, doc, rm); } else { create(); }
        });
      } else {
        create();
      }
    });
    return;
  }
  res.writeHead(404);
  res.end("not found");
}).listen(PORT, function () {
  console.log("大白日记桥梁已启动：浏览器打开 http://127.0.0.1:" + PORT);
});
