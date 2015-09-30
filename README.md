# winston-groonga
A Winston transport for Groonga Database

## Installation

```bash
npm i --save winston winston-groonga
```

## Setup

```js
var winston = require('winston'),
    winstonGroonga = require('winston-groonga').Groonga

winston.add(winstonGroonga, {
  host: 'localhost',
  port: 5984,
  // optional
  protocol: 'http'
  table: 'logs',
  severity: 'info'
})

```