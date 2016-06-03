# winston-groonga
A Winston transport for Groonga Database

v 1.0.2 - 06/03/2016

## Installation

```bash
npm i --save winston winston-groonga
```

## Setup

```js
var winston = require('winston'),
    winstonGroonga = require('winston-groonga').Groonga;

winston.add(winstonGroonga, {
  host: 'localhost',
  port: 5984,
  protocol: 'http'
  table: 'logs',
  level: 'info'
})

or

winston.add(winstonGroonga, {
  protocol: 'http'
  url: 'your.path.url:port/path',
  table: 'logs',
  level: 'info'
})

or

winston.add(winstonGroonga, {
  host: 'localhost',
  port: 5984,
  path: '/your/pathe/here',
  protocol: 'http'
  table: 'logs',
  level: 'info'
})
```
