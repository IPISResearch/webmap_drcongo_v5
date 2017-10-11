var Data = function(){

    // preload and transform datasets
    var me = {};

    var visits;

    var mines;          var minesLookup = {};
    var minerals = [];  var mineralLookup = {};
    var years = [];     var yearsLookup = {};
    var armies = [];    var armiesLookup = {};

    var filteredMineIds = [];
    var filterFunctionsLookup = {};

    var mineralColors = {
        "Or" : "#DAA520",
        "Cassitérite" : "#FFA07A",
        "Coltan" : "#1E90FF",
        "Wolframite" : "#8b5928",
        "Cuivre" : "#C87533",
        "Diamant" : "#FFDEAD",
        "Monazite" : "#9cc6de",
        "Tourmaline" : "#006600",
        "Améthyste" : "#9966CB"
    };

    me.init = function(next){

        var checkpoint = new Date().getTime();
        var now;

        var url = "http://ipis.annexmap.net/api/data/cod/all?key=ipis";
        FetchService.json(url,function(data){

            console.log(data);
            now = new Date().getTime();
            console.log("data preloaded in " +  (now-checkpoint) + "ms");
            checkpoint = now;

            //build mines
            var counter = 0;
            mines = featureCollection();
			data.result.forEach(function(d){

			    var mine = minesLookup[d.i];
			    if (mine){

                }else{
					mine = featurePoint(d.lt,d.ln);
                    counter ++;
                    mine.properties.id = counter;
                    filteredMineIds.push(counter);

                    mine.properties.name = d.n;

					mines.features.push(mine);
					minesLookup[d.i] = mine;
                }

                // minerals
                mine.properties.mineral = d.m1;
                if (mine.properties.mineral && !mineralLookup[mine.properties.mineral]){
                    minerals.push(mine.properties.mineral);
                    mineralLookup[mine.properties.mineral] = true;
                }

                // years and properties latest visit
                var date = d.d;
                if (date){
                    var year = parseInt(date.split("-")[0]);
                    if (!mine.properties.year || year>mine.properties.year){
                        mine.properties.year = year;

                        if (!yearsLookup[year]){
                            years.push(year);
                            yearsLookup[year] = true;
                        }

                        // armed presence
                        var armygroup = 0;
                        var army = d.a1;
                        if (army){
                            mine.properties.army = army;
                            if (!armiesLookup[army]){
                                armies.push(army);
                                armiesLookup[army] = true;
                            }

                            armygroup = 1;
                            if (army.toLowerCase().indexOf("fdlr")>=0)  armygroup = 2;
                            if (army.toLowerCase().indexOf("fardc")>=0)  armygroup = 3;
                        }
                        mine.properties.armygroup = armygroup;

                        // workers
                        var workers = parseInt(d.w) || 0;
                        if (isNaN(workers)){
                            console.error("Workers NAN: " + d.w);
                            workers = 0;
                        }
                        mine.properties.workers = workers;
                        var workergroup = 0;
                        if (workers>0) workergroup=1;
                        if (workers>=50) workergroup=2;
                        if (workers>=500) workergroup=3;
                        mine.properties.workergroup =  workergroup;

                    }
                }
			});

			me.mines = mines;
            me.years = years;
            me.minerals = minerals;
            me.armies = armies;

			console.log(mines);
			console.log(armies);
			console.log(years);
			console.log(minerals);

			now = new Date().getTime();
			console.log("datasets generated in " +  (now-checkpoint) + "ms");

			EventBus.trigger(EVENT.preloadDone);

        });
    };


    function featureCollection(){
        return {
			"type": "FeatureCollection",
			"features": []
		}
    }

    function featurePoint(lat,lon){
		return {
			"type": "Feature",
			"properties": {},
			"geometry": {
			"type": "Point",
				"coordinates": [lon, lat]
		    }
		}
    }

    me.updateFilter = function(filter,item){
        console.log(filter);
        console.log(item);

        var values = [];
        filter.filterItems.forEach(function(item){
            if (item.checked) values.push(item.value);
        });
        filterFunctionsLookup[filter.id] = function(item){
            return values.includes(item.properties[filter.filterProperty]);
        };

        me.filterMines();
    };

    me.filterMines = function(){
        filteredMineIds = [];
        var filterFunctions = [];

        for (var key in  filterFunctionsLookup){
            if (filterFunctionsLookup.hasOwnProperty(key)){
                filterFunctions.push(filterFunctionsLookup[key]);
            }
        }

        mines.features.forEach(function(mine){
            var passed = true;
            var filterCount = 0;
            var filterMax = filterFunctions.length;
            while (passed && filterCount<filterMax){
                passed =  filterFunctions[filterCount](mine);
                filterCount++;
            }
            if (passed) filteredMineIds.push(mine.properties.id);
        });
        map.setFilter("mines", ['in', 'id'].concat(filteredMineIds));
    };

    me.getYears = function(){
        return years;
    };
    me.getMinerals = function(){
        var result = [];

        minerals.forEach(function(mineral){
            result.push({label: mineral, value: mineral, color: mineralColors[mineral] || "grey"})
        });

        return result;


    };

    return me;



}();