import DataFrame from 'dataframe-js';
import Papa = require('papaparse')
import fs = require('fs');
import moment = require('moment-timezone')

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
    constructor(public location: Location, public name: String, public description: String, public host?: Host, public image?: String) {
        
    }
}

export class Location {
    constructor(public name: String, public lat: number, public long: number) {

    }
}

export class Host {
    constructor(public image: String, public name: String, public title : String, public description: String, public link? : String) {

    }
}

export class Parser {
    public agg : any
    public schedule : Schedule
    patterns = ['YYYY-MM-DD HH:mm', 'YYYY-MM-DD H:mm', 'DD.MM.YYYY HH:mm']
    constructor(filepath : string, filepath_speaker : string) {
        var content = fs.readFileSync(filepath, "utf8");
        var rows;
        const data = Papa.parse(content, {
            header:true,
            complete: function(results) {
                rows = results.data;
            }
        })
        var content_speaker = fs.readFileSync(filepath_speaker, "utf8");
        var rows_speaker;
        const data_speaker = Papa.parse(content_speaker, {
            header:true,
            complete: function(results) {
                rows_speaker = results.data;
            }
        })
        rows = rows.filter((x) => x['Datum - end'] != undefined)
        const fields = data.meta.fields.map(Function.prototype.call, String.prototype.trim)
        const date_start = 'Datum - start'
        const name_title = 'Name und Titel'
        const df = new DataFrame(rows, data.meta.fields).rename(data.meta.fields[0], date_start);
        const df_speaker = new DataFrame(rows_speaker, data_speaker.meta.fields).rename(data_speaker.meta.fields[0], name_title);
        const groupedDF = df.groupBy('Block', date_start);
        this.agg = groupedDF.aggregate((group, key) => {
            let blockItems = group.toCollection().map(i => this.toBlockItem(i, df_speaker))
            //TODO stupid hack because i can't get the timezones to work otherwise
            var start = moment("08.05.2019 14:00", this.patterns).toDate()
            var end = moment("08.05.2019 18:00", this.patterns).toDate()
            const first = group.toCollection()[0]
            if (first[date_start] != "") {
                var start = moment(first[date_start], this.patterns[2]).toDate()
                var end = moment(first['Datum - end'], this.patterns[2]).toDate()
            }
            start.setHours(start.getHours() - 2)
            end.setHours(end.getHours() - 2)
            return new Block(start, end, key['Block'].trim().replace(/[\n\r]/g, ''), blockItems)
        })
        const days = this.agg
            .map(row => {
                var day = 3
                if (row.get(date_start) != "") {
                    day = moment(row.get(date_start), this.patterns).toDate().getDay()
                }
                return row.set(date_start, day)
            })
            .groupBy(date_start).aggregate((group, key) => {
                const blocks = group.toCollection()
                    .map(x => x.aggregation)
                    .sort((x : Block, y : Block) => x.start.getTime() - y.start.getTime())
                const date = blocks[0].start
                return new DaySchedule(date, blocks)
            })
            .toCollection()
            .map(x => x.aggregation)

        this.schedule = new Schedule(days)
    }

    public toBlockItem(x : any, df_speaker : any) : BlockItem {
        var lat = x.Latitude
        var long = x.Longitude
        if (lat.match("\\d+\.\\d+\.\\d+")) {
            lat = this.tidyDirtyLatLong(lat)
            long = this.tidyDirtyLatLong(long)
        }
        const loc =  new Location(x['Location'], lat, long)
        var host = undefined
        if (x.Speaker != "") {
            var url =  "/assets/speakers/"+"unknown.png"
            var title = ""
            var desc = ""
            const ref_row = df_speaker.find({'Name und Titel': x.Speaker})
            if (ref_row) {
                url =  "/assets/speakers/"+ref_row.get("Name des Bilds")
                title = ref_row.get("Position")
                desc = ref_row.get("CV")
            }
            host = new Host(
                url,
                x.Speaker,
                title,
                desc
            )
        }
        var image = undefined
        if (x["Picture"] != "") {
            image = "/assets/events/" + x["Picture"]
        }
        return new BlockItem(loc, x['Event'].trim().replace(/[\n\r]/g, ''), x.Abstract, host, image)
    }

    tidyDirtyLatLong(s : String) : String {
        var position = s.indexOf(".", s.indexOf(".") + 1);
        return s.substr(0, position) + s.substr(position + 1);
    }
}

export const FILE_FORMATS : string = "./data/app/Uebersicht Formate-Table 1.csv"
export const FILE_FORMATS_Ref : string = "./data/app/Referentenprofile-Table 1.csv"