import * as express from 'express'
import * as s from './schedule'

class App {
  public express
  public schedule

  constructor () {
    this.express = express()
    const p = new s.Parser(s.FILE_FORMATS)
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