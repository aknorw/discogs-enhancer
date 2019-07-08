const puppeteer = require('puppeteer');
const assert = require('assert');
const username = process.env.USERNAME || null;
const password = process.env.PASSWORD || null;
// Extension path
const path = require('path').join(__dirname, '../dist');
// Browser configuration
const config = {
  headless: false,
  ignoreHTTPSErrors: true,
  args: [
    `--disable-extensions-except=${path}`,
    `--load-extension=${path}`,
    '--no-sandbox'
  ]
};

let browser,
    page,
    id;

/**
 * Instantiates the extension in the browser.
 */
async function boot() {
  let popup = 'html/popup.html',
      extensionName = 'Discogs Enhancer';

  browser = await puppeteer.launch(config);
  let setupPage = await browser.newPage();
  await setupPage.setRequestInterception(true),
  await setupPage.waitFor(100);

  setupPage.on('request', interceptedRequest => {
    if (interceptedRequest.url().startsWith('https://www.google-analytics.com/')) {
      interceptedRequest.abort();
    } else {
      interceptedRequest.continue();
    }
  });

  let targets = await browser.targets();
  let extensionTarget = targets.find(({ _targetInfo }) => {
      return _targetInfo.title === extensionName && _targetInfo.type === 'background_page';
  });
  let extensionUrl = extensionTarget._targetInfo.url || '';
  let [,, extensionID] = extensionUrl.split('/');
  id = extensionID;
  setupPage.close();
  page = await browser.newPage();

  await Promise.all([
    await page.goto(`chrome-extension://${extensionID}/${popup}`),
    await page.setRequestInterception(true),
    await page.evaluate(() => { localStorage.setItem('analytics', false); })
  ]);

  page.on('request', interceptedRequest => {
    if (interceptedRequest.url().startsWith('https://www.google-analytics.com/')) {
      interceptedRequest.abort();
    } else {
      interceptedRequest.continue();
    }
  });
}

/**
 * Opens the extension's popup in a new page
 * @returns {Object}
 */
async function openPopup() {
  let popup = await browser.newPage();
  await Promise.all([
    await popup.goto(`chrome-extension://${id}/html/popup.html`),
    await popup.setRequestInterception(true),
    await popup.setViewport({ width: 1280, height: 768 })
  ]);
  popup.on('request', interceptedRequest => {
    if (interceptedRequest.url().startsWith('https://www.google-analytics.com/')) {
      interceptedRequest.abort();
    } else {
      interceptedRequest.continue();
    }
  });
  return popup;
}

/**
 * Opens the specified config page
 * @returns {Object}
 */
async function openConfig(file) {
  let configPage = await browser.newPage();
  await Promise.all([
    await configPage.goto(`chrome-extension://${id}/html/${file}.html`),
    await configPage.setRequestInterception(true),
    await configPage.setViewport({ width: 1280, height: 768 }),
    await configPage.evaluate(() => { localStorage.setItem('analytics', false); })
  ]);
  configPage.on('request', interceptedRequest => {
    if (interceptedRequest.url().startsWith('https://www.google-analytics.com/')) {
      interceptedRequest.abort();
      console.log('\nBlocked Request:\n', interceptedRequest.url(), '\n');
    } else {
        interceptedRequest.continue();
    }
  });
  return configPage;
}

/**
 * Enables a feature in the popup menu
 * @param {String} featureID - The ID of the feature to enable
 * @param {String} helpBubble - The help bubble class
 * @returns {undefined}
 */
async function toggleFeature(featureID) {

  let popup = await openPopup();

  await Promise.all([
    popup.waitForSelector(`${featureID}`, { timeout: 10000 }),
    popup.waitForSelector(`${featureID} + label .onoffswitch-switch`),
    popup.waitForSelector(`${featureID}`),
  ]);

  await popup.$(`${featureID} + label .onoffswitch-switch`);

  let checkbox = await popup.$(`${featureID}`);

  await popup.$eval(`${featureID} + label .onoffswitch-switch`, elem => elem.click());
  console.log(`Clicked ${featureID}`);
  let checked = await(await checkbox.getProperty('checked')).jsonValue();
  console.log(`${featureID} is `, checked ? 'enabled' : 'disabled');
  popup.close();
}

