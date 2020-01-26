import * as puppeteer from 'puppeteer';
import * as Constants from './constants';

(async () => {
  // 自動操作したいページのURL
  const targetUrl = Constants.TARGET_URL;

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

  const latlngs = [
    [21.28001716099308, 202.1704959869385],
    [21.282165632083615, 202.16903887689116],
    [21.28483422878972, 202.16735579073435],
    [21.285697404178457, 202.16652799397707],
    [21.284543066060998, 202.16328989714384],
    [21.286815182224156, 202.16002464294436],
    [21.28841467096632, 202.15933799743655],
    [21.290254061510897, 202.15401649475098],
    [21.291693568494672, 202.14955329895022],
    [21.293133061383962, 202.1456050872803],
    [21.29481245193988, 202.1420001983643],
    [21.298091206774725, 202.13745117187503],
    [21.299850508484006, 202.1368503570557],
    [21.30216955583029, 202.1365070343018],
  ];

  // https://nitayneeman.com/posts/getting-to-know-puppeteer-using-practical-examples/#faking-geolocation
  await page.setGeolocation({ latitude: latlngs[0][0], longitude: latlngs[0][1] - 360 });

  // Webページにアクセスする
  await page.goto(targetUrl);
  await page.waitForSelector('title');

  for (const latlng of latlngs) {
    await page.setGeolocation({ latitude: latlng[0], longitude: latlng[1] - 360 });
    await page.waitFor(500);
  }

  // ブラウザを終了する
  await browser.close();
})();
