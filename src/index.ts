import * as puppeteer from 'puppeteer';
import * as commander from 'commander';
import * as fs from 'fs';

(async () => {
  commander.parse(process.argv);

  function getLng(lng: number) {
    if (lng > 180) {
      return lng - 360;
    }
    return lng;
  }

  fs.readFile(commander.args[0], { encoding: 'utf8' }, async (err, file) => {
    if (err) {
      console.error(err);
      process.exit(1);
    }

    const data: {
      readonly url: string;
      readonly interval: number;
      readonly latlngs: number[][];
    } = JSON.parse(file);

    // 自動操作したいページのURL
    const targetUrl = data.url;

    //  puppeteerを起動
    const browser = await puppeteer.launch({
      headless: false, // Headlessモードで起動するかどうか
      slowMo: 50, // 50ミリ秒スローモーションで実行する
    });

    // geolocationを有効化
    const context = browser.defaultBrowserContext();
    // await context.clearPermissionOverrides();
    await context.overridePermissions(targetUrl, ['geolocation']);

    // 新しい空のページを開く
    const page = await browser.newPage();

    // Google Analyticsをブロックする
    // https://help.apify.com/en/articles/2423246-block-requests-in-puppeteer
    await page.setRequestInterception(true);
    page.on('request', request => {
      const url = request.url();

      const filters = ['google-analytics', 'hermes', 'mobileanalytics'];
      const shouldAbort = filters.some(urlPart => url.includes(urlPart));
      if (shouldAbort) {
        request.abort();
      } else {
        request.continue();
      }
    });

    // view portの設定
    await page.setViewport({
      width: 1200,
      height: 600,
    });

    const latlngs = data.latlngs;

    // 現在地をセットする
    // https://nitayneeman.com/posts/getting-to-know-puppeteer-using-practical-examples/#faking-geolocation
    await page.setGeolocation({ latitude: latlngs[0][0], longitude: getLng(latlngs[0][1]) });

    // Webページにアクセスする
    await page.goto(targetUrl);
    await page.waitForSelector('title');

    for (const latlng of latlngs) {
      await page.setGeolocation({ latitude: latlng[0], longitude: getLng(latlng[1]) });
      await page.waitFor(data.interval);
    }

    // ブラウザを終了する
    await browser.close();
  });
})();
