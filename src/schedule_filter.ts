import { Block, Schedule, DaySchedule, BlockItem } from "./schedule";
import fs = require('fs');
import Papa = require('papaparse')
import moment = require('moment-timezone')

export class Filter {
    constructor (public active : boolean, public day? : Date, public event?: string) {
    }

    public apply(block : Block) : Block {
        if (this.day && block.start.getDate() != this.day.getDate()) {
            return block
        }
        if (!this.active) {
            return undefined
        }
        if (this.event) {
            var items = block.items.filter(item => item.name.replace(/ /g, "") == this.event)
            if (items.length == 0) {
                return undefined
            } else {
                return new Block(block.start, block.end, block.name, items)
            }
        }
        return block
    }
}

export class UserFilters {
    public filtersMap : Map<String, [Filter]>
    constructor() {
        this.filtersMap = new Map<String, [Filter]>();
    }

    public addFilter(block : string, filter : Filter) {
        if (this.filtersMap.has(block)) {
            var filters = this.filtersMap.get(block)
            filters.push(filter)
        } else {
            this.filtersMap.set(block, [filter])
        }
    }

    public filter(schedule : Schedule) : Schedule {
        return new Schedule(schedule.days.map(d => this.mapDay(d)))
    }

    public mapDay (day : DaySchedule) : DaySchedule {
        var newBlocks : Array<Block> = new Array()
        for (let block of day.blocks) {
            const filters = this.filtersMap.get(block.name.replace(/ /g, ""))
            if (filters) {
                const filtered = filters.reduce((block,filter) => {
                    if(block) {
                        return filter.apply(block)
                    } else {
                        return block
                    }
                }, block)
                if (filtered) {
                    newBlocks.push(filtered)
                }
            } else {
                newBlocks.push(block)
            }
        }
        return new DaySchedule(day.day, newBlocks)
    }
}

export class UsersFilters {
    public usersMap : Map<string, UserFilters>
    constructor() {
        this.usersMap = new Map()
    }

    public addUser(name : string, filters : UserFilters) {
        this.usersMap.set(name, filters)
    }
}

export class FiltersParser {
    public usersFilters : UsersFilters = new UsersFilters()
    patterns = ['DD-MM-YYYY']
    constructor(filepath : string) {
        var content = fs.readFileSync(filepath, "utf8");
        var rows;
        const data = Papa.parse(content, {
            header:true,
            complete: function(results) {
                rows = results.data;
            }
        })
        for (let row of rows) {
            const id = row["Teilnehmer ID/ Passwort"]
            delete row["Teilnehmer ID/ Passwort"]
            delete row["Email Adresse"]
            delete row["Vorname"]
            delete row["Nachname"]
            const usersFilter = new UserFilters()
            for (const key of Object.keys(row)) {
                const val : string = row[key]
                if (val == "") {
                    continue
                }
                var name = key
                var date : Date = undefined
                const res = key.match("(\\w+) - (\\d\\d\.\\d\\d\.\\d\\d\\d\\d)")
                if (res) {
                    name = res[1]
                    date = moment(res[2], this.patterns).toDate()
                }
                var event = undefined
                var active = true
                if (val != "Nein" && val != "Ja") {
                    event = val.replace(/ /g, "")
                } else if (val == "Nein"){
                    active = false
                }
                usersFilter.addFilter(name.trim().replace(/ /g, ""), new Filter(active, date, event))
            }
            this.usersFilters.addUser(id, usersFilter)
        }
    }
}

export const FILE_USERS : string = "./data/app/Teilnehmer-Table 1.csv"