module.exports = { toggleFeature, openConfig, openPopup };

// ========================================================
// Functional Tests
// ========================================================

describe('Functional Testing', function() {
  this.timeout(20000);
  before(async function() { await boot(); });

  // Search Extension Features
  // ------------------------------------------------------
  describe('Search Features', async function() {
    it('should refine the features list', async function() {
      await require('./extension/extension-tests').search(page);
    });
  });

  // Extension Dark Theme
  // ------------------------------------------------------
  describe('Extension Dark Theme', async function() {
    it('should apply the dark theme to the extension', async function() {
      await require('./extension/extension-tests').darkTheme(page);
    });
  });

  // Dark Theme
  // ------------------------------------------------------
  describe('Dark Theme', async function() {
    it('should apply the Dark Theme to Discogs.com', async function() {
      await require('./unauthenticated/dark-theme').test(page);
    });
  });

  // Marketplace Hightlights
  // ------------------------------------------------------
  describe('Marketplace Highlights', async function() {
    it('should highlight media/sleeve conditions in the Marketplace', async function() {
      await require('./unauthenticated/marketplace-highlights').test(page);
    });
  });

  // Currency Converter
  // ------------------------------------------------------
  describe('Currency Converter', async function() {
    it('should render the currency converter in the DOM', async function() {
      await require('./unauthenticated/currency-converter').render(page);
    });

    it('should request rates from discogs-enhancer.com', async function() {
      await require('./unauthenticated/currency-converter').request(page);
    });

    it('should convert currencies', async function() {
      await require('./unauthenticated/currency-converter').convert(page);
    });
  });

  // Sort Buttons
  // ------------------------------------------------------
  describe('Sort Buttons', async function() {
    it('show render sort buttons into the Marketplace filters', async function() {
      // TODO: test explore, list sorting
      await require('./unauthenticated/sort-buttons').test(page);
    });
  });

  // Everlasting Marketplace
  // ------------------------------------------------------
  describe('Everlasting Marketplace', async function() {
    it('renders EM headers in the DOM', async function() {
      // TODO: test page loading on scroll
      await require('./unauthenticated/everlasting-marketplace').test(page);
    });
  });

  // Release Durations
  // ------------------------------------------------------
  describe('Release Durations', async function() {
    it('displays the release durations', async function() {
      await require('./unauthenticated/release-durations').test(page);
    });
  });

  // Large YouTube Playlists
  // ------------------------------------------------------
  describe('Large YouTube Playlists', async function() {
    it('should embiggen the YouTube Playlists', async function() {
      await require('./unauthenticated/large-youtube-playlists').test(page);
    });
  });

  // Rating Percentage
  // ------------------------------------------------------
  describe('Rating Percentage', async function() {
    it('should show the Rating Percent on a release', async function() {
      await require('./unauthenticated/rating-percentage').test(page);
    });
  });

  // Tracklist Readability
  // ------------------------------------------------------
  describe('Tracklist Readability', async function() {
    it('should render readability dividers in the tracklist', async function() {
      await require('./unauthenticated/tracklist-readability').test(page);
    });
  });

  // Tweak Discriminators
  // ------------------------------------------------------
  describe('Tweak Discriminators', async function() {
    it('should render spans around discriminators', async function() {
      await require('./unauthenticated/tweak-discriminators').test(page);
    });
  });

  // Relative Last Sold Dates
  // ------------------------------------------------------
  describe('Show Relative Last Sold Dates', async function() {
    it('should render the date in relative terms', async function() {
      await require('./unauthenticated/relative-sold-date').test(page);
    });
  });

  // Release Scanner
  // ------------------------------------------------------
  describe('Release Scanner', async function() {
    it('should append the Scan Releases button', async function() {
      await require('./unauthenticated/release-scanner').addButton(page);
    });

    it('should scan releases when clicked', async function() {
      await require('./unauthenticated/release-scanner').scan(page);
    });
  });

  // Release Ratings
  // ------------------------------------------------------
  describe('Release Ratings', async function() {

    it('should insert rating links into listings in the Marketplace', async function() {
      await require('./unauthenticated/release-ratings').addLinks(page);
    });

    it('should render the preloader when clicked', async function() {
      await require('./unauthenticated/release-ratings').preloader(page);
    });

    it('should fetch the release rating', async function() {
      await require('./unauthenticated/release-ratings').fetchRelease(page);
    });
  });

  // Quick Search
  // ------------------------------------------------------
  describe('Quick Search', async function() {
    it('should wrap the release title in a span', async function() {
      await require('./unauthenticated/quick-search').test(page);
    });
  });

  // List Items In New Tabs
  // ------------------------------------------------------
  describe('List Items In New Tabs', async function() {
    it('should open list items in new tabs', async function() {
      await require('./unauthenticated/list-items-in-tabs').test(page);
    });
  });

  // Filter Shipping Countries
  // ------------------------------------------------------
  describe('Filter Shipping Countries', async function() {
    it('should filter items based on their country of origin', async function() {
      await require('./unauthenticated/filter-shipping-country').filter(page);
    });

    it('should filter items based on their country of origin using native navigation', async function() {
      await require('./unauthenticated/filter-shipping-country').filterNative(page);
    });
  });

  // Filter Media Condition
  // ------------------------------------------------------
  describe('Filter Media Condition', async function() {
    it('should filter items based on media condition', async function() {
      await require('./unauthenticated/filter-media-condition').filter(page);
    });

    it('should filter items based on media condition using native navigation', async function() {
      await require('./unauthenticated/filter-shipping-country').filterNative(page);
    });
  });

  // Tag Seller Repuation
  // ------------------------------------------------------
  describe('Tag Seller Repuation', async function() {
    it('should tag sellers with low repuations', async function() {
      await require('./unauthenticated/seller-rep').test(page);
    });
  });

  // Inventory Ratings
  // ------------------------------------------------------
  describe('Inventory Ratings', async function() {
    it('should highlight ratings above a specified rating', async function() {
      await require('./unauthenticated/inventory-ratings').test(page);
    });
  });

  // Filter Sleeve Conditions
  // ------------------------------------------------------
  describe('Filter Sleeve Conditions', async function() {
    it('should filter items below a specified condition', async function() {
      await require('./unauthenticated/filter-sleeve-condition').test(page);
    });
  });

  // Favorite Sellers
  // ------------------------------------------------------
  describe('Favorite Sellers', async function() {
    it('should mark sellers as favorites', async function() {
      await require('./unauthenticated/favorite-sellers').mark(page);
    });

    it('should mark sellers as favorites on pagination clicks', async function() {
      await require('./unauthenticated/favorite-sellers').markNative(page);
    });

    it('should reset the favorite sellers list when done', async function() {
      // reset favorites list so theres no conflict with blocked sellers tests
      await require('./unauthenticated/favorite-sellers').reset(page);
    });
  });

  // Block Sellers
  // ------------------------------------------------------
  describe('Block Sellers', async function() {
    it('should mark sellers as blocked', async function() {
      await require('./unauthenticated/block-sellers').block(page);
    });

    it('should mark sellers as blocked on pagination clicks', async function() {
      await require('./unauthenticated/block-sellers').blockNative(page);
    });

    it('should reset the blocked sellers list when done', async function() {
      // reset blocked list so theres no conflict with other tests
      await require('./unauthenticated/block-sellers').reset(page);
    });
  });

  // if ( username && password ) {
  //   // auth testing
  //   describe('Authenticated feature testing', async function() {
  //     it('should authenticate the test user', async function() {
  //       await page.goto('https://auth.discogs.com/login?service=https%3A//www.discogs.com/login%3Freturn_to%3D%252Fmy');
  //       await page.type('#username', username);
  //       await page.type('#password', password);
  //       await page.click('button.green');

  //       let pageUrl = await page.url();
  //       assert.equal(pageUrl, 'https://www.discogs.com/my', 'Login was unsuccessful');
  //     });
  //   });

  //   // Random Item Button
  //   // ------------------------------------------------------
  //   describe('Random Item Button', async function() {
  //     it('should append an icon to the nav bar', async function() {
  //       await toggleFeature('#toggleRandomItem');
  //       await Promise.all([
  //         page.goto('https://www.discogs.com/my', { waitUntil: 'networkidle2' }),
  //         page.waitFor('.de-random-item')
  //       ]);
  //       let hasIcon = await page.$eval('.de-random-item', elem => elem.classList.contains('de-random-item'));
  //       assert.equal(hasIcon, true, 'Random Item Button was not appended to nav');
  //     });

  //     it('should get a random item when clicked', async function() {
  //       await page.click('.de-random-item');
  //       let randomItem = false;
  //       await page.waitForResponse(response => {
  //         if ( response.request().url().includes('/collection') ) {
  //           randomItem = true;
  //           return randomItem;
  //         }
  //         assert.equal(randomItem, true, 'Random item was not fetched');
  //       });
  //     });
  //   });

  //   // Notes Counter
  //   // ------------------------------------------------------
  //   describe('Notes Counter', async function() {
  //     it('should append the counter to the In Collection box', async function() {
  //       await page.waitFor(3000);
  //       let pageUrl = await page.url();

  //       await Promise.all([
  //         page.goto(pageUrl, { waitUntil: 'networkidle2' }),
  //         page.waitFor('[data-field-name="Notes"]')
  //       ]);

  //       await page.$eval('[data-field-name="Notes"] .notes_show', elem => elem.click());

  //       await page.waitFor('.de-notes-count');

  //       let counter = await page.$eval('.de-notes-count', elem => elem.classList.contains('de-notes-count'));
  //       assert.equal(counter, true, 'Counter was not appended to Notes');
  //     });

  //     it('should count the characters in a note', async function() {

  //       await Promise.all([
  //         await page.waitFor('.notes_textarea'),
  //         await page.type('.notes_textarea', 'METALLICA!!!')
  //       ]);

  //       let counter = await page.$eval('.de-notes-count', elem => elem.textContent === '12 / 255');
  //       assert.equal(counter, true, 'Counter did not change after typing');
  //     });
  //   });

  //   // Show Actual Add Dates
  //   // ------------------------------------------------------
  //   describe('Show Actual Add Dates', async function() {
  //     it('should show the date the item was added', async function() {
  //       await toggleFeature('#toggleAbsoluteDate');
  //       await page.waitFor(3000);
  //       let pageUrl = await page.url();
  //       await Promise.all([
  //         page.goto(pageUrl, { waitUntil: 'networkidle2' }),
  //         page.waitFor('.cw_block_timestamp')
  //       ]);

  //       let actualDate = await page.$eval('.cw_block_timestamp span', elem => elem.dataset.approx.includes('ago'));
  //       assert.equal(actualDate, true, 'Actual date markup was not rendered');
  //     });
  //   });

  //   // Collection Links In New Tabs
  //   // ------------------------------------------------------
  //   describe('Collection Links In New Tabs', async function() {
  //     it('should open links from the React Collection in new tabs', async function() {
  //       await toggleFeature('#toggleCollectionNewTabs');

  //       await Promise.all([
  //         page.goto(`https://www.discogs.com/user/${process.env.USERNAME}/collection`, { waitUntil: 'networkidle2' }),
  //         page.waitFor('.release-table-card a'),
  //         page.waitFor('.FacetGroup a')
  //       ]);

  //       let release = await page.$eval('.release-table-card a', elem => elem.target === '_blank');
  //       assert.equal(release, true, 'Anchors were not modified');
  //     });
  //   });

  //   // Hide Min Med Max Columns
  //   // ------------------------------------------------------
  //   describe('Hide Min Med Max Columns', async function() {
  //     it('should hide the Min, Med, Max columns in the React Collection', async function() {
  //       await toggleFeature('#toggleMinMaxColumns');

  //       await Promise.all([
  //         page.goto(`https://www.discogs.com/user/${process.env.USERNAME}/collection`, { waitUntil: 'networkidle2' }),
  //         page.waitFor('td[data-header="Max"')
  //       ]);

  //       let maxHidden = await page.$eval('td[data-header="Max"', elem => elem.clientHeight === 0);
  //       assert.equal(maxHidden, true, 'Max Columns were not hidden');

  //       let medHidden = await page.$eval('td[data-header="Med"', elem => elem.clientHeight === 0);
  //       assert.equal(medHidden, true, 'Med Columns were not hidden');

  //       let minHidden = await page.$eval('td[data-header="Min"', elem => elem.clientHeight === 0);
  //       assert.equal(minHidden, true, 'Min Columns were not hidden');
  //     });
  //   });

  //   // Show Average Price
  //   // ------------------------------------------------------
  //   describe('Show Average Price', async function() {
  //     it('should show the average price paid for an item', async function() {
  //       await toggleFeature('#toggleAveragePrice');

  //       await Promise.all([
  //         page.goto('https://www.discogs.com/Sascha-Dive-The-Basic-Collective-EP-Part-1-Of-3/release/950480', { waitUntil: 'networkidle2' }),
  //         page.waitFor('.de-average-price')
  //       ]);

  //       let hasAverage = await page.$eval('.de-average-price', elem => elem.classList.contains('de-average-price'));
  //       assert.equal(hasAverage, true, 'Price average was not rendered');
  //     });
  //   });

  //   // Text Format Shortcuts
  //   // ------------------------------------------------------
  //   describe('Text Format Shortcuts', async function() {
  //     it('should render text format shortcuts', async function() {

  //       await Promise.all([
  //         page.waitFor('.quick-button')
  //       ]);

  //       let hasShortcuts = await page.$eval('.quick-button', elem => elem.classList.contains('quick-button'));
  //       assert.equal(hasShortcuts, true, 'Text Format Shortcuts were not rendered');
  //     });
  //   });

  //   // Large BAOI Fields
  //   // ------------------------------------------------------
  //   describe('Large BAOI Fields', async function() {
  //     it('should render large BAOI fields', async function() {
  //       await toggleFeature('#toggleBaoiFields');

  //       await Promise.all([
  //         page.goto('https://www.discogs.com/release/edit/950480', { waitUntil: 'networkidle2' }),
  //         page.waitFor('.clearfix_no_overflow')
  //       ]);

  //       let hasLargeFields = await page.$eval('td[data-ref-overview="barcode"] input', elem => elem.offsetWidth > 232);
  //       assert.equal(hasLargeFields, true, 'Large BAOI fields were not rendered');
  //     });
  //   });

  //   // Remove From Wantlist Shortcuts
  //   // ------------------------------------------------------
  //   describe('Remove From Wantlist Shortcuts', async function() {
  //     it('should render the shortcut in a listing', async function() {
  //       await toggleFeature('#toggleRemoveFromWantlist');

  //       await Promise.all([
  //         page.goto('https://www.discogs.com/sell/mywants', { waitUntil: 'networkidle2' }),
  //         page.waitFor('.de-remove-wantlist')
  //       ]);

  //       let hasShortcuts = await page.$eval('.de-remove-wantlist', elem => elem.classList.contains('de-remove-wantlist'));
  //       assert.equal(hasShortcuts, true, 'Shortcuts were not rendered');
  //     });

  //     it('should render a prompt when clicked', async function() {
  //       page.waitFor('.de-remove-wantlist');
  //       page.click('.de-remove-wantlist');

  //       await Promise.all([
  //         page.waitFor('.de-remove-yes'),
  //         page.waitFor('.de-remove-no')
  //       ]);

  //       let hasPrompt = await page.$eval('.de-remove-yes', elem => elem.classList.contains('de-remove-yes'));
  //       assert.equal(hasPrompt, true, 'Prompt was not displayed');
  //     });
  //   });

  //   after(async function() {
  //     await browser.close();
  //   });
  // } else {
    after(async function() {
      await browser.close();
    });
  // }
});
