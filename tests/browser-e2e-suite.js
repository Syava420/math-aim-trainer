import puppeteer from 'puppeteer-core';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function runBrowserTest() {
  console.log('=== STARTING COMPLETE BROWSER E2E TEST ===');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });

  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.error('BROWSER CONSOLE ERROR:', msg.text());
      errors.push(msg.text());
    } else {
      console.log('BROWSER LOG:', msg.text());
    }
  });

  page.on('response', res => {
    if (res.status() >= 400) {
      console.log(`HTTP ${res.status()} ON: ${res.url()}`);
    }
  });

  // Test 1: Load main page
  console.log('Step 1: Navigating to http://localhost:3000...');
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
  const title = await page.title();
  console.log(`Page loaded: "${title}"`);

  // Test 2: Training Knockout on 3
  console.log('Step 2: Testing "Тренировка на выбывание" (Только на 3)...');
  await page.click('[data-open-training]');
  await page.waitForSelector('#training-modal.visible');
  console.log('Training modal opened.');

  // Click pill for 3
  const pills = await page.$$('#training-number-pills .training-pill');
  for (const pill of pills) {
    const text = await page.evaluate(el => el.textContent, pill);
    if (text.includes('Только на 3')) {
      await pill.click();
      console.log('Selected "Только на 3" (direct 1-click start).');
      break;
    }
  }

  // Fallback click if modal still visible
  const isModalVisible = await page.evaluate(() => {
    const modal = document.getElementById('training-modal');
    return modal && modal.classList.contains('visible');
  });
  if (isModalVisible) {
    await page.click('#btn-start-training-drill');
  }
  console.log('Clicked "Начать отстрел на выбывание".');

  // Wait for countdown overlay to show and finish
  console.log('Waiting for countdown and round start...');
  await page.waitForFunction(() => {
    const cd = document.getElementById('countdown-overlay');
    return !cd.classList.contains('visible');
  }, { timeout: 8000 });

  // Verify targets spawned
  await page.waitForSelector('.math-target', { timeout: 4000 });
  const targetCount = await page.$$eval('.math-target', els => els.length);
  console.log(`✓ Targets successfully spawned! Count: ${targetCount}`);

  // Check drill progress indicator
  const progressText = await page.$eval('#hud-timer', el => el.textContent);
  console.log(`HUD Progress display: "${progressText}"`);

  // Click one of the targets
  const firstTarget = await page.$('.math-target');
  if (firstTarget) {
    await firstTarget.click();
    console.log('Target clicked successfully!');
  }

  // Return to menu
  await page.click('#btn-quit-game');
  await page.waitForSelector('#screen-menu.active');
  console.log('Returned to main menu.');

  // Test 3: Gridshot 60s
  console.log('Step 3: Testing Gridshot 60s...');
  await page.click('[data-mode="gridshot_60"]');
  await page.waitForFunction(() => {
    const cd = document.getElementById('countdown-overlay');
    return !cd.classList.contains('visible');
  }, { timeout: 8000 });

  await page.waitForSelector('.math-target');
  const gridTargets = await page.$$eval('.math-target', els => els.length);
  console.log(`✓ Gridshot targets spawned! Count: ${gridTargets}`);
  await page.click('.math-target');
  console.log('Shot target in Gridshot.');

  await page.click('#btn-quit-game');
  await page.waitForSelector('#screen-menu.active');

  // Test 4: Study Matrix & Heatmap
  console.log('Step 4: Testing Study Lesson Modal...');
  await page.click('[data-open-study]');
  await page.waitForSelector('#study-modal.visible');
  const cellsCount = await page.$$eval('.matrix-cell', els => els.length);
  console.log(`✓ Matrix cells rendered: ${cellsCount}`);
  await page.click('#btn-close-study');

  // Test 5: Hard Vault
  console.log('Step 5: Testing Hard Vault Modal...');
  await page.click('[data-open-vault]');
  await page.waitForSelector('#vault-modal.visible');
  console.log('✓ Vault modal opened cleanly.');
  await page.click('#btn-close-vault');

  await browser.close();

  if (errors.length > 0) {
    console.error(`FAILED: ${errors.length} browser errors detected!`, errors);
    process.exit(1);
  } else {
    console.log('=== ALL BROWSER E2E TESTS PASSED (0 ERRORS) ===');
    process.exit(0);
  }
}

runBrowserTest().catch(err => {
  console.error('FATAL TEST ERROR:', err);
  process.exit(1);
});
