import * as express from 'express'
import * as s from './schedule'
var cors = require('cors');

class App {
  public express
  public schedule

  constructor () {
    this.express = express()
    this.express.use(cors());
    const p = new s.Parser(s.FILE_FORMATS, s.FILE_FORMATS_Ref)
    this.schedule = p.schedule
    this.mountRoutes()
  }

  private mountRoutes (): void {
    const router = express.Router()
    router.get('/', (req, res) => {
      res.json({
        message: 'Hello World!'
      })
    })
    router.get('/schedule', (req, res) => {
      res.json(this.schedule)
    })
    this.express.use('/', router)
  }
}

export default new App().express