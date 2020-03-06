import React from "react";
import CSVReader from "react-csv-reader";
import { CodeBlock, dracula } from "react-code-blocks";

import {
  Button,
  TextInput,
  /*FilePicker,*/ Pane,
  Radio,
  Text
  // Switch
} from "evergreen-ui";

const Label = props => <Text is="label" {...props} />;

class App extends React.Component {
  constructor() {
    super();
    this.state = {
      writeKey: "--",
      eventName: "",
      columns: [],
      rowsValues: [],
      callType: "track",
      externalIds: "",
      code: `function add(a, b) {
        return a + b;
      }
      `
    };

    this.spapaparseOptions = {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      transformHeader: header => header.toLowerCase().replace(/\W/g, "_")
    };
  }

  changeWriteKey(event) {
    this.setState({
      writeKey: event.target.value
    });
  }

  buildPropertiesJson(header, row) {
    const traitsOrProps =
      this.state.callType === "track" ? "properties" : "traits";
    const rootLevel = {
      [traitsOrProps]: {}
    };

    if (this.state.callType === "track") rootLevel.event = this.state.eventName;

    const externalIds = this.state.externalIds.split(",");

    for (let i = 0; i < header.length; i++) {
      const col = header[i];
      if (col === "userId" || col === "anonymousId") rootLevel[col] = row[i];
      else {
        //TODO: exclude externalIds from traits
        //but make it optional because some clients do want that
        rootLevel[traitsOrProps][col] = row[i];
        if (externalIds.indexOf(col) > -1) {
          rootLevel.context = rootLevel.context || {};
          rootLevel.context.externalIds = rootLevel.context.externalIds || [];
          rootLevel.context.externalIds.push({
            id: row[i],
            type: col,
            collection: "users", //TODO: allow for accounts too
            encoding: "none"
          });
        }
      }
    }

    if (!rootLevel.anonymousId || !rootLevel.userId)
      rootLevel.anonymousId = btoa(row[0]); //TODO: Specify what to btoa

    return JSON.stringify(rootLevel);
  }

  getSingleCallForRow(idx) {
    if (this.state.columns.length !== this.state.rowsValues[idx].length)
      return `// Warning: CSV columns and values count do not match for this row
`;

    return `analytics.${this.state.callType}(${this.buildPropertiesJson(
      this.state.columns,
      this.state.rowsValues[idx]
    )});
`;
  }

  getCalls() {
    let finalCalls = "";
    if (this.state.rowsValues.length)
      this.state.rowsValues.some((x, i) => {
        finalCalls += this.getSingleCallForRow(i);
        return i === 10;
      });
    else finalCalls = "no vals";
    return finalCalls;
  }

  getFullNodeJsFile() {
    return `var Analytics = require('analytics-node');

var analytics = new Analytics('${this.state.writeKey}');

${this.getCalls()}
//... ${this.state.rowsValues.length} rows in total.
`;
  }

  onCallTypeChanged(e) {
    this.setState({
      callType: e.currentTarget.value
    });
  }

  onEventNameChanged(e) {
    this.setState({
      eventName: e.currentTarget.value
    });
  }

  columnsTextInputs() {
    //const _self = this;
    return this.state.columns.map(function(name, index) {
      return (
        <div key={name}>
          <TextInput marginBottom={5} type="text" value={name} readOnly />
          {/* <Switch
            height={20}
            value={name}
            checked={_self.state.externalIds[name]}
            onChange={e => {
              const externalIds = _self.state.externalIds;
              externalIds[name] = e.target.value === "on";
              _self.setState({ externalIds });
            }}
          /> */}
        </div>
      );
    });
  }

  handleForce(data, fileName) {
    this.setState({
      columns: data[0],
      rowsValues: data.splice(1)
    });
  }

  render() {
    return (
      <div className="App">
        <Pane display="flex" justifyContent="center" padding={20}>
          <Pane rounded="true" border width="680px" padding={20}>
            <Pane paddingBottom={20}>
              <Text is="h2">Segment CSV Importer</Text>
            </Pane>

            <Pane paddingBottom={20}>
              <Label>WriteKey</Label>
              <div>
                <TextInput
                  name="writekey"
                  onChange={this.changeWriteKey.bind(this)}
                  placeholder="The source Writekey we'll post events to..."
                />
              </div>
            </Pane>

            <Pane paddingBottom={20}>
              <Label>Select file</Label>
              {/* <FilePicker
              width={250}
              onChange={files => console.log(files)}
              placeholder="Select CSV"
            /> */}
              <CSVReader
                cssClass="react-csv-input"
                onFileLoaded={this.handleForce.bind(this)}
                parserOptions={this.papaparseOptions}
              />
            </Pane>

            <Pane
              style={{
                display: this.state.columns.length ? "block" : "none"
              }}
            >
              <Pane paddingBottom={20}>
                <Label>Type of event</Label>
                <Radio
                  size={16}
                  name="type"
                  value="track"
                  label="Track"
                  checked={this.state.callType === "track"}
                  onChange={this.onCallTypeChanged.bind(this)}
                />
                <Radio
                  size={16}
                  name="type"
                  value="identify"
                  label="Identify"
                  checked={this.state.callType === "identify"}
                  onChange={this.onCallTypeChanged.bind(this)}
                />
              </Pane>

              <Pane
                paddingBottom={20}
                style={{
                  display: this.state.callType === "track" ? "block" : "none"
                }}
              >
                <Label>Event Name</Label>
                <div>
                  <TextInput
                    name="eventName"
                    value={this.state.eventName}
                    onChange={this.onEventNameChanged.bind(this)}
                    placeholder="The event name is required for track() calls"
                  />
                </div>
              </Pane>

              <Pane
                style={{
                  display: this.state.columns.length ? "block" : "none"
                }}
              >
                <Pane paddingBottom={20}>
                  <Label>External Id (temp)</Label>
                  <div>
                    <TextInput
                      name="externalIds"
                      onChange={e =>
                        this.setState({
                          externalIds: e.target.value
                        })
                      }
                      placeholder="The externalIds, if any"
                    />
                  </div>
                </Pane>

                <Pane paddingBottom={20}>
                  <Label>Your file columns</Label>
                  <Pane paddingBottom={20}>{this.columnsTextInputs()}</Pane>

                  <Label>Your NodeJs file (preview)</Label>
                  <CodeBlock
                    text={this.getFullNodeJsFile()}
                    language="javascript"
                    showLineNumbers="true"
                    theme={dracula}
                    wrapLines
                  />
                </Pane>
              </Pane>
            </Pane>

            <Pane>
              <Button
                disabled={!this.state.rowsValues.length}
                appearance="primary"
              >
                Generate full Node JS file
              </Button>
            </Pane>
          </Pane>
        </Pane>
      </div>
    );
  }
}
export default App;
