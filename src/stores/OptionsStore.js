import {flow, getParentOfType, getSnapshot, isAlive, types} from 'mobx-state-tree';
import highlight from "../tools/highlight";
import _isEqual from "lodash.isequal";
import getLogger from "../tools/getLogger";
import getNow from "../tools/getNow";
import {unixTimeToString} from "../tools/unixTimeTo";

const promiseLimit = require('promise-limit');

const logger = getLogger('OptionsStore');
const oneLimit = promiseLimit(1);


const OptionsValueStore = types.model('OptionsValueStore', {
  hidePeerRow: types.optional(types.boolean, false),
  hideSeedRow: types.optional(types.boolean, false),
  categoryWordFilter: types.optional(types.boolean, false),
  syncProfiles: types.optional(types.boolean, true),
  contextMenu: types.optional(types.boolean, true),
  disablePopup: types.optional(types.boolean, false),
  invertIcon: types.optional(types.boolean, true),
  doNotSendStatistics: types.optional(types.boolean, false),
  originalPosterName: types.optional(types.boolean, false),
  favoriteSync: types.optional(types.boolean, true),
}).actions(self => {
  return {
    setValue(key, value) {
      self[key] = value;
    }
  };
});


/**
 * @typedef {{}} OptionsStore
 * @property {string} [state]
 * @property {OptionsValueStore} options
 * @property {function} setOptions
 * @property {function:Promise} fetchOptions
 * @property {function} set
 * @property {function} get
 * @property {function} save
 * @property {function} afterCreate
 * @property {function} beforeDestroy
 */
const OptionsStore = types.model('OptionsStore', {
  state: types.optional(types.enumeration('State', ['idle', 'pending', 'done', 'error']), 'idle'),
  options: types.optional(OptionsValueStore, {}),
}).actions(self => {
  return {
    setOptions(value) {
      this.options = value;
    },
    fetchOptions: flow(function* () {
      self.state = 'pending';
      try {
        const storage = yield new Promise(resolve => chrome.storage.local.get({options: {}}, resolve));
        if (isAlive(self)) {
          self.options = storage.options;
          self.state = 'done';
        }
      } catch (err) {
        logger.error('fetchOptions error', err);
        if (isAlive(self)) {
          self.state = 'error';
        }
      }
    })
  };
}).views(self => {
  const storageChangeListener = (changes, namespace) => {
    if (self.state !== 'done') return;

    if (namespace === 'sync') {
      const change = changes.options;
      if (change) {
        const options = change.newValue;
        if (!_isEqual(options, getSnapshot(self.options))) {
          self.setOptions(options);
        }
      }
    }
  };

  return {
    save() {
      return oneLimit(() => {
        return new Promise(resolve => chrome.storage.local.set({
          options: getSnapshot(self.options)
        }, resolve));
      });
    },
    afterCreate() {
      chrome.storage.onChanged.addListener(storageChangeListener);
    },
    beforeDestroy() {
      chrome.storage.onChanged.removeListener(storageChangeListener);
    },
  };
});

export default OptionsStore;