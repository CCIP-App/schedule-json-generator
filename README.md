schedule-json-generator
===

Generate schedule json file for OPass from Google Spreadsheet

## How to
- Make a copy from this [spreadsheet](https://docs.google.com/spreadsheets/d/1knHgrDErElEvj0W9GvFm-_uXk-GaXL3kA8sONq-EHv0/edit?usp=sharing).
- Clone this repo, and copy the `config-sample.js` to `config.js`, modify it.
- Generate!
## GitHub Actions
You need to put your GCP API key in to `Repo's Settings` > `Secrets` > `Actions` > `New repository secret`
```yaml
name: Generate Schedule Json file
on:
  - push
  - workflow_dispatch

jobs:
  schedule-json-generator:
    runs-on: ubuntu-latest
    name: Generate schedule
    steps:
      - name: Checkout
        uses: actions/checkout@v3
      - name: Generate Schedule Json
        uses: CCIP-App/schedule-json-generator@v1
        id: generate
        with:
          gcp-api-key: ${{ secrets.GCP_API_KEY }}
          spreadsheet-key: "198dUX5oH72Q7gaGt_SEPrON-QYNRdAu3f-F2Pg4uFoM"
          default-avatar: "https://sitcon.org/2018/static/img/staffs/stone.png"
          avatar-base-url: "https://sitcon.org/2018/static/img/speaker/"
      # Use the output from the `generate` step
      - name: Get the output json
        run: echo '${{ steps.generate.outputs.output-json }}'
```