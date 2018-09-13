import {h,  Component, render} from 'preact';
import { map, trim, shuffle } from 'lodash';
import rwc from 'random-weighted-choice';

var gcd = (a, b) => {
  if ( ! b) {
    return a;
  }
  return gcd(b, a % b);
};

class CheckInForm extends Component {

  constructor(props) {
    super(props);
    this.state = {
      visible: true,
      error: null,
      entries: []
    };
  }

  entryChanged = (entry) => {
    console.log('entryChanged', e);
  };

  addEntry = () => {
    if (this.state.entries.length === 30) {
      this.showError("Too many entries.");
      return;
    }
    let newEntryName = trim(document.querySelectorAll("input#newEntryName")[0].value);
    let newEntryWeight = trim(document.querySelectorAll("input#newEntryWeight")[0].value);
    if (newEntryName.length && newEntryName.length <= 30) {
      this.state.entries.push({
        id: newEntryName,
        weight: 1
      });
      this.setState({
        entries: this.state.entries
      });
    }
  };

  componentDidUpdate() {
    let inputEntryName = document.querySelectorAll("input#newEntryName")[0];
    let entries = document.querySelectorAll("#entries")[0];
    if (inputEntryName)
      inputEntryName.focus();
    if (entries)
      entries.scrollTop = entries.scrollHeight;
  }

  showError = (err) => {
    this.setState({error: err});
    this.setTimeout(() => {
      this.state.error = null;
    }, 5000);
  };

  go = (e) => {
    e.preventDefault();
    let entries = [];
    const commonFactor =  gcd(this.state.entries.length, 30);
    if (30 % this.state.entries.length === 0) {
      for (let i = 0; i < 30; i++) {
        entries.push(Object.assign({}, this.state.entries[i % this.state.entries.length]));
      }
    } else {
      for (let i = 0; i < 30; i++) {
        entries.push({
          id: rwc(this.state.entries)
        });
      }
      entries = shuffle(entries);
    }

    this.setState({visible: false});
    this.props.app.initGame(entries);
  };

  test = (e) => {
    e.preventDefault();
    this.setState({visible: false});
    this.props.app.initGame(null);
  };

  onKeyDown = (e) => {
    if (e.keyCode === 13) {
      e.preventDefault();
      this.addEntry();
    }
  };

  render() {
    if (!this.state.visible) return null;
    let htmlENtries = this.state.entries.length ? (
      <div id="entries">
        {map(this.state.entries, (entry, i) => (
          [
            <input readOnly={true} className="entryName" type="text" maxLength="15" name="newEntry" placeholder="Entry"
                   value={entry.id}
            />,
            <input className="entryWeight" type="number" name="newWeight" placeholder="Weight"
                   value={entry.weight} onChange={this.entryChanged.bind(this, entry)}
            />
          ]
        ))}
      </div>
    )  : null;
    let {error} = this.state;
    return (
      <div class="login-wrapper">
        <div className="vAlign">
          <div className="login">
            {/*<h1>Got a big Life decision to make?</h1>*/}
            <div className="heading">
              <h1>Big Life decision?</h1>
              <h1>Enter your options and let the Wheel of Fate decide</h1>
              <div className="try-demo" onClick={this.test}><h2>Or you could just Try the Demo.</h2></div>
              {error ? <p>{error}</p>: null}
            </div>
            <form onSubmit={this.go} id="entryForm" method="post">
              {htmlENtries}
              <div id="newEntry">
                <input onKeyDown={this.onKeyDown} id="newEntryName" type="text" maxLength="10" placeholder="" value=""/>
                <input id="newEntryWeight" type="number" placeholder="Weight"/>
              </div>
              <button onClick={this.addEntry} type="button" class="addEntry btn btn-primary btn-block btn-large">Add Option</button>

              {this.state.entries.length >= 2 ? <button onClick={this.go} type="button" class="btn btn-primary btn-block btn-large btn-red">Go!</button>:null}
            </form>
          </div>
        </div>
      </div>
    );
  }
}

export default CheckInForm;