require('./base-css.js');
require('../css/composer.css');
var React = require('react');
var ReactDOM = require('react-dom');
var dataCenter = require('./data-center');
var util = require('./util');
var events = require('./events');
var storage = require('./storage');
var Divider = require('./divider');

var Composer = React.createClass({
  getInitialState: function() {
    var rules = storage.get('composerRules');
    return {
      rules: typeof rules === 'string' ? rules : ''
    };
  },
  componentDidMount: function() {
    var self = this;
    self.update(self.props.modal);
    events.on('setComposer', function() {
      var activeItem = self.props.modal;
      activeItem && self.setState({
        data: activeItem
      }, function() {
        self.update(activeItem);
      });
    });
  },
  update: function(item) {
    if (!item) {
      return;
    }
    var refs = this.refs;
    var req = item.req;
    ReactDOM.findDOMNode(refs.url).value = item.url;
    ReactDOM.findDOMNode(refs.method).value = req.method;
    ReactDOM.findDOMNode(refs.headers).value =   util.getOriginalReqHeaders(item);
    ReactDOM.findDOMNode(refs.body).value = req.body || '';
  },
  shouldComponentUpdate: function(nextProps) {
    var hide = util.getBoolean(this.props.hide);
    return hide != util.getBoolean(nextProps.hide) || !hide;
  },
  execute: function() {
    var refs = this.refs;
    var url = ReactDOM.findDOMNode(refs.url).value.trim();
    if (!url) {
      return;
    }
    var rules = this.state.rules;
    var headers = ReactDOM.findDOMNode(refs.headers).value;
    if (typeof rules === 'string' && (rules = rules.trim())) {
      var obj = util.parseJSON(headers);
      var result = [];
      rules = [rules];
      if (obj) {
        Object.keys(obj).forEach(function(key) {
          if (key.toLowerCase() === 'x-whistle-rule-value') {
            var value = obj[key];
            try {
              value = typeof value === 'string' ? decodeURIComponent(value) : '';
            } catch(e) {}
            value && rules.push(value);
            delete obj[key];
          }
        });
        obj['x-whistle-rule-value'] = encodeURIComponent(rules.join('\n'));
        headers = JSON.stringify(obj);
      } else {
        headers.split(/\r\n|\r|\n/).forEach(function(line) {
          var index = line.indexOf(': ');
          if (index === -1) {
            index = line.indexOf(':');
          }
          var key = index === -1 ? line : line.substring(0, index);
          key = key.toLowerCase();
          if (key === 'x-whistle-rule-value') {
            var value = line.substring(index + 1).trim();
            try {
              value = decodeURIComponent(value);
            } catch(e) {}
            rules.push(value);
          } else {
            result.push(line);
          }
        });rules.join('\n');
        result.push('x-whistle-rule-value: ' + encodeURIComponent(rules.join('\n')));
        headers = result.join('\n');
      }
    }
    dataCenter.composer({
      url: url,
      headers: headers,
      method: ReactDOM.findDOMNode(refs.method).value || 'GET',
      body: ReactDOM.findDOMNode(refs.body).value.replace(/\r\n|\r|\n/g, '\r\n')
    });
    events.trigger('executeComposer');
  },
  selectAll: function(e) {
    e.target.select();
  },
  onRulesChange: function(e) {
    var rules = e.target.value;
    this.state.rules = rules;
    storage.set('composerRules', rules);
  },
  onKeyDown: function(e) {
    if ((e.ctrlKey || e.metaKey)) {
      if (e.keyCode == 68) {
        e.target.value = '';
        e.preventDefault();
        e.stopPropagation();
      } else if (e.keyCode == 88) {
        e.stopPropagation();
      }
    }

  },
  render: function() {
    var rules = this.state.rules;
    return (
      <div className={'fill orient-vertical-box w-detail-content w-detail-composer' + (util.getBoolean(this.props.hide) ? ' hide' : '')}>
        <div className="w-composer-url box">
          <input onKeyDown={this.onKeyDown} onFocus={this.selectAll} ref="url" type="text" maxLength="8192" placeholder="url" className="fill w-composer-input" />
          <select ref="method" className="form-control w-composer-method">
                  <option value="GET">GET</option>
                  <option value="POST">POST</option>
                  <option value="PUT">PUT</option>
                  <option value="HEAD">HEAD</option>
                  <option value="TRACE">TRACE</option>
                  <option value="DELETE">DELETE</option>
                  <option value="SEARCH">SEARCH</option>
                  <option value="CONNECT">CONNECT</option>
                  <option value="PROPFIND">PROPFIND</option>
                  <option value="PROPPATCH">PROPPATCH</option>
                  <option value="MKCOL">MKCOL</option>
                  <option value="COPY">COPY</option>
                  <option value="MOVE">MOVE</option>
                  <option value="LOCK">LOCK</option>
                  <option value="UNLOCK">UNLOCK</option>
                  <option value="OPTIONS">OPTIONS</option>
                </select>
          <button onClick={this.execute} className="btn btn-primary w-composer-execute">Go</button>
        </div>
        <Divider vertical="true" rightWidth="140">
          <Divider vertical="true">
            <textarea onKeyDown={this.onKeyDown} ref="headers" className="fill orient-vertical-box w-composer-headers" placeholder="Input the headers"></textarea>
            <textarea onKeyDown={this.onKeyDown} ref="body" className="fill orient-vertical-box w-composer-body" placeholder="Input the body"></textarea>
          </Divider>
          <div ref="rulesCon" className="orient-vertical-box fill">
            <div className="w-detail-request-webforms-title">Rules</div>
            <textarea
              defaultValue={rules}
              onChange={this.onRulesChange}
              style={{background: rules ? 'lightyellow' : undefined }}
              maxLength="8192"
              className="fill orient-vertical-box w-composer-rules"
              placeholder="Input the rules" />
          </div>
        </Divider>
      </div>
    );
  }
});

module.exports = Composer;