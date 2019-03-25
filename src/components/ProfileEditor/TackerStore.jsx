import {observer} from "mobx-react";
import React from "react";
import PropTypes from "prop-types";
import blankSvg from "../../assets/img/blank.svg";


@observer
class TackerStore extends React.Component {
  static propTypes = {
    profileEditorStore: PropTypes.object.isRequired,
    showOptions: PropTypes.bool.isRequired,
  };

  /**@return ProfileEditorStore*/
  get profileEditorStore() {
    return this.props.profileEditorStore;
  }

  componentDidMount() {
    if (!this.profileEditorStore.trackerStore) {
      this.profileEditorStore.createTrackerStore();
      this.profileEditorStore.trackerStore.fetch();
    }
  }

  render() {
    let items = null;

    if (this.profileEditorStore.trackerStore) {
      if (this.profileEditorStore.trackerStore.state !== 'done') {
        return (`Loading: ${this.profileEditorStore.trackerStore.state}`);
      }

      items = this.profileEditorStore.trackerStore.results.map((module) => {
        return (
          <TackerStoreItem key={module.download_url} module={module}/>
        );
      });
    }

    return (
      <div className="manager__trackers">
        {items}
      </div>
    );
  }
}

@observer
class TackerStoreItem extends React.Component {
  static propTypes = {
    module: PropTypes.object.isRequired,
  };

  state = {
    installed: false
  };

  /**@return {TrackerStoreResultStore}*/
  get module() {
    return this.props.module;
  }

  handleInstall = (e) => {
    e.preventDefault();


    this.module.save();
    this.setState({
      installed: true
    });
  };

  handleUninstall = (e) => {
    e.preventDefault();

    this.module.deleteTacker();
    this.setState({
      installed: false
    });
  };

  handleFetch = (e) => {
    e.preventDefault();
    this.module.fetch();
  };

  handleItemClick = (e) => {
    this.handleFetch(e);
  };

  render() {
    const tracker = this.module;


    let fetchBtn = null;
    let installBtn = null;
    let supportBtn = null;
    let homepageBtn = null;

    let name = tracker.name;
    let icon = blankSvg;
    let version = null;
    let description = null;
    let author = null;

    let handleClick = null;
    if (tracker.meta) {
      name = tracker.meta.name || name;
      icon = tracker.meta.icon64 || tracker.meta.icon || icon;
      version = tracker.meta.version;

      if (tracker.meta.description) {
        description = tracker.meta.description;
      }

      if (tracker.meta.supportURL) {
        supportBtn = (
          <a href={tracker.meta.supportURL} className="item__button button-support" target="_blank"/>
        );
      }

      if (tracker.meta.homepageURL) {
        homepageBtn = (
          <a href={tracker.meta.homepageURL} className="item__button button-home" target="_blank"/>
        );
      }

      if (tracker.meta.author) {
        author = (
          <div className="item__cell item__author">{tracker.meta.author}</div>
        );
      }

      if (tracker.hasTracker || this.state.installed) {
        installBtn = (
          <a onClick={this.handleUninstall} className="item__button button-remove" href="#uninstall"
             title={chrome.i18n.getMessage('delete')}/>
        );
      } else {
        installBtn = (
          <a onClick={this.handleInstall} className="item__button button-plus" href="#install"
             title={chrome.i18n.getMessage('add')}/>
        );
      }
    } else {
      fetchBtn = (
        <a onClick={this.handleFetch} className="item__button button-info" href="#fetch"
           title={chrome.i18n.getMessage('fetchMeta')}/>
      );

      handleClick = this.handleItemClick;
    }

    return (
      <div className="item">
        <div className="item__cell item__icon">
          <img src={icon} alt=""/>
        </div>
        <div onClick={handleClick} className="item__cell item__name">{name}</div>
        <div onClick={handleClick} className="item__cell item__desc">
          <div className="desc">{description}</div>
        </div>
        <div className="item__cell item__version">{version}</div>
        {author}
        <div className="item__cell item__actions">
          {fetchBtn}
          {installBtn}
          {supportBtn}
          {homepageBtn}
        </div>
      </div>
    );
  }
}

export default TackerStore;