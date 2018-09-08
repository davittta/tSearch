import {types} from 'mobx-state-tree';
import TrackerWorker from "../tools/trackerWorker";
import getLogger from "../tools/getLogger";

const logger = getLogger('TrackerStore');


/**
 * @typedef {{}} TrackerMetaStore
 * @property {string} name
 * @property {string|undefined} version
 * @property {string|undefined} author
 * @property {string|undefined} description
 * @property {string|undefined} homepageURL
 * @property {string|undefined} icon
 * @property {string|undefined} icon64
 * @property {string|undefined} trackerURL
 * @property {string|undefined} updateURL
 * @property {string|undefined} downloadURL
 * @property {string|undefined} supportURL
 * @property {string[]} [require]
 * @property {string[]} [connect]
 */
const TrackerMetaStore = types.model('TrackerMetaStore', {
  name: types.string,
  version: types.maybe(types.string),
  author: types.maybe(types.string),
  description: types.maybe(types.string),
  homepageURL: types.maybe(types.string),
  icon: types.maybe(types.string),
  icon64: types.maybe(types.string),
  trackerURL: types.maybe(types.string),
  updateURL: types.maybe(types.string),
  downloadURL: types.maybe(types.string),
  supportURL: types.maybe(types.string),
  require: types.optional(types.array(types.string), []),
  connect: types.optional(types.array(types.string), []),
});

/**
 * @typedef {{}} TrackerStore
 * @property {string} id
 * @property {number} [attached]
 * @property {string} [state]
 * @property {TrackerMetaStore} meta
 * @property {string} code
 * @property {function} attach
 * @property {function} deattach
 * @property {function} setState
 * @property {*} worker
 * @property {function} getIconUrl
 * @property {function} handleAttachedChange
 * @property {function} createWorker
 * @property {function} destroyWorker
 * @property {function} beforeDestroy
 */
const TrackerStore = types.model('TrackerStore', {
  id: types.identifier,
  attached: types.optional(types.number, 0),
  state: types.optional(types.enumeration('State', ['idle', 'pending', 'done', 'error']), 'idle'),
  meta: TrackerMetaStore,
  code: types.string
}).actions(self => {
  return {
    attach() {
      self.attached++;
      self.handleAttachedChange();
    },
    deattach() {
      self.attached--;
      setTimeout(() => {
        self.handleAttachedChange();
      }, 1);
    },
    setState(state) {
      self.state = state;
    },
  };
}).views(self => {
  let worker = null;
  return {
    get worker() {
      return worker;
    },
    getIconUrl() {
      if (self.meta.icon64) {
        return self.meta.icon64;
      } else if (self.meta.icon) {
        return self.meta.icon;
      }
      return '';
    },
    handleAttachedChange() {
      if (self.attached) {
        if (!worker && self.state !== 'pending') {
          self.createWorker();
        }
      } else {
        if (worker) {
          self.destroyWorker();
          self.setState('idle');
        }
      }
    },
    createWorker() {
      self.setState('pending');
      worker = new TrackerWorker();
      return worker.init(self.toJSON()).then(() => {
        self.setState('done');
      }).catch(err => {
        logger.error('createWorker error', err);
        self.setState('error');
      });
    },
    destroyWorker() {
      worker.destroy();
      worker = null;
    },
    beforeDestroy() {
      if (worker) {
        self.destroyWorker();
      }
    }
  };
});

export default TrackerStore;