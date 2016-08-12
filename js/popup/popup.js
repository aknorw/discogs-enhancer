/**
 *
 * Discogs Enhancer
 *
 * @author: Matthew Salcido (c) 2016
 * @url: http://www.msalcido.com
 * @github: https://github.com/salcido
 *
 */

document.addEventListener('DOMContentLoaded', function () {

  let
      chromeVer = (/Chrome\/([0-9]+)/.exec(navigator.userAgent)||[,0])[1],
      userCurrency = document.getElementById('currency'),
      isHovering = false,
      isMarketplaceHovering = false,
      prefs = {},
      hideMarketplaceItems = document.getElementById('marketplaceItems'),
      toggleBlockSellers = document.getElementById('toggleBlockSellers'),
      toggleCollectionUi = document.getElementById('toggleCollectionUi'),
      toggleConditions = document.getElementById('toggleConditions'),
      toggleConverter = document.getElementById('toggleConverter'),
      toggleDarkTheme = document.getElementById('toggleDarkTheme'),
      toggleFeedback = document.getElementById('toggleFeedback'),
      toggleNotesCount = document.getElementById('toggleNotesCount'),
      toggleReleaseDurations = document.getElementById('toggleReleaseDurations'),
      toggleSortBtns = document.getElementById('toggleSortBtns'),
      togglePrices = document.getElementById('togglePrices'),

      // Contextual menus
      toggleBandcamp = document.getElementById('bandcamp'),
      toggleBoomkat = document.getElementById('boomkat'),
      toggleClone = document.getElementById('clone'),
      toggleDeeJay = document.getElementById('deejay'),
      toggleDiscogs = document.getElementById('discogs'),
      toggleGramaphone = document.getElementById('gramaphone'),
      toggleHalcyon = document.getElementById('halcyon'),
      toggleHardwax = document.getElementById('hardwax'),
      toggleInsound = document.getElementById('insound'),
      toggleJuno = document.getElementById('juno'),
      toggleOye = document.getElementById('oye'),
      togglePbvinyl = document.getElementById('pbvinyl');


  // Clears the update notifications
  function acknowledgeUpdate(message) {

    chrome.storage.sync.set({didUpdate: false}, function() {});

    chrome.browserAction.setBadgeText({text: ''});
  }


  // Save preferences
  function applySave(message, event) {

    let manifest = chrome.runtime.getManifest();

    prefs = {
      userCurrency: userCurrency.value,
      converter: toggleConverter.checked,
      darkTheme: toggleDarkTheme.checked,
      feedback: toggleFeedback.checked,
      blockSellers: toggleBlockSellers.checked,
      highlightMedia: toggleConditions.checked,
      hideMarketplaceItems: hideMarketplaceItems.value,
      notesCount: toggleNotesCount.checked,
      sortButtons: toggleSortBtns.checked,
      releaseDurations: toggleReleaseDurations.checked,
      collectionUi: toggleCollectionUi.checked,
      suggestedPrices: togglePrices.checked,

      // Contextual menus
      useBandcamp: toggleBandcamp.checked,
      useBoomkat: toggleBoomkat.checked,
      useClone: toggleClone.checked,
      useDeejay: toggleDeeJay.checked,
      useDiscogs: toggleDiscogs.checked,
      useGramaphone: toggleGramaphone.checked,
      useHalcyon: toggleHalcyon.checked,
      useHardwax: toggleHardwax.checked,
      useInsound: toggleInsound.checked,
      useJuno: toggleJuno.checked,
      useOye: toggleOye.checked,
      usePbvinyl: togglePbvinyl.checked
    };

    chrome.storage.sync.set({prefs: prefs}, function() {

      if (message) {

        $('#notify').html(message);

        $('.notifications').removeClass('hide');
      }
    });

    // Google Analyitcs
    if (event.target.checked === true || event.target.checked === false) {

      _gaq.push(['_trackEvent', event.target.id + ' : ' + event.target.checked, ' version: ' + manifest.version + ' Chrome: ' + chromeVer]);

    } else if (!event.target.checked && event.target[event.target.selectedIndex].value) {

      _gaq.push(['_trackEvent', event.target[event.target.selectedIndex].value + ' version: ' + manifest.version + ' Chrome: ' + chromeVer]);
    }
  }


  function checkForUpdate() {

    chrome.storage.sync.get('didUpdate', function(result) {

      if (result.didUpdate) {

        $('#about').text('New updates!').removeClass('button_green').addClass('button_orange');

      } else {

        $('#about').text('About').removeClass('button_orange').addClass('button_green');
      }
    });
  }


  // Get/Save currency preferences
  function getCurrency() {

    chrome.storage.sync.get('prefs', function(result) {

      if (result.prefs.userCurrency) {

        userCurrency.value = result.prefs.userCurrency;

        if (userCurrency.value !== '-' && togglePrices.checked === true) {

          userCurrency.disabled = true;
        }

      } else {

        togglePrices.checked = false;

        userCurrency.disabled = false;
      }
    });
  }


  // Toggle release condition highlighting on/off
  function toggleHighlights(event) {

    let response = 'Please refresh the page for changes to take effect.';

    if (event.target.checked) {

      chrome.tabs.executeScript(null, {file: 'js/apply-highlights.js'}, function() {

        applySave(response, event);
      });

    } else {

      chrome.tabs.executeScript(null, {file: 'js/remove-highlights.js'}, function() {

        applySave(null, event);
      });
    }
  }


  // Call save function
  function triggerSave(event) {

    let response = 'Please refresh the page for changes to take effect.';

    applySave(response, event);
  }

  // Hide items in marketplace
  function setHiddenItems(event) {

    let selectValue = event.target[event.target.selectedIndex].value,
        response = 'Please refresh the page for changes to take effect.';

    if (!selectValue) {

      localStorage.removeItem('itemCondition');

    } else {

      // set new value on change
      localStorage.setItem( 'itemCondition', String(selectValue) );
    }

    setupMarketplaceFilter();

    applySave(response, event);
  }

  // Toggle prices suggestions
  function showPrices(event) {

    let response = 'Please refresh the page for changes to take effect.';

    if (event.target.checked && userCurrency.value !== '-') {

        userCurrency.disabled = true;

        togglePrices.checked = true;

        userCurrency.className = '';

        applySave(response, event);

      } else if (userCurrency.value === '-') {

        $('#notify').html('Please choose a currency from the select box first.');

        $('.notifications').show();

        togglePrices.checked = false;

        userCurrency.className = 'alert';

        return;

      } else {

      userCurrency.disabled = false;

      applySave(response, event);
    }
  }


  // Saves user currency
  function setCurrency(event) {

    applySave(null, event);
  }


  // Create/remove contextual menus
  function updateMenu(event) {

    if (event.target.checked) {

      chrome.runtime.sendMessage({
        fn: event.target.dataset.funct,
        id: event.target.id,
        method: 'create',
        name: event.target.dataset.name,
        request: 'updateContextMenu'
      });

      applySave(null, event);

    } else {

      chrome.runtime.sendMessage({
        id: event.target.id,
        method: 'remove',
        request: 'updateContextMenu'
      });

      applySave(null, event);
    }
  }


  // Toggle dark mode on/off
  function useDarkTheme(event) {

    if (event.target.checked) {

      chrome.tabs.executeScript(null, {file: 'js/apply-dark-theme.js'}, function() {

        applySave(null, event);
      });

    } else {

      chrome.tabs.executeScript(null, {file: 'js/remove-dark-theme.js'}, function() {

        applySave(null, event);
      });
    }
  }


  // Toggle event listeners
  hideMarketplaceItems.addEventListener('change', setHiddenItems);
  userCurrency.addEventListener('change', setCurrency);
  toggleBlockSellers.addEventListener('change', triggerSave);
  toggleCollectionUi.addEventListener('change', triggerSave);
  toggleConditions.addEventListener('change', toggleHighlights);
  toggleConverter.addEventListener('change', triggerSave);
  toggleDarkTheme.addEventListener('change', useDarkTheme);
  toggleFeedback.addEventListener('change', triggerSave);
  toggleNotesCount.addEventListener('change', triggerSave);
  toggleReleaseDurations.addEventListener('change', triggerSave);
  toggleSortBtns.addEventListener('change', triggerSave);
  togglePrices.addEventListener('change', showPrices);

  // Contextual menus
  toggleBandcamp.addEventListener('change', updateMenu);
  toggleBoomkat.addEventListener('change', updateMenu);
  toggleClone.addEventListener('change', updateMenu);
  toggleDeeJay.addEventListener('change', updateMenu);
  toggleDiscogs.addEventListener('change', updateMenu);
  toggleGramaphone.addEventListener('change', updateMenu);
  toggleHalcyon.addEventListener('change', updateMenu);
  toggleHardwax.addEventListener('change', updateMenu);
  toggleInsound.addEventListener('change', updateMenu);
  toggleJuno.addEventListener('change', updateMenu);
  toggleOye.addEventListener('change', updateMenu);
  togglePbvinyl.addEventListener('change', updateMenu);

  // Open the about page
  $('body').on('click', '#about', function() {

    chrome.tabs.create({url: '../html/about.html'});

    acknowledgeUpdate();

    _gaq.push(['_trackEvent', 'about', 'about clicked']);
  });

  // Open block sellers page
  $('body').on('click', '#editList', function() {

    chrome.tabs.create({url: '../html/block-sellers.html'});
  });

  /**
   * CONTEXTUAL MENU OPTIONS
   */

  // Display contextual menu options on hover
  $('.toggle-group.menus').mouseenter(function() {

    let
        contextMenus = $('#contextMenus'),
        interval,
        toggleGroup = $('.toggle-group.menus');

    isHovering = true;

    setTimeout(() => {

      if (isHovering) {

        $(this).css({height: '125px'});
      }
    }, 400);

    interval = setInterval(function() {

      if (toggleGroup.height() >= 120) {

        contextMenus.fadeIn('fast');

        clearInterval(interval);
      }
    }, 100);

  });

  // Hide contextual menu options on mouseleave
  $('.toggle-group.menus').mouseleave(function() {

    let
        contextMenus = $('#contextMenus'),
        interval,
        toggleGroup = $('.toggle-group.menus');

    contextMenus.fadeOut('fast');

    isHovering = false;

    interval = setInterval(function() {

      if (contextMenus.is(':hidden')) {

        toggleGroup.css({height: '25px'});

        clearInterval(interval);
      }
    }, 100);
  });

  /**
   * MARKETPLACE FILTER OPTIONS
   */

  // Display marketplace filter option on hover
  $('.toggle-group.marketplace').mouseenter(function() {

    let
        filter = $('.hide-items'),
        interval,
        toggleGroup = $('.toggle-group.marketplace');

    isMarketplaceHovering = true;

    setTimeout(() => {

      if (isMarketplaceHovering) {

        $(this).css({height: '75px'});
      }
    }, 400);

    interval = setInterval(function() {

      if (toggleGroup.height() >= 70) {

        filter.fadeIn('fast');

        clearInterval(interval);
      }
    }, 100);

  });

  // Hide marketplace filter option on mouseleave
  $('.toggle-group.marketplace').mouseleave(function() {

    let
        filter = $('.hide-items'),
        interval,
        toggleGroup = $('.toggle-group.marketplace');

    filter.fadeOut('fast');

    isMarketplaceHovering = false;

    interval = setInterval(function() {

      if (filter.is(':hidden')) {

        toggleGroup.css({height: '25px'});

        clearInterval(interval);
      }
    }, 100);
  });

  function setupMarketplaceFilter() {

    let setting = Number(localStorage.getItem('itemCondition')),
        conditions = ['Poor (P)',
                      'Fair (F)',
                      'Good (G)',
                      'Good Plus (G+)',
                      'Very Good (VG)',
                      'Very Good Plus (VG+)',
                      'Near Mint (NM/M-)',
                      'Mint (M)'],
        colors = ['#ff0000', '#e54803', '#d87307', '#f6bf48', '#85ab11', '#00db1f', '#00dbb4', '#00b4db'];

    if (setting === 0 || setting === null) {

      $('.toggle-group.marketplace .label').html('Filter Items: &nbsp; <span style="color:white;">Disabled</span>');

    } else {

      $('.toggle-group.marketplace .label').html('Filter Items Below: &nbsp; <span style="color:'+ colors[setting] + ';">' + conditions[setting] + '</span>');
    }
  }

  // Get stored preferences for extension menu
  function init() {

    chrome.storage.sync.get('prefs', function(result) {

      hideMarketplaceItems.value = localStorage.getItem('itemCondition') || '';
      toggleBlockSellers.checked = result.prefs.blockSellers;
      toggleCollectionUi.checked = result.prefs.collectionUi;
      toggleConditions.checked = result.prefs.highlightMedia;
      toggleConverter.checked = result.prefs.converter;
      toggleDarkTheme.checked = result.prefs.darkTheme;
      toggleFeedback.checked = result.prefs.feedback;
      toggleNotesCount.checked = result.prefs.notesCount;
      toggleReleaseDurations.checked = result.prefs.releaseDurations;
      toggleSortBtns.checked = result.prefs.sortButtons;
      togglePrices.checked = result.prefs.suggestedPrices;

      // Contextual menus
      toggleBandcamp.checked = result.prefs.useBandcamp;
      toggleBoomkat.checked = result.prefs.useBoomkat;
      toggleClone.checked = result.prefs.useClone;
      toggleDeeJay.checked = result.prefs.useDeejay;
      toggleDiscogs.checked = result.prefs.useDiscogs;
      toggleGramaphone.checked = result.prefs.useGramaphone;
      toggleHalcyon.checked = result.prefs.useHalcyon;
      toggleHardwax.checked = result.prefs.useHardwax;
      toggleInsound.checked = result.prefs.useInsound;
      toggleJuno.checked = result.prefs.useJuno;
      toggleOye.checked = result.prefs.useOye;
      togglePbvinyl.checked = result.prefs.usePbvinyl;
    });

    checkForUpdate();

    getCurrency();

    setupMarketplaceFilter();
  }

  // Start it up
  init();
});
