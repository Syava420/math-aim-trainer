import puppeteer from 'puppeteer-core';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function testDrillWin() {
  console.log('=== TESTING COMPLETE PROGRESSIVE DRILL WIN ===');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });

  await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });

  // Open Training modal
  await page.click('[data-open-training]');
  await page.waitForSelector('#training-modal.visible');

  // Select "Только на 2" (fastest to test: 8 problems)
  const pills = await page.$$('#training-number-pills .training-pill');
  for (const pill of pills) {
    const text = await page.evaluate(el => el.textContent, pill);
    if (text.includes('Только на 2')) {
      await pill.click();
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

  // Wait for countdown to finish
  await page.waitForFunction(() => {
    const cd = document.getElementById('countdown-overlay');
    return !cd.classList.contains('visible');
  }, { timeout: 8000 });

  console.log('Round started. Knocking out all targets...');

  // Play until victory modal shows
  let maxAttempts = 50;
  while (maxAttempts > 0) {
    maxAttempts--;

    // Check if results modal is visible
    const isResultsVisible = await page.evaluate(() => {
      const modal = document.getElementById('results-modal');
      return modal && modal.classList.contains('visible');
    });

    if (isResultsVisible) {
      console.log('Results modal detected!');
      break;
    }

    // Find the correct target
    const currentEquation = await page.$eval('#hud-equation', el => el.textContent);
    const [aStr, bStr] = currentEquation.split('×').map(s => s.trim());
    const expectedAnswer = parseInt(aStr, 10) * parseInt(bStr, 10);

    const targetClicked = await page.evaluate((answer) => {
      const targets = Array.from(document.querySelectorAll('.math-target'));
      for (const t of targets) {
        const val = parseInt(t.querySelector('.target-val')?.textContent, 10);
        if (val === answer) {
          t.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
          return true;
        }
      }
      return false;
    }, expectedAnswer);

    if (targetClicked) {
      // Short delay between hits
      await new Promise(r => setTimeout(r, 80));
    } else {
      await new Promise(r => setTimeout(r, 100));
    }
  }

  // Verify results modal header shows drill victory
  const rankTitle = await page.$eval('#res-rank-label', el => el.textContent);
  const rankBadge = await page.$eval('#res-rank', el => el.textContent);
  const timeTaken = await page.$eval('#res-kps', el => el.textContent);
  const pbVal = await page.$eval('#res-pb', el => el.textContent);
  console.log(`Final Rank: "${rankBadge}" (${rankTitle}), Time: "${timeTaken}", PB: "${pbVal}"`);

  if (!rankTitle.includes('Все 8 выучены')) {
    throw new Error(`Expected rank title to include "Все 8 выучены", got "${rankTitle}"`);
  }

  console.log('✓ Successfully completed entire knockout drill from 8 down to 0!');

  // Verify "Повторить забег (Пробел)" button immediately restarts match
  await page.click('#btn-play-again');
  await page.waitForFunction(() => {
    const cd = document.getElementById('countdown-overlay');
    return cd.classList.contains('visible');
  }, { timeout: 4000 });
  console.log('✓ Instant retry drill verified!');

  await browser.close();
  console.log('=== COMPLETE DRILL TEST PASSED PERFECTLY ===');
}

testDrillWin().catch(err => {
  console.error('TEST ERROR:', err);
  process.exit(1);
});
