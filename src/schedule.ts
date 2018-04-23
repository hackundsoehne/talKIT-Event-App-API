import DataFrame from 'dataframe-js';
import Papa = require('papaparse')
import fs = require('fs');
import moment = require('moment')
import { URL } from "url";

export class Schedule {
    constructor(public days : Array<DaySchedule>) {

    }
}

export class DaySchedule {
    
    constructor(public day : Date, public blocks : Array<Block>) {
        
    }
}

export class Block {
    constructor(public start: Date, public end: Date, public name: String, public items: Array<BlockItem>) {
        
    }

    public getTime() : String {
        let start = `${this.start.getHours()}:${this.start.getMinutes()}`
        let end = `${this.end.getHours()}:${this.end.getMinutes()}`
        return start + ' - ' + end
    }

    public getDateTime() : String {
        var options = { weekday: 'long'};
        let day = this.start.toLocaleDateString('de-DE', options)
        return day + ', ' + this.getTime()
    }
}

export class BlockItem {
    constructor(public location: Location, public name: String, public description: String, public host?: Host, public image?: URL) {
        
    }
}

export class Location {
    constructor(public name: String, public lat: number, public long: number) {

    }
}

export class Host {
    constructor(public image: URL, public name: String, public title : String, public description: String, public link? : URL) {

    }
}

export class Parser {
    public agg : any
    public schedule : Schedule
    patterns = ['YYYY-MM-DD HH:mm', 'YYYY-MM-DD H:mm']
    constructor(filepath : string) {
        var content = fs.readFileSync(filepath, "utf8");
        var rows;
        const data = Papa.parse(content, {
            header:true,
            complete: function(results) {
                rows = results.data;
            }
        })
        const df = new DataFrame(rows, data.meta.fields);
        const groupedDF = df.groupBy('Block', 'Datum - start');
        this.agg = groupedDF.aggregate((group, key) => {
            let blockItems = group.toCollection().map(i => this.toBlockItem(i))
            var start = moment("2018.05.02  14:00", this.patterns).toDate()
            var end = moment("2018.05.02  17:00", this.patterns).toDate()
            const first = group.toCollection()[0]
            if (first['Datum - start'] != "") {
                var start = moment(first['Datum - start'], this.patterns).toDate()
                var end = moment(first['Datum - end'], this.patterns).toDate()
            }
            return new Block(start, end, key['Block'], blockItems)
        })
        const days = this.agg
            .map(row => {
                var day = 3
                if (row.get('Datum - start') != "") {
                    day = moment(row.get('Datum - start'), this.patterns).toDate().getDay()
                }
                return row.set('Datum - start', day)
            })
            .groupBy('Datum - start').aggregate((group, key) => {
                const blocks = group.toCollection().map(x => x.aggregation)
                const date = blocks[0].start
                return new DaySchedule(date, blocks)
            })
            .toCollection()
            .map(x => x.aggregation)

        this.schedule = new Schedule(days)
    }

    public toBlockItem(x : any) : BlockItem {
        const loc =  new Location(x['Raum/ Anzeigename'], x.Latitude, x.Longitude)
        var host = undefined
        if (x.Referent != "") {
            host = new Host(
                new URL("https://timedotcom.files.wordpress.com/2014/02/microsoft-ceo-satya-nadella.jpg"),
                x.Referent,
                "",
                ""
            )
        }
        return new BlockItem(loc, x[''], x.Abstract, host)
    }
}

export const FILE_FORMATS : string = "./data/app/Übersicht Formate-Table 1.csv"