/**
 * Created by Anton on 31.12.2016.
 */
"use strict";
require(['./js/lib/i18nDom', './js/lib/utils'], function (i18nDom, utils) {
    i18nDom();

    document.body.classList.remove('loading');

    var uiState = [];

    var bindClearBtn = function (clear, input, details) {
        details = details || {};
        var clearIsVisible = false;
        input.addEventListener('keyup', function() {
            if (this.value.length > 0) {
                if (!clearIsVisible) {
                    clearIsVisible = true;
                    clear.classList.add('input__clear_visible');
                }
            } else {
                if (clearIsVisible) {
                    clearIsVisible = false;
                    clear.classList.remove('input__clear_visible');
                }
            }
        });

        clear.addEventListener('click', function (e) {
            e.preventDefault();
            input.value = '';
            input.dispatchEvent(new CustomEvent('keyup'));
            input.focus();
        });

        details.dblClick && input.addEventListener('dblclick', function() {
            clear.dispatchEvent(new MouseEvent('click', {cancelable: true}));
        });
    };

    (function () {
        var input =  document.querySelector('.search .input__input');
        var clear =  document.querySelector('.search .input__clear');
        var submit =  document.querySelector('.search .search__submit');

        (function (input, submit) {
            var stateItem = {
                id: 'searchInput',
                discard: function () {
                    input.value = '';
                    input.dispatchEvent(new CustomEvent('keyup', {detail: 'stateReset'}));
                }
            };

            input.addEventListener('keypress', function(e) {
                if (e.keyCode === 13) {
                    submit.dispatchEvent(new MouseEvent('click', {cancelable: true}));
                }
            });

            input.addEventListener('keyup', function(e) {
                if (e.detail !== 'stateReset' && uiState.indexOf(stateItem) === -1) {
                    uiState.push(stateItem);
                }
            });
        })(input, submit);

        bindClearBtn(clear, input);

        (function (submit) {
            submit.addEventListener('click', function(e) {
                e.preventDefault();
                var query = '';
                if (e.detail && e.detail.query) {
                    query = e.detail.query;
                } else {
                    query = input.value;
                }
                query = query.trim();
                if (query) {
                    query = '#?' + utils.hashParam({
                            query: query
                        });
                }
                var url = 'index.html' + query;
                chrome.tabs.create({url: url});
            });
        })(submit);

        var initAutoComplete = function (input, submit) {
            var lastHistoryRequest = null;
            var historySuggests = (function () {
                var history = null;
                var initHistory = function (cb) {
                    chrome.storage.local.get({
                        history: []
                    }, function (storage) {
                        history = storage.history;
                        cb && cb();
                    });

                    return {
                        abort: function () {
                            cb = null;
                        }
                    }
                };
                var onGetHistory = function (term, cb) {
                    var termLen = term.length;
                    var termLow = term.toLowerCase();
                    var list = history.filter(function (item) {
                        var query = item.query;
                        if (termLen === 0) {
                            return !!query;
                        } else {
                            return query.toLowerCase().indexOf(termLow) === 0;
                        }
                    }).sort(function(a, b) {
                        a = a.count;
                        b = b.count;
                        return a === b ? 0 : a < b ? 1 : -1;
                    }).map(function (item) {
                        return item.query;
                    });
                    cb(list);
                };
                return function (term, cb) {
                    if (!history) {
                        lastHistoryRequest = initHistory(function () {
                            onGetHistory(term, cb);
                        });
                    } else {
                        onGetHistory(term, cb);
                    }
                };
            })();

            var webSuggests = (function () {
                var cache = {};
                var onGetSuggests = function (term, suggests, cb) {
                    cache[term] = suggests;
                    cb(suggests);
                };
                return function (term, cb) {
                    var _cache = cache[term];
                    if (_cache) {
                        onGetSuggests(term, _cache, cb);
                    } else {
                        lastHistoryRequest = utils.request({
                            url: 'http://suggestqueries.google.com/complete/search',
                            data: {
                                client: 'firefox',
                                q: term
                            },
                            json: true
                        }, function (err, response) {
                            if (!err) {
                                onGetSuggests(term, response.body[1], cb);
                            }
                        });
                    }
                };
            })();

            $(input).autocomplete({
                minLength: 0,
                delay: 100,
                position: {
                    collision: "bottom"
                },
                source: function(query, cb) {
                    if (lastHistoryRequest) {
                        lastHistoryRequest.abort();
                        lastHistoryRequest = null;
                    }

                    var term = query.term;
                    if (!term.length) {
                        historySuggests(term, cb);
                    } else {
                        webSuggests(term, cb);
                    }
                },
                select: function(e, ui) {
                    submit.dispatchEvent(new CustomEvent('click', {cancelable: true, detail: {query: ui.item.value}}));
                },
                create: function() {
                    var hasTopShadow = false;
                    var ac = document.querySelector('ul.ui-autocomplete');
                    ac.addEventListener('scroll', function () {
                        if (this.scrollTop !== 0) {
                            if (hasTopShadow !== true) {
                                hasTopShadow = true;
                                this.style.boxShadow = 'rgba(0, 0, 0, 0.40) -2px 1px 2px 0px inset';
                            }
                        } else
                        if (hasTopShadow !== false) {
                            hasTopShadow = false;
                            this.style.boxShadow = null;
                        }
                    });
                }
            });
        };

        setTimeout(function () {
            require(['./js/min/jquery-3.1.1.min'], function () {
                require(['./js/min/jquery-ui.min'], function () {
                    initAutoComplete(input, submit);
                });
            });
        }, 50);
    })();

    (function () {
        var inputBoxTimeFilterVisible = false;
        var inputBoxTimeFilter = document.querySelector('.input_box-time-filter');
        var inputWordFilter = document.querySelector('.input__input-word-filter');
        var clearWordFilter = document.querySelector('.input__clear-word-filter');
        var sizeInputFromFilter = document.querySelector('.input__input-size-filter.input__input-range-from');
        var sizeInputToFilter = document.querySelector('.input__input-size-filter.input__input-range-to');
        var selectTimeFilter = document.querySelector('.select__select-time-filter');
        var timeInputFromFilter = document.querySelector('.input__input-time-filter.input__input-range-from');
        var timeInputToFilter = document.querySelector('.input__input-time-filter.input__input-range-to');
        var seedInputFromFilter = document.querySelector('.input__input-seed-filter.input__input-range-from');
        var seedInputToFilter = document.querySelector('.input__input-seed-filter.input__input-range-to');
        var peerInputFromFilter = document.querySelector('.input__input-peer-filter.input__input-range-from');
        var peerInputToFilter = document.querySelector('.input__input-peer-filter.input__input-range-to');

        (function wordFilter(input, clearWordFilter) {
            var stateItem = {
                id: 'wordFilter',
                discard: function () {
                    input.value = '';
                    input.dispatchEvent(new CustomEvent('keyup', {detail: 'stateReset'}));
                }
            };

            bindClearBtn(clearWordFilter, input, {
                dblClick: true
            });

            input.addEventListener('keyup', function(e) {
                if (e.detail !== 'stateReset' && uiState.indexOf(stateItem) === -1) {
                    uiState.push(stateItem);
                }
            });
        })(inputWordFilter, clearWordFilter);

        (function sizeFilter(inputFrom, inputTo) {
            var stateItem = {
                id: 'sizeFilter',
                discard: function () {
                    inputFrom.value = '';
                    inputTo.value = '';
                    inputTo.dispatchEvent(new CustomEvent('keyup', {detail: 'stateReset'}));
                }
            };

            inputFrom.addEventListener('keyup', function(e) {
                if (e.detail !== 'stateReset' && uiState.indexOf(stateItem) === -1) {
                    uiState.push(stateItem);
                }
            });

            inputTo.addEventListener('keyup', function(e) {
                if (e.detail !== 'stateReset' && uiState.indexOf(stateItem) === -1) {
                    uiState.push(stateItem);
                }
            });
        })(sizeInputFromFilter, sizeInputToFilter);

        (function timeFilter(select, inputBox) {
            var stateItem = {
                id: 'timeFilter',
                discard: function () {
                    select.selectedIndex = 0;
                    select.dispatchEvent(new CustomEvent('change', {detail: 'stateReset'}));
                }
            };

            select.addEventListener('change', function (e) {
                var value = this.value;
                if (value < 0) {
                    if (!inputBoxTimeFilterVisible) {
                        inputBoxTimeFilterVisible = true;
                        inputBox.classList.add('input_box-time-filter-visible');
                    }
                } else {
                    if (inputBoxTimeFilterVisible) {
                        inputBoxTimeFilterVisible = false;
                        timeInputFromFilter.value = '';
                        timeInputToFilter.value = '';
                        inputBox.classList.remove('input_box-time-filter-visible');
                    }
                }

                if (!inputBoxTimeFilterVisible) {
                    // apply time template filters
                }

                if (e.detail !== 'stateReset' && uiState.indexOf(stateItem) === -1) {
                    uiState.push(stateItem);
                }
            });
        })(selectTimeFilter, inputBoxTimeFilter);

        (function seedFilter(inputFrom, inputTo) {
            var stateItem = {
                id: 'seedFilter',
                discard: function () {
                    inputFrom.value = '';
                    inputTo.value = '';
                    inputTo.dispatchEvent(new CustomEvent('keyup', {detail: 'stateReset'}));
                }
            };

            inputFrom.addEventListener('keyup', function(e) {
                if (e.detail !== 'stateReset' && uiState.indexOf(stateItem) === -1) {
                    uiState.push(stateItem);
                }
            });

            inputTo.addEventListener('keyup', function(e) {
                if (e.detail !== 'stateReset' && uiState.indexOf(stateItem) === -1) {
                    uiState.push(stateItem);
                }
            });
        })(seedInputFromFilter, seedInputToFilter);

        (function peerFilter(inputFrom, inputTo) {
            var stateItem = {
                id: 'peerFilter',
                discard: function () {
                    inputFrom.value = '';
                    inputTo.value = '';
                    inputTo.dispatchEvent(new CustomEvent('keyup', {detail: 'stateReset'}));
                }
            };

            inputFrom.addEventListener('keyup', function(e) {
                if (e.detail !== 'stateReset' && uiState.indexOf(stateItem) === -1) {
                    uiState.push(stateItem);
                }
            });

            inputTo.addEventListener('keyup', function(e) {
                if (e.detail !== 'stateReset' && uiState.indexOf(stateItem) === -1) {
                    uiState.push(stateItem);
                }
            });
        })(peerInputFromFilter, peerInputToFilter);
    })();

    window.resetState = function () {
        uiState.splice(0).forEach(function (state) {
            state.discard();
        });
        if (uiState.length > 0) {
            console.error('State is not empty!', uiState);
        }
    };
});