/**
 * Created by Anton on 28.02.2015.
 */
var mono = (typeof mono !== 'undefined') ? mono : undefined;

(function() {
    "use strict";
    if (typeof window !== 'undefined') return;
    var self = require('sdk/self');
    mono = require('toolkit/loader').main(require('toolkit/loader').Loader({
        paths: {
            'data/': self.data.url('js/')
        },
        name: self.name,
        prefixURI: self.data.url().match(/([^:]+:\/\/[^/]+\/)/)[1],
        globals: {
            console: console,
            _require: function(path) {
                switch (path) {
                    case 'sdk/simple-storage':
                        return require('sdk/simple-storage');
                    case 'sdk/window/utils':
                        return require('sdk/window/utils');
                    case 'sdk/self':
                        return require('sdk/self');
                    default:
                        console.log('Module not found!', path);
                }
            }
        }
    }), "data/mono");
    self = null;
})();

var bg = {
    settings: {
        contextMenu: 1,
        searchPopup: 1
    },
    updateBtnAction: mono.isChromeWebApp ? function() {
        "use strict";

    } : mono.isChrome ? function() {
        "use strict";
        chrome.browserAction.setPopup({
            popup: bg.settings.searchPopup ? 'popup.html' : ''
        });
    } : function() {
        "use strict";

    },
    ffContextMenu: null,
    checkExtExists: function(cb) {
        "use strict";
        if (!mono.isChromeWebApp) {
            return cb();
        }
        var xhr = new XMLHttpRequest();
        xhr.open('GET', 'chrome-extension://ngcldkkokhibdmeamidppdknbhegmhdh/img/icon_16.png', true);
        xhr.onerror = function() {
            cb();
        };
        xhr.send();
    },
    updateContextMenu: mono.isChrome ? function() {
        "use strict";
        chrome.contextMenus.removeAll(function () {
            if (!bg.settings.contextMenu) {
                return;
            }
            bg.checkExtExists(function() {
                chrome.contextMenus.create({
                    type: "normal",
                    id: "item",
                    title: mono.language.ctxMenuTitle,
                    contexts: ["selection"],
                    onclick: function (info) {
                        var text = info.selectionText;
                        chrome.tabs.create({
                            url: 'index.html' + ( text ? '#?search=' + encodeURIComponent(text) : ''),
                            selected: true
                        });
                    }
                });
            });
        });
    } : (mono.isFF && mono.ffButton) ? function() {
        "use strict";

        var contentScript = (function() {
            var onContext = function() {
                "self".on("click", function() {
                    var text = window.getSelection().toString();
                    "self".postMessage(text);
                });
            };
            var minifi = function(str) {
                var list = str.split('\n');
                var newList = [];
                list.forEach(function(line) {
                    newList.push(line.trim());
                });
                return newList.join('');
            };
            var onClickString = onContext.toString().replace(/"self"/g, 'self');
            var n_pos =  onClickString.indexOf('{')+1;
            onClickString = onClickString.substr(n_pos, onClickString.length - 1 - n_pos).trim();
            return minifi(onClickString);
        })();

        var self = require('sdk/self');

        if (bg.ffContextMenu) {
            bg.ffContextMenu.parentMenu.removeItem(bg.ffContextMenu);
            bg.ffContextMenu = null;
        }

        if (!bg.settings.contextMenu) {
            return;
        }

        var contextMenu = require("sdk/context-menu");
        bg.ffContextMenu = contextMenu.Item({
            label: mono.language.ctxMenuTitle,
            context: contextMenu.SelectionContext(),
            image: self.data.url('./icons/icon-16.png'),
            contentScript: contentScript,
            onMessage: function (text) {
                var tabs = require('sdk/tabs');
                tabs.open(self.data.url('index.html') + '#?search=' + encodeURIComponent(text));
            }
        });
    } : function() {
        "use strict";

    },
    onMessage: function(msg, cb) {
        "use strict";
        if (msg === 'reloadSettings') {
            bg.run();
            return cb();
        }
    },
    once: function() {
        "use strict";
        if (mono.isSafariBgPage) {
            safari.extension.settings.addEventListener('change', function(event){
                if (event.key !== 'open_options') {
                    return;
                }
                var tab = safari.application.activeBrowserWindow.openTab();
                tab.url = safari.extension.baseURI + 'options.html';
                tab.activate();
            });
        }
        if (mono.isChrome) {
            chrome.omnibox.onInputEntered.addListener(function (text) {
                chrome.tabs.create({
                    url: "index.html" + ( text ? '#?search=' + encodeURIComponent(text) : ''),
                    selected: true
                });
            });
            chrome.browserAction.onClicked.addListener(function() {
                if (bg.settings.searchPopup) {
                    return;
                }
                chrome.tabs.create({
                    url: 'index.html'
                });
            });
        }
        bg.run();
    },
    fastMigration: function() {
        "use strict";
        var migrateProfileList = function(value, storage) {
            if (typeof value !== 'string') {
                return;
            }
            try {
                var obj = JSON.parse(value);
                storage.profileList = obj;
            } catch (e) {}
        };
        var migrateExploreOptions = function(value, storage) {
            if (typeof value !== 'string') {
                return;
            }
            var langMap = {
                favorites: 'favoriteList',
                kp_favorites: 'kpFavoriteList',
                kp_in_cinema: 'kpInCinema',
                kp_popular: 'kpPopular',
                kp_serials: 'kpSerials',
                imdb_in_cinema: 'imdbInCinema',
                imdb_popular: 'imdbPopular',
                imdb_serials: 'imdbSerials',
                gg_games_top: 'ggGamesTop',
                gg_games_new: 'ggGamesNew'
            };
            try {
                var obj = JSON.parse(value);
                var explorerOptions = [];
                for (var key in obj) {
                    var p = obj[key];
                    explorerOptions.push({
                        enable: p.e ? 1 : 0,
                        lang: langMap[key],
                        lineCount: parseInt(p.c) || 1,
                        show: p.s ? 1 : 0,
                        type: key,
                        width: parseInt(p.w) || 100
                    });
                }
                storage.explorerOptions = explorerOptions;
            } catch (e) {}
        };

        mono.storage.get(null, function(storage) {
            if (storage.isMigrated) {
                return;
            }
            var rmList = [
                'add_in_omnibox', 'advFiltration', 'click_history',
                'hideTrackerIcons', 'enableTeaserFilter', 'hideZeroSeed',
                'history', 'lang', 'listOptions',
                'noBlankPageOnDownloadClick', 'noTransition', 'noTransitionLinks',
                'optMigrated', 'proxyHost', 'proxyHostLinks', 'proxyList',
                'proxyURL', 'proxyUrlFixSpaces', 'qualityBoxCache',
                'qualityCache', 'table_sort_by', 'table_sort_colum',
                'torrentListHeight', 'torrent_list_h', 'titleQualityList'
            ];
            var inList = {
                isMigrated: 1
            };
            for (var key in storage) {
                if (key.substr(0, 10) === 'exp_cache_') {
                    if (key === 'exp_cache_favorites') {
                        inList.expCache_favorites = storage[key];
                    }
                    rmList.push(key);
                }
                if (key === 'enableTeaserFilter') {
                    inList.teaserFilter = !!storage[key] ? 1 : 0;
                }
                if (key === 'lang') {
                    inList.langCode = storage[key];
                }
                if (key === 'profileList') {
                    migrateProfileList(storage[key], inList);
                }
                if (key === 'listOptions') {
                    migrateExploreOptions(storage[key], inList);
                }
            }

            mono.storage.remove(rmList, function() {
                mono.storage.set(inList);
                if (mono.isChrome) {
                    var syncList = {};
                    if (storage.profileListSync) {
                        syncList.profileList = inList.profileList;
                    }
                    if (storage.enableFavoriteSync) {
                        syncList.expCache_favorites = inList.expCache_favorites;
                    }
                    mono.storage.sync.set(syncList);
                }
            });
        });
    },
    run: function() {
        "use strict";
        this.fastMigration();
        mono.storage.get(['contextMenu', 'searchPopup', 'langCode'], function(storage) {
            if (storage.hasOwnProperty('contextMenu')) {
                bg.settings.contextMenu = storage.contextMenu;
            }
            if (storage.hasOwnProperty('searchPopup')) {
                bg.settings.searchPopup = storage.searchPopup;
            }

            mono.getLanguage(function() {
                bg.updateContextMenu();
                bg.updateBtnAction();
            }, storage.langCode);

            if (mono.isSafari) {
                // update popup window
                safari.extension.popovers[0].contentWindow.popup.update();
            }
        });
    }
};

(function() {
    var init = function(addon, button) {
        "use strict";
        if (addon) {
            mono = mono.init(addon);
            mono.ffButton = button;
            mono.ajax.xhr = require('sdk/net/xhr').XMLHttpRequest;
        } else {
            mono.ajax.xhr = XMLHttpRequest;
        }

        mono.onMessage(bg.onMessage);
        bg.once();
    };
    if (!mono.isModule) {
        return init();
    }
    exports.init = init;
})();