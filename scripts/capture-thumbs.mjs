import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import puppeteer from "puppeteer-core";

const base = process.env.FORMA_URL || "http://127.0.0.1:3847";
const root = process.cwd();
const catalogPath = path.join(root, "data", "models.json");
const models = JSON.parse(await readFile(catalogPath, "utf8"));

const browser = await puppeteer.launch({
  executablePath: process.env.CHROME_PATH || "/usr/bin/google-chrome",
  headless: true,
  args: [
    "--no-sandbox",
    "--disable-dev-shm-usage",
    "--use-gl=angle",
    "--use-angle=swiftshader",
  ],
});

try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1100, height: 1100, deviceScaleFactor: 1 });
  for (const model of models) {
    if (!model.src.startsWith("/samples/")) continue;
    const url = `${base}/frame/${model.id}`;
    console.log("capture", model.id);
    await page.goto(url, { waitUntil: "networkidle0", timeout: 60000 });
    await page.waitForSelector("html[data-ready='1']", { timeout: 45000 });
    await new Promise((resolve) => setTimeout(resolve, 400));
    const file = path.join(root, "public", "samples", "thumbs", `${model.id}.jpg`);
    await page.screenshot({ path: file, type: "jpeg", quality: 86 });
    model.thumbnail = `/samples/thumbs/${model.id}.jpg`;
  }
  await writeFile(catalogPath, `${JSON.stringify(models, null, 2)}\n`);
} finally {
  await browser.close();
}
