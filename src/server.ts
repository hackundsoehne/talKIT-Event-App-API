import * as express from 'express'
import * as s from './schedule'
import * as u from './schedule_filter'
var cors = require('cors');

class App {
  public express
  public schedule
  public users : u.UsersFilters

  constructor () {
    this.express = express()
    this.express.use(cors());
    this.express.use(function(req, res, next) {
      res.header("Access-Control-Allow-Origin", "*");
      res.header('Access-Control-Allow-Methods', 'DELETE, PUT, GET, POST');
      res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
      next();
   });
    const p = new s.Parser(s.FILE_FORMATS, s.FILE_FORMATS_Ref)
    const p_users = new u.FiltersParser(u.FILE_USERS)
    this.schedule = p.schedule
    this.users = p_users.usersFilters
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
    router.get('/schedule/:id', (req, res) => {
      let { id } = req.params;
      const filters = this.users.usersMap.get(id)
      if (filters) {
        res.json(filters.filter(this.schedule))
      } else {
        res.status(404).send('Not found');
      }
    })
    this.express.use('/', router)
  }
}

export default new App().express